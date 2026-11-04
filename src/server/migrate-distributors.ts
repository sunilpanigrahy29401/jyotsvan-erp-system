import { pool } from './db.ts';

export async function runDistributorMigration() {
  console.log('[Phase 16 Migration] Initializing Distributor Management Engine schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Reusable Territories Master Table (`territories`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS territories (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        territory_code VARCHAR(64) NOT NULL,
        territory_name VARCHAR(128) NOT NULL,
        region VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        district VARCHAR(128),
        pincodes JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_territory_code UNIQUE (organization_id, territory_code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_territories_org ON territories(organization_id);
      CREATE INDEX IF NOT EXISTS idx_territories_region_state ON territories(region, state);
    `);

    // 2. Distributor Master Table (`distributors`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributors (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_code VARCHAR(64) NOT NULL,
        legal_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        distributor_type VARCHAR(64) NOT NULL DEFAULT 'primary',
        status VARCHAR(64) NOT NULL DEFAULT 'active',
        gstin VARCHAR(32),
        pan VARCHAR(32),
        primary_contact VARCHAR(128) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        alternate_phone VARCHAR(64),
        email VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        registered_address TEXT,
        operational_address TEXT,
        city VARCHAR(128) NOT NULL,
        district VARCHAR(128),
        state VARCHAR(128) NOT NULL,
        pincode VARCHAR(32) NOT NULL,
        country VARCHAR(128) NOT NULL DEFAULT 'India',
        territory_id VARCHAR(64) REFERENCES territories(id) ON DELETE SET NULL,
        territory_name VARCHAR(128),
        region VARCHAR(128) NOT NULL,
        appointed_date TIMESTAMPTZ,
        agreement_start_date TIMESTAMPTZ,
        agreement_end_date TIMESTAMPTZ,
        credit_limit NUMERIC(16,2) DEFAULT 1000000,
        payment_terms_days INTEGER DEFAULT 30,
        agreed_discount_percent NUMERIC(5,2) DEFAULT 5.0,
        price_list_type VARCHAR(64) DEFAULT 'standard_distributor',
        credit_hold BOOLEAN DEFAULT FALSE NOT NULL,
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        updated_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_distributor_code UNIQUE (organization_id, distributor_code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_distributors_org_status ON distributors(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_distributors_org_code ON distributors(organization_id, distributor_code);
      CREATE INDEX IF NOT EXISTS idx_distributors_region_state ON distributors(region, state);
      CREATE INDEX IF NOT EXISTS idx_distributors_created ON distributors(created_at DESC);
    `);

    // 3. Distributor Contacts Table (`distributor_contacts`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_contacts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(128) NOT NULL DEFAULT 'Sales Contact',
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
      CREATE INDEX IF NOT EXISTS idx_dist_contacts_dist ON distributor_contacts(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_contacts_org ON distributor_contacts(organization_id);
    `);

    // 4. Distributor Addresses Table (`distributor_addresses`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_addresses (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        address_type VARCHAR(64) NOT NULL DEFAULT 'operational',
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city VARCHAR(128) NOT NULL,
        district VARCHAR(128),
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
      CREATE INDEX IF NOT EXISTS idx_dist_addresses_dist ON distributor_addresses(distributor_id);
    `);

    // 5. Distributor ↔ C&F Mapping (`distributor_cf_mappings`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_cf_mappings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE CASCADE,
        effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        effective_to TIMESTAMPTZ,
        is_preferred BOOLEAN DEFAULT TRUE NOT NULL,
        priority_rank INTEGER DEFAULT 1 NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_distributor_cf UNIQUE (distributor_id, cf_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_cf_map_dist ON distributor_cf_mappings(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_cf_map_cf ON distributor_cf_mappings(cf_id);
    `);

    // 6. Distributor Product Assortment (`distributor_assortments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_assortments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        minimum_order_quantity NUMERIC(16,4) DEFAULT 10 NOT NULL,
        target_stock NUMERIC(16,4) DEFAULT 100 NOT NULL,
        preferred_pack_size NUMERIC(16,4) DEFAULT 1 NOT NULL,
        agreed_price_basis NUMERIC(16,2),
        effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        effective_to TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_distributor_sku UNIQUE (distributor_id, sku_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_assort_dist ON distributor_assortments(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_assort_sku ON distributor_assortments(sku_id);
    `);

    // 7. Distributor Commercial Terms (`distributor_commercial_terms`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_commercial_terms (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        payment_terms_days INTEGER DEFAULT 30 NOT NULL,
        credit_limit NUMERIC(16,2) DEFAULT 1000000 NOT NULL,
        agreed_discount_percent NUMERIC(5,2) DEFAULT 5.0 NOT NULL,
        price_list_type VARCHAR(64) DEFAULT 'standard_distributor' NOT NULL,
        order_terms TEXT,
        delivery_terms TEXT,
        tax_configuration JSONB DEFAULT '{}'::jsonb,
        effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        effective_to TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_terms_dist ON distributor_commercial_terms(distributor_id);
    `);

    // 8. Distributor Channel Stock Table (`distributor_stock`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_stock (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        quantity_on_hand NUMERIC(16,4) NOT NULL DEFAULT 0,
        quantity_available NUMERIC(16,4) NOT NULL DEFAULT 0,
        quantity_reserved NUMERIC(16,4) NOT NULL DEFAULT 0,
        quantity_damaged NUMERIC(16,4) NOT NULL DEFAULT 0,
        quantity_quarantine NUMERIC(16,4) NOT NULL DEFAULT 0,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        unit_cost NUMERIC(16,4) DEFAULT 0,
        source_cf_id VARCHAR(64) REFERENCES cfs(id) ON DELETE SET NULL,
        last_inward_at TIMESTAMPTZ,
        last_outward_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_dist_stock_sku_batch UNIQUE (distributor_id, sku_id, batch_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_stock_dist ON distributor_stock(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_stock_sku ON distributor_stock(sku_id);
      CREATE INDEX IF NOT EXISTS idx_dist_stock_batch ON distributor_stock(batch_id);
      CREATE INDEX IF NOT EXISTS idx_dist_stock_cf ON distributor_stock(source_cf_id);
    `);

    // 9. Distributor Transfers / Dispatches Table (`distributor_transfers`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_transfers (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        transfer_number VARCHAR(64) NOT NULL,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE RESTRICT,
        cf_id VARCHAR(64) NOT NULL REFERENCES cfs(id) ON DELETE RESTRICT,
        source_warehouse_id VARCHAR(64) REFERENCES warehouses(id) ON DELETE RESTRICT,
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
        CONSTRAINT uk_org_dist_transfer_num UNIQUE (organization_id, transfer_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_trf_org_status ON distributor_transfers(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_dist_trf_dist ON distributor_transfers(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_trf_cf ON distributor_transfers(cf_id);
      CREATE INDEX IF NOT EXISTS idx_dist_trf_created ON distributor_transfers(created_at DESC);
    `);

    // 10. Distributor Transfer Items Table (`distributor_transfer_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_transfer_items (
        id VARCHAR(64) PRIMARY KEY,
        transfer_id VARCHAR(64) NOT NULL REFERENCES distributor_transfers(id) ON DELETE CASCADE,
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
      CREATE INDEX IF NOT EXISTS idx_dist_trf_items_trf ON distributor_transfer_items(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_dist_trf_items_sku ON distributor_transfer_items(sku_id);
      CREATE INDEX IF NOT EXISTS idx_dist_trf_items_batch ON distributor_transfer_items(batch_id);
    `);

    // 11. Distributor Discrepancies Table (`distributor_discrepancies`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_discrepancies (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        transfer_id VARCHAR(64) NOT NULL REFERENCES distributor_transfers(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        cf_id VARCHAR(64) REFERENCES cfs(id) ON DELETE SET NULL,
        item_id VARCHAR(64) NOT NULL REFERENCES distributor_transfer_items(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
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
      CREATE INDEX IF NOT EXISTS idx_dist_discrep_org ON distributor_discrepancies(organization_id);
      CREATE INDEX IF NOT EXISTS idx_dist_discrep_dist ON distributor_discrepancies(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_discrep_status ON distributor_discrepancies(resolution_status);
    `);

    // 12. Distributor Order Requests Foundation (`distributor_orders`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_orders (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        order_number VARCHAR(64) NOT NULL,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE RESTRICT,
        cf_id VARCHAR(64) REFERENCES cfs(id) ON DELETE SET NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        requested_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        requested_delivery_date TIMESTAMPTZ,
        total_items_count INTEGER DEFAULT 0 NOT NULL,
        total_quantity NUMERIC(16,4) DEFAULT 0 NOT NULL,
        total_estimated_amount NUMERIC(16,2) DEFAULT 0 NOT NULL,
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        notes TEXT,
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_dist_order_num UNIQUE (organization_id, order_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_orders_dist ON distributor_orders(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_orders_status ON distributor_orders(status);
    `);

    // 13. Distributor Order Items (`distributor_order_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_order_items (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES distributor_orders(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        requested_quantity NUMERIC(16,4) NOT NULL DEFAULT 1,
        approved_quantity NUMERIC(16,4) DEFAULT 0,
        unit_cost NUMERIC(16,4) DEFAULT 0,
        total_price NUMERIC(16,2) DEFAULT 0,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_order_items_ord ON distributor_order_items(order_id);
    `);

    // 14. Distributor Returns Foundation (`distributor_returns`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_returns (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        return_number VARCHAR(64) NOT NULL,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE RESTRICT,
        destination_cf_id VARCHAR(64) REFERENCES cfs(id) ON DELETE SET NULL,
        destination_warehouse_id VARCHAR(64) REFERENCES warehouses(id) ON DELETE SET NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        quantity NUMERIC(16,4) NOT NULL,
        unit_cost NUMERIC(16,4) DEFAULT 0,
        total_value NUMERIC(16,2) DEFAULT 0,
        reason VARCHAR(64) NOT NULL DEFAULT 'damaged',
        reference_transfer_id VARCHAR(64) REFERENCES distributor_transfers(id) ON DELETE SET NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        notes TEXT,
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        received_by VARCHAR(64),
        received_at TIMESTAMPTZ,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_dist_return_num UNIQUE (organization_id, return_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dist_returns_dist ON distributor_returns(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_dist_returns_status ON distributor_returns(status);
    `);

    // 15. Distributor Documents Table (`distributor_documents`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributor_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
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
      CREATE INDEX IF NOT EXISTS idx_dist_documents_dist ON distributor_documents(distributor_id);
    `);

    // 16. Register Phase 16 RBAC Permissions
    const distributorPermissions = [
      { id: 'perm-dist-01', code: 'distributors.view', module: 'distribution', description: 'View distributor master directory, profiles, territories, and commercial terms' },
      { id: 'perm-dist-02', code: 'distributors.create', module: 'distribution', description: 'Onboard and register new authorized distributors' },
      { id: 'perm-dist-03', code: 'distributors.edit', module: 'distribution', description: 'Modify distributor profile, contacts, addresses, and territory mapping' },
      { id: 'perm-dist-04', code: 'distributors.activate', module: 'distribution', description: 'Authorize and activate distributor channel agreements' },
      { id: 'perm-dist-05', code: 'distributors.suspend', module: 'distribution', description: 'Suspend distributor ordering and dispatch privileges' },
      { id: 'perm-dist-06', code: 'distributors.block', module: 'distribution', description: 'Place distributor account on financial or compliance block' },
      { id: 'perm-dist-07', code: 'distributors.terminate', module: 'distribution', description: 'Terminate distributor channel agreements' },
      { id: 'perm-dist-08', code: 'distributors.export', module: 'distribution', description: 'Export distributor directory, assortment, and stock registers' },
      { id: 'perm-dist-09', code: 'distributors.inventory.view', module: 'distribution', description: 'View distributor channel inventory levels, batches, and valuations' },
      { id: 'perm-dist-10', code: 'distributors.assortment.manage', module: 'distribution', description: 'Configure authorized SKU assortment, MOQ, and pack limits' },
      { id: 'perm-dist-11', code: 'distributors.credit.view', module: 'distribution', description: 'View distributor credit limit, utilization, and exposure' },
      { id: 'perm-dist-12', code: 'distributors.credit.edit', module: 'distribution', description: 'Modify distributor credit limits and payment terms' },
      { id: 'perm-dist-13', code: 'distributor_transfers.create', module: 'distribution', description: 'Initiate C&F to distributor transfer orders' },
      { id: 'perm-dist-14', code: 'distributor_transfers.approve', module: 'distribution', description: 'Authorize distributor dispatch and allocation' },
      { id: 'perm-dist-15', code: 'distributor_transfers.dispatch', module: 'distribution', description: 'Execute C&F gate-out dispatch to distributor' },
      { id: 'perm-dist-16', code: 'distributor_transfers.receive', module: 'distribution', description: 'Process distributor delivery receipt and log discrepancies' },
      { id: 'perm-dist-17', code: 'distributor_returns.create', module: 'distribution', description: 'Log distributor return request to C&F depot' },
      { id: 'perm-dist-18', code: 'distributor_returns.approve', module: 'distribution', description: 'Approve distributor return and reconcile stock' },
    ];

    for (const perm of distributorPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description, created_at)
         VALUES ('perm_' || md5($1), $1, $2, $3, NOW())
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module`,
        [perm.code, perm.module, perm.description]
      );
    }

    // Map permissions to system roles
    await client.query(`
      INSERT INTO role_permissions (id, role_id, permission_id, created_at)
      SELECT 'rp-' || r.id || '-' || p.id, r.id, p.id, NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.id IN ('role-super-admin', 'role-management', 'role-operations-manager', 'role-warehouse-manager')
        AND p.module = 'distributors'
      ON CONFLICT (id) DO NOTHING;
    `);

    // 17. Seed Reusable Territories & Initial Distributors
    const orgId = 'org-jyotsvan-corp';
    const distCountRes = await client.query('SELECT count(*) FROM distributors WHERE organization_id = $1', [orgId]);
    const existingDistCount = parseInt(distCountRes.rows[0]?.count || '0', 10);

    if (existingDistCount === 0) {
      console.log('[Phase 16 Migration] Seeding enterprise territories, distributors, mappings, and stock...');

      // A. Territories
      const seedTerritories = [
        { id: 'terr-west-mumbai', code: 'TERR-MH-MUM', name: 'Greater Mumbai & Thane Territory', region: 'West', state: 'Maharashtra', district: 'Mumbai Suburban' },
        { id: 'terr-west-pune', code: 'TERR-MH-PUN', name: 'Pune & Western Maharashtra Territory', region: 'West', state: 'Maharashtra', district: 'Pune' },
        { id: 'terr-north-delhi', code: 'TERR-DL-NCR', name: 'Delhi NCR Capital Corridor', region: 'North', state: 'Delhi', district: 'Central Delhi' },
        { id: 'terr-south-blr', code: 'TERR-KA-BLR', name: 'Bengaluru Metro & Urban Territory', region: 'South', state: 'Karnataka', district: 'Bengaluru Urban' },
        { id: 'terr-east-bhubaneswar', code: 'TERR-OD-BBS', name: 'Bhubaneswar & Cuttack Twin City Territory', region: 'East', state: 'Odisha', district: 'Khurda' },
        { id: 'terr-east-kolkata', code: 'TERR-WB-KOL', name: 'Kolkata Greater Metropolitan Territory', region: 'East', state: 'West Bengal', district: 'Kolkata' },
      ];

      for (const t of seedTerritories) {
        await client.query(`
          INSERT INTO territories (id, organization_id, territory_code, territory_name, region, state, district, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
          ON CONFLICT (organization_id, territory_code) DO NOTHING;
        `, [t.id, orgId, t.code, t.name, t.region, t.state, t.district]);
      }

      // B. Distributors
      const seedDistributors = [
        {
          id: 'dist-mumbai-01',
          code: 'DIST-MUM-01',
          legalName: 'Apex FMCG Distributors LLP',
          displayName: 'Apex Distributors (Mumbai South & Central)',
          distributorType: 'super_distributor',
          status: 'active',
          gstin: '27AABCA1122D1ZP',
          pan: 'AABCA1122D',
          primaryContact: 'Mukesh Parekh',
          phone: '+91 98200 11988',
          email: 'mukesh@apexdistributors.in',
          address: 'Gala 14-16, Cotton Exchange Building, Kalbadevi',
          city: 'Mumbai',
          district: 'Mumbai City',
          state: 'Maharashtra',
          pincode: '400002',
          territoryId: 'terr-west-mumbai',
          territoryName: 'Greater Mumbai & Thane Territory',
          region: 'West',
          creditLimit: 1500000,
          paymentTerms: 30,
          discount: 6.5,
          mappedCfId: 'cf-mumbai-01',
        },
        {
          id: 'dist-pune-01',
          code: 'DIST-PUN-01',
          legalName: 'Sahyadri Trade & Distribution Pvt Ltd',
          displayName: 'Sahyadri Enterprise (Pune & PCMC)',
          distributorType: 'primary',
          status: 'active',
          gstin: '27AABCS7788K1ZM',
          pan: 'AABCS7788K',
          primaryContact: 'Suhas Deshmukh',
          phone: '+91 98220 55431',
          email: 'suhas@sahyadritrade.com',
          address: 'Plot 55, Market Yard, Gultekdi',
          city: 'Pune',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '411037',
          territoryId: 'terr-west-pune',
          territoryName: 'Pune & Western Maharashtra Territory',
          region: 'West',
          creditLimit: 800000,
          paymentTerms: 21,
          discount: 5.5,
          mappedCfId: 'cf-mumbai-01',
        },
        {
          id: 'dist-delhi-01',
          code: 'DIST-DEL-01',
          legalName: 'Capital Wholesale & Retail Distribution Co',
          displayName: 'Capital Distribution Hub (Delhi NCR)',
          distributorType: 'super_distributor',
          status: 'active',
          gstin: '07AABCC3344M1ZT',
          pan: 'AABCC3344M',
          primaryContact: 'Rakesh Aggarwal',
          phone: '+91 98101 22334',
          email: 'rakesh@capitalwholesale.in',
          address: 'Shop 201-204, Wholesale Market, Sadar Bazar',
          city: 'Delhi',
          district: 'Central Delhi',
          state: 'Delhi',
          pincode: '110006',
          territoryId: 'terr-north-delhi',
          territoryName: 'Delhi NCR Capital Corridor',
          region: 'North',
          creditLimit: 2000000,
          paymentTerms: 45,
          discount: 7.0,
          mappedCfId: 'cf-delhi-01',
        },
        {
          id: 'dist-blr-01',
          code: 'DIST-BLR-01',
          legalName: 'Venkateshwara Consumer Goods Distribution',
          displayName: 'Venkateshwara Supply (Bengaluru Metro)',
          distributorType: 'primary',
          status: 'active',
          gstin: '29AAGCV5566L1ZQ',
          pan: 'AAGCV5566L',
          primaryContact: 'Ramesh Reddy',
          phone: '+91 99800 44321',
          email: 'ramesh@venkateshwaragoods.com',
          address: 'Building 18, APMC Yard, Yeshwanthpur',
          city: 'Bengaluru',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          pincode: '560022',
          territoryId: 'terr-south-blr',
          territoryName: 'Bengaluru Metro & Urban Territory',
          region: 'South',
          creditLimit: 1200000,
          paymentTerms: 30,
          discount: 6.0,
          mappedCfId: 'cf-bengaluru-01',
        },
        {
          id: 'dist-bbsr-01',
          code: 'DIST-BBS-01',
          legalName: 'Utkal Pharma & Retail Distributors LLP',
          displayName: 'Utkal Distributors (Bhubaneswar/Cuttack)',
          distributorType: 'state',
          status: 'active',
          gstin: '21AALCU9900P1ZR',
          pan: 'AALCU9900P',
          primaryContact: 'Bijay Kumar Das',
          phone: '+91 94371 66554',
          email: 'bijay@utkaldistributors.in',
          address: 'Malgodown Commercial Hub, Station Road',
          city: 'Cuttack / Bhubaneswar',
          district: 'Cuttack',
          state: 'Odisha',
          pincode: '753003',
          territoryId: 'terr-east-bhubaneswar',
          territoryName: 'Bhubaneswar & Cuttack Twin City Territory',
          region: 'East',
          creditLimit: 1000000,
          paymentTerms: 30,
          discount: 5.5,
          mappedCfId: 'cf-odisha-01',
        },
      ];

      for (const d of seedDistributors) {
        await client.query(`
          INSERT INTO distributors (
            id, organization_id, distributor_code, legal_name, display_name, distributor_type, status,
            gstin, pan, primary_contact, phone, email, registered_address, operational_address,
            city, district, state, pincode, country, territory_id, territory_name, region,
            appointed_date, agreement_start_date, agreement_end_date, credit_limit, payment_terms_days,
            agreed_discount_percent, notes, created_by, created_by_email
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $13,
            $14, $15, $16, $17, 'India', $18, $19, $20,
            NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days', NOW() + INTERVAL '245 days',
            $21, $22, $23, 'Authorized enterprise tier distributor.', 'usr-super-admin', 'admin@jyotsvan.enterprise'
          ) ON CONFLICT (organization_id, distributor_code) DO NOTHING;
        `, [
          d.id, orgId, d.code, d.legalName, d.displayName, d.distributorType, d.status,
          d.gstin, d.pan, d.primaryContact, d.phone, d.email, d.address,
          d.city, d.district, d.state, d.pincode, d.territoryId, d.territoryName, d.region,
          d.creditLimit, d.paymentTerms, d.discount
        ]);

        // Contacts
        await client.query(`
          INSERT INTO distributor_contacts (id, organization_id, distributor_id, name, designation, phone, email, is_primary, status)
          VALUES 
            ($1, $2, $3, $4, 'Managing Partner / Owner', $5, $6, TRUE, 'active'),
            ($7, $8, $3, $9, 'Accounts & Order Head', $10, $11, FALSE, 'active')
          ON CONFLICT (id) DO NOTHING;
        `, [
          `dcont-${d.id}-1`, orgId, d.id, d.primaryContact, d.phone, d.email,
          `dcont-${d.id}-2`, orgId, `Accounts Desk (${d.city})`, '+91 91234 56789', `accounts@${d.email.split('@')[1]}`
        ]);

        // Addresses
        await client.query(`
          INSERT INTO distributor_addresses (id, organization_id, distributor_id, address_type, address_line1, city, district, state, postal_code, is_primary)
          VALUES 
            ($1, $2, $3, 'registered', $4, $5, $6, $7, $8, TRUE),
            ($9, $2, $3, 'warehouse', $4, $5, $6, $7, $8, FALSE)
          ON CONFLICT (id) DO NOTHING;
        `, [
          `daddr-${d.id}-1`, orgId, d.id, d.address, d.city, d.district, d.state, d.pincode,
          `daddr-${d.id}-2`
        ]);

        // Commercial Terms
        await client.query(`
          INSERT INTO distributor_commercial_terms (id, organization_id, distributor_id, payment_terms_days, credit_limit, agreed_discount_percent, price_list_type, order_terms, delivery_terms)
          VALUES ($1, $2, $3, $4, $5, $6, 'standard_distributor', 'Standard 48-hour order dispatch SLA from mapped C&F depot.', 'Door delivery to distributor central receiving dock.')
          ON CONFLICT (id) DO NOTHING;
        `, [
          `dterms-${d.id}`, orgId, d.id, d.paymentTerms, d.creditLimit, d.discount
        ]);

        // Documents
        await client.query(`
          INSERT INTO distributor_documents (id, organization_id, distributor_id, document_type, title, file_url, file_name, file_size, expiry_date, uploaded_by)
          VALUES 
            ($1, $2, $3, 'agreement', 'Distributorship Authorized Franchise Agreement 2026', 'https://storage.jyotsvan.enterprise/distributors/agreements/agmt-2026.pdf', 'Distributor_Agreement_Executed.pdf', 1850000, NOW() + INTERVAL '245 days', 'usr-super-admin'),
            ($4, $2, $3, 'gst_certificate', 'GSTIN Registration Verification Form GST REG-06', 'https://storage.jyotsvan.enterprise/distributors/compliance/gst-cert.pdf', 'GST_Certificate.pdf', 980000, NOW() + INTERVAL '3 years', 'usr-super-admin')
          ON CONFLICT (id) DO NOTHING;
        `, [
          `ddoc-${d.id}-1`, orgId, d.id,
          `ddoc-${d.id}-2`
        ]);

        // C&F Mapping
        await client.query(`
          INSERT INTO distributor_cf_mappings (id, organization_id, distributor_id, cf_id, is_preferred, priority_rank, status)
          VALUES ($1, $2, $3, $4, TRUE, 1, 'active')
          ON CONFLICT (distributor_id, cf_id) DO NOTHING;
        `, [
          `dcf-${d.id}-${d.mappedCfId}`, orgId, d.id, d.mappedCfId
        ]);
      }

      // C. Product Assortment (Map canonical SKUs to Distributors)
      const skuRows = await client.query('SELECT id, sku, variant_name as name, cost_price, mrp FROM skus WHERE organization_id = $1 LIMIT 10', [orgId]);
      if (skuRows.rows.length > 0) {
        for (const d of seedDistributors) {
          for (let i = 0; i < Math.min(skuRows.rows.length, 5); i++) {
            const sku = skuRows.rows[i];
            await client.query(`
              INSERT INTO distributor_assortments (id, organization_id, distributor_id, sku_id, status, minimum_order_quantity, target_stock, preferred_pack_size, agreed_price_basis)
              VALUES ($1, $2, $3, $4, 'active', 20, 200, 10, $5)
              ON CONFLICT (distributor_id, sku_id) DO NOTHING;
            `, [
              `assort-${d.id}-${sku.id}`, orgId, d.id, sku.id, parseFloat(sku.mrp || '100') * 0.85
            ]);
          }
        }
      }

      // D. Seed Initial Distributor Stock & Traceable Batches
      const batchRows = await client.query('SELECT id, batch_number, sku_id, cost_per_unit FROM batches WHERE organization_id = $1 LIMIT 5', [orgId]);
      if (batchRows.rows.length > 0 && skuRows.rows.length > 0) {
        for (let idx = 0; idx < seedDistributors.length; idx++) {
          const d = seedDistributors[idx];
          const batch = batchRows.rows[idx % batchRows.rows.length];
          const sku = skuRows.rows.find(s => s.id === batch.sku_id) || skuRows.rows[0];

          await client.query(`
            INSERT INTO distributor_stock (
              id, organization_id, distributor_id, sku_id, batch_id, batch_number,
              quantity_on_hand, quantity_available, quantity_reserved, quantity_damaged, quantity_quarantine,
              unit_cost, source_cf_id, last_inward_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              350, 320, 30, 0, 0,
              $7, $8, NOW() - INTERVAL '10 days'
            ) ON CONFLICT (distributor_id, sku_id, batch_number) DO NOTHING;
          `, [
            `dstock-${d.id}-${batch.id}`, orgId, d.id, sku.id, batch.id, batch.batch_number,
            parseFloat(batch.cost_per_unit || '120'), d.mappedCfId
          ]);
        }
      }

      // E. Seed Sample C&F-to-Distributor Transfer / Dispatch Orders
      const whRows = await client.query('SELECT id FROM warehouses WHERE organization_id = $1 LIMIT 2', [orgId]);
      const defaultWhId = whRows.rows[0]?.id || null;

      if (skuRows.rows.length > 0) {
        const sku1 = skuRows.rows[0];
        const batch1 = batchRows.rows[0];

        // 1. In-Transit Transfer (Dispatch Executed from C&F, on way to Distributor)
        const trf1Id = 'dtrf-mum-2026-001';
        await client.query(`
          INSERT INTO distributor_transfers (
            id, organization_id, transfer_number, distributor_id, cf_id, source_warehouse_id,
            status, priority, shipping_carrier, tracking_number, vehicle_number, driver_name, driver_phone,
            eway_bill_number, expected_delivery_date, requested_by, requested_by_email,
            approved_by, approved_by_email, dispatched_by, dispatched_by_email,
            requested_at, approved_at, dispatched_at, notes
          ) VALUES (
            $1, $2, 'DTRF-2026-00101', 'dist-mumbai-01', 'cf-mumbai-01', $3,
            'in_transit', 'high', 'VRL Logistics Logistics', 'VRL-MUM-99882', 'MH-04-AZ-4590', 'Ganesh Patil', '+91 98330 11992',
            'EWB-MH-8899-00192', NOW() + INTERVAL '1 day', 'usr-super-admin', 'admin@jyotsvan.enterprise',
            'usr-super-admin', 'admin@jyotsvan.enterprise', 'usr-super-admin', 'admin@jyotsvan.enterprise',
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '12 hours',
            'Primary distributor replenishment consignment for South Mumbai retail territory.'
          ) ON CONFLICT (organization_id, transfer_number) DO NOTHING;
        `, [trf1Id, orgId, defaultWhId]);

        await client.query(`
          INSERT INTO distributor_transfer_items (
            id, transfer_id, sku_id, batch_id, batch_number, requested_quantity, dispatched_quantity, received_quantity, unit_cost, status
          ) VALUES ($1, $2, $3, $4, $5, 250, 250, 0, 125.00, 'dispatched')
          ON CONFLICT (id) DO NOTHING;
        `, [`dtrf-item-01`, trf1Id, sku1.id, batch1?.id || null, batch1?.batch_number || 'BAT-2026-001']);

        // 2. Completed Transfer with discrepancy logged
        const trf2Id = 'dtrf-pune-2026-002';
        await client.query(`
          INSERT INTO distributor_transfers (
            id, organization_id, transfer_number, distributor_id, cf_id, source_warehouse_id,
            status, priority, shipping_carrier, tracking_number, vehicle_number, driver_name,
            eway_bill_number, expected_delivery_date, requested_by, requested_by_email,
            approved_by, approved_by_email, dispatched_by, dispatched_by_email,
            received_by, received_by_email, requested_at, approved_at, dispatched_at, received_at, completed_at, notes
          ) VALUES (
            $1, $2, 'DTRF-2026-00102', 'dist-pune-01', 'cf-mumbai-01', $3,
            'completed', 'medium', 'TCI Freight', 'TCI-PUN-33441', 'MH-12-CQ-8812', 'Sanjay Jadhav',
            'EWB-MH-4455-11029', NOW() - INTERVAL '3 days', 'usr-super-admin', 'admin@jyotsvan.enterprise',
            'usr-super-admin', 'admin@jyotsvan.enterprise', 'usr-super-admin', 'admin@jyotsvan.enterprise',
            'usr-super-admin', 'admin@jyotsvan.enterprise',
            NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',
            'Monthly stock replenishment for Pune Market Yard territory.'
          ) ON CONFLICT (organization_id, transfer_number) DO NOTHING;
        `, [trf2Id, orgId, defaultWhId]);

        const trf2ItemId = 'dtrf-item-02';
        await client.query(`
          INSERT INTO distributor_transfer_items (
            id, transfer_id, sku_id, batch_id, batch_number, requested_quantity, dispatched_quantity, received_quantity, shortage_quantity, damaged_quantity, unit_cost, status
          ) VALUES ($1, $2, $3, $4, $5, 200, 200, 190, 5, 5, 125.00, 'received')
          ON CONFLICT (id) DO NOTHING;
        `, [trf2ItemId, trf2Id, sku1.id, batch1?.id || null, batch1?.batch_number || 'BAT-2026-001']);

        // Log Discrepancies
        await client.query(`
          INSERT INTO distributor_discrepancies (
            id, organization_id, transfer_id, distributor_id, cf_id, item_id, sku_id, batch_id, batch_number,
            discrepancy_type, quantity, unit_cost, reported_by, reported_by_email, resolution_status, resolution_notes
          ) VALUES 
            ($1, $2, $3, 'dist-pune-01', 'cf-mumbai-01', $4, $5, $6, $7, 'shortage', 5, 125.00, 'usr-super-admin', 'admin@jyotsvan.enterprise', 'investigating', 'Carrier shortage acknowledgment slip filed with driver.'),
            ($8, $2, $3, 'dist-pune-01', 'cf-mumbai-01', $4, $5, $6, $7, 'damaged', 5, 125.00, 'usr-super-admin', 'admin@jyotsvan.enterprise', 'pending', 'Outer carton damaged during transit. Under review by QA team.')
          ON CONFLICT (id) DO NOTHING;
        `, [
          'ddisc-01', orgId, trf2Id, trf2ItemId, sku1.id, batch1?.id || null, batch1?.batch_number || 'BAT-2026-001',
          'ddisc-02'
        ]);

        // F. Seed Sample Distributor Orders Foundation
        await client.query(`
          INSERT INTO distributor_orders (
            id, organization_id, order_number, distributor_id, cf_id, status, requested_date, requested_delivery_date,
            total_items_count, total_quantity, total_estimated_amount, notes, created_by
          ) VALUES 
            ($1, $2, 'DORD-2026-0001', 'dist-mumbai-01', 'cf-mumbai-01', 'submitted', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', 2, 400, 68000.00, 'Urgent festival stock booking.', 'usr-super-admin'),
            ($3, $2, 'DORD-2026-0002', 'dist-blr-01', 'cf-bengaluru-01', 'approved', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', 1, 200, 32000.00, 'Monthly planned order.', 'usr-super-admin')
          ON CONFLICT (organization_id, order_number) DO NOTHING;
        `, [
          'dord-01', orgId,
          'dord-02'
        ]);

        await client.query(`
          INSERT INTO distributor_order_items (id, order_id, sku_id, requested_quantity, approved_quantity, unit_cost, total_price)
          VALUES 
            ('dord-item-01', 'dord-01', $1, 250, 250, 125.00, 31250.00),
            ('dord-item-02', 'dord-01', $1, 150, 150, 145.00, 21750.00),
            ('dord-item-03', 'dord-02', $1, 200, 200, 160.00, 32000.00)
          ON CONFLICT (id) DO NOTHING;
        `, [sku1.id]);

        // G. Seed Sample Returns Foundation
        await client.query(`
          INSERT INTO distributor_returns (
            id, organization_id, return_number, distributor_id, destination_cf_id, sku_id, batch_id, batch_number,
            quantity, unit_cost, total_value, reason, status, notes, created_by
          ) VALUES (
            $1, $2, 'DRET-2026-0001', 'dist-pune-01', 'cf-mumbai-01', $3, $4, $5,
            15, 125.00, 1875.00, 'damaged', 'submitted', 'Outer packaging crushed during transit by local courier.', 'usr-super-admin'
          ) ON CONFLICT (organization_id, return_number) DO NOTHING;
        `, [
          'dret-01', orgId, sku1.id, batch1?.id || null, batch1?.batch_number || 'BAT-2026-001'
        ]);
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 16 Migration] ✓ Successfully migrated Distributor Management Engine.');
  } catch (err: unknown) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Phase 16 Migration] ✗ Migration failed:', errorMsg);
    throw err;
  } finally {
    client.release();
  }
}
