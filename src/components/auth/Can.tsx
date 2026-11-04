import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { accessControlService } from '../../services/accessControl';

export interface CanProps {
  /**
   * The single required permission token (e.g. 'users.create', 'inventory.adjust').
   */
  do?: string;
  /**
   * Match at least one of these permissions.
   */
  anyOf?: string[];
  /**
   * Match all of these permissions.
   */
  allOf?: string[];
  /**
   * Content rendered if access is denied. Defaults to null.
   */
  fallback?: React.ReactNode;
  /**
   * Content rendered if access is granted.
   */
  children: React.ReactNode;
}

/**
 * Enterprise `<Can>` Authorization Guard Component (Phase 3).
 * Conditionally renders UI actions and elements based on active user permission tokens.
 *
 * NOTE: UI gating is for visual cleanliness and workflow clarity.
 * Actual mutations are also independently validated in the Server/Data-Access layer.
 */
export const Can: React.FC<CanProps> = ({ do: actionCode, anyOf, allOf, fallback = null, children }) => {
  const { user } = useAuth();

  if (!user || user.status !== 'active') {
    return <>{fallback}</>;
  }

  // Super Admin bypasses all UI constraints
  if (user.is_super_admin) {
    return <>{children}</>;
  }

  // Single permission check
  if (actionCode && !accessControlService.hasPermission(user, actionCode)) {
    return <>{fallback}</>;
  }

  // Any of permissions check
  if (anyOf && anyOf.length > 0 && !accessControlService.hasAnyPermission(user, anyOf)) {
    return <>{fallback}</>;
  }

  // All of permissions check
  if (allOf && allOf.length > 0 && !accessControlService.hasAllPermissions(user, allOf)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
