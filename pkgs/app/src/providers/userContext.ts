import { createContext, useContext } from 'react';
import type { RegisterUser201Response } from 'sdk';

type AppUser = RegisterUser201Response;

interface UserContextType {
  // App user data
  appUser: AppUser | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}