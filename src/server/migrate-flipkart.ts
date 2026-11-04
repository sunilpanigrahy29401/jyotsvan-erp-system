// src/server/migrate-flipkart.ts
// Phase 32: Flipkart Seller API Integration Schema & Seed Migration

import { pool } from './db.ts';
import { encryptCredentials } from './crypto-vault.ts';
import type { IntegrationProvider } from '../types/integrations.ts';

export const FLIPKART_INTEGRATION_PROVIDER: Omit<IntegrationProvider, 'id' | 'created_at' | 'updated_at'> = {
  provider_key: 'flipkart',
  name: 'Flipkart Seller API Hub',
  description: 'Synchronize Flipkart marketplace orders, Smart/Non-Smart inventory, catalog listings (FSN), returns (RTO), and seller performance metrics via authorized Seller APIs.',
  category: 'commerce',
  icon_name: 'ShoppingBag',
  documentation_url: 'https://seller.flipkart.com/api-docs/',
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
    performance: true,
    oauth: true,
    test_connection: true,
    rate_limit_rps: 10,
  },
  configuration_schema: {
    instructions: 'Configure your Flipkart Seller API Application ID, Application Secret, Seller ID, and Location ID.',
    fields: [
      {
        key: 'app_id',
        label: 'Flipkart Application ID (App ID)',
        type: 'text',
        required: true,
        placeholder: 'app-prod-jyotsvan-8821',
        helpText: 'The Application ID generated from your Flipkart Developer Console.',
      },
      {
        key: 'app_secret',
        label: 'Application Secret (App Secret)',
        type: 'secret',
        required: true,
        placeholder: '••••••••••••••••••••••••••••••••',
        helpText: 'Secret key provided alongside the App ID.',
      },
      {
        key: 'seller_id',
        label: 'Flipkart Seller ID / Merchant ID',
        type: 'text',
        required: true,
        placeholder: 'FK_SELLER_JYOTSVAN_ORG',
        helpText: 'Your unique Merchant / Display Seller ID on Flipkart.',
      },
      {
        key: 'location_id',
        label: 'Primary Pickup Location ID',
        type: 'text',
        required: false,
        placeholder: 'LOC_BLR_01',
        helpText: 'Registered seller warehouse location ID for dispatch scheduling.',
      },
      {
        key: 'environment',
        label: 'API Environment',
        type: 'select',
        required: true,
        defaultValue: 'production',
        options: [
          { label: 'Production (api.flipkart.net)', value: 'production' },
          { label: 'Sandbox / Staging (sandbox-api.flipkart.net)', value: 'sandbox' },
        ],
      },
    ],
  },
};

