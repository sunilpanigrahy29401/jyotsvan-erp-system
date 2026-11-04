import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthState, AuthUser, LoginCredentials } from '../types/auth';
import { authService } from '../services/auth';
import { accessControlService } from '../services/accessControl';
import { INITIAL_BRANCHES } from '../database/initial-data';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => void;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Hydrate session on initialization
  useEffect(() => {
    try {
      const { session, user } = authService.getStoredSession();
      if (session && user) {
        setState({
          user,
          session,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { user, session } = await authService.login(credentials);
      setState({
        user,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: msg,
      }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authService.logout();
      setState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const switchBranch = useCallback((branchId: string) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const targetBranch = INITIAL_BRANCHES.find((b) => b.id === branchId) || prev.user.currentBranch;
      const updatedUser: AuthUser = {
        ...prev.user,
        currentBranch: targetBranch,
      };
      return {
        ...prev,
        user: updatedUser,
      };
    });
  }, []);

  const switchUser = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const switchedUser = await authService.switchUser(userId);
      const { session } = authService.getStoredSession();
      setState({
        user: switchedUser,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch user persona.';
      setState((prev) => ({ ...prev, isLoading: false, error: msg }));
      throw err;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { session, user } = authService.getStoredSession();
      if (user && session) {
        setState((prev) => ({
          ...prev,
          user,
          session,
        }));
      }
    } catch {
      // Fallback
    }
  }, []);

  const hasPermission = useCallback(
    (permissionCode: string) => {
      return accessControlService.hasPermission(state.user, permissionCode);
    },
    [state.user]
  );

  const hasAnyPermission = useCallback(
    (permissionCodes: string[]) => {
      return accessControlService.hasAnyPermission(state.user, permissionCodes);
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        switchBranch,
        switchUser,
        refreshUser,
        hasPermission,
        hasAnyPermission,
      }}
    >
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
