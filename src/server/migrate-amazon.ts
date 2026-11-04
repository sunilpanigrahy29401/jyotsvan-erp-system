// src/server/migrate-amazon.ts
// Phase 30 & 31: Marketplace Engine & Amazon SP-API Integration Schema Migration

import { pool } from './db.ts';
import { encryptCredentials } from './crypto-vault.ts';
import type { IntegrationProvider } from '../types/integrations.ts';

export const AMAZON_INTEGRATION_PROVIDER: Omit<IntegrationProvider, 'id' | 'created_at' | 'updated_at'> = {
  provider_key: 'amazon',
  name: 'Amazon SP-API Marketplace Hub',
  description: 'Synchronize multi-channel Amazon orders, FBA/FBM inventory, catalog ASINs, customer returns, scheduled reports, and financial settlements via Selling Partner API.',
  category: 'commerce',
  icon_name: 'ShoppingBag',
  documentation_url: 'https://developer-docs.amazon.com/sp-api/',
  status: 'active',
  implementation_status: 'implemented',
  capabilities: {
    read: true,
    write: true,
    sync: true,
    orders: true,
    products: true,
    inventory: true,
    returns: true,
    reports: true,
    settlements: true,
    fees: true,
    oauth: true,
    test_connection: true,
    rate_limit_rps: 10,
  },
  configuration_schema: {
    instructions: 'Configure your Amazon Selling Partner API (SP-API) LWA Client credentials, Seller ID, and region.',
    fields: [
      {
        key: 'seller_id',
        label: 'Amazon Seller / Merchant ID',
        type: 'text',
        required: true,
        placeholder: 'A2ABC1234XYZ',
        helpText: 'Your unique Merchant Customer ID from Seller Central.',
      },
      {
        key: 'region',
        label: 'SP-API Region',
        type: 'select',
        required: true,
        defaultValue: 'fe',
        options: [
          { label: 'Far East (India, Australia, Japan, Singapore) - sellingpartnerapi-fe.amazon.com', value: 'fe' },
          { label: 'North America (US, Canada, Mexico, Brazil) - sellingpartnerapi-na.amazon.com', value: 'na' },
          { label: 'Europe (UK, Germany, France, Italy, Spain) - sellingpartnerapi-eu.amazon.com', value: 'eu' },
        ],
      },
      {
        key: 'primary_marketplace_id',
        label: 'Primary Marketplace ID',
        type: 'select',
        required: true,
        defaultValue: 'A21TJRUUN4KGV',
        options: [
          { label: 'Amazon India (Amazon.in - A21TJRUUN4KGV)', value: 'A21TJRUUN4KGV' },
          { label: 'Amazon US (Amazon.com - ATVPDKIKX0DER)', value: 'ATVPDKIKX0DER' },
          { label: 'Amazon UK (Amazon.co.uk - A1F83G8C2ARO7P)', value: 'A1F83G8C2ARO7P' },
          { label: 'Amazon Germany (Amazon.de - A1PA6795UKMFR9)', value: 'A1PA6795UKMFR9' },
          { label: 'Amazon UAE (Amazon.ae - A2VIGQ35RCS4UG)', value: 'A2VIGQ35RCS4UG' },
          { label: 'Amazon Australia (Amazon.com.au - A39IBJ37TRP1C6)', value: 'A39IBJ37TRP1C6' },
        ],
      },
      {
        key: 'lwa_app_id',
        label: 'Login with Amazon (LWA) Client ID',
        type: 'text',
        required: true,
        placeholder: 'amzn1.application-oa2-client.••••••••••••••••',
      },
      {
        key: 'lwa_client_secret',
        label: 'LWA Client Secret',
        type: 'secret',
        required: true,
        placeholder: 'amzn1.oa2-cs.v1.••••••••••••••••••••••••',
        secret: true,
      },
      {
        key: 'lwa_refresh_token',
        label: 'LWA Refresh Token',
        type: 'secret',
        required: true,
        placeholder: 'Atzr|IwEBI••••••••••••••••••••••••',
        secret: true,
      },
      {
        key: 'aws_access_key_id',
        label: 'AWS IAM Access Key (Optional if role-delegated)',
        type: 'text',
        placeholder: 'AKIA••••••••••••••••',
      },
      {
        key: 'aws_secret_access_key',
        label: 'AWS IAM Secret Key (Optional)',
        type: 'secret',
        placeholder: '••••••••••••••••••••••••',
        secret: true,
      },
    ],
  },
};

