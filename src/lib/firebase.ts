import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Read Firebase configuration directly from environment variables (Vite / Netlify / Production)
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0205851368',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:531792615221:web:3f2659739614ca99f11e7c',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBagmCaSmhuT-nPYOG3DtlIzyKXhdXCUoI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0205851368.firebaseapp.com',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0205851368.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '531792615221',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Firestore Database ID
const firestoreDatabaseId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  'ai-studio-duospendsharedex-38163ee9-911b-46c5-85d6-e37bb7b67181';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with the configured Database ID
export const db = getFirestore(app, firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure local persistence so sessions survive refresh, browser closures & PWA launches
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set browserLocalPersistence:', err);
});

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection note:', error.message);
    }
  }
}
testConnection();
