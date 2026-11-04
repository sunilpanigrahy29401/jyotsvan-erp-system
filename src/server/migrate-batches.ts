import { pool } from './db.ts';

export async function runBatchMigration() {
  console.log('[Phase 14 Migration] Initializing Batch & Traceability Engine tables...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Batches Master (Canonical Batch & Lot Registry)
    await client.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        batch_number VARCHAR(128) NOT NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
        batch_type VARCHAR(64) NOT NULL DEFAULT 'raw_material',
        status VARCHAR(64) NOT NULL DEFAULT 'quarantine',
        manufacturing_date TIMESTAMPTZ,
        expiry_date TIMESTAMPTZ,
        retest_date TIMESTAMPTZ,
        best_before_date TIMESTAMPTZ,
        initial_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        current_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        reserved_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        quarantine_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        damaged_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        warehouse_id VARCHAR(64) REFERENCES warehouses(id) ON DELETE SET NULL,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        source_type VARCHAR(64) NOT NULL DEFAULT 'manual',
        source_reference_id VARCHAR(128),
        source_reference_number VARCHAR(128),
        supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
        supplier_batch_number VARCHAR(128),
        qc_inspection_id VARCHAR(64),
        qc_status VARCHAR(64) NOT NULL DEFAULT 'pending',
        coa_document_url TEXT,
        storage_conditions TEXT,
        potency_or_purity NUMERIC(8,4),
        cost_per_unit NUMERIC(16,4),
        notes TEXT,
        metadata JSONB,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_sku_batch UNIQUE (organization_id, sku_id, batch_number)
      );
    `);

    // 2. Batch Genealogy (Parent-Child multi-tier traceability connections)
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_genealogy (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        parent_batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        child_batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        production_order_id VARCHAR(64),
        production_order_number VARCHAR(128),
        quantity_consumed NUMERIC(16,4) NOT NULL,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        loss_or_scrap_quantity NUMERIC(16,4) DEFAULT 0,
        relationship_type VARCHAR(64) NOT NULL DEFAULT 'ingredient_consumed',
        step_sequence INTEGER DEFAULT 1,
        recorded_by VARCHAR(64),
        recorded_by_email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 3. Batch Status Transitions & History
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_status_logs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        from_status VARCHAR(64) NOT NULL,
        to_status VARCHAR(64) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        justification TEXT,
        authorized_by VARCHAR(64),
        authorized_by_email VARCHAR(255),
        reference_type VARCHAR(64),
        reference_id VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 4. Batch Holds & Recalls Register
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_holds (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        hold_number VARCHAR(128) NOT NULL,
        batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        hold_type VARCHAR(64) NOT NULL DEFAULT 'qc_hold',
        severity VARCHAR(32) NOT NULL DEFAULT 'medium',
        status VARCHAR(64) NOT NULL DEFAULT 'active',
        reason TEXT NOT NULL,
        affected_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        impact_scope VARCHAR(64) NOT NULL DEFAULT 'single_batch',
        placed_by VARCHAR(64),
        placed_by_email VARCHAR(255),
        released_by VARCHAR(64),
        released_by_email VARCHAR(255),
        released_at TIMESTAMPTZ,
        release_justification TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 5. Batch Numbering Rules & Sequence Generator Configuration
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_numbering_rules (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        rule_type VARCHAR(64) NOT NULL DEFAULT 'global',
        target_type VARCHAR(64),
        target_id VARCHAR(64),
        prefix VARCHAR(32) NOT NULL DEFAULT 'BAT',
        include_year BOOLEAN DEFAULT TRUE,
        year_format VARCHAR(8) DEFAULT 'YYYY',
        include_month BOOLEAN DEFAULT TRUE,
        include_day BOOLEAN DEFAULT FALSE,
        include_julian_date BOOLEAN DEFAULT FALSE,
        sequence_length INTEGER DEFAULT 5,
        current_sequence INTEGER DEFAULT 0,
        suffix VARCHAR(32),
        separator VARCHAR(8) DEFAULT '-',
        example_preview VARCHAR(128),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 6. Performance Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_batches_org ON batches(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_batches_sku ON batches(sku_id)',
      'CREATE INDEX IF NOT EXISTS idx_batches_batch_num ON batches(batch_number)',
      'CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)',
      'CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date)',
      'CREATE INDEX IF NOT EXISTS idx_batches_wh ON batches(warehouse_id)',
      'CREATE INDEX IF NOT EXISTS idx_genealogy_parent ON batch_genealogy(parent_batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_genealogy_child ON batch_genealogy(child_batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_genealogy_prod_order ON batch_genealogy(production_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_status_logs_batch ON batch_status_logs(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_batch_holds_batch ON batch_holds(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_batch_holds_status ON batch_holds(status)',
    ];

    for (const sql of indexes) {
      await client.query(sql);
    }

    // 7. Seed Permissions for Batch & Traceability Engine
    const batchPermissions = [
      { id: 'perm-bat-01', code: 'batches.view', module: 'batches', description: 'View master batch registry, shelf life, and FEFO telemetry' },
      { id: 'perm-bat-02', code: 'batches.create', module: 'batches', description: 'Register new batches, assign lot numbers, and configure attributes' },
      { id: 'perm-bat-03', code: 'batches.edit', module: 'batches', description: 'Modify batch storage conditions, retest dates, and certificates' },
      { id: 'perm-bat-04', code: 'batches.release', module: 'batches', description: 'Authorize batch release from quarantine into active available inventory' },
      { id: 'perm-bat-05', code: 'batches.hold', module: 'batches', description: 'Place batches and affected inventory lots on quarantine or quality hold' },
      { id: 'perm-bat-06', code: 'batches.recall', module: 'batches', description: 'Execute forward blast radius containment and product recalls' },
      { id: 'perm-bat-07', code: 'batches.genealogy', module: 'batches', description: 'Trace forward and backward parent-child genealogy trees' },
      { id: 'perm-bat-08', code: 'batches.settings', module: 'batches', description: 'Configure automated batch numbering patterns and sequence engines' },
      { id: 'perm-bat-09', code: 'batches.export', module: 'batches', description: 'Export batch compliance records, COA certificates, and genealogy logs' },
    ];

    const rolesRes = await client.query(`SELECT id, slug FROM roles WHERE slug IN ('super_admin', 'admin', 'plant_manager', 'production_manager', 'operations_manager', 'quality_manager', 'inventory_manager')`);
    const rolesList = rolesRes.rows;

    for (const p of batchPermissions) {
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

    // 8. Seed Default Batch Numbering Rules
    const orgRes = await client.query('SELECT id FROM organizations LIMIT 1');
    if (orgRes.rows.length > 0) {
      const orgId = orgRes.rows[0].id;

      const ruleCount = await client.query('SELECT COUNT(*) FROM batch_numbering_rules WHERE organization_id = $1', [orgId]);
      if (parseInt(ruleCount.rows[0].count, 10) === 0) {
        const rules = [
          {
            id: 'rule-bn-rm',
            name: 'Raw Material Lot Rule',
            rule_type: 'raw_material',
            prefix: 'RM',
            include_year: true,
            year_format: 'YYYY',
            include_month: true,
            sequence_length: 5,
            example_preview: 'RM-202609-00001',
          },
          {
            id: 'rule-bn-fg',
            name: 'Finished Goods Batch Rule',
            rule_type: 'finished_good',
            prefix: 'BAT',
            include_year: true,
            year_format: 'YYYY',
            include_month: false,
            sequence_length: 5,
            example_preview: 'BAT-2026-00001',
          },
          {
            id: 'rule-bn-bulk',
            name: 'Intermediate Bulk Blend Rule',
            rule_type: 'product_line',
            prefix: 'BULK',
            include_year: true,
            year_format: 'YYYY',
            include_month: true,
            sequence_length: 4,
            example_preview: 'BULK-202609-0001',
          },
        ];

        for (const r of rules) {
          await client.query(
            `INSERT INTO batch_numbering_rules (
              id, organization_id, name, rule_type, prefix, include_year, year_format,
              include_month, include_day, include_julian_date, sequence_length, current_sequence,
              separator, example_preview, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, FALSE, $9, 10, '-', $10, TRUE, NOW(), NOW())`,
            [r.id, orgId, r.name, r.rule_type, r.prefix, r.include_year, r.year_format, r.include_month, r.sequence_length, r.example_preview]
          );
        }
      }

      // 9. Seed Comprehensive Baseline Batches & Genealogy Links if empty
      const batchCountRes = await client.query('SELECT COUNT(*) FROM batches WHERE organization_id = $1', [orgId]);
      if (parseInt(batchCountRes.rows[0].count, 10) === 0) {
        console.log('[Phase 14 Migration] Seeding realistic enterprise batch and genealogy records...');

        // Fetch SKUs, Warehouses, Suppliers
        const skusRes = await client.query('SELECT s.id, s.sku, s.variant_name, p.name as product_name, s.unit_id FROM skus s JOIN products p ON s.product_id = p.id WHERE s.organization_id = $1 LIMIT 20', [orgId]);
        const whRes = await client.query('SELECT id, name FROM warehouses WHERE organization_id = $1 LIMIT 3', [orgId]);
        const supRes = await client.query('SELECT id, supplier_name, supplier_code FROM suppliers WHERE organization_id = $1 LIMIT 5', [orgId]);

        const primaryWh = whRes.rows[0]?.id || null;
        const skus = skusRes.rows;
        const suppliers = supRes.rows;

        if (skus.length >= 2) {
          const now = new Date();
          const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          const twoYearsLater = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);
          const twentyDaysLater = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000); // near expiry

          // Batch 1: Raw Material 1 (Niacinamide Pure Grade)
          const b1Id = 'bat-seed-rm-01';
          const sku1 = skus[0];
          await client.query(
            `INSERT INTO batches (
              id, organization_id, batch_number, sku_id, batch_type, status,
              manufacturing_date, expiry_date, retest_date, initial_quantity, current_quantity,
              unit_id, warehouse_id, source_type, source_reference_number,
              supplier_id, supplier_batch_number, qc_status, coa_document_url,
              storage_conditions, potency_or_purity, cost_per_unit, notes, created_at, updated_at
            ) VALUES (
              $1, $2, 'RM-2026-00101', $3, 'raw_material', 'released',
              NOW() - INTERVAL '30 days', $4, $5, 500, 320,
              $6, $7, 'grn', 'GRN-2026-000001',
              $8, 'SUP-LOT-9921A', 'passed', 'https://storage.jyotsvan.enterprise/coa/RM-2026-00101-COA.pdf',
              'Store at 15-25°C in airtight containers away from direct sunlight', 99.85, 450.00,
              'High-purity raw material inspected and certified for formulation usage.', NOW(), NOW()
            )`,
            [b1Id, orgId, sku1.id, twoYearsLater, oneYearLater, sku1.unit_id, primaryWh, suppliers[0]?.id || null]
          );

          // Batch 2: Raw Material 2 (Hyaluronic Acid 1% Solution)
          const b2Id = 'bat-seed-rm-02';
          const sku2 = skus[1] || skus[0];
          await client.query(
            `INSERT INTO batches (
              id, organization_id, batch_number, sku_id, batch_type, status,
              manufacturing_date, expiry_date, retest_date, initial_quantity, current_quantity,
              unit_id, warehouse_id, source_type, source_reference_number,
              supplier_id, supplier_batch_number, qc_status, coa_document_url,
              storage_conditions, potency_or_purity, cost_per_unit, notes, created_at, updated_at
            ) VALUES (
              $1, $2, 'RM-2026-00102', $3, 'raw_material', 'released',
              NOW() - INTERVAL '20 days', $4, $5, 800, 650,
              $6, $7, 'grn', 'GRN-2026-000002',
              $8, 'BASF-HA-778', 'passed', 'https://storage.jyotsvan.enterprise/coa/RM-2026-00102-COA.pdf',
              'Store below 20°C, keep refrigerated after unsealing', 99.50, 320.00,
              'Active cosmetic ingredient verified by Analytical HPLC testing.', NOW(), NOW()
            )`,
            [b2Id, orgId, sku2.id, oneYearLater, twentyDaysLater, sku2.unit_id, primaryWh, suppliers[1]?.id || suppliers[0]?.id || null]
          );

          // Batch 3: Finished Good 1 (Radiance Glow Serum 50ml)
          const b3Id = 'bat-seed-fg-01';
          const fgSku = skus[skus.length - 1];
          await client.query(
            `INSERT INTO batches (
              id, organization_id, batch_number, sku_id, batch_type, status,
              manufacturing_date, expiry_date, retest_date, initial_quantity, current_quantity,
              unit_id, warehouse_id, source_type, source_reference_number,
              qc_status, coa_document_url, storage_conditions, cost_per_unit, notes, created_at, updated_at
            ) VALUES (
              $1, $2, 'BAT-2026-00891', $3, 'finished_good', 'released',
              NOW() - INTERVAL '5 days', $4, $5, 1200, 1200,
              $6, $7, 'production_order', 'WO-2026-0001',
              'passed', 'https://storage.jyotsvan.enterprise/coa/BAT-2026-00891-COA.pdf',
              'Store at room temperature 20-25°C', 185.00,
              'Commercial batch passed microbiological and stability assays.', NOW(), NOW()
            )`,
            [b3Id, orgId, fgSku.id, twoYearsLater, oneYearLater, fgSku.unit_id, primaryWh]
          );

          // Batch 4: Raw Material 3 on QC Hold (Glycerin USP 99.5%)
          const b4Id = 'bat-seed-rm-03';
          const sku3 = skus[2] || skus[0];
          await client.query(
            `INSERT INTO batches (
              id, organization_id, batch_number, sku_id, batch_type, status,
              manufacturing_date, expiry_date, initial_quantity, current_quantity,
              quarantine_quantity, unit_id, warehouse_id, source_type, source_reference_number,
              supplier_id, supplier_batch_number, qc_status, storage_conditions, notes, created_at, updated_at
            ) VALUES (
              $1, $2, 'RM-2026-00103', $3, 'raw_material', 'hold',
              NOW() - INTERVAL '15 days', $4, 1000, 1000,
              1000, $5, $6, 'grn', 'GRN-2026-000003',
              $7, 'GLYC-LOT-441B', 'quarantine', 'Standard warehouse conditions',
              'Temporarily placed on investigative hold due to packaging seal inspection discrepancy.', NOW(), NOW()
            )`,
            [b4Id, orgId, sku3.id, oneYearLater, sku3.unit_id, primaryWh, suppliers[0]?.id || null]
          );

          // Batch 5: Near Expiry Batch (Preservative Blend 100)
          const b5Id = 'bat-seed-rm-04';
          await client.query(
            `INSERT INTO batches (
              id, organization_id, batch_number, sku_id, batch_type, status,
              manufacturing_date, expiry_date, initial_quantity, current_quantity,
              unit_id, warehouse_id, source_type, source_reference_number,
              supplier_id, supplier_batch_number, qc_status, storage_conditions, notes, created_at, updated_at
            ) VALUES (
              $1, $2, 'RM-2025-00045', $3, 'raw_material', 'released',
              NOW() - INTERVAL '340 days', $4, 250, 45,
              $5, $6, 'grn', 'GRN-2025-00088',
              $7, 'PRES-2025-LOT9', 'passed', 'Store in cool dry place',
              'Near expiry stock flagged for priority FEFO consumption.', NOW(), NOW()
            )`,
            [b5Id, orgId, sku2.id, twentyDaysLater, sku2.unit_id, primaryWh, suppliers[1]?.id || null]
          );

          // 10. Link Genealogy between RM1, RM2 and Finished Batch
          await client.query(
            `INSERT INTO batch_genealogy (
              id, organization_id, parent_batch_id, child_batch_id, production_order_number,
              quantity_consumed, unit_id, loss_or_scrap_quantity, relationship_type, step_sequence, notes, created_at
            ) VALUES
            ('gen-01', $1, $2, $3, 'WO-2026-0001', 180, $4, 2.5, 'ingredient_consumed', 1, 'Phase A Active ingredient compounding', NOW()),
            ('gen-02', $1, $5, $3, 'WO-2026-0001', 150, $6, 1.2, 'ingredient_consumed', 2, 'Phase B Humectant hydration blend', NOW())`,
            [orgId, b1Id, b3Id, sku1.unit_id, b2Id, sku2.unit_id]
          );

          // 11. Record Status Transition Logs
          await client.query(
            `INSERT INTO batch_status_logs (
              id, organization_id, batch_id, from_status, to_status, reason, justification, authorized_by_email, created_at
            ) VALUES
            ('log-01', $1, $2, 'quarantine', 'released', 'QC Approval', 'All analytical assays passed specifications', 'qa.director@jyotsvan.enterprise', NOW() - INTERVAL '4 days'),
            ('log-02', $1, $3, 'quarantine', 'hold', 'Investigation Hold', 'Drum lid seal tampering check required prior to release', 'qc.officer@jyotsvan.enterprise', NOW() - INTERVAL '2 days')`,
            [orgId, b3Id, b4Id]
          );

          // 12. Create Active Batch Hold Record for Batch 4
          await client.query(
            `INSERT INTO batch_holds (
              id, organization_id, hold_number, batch_id, hold_type, severity, status,
              reason, affected_quantity, impact_scope, placed_by_email, created_at, updated_at
            ) VALUES (
              'hold-2026-001', $1, 'HOLD-2026-0001', $2, 'investigation', 'medium', 'active',
              'Packaging seal on container 3 was loose upon dock arrival. Re-sampling required.', 1000, 'single_batch', 'qa.lead@jyotsvan.enterprise', NOW() - INTERVAL '2 days', NOW()
            )`,
            [orgId, b4Id]
          );
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 14 Migration] ✓ Batch & Traceability tables and seed data verified successfully.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 14 Migration] ✗ Error running batch migration:', err);
    throw err;
  } finally {
    client.release();
  }
}
