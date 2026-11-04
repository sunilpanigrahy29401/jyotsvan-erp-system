// src/server/migrate-myntra.ts
// Phase 33: Myntra Partner Bridge (PPMP/Omni) Schema & Seed Migration

import { pool } from './db.ts';
import { encryptCredentials } from './crypto-vault.ts';
import type { IntegrationProvider } from '../types/integrations.ts';

export const MYNTRA_INTEGRATION_PROVIDER: Omit<IntegrationProvider, 'id' | 'created_at' | 'updated_at'> = {
  provider_key: 'myntra',
  name: 'Myntra Partner Bridge (PPMP/Omni)',
  description: 'Synchronize Myntra PPMP fashion/lifestyle orders, style catalog attributes, safety inventory buffers, returns/RTOs, and brand SLA benchmarks.',
  category: 'commerce',
  icon_name: 'ShoppingBag',
  documentation_url: 'https://partner.myntra.com/api-docs/',
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
    rate_limit_rps: 8,
  },
  configuration_schema: {
    instructions: 'Configure your Myntra Partner Bridge API Client ID, Client Secret, Brand Partner ID, and Primary Store Location ID.',
    fields: [
      {
        key: 'client_id',
        label: 'Myntra Partner Client ID',
        type: 'text',
        required: true,
        placeholder: 'myn-client-jyotsvan-9921',
        helpText: 'Provided in your Myntra Brand Partner Portal under API Access.',
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'secret',
        required: true,
        placeholder: '••••••••••••••••••••••••••••••••',
        helpText: 'Secret credential for generating Myntra PPMP OAuth access tokens.',
      },
      {
        key: 'seller_partner_id',
        label: 'Brand / Seller Partner ID',
        type: 'text',
        required: true,
        placeholder: 'MYNTRA_PARTNER_JYOTSVAN',
        helpText: 'Unique brand merchant code registered on Myntra.',
      },
      {
        key: 'store_location_id',
        label: 'Store / Warehouse Location Code',
        type: 'text',
        required: false,
        placeholder: 'STORE_BLR_01',
        helpText: 'Designated dispatch store location code for pickup handover.',
      },
      {
        key: 'environment',
        label: 'Partner Environment',
        type: 'select',
        required: true,
        defaultValue: 'production',
        options: [
          { label: 'Production (partner.myntra.com)', value: 'production' },
          { label: 'Sandbox (sandbox-partner.myntra.com)', value: 'sandbox' },
        ],
      },
    ],
  },
};

