import type { User, Role, Organization, Branch } from './database';

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in seconds
}

export interface AuthUser extends User {
  roles: Role[];
  permissions: string[];
  organization?: Organization;
  currentBranch?: Branch;
}

export type UserProfile = AuthUser;

export interface LoginCredentials {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
