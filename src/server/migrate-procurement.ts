import { pool } from './db.ts';

export async function migrateProcurement() {
  console.log('[Migration] Starting Phase 10 — Procurement Module Schema Migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Purchase Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        request_number VARCHAR(64) NOT NULL,
        requested_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        requested_by_email VARCHAR(255) NOT NULL,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
        required_by_date TIMESTAMPTZ NOT NULL,
        priority VARCHAR(32) NOT NULL DEFAULT 'normal',
        purpose TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        total_estimated_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        approved_by VARCHAR(64),
        approved_by_email VARCHAR(255),
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        rejected_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_pr_num UNIQUE (organization_id, request_number)
      );
    `);

    // 2. Purchase Request Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_request_items (
        id VARCHAR(64) PRIMARY KEY,
        purchase_request_id VARCHAR(64) NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        required_by_date TIMESTAMPTZ,
        estimated_unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        estimated_line_total NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        converted_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000 CHECK (converted_quantity >= 0),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Purchase Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        po_number VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        purchase_request_id VARCHAR(64) REFERENCES purchase_requests(id) ON DELETE SET NULL,
        order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expected_delivery_date TIMESTAMPTZ NOT NULL,
        currency VARCHAR(16) NOT NULL DEFAULT 'INR',
        payment_terms VARCHAR(128) NOT NULL DEFAULT 'net_30',
        shipping_address TEXT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        subtotal NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        shipping_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        notes TEXT,
        terms_and_conditions TEXT,
        revision_number INTEGER NOT NULL DEFAULT 1,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255) NOT NULL,
        approved_by VARCHAR(64),
        approved_by_email VARCHAR(255),
        approved_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        acknowledged_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_po_num UNIQUE (organization_id, po_number)
      );
    `);

    // 4. Purchase Order Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id VARCHAR(64) PRIMARY KEY,
        purchase_order_id VARCHAR(64) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        supplier_sku_id VARCHAR(64) REFERENCES supplier_skus(id) ON DELETE SET NULL,
        description TEXT,
        quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
        discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        line_total NUMERIC(15,2) NOT NULL,
        expected_delivery_date TIMESTAMPTZ,
        received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000 CHECK (received_quantity >= 0),
        cancelled_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000 CHECK (cancelled_quantity >= 0),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Goods Receipt Notes (GRN) Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        grn_number VARCHAR(64) NOT NULL,
        purchase_order_id VARCHAR(64) NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
        supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        receiving_location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        received_by VARCHAR(64),
        received_by_email VARCHAR(255) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        supplier_reference VARCHAR(128),
        delivery_challan_number VARCHAR(128),
        vehicle_number VARCHAR(64),
        driver_name VARCHAR(128),
        driver_phone VARCHAR(64),
        qc_status VARCHAR(32) NOT NULL DEFAULT 'not_required',
        inventory_posted BOOLEAN NOT NULL DEFAULT FALSE,
        inventory_posted_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_org_grn_num UNIQUE (organization_id, grn_number)
      );
    `);

    // 6. Goods Receipt Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS goods_receipt_items (
        id VARCHAR(64) PRIMARY KEY,
        grn_id VARCHAR(64) NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        purchase_order_item_id VARCHAR(64) NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        ordered_quantity NUMERIC(14,3) NOT NULL,
        received_quantity NUMERIC(14,3) NOT NULL CHECK (received_quantity > 0),
        accepted_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000,
        rejected_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000,
        quarantine_quantity NUMERIC(14,3) NOT NULL DEFAULT 0.000,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        manufacturing_date DATE,
        expiry_date DATE,
        requires_qc BOOLEAN NOT NULL DEFAULT FALSE,
        qc_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Procurement Documents Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS procurement_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        entity_type VARCHAR(32) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(64) NOT NULL,
        file_url TEXT NOT NULL,
        file_size_bytes INTEGER,
        uploaded_by VARCHAR(64),
        uploaded_by_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 8. Performance Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pr_org_status ON purchase_requests(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_pr_req_by ON purchase_requests(requested_by);
      CREATE INDEX IF NOT EXISTS idx_pri_pr_id ON purchase_request_items(purchase_request_id);
      CREATE INDEX IF NOT EXISTS idx_pri_sku_id ON purchase_request_items(sku_id);
      
      CREATE INDEX IF NOT EXISTS idx_po_org_status ON purchase_orders(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_po_warehouse_id ON purchase_orders(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_po_req_id ON purchase_orders(purchase_request_id);
      CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_poi_sku_id ON purchase_order_items(sku_id);

      CREATE INDEX IF NOT EXISTS idx_grn_org_status ON goods_receipts(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_grn_po_id ON goods_receipts(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_grn_supplier_id ON goods_receipts(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_grn_warehouse_id ON goods_receipts(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_grni_grn_id ON goods_receipt_items(grn_id);
      CREATE INDEX IF NOT EXISTS idx_grni_sku_id ON goods_receipt_items(sku_id);

      CREATE INDEX IF NOT EXISTS idx_pdoc_org_entity ON procurement_documents(organization_id, entity_type, entity_id);
    `);

    // 9. Register RBAC Granular Permissions
    const procurementPermissions = [
      { code: 'procurement.view', name: 'View Procurement Hub', description: 'Access procurement dashboard, telemetry and reports', module: 'procurement' },
      { code: 'procurement.create', name: 'Create Procurement Records', description: 'Initiate requisitions, POs, and GRNs', module: 'procurement' },
      { code: 'procurement.edit', name: 'Edit Procurement Records', description: 'Modify draft requisitions and PO drafts', module: 'procurement' },
      { code: 'procurement.export', name: 'Export Procurement Data', description: 'Export purchase orders, GRN summaries and reports', module: 'procurement' },
      { code: 'purchase_requests.view', name: 'View Purchase Requests', description: 'View internal material purchase requests', module: 'procurement' },
      { code: 'purchase_requests.create', name: 'Create Purchase Requests', description: 'Draft and create purchase requisitions', module: 'procurement' },
      { code: 'purchase_requests.edit', name: 'Edit Purchase Requests', description: 'Update draft purchase requests', module: 'procurement' },
      { code: 'purchase_requests.submit', name: 'Submit Purchase Requests', description: 'Submit purchase requests for review & approval', module: 'procurement' },
      { code: 'purchase_requests.approve', name: 'Approve Purchase Requests', description: 'Approve internal purchase requests', module: 'procurement' },
      { code: 'purchase_requests.reject', name: 'Reject Purchase Requests', description: 'Reject purchase requests with reason', module: 'procurement' },
      { code: 'purchase_requests.cancel', name: 'Cancel Purchase Requests', description: 'Cancel open purchase requests', module: 'procurement' },
      { code: 'purchase_orders.view', name: 'View Purchase Orders', description: 'View vendor purchase orders and item lines', module: 'procurement' },
      { code: 'purchase_orders.create', name: 'Create Purchase Orders', description: 'Create and draft purchase orders', module: 'procurement' },
      { code: 'purchase_orders.edit', name: 'Edit Purchase Orders', description: 'Modify draft purchase orders', module: 'procurement' },
      { code: 'purchase_orders.approve', name: 'Approve Purchase Orders', description: 'Authorize and approve commercial purchase orders', module: 'procurement' },
      { code: 'purchase_orders.send', name: 'Send Purchase Orders', description: 'Dispatch approved PO to vendor', module: 'procurement' },
      { code: 'purchase_orders.cancel', name: 'Cancel Purchase Orders', description: 'Cancel pending or unfulfilled POs', module: 'procurement' },
      { code: 'purchase_orders.close', name: 'Close Purchase Orders', description: 'Formally close completed purchase orders', module: 'procurement' },
      { code: 'goods_receipts.view', name: 'View Goods Receipts (GRN)', description: 'View inward Goods Receipt Notes', module: 'procurement' },
      { code: 'goods_receipts.create', name: 'Create Goods Receipts (GRN)', description: 'Create draft GRN against purchase orders', module: 'procurement' },
      { code: 'goods_receipts.confirm', name: 'Confirm Goods Receipts', description: 'Confirm GRN, post inventory and handoff to QC', module: 'procurement' },
      { code: 'goods_receipts.cancel', name: 'Cancel Goods Receipts', description: 'Cancel draft goods receipt notes', module: 'procurement' },
      { code: 'procurement_documents.view', name: 'View Procurement Documents', description: 'View attached PO PDFs, quotations and challans', module: 'procurement' },
      { code: 'procurement_documents.create', name: 'Upload Procurement Documents', description: 'Upload quotations and delivery documents', module: 'procurement' },
      { code: 'procurement_documents.delete', name: 'Delete Procurement Documents', description: 'Delete attached procurement documents', module: 'procurement' }
    ];

    for (const perm of procurementPermissions) {
      await client.query(`
        INSERT INTO permissions (id, code, module, description, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (code) DO UPDATE SET 
          description = EXCLUDED.description,
          module = EXCLUDED.module
      `, ['perm-' + perm.code.replace(/\./g, '-'), perm.code, perm.module, perm.description]);
    }

    // Assign all procurement permissions to Super Admin, Management, Purchase Manager, Warehouse Manager roles
    const adminRoles = await client.query(`
      SELECT id FROM roles WHERE slug IN ('super_admin', 'management', 'purchase_manager', 'warehouse_manager', 'production_manager')
    `);

    const allPerms = await client.query(`
      SELECT id, code FROM permissions WHERE module = 'procurement'
    `);

    for (const role of adminRoles.rows) {
      for (const perm of allPerms.rows) {
        const rpId = 'rp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
        await client.query(`
          INSERT INTO role_permissions (id, role_id, permission_id, created_at)
          SELECT $1::varchar, $2::varchar, $3::varchar, NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM role_permissions WHERE role_id = $2::varchar AND permission_id = $3::varchar
          )
        `, [rpId, role.id, perm.id]);
      }
    }

    // 10. Seed Demo Procurement Data if table is empty
    const countRes = await client.query(`SELECT COUNT(*) as count FROM purchase_requests`);
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log('[Migration] Seeding realistic demo Procurement records...');
      
      const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
      const orgId = orgRes.rows[0]?.id || 'org-jyotsvan-corp';
      
      const userRes = await client.query(`SELECT id, email FROM users WHERE organization_id = $1 LIMIT 1`, [orgId]);
      const userId = userRes.rows[0]?.id || 'usr-owner-sunil';
      const userEmail = userRes.rows[0]?.email || 'sunilpanigrahy29401@gmail.com';

      const skuRes = await client.query(`SELECT s.id, s.sku, s.unit_id, p.name as product_name FROM skus s JOIN products p ON s.product_id = p.id WHERE s.organization_id = $1 LIMIT 4`, [orgId]);
      const skus = skuRes.rows;

      const supRes = await client.query(`SELECT id, supplier_name as name, supplier_code FROM suppliers WHERE organization_id = $1 LIMIT 2`, [orgId]);
      const suppliers = supRes.rows;

      const whRes = await client.query(`SELECT id, name, code FROM warehouses WHERE organization_id = $1 LIMIT 2`, [orgId]);
      const warehouses = whRes.rows;

      const deptRes = await client.query(`SELECT id FROM departments WHERE organization_id = $1 LIMIT 1`, [orgId]);
      const deptId = deptRes.rows[0]?.id || null;

      if (skus.length > 0 && suppliers.length > 0 && warehouses.length > 0) {
        const sku1 = skus[0];
        const sku2 = skus[1] || skus[0];
        const sup1 = suppliers[0];
        const sup2 = suppliers[1] || suppliers[0];
        const wh1 = warehouses[0];

        // Seed PR 1 (Approved & Partially Converted)
        const pr1Id = 'pr-demo-01';
        await client.query(`
          INSERT INTO purchase_requests (
            id, organization_id, request_number, requested_by, requested_by_email,
            department_id, required_by_date, priority, purpose, status,
            total_estimated_amount, approved_by, approved_by_email, approved_at, notes, created_at, updated_at
          ) VALUES (
            $1, $2, 'PR-2026-0001', $3, $4,
            $5, NOW() + INTERVAL '10 days', 'high', 'Q4 Raw Materials & Packaging Restock for Active Production Run', 'partially_converted',
            85000.00, $3, $4, NOW() - INTERVAL '3 days', 'Urgent batch formulation procurement for export order schedule.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'
          )
        `, [pr1Id, orgId, userId, userEmail, deptId]);

        // PR 1 Items
        await client.query(`
          INSERT INTO purchase_request_items (
            id, purchase_request_id, sku_id, quantity, unit_id,
            required_by_date, estimated_unit_cost, estimated_line_total, converted_quantity, notes, created_at, updated_at
          ) VALUES 
          ('pri-demo-01', $1, $2, 1000.000, $3, NOW() + INTERVAL '10 days', 50.00, 50000.00, 600.000, 'Priority delivery', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
          ('pri-demo-02', $1, $4, 700.000, $5, NOW() + INTERVAL '10 days', 50.00, 35000.00, 0.000, 'Remaining to be converted', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days')
        `, [pr1Id, sku1.id, sku1.unit_id, sku2.id, sku2.unit_id]);

        // Seed PR 2 (Submitted / Pending Approval)
        const pr2Id = 'pr-demo-02';
        await client.query(`
          INSERT INTO purchase_requests (
            id, organization_id, request_number, requested_by, requested_by_email,
            department_id, required_by_date, priority, purpose, status,
            total_estimated_amount, notes, created_at, updated_at
          ) VALUES (
            $1, $2, 'PR-2026-0002', $3, $4,
            $5, NOW() + INTERVAL '14 days', 'normal', 'Auxiliary consumables & standard safety inventory', 'submitted',
            42000.00, 'Awaiting department head authorization.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
          )
        `, [pr2Id, orgId, userId, userEmail, deptId]);

        await client.query(`
          INSERT INTO purchase_request_items (
            id, purchase_request_id, sku_id, quantity, unit_id,
            required_by_date, estimated_unit_cost, estimated_line_total, converted_quantity, created_at, updated_at
          ) VALUES 
          ('pri-demo-03', $1, $2, 600.000, $3, NOW() + INTERVAL '14 days', 70.00, 42000.00, 0.000, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
        `, [pr2Id, sku2.id, sku2.unit_id]);

        // Seed PO 1 (Partially Received from PR 1)
        const po1Id = 'po-demo-01';
        await client.query(`
          INSERT INTO purchase_orders (
            id, organization_id, po_number, supplier_id, purchase_request_id,
            order_date, expected_delivery_date, currency, payment_terms, shipping_address,
            warehouse_id, status, subtotal, tax_amount, discount_amount, shipping_amount, total_amount,
            notes, terms_and_conditions, revision_number, created_by, created_by_email,
            approved_by, approved_by_email, approved_at, sent_at, acknowledged_at, created_at, updated_at
          ) VALUES (
            $1, $2, 'PO-2026-000001', $3, $4,
            NOW() - INTERVAL '3 days', NOW() + INTERVAL '5 days', 'INR', 'net_30', 'Central Hub Inward Gate 1, Navi Mumbai Logistics Park',
            $5, 'partially_received', 30000.00, 5400.00, 0.00, 500.00, 35900.00,
            'Rate card locked as per Annual Supply Framework Agreement.', 'Delivery within agreed SLA; standard inspection on receipt.', 1, $6, $7,
            $6, $7, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
          )
        `, [po1Id, orgId, sup1.id, pr1Id, wh1.id, userId, userEmail]);

        // PO 1 Item (Ordered 600, Received 400, Remaining 200)
        const poi1Id = 'poi-demo-01';
        await client.query(`
          INSERT INTO purchase_order_items (
            id, purchase_order_id, sku_id, description, quantity, unit_id,
            unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total,
            expected_delivery_date, received_quantity, cancelled_quantity, notes, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, 600.000, $5,
            50.00, 0.00, 0.00, 18.00, 5400.00, 35400.00,
            NOW() + INTERVAL '5 days', 400.000, 0.000, 'Batch 1 partial receipt completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
          )
        `, [poi1Id, po1Id, sku1.id, `${sku1.product_name || 'Item'} - Canonical SKU`, sku1.unit_id]);

        // Seed PO 2 (Approved & Sent / Awaiting Receipt)
        const po2Id = 'po-demo-02';
        await client.query(`
          INSERT INTO purchase_orders (
            id, organization_id, po_number, supplier_id,
            order_date, expected_delivery_date, currency, payment_terms, shipping_address,
            warehouse_id, status, subtotal, tax_amount, discount_amount, shipping_amount, total_amount,
            notes, terms_and_conditions, revision_number, created_by, created_by_email,
            approved_by, approved_by_email, approved_at, sent_at, acknowledged_at, created_at, updated_at
          ) VALUES (
            $1, $2, 'PO-2026-000002', $3,
            NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', 'INR', 'net_15', 'Central Hub Inward Gate 1, Navi Mumbai Logistics Park',
            $4, 'sent', 45000.00, 8100.00, 1000.00, 0.00, 52100.00,
            'Standard commercial procurement order.', 'Standard Jyotsvan Quality & Inward Guidelines apply.', 1, $5, $6,
            $5, $6, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
          )
        `, [po2Id, orgId, sup2.id, wh1.id, userId, userEmail]);

        await client.query(`
          INSERT INTO purchase_order_items (
            id, purchase_order_id, sku_id, description, quantity, unit_id,
            unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total,
            expected_delivery_date, received_quantity, cancelled_quantity, created_at, updated_at
          ) VALUES (
            'poi-demo-02', $1, $2, $3, 500.000, $4,
            90.00, 2.22, 1000.00, 18.00, 8100.00, 52100.00,
            NOW() + INTERVAL '7 days', 0.000, 0.000, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
          )
        `, [po2Id, sku2.id, `${sku2.product_name || 'Item'} - Canonical SKU`, sku2.unit_id]);

        // Seed GRN 1 (First Partial Receipt of PO 1 — 400 units)
        const grn1Id = 'grn-demo-01';
        await client.query(`
          INSERT INTO goods_receipts (
            id, organization_id, grn_number, purchase_order_id, supplier_id,
            warehouse_id, received_date, received_by, received_by_email, status,
            supplier_reference, delivery_challan_number, vehicle_number, driver_name, driver_phone,
            qc_status, inventory_posted, inventory_posted_at, notes, created_at, updated_at
          ) VALUES (
            $1, $2, 'GRN-2026-000001', $3, $4,
            $5, NOW() - INTERVAL '1 day', $6, $7, 'qc_approved',
            'INV/2026/9041', 'DC-88120', 'MH-04-AZ-8921', 'Ramesh Kumar', '+91 98201 12345',
            'qc_approved', TRUE, NOW() - INTERVAL '1 day', 'First consignment received in pristine condition. Gate verification passed.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
          )
        `, [grn1Id, orgId, po1Id, sup1.id, wh1.id, userId, userEmail]);

        await client.query(`
          INSERT INTO goods_receipt_items (
            id, grn_id, purchase_order_item_id, sku_id, ordered_quantity, received_quantity,
            accepted_quantity, rejected_quantity, quarantine_quantity, unit_id,
            batch_number, manufacturing_date, expiry_date, requires_qc, qc_status, notes, created_at
          ) VALUES (
            'grni-demo-01', $1, $2, $3, 600.000, 400.000,
            400.000, 0.000, 0.000, $4,
            'BAT-2026-09A', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '365 days', TRUE, 'passed', 'QC testing passed standard inspection parameters', NOW() - INTERVAL '1 day'
          )
        `, [grn1Id, poi1Id, sku1.id, sku1.unit_id]);
      }
    }

    await client.query('COMMIT;');
    console.log('[Migration] Phase 10 — Procurement Module Schema Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Migration Error] Phase 10 Procurement Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
