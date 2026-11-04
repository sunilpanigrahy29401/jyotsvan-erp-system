import { pool } from './db.ts';
import { migrateQualityControl } from './migrate-quality-control.ts';

export async function runFormulationMigration() {
  // Ensure prerequisite Phase 11 Quality Control tables exist
  try {
    await migrateQualityControl();
  } catch (qcErr) {
    console.warn('[Phase 12 Migration] Prerequisite QC migration check:', qcErr);
  }

  console.log('[Phase 12 Migration] Starting BOM / Formulation Management Schema Migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Formulations Master Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS formulations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        formulation_code VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        finished_product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
        finished_sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        version VARCHAR(32) NOT NULL DEFAULT '1.0',
        version_major INTEGER NOT NULL DEFAULT 1,
        version_minor INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        batch_size NUMERIC(14, 4) NOT NULL DEFAULT 1000.0000,
        batch_size_unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        expected_yield NUMERIC(14, 4) NOT NULL DEFAULT 950.0000,
        expected_yield_unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        expected_wastage_quantity NUMERIC(14, 4) DEFAULT 50.0000,
        expected_wastage_unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        effective_from DATE,
        effective_to DATE,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        qc_template_id VARCHAR(64) REFERENCES qc_templates(id) ON DELETE SET NULL,
        notes TEXT,
        created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        created_by_email VARCHAR(255),
        updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        updated_by_email VARCHAR(255),
        approved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_email VARCHAR(255),
        approved_at TIMESTAMPTZ,
        activated_at TIMESTAMPTZ,
        archived_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_sku_version UNIQUE (organization_id, finished_sku_id, version),
        CONSTRAINT uk_org_form_code_version UNIQUE (organization_id, formulation_code, version),
        CONSTRAINT chk_form_batch_size CHECK (batch_size > 0),
        CONSTRAINT chk_form_yield CHECK (expected_yield >= 0),
        CONSTRAINT chk_form_wastage CHECK (expected_wastage_quantity >= 0)
      );
    `);

    // Indexes for Formulations
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_formulations_org_status ON formulations (organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_formulations_sku ON formulations (finished_sku_id);
      CREATE INDEX IF NOT EXISTS idx_formulations_product ON formulations (finished_product_id);
      CREATE INDEX IF NOT EXISTS idx_formulations_code ON formulations (formulation_code);
      CREATE INDEX IF NOT EXISTS idx_formulations_effective ON formulations (effective_from, effective_to);
    `);

    // 2. Formulation Components Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS formulation_components (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        formulation_id VARCHAR(64) NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
        component_product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
        component_sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        component_type VARCHAR(64) NOT NULL DEFAULT 'raw_material',
        quantity NUMERIC(14, 4) NOT NULL,
        unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        sequence_order INTEGER NOT NULL DEFAULT 1,
        percentage NUMERIC(8, 4),
        wastage_allowance_percentage NUMERIC(6, 2) DEFAULT 0.00,
        is_optional BOOLEAN NOT NULL DEFAULT FALSE,
        is_substitutable BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_form_comp_sku UNIQUE (formulation_id, component_sku_id),
        CONSTRAINT chk_comp_qty CHECK (quantity > 0)
      );
    `);

    // Indexes for Formulation Components
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_form_comp_form_id ON formulation_components (formulation_id);
      CREATE INDEX IF NOT EXISTS idx_form_comp_sku_id ON formulation_components (component_sku_id);
      CREATE INDEX IF NOT EXISTS idx_form_comp_org_id ON formulation_components (organization_id);
      CREATE INDEX IF NOT EXISTS idx_form_comp_type ON formulation_components (component_type);
    `);

    // 3. Formulation Substitutions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS formulation_substitutions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        formulation_id VARCHAR(64) NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
        primary_component_id VARCHAR(64) NOT NULL REFERENCES formulation_components(id) ON DELETE CASCADE,
        alternate_sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        conversion_factor NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
        preference_priority INTEGER NOT NULL DEFAULT 1,
        substitution_group VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'approved',
        approved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_form_subst UNIQUE (formulation_id, primary_component_id, alternate_sku_id),
        CONSTRAINT chk_subst_factor CHECK (conversion_factor > 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_form_subst_form_id ON formulation_substitutions (formulation_id);
      CREATE INDEX IF NOT EXISTS idx_form_subst_alt_sku ON formulation_substitutions (alternate_sku_id);
    `);

    // 4. Formulation Costings Cache / Rollup Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS formulation_costings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        formulation_id VARCHAR(64) NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
        cost_basis VARCHAR(64) NOT NULL DEFAULT 'standard_cost',
        total_material_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        cost_per_batch_unit NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        cost_per_yield_unit NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        currency VARCHAR(8) NOT NULL DEFAULT 'INR',
        breakdown JSONB,
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_form_costing_basis UNIQUE (formulation_id, cost_basis)
      );
    `);

    // 5. Seed Permissions for Phase 12 Formulation Management
    const formulationPermissions = [
      { id: 'perm-form-01', code: 'formulations.view', module: 'manufacturing', description: 'View master formulations, bills of materials (BOM), and component recipes' },
      { id: 'perm-form-02', code: 'formulations.create', module: 'manufacturing', description: 'Create draft formulations and design new BOM recipe versions' },
      { id: 'perm-form-03', code: 'formulations.edit', module: 'manufacturing', description: 'Modify draft formulation components, yields, and wastage parameters' },
      { id: 'perm-form-04', code: 'formulations.delete', module: 'manufacturing', description: 'Remove unapproved draft formulations' },
      { id: 'perm-form-05', code: 'formulations.submit', module: 'manufacturing', description: 'Submit draft formulations for managerial engineering review' },
      { id: 'perm-form-06', code: 'formulations.approve', module: 'manufacturing', description: 'Authorize and sign off on formulation revisions and recipe approvals' },
      { id: 'perm-form-07', code: 'formulations.activate', module: 'manufacturing', description: 'Activate approved formulation version for standard production basis' },
      { id: 'perm-form-08', code: 'formulations.archive', module: 'manufacturing', description: 'Archive obsolete formulation recipes' },
      { id: 'perm-form-09', code: 'formulations.export', module: 'manufacturing', description: 'Export BOM structures, batch scaling manifests, and cost rollups' },
      { id: 'perm-form-10', code: 'manufacturing.bom.edit', module: 'manufacturing', description: 'Directly modify Bills of Materials and component tolerances' },
    ];

    for (const p of formulationPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module;`,
        [p.id, p.code, p.module, p.description]
      );
    }

    // Assign to roles
    const rolesRes = await client.query('SELECT id, slug FROM roles;');
    const rolesMap = new Map(rolesRes.rows.map(r => [r.slug, r.id]));

    const roleAssignments = [
      {
        roleSlug: 'super_admin',
        permCodes: formulationPermissions.map(p => p.code),
      },
      {
        roleSlug: 'org_admin',
        permCodes: formulationPermissions.map(p => p.code),
      },
      {
        roleSlug: 'operations_manager',
        permCodes: formulationPermissions.map(p => p.code),
      },
      {
        roleSlug: 'production_manager',
        permCodes: formulationPermissions.map(p => p.code),
      },
      {
        roleSlug: 'plant_manager',
        permCodes: formulationPermissions.map(p => p.code),
      },
      {
        roleSlug: 'quality_manager',
        permCodes: ['formulations.view', 'formulations.export'],
      },
      {
        roleSlug: 'operator',
        permCodes: ['formulations.view'],
      },
    ];

    for (const assignment of roleAssignments) {
      const roleId = rolesMap.get(assignment.roleSlug);
      if (!roleId) continue;

      for (const code of assignment.permCodes) {
        const permRes = await client.query('SELECT id FROM permissions WHERE code = $1;', [code]);
        if (permRes.rows.length > 0) {
          const permId = permRes.rows[0].id;
          const junctionId = `rp-${assignment.roleSlug}-${code.replace(/[:.]/g, '-')}`;
          await client.query(
            `INSERT INTO role_permissions (id, role_id, permission_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO NOTHING;`,
            [junctionId, roleId, permId]
          );
        }
      }
    }

    // 6. Seed Foundation Formulations and Components if empty
    const orgId = 'org-jyotsvan-corp';
    const formCount = await client.query('SELECT COUNT(*) FROM formulations WHERE organization_id = $1;', [orgId]);

    if (parseInt(formCount.rows[0].count, 10) === 0) {
      console.log('[Phase 12 Migration] Seeding initial canonical formulations, components, and substitutions...');

      // Look up units
      const unitsRes = await client.query('SELECT id, short_code FROM units;');
      const unitMap = new Map<string, string>();
      for (const u of unitsRes.rows) {
        unitMap.set(u.short_code.toLowerCase(), u.id);
        unitMap.set(u.id, u.id);
      }
      const lUnit = unitMap.get('l') || unitMap.get('ltr') || 'u-l';
      const kgUnit = unitMap.get('kg') || 'u-kg';
      const pcsUnit = unitMap.get('pcs') || 'u-pcs';

      // Look up SKUs & Products
      const skusRes = await client.query(`
        SELECT s.id as sku_id, s.sku, s.product_id, p.name as product_name, p.product_type, s.cost_price 
        FROM skus s 
        JOIN products p ON p.id = s.product_id 
        WHERE s.organization_id = $1;
      `, [orgId]);

      const skuMap = new Map<string, any>();
      for (const r of skusRes.rows) {
        skuMap.set(r.sku, r);
        skuMap.set(r.sku_id, r);
      }

      // Let's create or find finished SKUs and raw material SKUs
      // Ensure we have some finished goods and raw materials
      let finishedSku1 = skusRes.rows.find(s => s.sku.includes('JY-001') || s.product_name?.toLowerCase().includes('bio') || s.product_type === 'finished_good') || skusRes.rows[0];
      let finishedSku2 = skusRes.rows.find(s => s.sku !== finishedSku1?.sku && (s.product_type === 'finished_good' || s.sku.includes('002'))) || skusRes.rows[1] || skusRes.rows[0];

      // Ensure some raw materials exist
      let rawMat1 = skusRes.rows.find(s => s.sku !== finishedSku1?.sku && s.sku !== finishedSku2?.sku) || skusRes.rows[2] || skusRes.rows[0];
      let rawMat2 = skusRes.rows.find(s => s.sku !== finishedSku1?.sku && s.sku !== finishedSku2?.sku && s.sku !== rawMat1?.sku) || skusRes.rows[3] || skusRes.rows[1] || skusRes.rows[0];
      let rawMat3 = skusRes.rows.find(s => s.sku !== finishedSku1?.sku && s.sku !== finishedSku2?.sku && s.sku !== rawMat1?.sku && s.sku !== rawMat2?.sku) || skusRes.rows[4] || skusRes.rows[2] || skusRes.rows[0];

      // Seed Formulation 1: Bio NPK Liquid 1L — Version 1.0 (Active)
      if (finishedSku1) {
        const formId1 = 'form-bio-npk-v1-0';
        await client.query(`
          INSERT INTO formulations (
            id, organization_id, formulation_code, name, finished_product_id, finished_sku_id,
            version, version_major, version_minor, description, batch_size, batch_size_unit_id,
            expected_yield, expected_yield_unit_id, expected_wastage_quantity, expected_wastage_unit_id,
            effective_from, effective_to, status, notes, created_by_email, approved_by_email,
            approved_at, activated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW() - INTERVAL '60 days', NOW() - INTERVAL '58 days'
          ) ON CONFLICT (id) DO NOTHING;
        `, [
          formId1,
          orgId,
          'BOM-BIO-NPK-1L',
          'Bio NPK Liquid 1L Master Formula',
          finishedSku1.product_id,
          finishedSku1.sku_id,
          '1.0',
          1,
          0,
          'Standard high-potency bio-fertilizer formulation for 1000L base production run with organic microbial consortium.',
          1000.0,
          lUnit,
          950.0,
          lUnit,
          50.0,
          lUnit,
          '2026-01-01',
          null,
          'active',
          'Standard manufacturing SOP verified under ISO-9001 quality specifications.',
          'sunilpanigrahy29401@gmail.com',
          'sunilpanigrahy29401@gmail.com',
        ]);

        // Add Components to Formulation 1
        const comp1 = 'comp-npk-01';
        const comp2 = 'comp-npk-02';
        const comp3 = 'comp-npk-03';
        const comp4 = 'comp-npk-04';

        if (rawMat1) {
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            comp1, orgId, formId1, rawMat1.product_id, rawMat1.sku_id,
            'raw_material', 450.0, kgUnit, 1, 45.0, 2.0, false, true, 'Primary nitrogen and phosphorus active isolate.'
          ]);
        }

        if (rawMat2) {
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            comp2, orgId, formId1, rawMat2.product_id, rawMat2.sku_id,
            'raw_material', 300.0, kgUnit, 2, 30.0, 1.5, false, false, 'Soluble organic potash concentrate.'
          ]);
        }

        if (rawMat3) {
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            comp3, orgId, formId1, rawMat3.product_id, rawMat3.sku_id,
            'additive', 50.0, kgUnit, 3, 5.0, 0.5, false, true, 'Microbial bio-stimulant & stabilizer.'
          ]);
        }

        // Packaging component: 1000 HDPE 1L Bottles
        if (skusRes.rows[4] || skusRes.rows[0]) {
          const packSku = skusRes.rows[4] || skusRes.rows[0];
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            comp4, orgId, formId1, packSku.product_id, packSku.sku_id,
            'packaging', 1000.0, pcsUnit, 4, null, 1.0, false, true, '1L HDPE UV-stabilized tamper-evident bottles with inductive seal caps.'
          ]);
        }

        // Add Approved Substitution for comp1
        if (rawMat2 && rawMat1) {
          await client.query(`
            INSERT INTO formulation_substitutions (
              id, organization_id, formulation_id, primary_component_id, alternate_sku_id,
              conversion_factor, preference_priority, substitution_group, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING;
          `, [
            'subst-npk-01', orgId, formId1, comp1, rawMat2.sku_id,
            1.05, 1, 'Group-A-Nitrogen', 'approved', 'Secondary certified organic nitrogen source with 1.05x conversion ratio.'
          ]);
        }

        // Seed Formulation 2: Bio NPK Liquid 1L — Version 1.1 (Draft / Under Review)
        const formId2 = 'form-bio-npk-v1-1';
        await client.query(`
          INSERT INTO formulations (
            id, organization_id, formulation_code, name, finished_product_id, finished_sku_id,
            version, version_major, version_minor, description, batch_size, batch_size_unit_id,
            expected_yield, expected_yield_unit_id, expected_wastage_quantity, expected_wastage_unit_id,
            effective_from, effective_to, status, notes, created_by_email
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          ) ON CONFLICT (id) DO NOTHING;
        `, [
          formId2,
          orgId,
          'BOM-BIO-NPK-1L',
          'Bio NPK Liquid 1L (Eco-Optimized)',
          finishedSku1.product_id,
          finishedSku1.sku_id,
          '1.1',
          1,
          1,
          'Optimized recipe with improved emulsification matrix, reducing expected wastage from 50L to 30L.',
          1000.0,
          lUnit,
          970.0,
          lUnit,
          30.0,
          lUnit,
          '2026-04-01',
          null,
          'under_review',
          'Currently undergoing stability assays and microbial culture validation.',
          'sunilpanigrahy29401@gmail.com',
        ]);

        if (rawMat1) {
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            'comp-npk11-01', orgId, formId2, rawMat1.product_id, rawMat1.sku_id,
            'raw_material', 460.0, kgUnit, 1, 46.0, 1.2, false, true, 'Primary nitrogen isolate.'
          ]);
        }

        if (rawMat2) {
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            'comp-npk11-02', orgId, formId2, rawMat2.product_id, rawMat2.sku_id,
            'raw_material', 310.0, kgUnit, 2, 31.0, 1.0, false, false, 'Organic potash.'
          ]);
        }
      }

      // Seed Formulation 3 for finishedSku2: Organic Neem Pesticide 500ml Formula v1.0
      if (finishedSku2 && finishedSku2.sku_id !== finishedSku1?.sku_id) {
        const formId3 = 'form-neem-500-v1-0';
        await client.query(`
          INSERT INTO formulations (
            id, organization_id, formulation_code, name, finished_product_id, finished_sku_id,
            version, version_major, version_minor, description, batch_size, batch_size_unit_id,
            expected_yield, expected_yield_unit_id, expected_wastage_quantity, expected_wastage_unit_id,
            effective_from, effective_to, status, notes, created_by_email, approved_by_email,
            approved_at, activated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days'
          ) ON CONFLICT (id) DO NOTHING;
        `, [
          formId3,
          orgId,
          'BOM-NEEM-PEST-500ML',
          'Neem Bio-Pesticide 500ml Recipe',
          finishedSku2.product_id,
          finishedSku2.sku_id,
          '1.0',
          1,
          0,
          'Cold-pressed azadirachtin 1500ppm concentrate blend for 500L standard batch yield.',
          500.0,
          lUnit,
          485.0,
          lUnit,
          15.0,
          lUnit,
          '2026-02-01',
          null,
          'active',
          'Certified pesticide blend formulation complying with CIBRC regulatory standards.',
          'sunilpanigrahy29401@gmail.com',
          'sunilpanigrahy29401@gmail.com',
        ]);

        if (rawMat1) {
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            'comp-neem-01', orgId, formId3, rawMat1.product_id, rawMat1.sku_id,
            'raw_material', 250.0, kgUnit, 1, 50.0, 1.5, false, false, 'Pure cold-pressed neem kernel oil extract.'
          ]);
        }

        if (rawMat3) {
          await client.query(`
            INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING;
          `, [
            'comp-neem-02', orgId, formId3, rawMat3.product_id, rawMat3.sku_id,
            'additive', 235.0, lUnit, 2, 47.0, 1.0, false, false, 'Organic emulsifier and carrier base.'
          ]);
        }
      }

      console.log('[Phase 12 Migration] Initial formulations, components, and substitutions seeded.');
    }

    await client.query('COMMIT;');
    console.log('[Phase 12 Migration] BOM / Formulation Management Schema Migration Completed.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 12 Migration] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
