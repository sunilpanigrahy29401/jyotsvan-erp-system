import type {
  Organization,
  Branch,
  BranchType,
  Department,
  Warehouse,
  WarehouseType,
  WarehouseLocation,
  Unit,
  UnitCategory,
  BusinessSettings,
  Role,
  Permission,
  RolePermission,
  UserRole,
  User,
  AuditLog,
  EntityStatus,
} from '../types/database';
import type { AuthUser } from '../types/auth';
import {
  INITIAL_ORGANIZATION,
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  INITIAL_WAREHOUSES,
  INITIAL_WAREHOUSE_LOCATIONS,
  INITIAL_UNITS,
  INITIAL_BUSINESS_SETTINGS,
  INITIAL_ROLES,
  INITIAL_PERMISSIONS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_USERS,
  INITIAL_USER_ROLES,
  INITIAL_AUDIT_LOGS,
} from '../database/initial-data';
import { ENV } from '../config/env';
import { accessControlService, AuthorizationError } from './accessControl';

const STORAGE_KEY_DB_USERS = 'jyotsvan_db_users_v3';
const STORAGE_KEY_DB_ROLES = 'jyotsvan_db_roles_v3';
const STORAGE_KEY_DB_USER_ROLES = 'jyotsvan_db_user_roles_v3';
const STORAGE_KEY_DB_ROLE_PERMS = 'jyotsvan_db_role_perms_v3';
const STORAGE_KEY_DB_ORG = 'jyotsvan_db_org_v4';
const STORAGE_KEY_DB_BRANCHES = 'jyotsvan_db_branches_v4';
const STORAGE_KEY_DB_DEPARTMENTS = 'jyotsvan_db_departments_v4';
const STORAGE_KEY_DB_WAREHOUSES = 'jyotsvan_db_warehouses_v4';
const STORAGE_KEY_DB_LOCATIONS = 'jyotsvan_db_locations_v4';
const STORAGE_KEY_DB_UNITS = 'jyotsvan_db_units_v4';
const STORAGE_KEY_DB_BUSINESS_SETTINGS = 'jyotsvan_db_business_settings_v4';
const STORAGE_KEY_DB_AUDIT = 'jyotsvan_db_audit_v4';

/**
 * Database Repository Service (Phase 4 Master Data & Organization Foundation)
 * Encapsulates multi-tenant data access operations with strict server/data-access layer authorization guards.
 */
class DatabaseService {
  private organization: Organization;
  private branches: Branch[];
  private departments: Department[];
  private warehouses: Warehouse[];
  private warehouseLocations: WarehouseLocation[];
  private units: Unit[];
  private businessSettings: BusinessSettings;
  private roles: Role[];
  private permissions: Permission[];
  private rolePermissions: RolePermission[];
  private users: User[];
  private userRoles: UserRole[];
  private auditLogs: AuditLog[];