export async function runAmazonMigration() {
  console.log('[Phase 31 Migration] Initializing Marketplace Engine & Amazon SP-API Database Schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. marketplace_marketplaces
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_marketplaces (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64) NOT NULL,
        country_code VARCHAR(8) NOT NULL,
        name VARCHAR(255) NOT NULL,
        currency VARCHAR(8) NOT NULL,
        domain_name VARCHAR(255),
        default_language_code VARCHAR(16),
        is_participating BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_conn_mktid UNIQUE (connection_id, marketplace_id)
      );
    `);

    // 2. marketplace_orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_orders (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64) NOT NULL,
        external_order_id VARCHAR(128) NOT NULL,
        order_number VARCHAR(128),
        purchase_date TIMESTAMPTZ NOT NULL,
        last_update_date TIMESTAMPTZ,
        order_status VARCHAR(64) NOT NULL,
        fulfillment_channel VARCHAR(32) DEFAULT 'MFN' NOT NULL,
        sales_channel VARCHAR(128),
        ship_service_level VARCHAR(64),
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        order_total NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        items_subtotal NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        shipping_price NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        tax_total NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        discount_total NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        buyer_email VARCHAR(255),
        buyer_name VARCHAR(255),
        shipping_address JSONB DEFAULT '{}'::jsonb NOT NULL,
        is_business_order BOOLEAN DEFAULT false NOT NULL,
        is_prime BOOLEAN DEFAULT false NOT NULL,
        is_replacement_order BOOLEAN DEFAULT false NOT NULL,
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_order_ext UNIQUE (connection_id, external_order_id)
      );
    `);

    // 3. marketplace_order_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_order_items (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        order_id VARCHAR(64) NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
        external_order_id VARCHAR(128) NOT NULL,
        external_order_item_id VARCHAR(128) NOT NULL,
        seller_sku VARCHAR(128) NOT NULL,
        asin VARCHAR(64),
        title VARCHAR(500) NOT NULL,
        quantity_ordered INTEGER DEFAULT 1 NOT NULL,
        quantity_shipped INTEGER DEFAULT 0 NOT NULL,
        item_price NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        item_tax NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        shipping_price NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        shipping_tax NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        item_discount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        promotion_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
        condition_id VARCHAR(64),
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_order_item UNIQUE (order_id, external_order_item_id)
      );
    `);

    // 4. marketplace_products
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_products (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64) NOT NULL,
        external_product_id VARCHAR(128) NOT NULL,
        seller_sku VARCHAR(128) NOT NULL,
        asin VARCHAR(64),
        fnsku VARCHAR(64),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        brand VARCHAR(255),
        manufacturer VARCHAR(255),
        item_type VARCHAR(128),
        product_status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        listing_price NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        main_image_url TEXT,
        product_url TEXT,
        fulfillment_channel VARCHAR(32) DEFAULT 'MFN' NOT NULL,
        attributes JSONB DEFAULT '{}'::jsonb NOT NULL,
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_prod_sku UNIQUE (connection_id, marketplace_id, seller_sku)
      );
    `);

    // 5. marketplace_inventory
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_inventory (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64) NOT NULL,
        seller_sku VARCHAR(128) NOT NULL,
        asin VARCHAR(64),
        fnsku VARCHAR(64),
        fulfillment_channel VARCHAR(32) DEFAULT 'FBA' NOT NULL,
        available_quantity INTEGER DEFAULT 0 NOT NULL,
        reserved_quantity INTEGER DEFAULT 0 NOT NULL,
        inbound_working INTEGER DEFAULT 0 NOT NULL,
        inbound_shipped INTEGER DEFAULT 0 NOT NULL,
        inbound_receiving INTEGER DEFAULT 0 NOT NULL,
        total_quantity INTEGER DEFAULT 0 NOT NULL,
        condition VARCHAR(64) DEFAULT 'NewItem',
        last_updated_at TIMESTAMPTZ DEFAULT NOW(),
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_inv_sku_ch UNIQUE (connection_id, marketplace_id, seller_sku, fulfillment_channel)
      );
    `);

    // 6. marketplace_returns
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_returns (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64) NOT NULL,
        external_return_id VARCHAR(128) NOT NULL,
        order_id VARCHAR(64),
        order_item_id VARCHAR(64),
        seller_sku VARCHAR(128) NOT NULL,
        asin VARCHAR(64),
        quantity INTEGER DEFAULT 1 NOT NULL,
        return_reason VARCHAR(255),
        return_reason_details TEXT,
        return_status VARCHAR(64) DEFAULT 'COMPLETED' NOT NULL,
        return_date TIMESTAMPTZ NOT NULL,
        refund_amount NUMERIC(14, 2) DEFAULT 0,
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        fulfillment_center_id VARCHAR(64),
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_return_ext UNIQUE (connection_id, external_return_id)
      );
    `);

    // 7. marketplace_reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_reports (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        report_id VARCHAR(128) NOT NULL,
        report_type VARCHAR(128) NOT NULL,
        marketplace_id VARCHAR(64),
        data_start_time TIMESTAMPTZ,
        data_end_time TIMESTAMPTZ,
        report_status VARCHAR(64) DEFAULT 'SUBMITTED' NOT NULL,
        document_id VARCHAR(128),
        processing_status VARCHAR(64) DEFAULT 'PENDING' NOT NULL,
        records_parsed INTEGER DEFAULT 0 NOT NULL,
        generated_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_report_id UNIQUE (connection_id, report_id)
      );
    `);

    // 8. marketplace_settlements
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_settlements (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64) NOT NULL,
        settlement_id VARCHAR(128) NOT NULL,
        settlement_start_date TIMESTAMPTZ NOT NULL,
        settlement_end_date TIMESTAMPTZ NOT NULL,
        deposit_date TIMESTAMPTZ,
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        total_amount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        gross_sales_amount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        refunds_amount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        fees_amount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        adjustments_amount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        taxes_amount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        status VARCHAR(64) DEFAULT 'CLOSED' NOT NULL,
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_settle_id UNIQUE (connection_id, settlement_id)
      );
    `);

    // 9. marketplace_fees
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_fees (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64),
        settlement_id VARCHAR(128),
        external_order_id VARCHAR(128),
        seller_sku VARCHAR(128),
        fee_type VARCHAR(128) NOT NULL,
        fee_amount NUMERIC(14, 2) DEFAULT 0 NOT NULL,
        currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
        description TEXT,
        posted_date TIMESTAMPTZ NOT NULL,
        raw_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 10. marketplace_entity_mappings (SKU & Product Mappings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_entity_mappings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        entity_type VARCHAR(32) DEFAULT 'sku' NOT NULL,
        marketplace_sku VARCHAR(128) NOT NULL,
        marketplace_asin VARCHAR(64),
        marketplace_title VARCHAR(500),
        jyotsvan_sku VARCHAR(128),
        jyotsvan_product_id VARCHAR(64),
        jyotsvan_product_name VARCHAR(255),
        mapping_status VARCHAR(32) DEFAULT 'unmapped' NOT NULL,
        notes TEXT,
        mapped_by VARCHAR(64),
        mapped_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_entity_sku UNIQUE (connection_id, provider_key, marketplace_sku)
      );
    `);

    // 11. marketplace_sync_checkpoints
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_sync_checkpoints (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        marketplace_id VARCHAR(64),
        last_sync_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        last_checkpoint_token TEXT,
        cursor TEXT,
        status VARCHAR(32) DEFAULT 'SUCCESS' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_checkpoint UNIQUE (connection_id, entity_type, marketplace_id)
      );
    `);

    // 12. Indexes for Performance & Querying
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mkt_orders_org_date ON marketplace_orders(organization_id, purchase_date DESC);
      CREATE INDEX IF NOT EXISTS idx_mkt_orders_status ON marketplace_orders(connection_id, order_status);
      CREATE INDEX IF NOT EXISTS idx_mkt_order_items_order ON marketplace_order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_order_items_sku ON marketplace_order_items(seller_sku);
      CREATE INDEX IF NOT EXISTS idx_mkt_prods_org_sku ON marketplace_products(organization_id, seller_sku);
      CREATE INDEX IF NOT EXISTS idx_mkt_inv_org_sku ON marketplace_inventory(organization_id, seller_sku);
      CREATE INDEX IF NOT EXISTS idx_mkt_returns_org_date ON marketplace_returns(organization_id, return_date DESC);
      CREATE INDEX IF NOT EXISTS idx_mkt_reports_org_type ON marketplace_reports(organization_id, report_type);
      CREATE INDEX IF NOT EXISTS idx_mkt_settlements_org_date ON marketplace_settlements(organization_id, settlement_end_date DESC);
      CREATE INDEX IF NOT EXISTS idx_mkt_fees_org_date ON marketplace_fees(organization_id, posted_date DESC);
      CREATE INDEX IF NOT EXISTS idx_mkt_mappings_sku ON marketplace_entity_mappings(organization_id, marketplace_sku);
    `);

    // 13. Register Amazon Provider in integration_providers
    const p = AMAZON_INTEGRATION_PROVIDER;
    const providerId = `prov-${p.provider_key}`;
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
        implementation_status = EXCLUDED.implementation_status,
        capabilities = EXCLUDED.capabilities,
        configuration_schema = EXCLUDED.configuration_schema,
        updated_at = NOW();`,
      [
        providerId,
        p.provider_key,
        p.name,
        p.description,
        p.category,
        p.icon_name,
        p.documentation_url,
        p.status,
        p.implementation_status,
        JSON.stringify(p.capabilities),
        JSON.stringify(p.configuration_schema),
      ]
    );

    // 14. Seed Initial Connected Amazon Seller Account for Jyotsvan Corp
    const orgId = 'org-jyotsvan-corp';
    const amazonConnId = 'conn-amazon-in-prod';
    const sellerId = 'A2JYOTSVANORGANICS';
    const primaryMarketplaceId = 'A21TJRUUN4KGV'; // Amazon.in

    await client.query(
      `INSERT INTO integration_connections (
        id, organization_id, provider_id, provider_key, name, status,
        auth_type, external_account_id, external_account_name, configuration,
        health_status, health_message, last_sync_at, last_success_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'amazon', 'Jyotsvan Organics Amazon Store (India & APAC)', 'connected',
        'oauth2', $4, 'Jyotsvan Ayurveda Official',
        $5,
        'healthy', 'SP-API connected with 180ms latency. LWA refresh token active.',
        NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes', NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        status = 'connected',
        health_status = 'healthy',
        updated_at = NOW();`,
      [
        amazonConnId,
        orgId,
        providerId,
        sellerId,
        JSON.stringify({
          seller_id: sellerId,
          region: 'fe',
          primary_marketplace_id: primaryMarketplaceId,
          auto_sync_orders: true,
          auto_sync_inventory: true,
          sync_interval_mins: 30,
          fba_enabled: true,
          fbm_enabled: true,
          settlement_currency: 'INR',
        }),
      ]
    );

    // Encrypt credentials in vault
    const encryptedCreds = encryptCredentials({
      seller_id: sellerId,
      lwa_app_id: 'amzn1.application-oa2-client.98f12a3b4c5d6e7f8a901234',
      lwa_client_secret: 'amzn1.oa2-cs.v1.78a90bc12def34567890abcdef123456',
      lwa_refresh_token: 'Atzr|IwEBIJyotsvanAuthTokenAmazonSpApiProdLive2026',
      region: 'fe',
      marketplace_id: primaryMarketplaceId,
    });

    await client.query(
      `INSERT INTO integration_credentials (
        id, organization_id, connection_id, encrypted_credentials, credential_version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
      ON CONFLICT (connection_id) DO UPDATE SET
        encrypted_credentials = EXCLUDED.encrypted_credentials,
        updated_at = NOW();`,
      [`cred-${amazonConnId}`, orgId, amazonConnId, encryptedCreds]
    );

    // Seed Marketplaces
    await client.query(
      `INSERT INTO marketplace_marketplaces (
        id, organization_id, connection_id, provider_key, marketplace_id, country_code, name, currency, domain_name, default_language_code, is_participating, created_at, updated_at
      ) VALUES
        ('mkt-in-01', $1, $2, 'amazon', 'A21TJRUUN4KGV', 'IN', 'Amazon India', 'INR', 'amazon.in', 'en_IN', true, NOW(), NOW()),
        ('mkt-ae-01', $1, $2, 'amazon', 'A2VIGQ35RCS4UG', 'AE', 'Amazon UAE', 'AED', 'amazon.ae', 'en_AE', true, NOW(), NOW()),
        ('mkt-us-01', $1, $2, 'amazon', 'ATVPDKIKX0DER', 'US', 'Amazon US (Export Store)', 'USD', 'amazon.com', 'en_US', false, NOW(), NOW())
      ON CONFLICT (connection_id, marketplace_id) DO NOTHING;`,
      [orgId, amazonConnId]
    );

    // Seed Sample Amazon Products
    const sampleProducts = [
      {
        id: 'amz-prod-01',
        sku: 'JYOT-ASHWA-500G',
        asin: 'B09X7K9LM1',
        fnsku: 'X001A89JY1',
        title: 'Jyotsvan Organic Ashwagandha Root Powder 500g - 100% Pure Himalayan Certified Organic',
        brand: 'Jyotsvan Organics',
        price: 649.00,
        status: 'ACTIVE',
        fchannel: 'FBA',
        jyotsvanSku: 'JYOT-ASHWA-500G',
      },
      {
        id: 'amz-prod-02',
        sku: 'JYOT-TRI-60CAP',
        asin: 'B08Y2N4PQ2',
        fnsku: 'X002B45JY2',
        title: 'Jyotsvan Triphala Digestive Care 60 Vegan Capsules - Standardized 50% Tannins Extract',
        brand: 'Jyotsvan Organics',
        price: 499.00,
        status: 'ACTIVE',
        fchannel: 'FBA',
        jyotsvanSku: 'JYOT-TRI-60CAP',
      },
      {
        id: 'amz-prod-03',
        sku: 'JYOT-BRAHMI-200ML',
        asin: 'B07Z3M8RS3',
        fnsku: 'X003C67JY3',
        title: 'Jyotsvan Pure Brahmi Memory & Focus Tonic 200ml - Traditional Cold-Pressed Decoction',
        brand: 'Jyotsvan Organics',
        price: 380.00,
        status: 'ACTIVE',
        fchannel: 'MFN',
        jyotsvanSku: 'JYOT-BRAHMI-200ML',
      },
      {
        id: 'amz-prod-04',
        sku: 'JYOT-CHYAWAN-1KG',
        asin: 'B09W1Q5TU4',
        fnsku: 'X004D89JY4',
        title: 'Jyotsvan Heritage Chyawanprash Gold 1kg - With Organic Wild Amla, Pure Ghee & Saffron',
        brand: 'Jyotsvan Organics',
        price: 890.00,
        status: 'ACTIVE',
        fchannel: 'FBA',
        jyotsvanSku: 'JYOT-CHYAWAN-1KG',
      },
      {
        id: 'amz-prod-05',
        sku: 'JYOT-MORINGA-250G',
        asin: 'B08V4R6VW5',
        fnsku: 'X005E12JY5',
        title: 'Jyotsvan Superfood Moringa Leaf Powder 250g - Shade-Dried & Nutrient-Dense',
        brand: 'Jyotsvan Organics',
        price: 320.00,
        status: 'ACTIVE',
        fchannel: 'MFN',
        jyotsvanSku: 'JYOT-MORINGA-250G',
      },
    ];

    for (const p of sampleProducts) {
      await client.query(
        `INSERT INTO marketplace_products (
          id, organization_id, connection_id, provider_key, marketplace_id, external_product_id,
          seller_sku, asin, fnsku, title, brand, listing_price, currency, product_status,
          fulfillment_channel, created_at, updated_at
        ) VALUES ($1, $2, $3, 'amazon', $4, $5, $6, $7, $8, $9, $10, $11, 'INR', $12, $13, NOW(), NOW())
        ON CONFLICT (connection_id, marketplace_id, seller_sku) DO NOTHING;`,
        [
          p.id,
          orgId,
          amazonConnId,
          primaryMarketplaceId,
          p.asin,
          p.sku,
          p.asin,
          p.fnsku,
          p.title,
          p.brand,
          p.price,
          p.status,
          p.fchannel,
        ]
      );

      // Seed Inventory
      await client.query(
        `INSERT INTO marketplace_inventory (
          id, organization_id, connection_id, provider_key, marketplace_id,
          seller_sku, asin, fnsku, fulfillment_channel, available_quantity,
          reserved_quantity, inbound_working, inbound_shipped, inbound_receiving,
          total_quantity, created_at, updated_at
        ) VALUES ($1, $2, $3, 'amazon', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        ON CONFLICT (connection_id, marketplace_id, seller_sku, fulfillment_channel) DO NOTHING;`,
        [
          `inv-${p.id}`,
          orgId,
          amazonConnId,
          primaryMarketplaceId,
          p.sku,
          p.asin,
          p.fnsku,
          p.fchannel,
          p.fchannel === 'FBA' ? 340 : 180,
          p.fchannel === 'FBA' ? 24 : 0,
          p.fchannel === 'FBA' ? 100 : 0,
          p.fchannel === 'FBA' ? 50 : 0,
          p.fchannel === 'FBA' ? 20 : 0,
          p.fchannel === 'FBA' ? 534 : 180,
        ]
      );

      // Seed SKU Mapping
      await client.query(
        `INSERT INTO marketplace_entity_mappings (
          id, organization_id, connection_id, provider_key, entity_type,
          marketplace_sku, marketplace_asin, marketplace_title,
          jyotsvan_sku, jyotsvan_product_name, mapping_status, mapped_at, created_at, updated_at
        ) VALUES ($1, $2, $3, 'amazon', 'sku', $4, $5, $6, $7, $8, 'auto_matched', NOW(), NOW(), NOW())
        ON CONFLICT (connection_id, provider_key, marketplace_sku) DO NOTHING;`,
        [
          `map-${p.id}`,
          orgId,
          amazonConnId,
          p.sku,
          p.asin,
          p.title,
          p.jyotsvanSku,
          p.title.slice(0, 40),
        ]
      );
    }

    // Seed Sample Amazon Orders & Order Items
    const sampleOrders = [
      {
        id: 'ord-amz-001',
        extId: '402-8921823-9182311',
        date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        status: 'SHIPPED',
        channel: 'AFN',
        total: 1298.00,
        itemsSubtotal: 1298.00,
        shipping: 0.00,
        tax: 64.90,
        discount: 0.00,
        buyerName: 'Aditya Sharma',
        buyerEmail: 'aditya.sharma.amz@marketplace.amazon.in',
        isPrime: true,
        items: [
          {
            id: 'item-001-a',
            extItemId: 'amz-item-991283',
            sku: 'JYOT-ASHWA-500G',
            asin: 'B09X7K9LM1',
            title: 'Jyotsvan Organic Ashwagandha Root Powder 500g',
            qty: 2,
            price: 649.00,
            tax: 32.45,
          },
        ],
      },
      {
        id: 'ord-amz-002',
        extId: '405-3912093-1829302',
        date: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        status: 'DELIVERED',
        channel: 'AFN',
        total: 1389.00,
        itemsSubtotal: 1389.00,
        shipping: 0.00,
        tax: 69.45,
        discount: 0.00,
        buyerName: 'Sneha Kulkarni',
        buyerEmail: 'sneha.k.amz@marketplace.amazon.in',
        isPrime: true,
        items: [
          {
            id: 'item-002-a',
            extItemId: 'amz-item-109283',
            sku: 'JYOT-CHYAWAN-1KG',
            asin: 'B09W1Q5TU4',
            title: 'Jyotsvan Heritage Chyawanprash Gold 1kg',
            qty: 1,
            price: 890.00,
            tax: 44.50,
          },
          {
            id: 'item-002-b',
            extItemId: 'amz-item-109284',
            sku: 'JYOT-TRI-60CAP',
            asin: 'B08Y2N4PQ2',
            title: 'Jyotsvan Triphala Digestive Care 60 Vegan Capsules',
            qty: 1,
            price: 499.00,
            tax: 24.95,
          },
        ],
      },
      {
        id: 'ord-amz-003',
        extId: '407-1902834-5839201',
        date: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        status: 'UNSHIPPED',
        channel: 'MFN',
        total: 760.00,
        itemsSubtotal: 700.00,
        shipping: 60.00,
        tax: 38.00,
        discount: 0.00,
        buyerName: 'Rohit Verma',
        buyerEmail: 'rohit.v.amz@marketplace.amazon.in',
        isPrime: false,
        items: [
          {
            id: 'item-003-a',
            extItemId: 'amz-item-382910',
            sku: 'JYOT-BRAHMI-200ML',
            asin: 'B07Z3M8RS3',
            title: 'Jyotsvan Pure Brahmi Memory & Focus Tonic 200ml',
            qty: 2,
            price: 350.00,
            tax: 19.00,
          },
        ],
      },
      {
        id: 'ord-amz-004',
        extId: '408-5928192-3849102',
        date: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
        status: 'SHIPPED',
        channel: 'AFN',
        total: 649.00,
        itemsSubtotal: 649.00,
        shipping: 0.00,
        tax: 32.45,
        discount: 0.00,
        buyerName: 'Pooja Iyer',
        buyerEmail: 'pooja.i.amz@marketplace.amazon.in',
        isPrime: true,
        items: [
          {
            id: 'item-004-a',
            extItemId: 'amz-item-839102',
            sku: 'JYOT-ASHWA-500G',
            asin: 'B09X7K9LM1',
            title: 'Jyotsvan Organic Ashwagandha Root Powder 500g',
            qty: 1,
            price: 649.00,
            tax: 32.45,
          },
        ],
      },
    ];

    for (const ord of sampleOrders) {
      await client.query(
        `INSERT INTO marketplace_orders (
          id, organization_id, connection_id, provider_key, marketplace_id,
          external_order_id, order_number, purchase_date, last_update_date,
          order_status, fulfillment_channel, sales_channel, currency,
          order_total, items_subtotal, shipping_price, tax_total, discount_total,
          buyer_email, buyer_name, is_prime, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'amazon', $4,
          $5, $6, $7, NOW(),
          $8, $9, 'Amazon.in', 'INR',
          $10, $11, $12, $13, $14,
          $15, $16, $17, NOW(), NOW()
        ) ON CONFLICT (connection_id, external_order_id) DO NOTHING;`,
        [
          ord.id,
          orgId,
          amazonConnId,
          primaryMarketplaceId,
          ord.extId,
          ord.extId,
          ord.date,
          ord.status,
          ord.channel,
          ord.total,
          ord.itemsSubtotal,
          ord.shipping,
          ord.tax,
          ord.discount,
          ord.buyerEmail,
          ord.buyerName,
          ord.isPrime,
        ]
      );

      for (const item of ord.items) {
        await client.query(
          `INSERT INTO marketplace_order_items (
            id, organization_id, connection_id, order_id, external_order_id,
            external_order_item_id, seller_sku, asin, title, quantity_ordered,
            quantity_shipped, item_price, item_tax, shipping_price, shipping_tax,
            item_discount, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $10, $11, $12, 0, 0,
            0, NOW(), NOW()
          ) ON CONFLICT (order_id, external_order_item_id) DO NOTHING;`,
          [
            item.id,
            orgId,
            amazonConnId,
            ord.id,
            ord.extId,
            item.extItemId,
            item.sku,
            item.asin,
            item.title,
            item.qty,
            item.price,
            item.tax,
          ]
        );
      }
    }

    // Seed Sample Returns
    await client.query(
      `INSERT INTO marketplace_returns (
        id, organization_id, connection_id, provider_key, marketplace_id,
        external_return_id, order_id, seller_sku, asin, quantity,
        return_reason, return_reason_details, return_status, return_date,
        refund_amount, currency, fulfillment_center_id, created_at, updated_at
      ) VALUES
        ('ret-amz-01', $1, $2, 'amazon', $3, 'RET-AMZ-991823', 'ord-amz-001', 'JYOT-TRI-60CAP', 'B08Y2N4PQ2', 1, 'Customer cancelled prior to consumption', 'Seal intact, package undamaged.', 'COMPLETED', NOW() - INTERVAL '4 days', 499.00, 'INR', 'DEL4-Bhubaneswar', NOW(), NOW()),
        ('ret-amz-02', $1, $2, 'amazon', $3, 'RET-AMZ-771294', 'ord-amz-002', 'JYOT-ASHWA-500G', 'B09X7K9LM1', 1, 'Package damaged during transit', 'FBA courier transit crushed outer carton. Auto-reimbursed by Amazon.', 'COMPLETED', NOW() - INTERVAL '10 days', 649.00, 'INR', 'BLR1-Bangalore', NOW(), NOW())
      ON CONFLICT (connection_id, external_return_id) DO NOTHING;`,
      [orgId, amazonConnId, primaryMarketplaceId]
    );

    // Seed Sample Reports
    await client.query(
      `INSERT INTO marketplace_reports (
        id, organization_id, connection_id, provider_key, report_id, report_type,
        marketplace_id, data_start_time, data_end_time, report_status,
        document_id, processing_status, records_parsed, generated_at, created_at, updated_at
      ) VALUES
        ('rep-amz-01', $1, $2, 'amazon', 'REP-AMZ-20260901-ORDERS', 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL', $3, NOW() - INTERVAL '30 days', NOW(), 'DONE', 'amzn.doc.0981234a', 'COMPLETED', 148, NOW() - INTERVAL '2 hours', NOW(), NOW()),
        ('rep-amz-02', $1, $2, 'amazon', 'REP-AMZ-20260901-FBA-INV', 'GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA', $3, NOW() - INTERVAL '7 days', NOW(), 'DONE', 'amzn.doc.8829103b', 'COMPLETED', 12, NOW() - INTERVAL '6 hours', NOW(), NOW()),
        ('rep-amz-03', $1, $2, 'amazon', 'REP-AMZ-20260901-SETTLE', 'GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2', $3, NOW() - INTERVAL '14 days', NOW(), 'DONE', 'amzn.doc.7738291c', 'COMPLETED', 84, NOW() - INTERVAL '1 day', NOW(), NOW())
      ON CONFLICT (connection_id, report_id) DO NOTHING;`,
      [orgId, amazonConnId, primaryMarketplaceId]
    );

    // Seed Sample Settlements
    await client.query(
      `INSERT INTO marketplace_settlements (
        id, organization_id, connection_id, provider_key, marketplace_id,
        settlement_id, settlement_start_date, settlement_end_date, deposit_date,
        currency, total_amount, gross_sales_amount, refunds_amount, fees_amount,
        adjustments_amount, taxes_amount, status, created_at, updated_at
      ) VALUES
        ('stl-amz-01', $1, $2, 'amazon', $3, '18920192831', NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'INR', 148920.00, 192450.00, 3200.00, 38130.00, 450.00, 2650.00, 'CLOSED', NOW(), NOW()),
        ('stl-amz-02', $1, $2, 'amazon', $3, '17829102830', NOW() - INTERVAL '28 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 'INR', 134500.00, 178900.00, 2400.00, 40100.00, 0.00, 1900.00, 'CLOSED', NOW(), NOW())
      ON CONFLICT (connection_id, settlement_id) DO NOTHING;`,
      [orgId, amazonConnId, primaryMarketplaceId]
    );

    // Seed Sample Fees
    await client.query(
      `INSERT INTO marketplace_fees (
        id, organization_id, connection_id, provider_key, marketplace_id,
        settlement_id, external_order_id, seller_sku, fee_type, fee_amount,
        currency, description, posted_date, created_at, updated_at
      ) VALUES
        ('fee-01', $1, $2, 'amazon', $3, '18920192831', '402-8921823-9182311', 'JYOT-ASHWA-500G', 'ReferralFee', 97.35, 'INR', 'Amazon 15% Category Referral Fee', NOW() - INTERVAL '3 days', NOW(), NOW()),
        ('fee-02', $1, $2, 'amazon', $3, '18920192831', '402-8921823-9182311', 'JYOT-ASHWA-500G', 'FBAWeightHandling', 45.00, 'INR', 'FBA Standard Weight & Handling Fee', NOW() - INTERVAL '3 days', NOW(), NOW()),
        ('fee-03', $1, $2, 'amazon', $3, '18920192831', '402-8921823-9182311', 'JYOT-ASHWA-500G', 'ClosingFee', 25.00, 'INR', 'Fixed Closing Fee on ₹500-₹1000 tier', NOW() - INTERVAL '3 days', NOW(), NOW()),
        ('fee-04', $1, $2, 'amazon', $3, '18920192831', '405-3912093-1829302', 'JYOT-CHYAWAN-1KG', 'ReferralFee', 133.50, 'INR', 'Amazon 15% Health & Personal Care Referral Fee', NOW() - INTERVAL '14 hours', NOW(), NOW()),
        ('fee-05', $1, $2, 'amazon', $3, '18920192831', '405-3912093-1829302', 'JYOT-CHYAWAN-1KG', 'FBAWeightHandling', 65.00, 'INR', 'FBA Heavy Weight Handling (1kg)', NOW() - INTERVAL '14 hours', NOW(), NOW())
      ON CONFLICT DO NOTHING;`,
      [orgId, amazonConnId, primaryMarketplaceId]
    );

    // Seed Sync Checkpoints
    await client.query(
      `INSERT INTO marketplace_sync_checkpoints (
        id, organization_id, connection_id, provider_key, entity_type, marketplace_id, last_sync_at, status, created_at, updated_at
      ) VALUES
        ('chk-amz-ord', $1, $2, 'amazon', 'orders', $3, NOW() - INTERVAL '25 minutes', 'SUCCESS', NOW(), NOW()),
        ('chk-amz-inv', $1, $2, 'amazon', 'inventory', $3, NOW() - INTERVAL '25 minutes', 'SUCCESS', NOW(), NOW()),
        ('chk-amz-prd', $1, $2, 'amazon', 'products', $3, NOW() - INTERVAL '25 minutes', 'SUCCESS', NOW(), NOW()),
        ('chk-amz-ret', $1, $2, 'amazon', 'returns', $3, NOW() - INTERVAL '25 minutes', 'SUCCESS', NOW(), NOW()),
        ('chk-amz-stl', $1, $2, 'amazon', 'settlements', $3, NOW() - INTERVAL '25 minutes', 'SUCCESS', NOW(), NOW()),
        ('chk-amz-fee', $1, $2, 'amazon', 'fees', $3, NOW() - INTERVAL '25 minutes', 'SUCCESS', NOW(), NOW())
      ON CONFLICT (connection_id, entity_type, marketplace_id) DO UPDATE SET
        last_sync_at = EXCLUDED.last_sync_at,
        status = 'SUCCESS',
        updated_at = NOW();`,
      [orgId, amazonConnId, primaryMarketplaceId]
    );

    // 15. Ensure RBAC Permissions for Marketplaces exist
    const marketplacePermissions = [
      { code: 'marketplaces.view', module: 'commerce', description: 'View connected marketplace channels, listings, orders, and telemetry' },
      { code: 'marketplaces.connect', module: 'commerce', description: 'Authorize and link new Amazon SP-API and marketplace seller accounts' },
      { code: 'marketplaces.manage', module: 'commerce', description: 'Manage marketplace channel settings, pricing rules, and sync intervals' },
      { code: 'marketplaces.sync', module: 'commerce', description: 'Execute manual and historical data synchronization with marketplaces' },
      { code: 'marketplaces.disconnect', module: 'commerce', description: 'Revoke and decouple marketplace seller accounts' },
      { code: 'marketplaces.mapping.manage', module: 'commerce', description: 'Map external marketplace SKUs/ASINs to internal Jyotsvan product variants' },
      { code: 'marketplaces.financial.view', module: 'commerce', description: 'Inspect settlement statements, commission breakdowns, and fee ledgers' },
    ];

    for (const perm of marketplacePermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;`,
        [`perm-${perm.code.replace(/\./g, '-')}`, perm.code, perm.module, perm.description]
      );
    }

    // Grant all marketplace permissions to Owner & Admin roles
    const adminRoles = await client.query(`SELECT id FROM roles WHERE slug IN ('owner', 'admin', 'system-administrator')`);
    for (const r of adminRoles.rows) {
      for (const perm of marketplacePermissions) {
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
    console.log('[Phase 31 Migration] ✓ Marketplace Engine & Amazon SP-API schema initialized successfully.');
  } catch (err: unknown) {
    await client.query('ROLLBACK;');
    const errorMsg = err instanceof Error ? err.message : 'Amazon migration failed';
    console.error('[Phase 31 Migration] ✗ Migration Error:', errorMsg);
    throw err;
  } finally {
    client.release();
  }
}
