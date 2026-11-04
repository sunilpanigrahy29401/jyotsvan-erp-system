import { pool } from './db.ts';
import {
  INITIAL_ORGANIZATION,
  INITIAL_BRANCHES,
  INITIAL_PERMISSIONS,
  INITIAL_ROLES,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_USERS,
  INITIAL_USER_ROLES,
  INITIAL_WAREHOUSES,
  INITIAL_WAREHOUSE_LOCATIONS,
  INITIAL_DEPARTMENTS,
  INITIAL_UNITS,
  INITIAL_BUSINESS_SETTINGS,
  INITIAL_AUDIT_LOGS,
} from '../database/initial-data.ts';

export async function syncFoundationData() {
  const client = await pool.connect();
  try {
    console.log('[PostgreSQL] Synchronizing enterprise foundation records into InsForge...');
    await client.query('BEGIN');

    // Fast-path: check if organization and foundation data is already present
    const orgCheck = await client.query('SELECT id FROM organizations WHERE id = $1', [INITIAL_ORGANIZATION.id]);
    if (orgCheck.rows.length > 0) {
      // Ensure super-admin user is mapped and active
      await client.query(
        `INSERT INTO users (id, organization_id, email, full_name, phone_number, is_super_admin, default_branch_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO UPDATE SET is_super_admin = TRUE, status = 'active'`,
        [
          'usr-owner-sunil',
          INITIAL_ORGANIZATION.id,
          'sunilpanigrahy29401@gmail.com',
          'Sunil Panigrahy',
          '+91 9800000000',
          true,
          INITIAL_BRANCHES[0].id,
          'active',
        ]
      );
      await client.query('COMMIT');
      console.log('[PostgreSQL] Foundation data verified (fast-path complete).');
      return;
    }

    // 1. Organization
    await client.query(
      `INSERT INTO organizations (id, name, legal_name, code, tax_identifier, currency, timezone, email, phone, website, address, city, state, country, postal_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO NOTHING`,
      [
        INITIAL_ORGANIZATION.id,
        INITIAL_ORGANIZATION.name,
        INITIAL_ORGANIZATION.legal_name,
        INITIAL_ORGANIZATION.code,
        INITIAL_ORGANIZATION.tax_identifier,
        INITIAL_ORGANIZATION.currency,
        INITIAL_ORGANIZATION.timezone,
        INITIAL_ORGANIZATION.email,
        INITIAL_ORGANIZATION.phone,
        INITIAL_ORGANIZATION.website,
        INITIAL_ORGANIZATION.address,
        INITIAL_ORGANIZATION.city,
        INITIAL_ORGANIZATION.state,
        INITIAL_ORGANIZATION.country,
        INITIAL_ORGANIZATION.postal_code,
        INITIAL_ORGANIZATION.status,
      ]
    );

    // 2. Branches
    for (const br of INITIAL_BRANCHES) {
      await client.query(
        `INSERT INTO branches (id, organization_id, name, code, branch_type, address, city, state, country, postal_code, phone, phone_number, email, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [
          br.id,
          br.organization_id,
          br.name,
          br.code,
          br.branch_type,
          br.address,
          br.city,
          br.state,
          br.country,
          br.postal_code,
          br.phone,
          br.phone_number || br.phone,
          br.email,
          br.status,
        ]
      );
    }

    // 3. Departments
    for (const dep of INITIAL_DEPARTMENTS) {
      await client.query(
        `INSERT INTO departments (id, organization_id, name, code, description, head_user_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          dep.id,
          dep.organization_id,
          dep.name,
          dep.code,
          dep.description,
          dep.head_user_id,
          dep.status,
        ]
      );
    }

    // 4. Permissions (127 capability tokens)
    for (const perm of INITIAL_PERMISSIONS) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module`,
        [perm.id, perm.code, perm.module, perm.description]
      );
    }

    // 5. Roles (11 baseline enterprise roles)
    for (const role of INITIAL_ROLES) {
      await client.query(
        `INSERT INTO roles (id, organization_id, name, slug, description, is_system, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [
          role.id,
          role.organization_id || INITIAL_ORGANIZATION.id,
          role.name,
          role.slug,
          role.description,
          role.is_system,
          role.status,
        ]
      );
    }

    // 6. Role Permissions (Batch Insert)
    const chunkSize = 50;
    for (let i = 0; i < INITIAL_ROLE_PERMISSIONS.length; i += chunkSize) {
      const chunk = INITIAL_ROLE_PERMISSIONS.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      chunk.forEach((rp, idx) => {
        const offset = idx * 3;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
        values.push(rp.id, rp.role_id, rp.permission_id);
      });
      await client.query(
        `INSERT INTO role_permissions (id, role_id, permission_id)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (id) DO NOTHING`,
        values
      );
    }

    // 7. Users
    for (const u of INITIAL_USERS) {
      await client.query(
        `INSERT INTO users (id, organization_id, email, full_name, phone_number, avatar_url, is_super_admin, default_branch_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, default_branch_id = EXCLUDED.default_branch_id`,
        [
          u.id,
          u.organization_id,
          u.email,
          u.full_name,
          u.phone_number,
          u.avatar_url,
          u.is_super_admin,
          u.default_branch_id,
          u.status,
        ]
      );
    }

    // Ensure user's email is seeded with active super_admin privileges
    await client.query(
      `INSERT INTO users (id, organization_id, email, full_name, phone_number, is_super_admin, default_branch_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET is_super_admin = TRUE, status = 'active'`,
      [
        'usr-owner-sunil',
        INITIAL_ORGANIZATION.id,
        'sunilpanigrahy29401@gmail.com',
        'Sunil Panigrahy',
        '+91 9800000000',
        true,
        INITIAL_BRANCHES[0].id,
        'active',
      ]
    );

    // 8. User Roles Mapping
    for (const ur of INITIAL_USER_ROLES) {
      await client.query(
        `INSERT INTO user_roles (id, user_id, role_id, organization_id, assigned_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [ur.id, ur.user_id, ur.role_id, ur.organization_id, ur.assigned_by]
      );
    }

    // Assign Super Admin role to owner user
    await client.query(
      `INSERT INTO user_roles (id, user_id, role_id, organization_id, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      ['ur-owner-sa', 'usr-owner-sunil', 'role-super-admin', INITIAL_ORGANIZATION.id, 'system']
    );

    // 9. Warehouses
    for (const wh of INITIAL_WAREHOUSES) {
      await client.query(
        `INSERT INTO warehouses (id, organization_id, branch_id, name, code, warehouse_type, address, city, state, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          wh.id,
          wh.organization_id,
          wh.branch_id,
          wh.name,
          wh.code,
          wh.warehouse_type,
          wh.address,
          wh.city,
          wh.state,
          wh.status,
        ]
      );
    }

    // 10. Warehouse Locations
    for (const loc of INITIAL_WAREHOUSE_LOCATIONS) {
      await client.query(
        `INSERT INTO warehouse_locations (id, organization_id, warehouse_id, code, name, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          loc.id,
          loc.organization_id,
          loc.warehouse_id,
          loc.code,
          loc.name,
          loc.description,
          loc.status,
        ]
      );
    }

    // 11. Units of Measurement
    for (const unit of INITIAL_UNITS) {
      await client.query(
        `INSERT INTO units (id, organization_id, name, short_code, category, description, is_system, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          unit.id,
          unit.organization_id,
          unit.name,
          unit.short_code,
          unit.category,
          unit.description,
          unit.is_system,
          unit.status,
        ]
      );
    }

    // 12. Business Settings
    await client.query(
      `INSERT INTO business_settings (id, organization_id, default_currency, timezone, date_format, number_format, default_weight_unit, default_volume_unit, default_count_unit, fiscal_year_start_month, business_days_per_week, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (organization_id) DO NOTHING`,
      [
        INITIAL_BUSINESS_SETTINGS.id,
        INITIAL_BUSINESS_SETTINGS.organization_id,
        INITIAL_BUSINESS_SETTINGS.default_currency,
        INITIAL_BUSINESS_SETTINGS.timezone,
        INITIAL_BUSINESS_SETTINGS.date_format,
        INITIAL_BUSINESS_SETTINGS.number_format,
        INITIAL_BUSINESS_SETTINGS.default_weight_unit,
        INITIAL_BUSINESS_SETTINGS.default_volume_unit,
        INITIAL_BUSINESS_SETTINGS.default_count_unit,
        INITIAL_BUSINESS_SETTINGS.fiscal_year_start_month,
        INITIAL_BUSINESS_SETTINGS.business_days_per_week,
        INITIAL_BUSINESS_SETTINGS.status,
      ]
    );

    // 13. Audit Logs
    for (const log of INITIAL_AUDIT_LOGS) {
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          log.id,
          log.organization_id,
          log.actor_id,
          log.action,
          log.target_resource,
          log.target_id,
          JSON.stringify(log.details),
          log.ip_address,
          log.created_at,
        ]
      );
    }

    // 14. Initialize InsForge storage default buckets
    const defaultBuckets = [
      { name: 'documents', public: false },
      { name: 'product-images', public: true },
      { name: 'attachments', public: false },
      { name: 'qc-documents', public: false },
      { name: 'employee-documents', public: false },
      { name: 'reports', public: false },
    ];

    for (const b of defaultBuckets) {
      try {
        await client.query(
          `INSERT INTO storage.buckets (name, public)
           VALUES ($1, $2)
           ON CONFLICT (name) DO NOTHING`,
          [b.name, b.public]
        );
      } catch (bucketErr) {
        console.warn(`[PostgreSQL Storage] Skipping bucket ${b.name}:`, bucketErr);
      }
    }

    await client.query('COMMIT');
    console.log('[PostgreSQL] Foundation data synchronization complete in InsForge.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Foundation data sync failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
