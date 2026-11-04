import { pool } from './db.ts';

export async function runProductMasterMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Categories
    await client.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS parent_category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uk_org_category_code ON categories (organization_id, code);
    `);

    // 2. Products Table Columns
    const productColumns = [
      'product_code VARCHAR(64)',
      'short_name VARCHAR(128)',
      "brand VARCHAR(128) DEFAULT 'Jyotsvan'",
      "product_type VARCHAR(64) DEFAULT 'finished_good'",
      'unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL',
      'tax_rate NUMERIC(5, 2) DEFAULT 18.00',
      'tax_code VARCHAR(64)',
      "tax_category VARCHAR(64) DEFAULT 'GST_18'",
      "packaging_type VARCHAR(64) DEFAULT 'Box'",
      'units_per_case INTEGER DEFAULT 1',
      'case_weight NUMERIC(12, 3)',
      'reorder_quantity INTEGER DEFAULT 50',
      'minimum_stock_level INTEGER DEFAULT 5',
      'maximum_stock_level INTEGER DEFAULT 500',
      'requires_batch_tracking BOOLEAN DEFAULT FALSE',
      'requires_expiry_tracking BOOLEAN DEFAULT FALSE'
    ];

    for (const col of productColumns) {
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col};`);
    }

    await client.query(`
      UPDATE products SET product_code = COALESCE(product_code, sku, 'PRD-' || SUBSTRING(id, 6)) WHERE product_code IS NULL;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uk_org_product_code ON products (organization_id, product_code);
    `);

    // 3. SKUs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skus (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku VARCHAR(64) NOT NULL,
        variant_name VARCHAR(255) NOT NULL,
        barcode VARCHAR(128),
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        pack_size NUMERIC(12, 3) DEFAULT 1,
        pack_unit VARCHAR(32) DEFAULT 'pcs',
        net_weight NUMERIC(12, 3),
        gross_weight NUMERIC(12, 3),
        length NUMERIC(10, 2),
        width NUMERIC(10, 2),
        height NUMERIC(10, 2),
        volume NUMERIC(12, 3),
        cost_price NUMERIC(14, 2) DEFAULT 0,
        selling_price NUMERIC(14, 2) DEFAULT 0,
        mrp NUMERIC(14, 2) DEFAULT 0,
        tax_rate NUMERIC(5, 2) DEFAULT 18.00,
        tax_code VARCHAR(64),
        reorder_level INTEGER DEFAULT 10,
        reorder_quantity INTEGER DEFAULT 50,
        minimum_stock_level INTEGER DEFAULT 5,
        maximum_stock_level INTEGER DEFAULT 500,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_sku_code UNIQUE (organization_id, sku)
      );
    `);

    // 4. Product Images Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) REFERENCES skus(id) ON DELETE SET NULL,
        storage_path TEXT NOT NULL,
        public_url TEXT NOT NULL,
        alt_text VARCHAR(255),
        is_primary BOOLEAN DEFAULT FALSE NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 5. Product Documents Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_documents (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        document_type VARCHAR(64) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(128),
        storage_path TEXT NOT NULL,
        public_url TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 6. External SKU Mappings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_sku_mappings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
        platform VARCHAR(64) NOT NULL,
        external_product_id VARCHAR(128),
        external_variant_id VARCHAR(128),
        external_sku VARCHAR(128) NOT NULL,
        external_identifier VARCHAR(128),
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_platform_ext_sku UNIQUE (organization_id, platform, external_sku)
      );
    `);

    // 7. Performance Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type)',
      'CREATE INDEX IF NOT EXISTS idx_skus_org_id ON skus(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_skus_product_id ON skus(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_skus_sku ON skus(sku)',
      'CREATE INDEX IF NOT EXISTS idx_skus_barcode ON skus(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_product_docs_product_id ON product_documents(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_ext_mappings_sku_id ON external_sku_mappings(sku_id)',
      'CREATE INDEX IF NOT EXISTS idx_ext_mappings_platform ON external_sku_mappings(platform)'
    ];

    for (const idx of indexes) {
      await client.query(idx);
    }

    // 8. Default SKU synchronization for products
    const existingProds = await client.query('SELECT * FROM products;');
    for (const p of existingProds.rows) {
      const orgId = p.organization_id || 'org-jyotsvan-corp';
      const skuCode = p.sku || p.product_code || `SKU-${p.id}`;
      const skuId = `sku-${p.id}`;

      await client.query(
        `INSERT INTO skus (
          id, organization_id, product_id, sku, variant_name, barcode, pack_size, pack_unit,
          cost_price, selling_price, mrp, tax_rate, tax_code, reorder_level, reorder_quantity, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (organization_id, sku) DO UPDATE SET
          selling_price = EXCLUDED.selling_price,
          cost_price = EXCLUDED.cost_price,
          mrp = EXCLUDED.mrp;`,
        [
          skuId,
          orgId,
          p.id,
          skuCode,
          'Standard Pack',
          '890' + Math.floor(1000000000 + Math.random() * 9000000000),
          1,
          p.unit || 'pcs',
          Number(p.cost_price) || 120.00,
          Number(p.selling_price) || 180.00,
          Number(p.mrp) || 220.00,
          Number(p.tax_rate) || 18.00,
          p.tax_code || 'HSN-8413',
          Number(p.reorder_level) || 10,
          50,
          'active'
        ]
      );
    }

    // 9. Seed product permissions
    const productPermissions = [
      { id: 'perm-prd-01', code: 'products.view', module: 'products', description: 'View master products, specifications, and catalog listings' },
      { id: 'perm-prd-02', code: 'products.create', module: 'products', description: 'Create and register new master products and initial variant definitions' },
      { id: 'perm-prd-03', code: 'products.edit', module: 'products', description: 'Modify master product specifications, tax codes, and descriptions' },
      { id: 'perm-prd-04', code: 'products.delete', module: 'products', description: 'Remove unreferenced product records from organization master' },
      { id: 'perm-prd-05', code: 'products.archive', module: 'products', description: 'Archive and deactivate obsolete master products' },
      { id: 'perm-prd-06', code: 'products.export', module: 'products', description: 'Export product catalog, pricing matrices, and master directories' },

      { id: 'perm-cat-01', code: 'categories.view', module: 'categories', description: 'View hierarchical category taxonomy and sub-categories' },
      { id: 'perm-cat-02', code: 'categories.create', module: 'categories', description: 'Create new product category classifications' },
      { id: 'perm-cat-03', code: 'categories.edit', module: 'categories', description: 'Update category names, codes, and parent relationships' },
      { id: 'perm-cat-04', code: 'categories.delete', module: 'categories', description: 'Deactivate or remove unreferenced product categories' },

      { id: 'perm-sku-01', code: 'skus.view', module: 'skus', description: 'View canonical SKUs, barcodes, and physical packaging attributes' },
      { id: 'perm-sku-02', code: 'skus.create', module: 'skus', description: 'Generate and register new canonical SKUs and pack variants' },
      { id: 'perm-sku-03', code: 'skus.edit', module: 'skus', description: 'Modify SKU pricing, barcodes, weights, and physical dimensions' },
      { id: 'perm-sku-04', code: 'skus.delete', module: 'skus', description: 'Deactivate or remove unreferenced SKU variants' },

      { id: 'perm-map-01', code: 'product_mappings.view', module: 'product_mappings', description: 'View external marketplace SKU mappings' },
      { id: 'perm-map-02', code: 'product_mappings.create', module: 'product_mappings', description: 'Map canonical SKUs to Shopify, Amazon, Flipkart, and Myntra listings' },
      { id: 'perm-map-03', code: 'product_mappings.edit', module: 'product_mappings', description: 'Update external SKU identifiers, ASINs, and channel statuses' },
      { id: 'perm-map-04', code: 'product_mappings.delete', module: 'product_mappings', description: 'Unlink external marketplace mappings from canonical SKUs' },
    ];

    for (const p of productPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module;`,
        [p.id, p.code, p.module, p.description]
      );
    }

    // Role permissions mapping
    const rolesRes = await client.query('SELECT id, slug FROM roles;');
    const rolesMap = new Map(rolesRes.rows.map(r => [r.slug, r.id]));
    
    const roleAssignments = [
      {
        roleSlug: 'super_admin',
        permCodes: productPermissions.map(p => p.code)
      },
      {
        roleSlug: 'management',
        permCodes: productPermissions.map(p => p.code)
      },
      {
        roleSlug: 'production_manager',
        permCodes: ['products.view', 'products.create', 'products.edit', 'categories.view', 'skus.view', 'skus.create', 'skus.edit']
      },
      {
        roleSlug: 'purchase_manager',
        permCodes: ['products.view', 'categories.view', 'skus.view']
      },
      {
        roleSlug: 'warehouse_manager',
        permCodes: ['products.view', 'categories.view', 'skus.view', 'skus.edit']
      },
      {
        roleSlug: 'ecommerce_manager',
        permCodes: ['products.view', 'categories.view', 'skus.view', 'product_mappings.view', 'product_mappings.create', 'product_mappings.edit', 'product_mappings.delete']
      },
      {
        roleSlug: 'sales_manager',
        permCodes: ['products.view', 'categories.view', 'skus.view', 'products.export']
      }
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

    // 10. Seed Sample Rich Data (Images, Documents, External Mappings) if empty
    const skuRows = await client.query('SELECT * FROM skus;');
    for (let i = 0; i < skuRows.rows.length; i++) {
      const s = skuRows.rows[i];
      const imgCheck = await client.query('SELECT id FROM product_images WHERE product_id = $1;', [s.product_id]);
      if (imgCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO product_images (
            id, organization_id, product_id, sku_id, storage_path, public_url, alt_text, is_primary, display_order, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING;`,
          [
            `img-${s.product_id}-1`,
            s.organization_id,
            s.product_id,
            s.id,
            `product-images/${s.sku}-main.png`,
            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
            'Canonical industrial specification and packaging view',
            true,
            0,
            'active'
          ]
        );
      }

      const docCheck = await client.query('SELECT id FROM product_documents WHERE product_id = $1;', [s.product_id]);
      if (docCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO product_documents (
            id, organization_id, product_id, title, document_type, file_name, file_size, mime_type, storage_path, public_url, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING;`,
          [
            `doc-${s.product_id}-1`,
            s.organization_id,
            s.product_id,
            'Technical Data Sheet & Quality Compliance Specification',
            'spec_sheet',
            `${s.sku}_TDS_v2.1.pdf`,
            1428500,
            'application/pdf',
            `documents/${s.sku}_TDS.pdf`,
            'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            'active'
          ]
        );
      }

      const mapCheck = await client.query('SELECT id FROM external_sku_mappings WHERE sku_id = $1;', [s.id]);
      if (mapCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO external_sku_mappings (
            id, organization_id, product_id, sku_id, platform, external_sku, external_identifier, status, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (organization_id, platform, external_sku) DO NOTHING;`,
          [
            `ext-map-${i}-shp`,
            s.organization_id,
            s.product_id,
            s.id,
            'shopify',
            `SHOPIFY-${s.sku}`,
            `gid://shopify/ProductVariant/${9048120 + i}`,
            'active',
            JSON.stringify({ channel: 'Online Storefront', currency: 'USD', stockSync: true })
          ]
        );
        await client.query(
          `INSERT INTO external_sku_mappings (
            id, organization_id, product_id, sku_id, platform, external_sku, external_identifier, status, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (organization_id, platform, external_sku) DO NOTHING;`,
          [
            `ext-map-${i}-amz`,
            s.organization_id,
            s.product_id,
            s.id,
            'amazon',
            `AMZ-${s.sku}`,
            `B09V7X${8000 + i}`,
            'active',
            JSON.stringify({ channel: 'Amazon Seller Central', asin: `B09V7X${8000 + i}`, fulfillment: 'FBA' })
          ]
        );
      }
    }

    await client.query('COMMIT;');
    console.log('[ProductMaster] Migration and initial SKU synchronization complete.');
  } catch (err) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    console.error('[ProductMaster] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
