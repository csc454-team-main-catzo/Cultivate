import { createContext, useContext } from 'react';
import type { User as Auth0User } from '@auth0/auth0-react';

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: 'farmer' | 'restaurant';
  createdAt: string;
}

export interface AuthContextType {
  // Auth0 state
  isLoading: boolean;
  isAuthenticated: boolean;
  user: Auth0User | undefined;
  error: Error | undefined;
  
  // App user state
  appUser: AppUser | null;
  isAppUserLoading: boolean;
  appUserError: Error | null;
  
  // Auth0 methods
  loginWithRedirect: () => Promise<void>;
  logout: (options?: { logoutParams?: { returnTo?: string } }) => void;
  getAccessTokenSilently: (options?: { authorizationParams?: { audience?: string; scope?: string } }) => Promise<string>;
  
  // App user methods
  registerUser: (role: 'farmer' | 'restaurant') => Promise<void>;
  refreshAppUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
