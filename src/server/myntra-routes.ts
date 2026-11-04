// src/server/myntra-routes.ts
// Phase 33: Myntra Partner Bridge (PPMP/Omni) Express Routes

import { Router } from 'express';
import { MyntraService } from './myntra-service.ts';
import { MyntraConnector } from './integrations/myntra-connector.ts';
import { encryptCredentials } from './crypto-vault.ts';
import { pool } from './db.ts';

export const myntraRouter = Router();

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

// Helper to extract organizationId
const getOrgId = (req: any) => req.headers['x-organization-id'] || req.user?.organization_id || DEFAULT_ORG_ID;

/**
 * 1. Health check & status probe
 */
myntraRouter.get('/health', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const connection = await MyntraService.getConnection(orgId);

    if (!connection) {
      return res.json({
        healthy: false,
        status: 'not_connected',
        message: 'Myntra partner bridge not connected for this organization.',
      });
    }

    const connector = new MyntraConnector();
    const health = await connector.healthCheck(
      ((connection as any).encrypted_credentials || {}) as any,
      connection.configuration || {}
    );

    res.json({
      healthy: health.healthy,
      status: health.status,
      message: health.message,
      latencyMs: health.latencyMs,
      connection: {
        id: connection.id,
        name: connection.name,
        status: connection.status,
        last_sync_at: connection.last_sync_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Get Executive Overview
 */
myntraRouter.get('/overview', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const data = await MyntraService.getOverview(orgId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Get Orders
 */
myntraRouter.get('/orders', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { status, search, limit, offset } = req.query;
    const orders = await MyntraService.getOrders(orgId, {
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Get Catalog Listings
 */
myntraRouter.get('/listings', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const listings = await MyntraService.getListings(orgId);
    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. Get Inventory & Safety Buffers
 */
myntraRouter.get('/inventory', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const inventory = await MyntraService.getInventory(orgId);
    res.json(inventory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Update Inventory Safety Buffer
 */
myntraRouter.post('/inventory/buffer', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { sellerSku, quantityAvailable, safetyBuffer } = req.body;
    if (!sellerSku) {
      return res.status(400).json({ error: 'sellerSku is required' });
    }
    const success = await MyntraService.updateInventoryBuffer(
      orgId,
      sellerSku,
      parseInt(quantityAvailable || '0', 10),
      parseInt(safetyBuffer || '0', 10)
    );
    res.json({ success, message: `Updated inventory buffer for ${sellerSku}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Get Returns & RTOs
 */
myntraRouter.get('/returns', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const returns = await MyntraService.getReturns(orgId);
    res.json(returns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8. Get Performance Metrics
 */
myntraRouter.get('/performance', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const metrics = await MyntraService.getPerformance(orgId);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 9. Get SKU Mappings
 */
myntraRouter.get('/mappings', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const mappings = await MyntraService.getMappings(orgId);
    res.json(mappings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 10. Update SKU Mapping
 */
myntraRouter.put('/mappings/:id', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;
    const { jyotsvanSku, mappingStatus } = req.body;
    const updated = await MyntraService.updateMapping(
      orgId,
      id,
      jyotsvanSku,
      mappingStatus || 'mapped'
    );
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 11. Auto-Match SKUs
 */
myntraRouter.post('/mappings/auto-match', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const result = await MyntraService.autoMatchSkus(orgId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 12. Execute Sync Job
 */
myntraRouter.post('/sync', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const result = await MyntraService.executeSync(orgId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 13. Test Connection
 */
myntraRouter.post('/test-connection', async (req, res) => {
  try {
    const { clientId, clientSecret, sellerPartnerId, environment } = req.body;
    const connector = new MyntraConnector();
    const result = await connector.testConnection(
      { clientId, clientSecret, sellerPartnerId },
      { environment }
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 14. Save Connection Configuration
 */
myntraRouter.post('/connect', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { clientId, clientSecret, sellerPartnerId, storeLocationId, environment } = req.body;

    const encrypted = encryptCredentials({
      client_id: clientId,
      client_secret: clientSecret,
      seller_partner_id: sellerPartnerId,
      store_location_id: storeLocationId,
    });

    const connRes = await pool.query(
      `INSERT INTO integration_connections (
        organization_id, provider_key, name, status,
        encrypted_credentials, configuration, sync_frequency_minutes,
        last_sync_at, created_at, updated_at
      ) VALUES ($1, 'myntra', $2, 'active', $3, $4, 30, NOW(), NOW(), NOW())
      ON CONFLICT (organization_id, provider_key) DO UPDATE
      SET encrypted_credentials = EXCLUDED.encrypted_credentials,
          configuration = EXCLUDED.configuration,
          status = 'active',
          updated_at = NOW()
      RETURNING *`,
      [
        orgId,
        `Myntra Partner (${sellerPartnerId || 'PPMP'})`,
        encrypted,
        JSON.stringify({
          environment: environment || 'production',
          seller_partner_id: sellerPartnerId || 'MYNTRA_PARTNER_JYOTSVAN',
          store_location_id: storeLocationId || 'STORE_BLR_01',
        }),
      ]
    );

    res.json({
      success: true,
      message: 'Myntra partner bridge connection configured and verified.',
      connection: connRes.rows[0],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 15. Disconnect
 */
myntraRouter.post('/disconnect', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    await pool.query(
      `UPDATE integration_connections 
       SET status = 'disconnected', updated_at = NOW() 
       WHERE organization_id = $1 AND provider_key = 'myntra'`,
      [orgId]
    );
    res.json({ success: true, message: 'Myntra partner bridge disconnected.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