export async function migrateFlipkartIntegration(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Phase 32] Starting Flipkart Marketplace Integration Migration...');
    await client.query('BEGIN');

    // 1. Create marketplace_performance table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_performance (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider_key VARCHAR(64) NOT NULL,
        metric_name VARCHAR(128) NOT NULL,
        metric_key VARCHAR(64) NOT NULL,
        metric_category VARCHAR(64) NOT NULL,
        current_value NUMERIC(10, 2) NOT NULL,
        benchmark_target NUMERIC(10, 2) NOT NULL,
        unit VARCHAR(32) DEFAULT '%' NOT NULL,
        status VARCHAR(32) DEFAULT 'GOOD' NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        historical_trend JSONB DEFAULT '[]'::jsonb NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_perf_metric UNIQUE (connection_id, metric_key, period_start)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mkt_perf_conn_cat ON marketplace_performance(connection_id, metric_category);
    `);

    // 2. Ensure Provider row in integration_providers
    const existingProvider = await client.query(
      'SELECT id FROM integration_providers WHERE provider_key = $1',
      ['flipkart']
    );

    if (existingProvider.rows.length === 0) {
      await client.query(
        `INSERT INTO integration_providers (
          id, provider_key, name, description, category, icon_name,
          documentation_url, status, implementation_status, capabilities,
          configuration_schema, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          'prov_flipkart_01',
          FLIPKART_INTEGRATION_PROVIDER.provider_key,
          FLIPKART_INTEGRATION_PROVIDER.name,
          FLIPKART_INTEGRATION_PROVIDER.description,
          FLIPKART_INTEGRATION_PROVIDER.category,
          FLIPKART_INTEGRATION_PROVIDER.icon_name,
          FLIPKART_INTEGRATION_PROVIDER.documentation_url,
          FLIPKART_INTEGRATION_PROVIDER.status,
          FLIPKART_INTEGRATION_PROVIDER.implementation_status,
          JSON.stringify(FLIPKART_INTEGRATION_PROVIDER.capabilities),
          JSON.stringify(FLIPKART_INTEGRATION_PROVIDER.configuration_schema),
        ]
      );
    }

    // 3. Get organization ID (default 'org_01')
    const orgRes = await client.query('SELECT id FROM organizations LIMIT 1');
    const orgId = orgRes.rows[0]?.id || 'org_01';

    // 4. Register Flipkart Marketplace record in marketplace_marketplaces
    await client.query(
      `INSERT INTO marketplace_marketplaces (
        id, provider_key, marketplace_id, country_code, country_name,
        currency_code, name, domain_name, default_language_code,
        is_active, supports_fba, supports_mfn, raw_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (provider_key, marketplace_id) DO UPDATE SET
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()`,
      [
        'mkt_fk_in',
        'flipkart',
        'FLIPKART_IN',
        'IN',
        'India',
        'INR',
        'Flipkart Marketplace India',
        'flipkart.com',
        'en_IN',
        true,
        true, // Supports Flipkart Smart (FBF)
        true, // Supports Non-Smart / Direct Seller Fulfilled
        JSON.stringify({ platform: 'Flipkart Seller Hub', api_version: 'v3' }),
      ]
    );

    // 5. Create or retrieve active integration connection
    const connCheck = await client.query(
      'SELECT id FROM integration_connections WHERE organization_id = $1 AND provider_key = $2',
      [orgId, 'flipkart']
    );

    let connectionId = 'conn_flipkart_01';
    if (connCheck.rows.length === 0) {
      const encryptedCreds = encryptCredentials({
        app_id: 'app-prod-jyotsvan-8821',
        app_secret: 'fk_sec_9948271049284102948102948',
        seller_id: 'FK_SELLER_JYOTSVAN_ORG',
        location_id: 'LOC_BLR_01',
      });

      await client.query(
        `INSERT INTO integration_connections (
          id, organization_id, provider_id, provider_key, name,
          status, auth_type, encrypted_credentials, configuration,
          last_sync_at, last_health_check_at, error_count, consecutive_failures,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '12 minutes', NOW(), 0, 0, NOW(), NOW())`,
        [
          connectionId,
          orgId,
          'prov_flipkart_01',
          'flipkart',
          'Flipkart Official Store - Jyotsvan Enterprises',
          'connected',
          'oauth2',
          JSON.stringify(encryptedCreds),
          JSON.stringify({
            app_id: 'app-prod-jyotsvan-8821',
            seller_id: 'FK_SELLER_JYOTSVAN_ORG',
            location_id: 'LOC_BLR_01',
            primary_marketplace_id: 'FLIPKART_IN',
            environment: 'production',
            sync_orders: true,
            sync_listings: true,
            sync_inventory: true,
            sync_returns: true,
            sync_performance: true,
            auto_acknowledge_orders: true,
          }),
        ]
      );
    } else {
      connectionId = connCheck.rows[0].id;
    }

    // 6. Seed SKU Mappings (Flipkart Seller SKU -> Jyotsvan Internal Master SKU)
    const skuMappings = [
      {
        id: 'map_fk_01',
        marketplaceSku: 'FK-ASHWA-500',
        marketplaceAsin: 'FSNASHWA10192',
        jyotsvanSku: 'JYT-ASH-CAP-60',
        productName: 'Jyotsvan Ashwagandha Organic Rasayana (60 Veg Capsules)',
        status: 'MAPPED',
        confidenceScore: 1.0,
      },
      {
        id: 'map_fk_02',
        marketplaceSku: 'FK-BRAHMI-60',
        marketplaceAsin: 'FSNBRAHM20293',
        jyotsvanSku: 'JYT-BRH-VTI-60',
        productName: 'Jyotsvan Brahmi Memory & Focus Vati (60 Tablets)',
        status: 'MAPPED',
        confidenceScore: 1.0,
      },
      {
        id: 'map_fk_03',
        marketplaceSku: 'FK-TRIPH-200',
        marketplaceAsin: 'FSNTRIPH30394',
        jyotsvanSku: 'JYT-TPH-CHR-200',
        productName: 'Jyotsvan Triphala Digest Cleanse Churna (200g Powder)',
        status: 'MAPPED',
        confidenceScore: 1.0,
      },
      {
        id: 'map_fk_04',
        marketplaceSku: 'FK-CHYAW-1KG',
        marketplaceAsin: 'FSNCHYAW40495',
        jyotsvanSku: 'JYT-CHY-SPL-1000',
        productName: 'Jyotsvan Special Gold Chyawanprash (1kg Jar)',
        status: 'MAPPED',
        confidenceScore: 1.0,
      },
      {
        id: 'map_fk_05',
        marketplaceSku: 'FK-KUMK-30ML',
        marketplaceAsin: 'FSNKUMKA50596',
        jyotsvanSku: 'JYT-KMK-OIL-30',
        productName: 'Jyotsvan Kumkumadi Radiant Glow Tailam (30ml Dropper)',
        status: 'MAPPED',
        confidenceScore: 1.0,
      },
    ];

    for (const m of skuMappings) {
      await client.query(
        `INSERT INTO marketplace_entity_mappings (
          id, organization_id, connection_id, provider_key,
          entity_type, marketplace_sku, marketplace_asin, jyotsvan_sku,
          jyotsvan_product_id, mapping_status, confidence_score,
          verified_by, verified_at, raw_metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13, NOW(), NOW())
        ON CONFLICT (connection_id, marketplace_sku) DO UPDATE SET
          marketplace_asin = EXCLUDED.marketplace_asin,
          jyotsvan_sku = EXCLUDED.jyotsvan_sku,
          mapping_status = EXCLUDED.mapping_status,
          updated_at = NOW()`,
        [
          m.id,
          orgId,
          connectionId,
          'flipkart',
          'PRODUCT',
          m.marketplaceSku,
          m.marketplaceAsin,
          m.jyotsvanSku,
          m.jyotsvanSku,
          m.status,
          m.confidenceScore,
          'admin@jyotsvan.enterprise',
          JSON.stringify({ product_title: m.productName }),
        ]
      );
    }

    // 7. Seed Catalog Products / Listings
    const listings = [
      {
        id: 'prod_fk_01',
        sellerSku: 'FK-ASHWA-500',
        asin: 'FSNASHWA10192',
        fnsku: 'FBD-ASH-001',
        title: 'Jyotsvan Organic Ashwagandha Pure Root Extract (60 Veg Caps)',
        status: 'ACTIVE',
        listingPrice: 699.0,
        mrp: 899.0,
        currency: 'INR',
        fulfillmentChannel: 'FLIPKART_SMART',
        brand: 'Jyotsvan Organics',
        category: 'Ayurvedic Health & Vitality',
      },
      {
        id: 'prod_fk_02',
        sellerSku: 'FK-BRAHMI-60',
        asin: 'FSNBRAHM20293',
        fnsku: 'FBD-BRH-002',
        title: 'Jyotsvan Brahmi Mental Clarity & Sleep Support Vati (60 Tab)',
        status: 'ACTIVE',
        listingPrice: 549.0,
        mrp: 699.0,
        currency: 'INR',
        fulfillmentChannel: 'FLIPKART_SMART',
        brand: 'Jyotsvan Organics',
        category: 'Ayurvedic Supplements',
      },
      {
        id: 'prod_fk_03',
        sellerSku: 'FK-TRIPH-200',
        asin: 'FSNTRIPH30394',
        fnsku: 'FBD-TPH-003',
        title: 'Jyotsvan Traditional Triphala Churna Pure Detox (200g)',
        status: 'ACTIVE',
        listingPrice: 380.0,
        mrp: 499.0,
        currency: 'INR',
        fulfillmentChannel: 'SELLER_FULFILLED',
        brand: 'Jyotsvan Organics',
        category: 'Digestive Health',
      },
      {
        id: 'prod_fk_04',
        sellerSku: 'FK-CHYAW-1KG',
        asin: 'FSNCHYAW40495',
        fnsku: 'FBD-CHY-004',
        title: 'Jyotsvan Gold Kesari Chyawanprash with Saffron (1kg Jar)',
        status: 'ACTIVE',
        listingPrice: 1150.0,
        mrp: 1450.0,
        currency: 'INR',
        fulfillmentChannel: 'FLIPKART_SMART',
        brand: 'Jyotsvan Organics',
        category: 'Immunity & Rasayana',
      },
      {
        id: 'prod_fk_05',
        sellerSku: 'FK-KUMK-30ML',
        asin: 'FSNKUMKA50596',
        fnsku: 'FBD-KMK-005',
        title: 'Jyotsvan Miraculous Kumkumadi Beauty Ayurvedic Tailam (30ml)',
        status: 'ACTIVE',
        listingPrice: 1499.0,
        mrp: 1899.0,
        currency: 'INR',
        fulfillmentChannel: 'FLIPKART_SMART',
        brand: 'Jyotsvan Organics',
        category: 'Ayurvedic Skincare',
      },
    ];

    for (const p of listings) {
      await client.query(
        `INSERT INTO marketplace_products (
          id, organization_id, connection_id, provider_key, marketplace_id,
          seller_sku, asin, fnsku, title, product_type, brand, category,
          listing_price, mrp, currency, fulfillment_channel, item_condition,
          status, buy_box_eligible, has_buy_box, buy_box_price, buy_box_owner,
          raw_metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW())
        ON CONFLICT (connection_id, marketplace_id, seller_sku) DO UPDATE SET
          title = EXCLUDED.title,
          listing_price = EXCLUDED.listing_price,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          p.id,
          orgId,
          connectionId,
          'flipkart',
          'FLIPKART_IN',
          p.sellerSku,
          p.asin,
          p.fnsku,
          p.title,
          'HERBAL_SUPPLEMENT',
          p.brand,
          p.category,
          p.listingPrice,
          p.mrp,
          p.currency,
          p.fulfillmentChannel,
          'New',
          p.status,
          true,
          true,
          p.listingPrice,
          'Jyotsvan Enterprises',
          JSON.stringify({ fsn: p.asin, seller_hub_tier: 'Gold', flipkart_assured: true }),
        ]
      );
    }

    // 8. Seed Multi-Location Inventory
    const inventoryItems = [
      {
        id: 'inv_fk_01',
        sellerSku: 'FK-ASHWA-500',
        asin: 'FSNASHWA10192',
        fnsku: 'FBD-ASH-001',
        fulfillmentChannel: 'FLIPKART_SMART',
        quantityAvailable: 340,
        quantityReserved: 24,
        quantityInTransit: 80,
      },
      {
        id: 'inv_fk_02',
        sellerSku: 'FK-BRAHMI-60',
        asin: 'FSNBRAHM20293',
        fnsku: 'FBD-BRH-002',
        fulfillmentChannel: 'FLIPKART_SMART',
        quantityAvailable: 210,
        quantityReserved: 12,
        quantityInTransit: 50,
      },
      {
        id: 'inv_fk_03',
        sellerSku: 'FK-TRIPH-200',
        asin: 'FSNTRIPH30394',
        fnsku: 'FBD-TPH-003',
        fulfillmentChannel: 'SELLER_FULFILLED',
        quantityAvailable: 155,
        quantityReserved: 8,
        quantityInTransit: 0,
      },
      {
        id: 'inv_fk_04',
        sellerSku: 'FK-CHYAW-1KG',
        asin: 'FSNCHYAW40495',
        fnsku: 'FBD-CHY-004',
        fulfillmentChannel: 'FLIPKART_SMART',
        quantityAvailable: 180,
        quantityReserved: 15,
        quantityInTransit: 40,
      },
      {
        id: 'inv_fk_05',
        sellerSku: 'FK-KUMK-30ML',
        asin: 'FSNKUMKA50596',
        fnsku: 'FBD-KMK-005',
        fulfillmentChannel: 'FLIPKART_SMART',
        quantityAvailable: 95,
        quantityReserved: 6,
        quantityInTransit: 25,
      },
    ];

    for (const inv of inventoryItems) {
      await client.query(
        `INSERT INTO marketplace_inventory (
          id, organization_id, connection_id, provider_key, marketplace_id,
          seller_sku, asin, fnsku, fulfillment_channel, quantity_available,
          quantity_reserved, quantity_inbound, quantity_unfulfillable,
          quantity_total, location_id, raw_metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        ON CONFLICT (connection_id, marketplace_id, seller_sku, fulfillment_channel) DO UPDATE SET
          quantity_available = EXCLUDED.quantity_available,
          quantity_reserved = EXCLUDED.quantity_reserved,
          quantity_inbound = EXCLUDED.quantity_inbound,
          quantity_total = EXCLUDED.quantity_total,
          updated_at = NOW()`,
        [
          inv.id,
          orgId,
          connectionId,
          'flipkart',
          'FLIPKART_IN',
          inv.sellerSku,
          inv.asin,
          inv.fnsku,
          inv.fulfillmentChannel,
          inv.quantityAvailable,
          inv.quantityReserved,
          inv.quantityInTransit,
          0,
          inv.quantityAvailable + inv.quantityReserved + inv.quantityInTransit,
          inv.fulfillmentChannel === 'FLIPKART_SMART' ? 'WH_FK_BLR_NORTH' : 'LOC_BLR_01',
          JSON.stringify({ safety_stock_threshold: 20, fc_code: 'FK_FC_BLR_02' }),
        ]
      );
    }

    // 9. Seed Orders and Line Items
    const orders = [
      {
        id: 'ord_fk_101',
        externalOrderId: 'OD3029182736410192',
        orderNumber: 'OD3029182736410192',
        purchaseDate: new Date(Date.now() - 4 * 3600000).toISOString(),
        orderStatus: 'SHIPPED',
        fulfillmentChannel: 'FLIPKART_SMART',
        paymentMethod: 'PREPAID',
        buyerCity: 'Bengaluru',
        buyerState: 'Karnataka',
        buyerPostalCode: '560038',
        subtotal: 1398.0,
        taxAmount: 167.76,
        shippingAmount: 0.0,
        discountAmount: 0.0,
        grandTotal: 1398.0,
        currency: 'INR',
        isPrime: true,
        items: [
          {
            id: 'item_fk_101_1',
            externalOrderItemId: 'ITEM_FK_001_A',
            sellerSku: 'FK-ASHWA-500',
            asin: 'FSNASHWA10192',
            title: 'Jyotsvan Organic Ashwagandha Pure Root Extract (60 Veg Caps)',
            quantity: 2,
            itemPrice: 699.0,
            itemTax: 83.88,
            shippingPrice: 0,
            itemTotal: 1398.0,
          },
        ],
      },
      {
        id: 'ord_fk_102',
        externalOrderId: 'OD3029182736410283',
        orderNumber: 'OD3029182736410283',
        purchaseDate: new Date(Date.now() - 14 * 3600000).toISOString(),
        orderStatus: 'DELIVERED',
        fulfillmentChannel: 'FLIPKART_SMART',
        paymentMethod: 'COD',
        buyerCity: 'Mumbai',
        buyerState: 'Maharashtra',
        buyerPostalCode: '400050',
        subtotal: 1150.0,
        taxAmount: 138.0,
        shippingAmount: 40.0,
        discountAmount: 50.0,
        grandTotal: 1140.0,
        currency: 'INR',
        isPrime: true,
        items: [
          {
            id: 'item_fk_102_1',
            externalOrderItemId: 'ITEM_FK_002_A',
            sellerSku: 'FK-CHYAW-1KG',
            asin: 'FSNCHYAW40495',
            title: 'Jyotsvan Gold Kesari Chyawanprash with Saffron (1kg Jar)',
            quantity: 1,
            itemPrice: 1150.0,
            itemTax: 138.0,
            shippingPrice: 40.0,
            itemTotal: 1140.0,
          },
        ],
      },
      {
        id: 'ord_fk_103',
        externalOrderId: 'OD3029182736410374',
        orderNumber: 'OD3029182736410374',
        purchaseDate: new Date(Date.now() - 28 * 3600000).toISOString(),
        orderStatus: 'APPROVED',
        fulfillmentChannel: 'SELLER_FULFILLED',
        paymentMethod: 'PREPAID',
        buyerCity: 'Hyderabad',
        buyerState: 'Telangana',
        buyerPostalCode: '500081',
        subtotal: 1499.0,
        taxAmount: 179.88,
        shippingAmount: 0.0,
        discountAmount: 0.0,
        grandTotal: 1499.0,
        currency: 'INR',
        isPrime: false,
        items: [
          {
            id: 'item_fk_103_1',
            externalOrderItemId: 'ITEM_FK_003_A',
            sellerSku: 'FK-KUMK-30ML',
            asin: 'FSNKUMKA50596',
            title: 'Jyotsvan Miraculous Kumkumadi Beauty Ayurvedic Tailam (30ml)',
            quantity: 1,
            itemPrice: 1499.0,
            itemTax: 179.88,
            shippingPrice: 0.0,
            itemTotal: 1499.0,
          },
        ],
      },
      {
        id: 'ord_fk_104',
        externalOrderId: 'OD3029182736410465',
        orderNumber: 'OD3029182736410465',
        purchaseDate: new Date(Date.now() - 52 * 3600000).toISOString(),
        orderStatus: 'DELIVERED',
        fulfillmentChannel: 'FLIPKART_SMART',
        paymentMethod: 'PREPAID',
        buyerCity: 'Pune',
        buyerState: 'Maharashtra',
        buyerPostalCode: '411004',
        subtotal: 929.0,
        taxAmount: 111.48,
        shippingAmount: 0.0,
        discountAmount: 0.0,
        grandTotal: 929.0,
        currency: 'INR',
        isPrime: true,
        items: [
          {
            id: 'item_fk_104_1',
            externalOrderItemId: 'ITEM_FK_004_A',
            sellerSku: 'FK-BRAHMI-60',
            asin: 'FSNBRAHM20293',
            title: 'Jyotsvan Brahmi Mental Clarity & Sleep Support Vati (60 Tab)',
            quantity: 1,
            itemPrice: 549.0,
            itemTax: 65.88,
            shippingPrice: 0.0,
            itemTotal: 549.0,
          },
          {
            id: 'item_fk_104_2',
            externalOrderItemId: 'ITEM_FK_004_B',
            sellerSku: 'FK-TRIPH-200',
            asin: 'FSNTRIPH30394',
            title: 'Jyotsvan Traditional Triphala Churna Pure Detox (200g)',
            quantity: 1,
            itemPrice: 380.0,
            itemTax: 45.6,
            shippingPrice: 0.0,
            itemTotal: 380.0,
          },
        ],
      },
    ];

    for (const o of orders) {
      await client.query(
        `INSERT INTO marketplace_orders (
          id, organization_id, connection_id, provider_key, marketplace_id,
          external_order_id, order_number, purchase_date, last_update_date,
          order_status, fulfillment_channel, sales_channel, payment_method,
          is_prime, is_replacement_order, buyer_city, buyer_state, buyer_postal_code,
          buyer_country, currency, subtotal, tax_amount, shipping_amount,
          discount_amount, grand_total, item_count, raw_metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW())
        ON CONFLICT (connection_id, external_order_id) DO UPDATE SET
          order_status = EXCLUDED.order_status,
          grand_total = EXCLUDED.grand_total,
          updated_at = NOW()`,
        [
          o.id,
          orgId,
          connectionId,
          'flipkart',
          'FLIPKART_IN',
          o.externalOrderId,
          o.orderNumber,
          o.purchaseDate,
          o.orderStatus,
          o.fulfillmentChannel,
          'Flipkart.com',
          o.paymentMethod,
          o.isPrime,
          false,
          o.buyerCity,
          o.buyerState,
          o.buyerPostalCode,
          'IN',
          o.currency,
          o.subtotal,
          o.taxAmount,
          o.shippingAmount,
          o.discountAmount,
          o.grandTotal,
          o.items.length,
          JSON.stringify({ tracking_id: `EKART_${o.externalOrderId.slice(-6)}`, dispatch_by_date: new Date(Date.now() + 24 * 3600000).toISOString() }),
        ]
      );

      for (const item of o.items) {
        await client.query(
          `INSERT INTO marketplace_order_items (
            id, organization_id, connection_id, provider_key, marketplace_id,
            order_id, external_order_item_id, seller_sku, asin, title,
            quantity_ordered, quantity_shipped, quantity_canceled, item_price,
            item_tax, shipping_price, shipping_tax, discount_amount, item_total,
            currency, raw_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
          ON CONFLICT (connection_id, external_order_item_id) DO UPDATE SET
            quantity_shipped = EXCLUDED.quantity_shipped,
            item_total = EXCLUDED.item_total,
            updated_at = NOW()`,
          [
            item.id,
            orgId,
            connectionId,
            'flipkart',
            'FLIPKART_IN',
            o.id,
            item.externalOrderItemId,
            item.sellerSku,
            item.asin,
            item.title,
            item.quantity,
            item.quantity,
            0,
            item.itemPrice,
            item.itemTax,
            item.shippingPrice,
            0,
            0,
            item.itemTotal,
            'INR',
            JSON.stringify({ fsn: item.asin, hsn_code: '30049011', gst_percentage: 12 }),
          ]
        );
      }
    }

    // 10. Seed Returns (Customer & RTO Returns)
    const returnsData = [
      {
        id: 'ret_fk_01',
        externalReturnId: 'RET_FK_991823',
        orderId: 'ord_fk_102',
        orderItemId: 'item_fk_102_1',
        sellerSku: 'FK-CHYAW-1KG',
        asin: 'FSNCHYAW40495',
        quantity: 1,
        returnReason: 'TRANSIT_SEAL_DAMAGED',
        returnReasonDetails: 'Outer seal popped during transit handling; customer requested replacement.',
        returnStatus: 'RECEIVED_AT_FC',
        returnDate: new Date(Date.now() - 3 * 86400000).toISOString(),
        refundAmount: 1140.0,
      },
      {
        id: 'ret_fk_02',
        externalReturnId: 'RET_FK_991845',
        orderId: 'ord_fk_104',
        orderItemId: 'item_fk_104_1',
        sellerSku: 'FK-BRAHMI-60',
        asin: 'FSNBRAHM20293',
        quantity: 1,
        returnReason: 'CUSTOMER_CANCELED_AT_DOORSTEP',
        returnReasonDetails: 'Courier RTO - consignee refused delivery at address.',
        returnStatus: 'RTO_IN_TRANSIT',
        returnDate: new Date(Date.now() - 1 * 86400000).toISOString(),
        refundAmount: 549.0,
      },
    ];

    for (const r of returnsData) {
      await client.query(
        `INSERT INTO marketplace_returns (
          id, organization_id, connection_id, provider_key, marketplace_id,
          external_return_id, order_id, order_item_id, seller_sku, asin,
          quantity, return_reason, return_reason_details, return_status,
          return_date, refund_amount, currency, fulfillment_center_id,
          raw_metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        ON CONFLICT (connection_id, external_return_id) DO UPDATE SET
          return_status = EXCLUDED.return_status,
          refund_amount = EXCLUDED.refund_amount,
          updated_at = NOW()`,
        [
          r.id,
          orgId,
          connectionId,
          'flipkart',
          'FLIPKART_IN',
          r.externalReturnId,
          r.orderId,
          r.orderItemId,
          r.sellerSku,
          r.asin,
          r.quantity,
          r.returnReason,
          r.returnReasonDetails,
          r.returnStatus,
          r.returnDate,
          r.refundAmount,
          'INR',
          'FK_FC_BLR_02',
          JSON.stringify({ courier: 'Ekart Logistics', rto_tracking: `EKRTO_${r.externalReturnId.slice(-6)}` }),
        ]
      );
    }

    // 11. Seed Seller Performance Metrics
    const performanceMetrics = [
      {
        id: 'perf_fk_01',
        metricName: 'SLA Breach Rate (Ready-to-Dispatch)',
        metricKey: 'SLA_BREACH_RATE',
        metricCategory: 'FULFILLMENT',
        currentValue: 0.12,
        benchmarkTarget: 1.0,
        unit: '%',
        status: 'EXCELLENT',
        trend: [
          { date: '2026-09-17', value: 0.2 },
          { date: '2026-09-18', value: 0.18 },
          { date: '2026-09-19', value: 0.15 },
          { date: '2026-09-20', value: 0.14 },
          { date: '2026-09-21', value: 0.12 },
        ],
      },
      {
        id: 'perf_fk_02',
        metricName: 'Seller Cancellation Rate',
        metricKey: 'SELLER_CANCELLATION_RATE',
        metricCategory: 'CANCELLATION',
        currentValue: 0.05,
        benchmarkTarget: 0.5,
        unit: '%',
        status: 'EXCELLENT',
        trend: [
          { date: '2026-09-17', value: 0.05 },
          { date: '2026-09-18', value: 0.05 },
          { date: '2026-09-19', value: 0.05 },
          { date: '2026-09-20', value: 0.05 },
          { date: '2026-09-21', value: 0.05 },
        ],
      },
      {
        id: 'perf_fk_03',
        metricName: 'Customer Return Rate',
        metricKey: 'CUSTOMER_RETURN_RATE',
        metricCategory: 'RETURNS',
        currentValue: 1.45,
        benchmarkTarget: 3.5,
        unit: '%',
        status: 'GOOD',
        trend: [
          { date: '2026-09-17', value: 1.8 },
          { date: '2026-09-18', value: 1.6 },
          { date: '2026-09-19', value: 1.55 },
          { date: '2026-09-20', value: 1.5 },
          { date: '2026-09-21', value: 1.45 },
        ],
      },
      {
        id: 'perf_fk_04',
        metricName: 'Product Quality & Customer Rating',
        metricKey: 'AVERAGE_PRODUCT_RATING',
        metricCategory: 'RATING',
        currentValue: 4.74,
        benchmarkTarget: 4.5,
        unit: '★',
        status: 'EXCELLENT',
        trend: [
          { date: '2026-09-17', value: 4.7 },
          { date: '2026-09-18', value: 4.71 },
          { date: '2026-09-19', value: 4.72 },
          { date: '2026-09-20', value: 4.73 },
          { date: '2026-09-21', value: 4.74 },
        ],
      },
      {
        id: 'perf_fk_05',
        metricName: 'Flipkart Seller Tier Badge',
        metricKey: 'SELLER_TIER_STATUS',
        metricCategory: 'SERVICE_QUALITY',
        currentValue: 1.0, // 1 = Gold Tier
        benchmarkTarget: 1.0,
        unit: 'Tier',
        status: 'EXCELLENT',
        trend: [
          { date: '2026-09-17', value: 1.0 },
          { date: '2026-09-18', value: 1.0 },
          { date: '2026-09-19', value: 1.0 },
          { date: '2026-09-20', value: 1.0 },
          { date: '2026-09-21', value: 1.0 },
        ],
      },
    ];

    for (const perf of performanceMetrics) {
      await client.query(
        `INSERT INTO marketplace_performance (
          id, organization_id, connection_id, provider_key,
          metric_name, metric_key, metric_category, current_value,
          benchmark_target, unit, status, period_start, period_end,
          historical_trend, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - INTERVAL '30 days', NOW(), $12, $13, NOW(), NOW())
        ON CONFLICT (connection_id, metric_key, period_start) DO UPDATE SET
          current_value = EXCLUDED.current_value,
          status = EXCLUDED.status,
          historical_trend = EXCLUDED.historical_trend,
          updated_at = NOW()`,
        [
          perf.id,
          orgId,
          connectionId,
          'flipkart',
          perf.metricName,
          perf.metricKey,
          perf.metricCategory,
          perf.currentValue,
          perf.benchmarkTarget,
          perf.unit,
          perf.status,
          JSON.stringify(perf.trend),
          JSON.stringify({ tier: 'Gold Seller', fee_discount_applied: '15% lower commission rate' }),
        ]
      );
    }

    await client.query('COMMIT');
    console.log('[Phase 32] Flipkart Marketplace Integration migrated and seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Phase 32] Error migrating Flipkart Marketplace Integration:', err);
    throw err;
  } finally {
    client.release();
  }
}
