import { userApi } from '../lib/api';

/**
 * Registration service
 * Handles user registration logic separately from auth/user context
 */
export async function registerUser(
  token: string,
  role: 'farmer' | 'restaurant'
): Promise<void> {
  await userApi.register(token, role);
}
