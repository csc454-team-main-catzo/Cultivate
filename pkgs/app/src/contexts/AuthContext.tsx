import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth0, User as Auth0User } from '@auth0/auth0-react';
import { userApi } from '../lib/api';

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: 'farmer' | 'restaurant';
  createdAt: string;
}

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    isLoading,
    isAuthenticated,
    user,
    error,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  // App user state
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [isAppUserLoading, setIsAppUserLoading] = React.useState(false);
  const [appUserError, setAppUserError] = React.useState<Error | null>(null);

  // Fetch app user when authenticated
  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      refreshAppUser();
    } else {
      setAppUser(null);
    }
  }, [isAuthenticated, isLoading]);

  const refreshAppUser = async () => {
    if (!isAuthenticated) {
      setAppUser(null);
      return;
    }

    setIsAppUserLoading(true);
    setAppUserError(null);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });
      
      const userData = await userApi.getMe(token);
      setAppUser(userData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user');
      setAppUserError(error);
      
      // If user doesn't exist (404), that's okay - they need to register
      if (error.message.includes('404') || error.message.includes('not found')) {
        setAppUser(null);
      }
    } finally {
      setIsAppUserLoading(false);
    }
  };

  const registerUser = async (role: 'farmer' | 'restaurant') => {
    if (!isAuthenticated) {
      throw new Error('Must be authenticated to register');
    }

    setIsAppUserLoading(true);
    setAppUserError(null);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });
      
      const userData = await userApi.register(token, role);
      setAppUser(userData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to register user');
      setAppUserError(error);
      throw error;
    } finally {
      setIsAppUserLoading(false);
    }
  };

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    user,
    error,
    appUser,
    isAppUserLoading,
    appUserError,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    registerUser,
    refreshAppUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
