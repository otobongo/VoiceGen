
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

// In a real app, this would be enforced by Firebase Security Rules or a Cloud Function
// For now, we enforce it here to simulate the "Beta Access" restriction.
const ALLOWED_EMAILS = [
  'demo@voicestudio.ai', 
  'admin@voicestudio.ai', 
  'user@example.com'
];

interface AuthContextType {
  user: User | null;
  login: (email: string, name: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check for persisted session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('voice_studio_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Re-validate stored user against allow list (security best practice)
        if (ALLOWED_EMAILS.includes(parsed.email)) {
          setUser(parsed);
        } else {
          localStorage.removeItem('voice_studio_user');
        }
      } catch (e) {
        localStorage.removeItem('voice_studio_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 1. Validation Logic (The "Security Rule")
    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      setAuthError("Access Denied: Your email is not on the beta access list.");
      setIsLoading(false);
      return false;
    }

    // 2. Success Logic
    const newUser: User = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      name,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };

    setUser(newUser);
    localStorage.setItem('voice_studio_user', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    setAuthError(null);
    localStorage.removeItem('voice_studio_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, authError }}>
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
