import { Pool } from 'pg';

const connectionString =
  process.env.INSFORGE_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    '[PostgreSQL Warning] Neither INSFORGE_DATABASE_URL nor DATABASE_URL is set in environment variables. Database operations will fail unless configured.'
  );
}

/**
 * TLS for the database connection.
 * - Certificates are verified by default.
 * - DATABASE_SSL=disable          -> no TLS (local development only).
 * - DATABASE_SSL_CA=<PEM string>  -> trust a private CA (e.g. managed provider).
 * - DATABASE_SSL_REJECT_UNAUTHORIZED=false -> explicit, logged opt-out (not allowed in production).
 */
function buildSslConfig(): false | { rejectUnauthorized: boolean; ca?: string } {
  const mode = (process.env.DATABASE_SSL || '').toLowerCase();
  if (mode === 'disable') return false;
  const optOut = (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'false';
  if (optOut) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_SSL_REJECT_UNAUTHORIZED=false is not allowed in production. Provide DATABASE_SSL_CA instead.');
    }
    console.warn('[PostgreSQL] TLS certificate verification is DISABLED (development opt-out).');
    return { rejectUnauthorized: false };
  }
  const ca = process.env.DATABASE_SSL_CA;
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: buildSslConfig(),
  max: 25,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production' && duration > 500) {
    console.log('[PostgreSQL] executed query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

export async function initDatabaseSchema() {
  console.log('[PostgreSQL] Initializing and verifying InsForge foundation database schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Organizations (Enterprise Tenants)
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255),
        code VARCHAR(64) NOT NULL UNIQUE,
        tax_identifier VARCHAR(64),
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        timezone VARCHAR(64) DEFAULT 'Asia/Kolkata' NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(64),
        website VARCHAR(255),
        address TEXT,
        city VARCHAR(128),
        state VARCHAR(128),
        country VARCHAR(128) DEFAULT 'India' NOT NULL,
        postal_code VARCHAR(32),
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Branches (Plants, Facilities, Operating Divisions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        branch_type VARCHAR(64) DEFAULT 'factory' NOT NULL,
        address TEXT,
        city VARCHAR(128),
        state VARCHAR(128),
        country VARCHAR(128) DEFAULT 'India' NOT NULL,
        postal_code VARCHAR(32),
        phone VARCHAR(64),
        phone_number VARCHAR(64),
        email VARCHAR(255),
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_branch_code UNIQUE (organization_id, code)
      );
    `);

    // 3. Departments (Organizational Divisions & Units)
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        description TEXT,
        head_user_id VARCHAR(64),
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_department_code UNIQUE (organization_id, code)
      );
    `);

    // 4. Roles (Enterprise Security Roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(64) NOT NULL UNIQUE,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 5. Permissions (Granular capability tokens)
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(128) NOT NULL UNIQUE,
        module VARCHAR(64) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 6. Role Permissions (Mapping permissions to roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id VARCHAR(64) PRIMARY KEY,
        role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id VARCHAR(64) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_role_permission UNIQUE (role_id, permission_id)
      );
    `);

    // 7. Users (Operator Profiles mapped to InsForge Auth)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(64),
        avatar_url TEXT,
        is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
        default_branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
        last_login_at TIMESTAMPTZ,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 8. User Roles (Mapping users to roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        assigned_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_user_role_assignment UNIQUE (user_id, role_id, organization_id)
      );
    `);

    // 9. Warehouses (Physical Inventory & Depot Nodes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        warehouse_type VARCHAR(64) NOT NULL,
        address TEXT,
        address_line1 TEXT,
        city VARCHAR(128),
        state VARCHAR(128),
        postal_code VARCHAR(32),
        contact_person VARCHAR(128),
        phone VARCHAR(64),
        email VARCHAR(255),
        capacity_cubic_meters NUMERIC(15, 2),
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_warehouse_code UNIQUE (organization_id, code)
      );
    `);

    // 10. Warehouse Locations (Storage Bins, Zones, Staging Areas)
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse_locations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_warehouse_location_code UNIQUE (warehouse_id, code)
      );
    `);

    // 11. Units of Measurement (UOM Master for Operations & Inventory)
    await client.query(`
      CREATE TABLE IF NOT EXISTS units (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(64) NOT NULL,
        short_code VARCHAR(32) NOT NULL,
        category VARCHAR(32) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_unit_code UNIQUE (organization_id, short_code)
      );
    `);

    // 12. Business Settings (Core Tenant Formatting & Preferences)
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_settings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        default_currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        timezone VARCHAR(64) DEFAULT 'Asia/Kolkata' NOT NULL,
        date_format VARCHAR(32) DEFAULT 'DD/MM/YYYY' NOT NULL,
        number_format VARCHAR(32) DEFAULT 'indian_lakhs' NOT NULL,
        default_weight_unit VARCHAR(32) DEFAULT 'kg',
        default_volume_unit VARCHAR(32) DEFAULT 'L',
        default_count_unit VARCHAR(32) DEFAULT 'pcs',
        fiscal_year_start_month INTEGER DEFAULT 4 NOT NULL,
        business_days_per_week INTEGER DEFAULT 6 NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 13. Audit Logs (Enterprise Access & Audit Trail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(64),
        actor_id VARCHAR(64),
        actor_email VARCHAR(255),
        action VARCHAR(128) NOT NULL,
        entity_type VARCHAR(64),
        target_resource VARCHAR(64),
        entity_id VARCHAR(64),
        target_id VARCHAR(64),
        details JSONB,
        ip_address VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // Performance & Multi-Tenancy Indexing Strategy
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_branches_org_id ON branches(organization_id);
      CREATE INDEX IF NOT EXISTS idx_departments_org_id ON departments(organization_id);
      CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_org_id ON user_roles(organization_id);
      CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(organization_id);
      CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_warehouses_org_id ON warehouses(organization_id);
      CREATE INDEX IF NOT EXISTS idx_warehouses_branch_id ON warehouses(branch_id);
      CREATE INDEX IF NOT EXISTS idx_locations_wh_id ON warehouse_locations(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_locations_org_id ON warehouse_locations(organization_id);
      CREATE INDEX IF NOT EXISTS idx_units_org_id ON units(organization_id);
      CREATE INDEX IF NOT EXISTS idx_business_settings_org_id ON business_settings(organization_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('[PostgreSQL] Foundation database schema verified and indexed successfully in InsForge.');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[PostgreSQL] Schema initialization/verification failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