export async function migrateMyntraIntegration(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Phase 33] Starting Myntra Partner Bridge Migration...');
    await client.query('BEGIN');

    // 1. Register Myntra in integration_providers
    await client.query(
      `INSERT INTO integration_providers (
        id, provider_key, name, description, category, icon_name,
        documentation_url, status, implementation_status, capabilities,
        configuration_schema, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      ON CONFLICT (provider_key) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          capabilities = EXCLUDED.capabilities,
          configuration_schema = EXCLUDED.configuration_schema,
          status = EXCLUDED.status,
          implementation_status = EXCLUDED.implementation_status,
          updated_at = NOW()`,
      [
        MYNTRA_INTEGRATION_PROVIDER.provider_key,
        MYNTRA_INTEGRATION_PROVIDER.name,
        MYNTRA_INTEGRATION_PROVIDER.description,
        MYNTRA_INTEGRATION_PROVIDER.category,
        MYNTRA_INTEGRATION_PROVIDER.icon_name,
        MYNTRA_INTEGRATION_PROVIDER.documentation_url,
        MYNTRA_INTEGRATION_PROVIDER.status,
        MYNTRA_INTEGRATION_PROVIDER.implementation_status,
        JSON.stringify(MYNTRA_INTEGRATION_PROVIDER.capabilities),
        JSON.stringify(MYNTRA_INTEGRATION_PROVIDER.configuration_schema),
      ]
    );

    // 2. Fetch default organization
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
    const orgId = orgRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    // 3. Create or Update Myntra Integration Connection
    const encryptedCreds = encryptCredentials({
      client_id: 'myn-client-jyotsvan-9921',
      client_secret: 'myn_sec_8849201948201934',
      seller_partner_id: 'MYNTRA_PARTNER_JYOTSVAN',
      store_location_id: 'STORE_BLR_01',
    });

    const connRes = await client.query(
      `INSERT INTO integration_connections (
        organization_id, provider_key, name, status,
        encrypted_credentials, configuration, sync_frequency_minutes,
        last_sync_at, created_at, updated_at
      ) VALUES ($1, 'myntra', 'Myntra Brand Partner Store (PPMP)', 'active', $2, $3, 30, NOW(), NOW(), NOW())
      ON CONFLICT (organization_id, provider_key) DO UPDATE
      SET status = 'active',
          updated_at = NOW()
      RETURNING id`,
      [
        orgId,
        encryptedCreds,
        JSON.stringify({
          environment: 'production',
          seller_partner_id: 'MYNTRA_PARTNER_JYOTSVAN',
          store_location_id: 'STORE_BLR_01',
          partner_tier: 'Tier 1 Fashion & Beauty Partner',
        }),
      ]
    );

    const connectionId = connRes.rows[0].id;

    // 4. Seed Myntra Catalog Listings (Style IDs & Personal Care/Beauty Products)
    const sampleProducts = [
      {
        style_id: 'MYN_STYLE_8849101',
        sku: 'JY-KUM-OIL-30ML',
        title: 'Jyotsvan Kumkumadi Radiant Facial Oil 30ml',
        category: 'Personal Care & Beauty',
        size: '30 ml',
        color: 'Saffron Amber',
        gender: 'Unisex',
        price: 849.00,
        mrp: 999.00,
      },
      {
        style_id: 'MYN_STYLE_8849102',
        sku: 'JY-BHR-OIL-200ML',
        title: 'Jyotsvan Bhringraj Intensive Hair Growth Oil 200ml',
        category: 'Hair Care & Grooming',
        size: '200 ml',
        color: 'Deep Herbal Green',
        gender: 'Unisex',
        price: 529.00,
        mrp: 649.00,
      },
      {
        style_id: 'MYN_STYLE_8849103',
        sku: 'JY-NAL-THAI-100ML',
        title: 'Jyotsvan Nalpamaradi Skin Brightening Thailam 100ml',
        category: 'Skin Care & Wellness',
        size: '100 ml',
        color: 'Golden Turmeric',
        gender: 'Unisex',
        price: 689.00,
        mrp: 799.00,
      },
      {
        style_id: 'MYN_STYLE_8849104',
        sku: 'JY-UBT-FACE-100G',
        title: 'Jyotsvan Pure Herbal Glowing Ubtan Cleanser 100g',
        category: 'Skin Care & Cleanser',
        size: '100 g',
        color: 'Sandal Beige',
        gender: 'Unisex',
        price: 389.00,
        mrp: 450.00,
      },
      {
        style_id: 'MYN_STYLE_8849105',
        sku: 'JY-GUL-MIST-150ML',
        title: 'Jyotsvan Kannauj Pure Steam-Distilled Rose Water Mist 150ml',
        category: 'Skin Toners & Mists',
        size: '150 ml',
        color: 'Crystal Clear',
        gender: 'Unisex',
        price: 349.00,
        mrp: 399.00,
      },
      {
        style_id: 'MYN_STYLE_8849106',
        sku: 'JY-ASH-CHW-500G',
        title: 'Jyotsvan Premium Ashwagandha Vitality Churna 500g',
        category: 'Ayurvedic Wellness & Nutrition',
        size: '500 g',
        color: 'Raw Earth',
        gender: 'Unisex',
        price: 499.00,
        mrp: 599.00,
      },
    ];

    for (const p of sampleProducts) {
      await client.query(
        `INSERT INTO marketplace_products (
          id, organization_id, connection_id, provider_key, marketplace_id,
          external_product_id, seller_sku, asin, title, brand,
          product_status, listing_price, currency, fulfillment_channel,
          attributes, raw_metadata, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'myntra', 'MYNTRA_IN',
          $3, $4, $3, $5, 'Jyotsvan Organics',
          'ACTIVE', $6, 'INR', 'PPMP',
          $7, $8, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING`,
        [
          orgId,
          connectionId,
          p.style_id,
          p.sku,
          p.title,
          p.price,
          JSON.stringify({
            category: p.category,
            size: p.size,
            color: p.color,
            gender: p.gender,
            mrp: p.mrp,
            style_id: p.style_id,
          }),
          JSON.stringify({
            myntra_approved: true,
            tier: 'Premium Herbal',
            dispatch_sla_hours: 24,
          }),
        ]
      );
    }

    // 5. Seed Myntra Inventory and Safety Stock Buffers
    const sampleInventory = [
      { sku: 'JY-KUM-OIL-30ML', available: 320, buffer: 30, total: 350 },
      { sku: 'JY-BHR-OIL-200ML', available: 280, buffer: 25, total: 305 },
      { sku: 'JY-NAL-THAI-100ML', available: 210, buffer: 20, total: 230 },
      { sku: 'JY-UBT-FACE-100G', available: 190, buffer: 25, total: 215 },
      { sku: 'JY-GUL-MIST-150ML', available: 160, buffer: 25, total: 185 },
      { sku: 'JY-ASH-CHW-500G', available: 80, buffer: 25, total: 105 },
    ];

    for (const inv of sampleInventory) {
      await client.query(
        `INSERT INTO marketplace_inventory (
          id, organization_id, connection_id, provider_key, marketplace_id,
          seller_sku, asin, fulfillment_channel, available_quantity, reserved_quantity,
          inbound_working, inbound_shipped, inbound_receiving, total_quantity,
          condition, raw_metadata, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'myntra', 'MYNTRA_IN',
          $3, $3, 'PPMP', $4, $5,
          0, 0, 0, $6,
          'NEW', $7, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING`,
        [
          orgId,
          connectionId,
          inv.sku,
          inv.available,
          inv.buffer,
          inv.total,
          JSON.stringify({
            store_code: 'STORE_BLR_01',
            safety_buffer_policy: 'AUTO_RESERVE_10_PERCENT',
            sla_tier: 'EXPRESS_SAME_DAY',
          }),
        ]
      );
    }

    // 6. Seed Myntra Orders
    const sampleOrders = [
      {
        order_id: 'MYN_ORD_77491021',
        order_number: 'MYN-2026-88102',
        order_status: 'SHIPPED',
        fulfillment_channel: 'PPMP',
        order_total: 1698.00,
        tax_total: 214.50,
        shipping_price: 0,
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400050',
        payment_mode: 'PREPAID_UPI',
        items: [
          { sku: 'JY-KUM-OIL-30ML', title: 'Jyotsvan Kumkumadi Radiant Facial Oil 30ml', qty: 2, price: 849.00 },
        ],
      },
      {
        order_id: 'MYN_ORD_77491022',
        order_number: 'MYN-2026-88103',
        order_status: 'APPROVED',
        fulfillment_channel: 'PPMP',
        order_total: 1078.00,
        tax_total: 136.20,
        shipping_price: 0,
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: '560038',
        payment_mode: 'PREPAID_CARD',
        items: [
          { sku: 'JY-BHR-OIL-200ML', title: 'Jyotsvan Bhringraj Intensive Hair Growth Oil 200ml', qty: 1, price: 529.00 },
          { sku: 'JY-UBT-FACE-100G', title: 'Jyotsvan Pure Herbal Glowing Ubtan Cleanser 100g', qty: 1, price: 389.00 },
        ],
      },
      {
        order_id: 'MYN_ORD_77491023',
        order_number: 'MYN-2026-88104',
        order_status: 'DELIVERED',
        fulfillment_channel: 'PPMP',
        order_total: 689.00,
        tax_total: 87.05,
        shipping_price: 0,
        city: 'New Delhi',
        state: 'Delhi',
        postal_code: '110016',
        payment_mode: 'PREPAID_NETBANKING',
        items: [
          { sku: 'JY-NAL-THAI-100ML', title: 'Jyotsvan Nalpamaradi Skin Brightening Thailam 100ml', qty: 1, price: 689.00 },
        ],
      },
      {
        order_id: 'MYN_ORD_77491024',
        order_number: 'MYN-2026-88105',
        order_status: 'DELIVERED',
        fulfillment_channel: 'PPMP',
        order_total: 848.00,
        tax_total: 107.20,
        shipping_price: 0,
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '500081',
        payment_mode: 'COD',
        items: [
          { sku: 'JY-ASH-CHW-500G', title: 'Jyotsvan Premium Ashwagandha Vitality Churna 500g', qty: 1, price: 499.00 },
          { sku: 'JY-GUL-MIST-150ML', title: 'Jyotsvan Kannauj Pure Steam-Distilled Rose Water Mist 150ml', qty: 1, price: 349.00 },
        ],
      },
    ];

    for (const ord of sampleOrders) {
      const ordInsert = await client.query(
        `INSERT INTO marketplace_orders (
          id, organization_id, connection_id, provider_key, marketplace_id,
          external_order_id, order_number, purchase_date, order_status,
          fulfillment_channel, currency, order_total, items_subtotal,
          shipping_price, tax_total, discount_total, shipping_address,
          raw_metadata, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'myntra', 'MYNTRA_IN',
          $3, $4, NOW() - INTERVAL '1 day', $5,
          $6, 'INR', $7, $7,
          $8, $9, 0, $10,
          $11, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
        RETURNING id`,
        [
          orgId,
          connectionId,
          ord.order_id,
          ord.order_number,
          ord.order_status,
          ord.fulfillment_channel,
          ord.order_total,
          ord.shipping_price,
          ord.tax_total,
          JSON.stringify({
            city: ord.city,
            state_or_region: ord.state,
            postal_code: ord.postal_code,
            country_code: 'IN',
          }),
          JSON.stringify({
            payment_mode: ord.payment_mode,
            myntra_release_id: `REL_${ord.order_number}`,
            pickup_manifest: `MANIFEST_MYN_${ord.order_number}`,
          }),
        ]
      );

      if (ordInsert.rows.length > 0) {
        const orderDbId = ordInsert.rows[0].id;
        for (const itm of ord.items) {
          await client.query(
            `INSERT INTO marketplace_order_items (
              id, organization_id, connection_id, order_id, external_order_id,
              external_order_item_id, seller_sku, asin, title,
              quantity_ordered, quantity_shipped, item_price, item_tax,
              shipping_price, shipping_tax, item_discount, raw_metadata, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4,
              $5, $6, $6, $7,
              $8, $8, $9, $10,
              0, 0, 0, $11, NOW(), NOW()
            )`,
            [
              orgId,
              connectionId,
              orderDbId,
              ord.order_id,
              `ITEM_${ord.order_id}_${itm.sku}`,
              itm.sku,
              itm.title,
              itm.qty,
              itm.price,
              Math.round(itm.price * 0.12 * 100) / 100,
              JSON.stringify({ style_id: `STYLE_${itm.sku}` }),
            ]
          );
        }
      }
    }

    // 7. Seed Returns / RTOs
    const sampleReturns = [
      {
        return_id: 'MYN_RET_554101',
        sku: 'JY-KUM-OIL-30ML',
        reason: 'Customer Refused Delivery / Doorstep Cancelled',
        status: 'COMPLETED',
        refund: 849.00,
        return_type: 'RTO',
        verdict: 'RESTOCKABLE',
      },
      {
        return_id: 'MYN_RET_554102',
        sku: 'JY-BHR-OIL-200ML',
        reason: 'Outer Cap Seal Loosened in Transit',
        status: 'IN_TRANSIT',
        refund: 529.00,
        return_type: 'CUSTOMER_RETURN',
        verdict: 'PENDING_INSPECTION',
      },
      {
        return_id: 'MYN_RET_554103',
        sku: 'JY-UBT-FACE-100G',
        reason: 'Customer Address Incomplete',
        status: 'COMPLETED',
        refund: 389.00,
        return_type: 'RTO',
        verdict: 'RESTOCKABLE',
      },
    ];

    for (const ret of sampleReturns) {
      await client.query(
        `INSERT INTO marketplace_returns (
          id, organization_id, connection_id, provider_key, marketplace_id,
          external_return_id, seller_sku, quantity, return_reason,
          return_status, return_date, refund_amount, currency, raw_metadata,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'myntra', 'MYNTRA_IN',
          $3, $4, 1, $5,
          $6, NOW() - INTERVAL '3 days', $7, 'INR', $8,
          NOW(), NOW()
        )
        ON CONFLICT DO NOTHING`,
        [
          orgId,
          connectionId,
          ret.return_id,
          ret.sku,
          ret.reason,
          ret.status,
          ret.refund,
          JSON.stringify({
            return_type: ret.return_type,
            qc_verdict: ret.verdict,
            reverse_courier: 'Shadowfax / Myntra Logistics',
          }),
        ]
      );
    }

    // 8. Seed Performance Metrics
    const perfMetrics = [
      {
        id: 'perf_myn_sla_dispatch',
        name: 'PPMP On-Time Dispatch SLA',
        key: 'ON_TIME_DISPATCH',
        category: 'SLA_ADHERENCE',
        value: 99.40,
        target: 99.00,
        unit: '%',
        status: 'EXCELLENT',
      },
      {
        id: 'perf_myn_cancellation',
        name: 'Seller Cancellation Rate',
        key: 'SELLER_CANCELLATION',
        category: 'CANCELLATION',
        value: 0.35,
        target: 1.00,
        unit: '%',
        status: 'EXCELLENT',
      },
      {
        id: 'perf_myn_rto_rate',
        name: 'Return-to-Origin (RTO) Rate',
        key: 'RTO_RATE',
        category: 'RETURNS',
        value: 4.80,
        target: 7.00,
        unit: '%',
        status: 'GOOD',
      },
      {
        id: 'perf_myn_rating',
        name: 'Brand Customer Rating',
        key: 'BRAND_RATING',
        category: 'RATING',
        value: 4.82,
        target: 4.50,
        unit: '★',
        status: 'EXCELLENT',
      },
      {
        id: 'perf_myn_catalog_quality',
        name: 'Catalog Quality & Attribute Score',
        key: 'CATALOG_QUALITY',
        category: 'CATALOG_QUALITY',
        value: 98.20,
        target: 95.00,
        unit: '%',
        status: 'EXCELLENT',
      },
    ];

    for (const m of perfMetrics) {
      await client.query(
        `INSERT INTO marketplace_performance (
          id, organization_id, connection_id, provider_key,
          metric_name, metric_key, metric_category,
          current_value, benchmark_target, unit, status,
          period_start, period_end, historical_trend, metadata,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'myntra',
          $4, $5, $6,
          $7, $8, $9, $10,
          NOW() - INTERVAL '30 days', NOW(),
          $11, $12, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET current_value = EXCLUDED.current_value,
            status = EXCLUDED.status,
            updated_at = NOW()`,
        [
          m.id,
          orgId,
          connectionId,
          m.name,
          m.key,
          m.category,
          m.value,
          m.target,
          m.unit,
          m.status,
          JSON.stringify([
            { date: '2026-09-10', value: m.value - 0.2 },
            { date: '2026-09-20', value: m.value - 0.1 },
            { date: '2026-09-30', value: m.value },
          ]),
          JSON.stringify({ tier: 'Tier 1 Fashion Partner' }),
        ]
      );
    }

    // 9. Seed SKU Mappings
    for (const p of sampleProducts) {
      await client.query(
        `INSERT INTO marketplace_entity_mappings (
          id, organization_id, connection_id, provider_key,
          entity_type, marketplace_sku, marketplace_asin, marketplace_title,
          jyotsvan_sku, mapping_status, confidence_score, verified_by,
          verified_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'myntra',
          'sku', $3, $4, $5,
          $3, 'mapped', 1.00, 'System Administrator',
          NOW(), NOW(), NOW()
        )
        ON CONFLICT DO NOTHING`,
        [orgId, connectionId, p.sku, p.style_id, p.title]
      );
    }

    await client.query('COMMIT');
    console.log('[Phase 33] ✓ Myntra Partner Bridge Schema & Seed Migration Completed successfully.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Phase 33] ✗ Error running Myntra migration:', err.message || err);
    throw err;
  } finally {
    client.release();
  }
}
