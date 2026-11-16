import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: (useRedirect?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  isStandalone: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detect standalone PWA mode
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  const syncUserProfile = async (currentUser: User) => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userDocRef);

      const profileData: UserProfile = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        email: currentUser.email?.toLowerCase() || '',
        photoURL: currentUser.photoURL || undefined,
      };

      if (!snap.exists()) {
        await setDoc(userDocRef, {
          ...profileData,
          createdAt: serverTimestamp(),
        });
      } else {
        const existing = snap.data();
        if (
          existing.displayName !== profileData.displayName ||
          existing.photoURL !== profileData.photoURL
        ) {
          await setDoc(userDocRef, profileData, { merge: true });
        }
      }
      setUserProfile(profileData);
    } catch (err) {
      console.warn('Error synchronizing profile, using fallback:', err);
      setUserProfile({
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'User',
        email: currentUser.email?.toLowerCase() || '',
        photoURL: currentUser.photoURL || undefined,
      });
    }
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      // 1. Check and await any pending redirect result BEFORE finalizing initial loading state
      let wasRedirectPending = false;
      try {
        wasRedirectPending = sessionStorage.getItem('duospend_auth_redirect_pending') === '1';
        if (wasRedirectPending) {
          sessionStorage.removeItem('duospend_auth_redirect_pending');
        }
      } catch {
        // sessionStorage may be unavailable
      }

      try {
        const result = await getRedirectResult(auth);
        if (!isMounted) return;

        if (result?.user) {
          setUser(result.user);
          await syncUserProfile(result.user);
        } else if (wasRedirectPending && !auth.currentUser) {
          setError(
            'Google redirect sign-in did not complete (your browser may be blocking cross-site storage). Please tap "Continue with Google" to sign in via popup instead.'
          );
        }
      } catch (err: any) {
        console.warn('Redirect auth result info:', err);
        if (!isMounted) return;
        if (err?.code === 'auth/unauthorized-domain') {
          setError(
            `This domain (${window.location.hostname}) is not authorized for Google Sign-In in Firebase Authentication.`
          );
        } else if (err?.code && err.code !== 'auth/credential-already-in-use') {
          setError(err.message || 'Failed to complete Google sign-in');
        }
      }

      if (!isMounted) return;

      // 2. Track persistent auth state
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return;
        setUser(currentUser);
        if (currentUser) {
          await syncUserProfile(currentUser);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (useRedirect = false) => {
    setError(null);

    if (useRedirect) {
      try {
        try {
          sessionStorage.setItem('duospend_auth_redirect_pending', '1');
        } catch {
          // ignore
        }
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (err: any) {
        try {
          sessionStorage.removeItem('duospend_auth_redirect_pending');
        } catch {
          // ignore
        }
        console.error('Redirect sign-in error:', err);
        setError(err.message || 'Failed to initialize redirect sign-in');
        return;
      }
    }

    // Prefer signInWithPopup across desktop, mobile browsers, and PWAs
    // (signInWithRedirect fails across origins on modern browsers due to third-party storage partitioning)
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        setUser(result.user);
        await syncUserProfile(result.user);
      }
    } catch (err: any) {
      console.warn('Popup sign in note:', err);

      // Check if auth actually completed despite a popup warning
      if (auth.currentUser) {
        setUser(auth.currentUser);
        await syncUserProfile(auth.currentUser);
        return;
      }

      // Only fall back to redirect when the browser strictly blocked popups or environment forbids popups
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        console.log('Popup blocked/unsupported, falling back to signInWithRedirect...');
        try {
          try {
            sessionStorage.setItem('duospend_auth_redirect_pending', '1');
          } catch {
            // ignore
          }
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setError(redirectErr.message || 'Failed to sign in with Google');
          return;
        }
      }

      if (err.code === 'auth/unauthorized-domain') {
        setError(
          `This domain (${window.location.hostname}) is not authorized in Firebase Authentication. Please add it to Authorized Domains in Firebase Console.`
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed before completing. Please tap "Continue with Google" and keep the window open until sign-in finishes.');
      } else if (err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Failed to sign in with Google');
      }
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signOut,
        error,
        clearError,
        isStandalone,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
