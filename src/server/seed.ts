import { pool } from './db.js';
import {
  INITIAL_ORGANIZATION,
  INITIAL_BRANCHES,
  INITIAL_PERMISSIONS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_WAREHOUSES,
  INITIAL_DEPARTMENTS,
} from '../database/initial-data.js';

export async function seedInitialData() {
  const client = await pool.connect();
  try {
    // Check if organization already exists
    const orgCheck = await client.query('SELECT id FROM organizations LIMIT 1');
    if (orgCheck.rows.length > 0) {
      console.log('[PostgreSQL] Database already has seeded organization data.');
      return;
    }

    console.log('[PostgreSQL] Seeding initial Jyotsvan Enterprise data...');
    await client.query('BEGIN');

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

    // 4. Permissions
    for (const perm of INITIAL_PERMISSIONS) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING`,
        [perm.id, perm.code, perm.module, perm.description]
      );
    }

    // 5. Roles
    for (const role of INITIAL_ROLES) {
      await client.query(
        `INSERT INTO roles (id, organization_id, name, slug, description, is_system, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO NOTHING`,
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

    // 6. Users
    for (const u of INITIAL_USERS) {
      await client.query(
        `INSERT INTO users (id, organization_id, email, full_name, phone_number, avatar_url, is_super_admin, default_branch_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO NOTHING`,
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

    // Ensure user's email is also seeded as Super Admin
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

    // 7. Warehouses
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

    // 8. Categories & Sample Products
    const sampleCategories = [
      { id: 'cat-raw-01', code: 'RAW_MAT', name: 'Raw Materials & Chemical Aggregates' },
      { id: 'cat-fg-01', code: 'FIN_GOODS', name: 'Finished Engineered Equipment' },
      { id: 'cat-pack-01', code: 'PACK_MAT', name: 'Industrial Packaging & Crates' },
    ];

    for (const cat of sampleCategories) {
      await client.query(
        `INSERT INTO categories (id, organization_id, name, code, description, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [cat.id, INITIAL_ORGANIZATION.id, cat.name, cat.code, cat.name, 'active']
      );
    }

    const sampleProducts = [
      { id: 'prod-01', sku: 'JYT-PUMP-400', name: 'High-Pressure Industrial Hydraulic Pump 400L', catId: 'cat-fg-01', unit: 'units', cost: 18500, price: 26500, mrp: 29900 },
      { id: 'prod-02', sku: 'JYT-VALV-80', name: 'Precision Cryogenic Control Valve 80mm', catId: 'cat-fg-01', unit: 'units', cost: 4200, price: 6800, mrp: 7900 },
      { id: 'prod-03', sku: 'JYT-ST-AL316', name: 'Stainless Steel Grade 316L Alloy Sheets (10mm)', catId: 'cat-raw-01', unit: 'kg', cost: 380, price: 540, mrp: 600 },
      { id: 'prod-04', sku: 'JYT-HDPE-DRUM', name: 'Heavy-Duty 200L Sealed Chemical Barrel', catId: 'cat-pack-01', unit: 'barrels', cost: 1200, price: 1850, mrp: 2100 },
    ];

    for (const p of sampleProducts) {
      await client.query(
        `INSERT INTO products (id, organization_id, category_id, sku, name, unit, cost_price, selling_price, mrp, reorder_level, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, INITIAL_ORGANIZATION.id, p.catId, p.sku, p.name, p.unit, p.cost, p.price, p.mrp, 15, 'active']
      );

      // Seed initial stock
      await client.query(
        `INSERT INTO inventory_stock (id, product_id, warehouse_id, quantity, reserved_quantity, batch_number)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [`stk-${p.id}`, p.id, INITIAL_WAREHOUSES[0]?.id || 'wh-factory-fg-01', 120, 10, 'BAT-2026-001']
      );
    }

    // 9. Customers
    const sampleCustomers = [
      { id: 'cust-01', name: 'Bharat Heavy Engineering Consortium Ltd', code: 'CUST-BHE-01', email: 'procurement@bharatheavy.in', phone: '+91 22 8899 0011', gstin: '27AAACB0000A1Z5', city: 'Pune', state: 'Maharashtra', limit: 5000000 },
      { id: 'cust-02', name: 'Kalinga Steel & Infrastructure Infrastructure', code: 'CUST-KAL-02', email: 'orders@kalingasteel.co.in', phone: '+91 674 3322 110', gstin: '21AABCK1122D1ZP', city: 'Bhubaneswar', state: 'Odisha', limit: 3000000 },
      { id: 'cust-03', name: 'Northern Petrochemical Distribution Corp', code: 'CUST-NPD-03', email: 'supply@northernpetro.org', phone: '+91 11 9988 7766', gstin: '07AAACN3344K1ZV', city: 'New Delhi', state: 'Delhi', limit: 8000000 },
    ];

    for (const c of sampleCustomers) {
      await client.query(
        `INSERT INTO customers (id, organization_id, name, code, email, phone, gstin, customer_type, credit_limit, city, state, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, INITIAL_ORGANIZATION.id, c.name, c.code, c.email, c.phone, c.gstin, 'distributor', c.limit, c.city, c.state, 'active']
      );
    }

    // 10. Orders
    await client.query(
      `INSERT INTO orders (id, organization_id, branch_id, customer_id, order_number, order_date, status, subtotal, tax_amount, total_amount, created_by)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        'ord-2026-001',
        INITIAL_ORGANIZATION.id,
        INITIAL_BRANCHES[0].id,
        'cust-01',
        'SO-2026-0001',
        'confirmed',
        265000,
        47700,
        312700,
        'usr-owner-sunil',
      ]
    );

    await client.query(
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, tax_rate, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        'item-001-1',
        'ord-2026-001',
        'prod-01',
        10,
        26500,
        18.0,
        312700,
      ]
    );

    await client.query('COMMIT');
    console.log('[PostgreSQL] Successfully seeded initial Jyotsvan Enterprise dataset.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

seedInitialData()
  .then(() => {
    console.log('[PostgreSQL] Seed process finished.');
  })
  .catch((err) => {
    console.error('[PostgreSQL] Seed error:', err);
  });
