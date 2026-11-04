-- ==============================================================================
-- Jyotsvan Enterprise Platform - Database Schema (Phase 1 Foundation)
-- Compatible with PostgreSQL on InsForge
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Enterprise Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    tax_identifier VARCHAR(64),
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    country VARCHAR(64) DEFAULT 'United States' NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- 2. Branches (Plants, Facilities, Operating Divisions)
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    branch_type VARCHAR(48) NOT NULL,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128),
    country VARCHAR(64) NOT NULL,
    postal_code VARCHAR(32),
    phone_number VARCHAR(32),
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uk_org_branch_code UNIQUE (organization_id, code)
);

-- 3. Users (Operator Profiles mapped to InsForge Auth)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32),
    avatar_url TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
    default_branch_id VARCHAR(36) REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- 4. Roles (Enterprise Security Roles)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(64) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uk_org_role_slug UNIQUE (organization_id, slug)
);

-- 5. Permissions (Granular capability tokens)
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code VARCHAR(128) UNIQUE NOT NULL,
    module VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Role Permissions (Mapping permissions to roles)
CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    role_id VARCHAR(36) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(36) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uk_role_permission UNIQUE (role_id, permission_id)
);

-- 7. User Roles (Mapping users to roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(36) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_by VARCHAR(36),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uk_user_role_assignment UNIQUE (user_id, role_id, organization_id)
);

-- 8. Warehouses (Physical Inventory & Depot Nodes)
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id VARCHAR(36) REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    warehouse_type VARCHAR(48) NOT NULL,
    address_line1 TEXT,
    city VARCHAR(128),
    state VARCHAR(128),
    postal_code VARCHAR(32),
    contact_person VARCHAR(128),
    phone VARCHAR(32),
    email VARCHAR(255),
    capacity_cubic_meters NUMERIC(12, 2),
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uk_org_warehouse_code UNIQUE (organization_id, code)
);

-- 9. Warehouse Locations (Storage Bins, Zones, Staging Areas)
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    warehouse_id VARCHAR(36) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uk_warehouse_location_code UNIQUE (warehouse_id, code)
);

-- 10. Departments (Organizational Business Units)
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    description TEXT,
    head_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uk_org_department_code UNIQUE (organization_id, code)
);

-- 11. Units of Measurement (UOM Master for Inventory, Production, Procurement)
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(64) NOT NULL,
    short_code VARCHAR(32) NOT NULL,
    category VARCHAR(32) NOT NULL, -- count, weight, volume, length, packaging, other
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uk_org_unit_code UNIQUE (organization_id, short_code)
);

-- 12. Business Settings (Core Organizational Preferences & Formatting)
CREATE TABLE IF NOT EXISTS business_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    default_currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    timezone VARCHAR(64) DEFAULT 'UTC' NOT NULL,
    date_format VARCHAR(32) DEFAULT 'DD/MM/YYYY' NOT NULL,
    number_format VARCHAR(32) DEFAULT 'standard' NOT NULL,
    default_weight_unit VARCHAR(32) DEFAULT 'kg',
    default_volume_unit VARCHAR(32) DEFAULT 'L',
    default_count_unit VARCHAR(32) DEFAULT 'pcs',
    fiscal_year_start_month INTEGER DEFAULT 4 NOT NULL,
    business_days_per_week INTEGER DEFAULT 6 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- 13. Audit Logs (Enterprise Access & Security Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_resource VARCHAR(64) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance & tenancy filtering
CREATE INDEX IF NOT EXISTS idx_branches_org_id ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org_id ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_org_id ON warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_wh_id ON warehouse_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_units_org_id ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
