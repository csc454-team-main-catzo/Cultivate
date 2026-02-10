import type { User } from '../models/User.js';

/**
 * Type definitions for Hono context variables set by authMiddleware
 */
export interface AuthContextVariables {
  auth0Id: string;
  userId: string;
  user: User;
  token: Record<string, unknown>;
  isNewUser: boolean;
}

/**
 * Helper type for Hono routes that use authMiddleware
 */
export type AuthenticatedContext = {
  Variables: AuthContextVariables;
};
