import { pool } from './db.ts';

export async function runSupplierMasterMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    console.log('[Phase 7 Migration] Initializing Supplier Master Schema...');

    // 1. Suppliers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        supplier_code VARCHAR(64) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255),
        display_name VARCHAR(255),
        supplier_type VARCHAR(64) NOT NULL DEFAULT 'raw_material',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        registration_number VARCHAR(128),
        tax_id VARCHAR(64),
        pan_number VARCHAR(64),
        tax_registration_status VARCHAR(64) DEFAULT 'registered',
        website VARCHAR(255),
        industry VARCHAR(128),
        notes TEXT,
        primary_email VARCHAR(255),
        primary_phone VARCHAR(64),
        alternate_phone VARCHAR(64),
        address_line_1 TEXT,
        address_line_2 TEXT,
        city VARCHAR(128),
        state VARCHAR(128),
        postal_code VARCHAR(32),
        country VARCHAR(64) DEFAULT 'India',
        payment_terms VARCHAR(64) DEFAULT 'net_30',
        default_currency VARCHAR(8) DEFAULT 'INR',
        credit_limit NUMERIC(14, 2) DEFAULT 0,
        lead_time_days INTEGER DEFAULT 14,
        minimum_order_value NUMERIC(14, 2) DEFAULT 0,
        rating_status VARCHAR(32) DEFAULT 'standard',
        rating_notes TEXT,
        bank_name VARCHAR(128),
        bank_account_holder VARCHAR(255),
        bank_account_number VARCHAR(128),
        bank_ifsc VARCHAR(64),
        bank_branch VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_supplier_code UNIQUE (organization_id, supplier_code),
        CONSTRAINT chk_supplier_lead_time CHECK (lead_time_days >= 0),
        CONSTRAINT chk_supplier_credit_limit CHECK (credit_limit >= 0),
        CONSTRAINT chk_supplier_mov CHECK (minimum_order_value >= 0)
      );
    `);

    // Indexes on suppliers
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_org_status ON suppliers (organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers (supplier_type);
      CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers (supplier_code);
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (supplier_name);
    `);

    // 2. Supplier Contacts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_contacts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(128),
        department VARCHAR(128),
        email VARCHAR(255),
        phone VARCHAR(64),
        alternate_phone VARCHAR(64),
        is_primary BOOLEAN DEFAULT FALSE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sup_contacts_supplier ON supplier_contacts (supplier_id);
      CREATE INDEX IF NOT EXISTS idx_sup_contacts_org ON supplier_contacts (organization_id);
    `);

    // 3. Supplier Addresses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_addresses (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        address_type VARCHAR(64) NOT NULL DEFAULT 'registered',
        address_line_1 TEXT NOT NULL,
        address_line_2 TEXT,
        city VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        postal_code VARCHAR(32) NOT NULL,
        country VARCHAR(64) DEFAULT 'India' NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sup_addresses_supplier ON supplier_addresses (supplier_id);
      CREATE INDEX IF NOT EXISTS idx_sup_addresses_org ON supplier_addresses (organization_id);
    `);

    // 4. Supplier SKUs (Many-to-Many with canonical Jyotsvan SKUs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_skus (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        supplier_product_code VARCHAR(128),
        supplier_product_name VARCHAR(255),
        supplier_description TEXT,
        lead_time_days INTEGER,
        minimum_order_quantity NUMERIC(12, 3) DEFAULT 1 NOT NULL,
        preferred_supplier BOOLEAN DEFAULT FALSE NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_supplier_sku UNIQUE (organization_id, supplier_id, sku_id),
        CONSTRAINT chk_sup_sku_moq CHECK (minimum_order_quantity >= 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sup_skus_supplier ON supplier_skus (supplier_id);
      CREATE INDEX IF NOT EXISTS idx_sup_skus_sku ON supplier_skus (sku_id);
      CREATE INDEX IF NOT EXISTS idx_sup_skus_org ON supplier_skus (organization_id);
    `);

    // 5. Supplier Prices (Historical & Active Pricing)
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_prices (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        supplier_sku_id VARCHAR(64) REFERENCES supplier_skus(id) ON DELETE CASCADE,
        price NUMERIC(14, 2) NOT NULL,
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        minimum_order_quantity NUMERIC(12, 3) DEFAULT 1 NOT NULL,
        price_unit VARCHAR(32) DEFAULT 'unit' NOT NULL,
        effective_from DATE DEFAULT CURRENT_DATE NOT NULL,
        effective_to DATE,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT chk_sup_price_positive CHECK (price >= 0),
        CONSTRAINT chk_sup_price_moq CHECK (minimum_order_quantity >= 0),
        CONSTRAINT chk_sup_price_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sup_prices_supplier ON supplier_prices (supplier_id);
      CREATE INDEX IF NOT EXISTS idx_sup_prices_sku ON supplier_prices (sku_id);
      CREATE INDEX IF NOT EXISTS idx_sup_prices_dates ON supplier_prices (effective_from, effective_to);
    `);

    // 6. Supplier Documents Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        document_type VARCHAR(64) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(128),
        storage_path TEXT NOT NULL,
        public_url TEXT,
        valid_until DATE,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sup_docs_supplier ON supplier_documents (supplier_id);
    `);

    // 7. Seed RBAC Permissions for Suppliers
    const supplierPermissions = [
      { id: 'perm-sup-01', code: 'suppliers.view', module: 'suppliers', description: 'View supplier master directory and overview' },
      { id: 'perm-sup-02', code: 'suppliers.create', module: 'suppliers', description: 'Create and register new vendor suppliers' },
      { id: 'perm-sup-03', code: 'suppliers.edit', module: 'suppliers', description: 'Edit supplier profiles, metadata, and terms' },
      { id: 'perm-sup-04', code: 'suppliers.delete', module: 'suppliers', description: 'Delete or archive inactive supplier records' },
      { id: 'perm-sup-05', code: 'suppliers.archive', module: 'suppliers', description: 'Archive suppliers and historical mappings' },
      { id: 'perm-sup-06', code: 'suppliers.export', module: 'suppliers', description: 'Export supplier master data to CSV/Excel' },
      { id: 'perm-sup-07', code: 'supplier_contacts.view', module: 'suppliers', description: 'View supplier contact directory' },
      { id: 'perm-sup-08', code: 'supplier_contacts.create', module: 'suppliers', description: 'Add new supplier representative contacts' },
      { id: 'perm-sup-09', code: 'supplier_contacts.edit', module: 'suppliers', description: 'Update supplier contact details and primary flags' },
      { id: 'perm-sup-10', code: 'supplier_contacts.delete', module: 'suppliers', description: 'Remove or deactivate supplier contacts' },
      { id: 'perm-sup-11', code: 'supplier_products.view', module: 'suppliers', description: 'View supplier SKU linkages and catalogs' },
      { id: 'perm-sup-12', code: 'supplier_products.create', module: 'suppliers', description: 'Map canonical Jyotsvan SKUs to suppliers' },
      { id: 'perm-sup-13', code: 'supplier_products.edit', module: 'suppliers', description: 'Edit supplier product codes, lead times, and preferred flags' },
      { id: 'perm-sup-14', code: 'supplier_products.delete', module: 'suppliers', description: 'Unlink SKU relationships from suppliers' },
      { id: 'perm-sup-15', code: 'supplier_pricing.view', module: 'suppliers', description: 'View supplier price books and historical rates' },
      { id: 'perm-sup-16', code: 'supplier_pricing.create', module: 'suppliers', description: 'Create supplier price quotes and effective periods' },
      { id: 'perm-sup-17', code: 'supplier_pricing.edit', module: 'suppliers', description: 'Modify active supplier pricing records' },
      { id: 'perm-sup-18', code: 'supplier_pricing.delete', module: 'suppliers', description: 'Deactivate supplier price entries' },
      { id: 'perm-sup-19', code: 'supplier_documents.view', module: 'suppliers', description: 'Access supplier compliance documents and agreements' },
      { id: 'perm-sup-20', code: 'supplier_documents.create', module: 'suppliers', description: 'Upload vendor certificates, agreements, and NDAs' },
      { id: 'perm-sup-21', code: 'supplier_documents.delete', module: 'suppliers', description: 'Delete or archive vendor documents' },
      { id: 'perm-sup-22', code: 'supplier_sensitive_data.view', module: 'suppliers', description: 'View unmasked supplier bank account details and sensitive tax data' }
    ];

    for (const p of supplierPermissions) {
      await client.query(`
        INSERT INTO permissions (id, code, module, description, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET 
          code = EXCLUDED.code,
          module = EXCLUDED.module,
          description = EXCLUDED.description;
      `, [p.id, p.code, p.module, p.description]);
    }

    // Assign to roles: Super Admin, Purchase Manager, Management, Production Manager, Finance
    const rolePermissionMappings = [
      // Super Admin gets all
      ...supplierPermissions.map(p => ({ roleId: 'role-super-admin', permId: p.id })),
      // Purchase Manager gets all
      ...supplierPermissions.map(p => ({ roleId: 'role-purchase-manager', permId: p.id })),
      // Management gets view and export and sensitive data
      { roleId: 'role-management', permId: 'perm-sup-01' },
      { roleId: 'role-management', permId: 'perm-sup-06' },
      { roleId: 'role-management', permId: 'perm-sup-07' },
      { roleId: 'role-management', permId: 'perm-sup-11' },
      { roleId: 'role-management', permId: 'perm-sup-15' },
      { roleId: 'role-management', permId: 'perm-sup-19' },
      { roleId: 'role-management', permId: 'perm-sup-22' },
      // Production Manager gets view SKUs and pricing
      { roleId: 'role-production-manager', permId: 'perm-sup-01' },
      { roleId: 'role-production-manager', permId: 'perm-sup-07' },
      { roleId: 'role-production-manager', permId: 'perm-sup-11' },
      { roleId: 'role-production-manager', permId: 'perm-sup-15' },
      // Finance gets view & sensitive data
      { roleId: 'role-finance', permId: 'perm-sup-01' },
      { roleId: 'role-finance', permId: 'perm-sup-15' },
      { roleId: 'role-finance', permId: 'perm-sup-22' },
    ];

    for (const rpm of rolePermissionMappings) {
      const rpId = `rp-${rpm.roleId.replace('role-', '')}-${rpm.permId}`;
      await client.query(`
        INSERT INTO role_permissions (id, role_id, permission_id, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [rpId, rpm.roleId, rpm.permId]);
    }

    // 8. Seed Initial Canonical Suppliers for Jyotsvan
    const orgId = 'org-jyotsvan-corp';
    const initialSuppliers = [
      {
        id: 'sup-001',
        supplier_code: 'SUP-001',
        supplier_name: 'Bharat Steel & Precision Alloys Pvt Ltd',
        legal_name: 'Bharat Steel & Precision Alloys Private Limited',
        display_name: 'Bharat Steel',
        supplier_type: 'raw_material',
        status: 'active',
        registration_number: 'U27100MH2012PTC234891',
        tax_id: '27AAACB1234F1Z5',
        pan_number: 'AAACB1234F',
        tax_registration_status: 'registered',
        website: 'https://bharatsteel-alloys.example.com',
        industry: 'Metals & Metallurgy',
        notes: 'Primary supplier for Stainless Steel Grade 316L and structural alloy sheets with certified mill test certificates.',
        primary_email: 'procurement@bharatsteel.example.com',
        primary_phone: '+91 22 4589 1200',
        alternate_phone: '+91 98200 11223',
        address_line_1: 'Plot 42, MIDC Industrial Area, Taloja',
        address_line_2: 'Phase II, Navi Mumbai',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        postal_code: '410208',
        country: 'India',
        payment_terms: 'net_30',
        default_currency: 'INR',
        credit_limit: 2500000.00,
        lead_time_days: 10,
        minimum_order_value: 50000.00,
        rating_status: 'preferred',
        rating_notes: 'ISO 9001:2015 certified. Consistently 99.4% on-time delivery.',
        bank_name: 'HDFC Bank Ltd',
        bank_account_holder: 'Bharat Steel & Precision Alloys Pvt Ltd',
        bank_account_number: '50200012345678',
        bank_ifsc: 'HDFC0001234',
        bank_branch: 'Taloja Industrial Branch'
      },
      {
        id: 'sup-002',
        supplier_code: 'SUP-002',
        supplier_name: 'Apex Fluid Mechanics & Hydraulics Ltd',
        legal_name: 'Apex Fluid Mechanics and Hydraulics Limited',
        display_name: 'Apex Fluid Mechanics',
        supplier_type: 'equipment',
        status: 'active',
        registration_number: 'L29100GJ2008PLC054321',
        tax_id: '24AAACA9876E1Z2',
        pan_number: 'AAACA9876E',
        tax_registration_status: 'registered',
        website: 'https://apexhydraulics.example.com',
        industry: 'Industrial Machinery & Fluid Power',
        notes: 'Manufacturer of high-pressure industrial pumps, cryogenic control valves, and hydraulic power units.',
        primary_email: 'sales@apexhydraulics.example.com',
        primary_phone: '+91 79 6789 4321',
        alternate_phone: '+91 98790 44556',
        address_line_1: 'GIDC Industrial Estate, Sector 28',
        address_line_2: 'Near Electronic Zone',
        city: 'Gandhinagar',
        state: 'Gujarat',
        postal_code: '382028',
        country: 'India',
        payment_terms: 'net_45',
        default_currency: 'INR',
        credit_limit: 5000000.00,
        lead_time_days: 15,
        minimum_order_value: 100000.00,
        rating_status: 'approved',
        rating_notes: 'CE & ATEX certified components. High engineering fidelity.',
        bank_name: 'State Bank of India',
        bank_account_holder: 'Apex Fluid Mechanics and Hydraulics Limited',
        bank_account_number: '31098765432',
        bank_ifsc: 'SBIN0004567',
        bank_branch: 'Gandhinagar Commercial Branch'
      },
      {
        id: 'sup-003',
        supplier_code: 'SUP-003',
        supplier_name: 'PackTech Polymers & Containers Ltd',
        legal_name: 'PackTech Polymers and Containers Limited',
        display_name: 'PackTech Polymers',
        supplier_type: 'packaging',
        status: 'active',
        registration_number: 'U25200KA2015PLC089123',
        tax_id: '29AAACP5432B1Z8',
        pan_number: 'AAACP5432B',
        tax_registration_status: 'registered',
        website: 'https://packtechpolymers.example.com',
        industry: 'Polymer Packaging',
        notes: 'High-density polyethylene (HDPE) chemical barrels, tamper-evident seals, and corrugated multi-tier shipper cartons.',
        primary_email: 'orders@packtechpolymers.example.com',
        primary_phone: '+91 80 2839 5500',
        alternate_phone: '+91 99001 88776',
        address_line_1: 'Plot 118, Peenya Industrial Area, 3rd Phase',
        address_line_2: 'Near Ring Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: '560058',
        country: 'India',
        payment_terms: 'net_30',
        default_currency: 'INR',
        credit_limit: 1500000.00,
        lead_time_days: 7,
        minimum_order_value: 25000.00,
        rating_status: 'preferred',
        rating_notes: 'UN approved hazardous material packaging certification.',
        bank_name: 'ICICI Bank Ltd',
        bank_account_holder: 'PackTech Polymers and Containers Limited',
        bank_account_number: '000205012345',
        bank_ifsc: 'ICIC0000002',
        bank_branch: 'Peenya Industrial Branch'
      },
      {
        id: 'sup-004',
        supplier_code: 'SUP-004',
        supplier_name: 'Sterling Reagents & Industrial Chemicals',
        legal_name: 'Sterling Reagents and Industrial Chemicals Corporation',
        display_name: 'Sterling Chemicals',
        supplier_type: 'chemical',
        status: 'active',
        registration_number: 'U24110DL2018PTC334512',
        tax_id: '07AAACS6789D1Z4',
        pan_number: 'AAACS6789D',
        tax_registration_status: 'registered',
        website: 'https://sterlingchemicals.example.com',
        industry: 'Specialty Chemicals & Solvents',
        notes: 'Industrial hydraulic lubricants, degreasers, and surface passivation chemical compounds.',
        primary_email: 'supply@sterlingchemicals.example.com',
        primary_phone: '+91 11 4152 7700',
        alternate_phone: '+91 98110 33445',
        address_line_1: 'B-24, Okhla Industrial Area, Phase I',
        address_line_2: 'New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        postal_code: '110020',
        country: 'India',
        payment_terms: 'advance',
        default_currency: 'INR',
        credit_limit: 800000.00,
        lead_time_days: 5,
        minimum_order_value: 20000.00,
        rating_status: 'conditional',
        rating_notes: 'Strict batch COA required with every delivery.',
        bank_name: 'Axis Bank Ltd',
        bank_account_holder: 'Sterling Reagents and Industrial Chemicals Corp',
        bank_account_number: '918020034567890',
        bank_ifsc: 'UTIB0000123',
        bank_branch: 'Okhla Phase I Branch'
      }
    ];

    for (const sup of initialSuppliers) {
      await client.query(`
        INSERT INTO suppliers (
          id, organization_id, supplier_code, supplier_name, legal_name, display_name,
          supplier_type, status, registration_number, tax_id, pan_number, tax_registration_status,
          website, industry, notes, primary_email, primary_phone, alternate_phone,
          address_line_1, address_line_2, city, state, postal_code, country,
          payment_terms, default_currency, credit_limit, lead_time_days, minimum_order_value,
          rating_status, rating_notes, bank_name, bank_account_holder, bank_account_number, bank_ifsc, bank_branch,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36,
          NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          supplier_name = EXCLUDED.supplier_name,
          legal_name = EXCLUDED.legal_name,
          supplier_type = EXCLUDED.supplier_type,
          status = EXCLUDED.status,
          primary_email = EXCLUDED.primary_email,
          primary_phone = EXCLUDED.primary_phone,
          tax_id = EXCLUDED.tax_id,
          pan_number = EXCLUDED.pan_number,
          payment_terms = EXCLUDED.payment_terms,
          credit_limit = EXCLUDED.credit_limit,
          lead_time_days = EXCLUDED.lead_time_days,
          bank_name = EXCLUDED.bank_name,
          bank_account_number = EXCLUDED.bank_account_number,
          bank_ifsc = EXCLUDED.bank_ifsc,
          updated_at = NOW();
      `, [
        sup.id, orgId, sup.supplier_code, sup.supplier_name, sup.legal_name, sup.display_name,
        sup.supplier_type, sup.status, sup.registration_number, sup.tax_id, sup.pan_number, sup.tax_registration_status,
        sup.website, sup.industry, sup.notes, sup.primary_email, sup.primary_phone, sup.alternate_phone,
        sup.address_line_1, sup.address_line_2, sup.city, sup.state, sup.postal_code, sup.country,
        sup.payment_terms, sup.default_currency, sup.credit_limit, sup.lead_time_days, sup.minimum_order_value,
        sup.rating_status, sup.rating_notes, sup.bank_name, sup.bank_account_holder, sup.bank_account_number, sup.bank_ifsc, sup.bank_branch
      ]);
    }

    // 9. Seed Supplier Contacts
    const initialContacts = [
      {
        id: 'cnt-01',
        supplier_id: 'sup-001',
        name: 'Rajesh Sharma',
        designation: 'VP of Industrial Sales',
        department: 'Commercial Sales',
        email: 'rajesh.sharma@bharatsteel.example.com',
        phone: '+91 98200 11223',
        is_primary: true,
        status: 'active'
      },
      {
        id: 'cnt-02',
        supplier_id: 'sup-001',
        name: 'Sunita Deshmukh',
        designation: 'Head of Quality Assurance & MTC',
        department: 'Quality & Testing',
        email: 'qa.cert@bharatsteel.example.com',
        phone: '+91 98200 44556',
        is_primary: false,
        status: 'active'
      },
      {
        id: 'cnt-03',
        supplier_id: 'sup-002',
        name: 'Karan Patel',
        designation: 'Director of Technical Accounts',
        department: 'OEM Engineering',
        email: 'karan.patel@apexhydraulics.example.com',
        phone: '+91 98790 44556',
        is_primary: true,
        status: 'active'
      },
      {
        id: 'cnt-04',
        supplier_id: 'sup-003',
        name: 'Ananya Hegde',
        designation: 'Key Account Executive',
        department: 'Industrial Packaging Solutions',
        email: 'ananya.hegde@packtechpolymers.example.com',
        phone: '+91 99001 88776',
        is_primary: true,
        status: 'active'
      }
    ];

    for (const cnt of initialContacts) {
      await client.query(`
        INSERT INTO supplier_contacts (
          id, organization_id, supplier_id, name, designation, department,
          email, phone, is_primary, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [cnt.id, orgId, cnt.supplier_id, cnt.name, cnt.designation, cnt.department, cnt.email, cnt.phone, cnt.is_primary, cnt.status]);
    }

    // 10. Seed Supplier Addresses
    const initialAddresses = [
      {
        id: 'addr-01',
        supplier_id: 'sup-001',
        address_type: 'registered',
        address_line_1: 'Plot 42, MIDC Industrial Area, Taloja',
        address_line_2: 'Phase II',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        postal_code: '410208',
        country: 'India',
        is_primary: true
      },
      {
        id: 'addr-02',
        supplier_id: 'sup-001',
        address_type: 'factory',
        address_line_1: 'Steel Rolling Mill Unit 3, Khopoli-Pen Road',
        address_line_2: 'Taluka Khalapur',
        city: 'Khopoli',
        state: 'Maharashtra',
        postal_code: '410203',
        country: 'India',
        is_primary: false
      },
      {
        id: 'addr-03',
        supplier_id: 'sup-002',
        address_type: 'registered',
        address_line_1: 'GIDC Industrial Estate, Sector 28',
        address_line_2: 'Near Electronic Zone',
        city: 'Gandhinagar',
        state: 'Gujarat',
        postal_code: '382028',
        country: 'India',
        is_primary: true
      }
    ];

    for (const addr of initialAddresses) {
      await client.query(`
        INSERT INTO supplier_addresses (
          id, organization_id, supplier_id, address_type, address_line_1, address_line_2,
          city, state, postal_code, country, is_primary, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [addr.id, orgId, addr.supplier_id, addr.address_type, addr.address_line_1, addr.address_line_2, addr.city, addr.state, addr.postal_code, addr.country, addr.is_primary]);
    }

    // 11. Seed Supplier SKUs (Linking Canonical Jyotsvan SKUs)
    // Find canonical SKUs: sku-test-01 (JYT-PUMP-400), sku-prod-02 (JYT-VALV-80), sku-prod-03 (JYT-ST-AL316), sku-prod-04 (JYT-HDPE-DRUM)
    const initialSupplierSkus = [
      {
        id: 'sup-sku-01',
        supplier_id: 'sup-001',
        product_id: 'prod-03',
        sku_id: 'sku-prod-03',
        supplier_product_code: 'BSA-316L-SHT-10',
        supplier_product_name: 'SS 316L Cold Rolled Plate 10mm',
        supplier_description: 'Precision cold-rolled corrosion resistant austenitic stainless steel alloy sheets.',
        lead_time_days: 10,
        minimum_order_quantity: 50,
        preferred_supplier: true
      },
      {
        id: 'sup-sku-02',
        supplier_id: 'sup-002',
        product_id: 'prod-01',
        sku_id: 'sku-test-01',
        supplier_product_code: 'AFM-HYD-PUMP-400L',
        supplier_product_name: 'Heavy Industrial Hydraulic Pump Unit 400L',
        supplier_description: 'Triplex high-pressure hydraulic plunger pump with forged stainless steel fluid head.',
        lead_time_days: 14,
        minimum_order_quantity: 2,
        preferred_supplier: true
      },
      {
        id: 'sup-sku-03',
        supplier_id: 'sup-002',
        product_id: 'prod-02',
        sku_id: 'sku-prod-02',
        supplier_product_code: 'AFM-VALV-CRYO-80',
        supplier_product_name: 'Cryogenic Control Valve 80mm Flanged',
        supplier_description: 'Forged body cryogenic flow regulation valve with extended bonnet design.',
        lead_time_days: 12,
        minimum_order_quantity: 5,
        preferred_supplier: true
      },
      {
        id: 'sup-sku-04',
        supplier_id: 'sup-003',
        product_id: 'prod-04',
        sku_id: 'sku-prod-04',
        supplier_product_code: 'PTP-DRUM-HDPE-200',
        supplier_product_name: '200L High Molecular Weight HDPE Chemical Drum',
        supplier_description: 'UN-certified tight-head chemical drum with dual 2-inch bungs.',
        lead_time_days: 7,
        minimum_order_quantity: 20,
        preferred_supplier: true
      }
    ];

    for (const ss of initialSupplierSkus) {
      await client.query(`
        INSERT INTO supplier_skus (
          id, organization_id, supplier_id, product_id, sku_id, supplier_product_code,
          supplier_product_name, supplier_description, lead_time_days, minimum_order_quantity,
          preferred_supplier, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
        ON CONFLICT (organization_id, supplier_id, sku_id) DO UPDATE SET
          supplier_product_code = EXCLUDED.supplier_product_code,
          supplier_product_name = EXCLUDED.supplier_product_name,
          lead_time_days = EXCLUDED.lead_time_days,
          minimum_order_quantity = EXCLUDED.minimum_order_quantity,
          preferred_supplier = EXCLUDED.preferred_supplier;
      `, [ss.id, orgId, ss.supplier_id, ss.product_id, ss.sku_id, ss.supplier_product_code, ss.supplier_product_name, ss.supplier_description, ss.lead_time_days, ss.minimum_order_quantity, ss.preferred_supplier]);
    }

    // 12. Seed Supplier Pricing (Active & Historical)
    const initialPricing = [
      {
        id: 'prc-01',
        supplier_id: 'sup-001',
        sku_id: 'sku-prod-03',
        supplier_sku_id: 'sup-sku-01',
        price: 3450.00,
        currency: 'INR',
        minimum_order_quantity: 50,
        price_unit: 'sheet',
        effective_from: '2026-01-01',
        effective_to: '2026-03-31',
        status: 'expired',
        notes: 'Q1 2026 contract pricing tier'
      },
      {
        id: 'prc-02',
        supplier_id: 'sup-001',
        sku_id: 'sku-prod-03',
        supplier_sku_id: 'sup-sku-01',
        price: 3600.00,
        currency: 'INR',
        minimum_order_quantity: 50,
        price_unit: 'sheet',
        effective_from: '2026-04-01',
        effective_to: null,
        status: 'active',
        notes: 'Current contracted price after commodity nickel re-index'
      },
      {
        id: 'prc-03',
        supplier_id: 'sup-002',
        sku_id: 'sku-test-01',
        supplier_sku_id: 'sup-sku-02',
        price: 32500.00,
        currency: 'INR',
        minimum_order_quantity: 2,
        price_unit: 'unit',
        effective_from: '2026-01-01',
        effective_to: null,
        status: 'active',
        notes: 'Master annual rate contract (ARC)'
      },
      {
        id: 'prc-04',
        supplier_id: 'sup-002',
        sku_id: 'sku-prod-02',
        supplier_sku_id: 'sup-sku-03',
        price: 11200.00,
        currency: 'INR',
        minimum_order_quantity: 5,
        price_unit: 'unit',
        effective_from: '2026-01-01',
        effective_to: null,
        status: 'active',
        notes: 'Precision valve supply contract'
      },
      {
        id: 'prc-05',
        supplier_id: 'sup-003',
        sku_id: 'sku-prod-04',
        supplier_sku_id: 'sup-sku-04',
        price: 1850.00,
        currency: 'INR',
        minimum_order_quantity: 20,
        price_unit: 'barrel',
        effective_from: '2026-01-01',
        effective_to: null,
        status: 'active',
        notes: 'Standard polymer packaging bulk contract'
      }
    ];

    for (const pr of initialPricing) {
      await client.query(`
        INSERT INTO supplier_prices (
          id, organization_id, supplier_id, sku_id, supplier_sku_id, price,
          currency, minimum_order_quantity, price_unit, effective_from, effective_to,
          status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [pr.id, orgId, pr.supplier_id, pr.sku_id, pr.supplier_sku_id, pr.price, pr.currency, pr.minimum_order_quantity, pr.price_unit, pr.effective_from, pr.effective_to, pr.status, pr.notes]);
    }

    // 13. Seed Supplier Compliance Documents
    const initialDocuments = [
      {
        id: 'sup-doc-01',
        supplier_id: 'sup-001',
        title: 'ISO 9001:2015 Quality Management Certificate',
        document_type: 'certificate',
        file_name: 'BharatSteel_ISO_9001_Certificate.pdf',
        file_size: 1450000,
        mime_type: 'application/pdf',
        storage_path: 'suppliers/sup-001/BharatSteel_ISO_9001_Certificate.pdf',
        public_url: 'https://docs.jyotsvan.enterprise/storage/suppliers/sup-001/BharatSteel_ISO_9001_Certificate.pdf',
        valid_until: '2027-12-31',
        status: 'active'
      },
      {
        id: 'sup-doc-02',
        supplier_id: 'sup-001',
        title: 'Master Raw Material Supply & SLA Agreement (2026-2028)',
        document_type: 'agreement',
        file_name: 'Jyotsvan_BharatSteel_MasterSupplyAgreement_2026.pdf',
        file_size: 2890000,
        mime_type: 'application/pdf',
        storage_path: 'suppliers/sup-001/Jyotsvan_BharatSteel_MasterSupplyAgreement_2026.pdf',
        public_url: 'https://docs.jyotsvan.enterprise/storage/suppliers/sup-001/Jyotsvan_BharatSteel_MasterSupplyAgreement_2026.pdf',
        valid_until: '2028-03-31',
        status: 'active'
      },
      {
        id: 'sup-doc-03',
        supplier_id: 'sup-002',
        title: 'CE & Pressure Equipment Directive (PED) Compliance Certificate',
        document_type: 'compliance',
        file_name: 'Apex_PED_CE_Certification.pdf',
        file_size: 980000,
        mime_type: 'application/pdf',
        storage_path: 'suppliers/sup-002/Apex_PED_CE_Certification.pdf',
        public_url: 'https://docs.jyotsvan.enterprise/storage/suppliers/sup-002/Apex_PED_CE_Certification.pdf',
        valid_until: '2027-06-30',
        status: 'active'
      }
    ];

    for (const doc of initialDocuments) {
      await client.query(`
        INSERT INTO supplier_documents (
          id, organization_id, supplier_id, title, document_type, file_name,
          file_size, mime_type, storage_path, public_url, valid_until, status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [doc.id, orgId, doc.supplier_id, doc.title, doc.document_type, doc.file_name, doc.file_size, doc.mime_type, doc.storage_path, doc.public_url, doc.valid_until, doc.status]);
    }

    await client.query('COMMIT;');
    console.log('[Phase 7 Migration] Supplier Master Migration completed successfully!');
  } catch (err) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    console.error('[Phase 7 Migration Error]', err);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('migrate-supplier-master')) {
  runSupplierMasterMigration()
    .then(() => {
      console.log('Done migration.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
