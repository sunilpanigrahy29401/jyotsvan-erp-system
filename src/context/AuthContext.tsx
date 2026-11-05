import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthState, AuthUser, LoginCredentials } from '../types/auth';
import { authService } from '../services/auth';
import { accessControlService } from '../services/accessControl';
import { onSessionChange } from '../lib/session';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SIGNED_OUT: AuthState = { user: null, session: null, isAuthenticated: false, isLoading: false, error: null };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT, isLoading: true });

  // Restore the session from the httpOnly refresh cookie. The server is the only source of identity.
  useEffect(() => {
    let cancelled = false;
    authService
      .restore()
      .then((restored) => {
        if (cancelled) return;
        setState(
          restored
            ? { user: restored.user, session: restored.session, isAuthenticated: true, isLoading: false, error: null }
            : SIGNED_OUT
        );
      })
      .catch(() => !cancelled && setState(SIGNED_OUT));
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep UI in step with background refreshes / server-side expiry.
  useEffect(
    () =>
      onSessionChange((user) => {
        setState((prev) => {
          if (!user) return prev.isAuthenticated ? { ...SIGNED_OUT, error: 'Your session has ended. Please sign in again.' } : prev;
          return { ...prev, user: { ...prev.user, ...user } as AuthUser, isAuthenticated: true };
        });
      }),
    []
  );

  // NOTE: login deliberately does not toggle the global isLoading flag. That flag swaps the whole app for a
  // splash screen, which would unmount the login form and wipe what the user typed after every failed attempt.
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      const { user, session } = await authService.login(credentials);
      setState({ user, session, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setState({ ...SIGNED_OUT, error: msg });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authService.logout();
    } finally {
      setState(SIGNED_OUT);
    }
  }, []);

  // Branch switching only changes the branch shown in the UI; it grants no authority.
  const switchBranch = useCallback((branchId: string) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const known = prev.user.currentBranch?.id === branchId;
      return known ? prev : prev; // branch list now comes from the server (Settings > Branches); selection wired there
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await authService.refreshUser();
    if (user) setState((prev) => ({ ...prev, user }));
  }, []);

  const hasPermission = useCallback(
    (permissionCode: string) => accessControlService.hasPermission(state.user, permissionCode),
    [state.user]
  );

  const hasAnyPermission = useCallback(
    (permissionCodes: string[]) => accessControlService.hasAnyPermission(state.user, permissionCodes),
    [state.user]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, logout, switchBranch, refreshUser, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
