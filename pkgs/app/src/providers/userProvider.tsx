import { useState, useEffect, useCallback } from 'react';
import type { RegisterUser201Response } from 'sdk';
import { useApi } from './apiContext';
import { UserContext } from './userContext'
import { useAuth0 } from '@auth0/auth0-react';

type AppUser = RegisterUser201Response;

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({
  children
}: UserProviderProps) {
  const { users } = useApi();
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setAppUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await users.getCurrentUser();
      setAppUser(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user');
      setError(error);

      // 404 means user needs to register - that's okay
      const status =
        typeof err === 'object' &&
          err !== null &&
          'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      if (status === 404 || error.message.includes('404') || error.message.includes('not found')) {
        setAppUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, users]);

  // Fetch user when authenticated
  useEffect(() => {
    // Wait until Auth0 has finished resolving auth state before deciding
    // whether the app user exists. This avoids flashing /register on refresh.
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setAppUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    refreshUser();
  }, [authLoading, isAuthenticated, refreshUser]);

  return (
    <UserContext.Provider value={{ appUser, user: appUser, isLoading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}
