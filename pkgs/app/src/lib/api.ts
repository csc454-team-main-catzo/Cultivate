/**
 * API client utility for making authenticated requests to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiError {
  error: string;
}

/**
 * Make an authenticated API request
 * 
 * @param endpoint - API endpoint (e.g., '/users/me')
 * @param options - Fetch options (method, body, etc.)
 * @param token - Auth0 access token (optional, will use from context if not provided)
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
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
export const userApi = {
  /**
   * Get current authenticated user
   */
  getMe: (token: string) => apiRequest<{
    _id: string;
    name: string;
    email: string;
    role: 'farmer' | 'restaurant';
    createdAt: string;
  }>('/users/me', { method: 'GET' }, token),

  /**
   * Register a new user (complete registration with role)
   */
  register: (token: string, role: 'farmer' | 'restaurant') => 
    apiRequest<{
      _id: string;
      name: string;
      email: string;
      auth0Id: string;
      role: 'farmer' | 'restaurant';
      createdAt: string;
    }>('/users/register', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }, token),

  /**
   * Get all users (admin/authenticated)
   */
  getAll: (token: string) => apiRequest<Array<{
    _id: string;
    name: string;
    email: string;
    role: 'farmer' | 'restaurant';
    createdAt: string;
  }>>('/users', { method: 'GET' }, token),
};
