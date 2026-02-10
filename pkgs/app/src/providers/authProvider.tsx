import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AuthContext, type AuthContextType, type AppUser } from './authContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiError {
  error: string;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: headers as HeadersInit,
  });

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const error: ApiError = data;
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return data as T;
}

/**
 * User-related API functions
 */
const userApi = {
  /**
   * Get current authenticated user
   */
  getMe: (token: string) => apiRequest<AppUser>(
    '/users/me',
    { method: 'GET' },
    token
  ),

  /**
   * Register a new user (complete registration with role)
   */
  register: (token: string, role: 'farmer' | 'restaurant') => 
    apiRequest<AppUser>(
      '/users/register',
      {
        method: 'POST',
        body: JSON.stringify({ role }),
      },
      token
    ),
};

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
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAppUserLoading, setIsAppUserLoading] = useState(false);
  const [appUserError, setAppUserError] = useState<Error | null>(null);

  const refreshAppUser = useCallback(async () => {
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
  }, [isAuthenticated, getAccessTokenSilently]);

  // Fetch app user when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      refreshAppUser();
    } else {
      setAppUser(null);
    }
  }, [isAuthenticated, isLoading, refreshAppUser]);

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
