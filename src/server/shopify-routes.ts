// src/server/shopify-routes.ts
// Phase 25: Express Router for Shopify Direct-to-Consumer Integration Endpoints

import { Router } from 'express';
import { ShopifyService } from './shopify-service.ts';
import { ShopifyClient } from './integrations/shopify-client.ts';
import { pool } from './db.ts';
import { encryptCredentials, decryptCredentials } from './crypto-vault.ts';
import { AuditService } from './audit-service.ts';

export const shopifyRouter = Router();

// Helper to extract organizationId and connectionId
const resolveContext = (req: any) => {
  const organizationId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const connectionId = (req.headers['x-connection-id'] as string) || (req.query.connectionId as string) || 'conn-shopify-prod';
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  return {
    organizationId,
    connectionId,
    userContext: { userId, userName, userEmail },
  };
};

// --------------------------------------------------------------------------
// 1. OVERVIEW & STORE HEALTH
// --------------------------------------------------------------------------

shopifyRouter.get('/overview', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const data = await ShopifyService.getOverview(organizationId, connectionId);
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Shopify overview';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.get('/status', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const connRes = await pool.query(
      `SELECT * FROM integration_connections WHERE organization_id = $1 AND id = $2 AND provider_key = 'shopify'`,
      [organizationId, connectionId]
    );

    if (connRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shopify connection not found.' });
    }

    res.json({
      connected: connRes.rows[0].status === 'connected',
      connection: connRes.rows[0],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status check failed';
    res.status(500).json({ error: msg });
  }
});

// --------------------------------------------------------------------------
// 2. CONNECTION TESTING
// --------------------------------------------------------------------------

shopifyRouter.post('/test', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    let { shop_domain, admin_api_access_token, api_version } = req.body;

    if (!admin_api_access_token || admin_api_access_token === 'shpua_live_demo_key') {
      const connRes = await pool.query(
        `SELECT * FROM integration_connections WHERE organization_id = $1 AND id = $2 AND provider_key = 'shopify'`,
        [organizationId, connectionId]
      );
      if (connRes.rows.length > 0) {
        const conn = connRes.rows[0];
        if (!shop_domain && conn.configuration?.shop_domain) {
          shop_domain = conn.configuration.shop_domain;
        }
        if (conn.encrypted_credentials) {
          try {
            const creds = decryptCredentials(conn.encrypted_credentials);
            admin_api_access_token = creds.admin_api_access_token || admin_api_access_token;
          } catch (decErr) {
            console.warn('[Shopify Test] Decrypt warning:', decErr);
          }
        }
      }
    }

    const client = new ShopifyClient({
      shopDomain: shop_domain || 'jyotsvan-organics.myshopify.com',
      accessToken: admin_api_access_token || '',
      apiVersion: api_version || '2026-01',
    });

    const start = Date.now();
    const shop = await client.getShop();
    const latency = Math.max(15, Date.now() - start);

    res.json({
      success: true,
      message: `Verified connection with '${shop.name}' (${shop.myshopify_domain}).`,
      latency_ms: latency,
      shop,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Test failed';
    res.status(400).json({ success: false, message: msg });
  }
});

// --------------------------------------------------------------------------
// 2.1 CONFIGURE & SAVE CREDENTIALS
// --------------------------------------------------------------------------

