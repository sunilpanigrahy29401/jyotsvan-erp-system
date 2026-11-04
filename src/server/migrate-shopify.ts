// src/server/migrate-shopify.ts
// Phase 25: Jyotsvan Shopify Integration Schema & External Entity Mapping Table

import { pool } from './db.ts';

export async function runShopifyMigration() {
  console.log('[Phase 25 Migration] Initializing Shopify Integration & Entity Mappings schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. External Entity Mappings Table (Generic Multi-Provider Entity Mapping Engine)
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_entity_mappings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        entity_type VARCHAR(64) NOT NULL, -- 'product', 'variant', 'sku', 'customer', 'order', 'refund', 'discount', 'location'
        external_id VARCHAR(255) NOT NULL,
        internal_id VARCHAR(255) NOT NULL,
        external_identifier VARCHAR(255), -- e.g. Shopify SKU, Order #, Email, Location Name
        internal_identifier VARCHAR(255), -- e.g. Jyotsvan SKU, Order Number, Warehouse Code
        mapping_status VARCHAR(32) DEFAULT 'mapped' NOT NULL, -- 'mapped', 'unmapped', 'conflict'
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_entity_mapping UNIQUE (organization_id, connection_id, entity_type, external_id)
      );
    `);

    // 2. Shopify Sync Checkpoints & Incremental State Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shopify_sync_checkpoints (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        entity_type VARCHAR(64) NOT NULL, -- 'products', 'orders', 'customers', 'inventory'
        last_synced_at TIMESTAMPTZ,
        last_cursor VARCHAR(255),
        records_synced_total INTEGER DEFAULT 0 NOT NULL,
        status VARCHAR(32) DEFAULT 'idle' NOT NULL, -- 'idle', 'syncing', 'error'
        last_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_shopify_checkpoint UNIQUE (organization_id, connection_id, entity_type)
      );
    `);

    // 3. Shopify Sync Exceptions / Unmapped Entity Queue
    await client.query(`
      CREATE TABLE IF NOT EXISTS shopify_sync_exceptions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        entity_type VARCHAR(64) NOT NULL, -- 'sku', 'order', 'location', 'customer'
        external_id VARCHAR(255) NOT NULL,
        external_identifier VARCHAR(255),
        error_code VARCHAR(64) NOT NULL, -- 'SHOPIFY_UNMAPPED_SKU', 'SHOPIFY_UNMAPPED_LOCATION', 'SHOPIFY_CONFLICT'
        error_message TEXT NOT NULL,
        raw_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
        status VARCHAR(32) DEFAULT 'pending' NOT NULL, -- 'pending', 'resolved', 'ignored'
        resolution_notes TEXT,
        resolved_at TIMESTAMPTZ,
        resolved_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 4. Performance Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_map_lookup ON integration_entity_mappings(organization_id, connection_id, entity_type, external_id);
      CREATE INDEX IF NOT EXISTS idx_entity_map_internal ON integration_entity_mappings(organization_id, entity_type, internal_id);
      CREATE INDEX IF NOT EXISTS idx_entity_map_ext_ident ON integration_entity_mappings(organization_id, entity_type, external_identifier);
      CREATE INDEX IF NOT EXISTS idx_shopify_sync_chk ON shopify_sync_checkpoints(organization_id, connection_id);
      CREATE INDEX IF NOT EXISTS idx_shopify_exceptions ON shopify_sync_exceptions(organization_id, connection_id, status);
    `);

    // 5. Update Shopify Provider in `integration_providers` with full Phase 25 capabilities & configuration schema
    const shopifyCapabilities = {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: true,
      test_connection: true,
      custom_headers: true,
      rate_limit_rps: 4,
      rate_limit_rpm: 240,
      products: true,
      variants: true,
      skus: true,
      customers: true,
      orders: true,
      refunds: true,
      discounts: true,
      inventory: true,
      historical_sync: true,
      incremental_sync: true,
    };

    const shopifyConfigSchema = {
      instructions: 'Connect your Shopify store using your Custom App Admin API Access Token or Shopify OAuth authorization.',
      fields: [
        {
          key: 'shop_domain',
          label: 'Shopify Store Domain (*.myshopify.com)',
          type: 'text',
          required: true,
          placeholder: 'your-store-name.myshopify.com',
          helpText: 'The canonical myshopify.com domain of your store.',
        },
        {
          key: 'admin_api_access_token',
          label: 'Shopify Admin API Access Token',
          type: 'secret',
          required: true,
          placeholder: 'shpat_••••••••••••••••••••••••••••••••',
          secret: true,
          helpText: 'Generated in Shopify Admin > Settings > Apps and sales channels > Develop apps.',
        },
        {
          key: 'api_version',
          label: 'Shopify API Version',
          type: 'select',
          defaultValue: '2026-01',
          options: [
            { label: '2026-01 (Latest Supported)', value: '2026-01' },
            { label: '2025-10', value: '2025-10' },
            { label: '2025-07', value: '2025-07' },
          ],
        },
        {
          key: 'webhook_secret',
          label: 'Shopify Webhook Signing Secret',
          type: 'secret',
          placeholder: 'whsec_••••••••••••••••••••••••',
          secret: true,
          helpText: 'Used for cryptographic HMAC-SHA256 verification of inbound event dispatches.',
        },
        {
          key: 'default_warehouse_id',
          label: 'Default Fulfillment Warehouse',
          type: 'text',
          placeholder: 'wh-main-bbsr-01',
          helpText: 'Jyotsvan warehouse to route Shopify web orders and reserve inventory against.',
        },
        {
          key: 'auto_sync_inventory',
          label: 'Auto-Sync Stock Levels',
          type: 'boolean',
          defaultValue: true,
          helpText: 'Keep Shopify inventory in sync with ERP available stock.',
        },
        {
          key: 'sync_orders_since',
          label: 'Historical Order Import Start Date',
          type: 'text',
          placeholder: 'YYYY-MM-DD (e.g. 2026-01-01)',
          helpText: 'Initial historical sync starting point.',
        },
      ],
    };

    await client.query(
      `INSERT INTO integration_providers (
        id, provider_key, name, description, category, icon_name,
        documentation_url, status, implementation_status, capabilities, configuration_schema, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (provider_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        icon_name = EXCLUDED.icon_name,
        documentation_url = EXCLUDED.documentation_url,
        status = EXCLUDED.status,
        implementation_status = 'implemented',
        capabilities = EXCLUDED.capabilities,
        configuration_schema = EXCLUDED.configuration_schema,
        updated_at = NOW();`,
      [
        'prov-shopify',
        'shopify',
        'Shopify Store',
        'Direct-to-consumer store synchronization for products, variants, SKU mapping, orders, refunds, customer profiles, and warehouse stock levels.',
        'commerce',
        'ShoppingBag',
        'https://docs.jyotsvan.enterprise/integrations/shopify',
        'active',
        'implemented',
        JSON.stringify(shopifyCapabilities),
        JSON.stringify(shopifyConfigSchema),
      ]
    );

    // 6. Ensure sample connection exists with active store state
    const orgId = 'org-jyotsvan-corp';
    const connId = 'conn-shopify-prod';

    const existingConn = await client.query(
      `SELECT id FROM integration_connections WHERE id = $1`,
      [connId]
    );

    if (existingConn.rows.length === 0) {
      await client.query(
        `INSERT INTO integration_connections (
          id, organization_id, provider_id, provider_key, name, status,
          auth_type, external_account_id, external_account_name, configuration,
          health_status, health_message, last_sync_at, last_success_at, created_by, created_at, updated_at
        ) VALUES ($1, $2, 'prov-shopify', 'shopify', 'Jyotsvan Direct-to-Consumer Flagship Store', 'connected',
                  'api_key', 'shop_88492019', 'jyotsvan-organics.myshopify.com', $3,
                  'healthy', 'Shopify Admin API 2026-01 operational. All webhooks active.',
                  NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', 'usr-owner-sunil', NOW() - INTERVAL '30 days', NOW())`,
        [
          connId,
          orgId,
          JSON.stringify({
            shop_domain: 'jyotsvan-organics.myshopify.com',
            api_version: '2026-01',
            store_name: 'Jyotsvan Organics Flagship',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            country: 'India',
            default_warehouse_id: 'wh-main-bbsr-01',
            auto_sync_inventory: true,
            sync_interval_mins: 15,
          }),
        ]
      );
    } else {
      await client.query(
        `UPDATE integration_connections SET
          configuration = configuration || '{"store_name": "Jyotsvan Organics Flagship", "currency": "INR", "timezone": "Asia/Kolkata", "country": "India"}'::jsonb,
          health_status = 'healthy',
          updated_at = NOW()
        WHERE id = $1`,
        [connId]
      );
    }

    // 7. Seed Sample Entity Mappings for SKUs and Locations
    const sampleMappings = [
      {
        id: 'map-sku-001',
        entity_type: 'sku',
        external_id: 'gid://shopify/ProductVariant/44910291823',
        internal_id: 'sku-coconut-500',
        external_identifier: 'SH-COCONUT-500ML',
        internal_identifier: 'SKU-COCONUT-OIL-500ML',
        mapping_status: 'mapped',
        metadata: {
          shopify_product_id: 'gid://shopify/Product/8829102910',
          title: 'Cold Pressed Virgin Coconut Oil - 500ml',
          price: 340,
          inventory_item_id: 'inv_item_88192019',
        },
      },
      {
        id: 'map-sku-002',
        entity_type: 'sku',
        external_id: 'gid://shopify/ProductVariant/44910291824',
        internal_id: 'sku-mustard-1000',
        external_identifier: 'SH-MUSTARD-1L',
        internal_identifier: 'SKU-MUSTARD-OIL-1L',
        mapping_status: 'mapped',
        metadata: {
          shopify_product_id: 'gid://shopify/Product/8829102911',
          title: 'Organic Kachi Ghani Mustard Oil - 1L',
          price: 260,
          inventory_item_id: 'inv_item_88192020',
        },
      },
      {
        id: 'map-sku-003',
        entity_type: 'sku',
        external_id: 'gid://shopify/ProductVariant/44910291825',
        internal_id: 'sku-sesame-200',
        external_identifier: 'SH-SESAME-200ML',
        internal_identifier: 'SKU-SESAME-OIL-200ML',
        mapping_status: 'mapped',
        metadata: {
          shopify_product_id: 'gid://shopify/Product/8829102912',
          title: 'Pure White Sesame Oil - 200ml',
          price: 180,
          inventory_item_id: 'inv_item_88192021',
        },
      },
      {
        id: 'map-sku-004',
        entity_type: 'sku',
        external_id: 'gid://shopify/ProductVariant/44910291826',
        internal_id: 'sku-sunflower-5000',
        external_identifier: 'SH-SUNFLOWER-5L',
        internal_identifier: 'SKU-SUNFLOWER-OIL-5L',
        mapping_status: 'mapped',
        metadata: {
          shopify_product_id: 'gid://shopify/Product/8829102913',
          title: 'Refined Sunflower Cooking Oil - 5L Can',
          price: 890,
          inventory_item_id: 'inv_item_88192022',
        },
      },
      {
        id: 'map-sku-005',
        entity_type: 'sku',
        external_id: 'gid://shopify/ProductVariant/44910291827',
        internal_id: 'sku-groundnut-1000',
        external_identifier: 'SH-GROUNDNUT-1L',
        internal_identifier: 'SKU-GROUNDNUT-OIL-1L',
        mapping_status: 'mapped',
        metadata: {
          shopify_product_id: 'gid://shopify/Product/8829102914',
          title: 'Cold Pressed Peanut / Groundnut Oil - 1L',
          price: 295,
          inventory_item_id: 'inv_item_88192023',
        },
      },
      {
        id: 'map-loc-001',
        entity_type: 'location',
        external_id: 'gid://shopify/Location/8829101',
        internal_id: 'wh-main-bbsr-01',
        external_identifier: 'Main Bhubaneswar Central Fulfillment Hub',
        internal_identifier: 'WH-BBSR-MAIN',
        mapping_status: 'mapped',
        metadata: {
          address: 'Plot 42, Infovalley Industrial Area',
          city: 'Bhubaneswar',
          country: 'IN',
          active: true,
        },
      },
    ];

    for (const m of sampleMappings) {
      await client.query(
        `INSERT INTO integration_entity_mappings (
          id, organization_id, connection_id, provider_key, entity_type,
          external_id, internal_id, external_identifier, internal_identifier,
          mapping_status, metadata, last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, 'shopify', $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '10 days', NOW())
        ON CONFLICT (organization_id, connection_id, entity_type, external_id) DO UPDATE SET
          internal_id = EXCLUDED.internal_id,
          external_identifier = EXCLUDED.external_identifier,
          internal_identifier = EXCLUDED.internal_identifier,
          mapping_status = EXCLUDED.mapping_status,
          metadata = EXCLUDED.metadata,
          last_synced_at = NOW(),
          updated_at = NOW();`,
        [
          m.id,
          orgId,
          connId,
          m.entity_type,
          m.external_id,
          m.internal_id,
          m.external_identifier,
          m.internal_identifier,
          m.mapping_status,
          JSON.stringify(m.metadata),
        ]
      );
    }

    // 8. Seed Checkpoints
    const checkpointEntities = ['products', 'orders', 'customers', 'inventory'];
    for (const ce of checkpointEntities) {
      await client.query(
        `INSERT INTO shopify_sync_checkpoints (
          id, organization_id, connection_id, entity_type, last_synced_at,
          records_synced_total, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '15 minutes', 142, 'idle', NOW() - INTERVAL '10 days', NOW())
        ON CONFLICT (organization_id, connection_id, entity_type) DO UPDATE SET
          last_synced_at = NOW() - INTERVAL '15 minutes',
          updated_at = NOW();`,
        [`chk-${connId}-${ce}`, orgId, connId, ce]
      );
    }

    // 9. Ensure RBAC Permissions for Shopify
    const shopifyPermissions = [
      { code: 'shopify.view', module: 'commerce', description: 'View Shopify store connection, metrics, synchronized products, and orders' },
      { code: 'shopify.connect', module: 'commerce', description: 'Connect or reconfigure Shopify store and OAuth credentials' },
      { code: 'shopify.disconnect', module: 'commerce', description: 'Disconnect or revoke Shopify store credentials' },
      { code: 'shopify.sync', module: 'commerce', description: 'Trigger manual historical or incremental Shopify synchronization' },
      { code: 'shopify.mapping.manage', module: 'commerce', description: 'Manage SKU, product variant, customer, and warehouse location mappings' },
      { code: 'shopify.logs.view', module: 'commerce', description: 'Inspect Shopify operational logs, webhook payloads, and error traces' },
    ];

    for (const perm of shopifyPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;`,
        [`perm-${perm.code.replace(/\./g, '-')}`, perm.code, perm.module, perm.description]
      );
    }

    const adminRoles = await client.query(`SELECT id FROM roles WHERE slug IN ('owner', 'admin', 'system-administrator', 'finance-manager', 'sales-head')`);
    for (const r of adminRoles.rows) {
      for (const perm of shopifyPermissions) {
        const permRes = await client.query(`SELECT id FROM permissions WHERE code = $1`, [perm.code]);
        if (permRes.rows.length > 0) {
          await client.query(
            `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT DO NOTHING;`,
            [`rp-${r.id}-${permRes.rows[0].id}`, r.id, permRes.rows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 25 Migration] ✓ Shopify Integration & Entity Mapping schema initialized successfully.');
  } catch (err: unknown) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    const errorMsg = err instanceof Error ? err.message : 'Shopify migration failed';
    console.error('[Phase 25 Migration] ✗ Migration Error:', errorMsg);
    throw err;
  } finally {
    client.release();
  }
}
