import { useState, useEffect, useCallback } from 'react';
import type { RegisterUser201Response } from 'sdk';
import { useApi } from './apiContext';
import { UserContext } from './userContext'

type AppUser = RegisterUser201Response;

interface UserProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function UserProvider({
  children,
  isAuthenticated
}: UserProviderProps) {
  const { users } = useApi();
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
    if (isAuthenticated) {
      refreshUser();
    } else {
      setAppUser(null);
    }
  }, [isAuthenticated, refreshUser]);

  return (
    <UserContext.Provider value={{ appUser, isLoading, error, refreshUser }
    }>
      {children}
    </UserContext.Provider>
  );
}
