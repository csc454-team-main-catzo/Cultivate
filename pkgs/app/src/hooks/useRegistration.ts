import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { registerUser } from '../services/registration';
import { useUser } from '../contexts/userContext';

/**
 * Hook for user registration
 * Separates registration logic from user context
 */
export function useRegistration() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { refreshUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const register = async (role: 'farmer' | 'restaurant') => {
    if (!isAuthenticated) {
      throw new Error('Must be authenticated to register');
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });
      
      await registerUser(token, role);
      // Refresh user data after registration
      await refreshUser();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to register user');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error };
}
