import { pool } from './db.ts';
import { runFormulationMigration } from './migrate-formulations.ts';

export async function runProductionMigration() {
  // Ensure prerequisite Phase 12 Formulation tables exist
  try {
    await runFormulationMigration();
  } catch (formErr) {
    console.warn('[Phase 13 Migration] Prerequisite Formulation migration check:', formErr);
  }

  console.log('[Phase 13 Migration] Starting Manufacturing & Production Execution Schema Migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Production Plans Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_plans (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        plan_number VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        planned_date DATE NOT NULL,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        notes TEXT,
        created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        created_by_email VARCHAR(255),
        approved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_email VARCHAR(255),
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_plan_number UNIQUE (organization_id, plan_number)
      );
    `);

    // Indexes for Production Plans
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prod_plans_org_status ON production_plans (organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_prod_plans_date ON production_plans (planned_date);
      CREATE INDEX IF NOT EXISTS idx_prod_plans_wh ON production_plans (warehouse_id);
    `);

    // 2. Production Orders Master Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_orders (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        production_order_number VARCHAR(64) NOT NULL,
        production_plan_id VARCHAR(64) REFERENCES production_plans(id) ON DELETE SET NULL,
        formulation_id VARCHAR(64) NOT NULL REFERENCES formulations(id) ON DELETE RESTRICT,
        formulation_version VARCHAR(32) NOT NULL,
        formulation_code_snapshot VARCHAR(64) NOT NULL,
        formulation_name_snapshot VARCHAR(255) NOT NULL,
        finished_product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
        finished_sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        target_location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        planned_quantity NUMERIC(14, 4) NOT NULL,
        planned_unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        scaling_ratio NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
        expected_yield NUMERIC(14, 4) NOT NULL,
        expected_yield_unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        expected_wastage_quantity NUMERIC(14, 4) DEFAULT 0.0000,
        actual_output_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        actual_wastage_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        actual_rejected_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        planned_start_date DATE,
        planned_end_date DATE,
        actual_start_date TIMESTAMPTZ,
        actual_end_date TIMESTAMPTZ,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        material_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        qc_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        qc_template_id VARCHAR(64) REFERENCES qc_templates(id) ON DELETE SET NULL,
        qc_inspection_id VARCHAR(64) REFERENCES qc_inspections(id) ON DELETE SET NULL,
        production_batch_number VARCHAR(64),
        notes TEXT,
        created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        created_by_email VARCHAR(255),
        approved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_email VARCHAR(255),
        approved_at TIMESTAMPTZ,
        completed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        completed_by_email VARCHAR(255),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_prod_order_num UNIQUE (organization_id, production_order_number),
        CONSTRAINT chk_prod_planned_qty CHECK (planned_quantity > 0),
        CONSTRAINT chk_prod_expected_yield CHECK (expected_yield >= 0)
      );
    `);

    // Indexes for Production Orders
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prod_orders_org_status ON production_orders (organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_prod_orders_sku ON production_orders (finished_sku_id);
      CREATE INDEX IF NOT EXISTS idx_prod_orders_wh ON production_orders (warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_prod_orders_plan ON production_orders (production_plan_id);
      CREATE INDEX IF NOT EXISTS idx_prod_orders_dates ON production_orders (planned_start_date, planned_end_date);
    `);

    // 3. Production Order Components (Snapshot of scaled requirements)
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_order_components (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        production_order_id VARCHAR(64) NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
        component_product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
        component_sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        component_type VARCHAR(64) NOT NULL DEFAULT 'raw_material',
        required_quantity NUMERIC(14, 4) NOT NULL,
        required_unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        wastage_allowance_percentage NUMERIC(6, 2) DEFAULT 0.00,
        planned_quantity NUMERIC(14, 4) NOT NULL,
        reserved_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        issued_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        actual_consumed_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        returned_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        sequence_order INTEGER NOT NULL DEFAULT 1,
        is_substitute BOOLEAN NOT NULL DEFAULT FALSE,
        substituted_for_sku_id VARCHAR(64) REFERENCES skus(id) ON DELETE SET NULL,
        standard_unit_cost NUMERIC(14, 4) DEFAULT 0.0000,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_prod_order_comp UNIQUE (production_order_id, component_sku_id),
        CONSTRAINT chk_order_comp_qty CHECK (required_quantity > 0)
      );
    `);

    // Indexes for Components
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prod_order_comp_order ON production_order_components (production_order_id);
      CREATE INDEX IF NOT EXISTS idx_prod_order_comp_sku ON production_order_components (component_sku_id);
    `);

    // 4. Production Material Issues Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_material_issues (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        issue_number VARCHAR(64) NOT NULL,
        production_order_id VARCHAR(64) NOT NULL REFERENCES production_orders(id) ON DELETE RESTRICT,
        component_id VARCHAR(64) NOT NULL REFERENCES production_order_components(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        batch_id VARCHAR(64),
        batch_number VARCHAR(128),
        quantity NUMERIC(14, 4) NOT NULL,
        unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        reservation_id VARCHAR(64) REFERENCES stock_reservations(id) ON DELETE SET NULL,
        inventory_movement_id VARCHAR(64) REFERENCES inventory_movements(id) ON DELETE SET NULL,
        issued_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        issued_by_email VARCHAR(255),
        notes TEXT,
        idempotency_key VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_issue_num UNIQUE (organization_id, issue_number),
        CONSTRAINT chk_issue_qty CHECK (quantity > 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prod_issues_order ON production_material_issues (production_order_id);
      CREATE INDEX IF NOT EXISTS idx_prod_issues_sku ON production_material_issues (sku_id);
      CREATE INDEX IF NOT EXISTS idx_prod_issues_wh ON production_material_issues (warehouse_id);
    `);

    // 5. Production Material Returns Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_material_returns (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        return_number VARCHAR(64) NOT NULL,
        production_order_id VARCHAR(64) NOT NULL REFERENCES production_orders(id) ON DELETE RESTRICT,
        component_id VARCHAR(64) NOT NULL REFERENCES production_order_components(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        quantity NUMERIC(14, 4) NOT NULL,
        unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        inventory_movement_id VARCHAR(64) REFERENCES inventory_movements(id) ON DELETE SET NULL,
        returned_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        returned_by_email VARCHAR(255),
        reason TEXT NOT NULL,
        notes TEXT,
        idempotency_key VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_return_num UNIQUE (organization_id, return_number),
        CONSTRAINT chk_return_qty CHECK (quantity > 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prod_returns_order ON production_material_returns (production_order_id);
      CREATE INDEX IF NOT EXISTS idx_prod_returns_sku ON production_material_returns (sku_id);
    `);

    // 6. Production Outputs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_outputs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        output_number VARCHAR(64) NOT NULL,
        production_order_id VARCHAR(64) NOT NULL REFERENCES production_orders(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        batch_number VARCHAR(128) NOT NULL,
        quantity NUMERIC(14, 4) NOT NULL,
        unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        manufacturing_date DATE,
        expiry_date DATE,
        inventory_stock_type VARCHAR(32) NOT NULL DEFAULT 'quarantine',
        inventory_movement_id VARCHAR(64) REFERENCES inventory_movements(id) ON DELETE SET NULL,
        qc_inspection_id VARCHAR(64) REFERENCES qc_inspections(id) ON DELETE SET NULL,
        operator_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        operator_email VARCHAR(255),
        notes TEXT,
        idempotency_key VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_output_num UNIQUE (organization_id, output_number),
        CONSTRAINT chk_output_qty CHECK (quantity > 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prod_outputs_order ON production_outputs (production_order_id);
      CREATE INDEX IF NOT EXISTS idx_prod_outputs_sku ON production_outputs (sku_id);
      CREATE INDEX IF NOT EXISTS idx_prod_outputs_batch ON production_outputs (batch_number);
    `);

    // 7. Production Wastages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_wastages (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        production_order_id VARCHAR(64) NOT NULL REFERENCES production_orders(id) ON DELETE RESTRICT,
        category VARCHAR(64) NOT NULL,
        quantity NUMERIC(14, 4) NOT NULL,
        unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) REFERENCES skus(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        recorded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        recorded_by_email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_wastage_qty CHECK (quantity > 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prod_wastages_order ON production_wastages (production_order_id);
    `);

    // 8. Register Granular Production Permissions
    const productionPermissions = [
      { id: 'perm-prod-01', code: 'production.view', module: 'production', description: 'View production orders, batch execution status, and shop floor telemetry' },
      { id: 'perm-prod-02', code: 'production.create', module: 'production', description: 'Create production plans, work orders, and schedule manufacturing batches' },
      { id: 'perm-prod-03', code: 'production.edit', module: 'production', description: 'Edit draft production orders, scheduling dates, and operator assignments' },
      { id: 'perm-prod-04', code: 'production.approve', module: 'production', description: 'Approve production plans and authorize manufacturing orders for staging' },
      { id: 'perm-prod-05', code: 'production.reserve', module: 'production', description: 'Perform material availability checks and place inventory holds/reservations' },
      { id: 'perm-prod-06', code: 'production.issue', module: 'production', description: 'Issue raw materials and packaging from warehouse to shop floor work orders' },
      { id: 'perm-prod-07', code: 'production.execute', module: 'production', description: 'Log actual raw material consumption, machine run progress, and shop floor logs' },
      { id: 'perm-prod-08', code: 'production.return', module: 'production', description: 'Return unused raw materials from production back into warehouse inventory' },
      { id: 'perm-prod-09', code: 'production.output', module: 'production', description: 'Record finished product outputs, yield volumes, and route to QC quarantine' },
      { id: 'perm-prod-10', code: 'production.wastage', module: 'production', description: 'Record and classify production scrap, process loss, and spillage' },
      { id: 'perm-prod-11', code: 'production.complete', module: 'production', description: 'Validate production reconciliation and certify work order completion' },
      { id: 'perm-prod-12', code: 'production.cancel', module: 'production', description: 'Cancel production orders and release associated inventory holds' },
      { id: 'perm-prod-13', code: 'production.export', module: 'production', description: 'Export production registries, yield variances, and batch execution records' },
    ];

    // Query actual roles
    const rolesRes = await client.query(`SELECT id, slug FROM roles WHERE slug IN ('super_admin', 'admin', 'plant_manager', 'production_manager', 'operations_manager')`);
    const rolesList = rolesRes.rows;

    for (const p of productionPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module`,
        [p.id, p.code, p.module, p.description]
      );

      const permRes = await client.query('SELECT id FROM permissions WHERE code = $1 LIMIT 1;', [p.code]);
      if (permRes.rows.length > 0) {
        const realPermId = permRes.rows[0].id;
        for (const role of rolesList) {
          const rpId = `rp-${role.slug}-${p.code.replace(/[.:]/g, '-')}`;
          await client.query(
            `INSERT INTO role_permissions (id, role_id, permission_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO NOTHING;`,
            [rpId, role.id, realPermId]
          );
        }
      }
    }

    // 9. Seed Production Baseline Data (Realistic Orders & Components Snapshot)
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
    if (orgRes.rows.length > 0) {
      const orgId = orgRes.rows[0].id;
      const whRes = await client.query(`SELECT id FROM warehouses WHERE organization_id = $1 LIMIT 2`, [orgId]);
      const defaultWhId = whRes.rows[0]?.id || 'wh-plant-main';
      const userRes = await client.query(`SELECT id, email FROM users WHERE organization_id = $1 LIMIT 1`, [orgId]);
      const userId = userRes.rows[0]?.id || 'usr-owner-sunil';
      const userEmail = userRes.rows[0]?.email || 'sunilpanigrahy29401@gmail.com';

      // Check existing production orders
      const countRes = await client.query(`SELECT COUNT(*) FROM production_orders WHERE organization_id = $1`, [orgId]);
      const existingCount = parseInt(countRes.rows[0].count, 10);

      if (existingCount === 0) {
        console.log('[Phase 13 Migration] Seeding initial enterprise production orders & plans...');

        // 1. Create a Production Plan
        const planId = 'plan-2026-001';
        await client.query(
          `INSERT INTO production_plans (
            id, organization_id, plan_number, title, planned_date, warehouse_id,
            status, notes, created_by, created_by_email, approved_by, approved_by_email, approved_at, created_at, updated_at
          ) VALUES ($1, $2, 'PP-2026-001', 'Q1 High-Velocity Skincare & Personal Care Manufacturing Batch', '2026-09-15', $3, 'approved', 'Authorized Q1 production schedule targeting regional retail and distributor replenishment.', $4, $5, $4, $5, NOW(), NOW(), NOW())
          ON CONFLICT (id) DO NOTHING`,
          [planId, orgId, defaultWhId, userId, userEmail]
        );

        // Fetch active formulations
        const formRes = await client.query(
          `SELECT f.*, fc.component_sku_id, fc.quantity as comp_qty, fc.wastage_allowance_percentage, fc.unit_id as comp_unit_id,
                  s.cost_price as standard_cost, s.product_id as comp_product_id
           FROM formulations f
           LEFT JOIN formulation_components fc ON fc.formulation_id = f.id
           LEFT JOIN skus s ON s.id = fc.component_sku_id
           WHERE f.organization_id = $1
           ORDER BY f.formulation_code ASC`,
          [orgId]
        );

        // Group by formulation
        const formMap = new Map<string, any>();
        for (const row of formRes.rows) {
          if (!formMap.has(row.id)) {
            formMap.set(row.id, {
              ...row,
              components: [],
            });
          }
          if (row.component_sku_id) {
            formMap.get(row.id).components.push({
              component_sku_id: row.component_sku_id,
              component_product_id: row.comp_product_id,
              quantity: parseFloat(row.comp_qty) || 0,
              wastage_allowance_percentage: parseFloat(row.wastage_allowance_percentage) || 0,
              unit_id: row.comp_unit_id,
              standard_cost: parseFloat(row.standard_cost) || 120.0,
            });
          }
        }

        const formulationList = Array.from(formMap.values());

        // Order 1: Completed Batch (Rose Water 100ml - 2500 Liters)
        const form1 = formulationList.find(f => f.formulation_code.includes('ROSE')) || formulationList[0];
        if (form1) {
          const poId1 = 'po-2026-0001';
          const plannedQty = 2500;
          const ratio = plannedQty / parseFloat(form1.batch_size);
          const expYield = Math.round(parseFloat(form1.expected_yield) * ratio * 100) / 100;
          const expWastage = Math.round(parseFloat(form1.expected_wastage_quantity || 50) * ratio * 100) / 100;
          const actOutput = 2360; // 94.4% yield
          const actWastage = 140;

          await client.query(
            `INSERT INTO production_orders (
              id, organization_id, production_order_number, production_plan_id,
              formulation_id, formulation_version, formulation_code_snapshot, formulation_name_snapshot,
              finished_product_id, finished_sku_id, warehouse_id,
              planned_quantity, planned_unit_id, scaling_ratio, expected_yield, expected_yield_unit_id, expected_wastage_quantity,
              actual_output_quantity, actual_wastage_quantity, actual_rejected_quantity,
              planned_start_date, planned_end_date, actual_start_date, actual_end_date,
              status, material_status, qc_status, production_batch_number,
              notes, created_by, created_by_email, approved_by, approved_by_email, approved_at,
              completed_by, completed_by_email, completed_at, created_at, updated_at
            ) VALUES (
              $1, $2, 'PRD-2026-0001', $3,
              $4, $5, $6, $7,
              $8, $9, $10,
              $11, $12, $13, $14, $15, $16,
              $17, $18, 0,
              '2026-09-10', '2026-09-12', '2026-09-10 08:30:00+00', '2026-09-12 17:15:00+00',
              'completed', 'fully_issued', 'passed', 'BAT-2026-RW01',
              'Commercial production run for festive distributor demand. High distillation purity verified.',
              $19, $20, $19, $20, '2026-09-09 14:00:00+00',
              $19, $20, '2026-09-12 17:30:00+00', '2026-09-09 10:00:00+00', NOW()
            ) ON CONFLICT (id) DO NOTHING`,
            [
              poId1, orgId, planId,
              form1.id, form1.version, form1.formulation_code, form1.name,
              form1.finished_product_id, form1.finished_sku_id, defaultWhId,
              plannedQty, form1.batch_size_unit_id, ratio, expYield, form1.expected_yield_unit_id, expWastage,
              actOutput, actWastage,
              userId, userEmail,
            ]
          );

          // Insert Order 1 components
          for (let i = 0; i < form1.components.length; i++) {
            const c = form1.components[i];
            const compReq = Math.round(c.quantity * ratio * 1000) / 1000;
            const compGross = Math.round(compReq * (1 + c.wastage_allowance_percentage / 100) * 1000) / 1000;
            const compIssued = compGross;
            const compConsumed = Math.round((compGross * 0.985) * 1000) / 1000;
            const compReturned = Math.round((compIssued - compConsumed) * 1000) / 1000;
            const compId = `poc-0001-${i + 1}`;

            await client.query(
              `INSERT INTO production_order_components (
                id, organization_id, production_order_id, component_product_id, component_sku_id,
                component_type, required_quantity, required_unit_id, wastage_allowance_percentage,
                planned_quantity, reserved_quantity, issued_quantity, actual_consumed_quantity, returned_quantity,
                sequence_order, standard_unit_cost, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, 'raw_material', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
              ON CONFLICT (id) DO NOTHING`,
              [
                compId, orgId, poId1, c.component_product_id, c.component_sku_id,
                compReq, c.unit_id, c.wastage_allowance_percentage,
                compGross, 0, compIssued, compConsumed, compReturned,
                i + 1, c.standard_cost,
              ]
            );

            // Record material issue
            await client.query(
              `INSERT INTO production_material_issues (
                id, organization_id, issue_number, production_order_id, component_id, sku_id,
                warehouse_id, quantity, unit_id, batch_number, issued_by, issued_by_email, notes, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'LOT-RM-2026-A1', $10, $11, 'Initial staged dispensing for reactor kettle #1', '2026-09-10 09:00:00+00')
              ON CONFLICT (id) DO NOTHING`,
              [`iss-0001-${i + 1}`, orgId, `ISS-2026-000${i + 1}`, poId1, compId, c.component_sku_id, defaultWhId, compIssued, c.unit_id, userId, userEmail]
            );

            // Record return if any
            if (compReturned > 0) {
              await client.query(
                `INSERT INTO production_material_returns (
                  id, organization_id, return_number, production_order_id, component_id, sku_id,
                  warehouse_id, quantity, unit_id, returned_by, returned_by_email, reason, notes, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Unused surplus material returned to raw warehouse storage post-batch run', 'Batch balance reconciliation', '2026-09-12 16:30:00+00')
                ON CONFLICT (id) DO NOTHING`,
                [`ret-0001-${i + 1}`, orgId, `RET-2026-000${i + 1}`, poId1, compId, c.component_sku_id, defaultWhId, compReturned, c.unit_id, userId, userEmail]
              );
            }
          }

          // Output record for Order 1
          await client.query(
            `INSERT INTO production_outputs (
              id, organization_id, output_number, production_order_id, sku_id, warehouse_id,
              batch_number, quantity, unit_id, manufacturing_date, expiry_date, inventory_stock_type,
              operator_user_id, operator_email, notes, created_at
            ) VALUES ($1, $2, 'OUT-2026-0001', $3, $4, $5, 'BAT-2026-RW01', 2360, $6, '2026-09-12', '2028-09-12', 'available', $7, $8, 'Full batch bottled and sealed. QC release confirmed.', '2026-09-12 17:00:00+00')
            ON CONFLICT (id) DO NOTHING`,
            ['out-0001-1', orgId, poId1, form1.finished_sku_id, defaultWhId, form1.expected_yield_unit_id, userId, userEmail]
          );

          // Wastage record for Order 1
          await client.query(
            `INSERT INTO production_wastages (
              id, organization_id, production_order_id, category, quantity, unit_id, sku_id, reason, recorded_by, recorded_by_email, created_at
            ) VALUES ($1, $2, $3, 'Process Loss', 140, $4, $5, 'Steam condensation and filtration hold-up in vacuum lines.', $6, $7, '2026-09-12 17:10:00+00')
            ON CONFLICT (id) DO NOTHING`,
            ['wst-0001-1', orgId, poId1, form1.expected_yield_unit_id, form1.finished_sku_id, userId, userEmail]
          );
        }

        // Order 2: In Production (Vitamin C Serum 50ml - 1000 Units)
        const form2 = formulationList.find(f => f.formulation_code.includes('VITC')) || formulationList[1] || formulationList[0];
        if (form2) {
          const poId2 = 'po-2026-0002';
          const plannedQty2 = 1000;
          const ratio2 = plannedQty2 / parseFloat(form2.batch_size);
          const expYield2 = Math.round(parseFloat(form2.expected_yield) * ratio2 * 100) / 100;
          const expWastage2 = Math.round(parseFloat(form2.expected_wastage_quantity || 30) * ratio2 * 100) / 100;

          await client.query(
            `INSERT INTO production_orders (
              id, organization_id, production_order_number, production_plan_id,
              formulation_id, formulation_version, formulation_code_snapshot, formulation_name_snapshot,
              finished_product_id, finished_sku_id, warehouse_id,
              planned_quantity, planned_unit_id, scaling_ratio, expected_yield, expected_yield_unit_id, expected_wastage_quantity,
              actual_output_quantity, actual_wastage_quantity, actual_rejected_quantity,
              planned_start_date, planned_end_date, actual_start_date,
              status, material_status, qc_status, production_batch_number,
              notes, created_by, created_by_email, approved_by, approved_by_email, approved_at,
              created_at, updated_at
            ) VALUES (
              $1, $2, 'PRD-2026-0002', $3,
              $4, $5, $6, $7,
              $8, $9, $10,
              $11, $12, $13, $14, $15, $16,
              0, 0, 0,
              '2026-09-14', '2026-09-16', NOW(),
              'in_production', 'partially_issued', 'pending', 'BAT-2026-VC02',
              'Formulation requires cold-process homogenization and nitrogen flushing during filling.',
              $17, $18, $17, $18, NOW(),
              NOW(), NOW()
            ) ON CONFLICT (id) DO NOTHING`,
            [
              poId2, orgId, planId,
              form2.id, form2.version, form2.formulation_code, form2.name,
              form2.finished_product_id, form2.finished_sku_id, defaultWhId,
              plannedQty2, form2.batch_size_unit_id, ratio2, expYield2, form2.expected_yield_unit_id, expWastage2,
              userId, userEmail,
            ]
          );

          // Insert Order 2 components
          for (let i = 0; i < form2.components.length; i++) {
            const c = form2.components[i];
            const compReq = Math.round(c.quantity * ratio2 * 1000) / 1000;
            const compGross = Math.round(compReq * (1 + c.wastage_allowance_percentage / 100) * 1000) / 1000;
            const compReserved = compGross;
            const compIssued = i === 0 ? compGross : Math.round(compGross * 0.5 * 1000) / 1000;
            const compId = `poc-0002-${i + 1}`;

            await client.query(
              `INSERT INTO production_order_components (
                id, organization_id, production_order_id, component_product_id, component_sku_id,
                component_type, required_quantity, required_unit_id, wastage_allowance_percentage,
                planned_quantity, reserved_quantity, issued_quantity, actual_consumed_quantity, returned_quantity,
                sequence_order, standard_unit_cost, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, 'raw_material', $6, $7, $8, $9, $10, $11, 0, 0, $12, $13, NOW(), NOW())
              ON CONFLICT (id) DO NOTHING`,
              [
                compId, orgId, poId2, c.component_product_id, c.component_sku_id,
                compReq, c.unit_id, c.wastage_allowance_percentage,
                compGross, compReserved, compIssued,
                i + 1, c.standard_cost,
              ]
            );

            // Record issue
            await client.query(
              `INSERT INTO production_material_issues (
                id, organization_id, issue_number, production_order_id, component_id, sku_id,
                warehouse_id, quantity, unit_id, batch_number, issued_by, issued_by_email, notes, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'LOT-RM-2026-B4', $10, $11, 'Active compound stage 1 dispensing', NOW())
              ON CONFLICT (id) DO NOTHING`,
              [`iss-0002-${i + 1}`, orgId, `ISS-2026-001${i + 1}`, poId2, compId, c.component_sku_id, defaultWhId, compIssued, c.unit_id, userId, userEmail]
            );
          }
        }

        // Order 3: Approved & Reserved (Herbal Shampoo 200ml - 5000 Units)
        const form3 = formulationList.find(f => f.formulation_code.includes('SHMP') || f.formulation_code.includes('ALOE')) || formulationList[2] || formulationList[0];
        if (form3) {
          const poId3 = 'po-2026-0003';
          const plannedQty3 = 5000;
          const ratio3 = plannedQty3 / parseFloat(form3.batch_size);
          const expYield3 = Math.round(parseFloat(form3.expected_yield) * ratio3 * 100) / 100;
          const expWastage3 = Math.round(parseFloat(form3.expected_wastage_quantity || 80) * ratio3 * 100) / 100;

          await client.query(
            `INSERT INTO production_orders (
              id, organization_id, production_order_number, production_plan_id,
              formulation_id, formulation_version, formulation_code_snapshot, formulation_name_snapshot,
              finished_product_id, finished_sku_id, warehouse_id,
              planned_quantity, planned_unit_id, scaling_ratio, expected_yield, expected_yield_unit_id, expected_wastage_quantity,
              actual_output_quantity, actual_wastage_quantity, actual_rejected_quantity,
              planned_start_date, planned_end_date,
              status, material_status, qc_status, production_batch_number,
              notes, created_by, created_by_email, approved_by, approved_by_email, approved_at,
              created_at, updated_at
            ) VALUES (
              $1, $2, 'PRD-2026-0003', $3,
              $4, $5, $6, $7,
              $8, $9, $10,
              $11, $12, $13, $14, $15, $16,
              0, 0, 0,
              '2026-09-18', '2026-09-21',
              'reserved', 'reserved', 'pending', 'BAT-2026-HS03',
              'All raw material lots allocated and staged in clean room prep bay #2.',
              $17, $18, $17, $18, NOW(),
              NOW(), NOW()
            ) ON CONFLICT (id) DO NOTHING`,
            [
              poId3, orgId, planId,
              form3.id, form3.version, form3.formulation_code, form3.name,
              form3.finished_product_id, form3.finished_sku_id, defaultWhId,
              plannedQty3, form3.batch_size_unit_id, ratio3, expYield3, form3.expected_yield_unit_id, expWastage3,
              userId, userEmail,
            ]
          );

          // Components for Order 3
          for (let i = 0; i < form3.components.length; i++) {
            const c = form3.components[i];
            const compReq = Math.round(c.quantity * ratio3 * 1000) / 1000;
            const compGross = Math.round(compReq * (1 + c.wastage_allowance_percentage / 100) * 1000) / 1000;
            const compId = `poc-0003-${i + 1}`;

            await client.query(
              `INSERT INTO production_order_components (
                id, organization_id, production_order_id, component_product_id, component_sku_id,
                component_type, required_quantity, required_unit_id, wastage_allowance_percentage,
                planned_quantity, reserved_quantity, issued_quantity, actual_consumed_quantity, returned_quantity,
                sequence_order, standard_unit_cost, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, 'raw_material', $6, $7, $8, $9, $10, 0, 0, 0, $11, $12, NOW(), NOW())
              ON CONFLICT (id) DO NOTHING`,
              [
                compId, orgId, poId3, c.component_product_id, c.component_sku_id,
                compReq, c.unit_id, c.wastage_allowance_percentage,
                compGross, compGross,
                i + 1, c.standard_cost,
              ]
            );
          }
        }

        // Order 4: Draft Order awaiting approval
        const form4 = formulationList[3] || formulationList[0];
        if (form4) {
          const poId4 = 'po-2026-0004';
          const plannedQty4 = 1500;
          const ratio4 = plannedQty4 / parseFloat(form4.batch_size);
          const expYield4 = Math.round(parseFloat(form4.expected_yield) * ratio4 * 100) / 100;
          const expWastage4 = Math.round(parseFloat(form4.expected_wastage_quantity || 20) * ratio4 * 100) / 100;

          await client.query(
            `INSERT INTO production_orders (
              id, organization_id, production_order_number,
              formulation_id, formulation_version, formulation_code_snapshot, formulation_name_snapshot,
              finished_product_id, finished_sku_id, warehouse_id,
              planned_quantity, planned_unit_id, scaling_ratio, expected_yield, expected_yield_unit_id, expected_wastage_quantity,
              actual_output_quantity, actual_wastage_quantity, actual_rejected_quantity,
              planned_start_date, planned_end_date,
              status, material_status, qc_status, production_batch_number,
              notes, created_by, created_by_email,
              created_at, updated_at
            ) VALUES (
              $1, $2, 'PRD-2026-0004',
              $3, $4, $5, $6,
              $7, $8, $9,
              $10, $11, $12, $13, $14, $15,
              0, 0, 0,
              '2026-09-25', '2026-09-27',
              'draft', 'pending', 'pending', 'BAT-2026-DRAFT',
              'Draft batch order created from preliminary sales forecast. Awaiting manager approval.',
              $16, $17,
              NOW(), NOW()
            ) ON CONFLICT (id) DO NOTHING`,
            [
              poId4, orgId,
              form4.id, form4.version, form4.formulation_code, form4.name,
              form4.finished_product_id, form4.finished_sku_id, defaultWhId,
              plannedQty4, form4.batch_size_unit_id, ratio4, expYield4, form4.expected_yield_unit_id, expWastage4,
              userId, userEmail,
            ]
          );

          // Components for Order 4
          for (let i = 0; i < form4.components.length; i++) {
            const c = form4.components[i];
            const compReq = Math.round(c.quantity * ratio4 * 1000) / 1000;
            const compGross = Math.round(compReq * (1 + c.wastage_allowance_percentage / 100) * 1000) / 1000;
            const compId = `poc-0004-${i + 1}`;

            await client.query(
              `INSERT INTO production_order_components (
                id, organization_id, production_order_id, component_product_id, component_sku_id,
                component_type, required_quantity, required_unit_id, wastage_allowance_percentage,
                planned_quantity, reserved_quantity, issued_quantity, actual_consumed_quantity, returned_quantity,
                sequence_order, standard_unit_cost, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, 'raw_material', $6, $7, $8, $9, 0, 0, 0, 0, $10, $11, NOW(), NOW())
              ON CONFLICT (id) DO NOTHING`,
              [
                compId, orgId, poId4, c.component_product_id, c.component_sku_id,
                compReq, c.unit_id, c.wastage_allowance_percentage,
                compGross,
                i + 1, c.standard_cost,
              ]
            );
          }
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 13 Migration] Manufacturing & Production Execution schema successfully synchronized.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 13 Migration Error] Failed to run production migration:', err);
    throw err;
  } finally {
    client.release();
  }
}
