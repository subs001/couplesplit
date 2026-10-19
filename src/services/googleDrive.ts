import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Expense, Household, Settlement } from '../types';

// Desired scopes for Google Drive backup
export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Initialize Firebase App safely (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

// Ensure persistent login across browser sessions and refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase setPersistence notice:', err);
});

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

export interface ParsedAuthError {
  code: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  domainToAuthorize?: string;
  isTesterAccessIssue?: boolean;
  cloudConsentUrl?: string;
}

export function parseFirebaseAuthError(error: unknown): ParsedAuthError {
  const errObj = error as { code?: string; message?: string };
  const code = errObj?.code || 'unknown';
  const rawMessage = errObj?.message || (error instanceof Error ? error.message : 'Authentication failed');

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const consentUrl = `https://console.cloud.google.com/apis/credentials/consent?project=${FIREBASE_PROJECT_ID}`;

  // Check for developer-approved testers / Google verification restriction
  if (
    rawMessage.toLowerCase().includes('developer-approved testers') ||
    rawMessage.toLowerCase().includes('verification process') ||
    rawMessage.toLowerCase().includes('access_denied') ||
    rawMessage.toLowerCase().includes('not completed the google verification')
  ) {
    return {
      code: 'auth/tester-access-required',
      title: 'Developer-Approved Tester Required',
      message: `Google Cloud project "${FIREBASE_PROJECT_ID}" is currently in "Testing" mode. Google requires your email to be added to "Test users" in Google Cloud Console before you can sign in.`,
      isTesterAccessIssue: true,
      cloudConsentUrl: consentUrl,
      actionUrl: consentUrl,
      actionText: 'Open Google Cloud Consent Screen',
    };
  }

  if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      title: 'Domain Not Authorized in Firebase',
      message: `The domain "${hostname}" is not authorized for OAuth in Firebase project "${FIREBASE_PROJECT_ID}". Add it to your Authorized Domains in Firebase Console.`,
      domainToAuthorize: hostname,
      actionUrl: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`,
      actionText: 'Open Firebase Authorized Domains',
    };
  }

  if (code === 'auth/operation-not-allowed' || rawMessage.includes('auth/operation-not-allowed')) {
    return {
      code: 'auth/operation-not-allowed',
      title: 'Google Sign-In Provider is Disabled',
      message: `Google Sign-in is not enabled in Firebase project "${FIREBASE_PROJECT_ID}". Enable the Google provider under Sign-in method in Firebase Console.`,
      actionUrl: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`,
      actionText: 'Enable Google Sign-in in Firebase',
    };
  }

  if (code === 'auth/popup-blocked' || rawMessage.includes('popup-blocked')) {
    return {
      code: 'auth/popup-blocked',
      title: 'Popup Blocked by Browser',
      message: 'The sign-in popup was blocked. Please allow popups for this site or open the app directly in a full browser tab.',
    };
  }

  if (code === 'auth/popup-closed-by-user' || rawMessage.includes('popup-closed-by-user')) {
    return {
      code: 'auth/popup-closed-by-user',
      title: 'Sign-in Window Closed or Blocked',
      message: 'The sign-in window was closed. If Google showed "has not completed the Google verification process / developer-approved testers", your email needs to be added as a Test User in Google Cloud Console.',
      isTesterAccessIssue: true,
      cloudConsentUrl: consentUrl,
      actionUrl: consentUrl,
      actionText: 'Add Test User in Google Cloud Console',
    };
  }

  if (code === 'auth/cancelled-popup-request') {
    return {
      code: 'auth/cancelled-popup-request',
      title: 'Request Cancelled',
      message: 'A previous sign-in attempt was interrupted. Click below to try again.',
    };
  }

  return {
    code,
    title: 'Google Sign-In Failed',
    message: rawMessage.replace(/^Firebase:\s*/i, ''),
    actionUrl: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`,
    actionText: 'Check Firebase Auth Settings',
  };
}

// LocalStorage keys for persisted Google session
export const TOKEN_STORAGE_KEY = 'couplesplit_google_drive_token';
export const TOKEN_TIMESTAMP_KEY = 'couplesplit_google_drive_token_time';
// Persist token for up to 7 days
export const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getStoredAccessToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const timeStr = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
    if (!token) return null;
    if (timeStr) {
      const age = Date.now() - parseInt(timeStr, 10);
      if (age > TOKEN_MAX_AGE_MS) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
        return null;
      }
    }
    return token;
  } catch {
    return null;
  }
}

export function storeAccessToken(token: string) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {
    console.warn('Could not store access token in localStorage:', err);
  }
}

export function clearStoredAccessToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
  } catch (err) {
    console.warn('Could not clear access token from localStorage:', err);
  }
}

// In-memory cache for access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveFileMeta {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface DriveBackupPayload {
  version: number;
  appName: string;
  backupDate: string;
  household: Household;
  expenses: Expense[];
  settlements: Settlement[];
}

// Auth State Listener with Long-Term Persistence
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = getStoredAccessToken();
      }
      // Keep user signed in across reloads/restarts!
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      clearStoredAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (persErr) {
      console.warn('Firebase setPersistence error:', persErr);
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign in');
    }

    cachedAccessToken = credential.accessToken;
    storeAccessToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = getStoredAccessToken();
  }
  return cachedAccessToken;
};

export const signOutGoogle = async () => {
  try {
    await firebaseSignOut(auth);
  } finally {
    cachedAccessToken = null;
    clearStoredAccessToken();
  }
};

// Find or create dedicated folder "CoupleSplit Backups" in Google Drive
export async function getOrCreateDriveFolder(accessToken: string): Promise<string> {
  const folderName = 'CoupleSplit Backups';
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`);
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    throw new Error(`Failed to query Google Drive: ${listRes.statusText}`);
  }

  const listData = await listRes.json();
  if (listData.files && listData.files.length > 0) {
    return listData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create backup folder in Google Drive: ${createRes.statusText}`);
  }

  const createdData = await createRes.json();
  return createdData.id;
}

// Backup current household data to Google Drive
export async function uploadBackupToDrive(
  accessToken: string,
  household: Household,
  expenses: Expense[],
  settlements: Settlement[]
): Promise<DriveFileMeta> {
  const folderId = await getOrCreateDriveFolder(accessToken);
  const fileName = `CoupleSplit_${household.id}_Backup.json`;

  const payload: DriveBackupPayload = {
    version: 1,
    appName: 'CoupleSplit',
    backupDate: new Date().toISOString(),
    household,
    expenses,
    settlements,
  };

  const fileContent = JSON.stringify(payload, null, 2);

  // Check if file already exists in Drive
  const query = encodeURIComponent(`name = '${fileName}' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const searchData = await searchRes.json();
  const existingFile = searchData.files && searchData.files[0];

  if (existingFile) {
    // Update existing file content
    const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (!updateRes.ok) {
      throw new Error(`Failed to update Drive backup: ${updateRes.statusText}`);
    }

    const updatedData = await updateRes.json();
    return {
      id: updatedData.id,
      name: fileName,
      modifiedTime: new Date().toISOString(),
      webViewLink: existingFile.webViewLink,
    };
  } else {
    // Create new file using multipart upload
    const boundary = '-------couplesplit_boundary_314159';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!createRes.ok) {
      throw new Error(`Failed to upload backup to Google Drive: ${createRes.statusText}`);
    }

    const createdData = await createRes.json();
    return createdData;
  }
}

// Download latest backup from Google Drive
export async function downloadBackupFromDrive(
  accessToken: string,
  householdId: string
): Promise<{ payload: DriveBackupPayload; meta: DriveFileMeta } | null> {
  const fileName = `CoupleSplit_${householdId}_Backup.json`;
  const query = encodeURIComponent(`name = '${fileName}' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    throw new Error(`Failed to query Drive: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) {
    return null;
  }

  const file = searchData.files[0];
  const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!downloadRes.ok) {
    throw new Error(`Failed to download backup file: ${downloadRes.statusText}`);
  }

  const payload: DriveBackupPayload = await downloadRes.json();
  return {
    payload,
    meta: file,
  };
}
