import { pool } from './db.ts';

export async function runCFMigration() {
  console.log('[Phase 15 Migration] Initializing C&F (Carrying & Forwarding) Management Engine schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. C&F Master Table (`cfs`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cfs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        cf_code VARCHAR(64) NOT NULL,
        legal_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        cf_type VARCHAR(64) NOT NULL DEFAULT 'third_party',
        status VARCHAR(64) NOT NULL DEFAULT 'active',
        contact_person VARCHAR(128) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        alternate_phone VARCHAR(64),
        email VARCHAR(255) NOT NULL,
        gstin VARCHAR(32),
        pan VARCHAR(32),
        address TEXT NOT NULL,
        city VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        pincode VARCHAR(32) NOT NULL,
        country VARCHAR(128) NOT NULL DEFAULT 'India',
        territory VARCHAR(128) NOT NULL,
        region VARCHAR(128) NOT NULL,
        appointed_date TIMESTAMPTZ,
        agreement_start_date TIMESTAMPTZ,
        agreement_end_date TIMESTAMPTZ,
        security_deposit_amount NUMERIC(16,2) DEFAULT 0,
        commission_rate NUMERIC(5,2) DEFAULT 0,
        credit_limit NUMERIC(16,2) DEFAULT 0,
        financial_metadata JSONB,
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        updated_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_cf_code UNIQUE (organization_id, cf_code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cfs_org_status ON cfs(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_cfs_org_code ON cfs(organization_id, cf_code);
      CREATE INDEX IF NOT EXISTS idx_cfs_region_state ON cfs(region, state);
      CREATE INDEX IF NOT EXISTS idx_cfs_created ON cfs(created_at DESC);
    `);

    // 2. C&F Contacts Table (`cf_contacts`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_contacts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(128) NOT NULL DEFAULT 'Operations Contact',
        phone VARCHAR(64) NOT NULL,
        email VARCHAR(255),
        preferred_contact_method VARCHAR(32) DEFAULT 'phone',
        is_primary BOOLEAN DEFAULT FALSE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_contacts_cf ON cf_contacts(cf_id);
      CREATE INDEX IF NOT EXISTS idx_cf_contacts_org ON cf_contacts(organization_id);
    `);

    // 3. C&F Addresses Table (`cf_addresses`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_addresses (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE CASCADE,
        address_type VARCHAR(64) NOT NULL DEFAULT 'warehouse',
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        postal_code VARCHAR(32) NOT NULL,
        country VARCHAR(128) DEFAULT 'India' NOT NULL,
        gstin VARCHAR(32),
        is_primary BOOLEAN DEFAULT FALSE NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_addresses_cf ON cf_addresses(cf_id);
    `);

    // 4. C&F ↔ Warehouse Relationship (`cf_warehouses`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_warehouses (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE CASCADE,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        is_primary_depot BOOLEAN DEFAULT TRUE NOT NULL,
        custody_agreement_ref VARCHAR(128),
        assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        assigned_by VARCHAR(64),
        notes TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        CONSTRAINT uk_cf_warehouse UNIQUE (cf_id, warehouse_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_warehouses_cf ON cf_warehouses(cf_id);
      CREATE INDEX IF NOT EXISTS idx_cf_warehouses_wh ON cf_warehouses(warehouse_id);
    `);

    // 5. C&F Territories Assignment (`cf_territories`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_territories (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE CASCADE,
        state VARCHAR(128) NOT NULL,
        region VARCHAR(128) NOT NULL,
        district VARCHAR(128),
        territory_name VARCHAR(128) NOT NULL,
        pincodes JSONB DEFAULT '[]'::jsonb,
        is_exclusive BOOLEAN DEFAULT TRUE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_territories_cf ON cf_territories(cf_id);
      CREATE INDEX IF NOT EXISTS idx_cf_territories_region ON cf_territories(region, state);
    `);

    // 6. C&F Documents Table (`cf_documents`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE CASCADE,
        document_type VARCHAR(64) NOT NULL DEFAULT 'agreement',
        title VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER DEFAULT 0,
        mime_type VARCHAR(128),
        expiry_date TIMESTAMPTZ,
        uploaded_by VARCHAR(64),
        uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_documents_cf ON cf_documents(cf_id);
    `);

    // 7. C&F Stock Transfers Table (`cf_transfers`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_transfers (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        transfer_number VARCHAR(64) NOT NULL,
        source_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE RESTRICT,
        destination_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        transfer_type VARCHAR(64) NOT NULL DEFAULT 'primary_allocation',
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        shipping_carrier VARCHAR(128),
        tracking_number VARCHAR(128),
        vehicle_number VARCHAR(64),
        driver_name VARCHAR(128),
        driver_phone VARCHAR(64),
        eway_bill_number VARCHAR(64),
        expected_delivery_date TIMESTAMPTZ,
        requested_by VARCHAR(64),
        requested_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_by_email VARCHAR(255),
        dispatched_by VARCHAR(64),
        dispatched_by_email VARCHAR(255),
        received_by VARCHAR(64),
        received_by_email VARCHAR(255),
        cancelled_by VARCHAR(64),
        cancelled_by_email VARCHAR(255),
        requested_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        dispatched_at TIMESTAMPTZ,
        received_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_cf_transfer_num UNIQUE (organization_id, transfer_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_transfers_org_status ON cf_transfers(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_cf_transfers_cf ON cf_transfers(cf_id);
      CREATE INDEX IF NOT EXISTS idx_cf_transfers_src_wh ON cf_transfers(source_warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_cf_transfers_dst_wh ON cf_transfers(destination_warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_cf_transfers_created ON cf_transfers(created_at DESC);
    `);

    // 8. C&F Transfer Items Table (`cf_transfer_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_transfer_items (
        id VARCHAR(64) PRIMARY KEY,
        transfer_id VARCHAR(64) NOT NULL REFERENCES cf_transfers(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        requested_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        dispatched_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        received_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        shortage_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        damaged_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        rejected_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        unit_cost NUMERIC(16,4) DEFAULT 0,
        notes TEXT,
        status VARCHAR(64) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_trf_items_trf ON cf_transfer_items(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_cf_trf_items_sku ON cf_transfer_items(sku_id);
      CREATE INDEX IF NOT EXISTS idx_cf_trf_items_batch ON cf_transfer_items(batch_id);
    `);

    // 9. C&F Transfer Discrepancies Table (`cf_transfer_discrepancies`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_transfer_discrepancies (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        transfer_id VARCHAR(64) NOT NULL REFERENCES cf_transfers(id) ON DELETE CASCADE,
        item_id VARCHAR(64) NOT NULL REFERENCES cf_transfer_items(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        discrepancy_type VARCHAR(64) NOT NULL DEFAULT 'shortage',
        quantity NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4) DEFAULT 0,
        reported_by VARCHAR(64),
        reported_by_email VARCHAR(255),
        reported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        resolution_status VARCHAR(64) NOT NULL DEFAULT 'pending',
        resolution_notes TEXT,
        resolved_by VARCHAR(64),
        resolved_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_discrep_org ON cf_transfer_discrepancies(organization_id);
      CREATE INDEX IF NOT EXISTS idx_cf_discrep_trf ON cf_transfer_discrepancies(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_cf_discrep_status ON cf_transfer_discrepancies(resolution_status);
    `);

    // 10. C&F Dispatches Table (`cf_dispatches`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_dispatches (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        dispatch_number VARCHAR(64) NOT NULL,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        destination_type VARCHAR(64) NOT NULL DEFAULT 'distributor',
        destination_name VARCHAR(255) NOT NULL,
        destination_reference VARCHAR(128),
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        shipping_carrier VARCHAR(128),
        tracking_number VARCHAR(128),
        vehicle_number VARCHAR(64),
        driver_name VARCHAR(128),
        driver_phone VARCHAR(64),
        eway_bill_number VARCHAR(64),
        dispatch_date TIMESTAMPTZ,
        requested_by VARCHAR(64),
        requested_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_by_email VARCHAR(255),
        dispatched_by VARCHAR(64),
        dispatched_by_email VARCHAR(255),
        requested_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        dispatched_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_cf_dispatch_num UNIQUE (organization_id, dispatch_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_disp_org_status ON cf_dispatches(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_cf_disp_cf ON cf_dispatches(cf_id);
      CREATE INDEX IF NOT EXISTS idx_cf_disp_wh ON cf_dispatches(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_cf_disp_created ON cf_dispatches(created_at DESC);
    `);

    // 11. C&F Dispatch Items Table (`cf_dispatch_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cf_dispatch_items (
        id VARCHAR(64) PRIMARY KEY,
        dispatch_id VARCHAR(64) NOT NULL REFERENCES cf_dispatches(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        requested_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        picked_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        dispatched_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        unit_cost NUMERIC(16,4) DEFAULT 0,
        notes TEXT,
        status VARCHAR(64) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_disp_items_disp ON cf_dispatch_items(dispatch_id);
      CREATE INDEX IF NOT EXISTS idx_cf_disp_items_sku ON cf_dispatch_items(sku_id);
      CREATE INDEX IF NOT EXISTS idx_cf_disp_items_batch ON cf_dispatch_items(batch_id);
    `);

    // 12. Register Phase 15 RBAC Permissions
    const cfPermissions = [
      { id: 'perm-cf-01', code: 'cfs.view', module: 'distribution', description: 'View C&F master registry, agency directory, and depot profiles' },
      { id: 'perm-cf-02', code: 'cfs.create', module: 'distribution', description: 'Onboard and register new Carrying & Forwarding agencies' },
      { id: 'perm-cf-03', code: 'cfs.edit', module: 'distribution', description: 'Modify C&F profile, contacts, addresses, and territory mapping' },
      { id: 'perm-cf-04', code: 'cfs.activate', module: 'distribution', description: 'Authorize and activate C&F agency contracts' },
      { id: 'perm-cf-05', code: 'cfs.suspend', module: 'distribution', description: 'Suspend C&F agency operations and freeze dispatches' },
      { id: 'perm-cf-06', code: 'cfs.terminate', module: 'distribution', description: 'Terminate C&F agency agreements' },
      { id: 'perm-cf-07', code: 'cfs.export', module: 'distribution', description: 'Export C&F directory, inventory valuation, and stock registers' },
      { id: 'perm-cf-08', code: 'cfs.inventory.view', module: 'distribution', description: 'View C&F depot inventory balances and batch lots' },
      { id: 'perm-cf-09', code: 'cfs.transfer.create', module: 'distribution', description: 'Initiate primary plant-to-C&F stock transfers' },
      { id: 'perm-cf-10', code: 'cfs.transfer.approve', module: 'distribution', description: 'Authorize stock transfer orders to C&F depots' },
      { id: 'perm-cf-11', code: 'cfs.transfer.dispatch', module: 'distribution', description: 'Execute transfer dispatch and gate-out from plant' },
      { id: 'perm-cf-12', code: 'cfs.transfer.receive', module: 'distribution', description: 'Process C&F inward receiving, variance logging, and GRN' },
      { id: 'perm-cf-13', code: 'cfs.dispatch.create', module: 'distribution', description: 'Create C&F outbound dispatch orders' },
      { id: 'perm-cf-14', code: 'cfs.dispatch.approve', module: 'distribution', description: 'Approve C&F outbound dispatches' },
      { id: 'perm-cf-15', code: 'cfs.dispatch.execute', module: 'distribution', description: 'Execute C&F outbound dispatch and decrement stock' },
    ];

    for (const perm of cfPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module`,
        [perm.id, perm.code, perm.module, perm.description]
      );
    }

    // Map permissions to system roles
    await client.query(`
      INSERT INTO role_permissions (id, role_id, permission_id, created_at)
      SELECT 'rp-' || r.id || '-' || p.id, r.id, p.id, NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.id IN ('role-super-admin', 'role-management', 'role-operations-manager', 'role-warehouse-manager')
        AND p.module = 'cf'
      ON CONFLICT (id) DO NOTHING;
    `);

    // 13. Seed Core Enterprise C&F Agencies across Key Indian Logistics Corridors
    const orgId = 'org-jyotsvan-corp';
    const cfCountRes = await client.query('SELECT count(*) FROM cfs WHERE organization_id = $1', [orgId]);
    const existingCFCount = parseInt(cfCountRes.rows[0]?.count || '0', 10);

    if (existingCFCount === 0) {
      console.log('[Phase 15 Migration] Seeding initial C&F master entities, warehouses, transfers, and dispatches...');

      // A. C&F Agencies
      const seedCFs = [
        {
          id: 'cf-mumbai-01',
          code: 'CF-MAH-01',
          legalName: 'Western Express Forwarders & Logistics Pvt Ltd',
          displayName: 'Western India C&F Hub (Bhiwandi)',
          cfType: 'regional',
          status: 'active',
          contactPerson: 'Rajesh Nair',
          phone: '+91 98201 44552',
          email: 'rajesh.nair@westernexpresslogistics.in',
          gstin: '27AAACW5567R1Z4',
          pan: 'AAACW5567R',
          address: 'Plot 42-45, Mankoli Logistics Park, Bhiwandi-Kalyan Road',
          city: 'Thane / Bhiwandi',
          state: 'Maharashtra',
          pincode: '421302',
          territory: 'Western Zone (MH, GA, MP-South)',
          region: 'West',
          securityDeposit: 2500000,
          commissionRate: 3.5,
          creditLimit: 5000000,
        },
        {
          id: 'cf-delhi-01',
          code: 'CF-NCR-01',
          legalName: 'North Star Supply Chain & Depots Ltd',
          displayName: 'North India Super C&F (Gurugram/NCR)',
          cfType: 'super_cf',
          status: 'active',
          contactPerson: 'Virender Sharma',
          phone: '+91 98110 33221',
          email: 'virender.sharma@northstarsupply.com',
          gstin: '07AABCN8890K1ZP',
          pan: 'AABCN8890K',
          address: 'Warehouse Complex 12, Pataudi Road Industrial Hub',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122503',
          territory: 'Northern Zone (NCR, PB, HR, RJ, UP-West)',
          region: 'North',
          securityDeposit: 3500000,
          commissionRate: 3.0,
          creditLimit: 7500000,
        },
        {
          id: 'cf-bengaluru-01',
          code: 'CF-KTK-01',
          legalName: 'Deccan Freight & Forwarding Services LLP',
          displayName: 'South India C&F Hub (Nelamangala)',
          cfType: 'regional',
          status: 'active',
          contactPerson: 'Anand Murthy',
          phone: '+91 99450 77889',
          email: 'anand.murthy@deccanfreight.in',
          gstin: '29AAGCD1234M1Z2',
          pan: 'AAGCD1234M',
          address: 'Survey No. 88/2, Sondekoppa Road, Nelamangala Logistics Corridor',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '562123',
          territory: 'Southern Zone (KA, TN, KL, AP, TS)',
          region: 'South',
          securityDeposit: 2000000,
          commissionRate: 3.8,
          creditLimit: 4000000,
        },
        {
          id: 'cf-odisha-01',
          code: 'CF-ODI-01',
          legalName: 'Kalinga Carrying & Forwarding Agency',
          displayName: 'Eastern India C&F Depot (Bhubaneswar/Cuttack)',
          cfType: 'state',
          status: 'active',
          contactPerson: 'Subhashish Mohanty',
          phone: '+91 94370 88214',
          email: 'subhashish@kalingacfa.co.in',
          gstin: '21AALCK9087N1ZK',
          pan: 'AALCK9087N',
          address: 'NH-16 Logistics Park, Khurda Industrial Estate',
          city: 'Bhubaneswar / Khurda',
          state: 'Odisha',
          pincode: '752057',
          territory: 'Eastern Zone (OD, WB, JH, CG)',
          region: 'East',
          securityDeposit: 1500000,
          commissionRate: 4.2,
          creditLimit: 3000000,
        },
      ];

      for (const cf of seedCFs) {
        await client.query(`
          INSERT INTO cfs (
            id, organization_id, cf_code, legal_name, display_name, cf_type, status,
            contact_person, phone, email, gstin, pan, address, city, state, pincode,
            country, territory, region, appointed_date, agreement_start_date, agreement_end_date,
            security_deposit_amount, commission_rate, credit_limit, notes, created_by, created_by_email
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14, $15, $16,
            'India', $17, $18, NOW() - INTERVAL '180 days', NOW() - INTERVAL '180 days', NOW() + INTERVAL '185 days',
            $19, $20, $21, 'Primary approved C&F agency with active custody indemnity agreement.', 'usr-super-admin', 'admin@jyotsvan.enterprise'
          ) ON CONFLICT (organization_id, cf_code) DO NOTHING;
        `, [
          cf.id, orgId, cf.code, cf.legalName, cf.displayName, cf.cfType, cf.status,
          cf.contactPerson, cf.phone, cf.email, cf.gstin, cf.pan, cf.address, cf.city, cf.state, cf.pincode,
          cf.territory, cf.region, cf.securityDeposit, cf.commissionRate, cf.creditLimit
        ]);

        // Seed Contacts
        await client.query(`
          INSERT INTO cf_contacts (id, organization_id, cf_id, name, designation, phone, email, is_primary, status)
          VALUES 
            ($1, $2, $3, $4, 'Managing Director & Key Principal', $5, $6, TRUE, 'active'),
            ($7, $8, $3, $9, 'Depot Operations Manager', $10, $11, FALSE, 'active')
          ON CONFLICT (id) DO NOTHING;
        `, [
          `cont-${cf.id}-1`, orgId, cf.id, cf.contactPerson, cf.phone, cf.email,
          `cont-${cf.id}-2`, orgId, `Prakash Sen (${cf.city})`, '+91 98765 01928', `ops@${cf.email.split('@')[1]}`
        ]);

        // Seed Addresses
        await client.query(`
          INSERT INTO cf_addresses (id, organization_id, cf_id, address_type, address_line1, city, state, postal_code, is_primary)
          VALUES 
            ($1, $2, $3, 'registered', $4, $5, $6, $7, TRUE),
            ($8, $2, $3, 'warehouse', $4, $5, $6, $7, FALSE)
          ON CONFLICT (id) DO NOTHING;
        `, [
          `addr-${cf.id}-1`, orgId, cf.id, cf.address, cf.city, cf.state, cf.pincode,
          `addr-${cf.id}-2`
        ]);

        // Seed Territories
        await client.query(`
          INSERT INTO cf_territories (id, organization_id, cf_id, state, region, territory_name, is_exclusive, status)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, 'active')
          ON CONFLICT (id) DO NOTHING;
        `, [
          `terr-${cf.id}-1`, orgId, cf.id, cf.state, cf.region, cf.territory
        ]);

        // Seed Documents
        await client.query(`
          INSERT INTO cf_documents (id, organization_id, cf_id, document_type, title, file_url, file_name, file_size, expiry_date, uploaded_by)
          VALUES 
            ($1, $2, $3, 'agreement', 'C&F Consignment & Custody Agreement 2026', 'https://storage.jyotsvan.enterprise/cfs/agreements/agmt-2026.pdf', 'CF_Agreement_Signed.pdf', 2450000, NOW() + INTERVAL '185 days', 'usr-super-admin'),
            ($4, $2, $3, 'gst_certificate', 'GST Registration Certificate REG-06', 'https://storage.jyotsvan.enterprise/cfs/compliance/gst-cert.pdf', 'GST_Registration.pdf', 1150000, NOW() + INTERVAL '3 years', 'usr-super-admin')
          ON CONFLICT (id) DO NOTHING;
        `, [
          `doc-${cf.id}-1`, orgId, cf.id,
          `doc-${cf.id}-2`
        ]);
      }

      // B. Map C&Fs to Existing Warehouses
      const whRows = await client.query('SELECT id, code, name FROM warehouses WHERE organization_id = $1', [orgId]);
      if (whRows.rows.length > 0) {
        // Map cf-mumbai-01 to first warehouse or wh-central-01
        const wh1 = whRows.rows[0];
        await client.query(`
          INSERT INTO cf_warehouses (id, organization_id, cf_id, warehouse_id, is_primary_depot, custody_agreement_ref, notes)
          VALUES ($1, $2, 'cf-mumbai-01', $3, TRUE, 'AGMT-WEST-2026-001', 'Primary Western India Depot')
          ON CONFLICT (cf_id, warehouse_id) DO NOTHING;
        `, ['cfwh-01', orgId, wh1.id]);

        if (whRows.rows.length > 1) {
          const wh2 = whRows.rows[1];
          await client.query(`
            INSERT INTO cf_warehouses (id, organization_id, cf_id, warehouse_id, is_primary_depot, custody_agreement_ref, notes)
            VALUES ($1, $2, 'cf-delhi-01', $3, TRUE, 'AGMT-NORTH-2026-002', 'Primary North India Depot')
            ON CONFLICT (cf_id, warehouse_id) DO NOTHING;
          `, ['cfwh-02', orgId, wh2.id]);
        }
        if (whRows.rows.length > 2) {
          const wh3 = whRows.rows[2];
          await client.query(`
            INSERT INTO cf_warehouses (id, organization_id, cf_id, warehouse_id, is_primary_depot, custody_agreement_ref, notes)
            VALUES ($1, $2, 'cf-bengaluru-01', $3, TRUE, 'AGMT-SOUTH-2026-003', 'Primary South India Depot')
            ON CONFLICT (cf_id, warehouse_id) DO NOTHING;
          `, ['cfwh-03', orgId, wh3.id]);
        }
        if (whRows.rows.length > 3) {
          const wh4 = whRows.rows[3];
          await client.query(`
            INSERT INTO cf_warehouses (id, organization_id, cf_id, warehouse_id, is_primary_depot, custody_agreement_ref, notes)
            VALUES ($1, $2, 'cf-odisha-01', $3, TRUE, 'AGMT-EAST-2026-004', 'Primary East India Depot')
            ON CONFLICT (cf_id, warehouse_id) DO NOTHING;
          `, ['cfwh-04', orgId, wh4.id]);
        }
      }

      // C. Seed Initial C&F Transfers with live items and batches
      const skuRows = await client.query('SELECT id, sku, variant_name as name, cost_price as standard_cost FROM skus WHERE organization_id = $1 LIMIT 5', [orgId]);
      const batchRows = await client.query('SELECT id, batch_number, sku_id, current_quantity FROM batches WHERE organization_id = $1 LIMIT 5', [orgId]);
      const srcWh = whRows.rows[0]?.id;
      const dstWh = whRows.rows[1]?.id || whRows.rows[0]?.id;

      if (srcWh && dstWh && skuRows.rows.length > 0) {
        const sku1 = skuRows.rows[0];
        const batch1 = batchRows.rows.find(b => b.sku_id === sku1.id) || batchRows.rows[0];

        // Transfer 1: In Transit
        const trf1Id = 'cftrf-2026-001';
        await client.query(`
          INSERT INTO cf_transfers (
            id, organization_id, transfer_number, source_warehouse_id, cf_id, destination_warehouse_id,
            transfer_type, status, priority, shipping_carrier, tracking_number, vehicle_number, driver_name,
            eway_bill_number, expected_delivery_date, requested_by, approved_by, dispatched_by,
            requested_at, approved_at, dispatched_at, notes
          ) VALUES (
            $1, $2, 'CFT-2026-00101', $3, 'cf-delhi-01', $4,
            'primary_allocation', 'in_transit', 'high', 'VRL Logistics Express', 'TRK-VRL-99281', 'MH-04-GP-8821', 'Mahesh Yadav',
            'EWB-881920192831', NOW() + INTERVAL '2 days', 'usr-super-admin', 'usr-super-admin', 'usr-super-admin',
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '12 hours', 'Primary depot stocking allocation for Northern territories'
          ) ON CONFLICT (organization_id, transfer_number) DO NOTHING;
        `, [trf1Id, orgId, srcWh, dstWh]);

        await client.query(`
          INSERT INTO cf_transfer_items (
            id, transfer_id, sku_id, batch_id, batch_number, requested_quantity, dispatched_quantity,
            received_quantity, shortage_quantity, damaged_quantity, unit_cost, status
          ) VALUES (
            'cftrfi-01', $1, $2, $3, $4, 500, 500, 0, 0, 0, $5, 'pending'
          ) ON CONFLICT (id) DO NOTHING;
        `, [trf1Id, sku1.id, batch1?.id || null, batch1?.batch_number || 'BATCH-FG-2026-01', Number(sku1.standard_cost || 1200)]);

        // Transfer 2: Completed with Shortage Discrepancy
        const trf2Id = 'cftrf-2026-002';
        await client.query(`
          INSERT INTO cf_transfers (
            id, organization_id, transfer_number, source_warehouse_id, cf_id, destination_warehouse_id,
            transfer_type, status, priority, shipping_carrier, tracking_number, vehicle_number, driver_name,
            expected_delivery_date, requested_by, approved_by, dispatched_by, received_by,
            requested_at, approved_at, dispatched_at, received_at, completed_at, notes
          ) VALUES (
            $1, $2, 'CFT-2026-00098', $3, 'cf-mumbai-01', $4,
            'replenishment', 'completed', 'medium', 'Safexpress Cargo', 'SFX-9018273', 'MH-12-Q-4491', 'Sanjay Patil',
            NOW() - INTERVAL '3 days', 'usr-super-admin', 'usr-super-admin', 'usr-super-admin', 'usr-super-admin',
            NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days',
            'Replenishment batch received with transit discrepancy'
          ) ON CONFLICT (organization_id, transfer_number) DO NOTHING;
        `, [trf2Id, orgId, srcWh, dstWh]);

        await client.query(`
          INSERT INTO cf_transfer_items (
            id, transfer_id, sku_id, batch_id, batch_number, requested_quantity, dispatched_quantity,
            received_quantity, shortage_quantity, damaged_quantity, unit_cost, status
          ) VALUES (
            'cftrfi-02', $1, $2, $3, $4, 1000, 1000, 980, 15, 5, $5, 'discrepant'
          ) ON CONFLICT (id) DO NOTHING;
        `, [trf2Id, sku1.id, batch1?.id || null, batch1?.batch_number || 'BATCH-FG-2026-01', Number(sku1.standard_cost || 1200)]);

        // Discrepancy record
        await client.query(`
          INSERT INTO cf_transfer_discrepancies (
            id, organization_id, transfer_id, item_id, sku_id, batch_id, discrepancy_type, quantity,
            unit_cost, reported_by, reported_by_email, reported_at, resolution_status, resolution_notes
          ) VALUES 
            ('cfdisc-01', $1, $2, 'cftrfi-02', $3, $4, 'shortage', 15, $5, 'usr-super-admin', 'admin@jyotsvan.enterprise', NOW() - INTERVAL '3 days', 'investigating', 'Physical count discrepancy noted at gate seal verification'),
            ('cfdisc-02', $1, $2, 'cftrfi-02', $3, $4, 'damaged', 5, $5, 'usr-super-admin', 'admin@jyotsvan.enterprise', NOW() - INTERVAL '3 days', 'pending', 'Water ingress damage during transit rain')
          ON CONFLICT (id) DO NOTHING;
        `, [orgId, trf2Id, sku1.id, batch1?.id || null, Number(sku1.standard_cost || 1200)]);

        // D. Seed C&F Outbound Dispatch
        const dspId = 'cfdsp-2026-001';
        await client.query(`
          INSERT INTO cf_dispatches (
            id, organization_id, dispatch_number, cf_id, warehouse_id, destination_type, destination_name,
            destination_reference, status, priority, shipping_carrier, vehicle_number, driver_name,
            dispatch_date, requested_by, approved_by, dispatched_by, requested_at, approved_at, dispatched_at, notes
          ) VALUES (
            $1, $2, 'CFD-2026-00042', 'cf-mumbai-01', $3, 'distributor', 'Omkar Enterprises & Distributors (Pune)',
            'DIST-PO-99120', 'dispatched', 'high', 'TCI Freight', 'MH-14-BT-1120', 'Kishore Shinde',
            NOW() - INTERVAL '6 hours', 'usr-super-admin', 'usr-super-admin', 'usr-super-admin',
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '6 hours', 'Primary stock supply for Pune & Western Maharashtra territory'
          ) ON CONFLICT (organization_id, dispatch_number) DO NOTHING;
        `, [dspId, orgId, dstWh]);

        await client.query(`
          INSERT INTO cf_dispatch_items (
            id, dispatch_id, sku_id, batch_id, batch_number, requested_quantity, picked_quantity, dispatched_quantity, unit_cost, status
          ) VALUES (
            'cfdspi-01', $1, $2, $3, $4, 200, 200, 200, $5, 'dispatched'
          ) ON CONFLICT (id) DO NOTHING;
        `, [dspId, sku1.id, batch1?.id || null, batch1?.batch_number || 'BATCH-FG-2026-01', Number(sku1.standard_cost || 1200)]);
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 15 Migration] C&F Management Engine schema and seed data initialized successfully.');
  } catch (err) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    console.error('[Phase 15 Migration Error] Failed to initialize C&F schema:', err);
    throw err;
  } finally {
    client.release();
  }
}
