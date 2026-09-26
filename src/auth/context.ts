import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<User>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
