import CFG from "../config"

/**
 * API client for backend requests
 */
const API_BASE_URL = CFG.API_URL;

export interface ApiError {
  error: string;
}

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: 'farmer' | 'restaurant';
  createdAt: string;
}

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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: headers as HeadersInit,
  });

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

export const userApi = {
  getMe: (token: string) =>
    apiRequest<AppUser>('/users/me', { method: 'GET' }, token),

  register: (token: string, role: 'farmer' | 'restaurant') =>
    apiRequest<AppUser>('/users/register', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }, token),
};
