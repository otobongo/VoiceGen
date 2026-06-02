import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { setAuthTokenProvider } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  authError: string | null;
  login: () => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  /** Firebase ID token for authenticating /api calls (null for guests). */
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Create/refresh the user's profile document (users/{uid}), matching the
// other build's data model. Best-effort: failures (e.g. rules/offline) don't
// block sign-in.
async function upsertProfile(fbUser: FirebaseUser): Promise<void> {
  try {
    const ref = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: fbUser.uid,
        email: fbUser.email ?? '',
        name: fbUser.displayName ?? 'User',
        role: 'user',
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('[auth] profile upsert skipped:', err);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setIsGuest(false);
        setUser({
          id: fbUser.uid,
          email: fbUser.email ?? '',
          name: fbUser.displayName ?? 'User',
          avatarUrl:
            fbUser.photoURL ??
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              fbUser.displayName ?? 'User',
            )}`,
        });
        void upsertProfile(fbUser);
      } else if (!isGuest) {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
    // isGuest intentionally excluded: we only want to clear on real sign-out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed.';
      // Common when the project's authorized domains don't include this host.
      setAuthError(message);
    }
  }, []);

  const loginAsGuest = useCallback(() => {
    setIsGuest(true);
    setUser({
      id: 'guest',
      email: 'guest@voicegen.local',
      name: 'Guest',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Guest',
      isGuest: true,
    });
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    setIsGuest(false);
    setUser(null);
    try {
      if (auth.currentUser) await signOut(auth);
    } catch (err) {
      console.warn('[auth] sign-out error:', err);
    }
  }, []);

  const getIdToken = useCallback(async () => {
    if (auth.currentUser) return auth.currentUser.getIdToken();
    return null;
  }, []);

  // Let the API layer attach the ID token to /api requests.
  useEffect(() => {
    setAuthTokenProvider(getIdToken);
  }, [getIdToken]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, authError, login, loginAsGuest, logout, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
