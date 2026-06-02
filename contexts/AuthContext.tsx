
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  login: () => Promise<boolean>;
  loginAsGuest: () => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.displayName || 'User'}`
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message || "Failed to log in with Google.");
      setIsLoading(false);
      return false;
    }
  };

  const loginAsGuest = async (): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser({
      id: 'guest-' + Math.random().toString(36).substring(2, 9),
      email: 'guest@voicestudio.app',
      name: 'Guest User',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Guest`
    });
    
    setIsLoading(false);
    return true;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // If it was a guest user, clear the state manually since signOut won't trigger onAuthStateChanged for non-firebase users
      setUser(null);
      setAuthError(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsGuest, logout, isLoading, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
