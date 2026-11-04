// src/server/flipkart-routes.ts
// Phase 32: Flipkart Seller API Express REST Endpoints

import { Router, Request, Response } from 'express';
import { FlipkartService } from './flipkart-service.ts';
import { FlipkartConnector } from './integrations/flipkart-connector.ts';
import { pool } from './db.ts';
import { encryptCredentials } from './crypto-vault.ts';
import { AuditService } from './audit-service.ts';

export const flipkartRouter = Router();

// Middleware helper to extract organization_id
const getOrgId = (req: Request): string => {
  return (req.headers['x-organization-id'] as string) || 'org_01';
};

/**
 * GET /api/integrations/flipkart/health
 */
flipkartRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const connection = await FlipkartService.getConnection(orgId);

    if (!connection) {
      return res.json({
        status: 'unconfigured',
        connected: false,
        message: 'No Flipkart connection configured.',
      });
    }

    const connector = new FlipkartConnector();
    const health = await connector.healthCheck(
      ((connection as any).encrypted_credentials || {}) as any,
      connection.configuration || {}
    );

    res.json({
      status: health.status,
      connected: health.healthy,
      latencyMs: health.latencyMs,
      lastCheckedAt: new Date().toISOString(),
      message: health.message,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/flipkart/overview
 */
flipkartRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const data = await FlipkartService.getOverview(orgId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/flipkart/orders
 */
flipkartRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { status, fulfillmentChannel, search, limit, offset } = req.query;

    const data = await FlipkartService.getOrders(orgId, {
      status: status as string,
      fulfillmentChannel: fulfillmentChannel as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/flipkart/listings
 */
flipkartRouter.get('/listings', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { status, search } = req.query;

    const data = await FlipkartService.getListings(orgId, {
      status: status as string,
      search: search as string,
    });

    res.json({ listings: data, total: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/flipkart/inventory
 */
flipkartRouter.get('/inventory', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const data = await FlipkartService.getInventory(orgId);
    res.json({ inventory: data, total: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/flipkart/inventory/update
 */
flipkartRouter.post('/inventory/update', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { sellerSku, fulfillmentChannel, quantityAvailable } = req.body;

    if (!sellerSku || quantityAvailable === undefined) {
      return res.status(400).json({ error: 'sellerSku and quantityAvailable are required' });
    }

    const success = await FlipkartService.updateInventoryStock(
      orgId,
      sellerSku,
      fulfillmentChannel || 'FLIPKART_SMART',
      Number(quantityAvailable)
    );

    res.json({ success, message: `Updated inventory for ${sellerSku} to ${quantityAvailable} units.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/flipkart/returns
 */
flipkartRouter.get('/returns', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const data = await FlipkartService.getReturns(orgId);
    res.json({ returns: data, total: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/flipkart/performance
 */
flipkartRouter.get('/performance', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const data = await FlipkartService.getPerformanceMetrics(orgId);
    res.json({ metrics: data, total: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/flipkart/mappings
 */
flipkartRouter.get('/mappings', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const data = await FlipkartService.getEntityMappings(orgId);
    res.json({ mappings: data, total: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/flipkart/mappings/:id
 */
flipkartRouter.post('/mappings/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;
    const { jyotsvanSku, mappingStatus } = req.body;

    if (!jyotsvanSku) {
      return res.status(400).json({ error: 'jyotsvanSku is required' });
    }

    const mapping = await FlipkartService.saveEntityMapping(
      orgId,
      id,
      jyotsvanSku,
      mappingStatus || 'MAPPED'
    );

    res.json({ success: true, mapping });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/flipkart/sync
 */
flipkartRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { entityType, entities, syncType, windowDays } = req.body;

    const result = await FlipkartService.executeSync(orgId, {
      entityType,
      entities,
      syncType,
      windowDays,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/flipkart/test-connection
 */
flipkartRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, sellerId, environment } = req.body;
    const connector = new FlipkartConnector();
    const result = await connector.testConnection(
      {
        appId,
        appSecret,
        sellerId,
      },
      {
        environment,
      }
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/flipkart/configure
 */
flipkartRouter.post('/configure', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { appId, appSecret, sellerId, locationId, environment } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    const connRes = await pool.query(
      `SELECT id FROM integration_connections WHERE organization_id = $1 AND provider_key = 'flipkart'`,
      [orgId]
    );

    let connectionId = 'conn_flipkart_01';
    const configPayload = {
      app_id: appId,
      seller_id: sellerId || 'FK_SELLER_JYOTSVAN_ORG',
      location_id: locationId || 'LOC_BLR_01',
      primary_marketplace_id: 'FLIPKART_IN',
      environment: environment || 'production',
      sync_orders: true,
      sync_listings: true,
      sync_inventory: true,
      sync_returns: true,
      sync_performance: true,
    };

    if (connRes.rows.length > 0) {
      connectionId = connRes.rows[0].id;
      const updates: any[] = [JSON.stringify(configPayload), connectionId];
      let sql = `UPDATE integration_connections SET configuration = $1, status = 'connected', updated_at = NOW()`;

      if (appSecret) {
        const enc = encryptCredentials({
          app_id: appId,
          app_secret: appSecret,
          seller_id: sellerId || 'FK_SELLER_JYOTSVAN_ORG',
          location_id: locationId || 'LOC_BLR_01',
        });
        sql += `, encrypted_credentials = $3`;
        updates.push(JSON.stringify(enc));
      }
      sql += ` WHERE id = $2`;
      await pool.query(sql, updates);
    } else {
      const enc = encryptCredentials({
        app_id: appId,
        app_secret: appSecret || '',
        seller_id: sellerId || 'FK_SELLER_JYOTSVAN_ORG',
        location_id: locationId || 'LOC_BLR_01',
      });
      await pool.query(
        `INSERT INTO integration_connections (
          id, organization_id, provider_id, provider_key, name,
          status, auth_type, encrypted_credentials, configuration,
          created_at, updated_at
        ) VALUES ($1, $2, 'prov_flipkart_01', 'flipkart', 'Flipkart Store - Jyotsvan Enterprises', 'connected', 'oauth2', $3, $4, NOW(), NOW())`,
        [connectionId, orgId, JSON.stringify(enc), JSON.stringify(configPayload)]
      );
    }

    await AuditService.log({
      organizationId: orgId,
      entityType: 'integration_connection',
      entityId: connectionId,
      action: 'UPDATE',
      eventType: 'SYSTEM_CONFIGURATION_CHANGED',
      module: 'integrations',
      actorType: 'USER',
      actorEmail: 'admin@jyotsvan.enterprise',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
      metadata: { description: `Updated Flipkart API configuration for Seller ID '${sellerId}' (${environment}).` },
    });

    res.json({ success: true, message: 'Flipkart API settings updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