shopifyRouter.post('/configure', async (req, res) => {
  try {
    const { organizationId, connectionId, userContext } = resolveContext(req);
    const {
      shop_domain,
      admin_api_access_token,
      api_version = '2026-01',
      webhook_secret,
      sync_frequency_minutes = 15,
      connection_name,
      is_sandbox = false,
    } = req.body;

    if (!shop_domain) {
      return res.status(400).json({ error: 'Shop domain is required (e.g. your-store.myshopify.com).' });
    }

    // Clean domain
    let cleanDomain = shop_domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (!cleanDomain.includes('.')) {
      cleanDomain = `${cleanDomain}.myshopify.com`;
    }

    // Prepare credentials payload
    const credentialsObj: Record<string, any> = {};
    if (admin_api_access_token && admin_api_access_token.trim() !== '') {
      credentialsObj.admin_api_access_token = admin_api_access_token.trim();
    }
    if (webhook_secret && webhook_secret.trim() !== '') {
      credentialsObj.webhook_secret = webhook_secret.trim();
    }

    // Test connection if new token provided
    let shopData: any = null;
    if (credentialsObj.admin_api_access_token) {
      const client = new ShopifyClient({
        shopDomain: cleanDomain,
        accessToken: credentialsObj.admin_api_access_token,
        apiVersion: api_version,
      });
      try {
        shopData = await client.getShop();
      } catch (testErr: any) {
        console.warn('[Shopify Router] Live test validation note:', testErr.message);
      }
    }

    // Fetch existing connection
    const existing = await pool.query(
      `SELECT * FROM integration_connections WHERE organization_id = $1 AND id = $2`,
      [organizationId, connectionId]
    );

    let encryptedPayload: string | null = null;
    if (Object.keys(credentialsObj).length > 0) {
      encryptedPayload = encryptCredentials(credentialsObj);
    } else if (existing.rows.length > 0) {
      encryptedPayload = existing.rows[0].encrypted_credentials;
    }

    const name = connection_name || (shopData?.name ? `${shopData.name} (Shopify)` : `Shopify Storefront (${cleanDomain})`);
    const configuration = {
      shop_domain: cleanDomain,
      api_version: api_version,
      sync_frequency_minutes: Number(sync_frequency_minutes) || 15,
      is_sandbox: Boolean(is_sandbox),
      shop_name: shopData?.name || cleanDomain,
      currency: shopData?.currency || 'INR',
      timezone: shopData?.iana_timezone || shopData?.timezone || 'Asia/Kolkata',
    };

    let updatedConn: any;
    if (existing.rows.length > 0) {
      const updateRes = await pool.query(
        `UPDATE integration_connections
         SET name = $1,
             configuration = $2,
             encrypted_credentials = COALESCE($3, encrypted_credentials),
             status = 'connected',
             environment = $4,
             updated_at = NOW()
         WHERE organization_id = $5 AND id = $6
         RETURNING *`,
        [
          name,
          JSON.stringify(configuration),
          encryptedPayload,
          is_sandbox ? 'sandbox' : 'production',
          organizationId,
          connectionId,
        ]
      );
      updatedConn = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO integration_connections (
           id, organization_id, provider_key, name, status,
           environment, configuration, encrypted_credentials, created_at, updated_at
         ) VALUES ($1, $2, 'shopify', $3, 'connected', $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [
          connectionId,
          organizationId,
          name,
          is_sandbox ? 'sandbox' : 'production',
          JSON.stringify(configuration),
          encryptedPayload || encryptCredentials({ admin_api_access_token: 'dummy' }),
        ]
      );
      updatedConn = insertRes.rows[0];
    }

    await AuditService.log({
      organizationId,
      actorUserId: userContext.userId || 'usr-owner-sunil',
      actorEmail: userContext.userEmail || 'sunilpanigrahy29401@gmail.com',
      action: 'UPDATE',
      eventType: 'SHOPIFY_CONNECTION_CONFIGURED',
      module: 'commerce',
      entityType: 'integration_connection',
      entityId: connectionId,
      entityName: name,
      metadata: {
        shop_domain: cleanDomain,
        api_version,
        is_sandbox,
        shop_verified: !!shopData,
      },
    });

    res.json({
      success: true,
      message: `Shopify store '${cleanDomain}' credentials saved and configured!`,
      connection: updatedConn,
      shop: shopData,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Configuration failed';
    res.status(400).json({ error: msg });
  }
});

// --------------------------------------------------------------------------
// 3. SYNCHRONIZATION TRIGGER
// --------------------------------------------------------------------------

shopifyRouter.post('/sync', async (req, res) => {
  try {
    const { organizationId, connectionId, userContext } = resolveContext(req);
    const { entity_types, sync_type } = req.body;

    if (entity_types && Array.isArray(entity_types) && !entity_types.includes('all')) {
      const results: any = {};
      if (entity_types.includes('products')) {
        results.products = await ShopifyService.syncProducts(organizationId, connectionId);
      }
      if (entity_types.includes('customers')) {
        results.customers = await ShopifyService.syncCustomers(organizationId, connectionId);
      }
      if (entity_types.includes('orders')) {
        results.orders = await ShopifyService.syncOrders(organizationId, connectionId);
      }
      if (entity_types.includes('inventory')) {
        results.inventory = await ShopifyService.syncInventory(organizationId, connectionId);
      }
      return res.json({ success: true, message: 'Selective entity sync finished.', results });
    }

    const syncResult = await ShopifyService.syncAll(
      organizationId,
      connectionId,
      { sync_type: sync_type || 'full' },
      userContext
    );

    res.json({
      success: true,
      message: 'Master store synchronization completed successfully.',
      ...syncResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync execution failed';
    res.status(500).json({ error: msg });
  }
});

// --------------------------------------------------------------------------
// 4. ENTITY LISTS (PRODUCTS, ORDERS, CUSTOMERS)
// --------------------------------------------------------------------------

shopifyRouter.get('/products', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const { client } = await ShopifyService.getClientForConnection(organizationId, connectionId);
    const products = await client.getProducts({ limit: 50 });

    // Fetch mappings for these products/variants
    const mapsRes = await pool.query(
      `SELECT external_id, internal_id, external_identifier, internal_identifier, mapping_status
       FROM integration_entity_mappings
       WHERE organization_id = $1 AND connection_id = $2 AND entity_type = 'sku'`,
      [organizationId, connectionId]
    );

    const mapDict: Record<string, any> = {};
    for (const m of mapsRes.rows) {
      mapDict[m.external_id] = m;
    }

    const enrichedProducts = products.map((prod) => {
      let mappedCount = 0;
      const variantsWithStatus = prod.variants.map((v) => {
        const m = mapDict[String(v.id)];
        if (m && m.mapping_status === 'mapped') {
          mappedCount++;
        }
        return {
          ...v,
          mapping_status: m?.mapping_status || 'unmapped',
          internal_sku_id: m?.internal_id || null,
          internal_sku_code: m?.internal_identifier || null,
        };
      });

      const totalVariants = prod.variants.length;
      let overallStatus: 'mapped' | 'unmapped' | 'partial' = 'unmapped';
      if (mappedCount === totalVariants && totalVariants > 0) {
        overallStatus = 'mapped';
      } else if (mappedCount > 0) {
        overallStatus = 'partial';
      }

      return {
        ...prod,
        variants: variantsWithStatus,
        mapping_status: overallStatus,
        mapped_sku_count: mappedCount,
        total_variant_count: totalVariants,
      };
    });

    res.json(enrichedProducts);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Shopify products';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.get('/orders', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const { client } = await ShopifyService.getClientForConnection(organizationId, connectionId);
    const orders = await client.getOrders({ limit: 50 });

    // Match with internal orders
    const mapsRes = await pool.query(
      `SELECT m.external_id, m.internal_id, so.order_number as internal_order_number, so.order_status, so.payment_status, so.fulfillment_status
       FROM integration_entity_mappings m
       LEFT JOIN sales_orders so ON so.id = m.internal_id
       WHERE m.organization_id = $1 AND m.connection_id = $2 AND m.entity_type = 'order'`,
      [organizationId, connectionId]
    );

    const mapDict: Record<string, any> = {};
    for (const m of mapsRes.rows) {
      mapDict[m.external_id] = m;
    }

    const enrichedOrders = orders.map((o) => {
      const m = mapDict[String(o.id)];
      return {
        ...o,
        internal_order_id: m?.internal_id || null,
        internal_order_number: m?.internal_order_number || null,
        internal_sync_status: m ? 'synced' : 'pending',
      };
    });

    res.json(enrichedOrders);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Shopify orders';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.get('/customers', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const { client } = await ShopifyService.getClientForConnection(organizationId, connectionId);
    const customers = await client.getCustomers({ limit: 50 });

    const mapsRes = await pool.query(
      `SELECT external_id, internal_id FROM integration_entity_mappings
       WHERE organization_id = $1 AND connection_id = $2 AND entity_type = 'customer'`,
      [organizationId, connectionId]
    );

    const mapDict: Record<string, string> = {};
    for (const m of mapsRes.rows) {
      mapDict[m.external_id] = m.internal_id;
    }

    const enrichedCustomers = customers.map((c) => ({
      ...c,
      mapped_customer_id: mapDict[String(c.id)] || null,
      is_mapped: Boolean(mapDict[String(c.id)]),
    }));

    res.json(enrichedCustomers);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Shopify customers';
    res.status(500).json({ error: msg });
  }
});

// --------------------------------------------------------------------------
// 5. SKU & LOCATION MAPPINGS
// --------------------------------------------------------------------------

shopifyRouter.get('/mappings', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const entityType = (req.query.entityType as string) || 'sku';
    const status = req.query.status as string;
    const search = req.query.search as string;

    const mappings = await ShopifyService.getMappings(organizationId, connectionId, entityType, status, search);
    res.json(mappings);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch mappings';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.post('/mappings', async (req, res) => {
  try {
    const { organizationId, connectionId, userContext } = resolveContext(req);
    const { entityType, externalId, internalId, externalIdentifier, internalIdentifier, metadata } = req.body;

    if (!entityType || !externalId || !internalId) {
      return res.status(400).json({ error: 'entityType, externalId, and internalId are required.' });
    }

    const mapping = await ShopifyService.saveMapping(
      organizationId,
      connectionId,
      { entityType, externalId, internalId, externalIdentifier, internalIdentifier, metadata },
      userContext
    );

    res.json(mapping);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save mapping';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.post('/mappings/auto-map', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const result = await ShopifyService.autoMapSKUs(organizationId, connectionId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Auto-map failed';
    res.status(500).json({ error: msg });
  }
});

// --------------------------------------------------------------------------
// 6. LOCATIONS & WAREHOUSES
// --------------------------------------------------------------------------

shopifyRouter.get('/locations', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const locations = await ShopifyService.getLocations(organizationId, connectionId);
    res.json(locations);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch locations';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.post('/locations/map', async (req, res) => {
  try {
    const { organizationId, connectionId, userContext } = resolveContext(req);
    const { shopifyLocationId, warehouseId } = req.body;

    if (!shopifyLocationId || !warehouseId) {
      return res.status(400).json({ error: 'shopifyLocationId and warehouseId are required.' });
    }

    const mapping = await ShopifyService.mapLocation(
      organizationId,
      connectionId,
      shopifyLocationId,
      warehouseId,
      userContext
    );

    res.json({ success: true, mapping });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to map location';
    res.status(500).json({ error: msg });
  }
});

// --------------------------------------------------------------------------
// 7. SYNC JOBS & EXCEPTIONS
// --------------------------------------------------------------------------

shopifyRouter.get('/sync-jobs', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const jobsRes = await pool.query(
      `SELECT * FROM integration_sync_jobs 
       WHERE organization_id = $1 AND connection_id = $2 
       ORDER BY created_at DESC LIMIT 50`,
      [organizationId, connectionId]
    );
    res.json(jobsRes.rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch sync jobs';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.get('/exceptions', async (req, res) => {
  try {
    const { organizationId, connectionId } = resolveContext(req);
    const exceptions = await ShopifyService.getExceptions(organizationId, connectionId);
    res.json(exceptions);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch exceptions';
    res.status(500).json({ error: msg });
  }
});

shopifyRouter.post('/exceptions/:id/resolve', async (req, res) => {
  try {
    const { organizationId, connectionId, userContext } = resolveContext(req);
    const { resolutionNotes } = req.body;
    const { id } = req.params;

    const success = await ShopifyService.resolveException(
      organizationId,
      connectionId,
      id,
      resolutionNotes,
      userContext
    );

    res.json({ success });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to resolve exception';
    res.status(500).json({ error: msg });
  }
});
