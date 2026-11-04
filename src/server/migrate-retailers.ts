import { pool } from './db.ts';

export async function runRetailerMigration() {
  console.log('[Phase 17 Migration] Initializing Retailer Management Engine schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Retailer Master Table (`retailers`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailers (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_code VARCHAR(64) NOT NULL,
        legal_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        retailer_type VARCHAR(64) NOT NULL DEFAULT 'agro_input_shop',
        status VARCHAR(64) NOT NULL DEFAULT 'active',
        gstin VARCHAR(32),
        pan VARCHAR(32),
        phone VARCHAR(64) NOT NULL,
        alternate_phone VARCHAR(64),
        email VARCHAR(255) NOT NULL,
        registered_address TEXT,
        operational_address TEXT,
        city VARCHAR(128) NOT NULL,
        district VARCHAR(128),
        state VARCHAR(128) NOT NULL,
        pincode VARCHAR(32) NOT NULL,
        country VARCHAR(128) NOT NULL DEFAULT 'India',
        territory_id VARCHAR(64) REFERENCES territories(id) ON DELETE SET NULL,
        region VARCHAR(128) NOT NULL,
        primary_distributor_id VARCHAR(64) REFERENCES distributors(id) ON DELETE SET NULL,
        cf_id VARCHAR(64) REFERENCES cfs(id) ON DELETE SET NULL,
        appointed_date TIMESTAMPTZ,
        agreement_start_date TIMESTAMPTZ,
        agreement_end_date TIMESTAMPTZ,
        credit_limit NUMERIC(16,2) DEFAULT 200000,
        payment_terms_days INTEGER DEFAULT 15,
        agreed_discount_percent NUMERIC(5,2) DEFAULT 3.0,
        warning_threshold NUMERIC(5,2) DEFAULT 80.0,
        credit_hold BOOLEAN DEFAULT FALSE NOT NULL,
        assigned_salesperson_id VARCHAR(64),
        assigned_salesperson_name VARCHAR(128),
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        updated_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_retailer_code UNIQUE (organization_id, retailer_code)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_retailers_org_status ON retailers(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_retailers_org_code ON retailers(organization_id, retailer_code);
      CREATE INDEX IF NOT EXISTS idx_retailers_region_state ON retailers(region, state);
      CREATE INDEX IF NOT EXISTS idx_retailers_distributor ON retailers(primary_distributor_id);
      CREATE INDEX IF NOT EXISTS idx_retailers_territory ON retailers(territory_id);
      CREATE INDEX IF NOT EXISTS idx_retailers_salesperson ON retailers(assigned_salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_retailers_created ON retailers(created_at DESC);
    `);

    // 2. Retailer Contacts Table (`retailer_contacts`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_contacts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(128) NOT NULL DEFAULT 'Owner',
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
      CREATE INDEX IF NOT EXISTS idx_ret_contacts_ret ON retailer_contacts(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_contacts_org ON retailer_contacts(organization_id);
    `);

    // 3. Retailer Addresses Table (`retailer_addresses`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_addresses (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        address_type VARCHAR(64) NOT NULL DEFAULT 'store',
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
      CREATE INDEX IF NOT EXISTS idx_ret_addresses_ret ON retailer_addresses(retailer_id);
    `);

    // 4. Retailer ↔ Distributor Mapping Table (`retailer_distributor_mappings`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_distributor_mappings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        effective_to TIMESTAMPTZ,
        is_preferred BOOLEAN DEFAULT TRUE NOT NULL,
        priority_rank INTEGER DEFAULT 1 NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        territory_id VARCHAR(64) REFERENCES territories(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_retailer_distributor UNIQUE (retailer_id, distributor_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_dist_map_ret ON retailer_distributor_mappings(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_dist_map_dist ON retailer_distributor_mappings(distributor_id);
    `);

    // 5. Retailer Salesperson Assignments (`retailer_salesperson_assignments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_salesperson_assignments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(128) NOT NULL,
        user_email VARCHAR(255),
        role VARCHAR(64) NOT NULL DEFAULT 'Sales Officer',
        effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        effective_to TIMESTAMPTZ,
        is_primary BOOLEAN DEFAULT TRUE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_sales_map_ret ON retailer_salesperson_assignments(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_sales_map_usr ON retailer_salesperson_assignments(user_id);
    `);

    // 6. Retailer Product Assortment (`retailer_assortments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_assortments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        minimum_order_quantity NUMERIC(16,4) DEFAULT 5 NOT NULL,
        target_stock NUMERIC(16,4) DEFAULT 30 NOT NULL,
        preferred_pack_size NUMERIC(16,4) DEFAULT 1 NOT NULL,
        agreed_price_basis NUMERIC(16,2),
        effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        effective_to TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_retailer_sku UNIQUE (retailer_id, sku_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_assort_ret ON retailer_assortments(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_assort_sku ON retailer_assortments(sku_id);
    `);

    // 7. Retailer Commercial Terms (`retailer_commercial_terms`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_commercial_terms (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        price_list_type VARCHAR(64) DEFAULT 'retail_standard' NOT NULL,
        payment_terms_days INTEGER DEFAULT 15 NOT NULL,
        credit_limit NUMERIC(16,2) DEFAULT 200000 NOT NULL,
        warning_threshold NUMERIC(5,2) DEFAULT 80.0 NOT NULL,
        credit_hold BOOLEAN DEFAULT FALSE NOT NULL,
        agreed_discount_percent NUMERIC(5,2) DEFAULT 3.0 NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_ret_terms_ret ON retailer_commercial_terms(retailer_id);
    `);

    // 8. Retailer Channel Stock Table (`retailer_stock`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_stock (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
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
        source_distributor_id VARCHAR(64) REFERENCES distributors(id) ON DELETE SET NULL,
        source_cf_id VARCHAR(64) REFERENCES cfs(id) ON DELETE SET NULL,
        last_inward_at TIMESTAMPTZ,
        last_outward_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_ret_stock_sku_batch UNIQUE (retailer_id, sku_id, batch_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_stock_ret ON retailer_stock(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_stock_sku ON retailer_stock(sku_id);
      CREATE INDEX IF NOT EXISTS idx_ret_stock_batch ON retailer_stock(batch_id);
      CREATE INDEX IF NOT EXISTS idx_ret_stock_dist ON retailer_stock(source_distributor_id);
    `);

    // 9. Retailer Receiving Records Table (`retailer_receiving_records`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_receiving_records (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
        distributor_dispatch_reference VARCHAR(128),
        transfer_id VARCHAR(64),
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        dispatched_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        received_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        shortage_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        damaged_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        rejected_quantity NUMERIC(16,4) NOT NULL DEFAULT 0,
        unit_cost NUMERIC(16,4) DEFAULT 0,
        receiving_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_recv_ret ON retailer_receiving_records(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_recv_dist ON retailer_receiving_records(distributor_id);
    `);

    // 10. Retailer Order Requests Foundation (`retailer_order_requests`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_order_requests (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        order_number VARCHAR(64) NOT NULL,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE RESTRICT,
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
        CONSTRAINT uk_org_retailer_order_num UNIQUE (organization_id, order_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_orders_ret ON retailer_order_requests(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_orders_dist ON retailer_order_requests(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_ret_orders_status ON retailer_order_requests(status);
    `);

    // 11. Retailer Order Request Items (`retailer_order_request_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_order_request_items (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES retailer_order_requests(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        requested_quantity NUMERIC(16,4) NOT NULL DEFAULT 1,
        approved_quantity NUMERIC(16,4) DEFAULT 0,
        uom VARCHAR(32) DEFAULT 'PCS',
        unit_cost NUMERIC(16,4) DEFAULT 0,
        total_price NUMERIC(16,2) DEFAULT 0,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_order_items_ord ON retailer_order_request_items(order_id);
    `);

    // 12. Retailer Returns Foundation (`retailer_returns`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_returns (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        return_number VARCHAR(64) NOT NULL,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) NOT NULL REFERENCES distributors(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL,
        batch_number VARCHAR(128),
        quantity NUMERIC(16,4) NOT NULL,
        reason VARCHAR(64) NOT NULL DEFAULT 'damaged',
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        reference VARCHAR(128),
        notes TEXT,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_ret_return_num UNIQUE (organization_id, return_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_returns_ret ON retailer_returns(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_returns_dist ON retailer_returns(distributor_id);
      CREATE INDEX IF NOT EXISTS idx_ret_returns_status ON retailer_returns(status);
    `);

    // 13. Retailer Visits Foundation (`retailer_visits`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_visits (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        salesperson_id VARCHAR(64),
        salesperson_name VARCHAR(128) NOT NULL,
        visit_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        purpose VARCHAR(64) NOT NULL DEFAULT 'routine_order_booking',
        notes TEXT,
        outcome TEXT,
        next_follow_up_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_visits_ret ON retailer_visits(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_visits_sales ON retailer_visits(salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_ret_visits_date ON retailer_visits(visit_date DESC);
    `);

    // 14. Retailer Follow-ups Foundation (`retailer_follow_ups`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_follow_ups (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        visit_id VARCHAR(64) REFERENCES retailer_visits(id) ON DELETE SET NULL,
        assigned_user_id VARCHAR(64),
        assigned_user_name VARCHAR(128) NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        priority VARCHAR(32) DEFAULT 'medium' NOT NULL,
        subject VARCHAR(255) NOT NULL,
        notes TEXT,
        status VARCHAR(32) DEFAULT 'open' NOT NULL,
        completion_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ret_followups_ret ON retailer_follow_ups(retailer_id);
      CREATE INDEX IF NOT EXISTS idx_ret_followups_status ON retailer_follow_ups(status);
      CREATE INDEX IF NOT EXISTS idx_ret_followups_due ON retailer_follow_ups(due_date);
    `);

    // 15. Retailer Documents Table (`retailer_documents`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS retailer_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
        document_type VARCHAR(64) NOT NULL DEFAULT 'shop_registration',
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
      CREATE INDEX IF NOT EXISTS idx_ret_documents_ret ON retailer_documents(retailer_id);
    `);

    // 16. Register Phase 17 RBAC Permissions
    const retailerPermissions = [
      { id: 'perm-ret-01', code: 'retailers.view', module: 'distribution', description: 'View retailer master directory, profiles, territories, and commercial terms' },
      { id: 'perm-ret-02', code: 'retailers.create', module: 'distribution', description: 'Onboard and register new retail partner outlets' },
      { id: 'perm-ret-03', code: 'retailers.edit', module: 'distribution', description: 'Modify retailer profile, contacts, addresses, distributor mappings, and salesperson assignments' },
      { id: 'perm-ret-04', code: 'retailers.activate', module: 'distribution', description: 'Authorize and activate retailer channel agreements' },
      { id: 'perm-ret-05', code: 'retailers.suspend', module: 'distribution', description: 'Suspend retailer ordering privileges' },
      { id: 'perm-ret-06', code: 'retailers.block', module: 'distribution', description: 'Place retailer account on financial or compliance block' },
      { id: 'perm-ret-07', code: 'retailers.terminate', module: 'distribution', description: 'Terminate retailer merchant relationship' },
      { id: 'perm-ret-08', code: 'retailers.export', module: 'distribution', description: 'Export retailer directory, assortment, and stock registers' },
      { id: 'perm-ret-09', code: 'retailers.assortment.manage', module: 'distribution', description: 'Configure authorized SKU assortment, MOQ, and target stock' },
      { id: 'perm-ret-10', code: 'retailers.inventory.view', module: 'distribution', description: 'View retailer channel inventory levels, batches, and valuations' },
      { id: 'perm-ret-11', code: 'retailers.credit.view', module: 'distribution', description: 'View retailer credit limit, utilization, and exposure' },
      { id: 'perm-ret-12', code: 'retailers.credit.edit', module: 'distribution', description: 'Modify retailer credit limits and payment terms' },
      { id: 'perm-ret-13', code: 'retailer_orders.view', module: 'distribution', description: 'View retailer secondary order requests' },
      { id: 'perm-ret-14', code: 'retailer_orders.create', module: 'distribution', description: 'Create and submit retailer replenishment order requests' },
      { id: 'perm-ret-15', code: 'retailer_orders.approve', module: 'distribution', description: 'Approve retailer order request for distributor fulfillment' },
      { id: 'perm-ret-16', code: 'retailer_returns.view', module: 'distribution', description: 'View retailer return requests and claims' },
      { id: 'perm-ret-17', code: 'retailer_returns.create', module: 'distribution', description: 'Log retailer return requests to distributor' },
      { id: 'perm-ret-18', code: 'retailer_visits.view', module: 'distribution', description: 'View field sales visit logs and retailer interaction history' },
      { id: 'perm-ret-19', code: 'retailer_visits.create', module: 'distribution', description: 'Log field sales visit outcomes and schedule follow-ups' },
      { id: 'perm-ret-20', code: 'retailer_followups.view', module: 'distribution', description: 'View retailer pending tasks and follow-up reminders' },
      { id: 'perm-ret-21', code: 'retailer_followups.create', module: 'distribution', description: 'Create follow-up action items for retailer accounts' },
      { id: 'perm-ret-22', code: 'retailer_followups.edit', module: 'distribution', description: 'Update status or complete retailer follow-up tasks' },
    ];

    for (const perm of retailerPermissions) {
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
        AND p.module = 'retailers'
      ON CONFLICT (id) DO NOTHING;
    `);

    // 17. Seed Initial Retailers, Contacts, Assortment, Stock, Visits, Follow-ups
    const orgId = 'org-jyotsvan-corp';
    const retCountRes = await client.query('SELECT count(*) FROM retailers WHERE organization_id = $1', [orgId]);
    const existingRetCount = parseInt(retCountRes.rows[0]?.count || '0', 10);

    if (existingRetCount === 0) {
      console.log('[Phase 17 Migration] Seeding enterprise retailers, mappings, channel stock, visits & follow-ups...');

      // A. Seed Retailers
      const seedRetailers = [
        {
          id: 'ret-mumbai-01',
          code: 'RET-MUM-01',
          legalName: 'Kisan Krishi Seva Kendra',
          displayName: 'Kisan Krishi Kendra (Dadar West)',
          retailerType: 'agro_input_shop',
          status: 'active',
          gstin: '27AAAAA0000A1Z5',
          pan: 'AAAAA0000A',
          phone: '+91 98201 22334',
          email: 'kisankrishi.dadar@gmail.com',
          registeredAddress: 'Shop 4, Market Yard, Senapati Bapat Marg, Dadar West',
          city: 'Mumbai',
          district: 'Mumbai City',
          state: 'Maharashtra',
          pincode: '400028',
          region: 'West',
          territoryId: 'terr-west-mumbai',
          distributorId: 'dist-mumbai-01',
          cfId: 'cf-mumbai-01',
          creditLimit: 300000,
          paymentTermsDays: 15,
          discountPercent: 3.5,
          salespersonId: 'usr-operations-manager',
          salespersonName: 'Vikram Joshi (Sr. Sales Officer)',
        },
        {
          id: 'ret-pune-01',
          code: 'RET-PUN-01',
          legalName: 'Sahyadri Agro Agrotech Traders',
          displayName: 'Sahyadri Agro Traders (Hadapsar)',
          retailerType: 'dealer_outlet',
          status: 'active',
          gstin: '27BBBBB1111B2Z6',
          pan: 'BBBBB1111B',
          phone: '+91 98220 44556',
          email: 'sahyadri.hadapsar@sahyadriagro.in',
          registeredAddress: 'Gala 12, APMC Market Yard, Hadapsar',
          city: 'Pune',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '411028',
          region: 'West',
          territoryId: 'terr-west-pune',
          distributorId: 'dist-pune-01',
          cfId: 'cf-mumbai-01',
          creditLimit: 250000,
          paymentTermsDays: 21,
          discountPercent: 4.0,
          salespersonId: 'usr-operations-manager',
          salespersonName: 'Vikram Joshi (Sr. Sales Officer)',
        },
        {
          id: 'ret-delhi-01',
          code: 'RET-DL-01',
          legalName: 'Capital Green Agro Agencies',
          displayName: 'Capital Green Agro (Azadpur Mandi)',
          retailerType: 'specialty_store',
          status: 'active',
          gstin: '07CCCCC2222C3Z7',
          pan: 'CCCCC2222C',
          phone: '+91 98110 33445',
          email: 'capitalgreen.azadpur@gmail.com',
          registeredAddress: 'Shop B-88, New Subzi Mandi, Azadpur',
          city: 'Delhi',
          district: 'North Delhi',
          state: 'Delhi',
          pincode: '110033',
          region: 'North',
          territoryId: 'terr-north-delhi',
          distributorId: 'dist-delhi-01',
          cfId: 'cf-delhi-01',
          creditLimit: 400000,
          paymentTermsDays: 14,
          discountPercent: 3.0,
          salespersonId: 'usr-super-admin',
          salespersonName: 'Sunil Panigrahy (Executive Director)',
        },
        {
          id: 'ret-blr-01',
          code: 'RET-BLR-01',
          legalName: 'Sri Balaji Agro Inputs & Seeds',
          displayName: 'Sri Balaji Agro Inputs (Yeshwanthpur)',
          retailerType: 'agricultural_retailer',
          status: 'active',
          gstin: '29DDDDD3333D4Z8',
          pan: 'DDDDD3333D',
          phone: '+91 98450 66778',
          email: 'balajiagro.blr@gmail.com',
          registeredAddress: '14/2, 1st Main Road, APMC Yard, Yeshwanthpur',
          city: 'Bengaluru',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          pincode: '560022',
          region: 'South',
          territoryId: 'terr-south-blr',
          distributorId: 'dist-blr-01',
          cfId: 'cf-bengaluru-01',
          creditLimit: 350000,
          paymentTermsDays: 30,
          discountPercent: 4.5,
          salespersonId: 'usr-operations-manager',
          salespersonName: 'Vikram Joshi (Sr. Sales Officer)',
        },
        {
          id: 'ret-bbs-01',
          code: 'RET-BBS-01',
          legalName: 'Utkal Krushak Samabay Samiti Store',
          displayName: 'Utkal Krushak Store (Nayapalli)',
          retailerType: 'cooperative_society',
          status: 'active',
          gstin: '21EEEEE4444E5Z9',
          pan: 'EEEEE4444E',
          phone: '+91 94370 88990',
          email: 'utkal.krushak.nayapalli@gmail.com',
          registeredAddress: 'Plot 104, VIP Area, Nayapalli',
          city: 'Bhubaneswar',
          district: 'Khurda',
          state: 'Odisha',
          pincode: '751012',
          region: 'East',
          territoryId: 'terr-east-bhubaneswar',
          distributorId: 'dist-bbsr-01',
          cfId: 'cf-odisha-01',
          creditLimit: 200000,
          paymentTermsDays: 15,
          discountPercent: 3.0,
          salespersonId: 'usr-super-admin',
          salespersonName: 'Sunil Panigrahy (Executive Director)',
        },
        {
          id: 'ret-kol-01',
          code: 'RET-KOL-01',
          legalName: 'Bengal Bio Inputs & Agro Agency',
          displayName: 'Bengal Bio Inputs (Barasat)',
          retailerType: 'agro_input_shop',
          status: 'active',
          gstin: '19FFFFF5555F6Z0',
          pan: 'FFFFF5555F',
          phone: '+91 98300 77889',
          email: 'bengalbio.barasat@gmail.com',
          registeredAddress: 'K.N.C. Road, Champadali More, Barasat',
          city: 'Kolkata',
          district: 'North 24 Parganas',
          state: 'West Bengal',
          pincode: '700124',
          region: 'East',
          territoryId: 'terr-east-kolkata',
          distributorId: 'dist-bbsr-01',
          cfId: 'cf-odisha-01',
          creditLimit: 180000,
          paymentTermsDays: 14,
          discountPercent: 2.5,
          salespersonId: 'usr-operations-manager',
          salespersonName: 'Vikram Joshi (Sr. Sales Officer)',
        },
      ];

      for (const r of seedRetailers) {
        await client.query(`
          INSERT INTO retailers (
            id, organization_id, retailer_code, legal_name, display_name, retailer_type, status,
            gstin, pan, phone, email, registered_address, operational_address, city, district, state, pincode, country,
            territory_id, region, primary_distributor_id, cf_id, appointed_date, agreement_start_date, agreement_end_date,
            credit_limit, payment_terms_days, agreed_discount_percent, warning_threshold, credit_hold,
            assigned_salesperson_id, assigned_salesperson_name, notes, created_by, created_by_email
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $12, $13, $14, $15, $16, 'India',
            $17, $18, $19, $20, NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days', NOW() + INTERVAL '245 days',
            $21, $22, $23, 80.0, FALSE,
            $24, $25, 'Standard retail partner counter with verified GSTIN and regular monthly order velocity.', 'usr-super-admin', 'admin@jyotsvan.enterprise'
          )
          ON CONFLICT (organization_id, retailer_code) DO NOTHING;
        `, [
          r.id, orgId, r.code, r.legalName, r.displayName, r.retailerType, r.status,
          r.gstin, r.pan, r.phone, r.email, r.registeredAddress, r.city, r.district, r.state, r.pincode,
          r.territoryId, r.region, r.distributorId, r.cfId,
          r.creditLimit, r.paymentTermsDays, r.discountPercent,
          r.salespersonId, r.salespersonName
        ]);

        // Primary Contact
        await client.query(`
          INSERT INTO retailer_contacts (
            id, organization_id, retailer_id, name, designation, phone, email, preferred_contact_method, is_primary, status
          ) VALUES (
            $1, $2, $3, $4, 'Owner & Proprietor', $5, $6, 'phone', TRUE, 'active'
          ) ON CONFLICT (id) DO NOTHING;
        `, [`cont-${r.id}-owner`, orgId, r.id, r.legalName.split(' ')[0] + ' Proprietor', r.phone, r.email]);

        // Address
        await client.query(`
          INSERT INTO retailer_addresses (
            id, organization_id, retailer_id, address_type, address_line1, city, district, state, postal_code, country, gstin, is_primary
          ) VALUES (
            $1, $2, $3, 'store', $4, $5, $6, $7, $8, 'India', $9, TRUE
          ) ON CONFLICT (id) DO NOTHING;
        `, [`addr-${r.id}-store`, orgId, r.id, r.registeredAddress, r.city, r.district, r.state, r.pincode, r.gstin]);

        // Distributor Mapping
        if (r.distributorId) {
          await client.query(`
            INSERT INTO retailer_distributor_mappings (
              id, organization_id, retailer_id, distributor_id, effective_from, is_preferred, priority_rank, status, territory_id, notes
            ) VALUES (
              $1, $2, $3, $4, NOW() - INTERVAL '120 days', TRUE, 1, 'active', $5, 'Primary territorial distributor mapping.'
            ) ON CONFLICT (retailer_id, distributor_id) DO NOTHING;
          `, [`map-${r.id}-${r.distributorId}`, orgId, r.id, r.distributorId, r.territoryId]);
        }

        // Salesperson Assignment
        if (r.salespersonId) {
          await client.query(`
            INSERT INTO retailer_salesperson_assignments (
              id, organization_id, retailer_id, user_id, user_name, role, effective_from, is_primary, status, notes
            ) VALUES (
              $1, $2, $3, $4, $5, 'Territory Sales Executive', NOW() - INTERVAL '120 days', TRUE, 'active', 'Primary beat coverage assignment.'
            ) ON CONFLICT (id) DO NOTHING;
          `, [`sales-${r.id}-${r.salespersonId}`, orgId, r.id, r.salespersonId, r.salespersonName]);
        }

        // Commercial Terms
        await client.query(`
          INSERT INTO retailer_commercial_terms (
            id, organization_id, retailer_id, price_list_type, payment_terms_days, credit_limit, warning_threshold, credit_hold, agreed_discount_percent, order_terms, delivery_terms
          ) VALUES (
            $1, $2, $3, 'retail_standard', $4, $5, 80.0, FALSE, $6, 'Minimum order quantity 10 units per SKU.', 'Standard distributor delivery within 48 hours of booking.'
          ) ON CONFLICT (id) DO NOTHING;
        `, [`terms-${r.id}`, orgId, r.id, r.paymentTermsDays, r.creditLimit, r.discountPercent]);
      }

      // Fetch sample SKUs and Batches for Assortment & Channel Stock
      const skusRes = await client.query(`SELECT id, sku, variant_name as name, cost_price FROM skus WHERE organization_id = $1 LIMIT 5`, [orgId]);
      const batchesRes = await client.query(`SELECT id, batch_number, sku_id FROM batches WHERE organization_id = $1 LIMIT 5`, [orgId]);

      if (skusRes.rows.length > 0) {
        for (const r of seedRetailers) {
          for (let i = 0; i < Math.min(3, skusRes.rows.length); i++) {
            const sku = skusRes.rows[i];
            // Assortment
            await client.query(`
              INSERT INTO retailer_assortments (
                id, organization_id, retailer_id, sku_id, status, minimum_order_quantity, target_stock, preferred_pack_size, agreed_price_basis
              ) VALUES (
                $1, $2, $3, $4, 'active', 5, 30, 1, $5
              ) ON CONFLICT (retailer_id, sku_id) DO NOTHING;
            `, [`assort-${r.id}-${sku.id}`, orgId, r.id, sku.id, Number(sku.cost_price || 250) * 1.15]);

            // Retailer Stock
            const matchingBatch = batchesRes.rows.find(b => b.sku_id === sku.id) || batchesRes.rows[0];
            const batchNum = matchingBatch ? matchingBatch.batch_number : `BAT-RET-${r.code}-${i+1}`;
            const batchId = matchingBatch ? matchingBatch.id : null;
            const qty = 15 + i * 10;

            await client.query(`
              INSERT INTO retailer_stock (
                id, organization_id, retailer_id, sku_id, batch_id, batch_number, quantity_on_hand, quantity_available, quantity_reserved, quantity_damaged, quantity_quarantine, unit_cost, source_distributor_id, source_cf_id, last_inward_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $7, 0, 0, 0, $8, $9, $10, NOW() - INTERVAL '15 days'
              ) ON CONFLICT (retailer_id, sku_id, batch_number) DO NOTHING;
            `, [
              `stk-${r.id}-${sku.id}-${i}`,
              orgId,
              r.id,
              sku.id,
              batchId,
              batchNum,
              qty,
              sku.cost_price || 250,
              r.distributorId,
              r.cfId
            ]);
          }

          // Retailer Receiving Record
          const firstSku = skusRes.rows[0];
          await client.query(`
            INSERT INTO retailer_receiving_records (
              id, organization_id, retailer_id, distributor_id, distributor_dispatch_reference, sku_id, batch_number, dispatched_quantity, received_quantity, shortage_quantity, damaged_quantity, rejected_quantity, unit_cost, receiving_date, notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6, 'BAT-SAMPLE-01', 30, 30, 0, 0, 0, $7, NOW() - INTERVAL '15 days', 'Received in full without transit damages.'
            ) ON CONFLICT (id) DO NOTHING;
          `, [
            `recv-${r.id}-01`,
            orgId,
            r.id,
            r.distributorId || 'dist-mumbai-01',
            `DISP-DIST-${r.code}-001`,
            firstSku.id,
            firstSku.cost_price || 250
          ]);

          // Retailer Order Request
          const ordId = `ret-ord-${r.code}-01`;
          await client.query(`
            INSERT INTO retailer_order_requests (
              id, organization_id, order_number, retailer_id, distributor_id, status, requested_date, requested_delivery_date, total_items_count, total_quantity, total_estimated_amount, notes, created_by
            ) VALUES (
              $1, $2, $3, $4, $5, 'submitted', NOW() - INTERVAL '2 days', NOW() + INTERVAL '2 days', 2, 40, 12000, 'Weekly retail counter replenishment order request.', 'usr-super-admin'
            ) ON CONFLICT (organization_id, order_number) DO NOTHING;
          `, [ordId, orgId, `ROR-${r.code}-2026-001`, r.id, r.distributorId || 'dist-mumbai-01']);

          await client.query(`
            INSERT INTO retailer_order_request_items (
              id, order_id, sku_id, requested_quantity, approved_quantity, uom, unit_cost, total_price, notes
            ) VALUES (
              $1, $2, $3, 20, 0, 'PCS', $4, $5, 'Standard retail pack'
            ) ON CONFLICT (id) DO NOTHING;
          `, [`item-${ordId}-1`, ordId, firstSku.id, firstSku.cost_price || 250, (firstSku.cost_price || 250) * 20]);

          // Retailer Return
          await client.query(`
            INSERT INTO retailer_returns (
              id, organization_id, return_number, retailer_id, distributor_id, sku_id, batch_number, quantity, reason, status, reference, notes, created_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, 'BAT-EXP-OLD', 2, 'damaged', 'requested', 'RET-CLAIM-01', 'Seal damage reported during unpackaging.', 'usr-super-admin'
            ) ON CONFLICT (organization_id, return_number) DO NOTHING;
          `, [`ret-claim-${r.code}-01`, orgId, `RRT-${r.code}-001`, r.id, r.distributorId || 'dist-mumbai-01', firstSku.id]);

          // Retailer Visit
          const visitId = `visit-${r.id}-01`;
          await client.query(`
            INSERT INTO retailer_visits (
              id, organization_id, retailer_id, salesperson_id, salesperson_name, visit_date, purpose, notes, outcome, next_follow_up_date
            ) VALUES (
              $1, $2, $3, $4, $5, NOW() - INTERVAL '5 days', 'routine_order_booking', 'Reviewed on-shelf stock levels and took replenishment booking.', 'Order booked successfully; merchant interested in upcoming bio-stimulant campaign.', NOW() + INTERVAL '7 days'
            ) ON CONFLICT (id) DO NOTHING;
          `, [visitId, orgId, r.id, r.salespersonId, r.salespersonName]);

          // Retailer Follow-up
          await client.query(`
            INSERT INTO retailer_follow_ups (
              id, organization_id, retailer_id, visit_id, assigned_user_id, assigned_user_name, due_date, priority, subject, notes, status
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW() + INTERVAL '3 days', 'high', 'Deliver promotional POP banners & sample packs', 'Provide display stands and product brochures before weekend farmer footfall.', 'open'
            ) ON CONFLICT (id) DO NOTHING;
          `, [`fup-${r.id}-01`, orgId, r.id, visitId, r.salespersonId, r.salespersonName]);
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 17 Migration] Retailer Management Engine schema and foundation records initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 17 Migration] Retailer schema migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}
