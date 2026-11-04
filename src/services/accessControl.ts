import type { AuthUser } from '../types/auth';

/**
 * Custom error thrown when a security or permission boundary is breached.
 */
export class AuthorizationError extends Error {
  public readonly code: string;
  public readonly requiredPermission?: string;

  constructor(message: string, requiredPermission?: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = 'ERR_AUTHORIZATION_DENIED';
    this.requiredPermission = requiredPermission;
  }
}

/**
 * Custom error thrown when cross-tenant data access is attempted.
 */
export class TenantIsolationError extends Error {
  public readonly code: string;

  constructor(message = 'Tenant isolation boundary violation: Cross-organization access denied.') {
    super(message);
    this.name = 'TenantIsolationError';
    this.code = 'ERR_TENANT_ISOLATION';
  }
}

/**
 * Core Access Control & RBAC Engine (Phase 3 Foundation)
 * Enforces permissions across both UI and Server/Data-Access layers.
 */
class AccessControlService {
  /**
   * Evaluates if an authenticated user possesses a given granular permission token.
   * Super Admins and users with wildcard '*:*' tokens bypass specific checks.
   */
  public hasPermission(user: AuthUser | null | undefined, permissionCode: string): boolean {
    if (!user) return false;
    if (user.status !== 'active') return false;

    // Super Admin flag bypasses all permission constraints
    if (user.is_super_admin) return true;

    const userPermissions = user.permissions || [];

    // System-wide wildcards
    if (userPermissions.includes('*:*') || userPermissions.includes('*')) {
      return true;
    }

    // Exact match
    if (userPermissions.includes(permissionCode)) {
      return true;
    }

    // Subsystem prefix wildcard (e.g. "inventory.*" matches "inventory.view")
    const [subsystem] = permissionCode.split('.');
    if (subsystem && (userPermissions.includes(`${subsystem}.*`) || userPermissions.includes(`${subsystem}:*`))) {
      return true;
    }

    return false;
  }

  /**
   * Checks if user has AT LEAST ONE of the requested permissions.
   */
  public hasAnyPermission(user: AuthUser | null | undefined, permissionCodes: string[]): boolean {
    if (!user) return false;
    if (permissionCodes.length === 0) return true;
    return permissionCodes.some((code) => this.hasPermission(user, code));
  }

  /**
   * Checks if user has ALL of the requested permissions.
   */
  public hasAllPermissions(user: AuthUser | null | undefined, permissionCodes: string[]): boolean {
    if (!user) return false;
    if (permissionCodes.length === 0) return true;
    return permissionCodes.every((code) => this.hasPermission(user, code));
  }

  /**
   * Evaluates whether a user can access a designated navigation route path.
   */
  public canAccessRoute(user: AuthUser | null | undefined, requiredPermission?: string): boolean {
    if (!requiredPermission) return true;
    return this.hasPermission(user, requiredPermission);
  }

  /**
   * Server / Data-Access Layer Authorization Enforcer.
   * MUST be invoked on every mutating or sensitive data operation.
   * Throws AuthorizationError or TenantIsolationError if unauthorized.
   *
   * Flow:
   * 1. Authenticate User presence and active status
   * 2. Identify and isolate Organization boundary
   * 3. Check Granular Permission token
   */
  public enforceAuthorization(
    actor: AuthUser | null | undefined,
    requiredPermission: string,
    targetOrganizationId?: string
  ): void {
    if (!actor) {
      throw new AuthorizationError('Authentication required. No active session identified.', requiredPermission);
    }

    if (actor.status !== 'active') {
      throw new AuthorizationError('Access denied: User account is inactive or suspended.', requiredPermission);
    }

    // Tenancy isolation verification
    if (targetOrganizationId && !actor.is_super_admin) {
      if (actor.organization_id !== targetOrganizationId) {
        throw new TenantIsolationError(
          `Tenant isolation violation: Actor belongs to organization '${actor.organization_id}' but attempted access to '${targetOrganizationId}'.`
        );
      }
    }

    // Permission token verification
    if (!this.hasPermission(actor, requiredPermission)) {
      throw new AuthorizationError(
        `Access denied: Actor lacks required permission token '${requiredPermission}'. Current roles: ${
          actor.roles?.map((r) => r.name).join(', ') || 'None'
        }`,
        requiredPermission
      );
    }
  }

  /**
   * Conceptual flow wrapper matching Phase 3 Architectural Specifications:
   * Request -> Authenticate User -> Identify Organization -> Check Permission -> Validate Input -> Execute Operation -> Return Result
   */
  public async executeAuthorizedOperation<T>(options: {
    actor: AuthUser | null | undefined;
    requiredPermission: string;
    targetOrganizationId?: string;
    operationName: string;
    validateInput?: () => void;
    operation: () => Promise<T>;
  }): Promise<T> {
    const { actor, requiredPermission, targetOrganizationId, operationName, validateInput, operation } = options;

    // 1. Authenticate + 2. Identify Org + 3. Check Permission
    this.enforceAuthorization(actor, requiredPermission, targetOrganizationId);

    // 4. Validate Input
    if (validateInput) {
      try {
        validateInput();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid parameters provided for operation.';
        throw new Error(`[${operationName}] Input Validation Failed: ${msg}`);
      }
    }

    // 5. Execute Operation
    const result = await operation();

    // 6. Return Result
    return result;
  }
}

export const accessControlService = new AccessControlService();
