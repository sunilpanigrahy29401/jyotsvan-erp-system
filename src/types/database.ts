/**
 * Jyotsvan Enterprise Platform - Phase 1 Database Types
 * Represents the foundational PostgreSQL entities managed via InsForge.
 */

export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'archived' | 'pending';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  status: EntityStatus;
}

export interface Organization extends BaseEntity {
  name: string;
  code: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  postal_code?: string | null;
  tax_identifier?: string | null;
  currency: string;
  timezone: string;
}

export type BranchType = 'headquarters' | 'factory' | 'depot' | 'sales_office' | 'warehouse';

export interface Branch extends BaseEntity {
  organization_id: string;
  name: string;
  code: string;
  branch_type: BranchType;
  address?: string | null;
  city: string;
  state?: string | null;
  country: string;
  postal_code?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  email?: string | null;
}

export interface Department extends BaseEntity {
  organization_id: string;
  name: string;
  code: string;
  description?: string | null;
  head_user_id?: string | null;
}

export interface User extends BaseEntity {
  organization_id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  is_super_admin: boolean;
  default_branch_id?: string | null;
  last_login_at?: string | null;
}

export interface Role extends BaseEntity {
  organization_id?: string | null; // null for system-wide roles
  name: string;
  slug: string;
  description?: string | null;
  is_system: boolean;
}

export interface Permission {
  id: string;
  code: string; // format: domain:action e.g. "inventory:read"
  module: string; // e.g. "inventory", "manufacturing"
  description: string;
  name?: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  organization_id: string;
  assigned_by?: string | null;
  created_at: string;
}

export type WarehouseType =
  | 'central_hub'
  | 'regional_depot'
  | 'factory_storage'
  | 'transit_hub'
  | 'raw_material'
  | 'finished_goods'
  | 'packaging'
  | 'wip_production'
  | 'dispatch'
  | 'cnf'
  | 'quarantine';

export interface Warehouse extends BaseEntity {
  organization_id: string;
  branch_id?: string | null;
  name: string;
  code: string;
  warehouse_type: WarehouseType;
  address?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  capacity_cubic_meters?: number | null;
}

export interface WarehouseLocation extends BaseEntity {
  organization_id: string;
  warehouse_id: string;
  code: string; // unique within warehouse
  name: string;
  description?: string | null;
}

export type UnitCategory = 'count' | 'weight' | 'volume' | 'length' | 'packaging' | 'area' | 'other';

export interface Unit extends BaseEntity {
  organization_id: string;
  name: string; // e.g., 'Kilogram', 'Piece'
  short_code: string; // e.g., 'kg', 'pcs' (unique within org)
  category: UnitCategory;
  description?: string | null;
  is_system?: boolean;
}

export interface BusinessSettings extends BaseEntity {
  organization_id: string;
  default_currency: string;
  timezone: string;
  date_format: string; // 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'
  number_format: string; // 'standard' | 'indian_lakhs'
  default_weight_unit?: string;
  default_volume_unit?: string;
  default_count_unit?: string;
  fiscal_year_start_month?: number;
  business_days_per_week?: number;
}

export * from './audit.ts';
export * from './integrations.ts';

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.status_change'
  | 'user.role_assign'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'role.permissions_update'
  | 'organization.update'
  | 'branch.create'
  | 'branch.update'
  | 'branch.status_change'
  | 'branch.delete'
  | 'department.create'
  | 'department.update'
  | 'department.status_change'
  | 'department.delete'
  | 'warehouse.create'
  | 'warehouse.update'
  | 'warehouse.status_change'
  | 'warehouse.delete'
  | 'location.create'
  | 'location.update'
  | 'location.status_change'
  | 'location.delete'
  | 'unit.create'
  | 'unit.update'
  | 'unit.status_change'
  | 'unit.delete'
  | 'business_settings.update'
  | string;

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id?: string;
  actor_user_id?: string;
  actor_name?: string;
  actor_email: string;
  actor_type?: string;
  action: AuditAction;
  event_type?: string;
  module?: string;
  target_resource?: string;
  entity_type?: string;
  target_id?: string;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  changed_fields?: any[];
  ip_address?: string;
  source?: string;
  status?: string;
  failure_reason?: string;
  previous_hash?: string;
  record_hash?: string;
  created_at: string;
}