  constructor() {
    // Hydrate state from localStorage or initialize with authoritative seed foundation
    this.organization = this.loadFromStorage(STORAGE_KEY_DB_ORG, { ...INITIAL_ORGANIZATION });
    this.branches = this.loadFromStorage(STORAGE_KEY_DB_BRANCHES, [...INITIAL_BRANCHES]);
    this.departments = this.loadFromStorage(STORAGE_KEY_DB_DEPARTMENTS, [...INITIAL_DEPARTMENTS]);
    this.warehouses = this.loadFromStorage(STORAGE_KEY_DB_WAREHOUSES, [...INITIAL_WAREHOUSES]);
    this.warehouseLocations = this.loadFromStorage(STORAGE_KEY_DB_LOCATIONS, [...INITIAL_WAREHOUSE_LOCATIONS]);
    this.units = this.loadFromStorage(STORAGE_KEY_DB_UNITS, [...INITIAL_UNITS]);
    this.businessSettings = this.loadFromStorage(STORAGE_KEY_DB_BUSINESS_SETTINGS, { ...INITIAL_BUSINESS_SETTINGS });
    this.roles = this.loadFromStorage(STORAGE_KEY_DB_ROLES, [...INITIAL_ROLES]);
    this.permissions = [...INITIAL_PERMISSIONS];
    this.rolePermissions = this.loadFromStorage(STORAGE_KEY_DB_ROLE_PERMS, [...INITIAL_ROLE_PERMISSIONS]);
    this.users = this.loadFromStorage(STORAGE_KEY_DB_USERS, [...INITIAL_USERS]);
    this.userRoles = this.loadFromStorage(STORAGE_KEY_DB_USER_ROLES, [...INITIAL_USER_ROLES]);
    this.auditLogs = this.loadFromStorage(STORAGE_KEY_DB_AUDIT, [...INITIAL_AUDIT_LOGS]);
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private saveToStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable fallback
    }
  }

  // ============================================================================
  // ORGANIZATIONS
  // ============================================================================

  public async getOrganization(actor?: AuthUser | null): Promise<Organization> {
    if (actor) {
      accessControlService.enforceAuthorization(actor, 'organization.view', this.organization.id);
    }
    return { ...this.organization };
  }

  public async updateOrganization(
    actor: AuthUser,
    payload: Partial<Omit<Organization, 'id' | 'created_at' | 'created_by'>>
  ): Promise<Organization> {
    accessControlService.enforceAuthorization(actor, 'organization.edit', this.organization.id);

    if (payload.name && payload.name.trim().length === 0) {
      throw new Error('Organization name cannot be empty.');
    }
    if (payload.code && payload.code.trim().length === 0) {
      throw new Error('Organization code cannot be empty.');
    }

    this.organization = {
      ...this.organization,
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.saveToStorage(STORAGE_KEY_DB_ORG, this.organization);

    await this.recordAuditLog({
      organization_id: this.organization.id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'organization.update',
      target_resource: 'organizations',
      target_id: this.organization.id,
      details: payload,
    });

    return { ...this.organization };
  }

  // ============================================================================
  // BRANCHES
  // ============================================================================

  public async getBranches(actor?: AuthUser | null): Promise<Branch[]> {
    if (actor && !actor.is_super_admin) {
      return this.branches.filter((b) => b.organization_id === actor.organization_id);
    }
    return [...this.branches];
  }

  public async getBranchById(actor: AuthUser, id: string): Promise<Branch | null> {
    const branch = this.branches.find((b) => b.id === id);
    if (!branch) return null;
    if (!actor.is_super_admin && branch.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation breach prevented.');
    }
    return { ...branch };
  }

  public async createBranch(
    actor: AuthUser,
    payload: {
      name: string;
      code: string;
      branch_type: BranchType;
      address?: string | null;
      city: string;
      state?: string | null;
      country: string;
      postal_code?: string | null;
      phone?: string | null;
      email?: string | null;
    }
  ): Promise<Branch> {
    accessControlService.enforceAuthorization(actor, 'branches.create', actor.organization_id);

    const cleanName = payload.name.trim();
    const cleanCode = payload.code.trim().toUpperCase();

    if (!cleanName) throw new Error('Branch name is required.');
    if (!cleanCode) throw new Error('Branch code is required.');
    if (!payload.city.trim()) throw new Error('Branch city is required.');

    // Enforce unique code within organization
    const duplicate = this.branches.find(
      (b) => b.organization_id === actor.organization_id && b.code.toUpperCase() === cleanCode
    );
    if (duplicate) {
      throw new Error(`A branch with code "${cleanCode}" already exists in this organization.`);
    }

    const now = new Date().toISOString();
    const newBranch: Branch = {
      id: `br-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: actor.organization_id, // Server enforced tenancy
      name: cleanName,
      code: cleanCode,
      branch_type: payload.branch_type,
      address: payload.address?.trim() || null,
      city: payload.city.trim(),
      state: payload.state?.trim() || null,
      country: payload.country.trim() || 'India',
      postal_code: payload.postal_code?.trim() || null,
      phone: payload.phone?.trim() || null,
      phone_number: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      status: 'active',
      created_at: now,
      updated_at: now,
      created_by: actor.id,
      updated_by: actor.id,
    };

    this.branches.push(newBranch);
    this.saveToStorage(STORAGE_KEY_DB_BRANCHES, this.branches);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'branch.create',
      target_resource: 'branches',
      target_id: newBranch.id,
      details: { name: newBranch.name, code: newBranch.code, branch_type: newBranch.branch_type },
    });

    return { ...newBranch };
  }

  public async updateBranch(
    actor: AuthUser,
    id: string,
    payload: Partial<{
      name: string;
      code: string;
      branch_type: BranchType;
      address: string | null;
      city: string;
      state: string | null;
      country: string;
      postal_code: string | null;
      phone: string | null;
      email: string | null;
      status: EntityStatus;
    }>
  ): Promise<Branch> {
    accessControlService.enforceAuthorization(actor, 'branches.edit', actor.organization_id);

    const index = this.branches.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('Branch not found.');

    const targetBranch = this.branches[index];
    if (!actor.is_super_admin && targetBranch.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    if (payload.code) {
      const cleanCode = payload.code.trim().toUpperCase();
      const duplicate = this.branches.find(
        (b) => b.id !== id && b.organization_id === targetBranch.organization_id && b.code.toUpperCase() === cleanCode
      );
      if (duplicate) {
        throw new Error(`Branch code "${cleanCode}" is already in use by another branch.`);
      }
      payload.code = cleanCode;
    }

    const updated: Branch = {
      ...targetBranch,
      ...payload,
      phone_number: payload.phone !== undefined ? payload.phone : targetBranch.phone_number,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.branches[index] = updated;
    this.saveToStorage(STORAGE_KEY_DB_BRANCHES, this.branches);

    await this.recordAuditLog({
      organization_id: targetBranch.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'branch.update',
      target_resource: 'branches',
      target_id: targetBranch.id,
      details: payload,
    });

    return { ...updated };
  }

  public async toggleBranchStatus(actor: AuthUser, id: string, newStatus: EntityStatus): Promise<Branch> {
    accessControlService.enforceAuthorization(actor, 'branches.edit', actor.organization_id);

    const branch = await this.getBranchById(actor, id);
    if (!branch) throw new Error('Branch not found.');

    const updated = await this.updateBranch(actor, id, { status: newStatus });

    await this.recordAuditLog({
      organization_id: branch.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'branch.status_change',
      target_resource: 'branches',
      target_id: id,
      details: { previousStatus: branch.status, newStatus },
    });

    return updated;
  }

  public async deleteBranch(actor: AuthUser, id: string): Promise<boolean> {
    accessControlService.enforceAuthorization(actor, 'branches.delete', actor.organization_id);

    const branch = this.branches.find((b) => b.id === id);
    if (!branch) throw new Error('Branch not found.');
    if (!actor.is_super_admin && branch.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    // Safety checks: do not delete branch if active warehouses or users are assigned to it
    const linkedWarehouses = this.warehouses.filter((w) => w.branch_id === id && w.status === 'active');
    if (linkedWarehouses.length > 0) {
      throw new Error(
        `Cannot delete branch "${branch.name}". It is linked to ${linkedWarehouses.length} active warehouse(s). Deactivate or reassign them first.`
      );
    }

    const linkedUsers = this.users.filter((u) => u.default_branch_id === id);
    if (linkedUsers.length > 0) {
      throw new Error(
        `Cannot delete branch "${branch.name}". It is the default facility for ${linkedUsers.length} active user(s). Reassign them first.`
      );
    }

    this.branches = this.branches.filter((b) => b.id !== id);
    this.saveToStorage(STORAGE_KEY_DB_BRANCHES, this.branches);

    await this.recordAuditLog({
      organization_id: branch.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'branch.delete',
      target_resource: 'branches',
      target_id: id,
      details: { name: branch.name, code: branch.code },
    });

    return true;
  }

  // ============================================================================
  // DEPARTMENTS
  // ============================================================================

  public async getDepartments(actor?: AuthUser | null): Promise<Department[]> {
    if (actor && !actor.is_super_admin) {
      return this.departments.filter((d) => d.organization_id === actor.organization_id);
    }
    return [...this.departments];
  }

  public async getDepartmentById(actor: AuthUser, id: string): Promise<Department | null> {
    const dept = this.departments.find((d) => d.id === id);
    if (!dept) return null;
    if (!actor.is_super_admin && dept.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation breach prevented.');
    }
    return { ...dept };
  }

  public async createDepartment(
    actor: AuthUser,
    payload: {
      name: string;
      code: string;
      description?: string | null;
      head_user_id?: string | null;
    }
  ): Promise<Department> {
    accessControlService.enforceAuthorization(actor, 'departments.create', actor.organization_id);

    const cleanName = payload.name.trim();
    const cleanCode = payload.code.trim().toUpperCase();

    if (!cleanName) throw new Error('Department name is required.');
    if (!cleanCode) throw new Error('Department code is required.');

    // Check uniqueness within organization
    const duplicate = this.departments.find(
      (d) => d.organization_id === actor.organization_id && d.code.toUpperCase() === cleanCode
    );
    if (duplicate) {
      throw new Error(`A department with code "${cleanCode}" already exists.`);
    }

    const now = new Date().toISOString();
    const newDept: Department = {
      id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: actor.organization_id,
      name: cleanName,
      code: cleanCode,
      description: payload.description?.trim() || null,
      head_user_id: payload.head_user_id || null,
      status: 'active',
      created_at: now,
      updated_at: now,
      created_by: actor.id,
      updated_by: actor.id,
    };

    this.departments.push(newDept);
    this.saveToStorage(STORAGE_KEY_DB_DEPARTMENTS, this.departments);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'department.create',
      target_resource: 'departments',
      target_id: newDept.id,
      details: { name: newDept.name, code: newDept.code },
    });

    return { ...newDept };
  }

  public async updateDepartment(
    actor: AuthUser,
    id: string,
    payload: Partial<{
      name: string;
      code: string;
      description: string | null;
      head_user_id: string | null;
      status: EntityStatus;
    }>
  ): Promise<Department> {
    accessControlService.enforceAuthorization(actor, 'departments.edit', actor.organization_id);

    const index = this.departments.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Department not found.');

    const target = this.departments[index];
    if (!actor.is_super_admin && target.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    if (payload.code) {
      const cleanCode = payload.code.trim().toUpperCase();
      const duplicate = this.departments.find(
        (d) => d.id !== id && d.organization_id === target.organization_id && d.code.toUpperCase() === cleanCode
      );
      if (duplicate) {
        throw new Error(`Department code "${cleanCode}" is already in use.`);
      }
      payload.code = cleanCode;
    }

    const updated: Department = {
      ...target,
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.departments[index] = updated;
    this.saveToStorage(STORAGE_KEY_DB_DEPARTMENTS, this.departments);

    await this.recordAuditLog({
      organization_id: target.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'department.update',
      target_resource: 'departments',
      target_id: target.id,
      details: payload,
    });

    return { ...updated };
  }

  public async toggleDepartmentStatus(actor: AuthUser, id: string, newStatus: EntityStatus): Promise<Department> {
    return this.updateDepartment(actor, id, { status: newStatus });
  }

  public async deleteDepartment(actor: AuthUser, id: string): Promise<boolean> {
    accessControlService.enforceAuthorization(actor, 'departments.delete', actor.organization_id);

    const dept = this.departments.find((d) => d.id === id);
    if (!dept) throw new Error('Department not found.');
    if (!actor.is_super_admin && dept.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    this.departments = this.departments.filter((d) => d.id !== id);
    this.saveToStorage(STORAGE_KEY_DB_DEPARTMENTS, this.departments);

    await this.recordAuditLog({
      organization_id: dept.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'department.delete',
      target_resource: 'departments',
      target_id: id,
      details: { name: dept.name, code: dept.code },
    });

    return true;
  }

  // ============================================================================
  // WAREHOUSES
  // ============================================================================

  public async getWarehouses(actor?: AuthUser | null): Promise<Warehouse[]> {
    if (actor && !actor.is_super_admin) {
      return this.warehouses.filter((w) => w.organization_id === actor.organization_id);
    }
    return [...this.warehouses];
  }

  public async getWarehouseById(
    actor: AuthUser,
    id: string
  ): Promise<(Warehouse & { branch?: Branch | null; locationsCount: number }) | null> {
    const warehouse = this.warehouses.find((w) => w.id === id);
    if (!warehouse) return null;
    if (!actor.is_super_admin && warehouse.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation breach prevented.');
    }

    const branch = warehouse.branch_id ? this.branches.find((b) => b.id === warehouse.branch_id) || null : null;
    const locationsCount = this.warehouseLocations.filter((l) => l.warehouse_id === id).length;

    return {
      ...warehouse,
      branch,
      locationsCount,
    };
  }

  public async createWarehouse(
    actor: AuthUser,
    payload: {
      name: string;
      code: string;
      warehouse_type: WarehouseType;
      branch_id?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      contact_person?: string | null;
      phone?: string | null;
      email?: string | null;
      capacity_cubic_meters?: number | null;
    }
  ): Promise<Warehouse> {
    accessControlService.enforceAuthorization(actor, 'warehouses.create', actor.organization_id);

    const cleanName = payload.name.trim();
    const cleanCode = payload.code.trim().toUpperCase();

    if (!cleanName) throw new Error('Warehouse name is required.');
    if (!cleanCode) throw new Error('Warehouse code is required.');

    // Uniqueness validation
    const duplicate = this.warehouses.find(
      (w) => w.organization_id === actor.organization_id && w.code.toUpperCase() === cleanCode
    );
    if (duplicate) {
      throw new Error(`A warehouse with code "${cleanCode}" already exists.`);
    }

    // Verify branch if supplied
    if (payload.branch_id) {
      const branchExists = this.branches.some(
        (b) => b.id === payload.branch_id && b.organization_id === actor.organization_id
      );
      if (!branchExists) {
        throw new Error('Assigned branch not found in your organization.');
      }
    }

    const now = new Date().toISOString();
    const newWarehouse: Warehouse = {
      id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: actor.organization_id,
      branch_id: payload.branch_id || null,
      name: cleanName,
      code: cleanCode,
      warehouse_type: payload.warehouse_type,
      address: payload.address?.trim() || null,
      address_line1: payload.address?.trim() || null,
      city: payload.city?.trim() || null,
      state: payload.state?.trim() || null,
      postal_code: payload.postal_code?.trim() || null,
      contact_person: payload.contact_person?.trim() || null,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      capacity_cubic_meters: payload.capacity_cubic_meters ? Number(payload.capacity_cubic_meters) : null,
      status: 'active',
      created_at: now,
      updated_at: now,
      created_by: actor.id,
      updated_by: actor.id,
    };

    this.warehouses.push(newWarehouse);
    this.saveToStorage(STORAGE_KEY_DB_WAREHOUSES, this.warehouses);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'warehouse.create',
      target_resource: 'warehouses',
      target_id: newWarehouse.id,
      details: { name: newWarehouse.name, code: newWarehouse.code, warehouse_type: newWarehouse.warehouse_type },
    });

    return { ...newWarehouse };
  }

  public async updateWarehouse(
    actor: AuthUser,
    id: string,
    payload: Partial<{
      name: string;
      code: string;
      warehouse_type: WarehouseType;
      branch_id: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      contact_person: string | null;
      phone: string | null;
      email: string | null;
      capacity_cubic_meters: number | null;
      status: EntityStatus;
    }>
  ): Promise<Warehouse> {
    accessControlService.enforceAuthorization(actor, 'warehouses.edit', actor.organization_id);

    const index = this.warehouses.findIndex((w) => w.id === id);
    if (index === -1) throw new Error('Warehouse not found.');

    const target = this.warehouses[index];
    if (!actor.is_super_admin && target.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    if (payload.code) {
      const cleanCode = payload.code.trim().toUpperCase();
      const duplicate = this.warehouses.find(
        (w) => w.id !== id && w.organization_id === target.organization_id && w.code.toUpperCase() === cleanCode
      );
      if (duplicate) {
        throw new Error(`Warehouse code "${cleanCode}" is already in use.`);
      }
      payload.code = cleanCode;
    }

    const updated: Warehouse = {
      ...target,
      ...payload,
      address_line1: payload.address !== undefined ? payload.address : target.address_line1,
      capacity_cubic_meters:
        payload.capacity_cubic_meters !== undefined
          ? payload.capacity_cubic_meters
            ? Number(payload.capacity_cubic_meters)
            : null
          : target.capacity_cubic_meters,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.warehouses[index] = updated;
    this.saveToStorage(STORAGE_KEY_DB_WAREHOUSES, this.warehouses);

    await this.recordAuditLog({
      organization_id: target.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'warehouse.update',
      target_resource: 'warehouses',
      target_id: target.id,
      details: payload,
    });

    return { ...updated };
  }

  public async toggleWarehouseStatus(actor: AuthUser, id: string, newStatus: EntityStatus): Promise<Warehouse> {
    return this.updateWarehouse(actor, id, { status: newStatus });
  }

  public async deleteWarehouse(actor: AuthUser, id: string): Promise<boolean> {
    accessControlService.enforceAuthorization(actor, 'warehouses.delete', actor.organization_id);

    const warehouse = this.warehouses.find((w) => w.id === id);
    if (!warehouse) throw new Error('Warehouse not found.');
    if (!actor.is_super_admin && warehouse.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    const linkedLocations = this.warehouseLocations.filter((l) => l.warehouse_id === id);
    if (linkedLocations.length > 0) {
      throw new Error(
        `Cannot delete warehouse "${warehouse.name}". It contains ${linkedLocations.length} configured location bin(s). Remove them first or deactivate this warehouse.`
      );
    }

    this.warehouses = this.warehouses.filter((w) => w.id !== id);
    this.saveToStorage(STORAGE_KEY_DB_WAREHOUSES, this.warehouses);

    await this.recordAuditLog({
      organization_id: warehouse.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'warehouse.delete',
      target_resource: 'warehouses',
      target_id: id,
      details: { name: warehouse.name, code: warehouse.code },
    });

    return true;
  }

  // ============================================================================
  // WAREHOUSE LOCATIONS / BINS
  // ============================================================================

  public async getWarehouseLocations(
    actor?: AuthUser | null,
    warehouseId?: string
  ): Promise<Array<WarehouseLocation & { warehouseName?: string; warehouseCode?: string }>> {
    let list = actor && !actor.is_super_admin
      ? this.warehouseLocations.filter((l) => l.organization_id === actor.organization_id)
      : [...this.warehouseLocations];

    if (warehouseId) {
      list = list.filter((l) => l.warehouse_id === warehouseId);
    }

    return list.map((loc) => {
      const wh = this.warehouses.find((w) => w.id === loc.warehouse_id);
      return {
        ...loc,
        warehouseName: wh?.name,
        warehouseCode: wh?.code,
      };
    });
  }

  public async createWarehouseLocation(
    actor: AuthUser,
    payload: {
      warehouse_id: string;
      code: string;
      name: string;
      description?: string | null;
    }
  ): Promise<WarehouseLocation> {
    accessControlService.enforceAuthorization(actor, 'locations.create', actor.organization_id);

    const warehouse = this.warehouses.find((w) => w.id === payload.warehouse_id);
    if (!warehouse) throw new Error('Specified warehouse does not exist.');
    if (!actor.is_super_admin && warehouse.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    const cleanCode = payload.code.trim().toUpperCase();
    const cleanName = payload.name.trim();

    if (!cleanCode) throw new Error('Location code is required.');
    if (!cleanName) throw new Error('Location name is required.');

    // Uniqueness within the specific warehouse
    const duplicate = this.warehouseLocations.find(
      (l) => l.warehouse_id === payload.warehouse_id && l.code.toUpperCase() === cleanCode
    );
    if (duplicate) {
      throw new Error(`Location code "${cleanCode}" already exists inside warehouse "${warehouse.name}".`);
    }

    const now = new Date().toISOString();
    const newLoc: WarehouseLocation = {
      id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: actor.organization_id,
      warehouse_id: payload.warehouse_id,
      code: cleanCode,
      name: cleanName,
      description: payload.description?.trim() || null,
      status: 'active',
      created_at: now,
      updated_at: now,
      created_by: actor.id,
      updated_by: actor.id,
    };

    this.warehouseLocations.push(newLoc);
    this.saveToStorage(STORAGE_KEY_DB_LOCATIONS, this.warehouseLocations);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'location.create',
      target_resource: 'warehouse_locations',
      target_id: newLoc.id,
      details: { warehouse_id: payload.warehouse_id, code: newLoc.code, name: newLoc.name },
    });

    return { ...newLoc };
  }

  public async updateWarehouseLocation(
    actor: AuthUser,
    id: string,
    payload: Partial<{
      warehouse_id: string;
      code: string;
      name: string;
      description: string | null;
      status: EntityStatus;
    }>
  ): Promise<WarehouseLocation> {
    accessControlService.enforceAuthorization(actor, 'locations.edit', actor.organization_id);

    const index = this.warehouseLocations.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Warehouse location not found.');

    const target = this.warehouseLocations[index];
    if (!actor.is_super_admin && target.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation breach prevented.');
    }

    if (payload.warehouse_id && payload.warehouse_id !== target.warehouse_id) {
      const newWh = this.warehouses.find((w) => w.id === payload.warehouse_id);
      if (!newWh) throw new Error('Target warehouse does not exist.');
      if (!actor.is_super_admin && newWh.organization_id !== actor.organization_id) {
        throw new AuthorizationError('Tenant isolation violation.');
      }
    }

    const checkWhId = payload.warehouse_id || target.warehouse_id;

    if (payload.code) {
      const cleanCode = payload.code.trim().toUpperCase();
      const duplicate = this.warehouseLocations.find(
        (l) => l.id !== id && l.warehouse_id === checkWhId && l.code.toUpperCase() === cleanCode
      );
      if (duplicate) {
        throw new Error(`Location code "${cleanCode}" already exists inside this warehouse.`);
      }
      payload.code = cleanCode;
    }

    const updated: WarehouseLocation = {
      ...target,
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.warehouseLocations[index] = updated;
    this.saveToStorage(STORAGE_KEY_DB_LOCATIONS, this.warehouseLocations);

    await this.recordAuditLog({
      organization_id: target.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'location.update',
      target_resource: 'warehouse_locations',
      target_id: target.id,
      details: payload,
    });

    return { ...updated };
  }

  public async toggleLocationStatus(actor: AuthUser, id: string, newStatus: EntityStatus): Promise<WarehouseLocation> {
    return this.updateWarehouseLocation(actor, id, { status: newStatus });
  }

  public async toggleWarehouseLocationStatus(actor: AuthUser, id: string, newStatus: EntityStatus): Promise<WarehouseLocation> {
    return this.updateWarehouseLocation(actor, id, { status: newStatus });
  }

  public async deleteWarehouseLocation(actor: AuthUser, id: string): Promise<boolean> {
    accessControlService.enforceAuthorization(actor, 'locations.delete', actor.organization_id);

    const loc = this.warehouseLocations.find((l) => l.id === id);
    if (!loc) throw new Error('Warehouse location not found.');
    if (!actor.is_super_admin && loc.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    this.warehouseLocations = this.warehouseLocations.filter((l) => l.id !== id);
    this.saveToStorage(STORAGE_KEY_DB_LOCATIONS, this.warehouseLocations);

    await this.recordAuditLog({
      organization_id: loc.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'location.delete',
      target_resource: 'warehouse_locations',
      target_id: id,
      details: { code: loc.code, name: loc.name, warehouse_id: loc.warehouse_id },
    });

    return true;
  }

  // ============================================================================
  // UNITS OF MEASUREMENT (UOM)
  // ============================================================================

  public async getUnits(actor?: AuthUser | null): Promise<Unit[]> {
    if (actor && !actor.is_super_admin) {
      return this.units.filter((u) => u.organization_id === actor.organization_id);
    }
    return [...this.units];
  }

  public async createUnit(
    actor: AuthUser,
    payload: {
      name: string;
      short_code: string;
      category: UnitCategory;
      description?: string | null;
    }
  ): Promise<Unit> {
    accessControlService.enforceAuthorization(actor, 'units.create', actor.organization_id);

    const cleanName = payload.name.trim();
    const cleanCode = payload.short_code.trim();

    if (!cleanName) throw new Error('Unit name is required.');
    if (!cleanCode) throw new Error('Unit symbol / short code is required.');

    const duplicate = this.units.find(
      (u) => u.organization_id === actor.organization_id && u.short_code.toLowerCase() === cleanCode.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A unit with short code "${cleanCode}" already exists.`);
    }

    const now = new Date().toISOString();
    const newUnit: Unit = {
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: actor.organization_id,
      name: cleanName,
      short_code: cleanCode,
      category: payload.category,
      description: payload.description?.trim() || null,
      is_system: false,
      status: 'active',
      created_at: now,
      updated_at: now,
      created_by: actor.id,
      updated_by: actor.id,
    };

    this.units.push(newUnit);
    this.saveToStorage(STORAGE_KEY_DB_UNITS, this.units);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'unit.create',
      target_resource: 'units',
      target_id: newUnit.id,
      details: { name: newUnit.name, short_code: newUnit.short_code, category: newUnit.category },
    });

    return { ...newUnit };
  }

  public async updateUnit(
    actor: AuthUser,
    id: string,
    payload: Partial<{
      name: string;
      short_code: string;
      category: UnitCategory;
      description: string | null;
      status: EntityStatus;
    }>
  ): Promise<Unit> {
    accessControlService.enforceAuthorization(actor, 'units.edit', actor.organization_id);

    const index = this.units.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Unit not found.');

    const target = this.units[index];
    if (!actor.is_super_admin && target.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation breach prevented.');
    }

    if (payload.short_code) {
      const cleanCode = payload.short_code.trim();
      const duplicate = this.units.find(
        (u) =>
          u.id !== id &&
          u.organization_id === target.organization_id &&
          u.short_code.toLowerCase() === cleanCode.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Unit short code "${cleanCode}" is already in use.`);
      }
      payload.short_code = cleanCode;
    }

    const updated: Unit = {
      ...target,
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.units[index] = updated;
    this.saveToStorage(STORAGE_KEY_DB_UNITS, this.units);

    await this.recordAuditLog({
      organization_id: target.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'unit.update',
      target_resource: 'units',
      target_id: target.id,
      details: payload,
    });

    return { ...updated };
  }

  public async toggleUnitStatus(actor: AuthUser, id: string, newStatus: EntityStatus): Promise<Unit> {
    return this.updateUnit(actor, id, { status: newStatus });
  }

  public async deleteUnit(actor: AuthUser, id: string): Promise<boolean> {
    accessControlService.enforceAuthorization(actor, 'units.delete', actor.organization_id);

    const unit = this.units.find((u) => u.id === id);
    if (!unit) throw new Error('Unit not found.');
    if (!actor.is_super_admin && unit.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Tenant isolation violation.');
    }

    if (unit.is_system) {
      throw new Error(
        `Unit "${unit.name} (${unit.short_code})" is a foundational system measurement standard. It cannot be deleted; deactivate it instead.`
      );
    }

    this.units = this.units.filter((u) => u.id !== id);
    this.saveToStorage(STORAGE_KEY_DB_UNITS, this.units);

    await this.recordAuditLog({
      organization_id: unit.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'unit.delete',
      target_resource: 'units',
      target_id: id,
      details: { name: unit.name, short_code: unit.short_code },
    });

    return true;
  }

  // ============================================================================
  // BUSINESS SETTINGS
  // ============================================================================

  public async getBusinessSettings(actor?: AuthUser | null): Promise<BusinessSettings> {
    if (actor && !actor.is_super_admin && this.businessSettings.organization_id !== actor.organization_id) {
      return {
        ...this.businessSettings,
        organization_id: actor.organization_id,
      };
    }
    return { ...this.businessSettings };
  }

  public async updateBusinessSettings(
    actor: AuthUser,
    payload: Partial<Omit<BusinessSettings, 'id' | 'organization_id' | 'created_at' | 'created_by'>>
  ): Promise<BusinessSettings> {
    accessControlService.enforceAuthorization(actor, 'business_settings.edit', actor.organization_id);

    this.businessSettings = {
      ...this.businessSettings,
      ...payload,
      organization_id: actor.organization_id,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.saveToStorage(STORAGE_KEY_DB_BUSINESS_SETTINGS, this.businessSettings);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'business_settings.update',
      target_resource: 'business_settings',
      target_id: this.businessSettings.id,
      details: payload,
    });

    return { ...this.businessSettings };
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  public async getPermissions(actor?: AuthUser | null): Promise<Permission[]> {
    if (actor) {
      accessControlService.enforceAuthorization(actor, 'roles.view', actor.organization_id);
    }
    return [...this.permissions];
  }

  public getRolePermissionCodes(roleId: string): string[] {
    const permIds = this.rolePermissions.filter((rp) => rp.role_id === roleId).map((rp) => rp.permission_id);
    return this.permissions.filter((p) => permIds.includes(p.id)).map((p) => p.code);
  }

  public getUserPermissionCodes(userId: string): string[] {
    const assignedRoleIds = this.userRoles.filter((ur) => ur.user_id === userId).map((ur) => ur.role_id);
    const permIds = this.rolePermissions
      .filter((rp) => assignedRoleIds.includes(rp.role_id))
      .map((rp) => rp.permission_id);
    return Array.from(new Set(this.permissions.filter((p) => permIds.includes(p.id)).map((p) => p.code)));
  }

  public getUserRoles(userId: string): Role[] {
    const assignedRoleIds = this.userRoles.filter((ur) => ur.user_id === userId).map((ur) => ur.role_id);
    return this.roles.filter((r) => assignedRoleIds.includes(r.id));
  }

  // ============================================================================
  // USERS MANAGEMENT
  // ============================================================================

  public async getUsers(actor: AuthUser): Promise<Array<User & { roles: Role[]; permissionsCount: number }>> {
    accessControlService.enforceAuthorization(actor, 'users.view', actor.organization_id);

    const orgUsers = actor.is_super_admin
      ? this.users
      : this.users.filter((u) => u.organization_id === actor.organization_id);

    return orgUsers.map((user) => {
      const roles = this.getUserRoles(user.id);
      const permissions = this.getUserPermissionCodes(user.id);
      return {
        ...user,
        roles,
        permissionsCount: user.is_super_admin ? this.permissions.length : permissions.length,
      };
    });
  }

  public async getUserById(
    actor: AuthUser,
    userId: string
  ): Promise<(User & { roles: Role[]; permissions: string[] }) | null> {
    accessControlService.enforceAuthorization(actor, 'users.view', actor.organization_id);

    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;

    if (!actor.is_super_admin && user.organization_id !== actor.organization_id) {
      return null;
    }

    const roles = this.getUserRoles(user.id);
    const permissions = this.getUserPermissionCodes(user.id);

    return {
      ...user,
      roles,
      permissions: user.is_super_admin ? ['*:*'] : permissions,
    };
  }

  public async createUser(
    actor: AuthUser,
    payload: {
      email: string;
      full_name: string;
      role_id: string;
      default_branch_id?: string | null;
      phone_number?: string | null;
      is_super_admin?: boolean;
    }
  ): Promise<User> {
    accessControlService.enforceAuthorization(actor, 'users.create', actor.organization_id);

    const email = payload.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email address format.');
    }

    if (!payload.full_name || payload.full_name.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }

    // Duplicate check
    const existing = this.users.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      throw new Error(`A user account with email '${email}' already exists.`);
    }

    // Role existence validation
    const targetRole = this.roles.find((r) => r.id === payload.role_id);
    if (!targetRole) {
      throw new Error('Designated role does not exist.');
    }

    // Only existing super-admins can create another super-admin
    const isSuperAdmin = Boolean(payload.is_super_admin && actor.is_super_admin);

    const newUser: User = {
      id: `usr-${Math.random().toString(36).substring(2, 9)}`,
      organization_id: actor.organization_id,
      email,
      full_name: payload.full_name.trim(),
      phone_number: payload.phone_number || null,
      avatar_url: null,
      is_super_admin: isSuperAdmin,
      default_branch_id: payload.default_branch_id || this.branches[0]?.id || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: actor.id,
      updated_by: actor.id,
    };

    this.users.unshift(newUser);
    this.saveToStorage(STORAGE_KEY_DB_USERS, this.users);

    // Assign Role
    const userRoleAssignment: UserRole = {
      id: `ur-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      user_id: newUser.id,
      role_id: targetRole.id,
      organization_id: actor.organization_id,
      assigned_by: actor.id,
      created_at: new Date().toISOString(),
    };
    this.userRoles.push(userRoleAssignment);
    this.saveToStorage(STORAGE_KEY_DB_USER_ROLES, this.userRoles);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'user.create',
      target_resource: 'users',
      target_id: newUser.id,
      details: {
        email: newUser.email,
        assigned_role: targetRole.name,
        is_super_admin: isSuperAdmin,
      },
    });

    return newUser;
  }

  public async updateUser(
    actor: AuthUser,
    userId: string,
    payload: {
      full_name?: string;
      phone_number?: string | null;
      default_branch_id?: string | null;
      role_id?: string;
      status?: EntityStatus;
      is_super_admin?: boolean;
    }
  ): Promise<User> {
    accessControlService.enforceAuthorization(actor, 'users.edit', actor.organization_id);

    const targetUserIndex = this.users.findIndex((u) => u.id === userId);
    if (targetUserIndex === -1) {
      throw new Error('User not found.');
    }

    const targetUser = this.users[targetUserIndex];

    // Tenant boundary check
    if (!actor.is_super_admin && targetUser.organization_id !== actor.organization_id) {
      throw new AuthorizationError('Access denied: Cannot modify users of another organization.');
    }

    // Super admin safeguards:
    // Prevent modifying or demoting the active Super Admin if it's the last one
    if (targetUser.is_super_admin && payload.is_super_admin === false) {
      const activeSuperAdmins = this.users.filter((u) => u.is_super_admin && u.status === 'active');
      if (activeSuperAdmins.length <= 1) {
        throw new Error('Safeguard violation: Cannot revoke the last active Super Administrator.');
      }
    }

    // Cannot deactivate self
    if (userId === actor.id && payload.status && payload.status !== 'active') {
      throw new Error('Safeguard violation: You cannot deactivate your own active session account.');
    }

    const updatedUser: User = {
      ...targetUser,
      ...(payload.full_name ? { full_name: payload.full_name.trim() } : {}),
      ...(payload.phone_number !== undefined ? { phone_number: payload.phone_number } : {}),
      ...(payload.default_branch_id !== undefined ? { default_branch_id: payload.default_branch_id } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(actor.is_super_admin && payload.is_super_admin !== undefined
        ? { is_super_admin: payload.is_super_admin }
        : {}),
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.users[targetUserIndex] = updatedUser;
    this.saveToStorage(STORAGE_KEY_DB_USERS, this.users);

    // Update Role assignment if provided
    if (payload.role_id) {
      const targetRole = this.roles.find((r) => r.id === payload.role_id);
      if (!targetRole) {
        throw new Error('Specified role does not exist.');
      }

      // Remove existing role assignments and assign new role
      this.userRoles = this.userRoles.filter((ur) => ur.user_id !== userId);
      this.userRoles.push({
        id: `ur-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        user_id: userId,
        role_id: targetRole.id,
        organization_id: targetUser.organization_id,
        assigned_by: actor.id,
        created_at: new Date().toISOString(),
      });
      this.saveToStorage(STORAGE_KEY_DB_USER_ROLES, this.userRoles);

      await this.recordAuditLog({
        organization_id: actor.organization_id,
        actor_id: actor.id,
        actor_email: actor.email,
        action: 'user.role_assign',
        target_resource: 'users',
        target_id: userId,
        details: { new_role_id: targetRole.id, new_role_name: targetRole.name },
      });
    }

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'user.update',
      target_resource: 'users',
      target_id: userId,
      details: payload,
    });

    return updatedUser;
  }

  public async toggleUserStatus(actor: AuthUser, userId: string): Promise<User> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found.');

    const newStatus: EntityStatus = user.status === 'active' ? 'inactive' : 'active';
    return this.updateUser(actor, userId, { status: newStatus });
  }

  public async deleteUser(actor: AuthUser, userId: string): Promise<boolean> {
    accessControlService.enforceAuthorization(actor, 'users.delete', actor.organization_id);

    const targetUser = this.users.find((u) => u.id === userId);
    if (!targetUser) throw new Error('User not found.');

    if (userId === actor.id) {
      throw new Error('Safeguard violation: You cannot delete your own account.');
    }

    if (targetUser.is_super_admin) {
      const activeSuperAdmins = this.users.filter((u) => u.is_super_admin && u.status === 'active');
      if (activeSuperAdmins.length <= 1) {
        throw new Error('Safeguard violation: Cannot delete the last active Super Administrator.');
      }
    }

    this.users = this.users.filter((u) => u.id !== userId);
    this.userRoles = this.userRoles.filter((ur) => ur.user_id !== userId);

    this.saveToStorage(STORAGE_KEY_DB_USERS, this.users);
    this.saveToStorage(STORAGE_KEY_DB_USER_ROLES, this.userRoles);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'user.delete',
      target_resource: 'users',
      target_id: userId,
      details: { deleted_email: targetUser.email, deleted_name: targetUser.full_name },
    });

    return true;
  }

  // ============================================================================
  // ROLES & PERMISSIONS MANAGEMENT
  // ============================================================================

  public async getRoles(actor?: AuthUser | null): Promise<Array<Role & { usersCount: number; permissionsCount: number }>> {
    if (actor) {
      accessControlService.enforceAuthorization(actor, 'roles.view', actor.organization_id);
    }

    return this.roles.map((role) => {
      const usersCount = this.userRoles.filter((ur) => ur.role_id === role.id).length;
      const permIds = this.rolePermissions.filter((rp) => rp.role_id === role.id).map((rp) => rp.permission_id);
      return {
        ...role,
        usersCount,
        permissionsCount: role.slug === 'super_admin' ? this.permissions.length : permIds.length,
      };
    });
  }

  public async getRoleWithDetails(
    actor: AuthUser,
    roleId: string
  ): Promise<{
    role: Role;
    permissions: Permission[];
    assignedUsers: User[];
  } | null> {
    accessControlService.enforceAuthorization(actor, 'roles.view', actor.organization_id);

    const role = this.roles.find((r) => r.id === roleId);
    if (!role) return null;

    const assignedUserIds = this.userRoles.filter((ur) => ur.role_id === roleId).map((ur) => ur.user_id);
    const assignedUsers = this.users.filter((u) => assignedUserIds.includes(u.id));

    let permissions: Permission[] = [];
    if (role.slug === 'super_admin') {
      permissions = [...this.permissions];
    } else {
      const permIds = this.rolePermissions.filter((rp) => rp.role_id === roleId).map((rp) => rp.permission_id);
      permissions = this.permissions.filter((p) => permIds.includes(p.id));
    }

    return {
      role: { ...role },
      permissions,
      assignedUsers,
    };
  }

  public async createRole(
    actor: AuthUser,
    payload: {
      name: string;
      slug: string;
      description?: string;
      permission_codes: string[];
    }
  ): Promise<Role> {
    accessControlService.enforceAuthorization(actor, 'roles.create', actor.organization_id);

    if (!payload.name || payload.name.trim().length < 2) {
      throw new Error('Role name must be at least 2 characters.');
    }

    const slug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!slug) {
      throw new Error('Role slug must contain valid alphanumeric characters.');
    }

    const existing = this.roles.find((r) => r.slug === slug);
    if (existing) {
      throw new Error(`A role with slug '${slug}' already exists.`);
    }

    const newRole: Role = {
      id: `role-${slug}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: actor.organization_id,
      name: payload.name.trim(),
      slug,
      description: payload.description || null,
      is_system: false,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: actor.id,
      updated_by: actor.id,
    };

    this.roles.push(newRole);
    this.saveToStorage(STORAGE_KEY_DB_ROLES, this.roles);

    // Map Permissions
    const matchedPerms = this.permissions.filter((p) => payload.permission_codes.includes(p.code));
    for (const perm of matchedPerms) {
      this.rolePermissions.push({
        id: `rp-${newRole.slug}-${perm.id}`,
        role_id: newRole.id,
        permission_id: perm.id,
        created_at: new Date().toISOString(),
      });
    }
    this.saveToStorage(STORAGE_KEY_DB_ROLE_PERMS, this.rolePermissions);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'role.create',
      target_resource: 'roles',
      target_id: newRole.id,
      details: { role_name: newRole.name, permissions_count: matchedPerms.length },
    });

    return newRole;
  }

  public async updateRole(
    actor: AuthUser,
    roleId: string,
    payload: {
      name?: string;
      description?: string;
      permission_codes?: string[];
      status?: EntityStatus;
    }
  ): Promise<Role> {
    accessControlService.enforceAuthorization(actor, 'roles.edit', actor.organization_id);

    const roleIndex = this.roles.findIndex((r) => r.id === roleId);
    if (roleIndex === -1) throw new Error('Role not found.');

    const targetRole = this.roles[roleIndex];

    // Safeguard Super Admin from permission stripping
    if (targetRole.slug === 'super_admin' && payload.permission_codes && !payload.permission_codes.includes('*:*')) {
      throw new Error('Safeguard violation: Cannot strip system privileges from the Super Administrator role.');
    }

    const updatedRole: Role = {
      ...targetRole,
      ...(payload.name ? { name: payload.name.trim() } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    this.roles[roleIndex] = updatedRole;
    this.saveToStorage(STORAGE_KEY_DB_ROLES, this.roles);

    // Update Permissions if provided
    if (payload.permission_codes) {
      this.rolePermissions = this.rolePermissions.filter((rp) => rp.role_id !== roleId);
      const matchedPerms = this.permissions.filter((p) => payload.permission_codes?.includes(p.code));
      for (const perm of matchedPerms) {
        this.rolePermissions.push({
          id: `rp-${targetRole.slug}-${perm.id}`,
          role_id: targetRole.id,
          permission_id: perm.id,
          created_at: new Date().toISOString(),
        });
      }
      this.saveToStorage(STORAGE_KEY_DB_ROLE_PERMS, this.rolePermissions);

      await this.recordAuditLog({
        organization_id: actor.organization_id,
        actor_id: actor.id,
        actor_email: actor.email,
        action: 'role.permissions_update',
        target_resource: 'roles',
        target_id: roleId,
        details: { permission_count: matchedPerms.length },
      });
    }

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'role.update',
      target_resource: 'roles',
      target_id: roleId,
      details: payload,
    });

    return updatedRole;
  }

  public async deleteRole(actor: AuthUser, roleId: string): Promise<boolean> {
    accessControlService.enforceAuthorization(actor, 'roles.delete', actor.organization_id);

    const targetRole = this.roles.find((r) => r.id === roleId);
    if (!targetRole) throw new Error('Role not found.');

    if (targetRole.is_system || targetRole.slug === 'super_admin') {
      throw new Error('Safeguard violation: System roles cannot be deleted.');
    }

    const assignedUsers = this.userRoles.filter((ur) => ur.role_id === roleId);
    if (assignedUsers.length > 0) {
      throw new Error(
        `Cannot delete role '${targetRole.name}' because it is actively assigned to ${assignedUsers.length} user(s). Reassign them first.`
      );
    }

    this.roles = this.roles.filter((r) => r.id !== roleId);
    this.rolePermissions = this.rolePermissions.filter((rp) => rp.role_id !== roleId);

    this.saveToStorage(STORAGE_KEY_DB_ROLES, this.roles);
    this.saveToStorage(STORAGE_KEY_DB_ROLE_PERMS, this.rolePermissions);

    await this.recordAuditLog({
      organization_id: actor.organization_id,
      actor_id: actor.id,
      actor_email: actor.email,
      action: 'role.delete',
      target_resource: 'roles',
      target_id: roleId,
      details: { deleted_role_name: targetRole.name, deleted_role_slug: targetRole.slug },
    });

    return true;
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  public async getAuditLogs(actor: AuthUser): Promise<AuditLog[]> {
    accessControlService.enforceAuthorization(actor, 'audit_logs.view', actor.organization_id);

    return actor.is_super_admin
      ? [...this.auditLogs]
      : this.auditLogs.filter((log) => log.organization_id === actor.organization_id);
  }

  public async recordAuditLog(
    log: Omit<AuditLog, 'id' | 'created_at'>
  ): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      ip_address: log.ip_address || '127.0.0.1',
    };

    this.auditLogs.unshift(newLog);
    // Keep max 500 audit entries
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    this.saveToStorage(STORAGE_KEY_DB_AUDIT, this.auditLogs);
    return newLog;
  }

  // ============================================================================
  // DIAGNOSTICS & SYSTEM TELEMETRY
  // ============================================================================

  public getFoundationSchemaStats() {
    return {
      connectedToPostgres: ENV.isInsforgeConfigured,
      tables: [
        { name: 'organizations', count: 1, status: 'active' },
        { name: 'branches', count: this.branches.length, status: 'active' },
        { name: 'departments', count: this.departments.length, status: 'active' },
        { name: 'warehouses', count: this.warehouses.length, status: 'active' },
        { name: 'warehouse_locations', count: this.warehouseLocations.length, status: 'active' },
        { name: 'units', count: this.units.length, status: 'active' },
        { name: 'business_settings', count: 1, status: 'active' },
        { name: 'users', count: this.users.length, status: 'active' },
        { name: 'roles', count: this.roles.length, status: 'active' },
        { name: 'permissions', count: this.permissions.length, status: 'active' },
        { name: 'role_permissions', count: this.rolePermissions.length, status: 'active' },
        { name: 'user_roles', count: this.userRoles.length, status: 'active' },
        { name: 'audit_logs', count: this.auditLogs.length, status: 'active' },
      ],
    };
  }
}

export const databaseService = new DatabaseService();
