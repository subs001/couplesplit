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
    // 1. Process getRedirectResult for PWA / Mobile redirect logins
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          setUser(result.user);
          await syncUserProfile(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result info:', err);
        if (err.code !== 'auth/credential-already-in-use') {
          setError(err.message);
        }
      });

    // 2. Track auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (useRedirect = false) => {
    setError(null);

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // If standalone PWA or explicit redirect requested or on mobile Safari where popups get blocked
    if (useRedirect || (isStandalone && isMobile)) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (err: any) {
        console.error('Redirect sign-in error:', err);
        setError(err.message || 'Failed to initialize sign-in');
        return;
      }
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Popup sign in note:', err);

      // If popup was blocked or failed on phone, automatically fallback to redirect!
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-supported-in-this-environment' ||
        err.code === 'auth/popup-closed-by-user' && isMobile
      ) {
        console.log('Falling back to signInWithRedirect for mobile/PWA...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setError(redirectErr.message || 'Failed to sign in with Google');
          return;
        }
      }

      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
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
