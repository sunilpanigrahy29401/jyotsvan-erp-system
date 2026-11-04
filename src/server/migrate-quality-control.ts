import { pool } from './db.ts';

export async function migrateQualityControl() {
  console.log('[Migration] Starting Phase 11 — Quality Control (QC) Schema Migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. QC Parameters Master Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_parameters (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        parameter_code VARCHAR(64) NOT NULL,
        parameter_name VARCHAR(255) NOT NULL,
        description TEXT,
        parameter_type VARCHAR(32) NOT NULL DEFAULT 'numeric',
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        minimum_value NUMERIC(15,4),
        maximum_value NUMERIC(15,4),
        target_value NUMERIC(15,4),
        allowed_values JSONB,
        test_method VARCHAR(255),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_qc_param_code UNIQUE (organization_id, parameter_code)
      );
    `);

    // 2. QC Specifications / Templates Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_templates (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        template_code VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(64) NOT NULL DEFAULT 'incoming_material',
        version INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_qc_template_code_ver UNIQUE (organization_id, template_code, version)
      );
    `);

    // 3. QC Template Parameters Mapping Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_template_parameters (
        id VARCHAR(64) PRIMARY KEY,
        template_id VARCHAR(64) NOT NULL REFERENCES qc_templates(id) ON DELETE CASCADE,
        parameter_id VARCHAR(64) NOT NULL REFERENCES qc_parameters(id) ON DELETE RESTRICT,
        sequence_order INTEGER NOT NULL DEFAULT 1,
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        override_min NUMERIC(15,4),
        override_max NUMERIC(15,4),
        override_target NUMERIC(15,4),
        override_allowed_values JSONB,
        test_method VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_template_parameter UNIQUE (template_id, parameter_id)
      );
    `);

    // 4. Link SKUs to QC Requirements & Default Template
    await client.query(`
      ALTER TABLE skus
      ADD COLUMN IF NOT EXISTS requires_qc BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS qc_template_id VARCHAR(64) REFERENCES qc_templates(id) ON DELETE SET NULL;
    `);

    // 5. QC Inspections Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_inspections (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        inspection_number VARCHAR(64) NOT NULL,
        source_type VARCHAR(64) NOT NULL DEFAULT 'goods_receipt',
        source_id VARCHAR(128) NOT NULL,
        source_item_id VARCHAR(128),
        supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        manufacturing_date DATE,
        expiry_date DATE,
        received_quantity NUMERIC(14,3) NOT NULL,
        sample_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        template_id VARCHAR(64) REFERENCES qc_templates(id) ON DELETE SET NULL,
        template_version_snapshot INTEGER DEFAULT 1,
        inspection_type VARCHAR(64) NOT NULL DEFAULT 'incoming',
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        overall_result VARCHAR(32) DEFAULT 'pending',
        assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        assigned_to_email VARCHAR(255),
        inspected_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        inspected_by_email VARCHAR(255),
        parent_inspection_id VARCHAR(64) REFERENCES qc_inspections(id) ON DELETE SET NULL,
        is_reinspection BOOLEAN NOT NULL DEFAULT FALSE,
        reinspection_reason TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        inventory_released BOOLEAN NOT NULL DEFAULT FALSE,
        inventory_movement_id VARCHAR(64),
        created_by VARCHAR(64),
        created_by_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_qc_inspection_num UNIQUE (organization_id, inspection_number)
      );
    `);

    // 6. QC Inspection Items (Parameter Results & Snapshot) Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_inspection_items (
        id VARCHAR(64) PRIMARY KEY,
        inspection_id VARCHAR(64) NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,
        parameter_id VARCHAR(64) REFERENCES qc_parameters(id) ON DELETE SET NULL,
        parameter_code_snapshot VARCHAR(64) NOT NULL,
        parameter_name_snapshot VARCHAR(255) NOT NULL,
        parameter_type_snapshot VARCHAR(32) NOT NULL,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        unit_code_snapshot VARCHAR(32),
        expected_value TEXT,
        minimum_value NUMERIC(15,4),
        maximum_value NUMERIC(15,4),
        target_value NUMERIC(15,4),
        allowed_values_snapshot JSONB,
        test_method_snapshot VARCHAR(255),
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        sequence_order INTEGER NOT NULL DEFAULT 1,
        actual_value NUMERIC(15,4),
        text_result TEXT,
        boolean_result BOOLEAN,
        selection_result VARCHAR(255),
        auto_evaluation VARCHAR(32) DEFAULT 'pending',
        evaluated_result VARCHAR(32) NOT NULL DEFAULT 'pending',
        is_overridden BOOLEAN NOT NULL DEFAULT FALSE,
        override_reason TEXT,
        overridden_by VARCHAR(64),
        overridden_by_email VARCHAR(255),
        overridden_at TIMESTAMPTZ,
        remarks TEXT,
        tested_by VARCHAR(64),
        tested_by_email VARCHAR(255),
        tested_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. QC Decisions Table (Immutable Decision Ledger)
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_decisions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        inspection_id VARCHAR(64) NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,
        decision VARCHAR(32) NOT NULL,
        rejection_reason_code VARCHAR(64),
        decision_reason TEXT,
        comments TEXT,
        has_override BOOLEAN NOT NULL DEFAULT FALSE,
        override_justification TEXT,
        accepted_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000,
        rejected_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000,
        quarantine_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000,
        decided_by VARCHAR(64),
        decided_by_email VARCHAR(255) NOT NULL,
        decision_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        inventory_action_status VARCHAR(32) NOT NULL DEFAULT 'completed',
        inventory_movement_ids JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 8. QC Documents Table (COA, Lab Reports, Photos, Supplier Certs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        inspection_id VARCHAR(64) NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(64) NOT NULL,
        file_url TEXT NOT NULL,
        file_size_bytes INTEGER,
        uploaded_by VARCHAR(64),
        uploaded_by_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 9. Notifications Table for Real-time Operational Alerts
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        recipient_user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'quality',
        action_url TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 10. Performance Indexes for Scale & Fast Multi-Tenant Filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_param_org ON qc_parameters(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_qc_template_org ON qc_templates(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_qc_tpl_param_tpl ON qc_template_parameters(template_id);
      
      CREATE INDEX IF NOT EXISTS idx_qc_insp_org_status ON qc_inspections(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_qc_insp_sku ON qc_inspections(sku_id);
      CREATE INDEX IF NOT EXISTS idx_qc_insp_supplier ON qc_inspections(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_qc_insp_wh ON qc_inspections(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_qc_insp_source ON qc_inspections(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_qc_insp_parent ON qc_inspections(parent_inspection_id);
      CREATE INDEX IF NOT EXISTS idx_qc_insp_created ON qc_inspections(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_qc_items_insp ON qc_inspection_items(inspection_id);
      CREATE INDEX IF NOT EXISTS idx_qc_decisions_insp ON qc_decisions(inspection_id);
      CREATE INDEX IF NOT EXISTS idx_qc_decisions_org ON qc_decisions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_qc_docs_insp ON qc_documents(inspection_id);
      CREATE INDEX IF NOT EXISTS idx_notif_org_recipient ON notifications(organization_id, recipient_email, is_read);
    `);

    // 11. Register & Seed Granular QC Permissions
    const qcPermissions = [
      { id: 'perm-qc-01', code: 'quality.view', module: 'quality', description: 'View QC inspections, templates, parameter registries, and reports' },
      { id: 'perm-qc-02', code: 'quality.create', module: 'quality', description: 'Create and initialize quality inspections and sampling orders' },
      { id: 'perm-qc-03', code: 'quality.edit', module: 'quality', description: 'Record, amend, and enter test parameter results and lab assays' },
      { id: 'perm-qc-04', code: 'quality.approve', module: 'quality', description: 'Authorize QC approval decisions and execute inventory stock release' },
      { id: 'perm-qc-05', code: 'quality.export', module: 'quality', description: 'Export QC inspection summaries, COA certificates, and analytics' },
      { id: 'perm-qc-06', code: 'qc_parameters.view', module: 'quality', description: 'View parameter master catalog and test specifications' },
      { id: 'perm-qc-07', code: 'qc_parameters.create', module: 'quality', description: 'Create and configure new quality test parameters' },
      { id: 'perm-qc-08', code: 'qc_parameters.edit', module: 'quality', description: 'Update parameter specifications and acceptable ranges' },
      { id: 'perm-qc-09', code: 'qc_parameters.archive', module: 'quality', description: 'Archive obsolete test parameters' },
      { id: 'perm-qc-10', code: 'qc_templates.view', module: 'quality', description: 'View QC specification templates and parameter matrices' },
      { id: 'perm-qc-11', code: 'qc_templates.create', module: 'quality', description: 'Create and version new QC specification templates' },
      { id: 'perm-qc-12', code: 'qc_templates.edit', module: 'quality', description: 'Update template parameter assignments and test tolerances' },
      { id: 'perm-qc-13', code: 'qc_templates.archive', module: 'quality', description: 'Deactivate and archive QC templates' },
      { id: 'perm-qc-14', code: 'qc_inspections.view', module: 'quality', description: 'Access quality inspection logs and history' },
      { id: 'perm-qc-15', code: 'qc_inspections.create', module: 'quality', description: 'Generate incoming and manual QC inspections' },
      { id: 'perm-qc-16', code: 'qc_inspections.edit', module: 'quality', description: 'Record inspection test measurements and remarks' },
      { id: 'perm-qc-17', code: 'qc_inspections.submit', module: 'quality', description: 'Submit completed test results for managerial review' },
      { id: 'perm-qc-18', code: 'qc_inspections.review', module: 'quality', description: 'Review submitted test data and lab assays' },
      { id: 'perm-qc-19', code: 'qc_inspections.approve', module: 'quality', description: 'Grant final QC release and inventory approval' },
      { id: 'perm-qc-20', code: 'qc_inspections.reject', module: 'quality', description: 'Issue QC rejection decision and quarantine hold' },
      { id: 'perm-qc-21', code: 'qc_inspections.quarantine', module: 'quality', description: 'Place material on quarantine holding pending investigation' },
      { id: 'perm-qc-22', code: 'qc_override', module: 'quality', description: 'Override automated out-of-spec test evaluation with audit justification' },
      { id: 'perm-qc-23', code: 'qc_documents.view', module: 'quality', description: 'View laboratory COA and uploaded test attachments' },
      { id: 'perm-qc-24', code: 'qc_documents.create', module: 'quality', description: 'Upload COA reports, lab assays, and inspection photos' },
      { id: 'perm-qc-25', code: 'qc_documents.delete', module: 'quality', description: 'Remove uploaded QC document records' },
    ];

    for (const p of qcPermissions) {
      await client.query(`
        INSERT INTO permissions (id, code, module, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module;
      `, [p.id, p.code, p.module, p.description]);
    }

    // Assign QC permissions to admin and manager roles
    const adminRoles = await client.query(`
      SELECT id FROM roles WHERE slug IN ('super_admin', 'admin', 'plant_manager', 'quality_manager', 'operations_manager')
    `);

    for (const r of adminRoles.rows) {
      for (const p of qcPermissions) {
        const permRow = await client.query('SELECT id FROM permissions WHERE code = $1 LIMIT 1;', [p.code]);
        if (permRow.rows.length > 0) {
          const realPermId = permRow.rows[0].id;
          const rpId = `rp-${r.id}-${realPermId}`;
          await client.query(`
            INSERT INTO role_permissions (id, role_id, permission_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO NOTHING;
          `, [rpId, r.id, realPermId]);
        }
      }
    }

    // 12. Seed Master QC Parameters & Templates for Standard Jyotsvan Raw Materials & Finished Goods
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
    if (orgRes.rows.length > 0) {
      const orgId = orgRes.rows[0].id;
      
      // Fetch Units
      const unitsRes = await client.query(`SELECT id, short_code FROM units WHERE organization_id = $1`, [orgId]);
      const unitMap: Record<string, string> = {};
      unitsRes.rows.forEach(u => {
        unitMap[u.short_code] = u.id;
      });

      // Default Parameters
      const seedParameters = [
        {
          id: 'param-ph-01',
          code: 'PARAM-PH',
          name: 'pH Value (at 25°C)',
          description: 'Aqueous hydrogen ion concentration measurement for formulation balance',
          type: 'numeric',
          unitId: unitMap['pH'] || null,
          min: 6.0,
          max: 8.5,
          target: 7.2,
          allowed: null,
          method: 'Digital pH Electrode Probe (IS 101)',
        },
        {
          id: 'param-moist-01',
          code: 'PARAM-MOISTURE',
          name: 'Moisture Content (%)',
          description: 'Gravimetric loss on drying at 105°C for granular/powder substances',
          type: 'numeric',
          unitId: unitMap['%'] || null,
          min: 0.0,
          max: 5.0,
          target: 2.5,
          allowed: null,
          method: 'Halogen Moisture Analyzer (ASTM D280)',
        },
        {
          id: 'param-purity-01',
          code: 'PARAM-PURITY',
          name: 'Active Ingredient Purity / Assay',
          description: 'Concentration of primary bioactive/chemical component',
          type: 'numeric',
          unitId: unitMap['%'] || null,
          min: 95.0,
          max: 100.0,
          target: 98.5,
          allowed: null,
          method: 'HPLC UV-Vis Spectrophotometry',
        },
        {
          id: 'param-solub-01',
          code: 'PARAM-SOLUBILITY',
          name: 'Aqueous Solubility (%)',
          description: 'Percentage dissolved in demineralized water at room temperature',
          type: 'numeric',
          unitId: unitMap['%'] || null,
          min: 98.0,
          max: 100.0,
          target: 99.5,
          allowed: null,
          method: 'Gravimetric Filtration Residue Analysis',
        },
        {
          id: 'param-appear-01',
          code: 'PARAM-APPEARANCE',
          name: 'Visual Appearance & Color',
          description: 'Physical inspection for color homogeneity, luster, and agglomeration',
          type: 'selection',
          unitId: null,
          min: null,
          max: null,
          target: null,
          allowed: JSON.stringify(['Shiny Black Granules', 'Dark Brown Powder', 'Clear Amber Liquid', 'Complies', 'Pass']),
          method: 'Visual organoleptic assessment under standard D65 illumination',
        },
        {
          id: 'param-odor-01',
          code: 'PARAM-ODOR',
          name: 'Odor Profile',
          description: 'Characteristic aroma without rancidity, decomposition or foreign solvent notes',
          type: 'pass_fail',
          unitId: null,
          min: null,
          max: null,
          target: null,
          allowed: JSON.stringify(['Pass', 'Fail']),
          method: 'Organoleptic sensory sniff protocol',
        },
        {
          id: 'param-heavy-01',
          code: 'PARAM-HEAVY-METALS',
          name: 'Heavy Metals (Lead, Cadmium, Arsenic)',
          description: 'Total cumulative toxic heavy metal trace contaminants (ppm)',
          type: 'numeric',
          unitId: unitMap['ppm'] || null,
          min: 0.0,
          max: 10.0,
          target: 2.0,
          allowed: null,
          method: 'Inductively Coupled Plasma (ICP-MS)',
        },
        {
          id: 'param-pack-01',
          code: 'PARAM-PACK-INTEGRITY',
          name: 'Packaging Seal & Tamper Evidence',
          description: 'Hermetic bag seal, liner intactness, tamper evident tag, and barcode legibility',
          type: 'pass_fail',
          unitId: null,
          min: null,
          max: null,
          target: null,
          allowed: JSON.stringify(['Pass', 'Fail']),
          method: 'Pressure vacuum leak test & visual inspection',
        },
      ];

      for (const p of seedParameters) {
        await client.query(`
          INSERT INTO qc_parameters (
            id, organization_id, parameter_code, parameter_name, description,
            parameter_type, unit_id, minimum_value, maximum_value, target_value,
            allowed_values, test_method, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
          ON CONFLICT (organization_id, parameter_code) DO UPDATE SET
            parameter_name = EXCLUDED.parameter_name,
            description = EXCLUDED.description,
            minimum_value = EXCLUDED.minimum_value,
            maximum_value = EXCLUDED.maximum_value,
            target_value = EXCLUDED.target_value,
            allowed_values = EXCLUDED.allowed_values,
            test_method = EXCLUDED.test_method;
        `, [p.id, orgId, p.code, p.name, p.description, p.type, p.unitId, p.min, p.max, p.target, p.allowed, p.method]);
      }

      // Default Templates
      const seedTemplates = [
        {
          id: 'tpl-humic-01',
          code: 'QC-TPL-HUMIC-INCOMING',
          name: 'Potassium Humate & Bio-Stimulant Inward Protocol',
          description: 'Mandatory standard incoming QC specification for raw organic humic extracts and soil conditioners',
          category: 'incoming_material',
          version: 1,
          params: [
            { paramId: 'param-appear-01', seq: 1, mandatory: true },
            { paramId: 'param-ph-01', seq: 2, mandatory: true, min: 8.5, max: 10.5, target: 9.5 },
            { paramId: 'param-moist-01', seq: 3, mandatory: true, min: 0.0, max: 5.0, target: 3.0 },
            { paramId: 'param-solub-01', seq: 4, mandatory: true, min: 98.0, max: 100.0, target: 99.5 },
            { paramId: 'param-purity-01', seq: 5, mandatory: true, min: 95.0, max: 100.0, target: 98.0 },
            { paramId: 'param-heavy-01', seq: 6, mandatory: true, min: 0.0, max: 10.0, target: 1.5 },
            { paramId: 'param-pack-01', seq: 7, mandatory: true },
          ],
        },
        {
          id: 'tpl-liquid-01',
          code: 'QC-TPL-LIQUID-FORMULATION',
          name: 'Liquid Micronutrient & Foliar Solution Specification',
          description: 'Specification testing for liquid mineral fertilizers, foliar chelates, and amino formulations',
          category: 'finished_good',
          version: 1,
          params: [
            { paramId: 'param-appear-01', seq: 1, mandatory: true },
            { paramId: 'param-odor-01', seq: 2, mandatory: true },
            { paramId: 'param-ph-01', seq: 3, mandatory: true, min: 5.5, max: 7.5, target: 6.5 },
            { paramId: 'param-purity-01', seq: 4, mandatory: true, min: 98.0, max: 100.0, target: 99.5 },
            { paramId: 'param-pack-01', seq: 5, mandatory: true },
          ],
        },
        {
          id: 'tpl-pack-01',
          code: 'QC-TPL-PACKAGING-MATERIALS',
          name: 'Primary Container & Packaging QC Specification',
          description: 'Inward verification for HDPE drums, LDPE pouches, corrugated boxes, and holographic tamper seals',
          category: 'packaging',
          version: 1,
          params: [
            { paramId: 'param-appear-01', seq: 1, mandatory: true },
            { paramId: 'param-pack-01', seq: 2, mandatory: true },
          ],
        }
      ];

      for (const t of seedTemplates) {
        await client.query(`
          INSERT INTO qc_templates (
            id, organization_id, template_code, name, description, category, version, is_active, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'active')
          ON CONFLICT (organization_id, template_code, version) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category;
        `, [t.id, orgId, t.code, t.name, t.description, t.category, t.version]);

        // Insert Template Parameters
        for (const tp of t.params) {
          const tpId = `tp-${t.id}-${tp.paramId}`;
          await client.query(`
            INSERT INTO qc_template_parameters (
              id, template_id, parameter_id, sequence_order, is_mandatory,
              override_min, override_max, override_target
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (template_id, parameter_id) DO UPDATE SET
              sequence_order = EXCLUDED.sequence_order,
              is_mandatory = EXCLUDED.is_mandatory,
              override_min = EXCLUDED.override_min,
              override_max = EXCLUDED.override_max,
              override_target = EXCLUDED.override_target;
          `, [tpId, t.id, tp.paramId, tp.seq, tp.mandatory, tp.min || null, tp.max || null, tp.target || null]);
        }
      }

      // Link sample SKUs to QC templates
      await client.query(`
        UPDATE skus 
        SET requires_qc = TRUE, qc_template_id = 'tpl-humic-01'
        WHERE organization_id = $1 AND (sku LIKE '%HUM%' OR sku LIKE '%JY-%' OR sku LIKE '%RAW%');
      `, [orgId]);

      // Seed initial sample QC inspection for demonstration if table is empty
      const inspCount = await client.query(`SELECT count(*) FROM qc_inspections WHERE organization_id = $1`, [orgId]);
      if (parseInt(inspCount.rows[0].count, 10) === 0) {
        // Fetch a supplier, SKU, warehouse, and user
        const sampleSku = await client.query(`SELECT id, unit_id FROM skus WHERE organization_id = $1 LIMIT 1`, [orgId]);
        const sampleWh = await client.query(`SELECT id FROM warehouses WHERE organization_id = $1 LIMIT 1`, [orgId]);
        const sampleSup = await client.query(`SELECT id FROM suppliers WHERE organization_id = $1 LIMIT 1`, [orgId]);
        const sampleUser = await client.query(`SELECT id, email FROM users WHERE organization_id = $1 LIMIT 1`, [orgId]);

        if (sampleSku.rows.length > 0 && sampleWh.rows.length > 0) {
          const skuId = sampleSku.rows[0].id;
          const whId = sampleWh.rows[0].id;
          const supId = sampleSup.rows[0]?.id || null;
          const userId = sampleUser.rows[0]?.id || null;
          const userEmail = sampleUser.rows[0]?.email || 'admin@jyotsvan.enterprise';
          const unitId = sampleSku.rows[0].unit_id;

          const inspId = 'insp-seed-001';
          const inspNum = 'QC-2026-00001';

          await client.query(`
            INSERT INTO qc_inspections (
              id, organization_id, inspection_number, source_type, source_id,
              supplier_id, sku_id, warehouse_id, batch_number,
              received_quantity, sample_quantity, unit_id, template_id,
              template_version_snapshot, inspection_type, status, overall_result,
              assigned_to, assigned_to_email, inspected_by, inspected_by_email,
              started_at, completed_at, inventory_released, created_by, created_by_email
            ) VALUES (
              $1, $2, $3, 'goods_receipt', 'GRN-2026-00001',
              $4, $5, $6, 'BATCH-HUMIC-26A',
              500.000, 5.000, $7, 'tpl-humic-01',
              1, 'incoming', 'approved', 'pass',
              $8, $9, $8, $9,
              NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', TRUE, $8, $9
            );
          `, [inspId, orgId, inspNum, supId, skuId, whId, unitId, userId, userEmail]);

          // Seed test items
          const seedItems = [
            { id: 'item-01', code: 'PARAM-APPEAR', name: 'Visual Appearance & Color', type: 'selection', unit: null, val: null, sel: 'Pass', auto: 'pass', eval: 'pass', min: null, max: null, seq: 1 },
            { id: 'item-02', code: 'PARAM-PH', name: 'pH Value (at 25°C)', type: 'numeric', unit: 'pH', val: 9.4, sel: null, auto: 'pass', eval: 'pass', min: 8.5, max: 10.5, seq: 2 },
            { id: 'item-03', code: 'PARAM-MOISTURE', name: 'Moisture Content (%)', type: 'numeric', unit: '%', val: 3.2, sel: null, auto: 'pass', eval: 'pass', min: 0.0, max: 5.0, seq: 3 },
            { id: 'item-04', code: 'PARAM-SOLUBILITY', name: 'Aqueous Solubility (%)', type: 'numeric', unit: '%', val: 99.6, sel: null, auto: 'pass', eval: 'pass', min: 98.0, max: 100.0, seq: 4 },
            { id: 'item-05', code: 'PARAM-PURITY', name: 'Active Ingredient Purity / Assay', type: 'numeric', unit: '%', val: 98.2, sel: null, auto: 'pass', eval: 'pass', min: 95.0, max: 100.0, seq: 5 },
            { id: 'item-06', code: 'PARAM-HEAVY-METALS', name: 'Heavy Metals (Lead, Cadmium, Arsenic)', type: 'numeric', unit: 'ppm', val: 1.8, sel: null, auto: 'pass', eval: 'pass', min: 0.0, max: 10.0, seq: 6 },
            { id: 'item-07', code: 'PARAM-PACK-INTEGRITY', name: 'Packaging Seal & Tamper Evidence', type: 'pass_fail', unit: null, val: null, sel: 'Pass', auto: 'pass', eval: 'pass', min: null, max: null, seq: 7 },
          ];

          for (const item of seedItems) {
            await client.query(`
              INSERT INTO qc_inspection_items (
                id, inspection_id, parameter_code_snapshot, parameter_name_snapshot,
                parameter_type_snapshot, unit_code_snapshot, actual_value, selection_result,
                auto_evaluation, evaluated_result, minimum_value, maximum_value,
                sequence_order, tested_by, tested_by_email, tested_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW() - INTERVAL '1 hour');
            `, [
              item.id, inspId, item.code, item.name, item.type, item.unit,
              item.val, item.sel, item.auto, item.eval, item.min, item.max,
              item.seq, userId, userEmail
            ]);
          }

          // Seed decision
          await client.query(`
            INSERT INTO qc_decisions (
              id, organization_id, inspection_id, decision, decision_reason,
              comments, accepted_quantity, rejected_quantity, quarantine_quantity,
              decided_by, decided_by_email, decision_date, inventory_action_status
            ) VALUES (
              'dec-seed-001', $1, $2, 'approved', 'All 7 mandatory parameters within standard specification limits.',
              'Released to active perpetual warehouse inventory for distribution.',
              500.000, 0.000, 0.000, $3, $4, NOW() - INTERVAL '30 minutes', 'completed'
            );
          `, [orgId, inspId, userId, userEmail]);
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Migration] Phase 11 — Quality Control (QC) Schema & Seed Applied Successfully.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Migration Error] Phase 11 Quality Control failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
