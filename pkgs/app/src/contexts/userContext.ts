import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as Auth0User } from '@auth0/auth0-react';
import { useAuth0 } from '@auth0/auth0-react';
import { userApi, type AppUser } from '../lib/api';

interface UserContextType {
  // App user data
  appUser: AppUser | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

interface UserProviderProps {
  children: React.ReactNode;
  auth0User: Auth0User | undefined;
  isAuthenticated: boolean;
  getAccessTokenSilently: () => Promise<string>;
}

export function UserProvider({ 
  children, 
  auth0User, 
  isAuthenticated,
  getAccessTokenSilently 
}: UserProviderProps) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setAppUser(null);
      return;
    }

    setIsLoading(true);
    setError(null);

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
      setError(error);
      
      // 404 means user needs to register - that's okay
      if (error.message.includes('404') || error.message.includes('not found')) {
        setAppUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  // Fetch user when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    } else {
      setAppUser(null);
    }
  }, [isAuthenticated, refreshUser]);

  return (
    <UserContext.Provider value={{ appUser, isLoading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}
