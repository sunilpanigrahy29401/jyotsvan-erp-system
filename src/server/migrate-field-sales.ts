// src/server/migrate-field-sales.ts
// Enterprise Field Sales Execution Layer Schema Migration (Phase 20)

import { pool } from './db.ts';

export async function runFieldSalesMigration() {
  console.log('[Phase 20 Migration] Initializing Field Sales Execution Layer schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Sales Territory Assignments Table (`sales_territory_assignments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_territory_assignments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        territory_id VARCHAR(64) NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
        salesperson_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        salesperson_name VARCHAR(128) NOT NULL,
        salesperson_email VARCHAR(255),
        role VARCHAR(64) NOT NULL DEFAULT 'sales_officer',
        effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        effective_to TIMESTAMPTZ,
        priority_rank INTEGER DEFAULT 1 NOT NULL,
        is_primary BOOLEAN DEFAULT TRUE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_territory_user UNIQUE (organization_id, territory_id, salesperson_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_terr_assign_org ON sales_territory_assignments(organization_id);
      CREATE INDEX IF NOT EXISTS idx_terr_assign_terr ON sales_territory_assignments(territory_id);
      CREATE INDEX IF NOT EXISTS idx_terr_assign_user ON sales_territory_assignments(salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_terr_assign_status ON sales_territory_assignments(status);
    `);

    // 2. Field Sales Routes Table (`field_sales_routes`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_sales_routes (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        route_code VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        territory_id VARCHAR(64) REFERENCES territories(id) ON DELETE SET NULL,
        salesperson_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        salesperson_name VARCHAR(128),
        frequency VARCHAR(32) DEFAULT 'weekly' NOT NULL,
        days_of_week JSONB DEFAULT '["monday", "wednesday", "friday"]'::jsonb NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        total_stops INTEGER DEFAULT 0 NOT NULL,
        estimated_duration_hours NUMERIC(6,2) DEFAULT 4.0 NOT NULL,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_field_route_code UNIQUE (organization_id, route_code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fs_routes_org ON field_sales_routes(organization_id);
      CREATE INDEX IF NOT EXISTS idx_fs_routes_terr ON field_sales_routes(territory_id);
      CREATE INDEX IF NOT EXISTS idx_fs_routes_user ON field_sales_routes(salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_fs_routes_status ON field_sales_routes(status);
    `);

    // 3. Field Sales Route Stops Table (`field_sales_route_stops`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_sales_route_stops (
        id VARCHAR(64) PRIMARY KEY,
        route_id VARCHAR(64) NOT NULL REFERENCES field_sales_routes(id) ON DELETE CASCADE,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        stop_sequence INTEGER NOT NULL DEFAULT 1,
        customer_type VARCHAR(32) NOT NULL DEFAULT 'retailer',
        customer_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_code VARCHAR(64),
        address TEXT,
        city VARCHAR(128),
        phone VARCHAR(64),
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        expected_duration_minutes INTEGER DEFAULT 30 NOT NULL,
        priority VARCHAR(32) DEFAULT 'medium' NOT NULL,
        default_purpose VARCHAR(64) DEFAULT 'routine_order_booking' NOT NULL,
        notes TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_route_stop_seq UNIQUE (route_id, stop_sequence)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fs_stops_route ON field_sales_route_stops(route_id);
      CREATE INDEX IF NOT EXISTS idx_fs_stops_cust ON field_sales_route_stops(customer_type, customer_id);
    `);

    // 4. Canonical Field Sales Visits Table (`field_sales_visits`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_sales_visits (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        salesperson_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        salesperson_name VARCHAR(128) NOT NULL,
        salesperson_email VARCHAR(255),
        customer_type VARCHAR(32) NOT NULL DEFAULT 'retailer',
        customer_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_code VARCHAR(64),
        customer_phone VARCHAR(64),
        customer_address TEXT,
        customer_city VARCHAR(128),
        customer_state VARCHAR(128),
        customer_latitude NUMERIC(10, 7),
        customer_longitude NUMERIC(10, 7),
        territory_id VARCHAR(64) REFERENCES territories(id) ON DELETE SET NULL,
        territory_name VARCHAR(128),
        route_id VARCHAR(64) REFERENCES field_sales_routes(id) ON DELETE SET NULL,
        route_name VARCHAR(255),
        planned_date TIMESTAMPTZ NOT NULL,
        actual_date TIMESTAMPTZ,
        visit_purpose VARCHAR(64) NOT NULL DEFAULT 'routine_order_booking',
        status VARCHAR(32) NOT NULL DEFAULT 'planned',
        check_in_time TIMESTAMPTZ,
        check_out_time TIMESTAMPTZ,
        duration_minutes INTEGER,
        location_verified BOOLEAN DEFAULT FALSE NOT NULL,
        location_status VARCHAR(32) DEFAULT 'pending' NOT NULL,
        check_in_latitude NUMERIC(10, 7),
        check_in_longitude NUMERIC(10, 7),
        check_in_accuracy NUMERIC(8, 2),
        check_in_distance_meters NUMERIC(10, 2),
        check_out_latitude NUMERIC(10, 7),
        check_out_longitude NUMERIC(10, 7),
        notes TEXT,
        outcome VARCHAR(64),
        competitor_info TEXT,
        requested_products TEXT,
        next_follow_up_date TIMESTAMPTZ,
        cancellation_reason TEXT,
        skipped_reason TEXT,
        order_taken_id VARCHAR(64),
        order_taken_number VARCHAR(64),
        order_amount NUMERIC(16, 2) DEFAULT 0,
        collection_taken_id VARCHAR(64),
        collection_taken_number VARCHAR(64),
        collection_amount NUMERIC(16, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fs_visits_org ON field_sales_visits(organization_id);
      CREATE INDEX IF NOT EXISTS idx_fs_visits_sales ON field_sales_visits(salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_fs_visits_cust ON field_sales_visits(customer_type, customer_id);
      CREATE INDEX IF NOT EXISTS idx_fs_visits_status ON field_sales_visits(status);
      CREATE INDEX IF NOT EXISTS idx_fs_visits_planned ON field_sales_visits(planned_date);
      CREATE INDEX IF NOT EXISTS idx_fs_visits_created ON field_sales_visits(created_at DESC);
    `);

    // 5. Field Sales Order Drafts Table (`field_sales_order_drafts`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_sales_order_drafts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        visit_id VARCHAR(64) REFERENCES field_sales_visits(id) ON DELETE SET NULL,
        salesperson_id VARCHAR(64) NOT NULL,
        customer_type VARCHAR(32) NOT NULL DEFAULT 'retailer',
        customer_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        distributor_id VARCHAR(64) REFERENCES distributors(id) ON DELETE SET NULL,
        warehouse_id VARCHAR(64) REFERENCES warehouses(id) ON DELETE SET NULL,
        order_type VARCHAR(32) DEFAULT 'retailer_secondary' NOT NULL,
        items JSONB DEFAULT '[]'::jsonb NOT NULL,
        subtotal NUMERIC(16,2) DEFAULT 0 NOT NULL,
        discount_total NUMERIC(16,2) DEFAULT 0 NOT NULL,
        tax_total NUMERIC(16,2) DEFAULT 0 NOT NULL,
        grand_total NUMERIC(16,2) DEFAULT 0 NOT NULL,
        status VARCHAR(32) DEFAULT 'draft' NOT NULL,
        sales_order_id VARCHAR(64),
        sales_order_number VARCHAR(64),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fs_drafts_org ON field_sales_order_drafts(organization_id);
      CREATE INDEX IF NOT EXISTS idx_fs_drafts_visit ON field_sales_order_drafts(visit_id);
      CREATE INDEX IF NOT EXISTS idx_fs_drafts_sales ON field_sales_order_drafts(salesperson_id);
    `);

    // 6. Field Sales Targets Table (`field_sales_targets`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_sales_targets (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        salesperson_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        salesperson_name VARCHAR(128) NOT NULL,
        territory_id VARCHAR(64) REFERENCES territories(id) ON DELETE SET NULL,
        territory_name VARCHAR(128),
        target_type VARCHAR(64) NOT NULL DEFAULT 'sales_value',
        period_type VARCHAR(32) NOT NULL DEFAULT 'monthly',
        period_identifier VARCHAR(32) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        target_value NUMERIC(16,2) NOT NULL DEFAULT 0,
        achieved_value NUMERIC(16,2) NOT NULL DEFAULT 0,
        achievement_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_target_user_period UNIQUE (organization_id, salesperson_id, target_type, period_identifier)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fs_targets_org ON field_sales_targets(organization_id);
      CREATE INDEX IF NOT EXISTS idx_fs_targets_user ON field_sales_targets(salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_fs_targets_period ON field_sales_targets(period_identifier);
    `);

    // 7. Field Sales Tasks & Follow-ups Table (`field_sales_tasks`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_sales_tasks (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        visit_id VARCHAR(64) REFERENCES field_sales_visits(id) ON DELETE SET NULL,
        salesperson_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        salesperson_name VARCHAR(128) NOT NULL,
        customer_type VARCHAR(32) NOT NULL DEFAULT 'retailer',
        customer_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        task_type VARCHAR(64) NOT NULL DEFAULT 'follow_up',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        due_date TIMESTAMPTZ NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'open',
        completed_at TIMESTAMPTZ,
        completed_by VARCHAR(64),
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fs_tasks_org ON field_sales_tasks(organization_id);
      CREATE INDEX IF NOT EXISTS idx_fs_tasks_user ON field_sales_tasks(salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_fs_tasks_status ON field_sales_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_fs_tasks_due ON field_sales_tasks(due_date);
    `);

    // 8. Register Phase 20 RBAC Permissions
    const fieldSalesPermissions = [
      { id: 'perm-fs-01', code: 'field_sales.view', module: 'distribution', description: 'View field sales operations, mobile dashboard, and visit schedules' },
      { id: 'perm-fs-02', code: 'field_sales.manage', module: 'distribution', description: 'Manage field sales representatives, targets, and executive controls' },
      { id: 'perm-fs-03', code: 'field_sales.assign', module: 'distribution', description: 'Assign territories, routes, and accounts to sales officers' },
      { id: 'perm-fs-04', code: 'field_sales.visit.view', module: 'distribution', description: 'View field sales visits and interaction history' },
      { id: 'perm-fs-05', code: 'field_sales.visit.create', module: 'distribution', description: 'Schedule and create planned customer visits' },
      { id: 'perm-fs-06', code: 'field_sales.visit.edit', module: 'distribution', description: 'Edit planned visits and reschedule dates' },
      { id: 'perm-fs-07', code: 'field_sales.visit.checkin', module: 'distribution', description: 'Perform GPS/manual visit check-in at customer site' },
      { id: 'perm-fs-08', code: 'field_sales.visit.checkout', module: 'distribution', description: 'Complete visit check-out with outcome and feedback' },
      { id: 'perm-fs-09', code: 'field_sales.visit.cancel', module: 'distribution', description: 'Cancel or record reason for skipped/missed visit' },
      { id: 'perm-fs-10', code: 'field_sales.route.view', module: 'distribution', description: 'View beat routes and stop itineraries' },
      { id: 'perm-fs-11', code: 'field_sales.route.create', module: 'distribution', description: 'Design and create new sales routes and beats' },
      { id: 'perm-fs-12', code: 'field_sales.route.edit', module: 'distribution', description: 'Modify route stops, sequences, and priorities' },
      { id: 'perm-fs-13', code: 'field_sales.route.assign', module: 'distribution', description: 'Assign routes to sales representatives' },
      { id: 'perm-fs-14', code: 'field_sales.order.create', module: 'distribution', description: 'Book direct sales orders during customer visit' },
      { id: 'perm-fs-15', code: 'field_sales.collection.create', module: 'distribution', description: 'Record payment collection and issue receipt on-site' },
      { id: 'perm-fs-16', code: 'field_sales.followup.view', module: 'distribution', description: 'View assigned follow-ups and field tasks' },
      { id: 'perm-fs-17', code: 'field_sales.followup.create', module: 'distribution', description: 'Create customer follow-up actions and reminders' },
      { id: 'perm-fs-18', code: 'field_sales.followup.edit', module: 'distribution', description: 'Update and resolve assigned customer follow-up tasks' },
      { id: 'perm-fs-19', code: 'field_sales.target.view', module: 'distribution', description: 'View sales quotas, targets, and achievement metrics' },
      { id: 'perm-fs-20', code: 'field_sales.target.manage', module: 'distribution', description: 'Set, adjust, and evaluate monthly/quarterly sales targets' },
      { id: 'perm-fs-21', code: 'field_sales.performance.view', module: 'distribution', description: 'Access factual field sales performance scorecard and rankings' },
      { id: 'perm-fs-22', code: 'field_sales.export', module: 'distribution', description: 'Export field visit logs, collection receipts, and beat summaries' },
    ];

    for (const p of fieldSalesPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description`,
        [p.id, p.code, p.module, p.description]
      );
    }

    // 9. Grant permissions to super_admin, sales_manager, and field_sales roles
    const rolesRes = await client.query(`SELECT id, slug FROM roles WHERE slug IN ('super_admin', 'sales_manager', 'field_sales')`);
    for (const r of rolesRes.rows) {
      let targetPerms: string[] = [];
      if (r.slug === 'super_admin') {
        targetPerms = ['*:*'];
      } else if (r.slug === 'sales_manager') {
        targetPerms = fieldSalesPermissions.map((p) => p.code);
      } else if (r.slug === 'field_sales') {
        targetPerms = [
          'field_sales.view',
          'field_sales.visit.view',
          'field_sales.visit.create',
          'field_sales.visit.edit',
          'field_sales.visit.checkin',
          'field_sales.visit.checkout',
          'field_sales.visit.cancel',
          'field_sales.route.view',
          'field_sales.order.create',
          'field_sales.collection.create',
          'field_sales.followup.view',
          'field_sales.followup.create',
          'field_sales.followup.edit',
          'field_sales.target.view',
          'retailer.view',
          'distributor.view',
          'sales_orders.view',
          'sales_orders.create',
          'collections.view',
          'collections.create',
        ];
      }

      for (const pCode of targetPerms) {
        if (pCode === '*:*') continue;
        const pRes = await client.query(`SELECT id FROM permissions WHERE code = $1`, [pCode]);
        if (pRes.rows.length > 0) {
          const permId = pRes.rows[0].id;
          await client.query(
            `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [`rp_${r.slug}_${permId}`.substring(0, 64), r.id, permId]
          );
        }
      }
    }

    // 10. Seed Realistic Field Sales Foundation Data if empty
    const orgId = 'org-jyotsvan-corp';
    const repId = 'usr-fieldsales';

    // Verify Vikram Sharma user exists and has email
    const repCheck = await client.query(`SELECT id, full_name, email FROM users WHERE id = $1`, [repId]);
    const repName = repCheck.rows[0]?.full_name || 'Vikram Sharma';
    const repEmail = repCheck.rows[0]?.email || 'field.sales@jyotsvan.enterprise';

    // Seed Territory Assignments
    const terrRes = await client.query(`SELECT id, name, code FROM territories WHERE organization_id = $1 LIMIT 4`, [orgId]);
    if (terrRes.rows.length > 0) {
      for (let i = 0; i < terrRes.rows.length; i++) {
        const terr = terrRes.rows[i];
        await client.query(
          `INSERT INTO sales_territory_assignments (
            id, organization_id, territory_id, salesperson_id, salesperson_name, salesperson_email,
            role, effective_from, priority_rank, is_primary, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '60 days', $8, $9, 'active', $10)
          ON CONFLICT (organization_id, territory_id, salesperson_id) DO NOTHING`,
          [
            `sta_${terr.id}_${repId}`.substring(0, 64),
            orgId,
            terr.id,
            repId,
            repName,
            repEmail,
            i === 0 ? 'Senior Territory Manager' : 'Area Sales Officer',
            i + 1,
            i === 0,
            `Primary beat coverage for ${terr.name}`,
          ]
        );
      }
    }

    // Seed Realistic Routes
    const existingRoutes = await client.query(`SELECT count(*) FROM field_sales_routes WHERE organization_id = $1`, [orgId]);
    if (parseInt(existingRoutes.rows[0]?.count || '0', 10) === 0) {
      const primaryTerrId = terrRes.rows[0]?.id || null;
      const retailers = await client.query(`SELECT id, retailer_code, store_name, owner_name, city, address, phone FROM retailers WHERE organization_id = $1 LIMIT 12`, [orgId]);
      const distributors = await client.query(`SELECT id, distributor_code, display_name, city, address, phone FROM distributors WHERE organization_id = $1 LIMIT 4`, [orgId]);

      // Route 1: North Commercial Beat
      const route1Id = 'rt-north-agri-01';
      await client.query(
        `INSERT INTO field_sales_routes (
          id, organization_id, route_code, name, description, territory_id, salesperson_id, salesperson_name,
          frequency, days_of_week, status, total_stops, estimated_duration_hours, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          route1Id,
          orgId,
          'RT-NORTH-01',
          'Northern Agro Marts & Depot Route',
          'Regular high-velocity booking & stock verification route covering top dealers & retailers',
          primaryTerrId,
          repId,
          repName,
          'weekly',
          JSON.stringify(['monday', 'wednesday', 'friday']),
          'active',
          retailers.rows.length >= 4 ? 5 : 3,
          5.5,
          'usr-super-admin',
        ]
      );

      // Route 1 Stops
      let seq = 1;
      if (distributors.rows.length > 0) {
        const d = distributors.rows[0];
        await client.query(
          `INSERT INTO field_sales_route_stops (
            id, route_id, organization_id, stop_sequence, customer_type, customer_id, customer_name,
            customer_code, address, city, phone, latitude, longitude, expected_duration_minutes,
            priority, default_purpose, notes, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active')`,
          [
            `stop_rt1_${seq}`,
            route1Id,
            orgId,
            seq++,
            'distributor',
            d.id,
            d.display_name,
            d.distributor_code,
            d.address || 'Industrial Hub Phase 1',
            d.city || 'Pune',
            d.phone,
            18.5204,
            73.8567,
            45,
            'high',
            'routine_order_booking',
            'Weekly indent review & collection review',
          ]
        );
      }

      for (const r of retailers.rows.slice(0, 4)) {
        await client.query(
          `INSERT INTO field_sales_route_stops (
            id, route_id, organization_id, stop_sequence, customer_type, customer_id, customer_name,
            customer_code, address, city, phone, latitude, longitude, expected_duration_minutes,
            priority, default_purpose, notes, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active')`,
          [
            `stop_rt1_${seq}`,
            route1Id,
            orgId,
            seq++,
            'retailer',
            r.id,
            r.store_name || r.owner_name,
            r.retailer_code,
            r.address || 'Main Market Road',
            r.city || 'Pune',
            r.phone,
            18.5204 + seq * 0.015,
            73.8567 + seq * 0.012,
            30,
            seq === 2 ? 'high' : 'medium',
            'routine_order_booking',
            'Shelf stock check and new promotion display',
          ]
        );
      }

      // Route 2: South Corridor Express
      const route2Id = 'rt-south-orchard-02';
      await client.query(
        `INSERT INTO field_sales_routes (
          id, organization_id, route_code, name, description, territory_id, salesperson_id, salesperson_name,
          frequency, days_of_week, status, total_stops, estimated_duration_hours, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          route2Id,
          orgId,
          'RT-SOUTH-02',
          'South Agricultural Corridor Beat',
          'Bi-weekly route covering orchard cooperatives and fertilizer dealers',
          primaryTerrId,
          repId,
          repName,
          'biweekly',
          JSON.stringify(['tuesday', 'thursday']),
          'active',
          4,
          4.0,
          'usr-super-admin',
        ]
      );
    }

    // Seed Today's Visits & Recent History
    const existingVisits = await client.query(`SELECT count(*) FROM field_sales_visits WHERE organization_id = $1`, [orgId]);
    if (parseInt(existingVisits.rows[0]?.count || '0', 10) === 0) {
      const retailers = await client.query(`SELECT id, retailer_code, store_name, owner_name, city, address, phone FROM retailers WHERE organization_id = $1 LIMIT 8`, [orgId]);
      const distributors = await client.query(`SELECT id, distributor_code, display_name, city, address, phone FROM distributors WHERE organization_id = $1 LIMIT 3`, [orgId]);
      const primaryTerr = terrRes.rows[0] || { id: null, name: 'Western Maharashtra Zone' };

      const todayStr = new Date().toISOString().split('T')[0];

      // Visit 1: Completed Today (Distributor Visit)
      if (distributors.rows.length > 0) {
        const d = distributors.rows[0];
        await client.query(
          `INSERT INTO field_sales_visits (
            id, organization_id, salesperson_id, salesperson_name, salesperson_email,
            customer_type, customer_id, customer_name, customer_code, customer_phone, customer_address, customer_city,
            customer_latitude, customer_longitude, territory_id, territory_name,
            planned_date, actual_date, visit_purpose, status,
            check_in_time, check_out_time, duration_minutes,
            location_verified, location_status, check_in_latitude, check_in_longitude, check_in_accuracy, check_in_distance_meters,
            notes, outcome, order_amount, collection_amount
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16,
            $17, $18, $19, $20,
            $21, $22, $23,
            $24, $25, $26, $27, $28, $29,
            $30, $31, $32, $33
          )`,
          [
            'vst-today-01',
            orgId,
            repId,
            repName,
            repEmail,
            'distributor',
            d.id,
            d.display_name,
            d.distributor_code,
            d.phone,
            d.address || 'MIDC Industrial Area',
            d.city || 'Pune',
            18.5204,
            73.8567,
            primaryTerr.id,
            primaryTerr.name,
            `${todayStr}T09:30:00.000Z`,
            `${todayStr}T09:35:00.000Z`,
            'routine_order_booking',
            'completed',
            `${todayStr}T09:35:00.000Z`,
            `${todayStr}T10:20:00.000Z`,
            45,
            true,
            'verified',
            18.5206,
            73.8569,
            8.5,
            32.0,
            'Reviewed seasonal stock demand. Distributor placed replenishment indent for upcoming sowing period.',
            'order_taken',
            125000,
            50000,
          ]
        );
      }

      // Visit 2: Completed Today (Retailer Visit)
      if (retailers.rows.length > 0) {
        const r1 = retailers.rows[0];
        await client.query(
          `INSERT INTO field_sales_visits (
            id, organization_id, salesperson_id, salesperson_name, salesperson_email,
            customer_type, customer_id, customer_name, customer_code, customer_phone, customer_address, customer_city,
            customer_latitude, customer_longitude, territory_id, territory_name,
            planned_date, actual_date, visit_purpose, status,
            check_in_time, check_out_time, duration_minutes,
            location_verified, location_status, check_in_latitude, check_in_longitude, check_in_accuracy, check_in_distance_meters,
            notes, outcome, order_amount, collection_amount
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16,
            $17, $18, $19, $20,
            $21, $22, $23,
            $24, $25, $26, $27, $28, $29,
            $30, $31, $32, $33
          )`,
          [
            'vst-today-02',
            orgId,
            repId,
            repName,
            repEmail,
            'retailer',
            r1.id,
            r1.store_name || r1.owner_name,
            r1.retailer_code,
            r1.phone,
            r1.address || 'Market Yard Shop #14',
            r1.city || 'Pune',
            18.5284,
            73.8647,
            primaryTerr.id,
            primaryTerr.name,
            `${todayStr}T11:00:00.000Z`,
            `${todayStr}T11:05:00.000Z`,
            'collection_followup',
            'completed',
            `${todayStr}T11:05:00.000Z`,
            `${todayStr}T11:40:00.000Z`,
            35,
            true,
            'verified',
            18.5285,
            73.8648,
            6.2,
            18.0,
            'Collected outstanding cheque for previous batch invoice and replenished bio-stimulant fast movers.',
            'collection_received',
            35000,
            42000,
          ]
        );
      }

      // Visit 3: In Progress Today (Retailer Visit)
      if (retailers.rows.length > 1) {
        const r2 = retailers.rows[1];
        await client.query(
          `INSERT INTO field_sales_visits (
            id, organization_id, salesperson_id, salesperson_name, salesperson_email,
            customer_type, customer_id, customer_name, customer_code, customer_phone, customer_address, customer_city,
            customer_latitude, customer_longitude, territory_id, territory_name,
            planned_date, actual_date, visit_purpose, status,
            check_in_time, location_verified, location_status, check_in_latitude, check_in_longitude, check_in_accuracy,
            notes
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16,
            $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26,
            $27
          )`,
          [
            'vst-today-03',
            orgId,
            repId,
            repName,
            repEmail,
            'retailer',
            r2.id,
            r2.store_name || r2.owner_name,
            r2.retailer_code,
            r2.phone,
            r2.address || 'Station Road Bazaar',
            r2.city || 'Pune',
            18.5354,
            73.8727,
            primaryTerr.id,
            primaryTerr.name,
            `${todayStr}T13:30:00.000Z`,
            `${todayStr}T13:35:00.000Z`,
            'routine_order_booking',
            'in_progress',
            `${todayStr}T13:35:00.000Z`,
            true,
            'verified',
            18.5355,
            73.8729,
            5.0,
            'Currently auditing shelf presence of micro-nutrients and discussing crop season pre-booking.',
          ]
        );
      }

      // Visit 4 & 5: Planned for later Today
      if (retailers.rows.length > 2) {
        const r3 = retailers.rows[2];
        await client.query(
          `INSERT INTO field_sales_visits (
            id, organization_id, salesperson_id, salesperson_name, salesperson_email,
            customer_type, customer_id, customer_name, customer_code, customer_phone, customer_address, customer_city,
            territory_id, territory_name, planned_date, visit_purpose, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'planned', $17)`,
          [
            'vst-today-04',
            orgId,
            repId,
            repName,
            repEmail,
            'retailer',
            r3.id,
            r3.store_name || r3.owner_name,
            r3.retailer_code,
            r3.phone,
            r3.address || 'Shivaji Chowk',
            r3.city || 'Pune',
            primaryTerr.id,
            primaryTerr.name,
            `${todayStr}T15:00:00.000Z`,
            'new_product_pitch',
            'Demonstrate new foliar spray sprayability and promotional scheme flyers.',
          ]
        );
      }

      if (retailers.rows.length > 3) {
        const r4 = retailers.rows[3];
        await client.query(
          `INSERT INTO field_sales_visits (
            id, organization_id, salesperson_id, salesperson_name, salesperson_email,
            customer_type, customer_id, customer_name, customer_code, customer_phone, customer_address, customer_city,
            territory_id, territory_name, planned_date, visit_purpose, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'planned', $17)`,
          [
            'vst-today-05',
            orgId,
            repId,
            repName,
            repEmail,
            'retailer',
            r4.id,
            r4.store_name || r4.owner_name,
            r4.retailer_code,
            r4.phone,
            r4.address || 'APMC Gate 2',
            r4.city || 'Pune',
            primaryTerr.id,
            primaryTerr.name,
            `${todayStr}T16:30:00.000Z`,
            'relationship_building',
            'Monthly dealer catch-up and feedback review on packaging quality.',
          ]
        );
      }
    }

    // Seed Targets for Current Month
    const currentMonth = new Date().toISOString().substring(0, 7); // '2026-03'
    const targetCheck = await client.query(
      `SELECT count(*) FROM field_sales_targets WHERE organization_id = $1 AND period_identifier = $2`,
      [orgId, currentMonth]
    );
    if (parseInt(targetCheck.rows[0]?.count || '0', 10) === 0) {
      const year = new Date().getFullYear();
      const month = new Date().getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Target 1: Sales Value Target (₹15,00,000)
      await client.query(
        `INSERT INTO field_sales_targets (
          id, organization_id, salesperson_id, salesperson_name, territory_id, territory_name,
          target_type, period_type, period_identifier, start_date, end_date, target_value, achieved_value, achievement_percent, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15)
        ON CONFLICT (organization_id, salesperson_id, target_type, period_identifier) DO NOTHING`,
        [
          `tgt_${repId}_sales_${currentMonth}`,
          orgId,
          repId,
          repName,
          terrRes.rows[0]?.id || null,
          terrRes.rows[0]?.name || 'Western Zone',
          'sales_value',
          'monthly',
          currentMonth,
          startDate,
          endDate,
          1500000,
          1185000,
          79.0,
          'Monthly revenue target across assigned distributor and retailer network.',
        ]
      );

      // Target 2: Visit Count Target (90 visits)
      await client.query(
        `INSERT INTO field_sales_targets (
          id, organization_id, salesperson_id, salesperson_name, territory_id, territory_name,
          target_type, period_type, period_identifier, start_date, end_date, target_value, achieved_value, achievement_percent, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15)
        ON CONFLICT (organization_id, salesperson_id, target_type, period_identifier) DO NOTHING`,
        [
          `tgt_${repId}_visits_${currentMonth}`,
          orgId,
          repId,
          repName,
          terrRes.rows[0]?.id || null,
          terrRes.rows[0]?.name || 'Western Zone',
          'visit_count',
          'monthly',
          currentMonth,
          startDate,
          endDate,
          90,
          72,
          80.0,
          'Coverage quota of dealer and merchant touchpoints.',
        ]
      );

      // Target 3: Collection Target (₹10,00,000)
      await client.query(
        `INSERT INTO field_sales_targets (
          id, organization_id, salesperson_id, salesperson_name, territory_id, territory_name,
          target_type, period_type, period_identifier, start_date, end_date, target_value, achieved_value, achievement_percent, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15)
        ON CONFLICT (organization_id, salesperson_id, target_type, period_identifier) DO NOTHING`,
        [
          `tgt_${repId}_coll_${currentMonth}`,
          orgId,
          repId,
          repName,
          terrRes.rows[0]?.id || null,
          terrRes.rows[0]?.name || 'Western Zone',
          'collection_amount',
          'monthly',
          currentMonth,
          startDate,
          endDate,
          1000000,
          840000,
          84.0,
          'On-time outstanding dues recovery.',
        ]
      );
    }

    // Seed Open Follow-ups and Tasks
    const taskCheck = await client.query(`SELECT count(*) FROM field_sales_tasks WHERE organization_id = $1`, [orgId]);
    if (parseInt(taskCheck.rows[0]?.count || '0', 10) === 0) {
      const retailers = await client.query(`SELECT id, store_name, owner_name FROM retailers WHERE organization_id = $1 LIMIT 4`, [orgId]);
      if (retailers.rows.length > 0) {
        const r1 = retailers.rows[0];
        await client.query(
          `INSERT INTO field_sales_tasks (
            id, organization_id, salesperson_id, salesperson_name, customer_type, customer_id, customer_name,
            task_type, title, description, priority, due_date, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + INTERVAL '1 day', 'open')`,
          [
            'tsk-fs-01',
            orgId,
            repId,
            repName,
            'retailer',
            r1.id,
            r1.store_name || r1.owner_name,
            'payment_reminder',
            'Follow up on outstanding invoice balance',
            'Invoice #INV/26-27/001004 due for settlement this week. Confirm payment transfer receipt.',
            'high',
          ]
        );
      }

      if (retailers.rows.length > 1) {
        const r2 = retailers.rows[1];
        await client.query(
          `INSERT INTO field_sales_tasks (
            id, organization_id, salesperson_id, salesperson_name, customer_type, customer_id, customer_name,
            task_type, title, description, priority, due_date, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + INTERVAL '2 days', 'open')`,
          [
            'tsk-fs-02',
            orgId,
            repId,
            repName,
            'retailer',
            r2.id,
            r2.store_name || r2.owner_name,
            'sample_delivery',
            'Deliver newly formulated micro-fertilizer trial kit',
            'Merchant requested 500ml sample pack for demonstration to grape orchard growers.',
            'medium',
          ]
        );
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 20 Migration] Field Sales Execution Layer schema and baseline seeds initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 20 Migration] Failed to initialize Field Sales schema:', err);
    throw err;
  } finally {
    client.release();
  }
}
