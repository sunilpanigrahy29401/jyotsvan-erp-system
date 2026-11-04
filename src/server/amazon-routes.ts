// src/server/amazon-routes.ts
// Phase 31: Amazon SP-API & Marketplace Engine Express API Routes

import { Router } from 'express';
import { AmazonService } from './amazon-service.ts';
import { pool } from './db.ts';
import { encryptCredentials } from './crypto-vault.ts';
import { AuditService } from './audit-service.ts';

export const amazonRouter = Router();

const DEFAULT_ORG_ID = 'org-jyotsvan-corp';

// 1. Overview & Telemetry
amazonRouter.get('/overview', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;
    const marketplaceId = req.query.marketplaceId as string;

    const data = await AmazonService.getOverview(orgId, connectionId, marketplaceId);
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon overview';
    res.status(500).json({ error: msg });
  }
});

// 2. Orders List
amazonRouter.get('/orders', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;
    const marketplaceId = req.query.marketplaceId as string;
    const status = req.query.status as string;
    const fulfillmentChannel = req.query.fulfillmentChannel as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const search = req.query.search as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await AmazonService.getOrders(orgId, connectionId, {
      marketplaceId,
      status,
      fulfillmentChannel,
      startDate,
      endDate,
      search,
      limit,
      offset,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon orders';
    res.status(500).json({ error: msg });
  }
});

// 3. Products & Listings
amazonRouter.get('/products', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;
    const marketplaceId = req.query.marketplaceId as string;
    const status = req.query.status as string;
    const fulfillmentChannel = req.query.fulfillmentChannel as string;
    const search = req.query.search as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await AmazonService.getProducts(orgId, connectionId, {
      marketplaceId,
      status,
      fulfillmentChannel,
      search,
      limit,
      offset,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon products';
    res.status(500).json({ error: msg });
  }
});

// 4. Inventory
amazonRouter.get('/inventory', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;
    const marketplaceId = req.query.marketplaceId as string;
    const fulfillmentChannel = req.query.fulfillmentChannel as string;
    const search = req.query.search as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await AmazonService.getInventory(orgId, connectionId, {
      marketplaceId,
      fulfillmentChannel,
      search,
      limit,
      offset,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon inventory';
    res.status(500).json({ error: msg });
  }
});

// 5. Returns
amazonRouter.get('/returns', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;
    const marketplaceId = req.query.marketplaceId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await AmazonService.getReturns(orgId, connectionId, {
      marketplaceId,
      status,
      search,
      limit,
      offset,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon returns';
    res.status(500).json({ error: msg });
  }
});

// 6. Reports
amazonRouter.get('/reports', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;
    const reportType = req.query.reportType as string;
    const status = req.query.status as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await AmazonService.getReports(orgId, connectionId, {
      reportType,
      status,
      limit,
      offset,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon reports';
    res.status(500).json({ error: msg });
  }
});

amazonRouter.post('/reports/request', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const { connectionId, reportType, marketplaceId, dataStartTime, dataEndTime } = req.body;

    if (!reportType) {
      return res.status(400).json({ error: 'reportType is required' });
    }

    const report = await AmazonService.requestReport(
      orgId,
      connectionId || 'conn-amazon-in-prod',
      reportType,
      marketplaceId,
      dataStartTime,
      dataEndTime
    );
    res.json({ success: true, report });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to request Amazon report';
    res.status(500).json({ error: msg });
  }
});

// 7. Settlements
amazonRouter.get('/settlements', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;

    const result = await AmazonService.getSettlements(orgId, connectionId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon settlements';
    res.status(500).json({ error: msg });
  }
});

// 8. Fees
amazonRouter.get('/fees', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;
    const feeType = req.query.feeType as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await AmazonService.getFees(orgId, connectionId, { feeType, limit, offset });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon fees';
    res.status(500).json({ error: msg });
  }
});

// 9. SKU Mappings
amazonRouter.get('/mappings', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.query.connectionId as string;

    const result = await AmazonService.getMappings(orgId, connectionId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Amazon SKU mappings';
    res.status(500).json({ error: msg });
  }
});

amazonRouter.put('/mappings/:id', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = (req.query.connectionId as string) || 'conn-amazon-in-prod';
    const mappingId = req.params.id;

    const updated = await AmazonService.updateMapping(orgId, connectionId, mappingId, req.body);
    res.json({ success: true, mapping: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update mapping';
    res.status(500).json({ error: msg });
  }
});

amazonRouter.post('/mappings/auto-match', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.body.connectionId || 'conn-amazon-in-prod';

    const result = await AmazonService.autoMatchMappings(orgId, connectionId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to auto-match SKUs';
    res.status(500).json({ error: msg });
  }
});

// 10. Test Connection
amazonRouter.post('/test', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.body.connectionId;

    const result = await AmazonService.testConnection(orgId, connectionId, req.body);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection test failed';
    res.status(500).json({ success: false, message: msg });
  }
});

// 11. Sync Trigger
amazonRouter.post('/sync', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const connectionId = req.body.connectionId || 'conn-amazon-in-prod';

    const result = await AmazonService.sync(orgId, connectionId, {
      entityType: req.body.entityType || 'all',
      syncType: req.body.syncType || 'incremental',
      marketplaceId: req.body.marketplaceId,
      windowDays: req.body.windowDays || 30,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync execution failed';
    res.status(500).json({ error: msg });
  }
});

// 12. Save Configuration & Credentials
amazonRouter.post('/config', async (req, res) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || DEFAULT_ORG_ID;
    const {
      connectionId = 'conn-amazon-in-prod',
      sellerId,
      region = 'fe',
      primaryMarketplaceId = 'A21TJRUUN4KGV',
      lwaAppId,
      lwaClientSecret,
      lwaRefreshToken,
      autoSyncOrders = true,
      autoSyncInventory = true,
      syncIntervalMins = 30,
    } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    // Update connection
    await pool.query(
      `UPDATE integration_connections SET
        external_account_id = $1,
        configuration = $2,
        status = 'connected',
        health_status = 'healthy',
        updated_at = NOW()
       WHERE id = $3 AND organization_id = $4`,
      [
        sellerId,
        JSON.stringify({
          seller_id: sellerId,
          region,
          primary_marketplace_id: primaryMarketplaceId,
          auto_sync_orders: autoSyncOrders,
          auto_sync_inventory: autoSyncInventory,
          sync_interval_mins: syncIntervalMins,
        }),
        connectionId,
        orgId,
      ]
    );

    // Save encrypted credentials if provided
    if (lwaAppId || lwaClientSecret || lwaRefreshToken) {
      const encrypted = encryptCredentials({
        seller_id: sellerId,
        lwa_app_id: lwaAppId,
        lwa_client_secret: lwaClientSecret,
        lwa_refresh_token: lwaRefreshToken,
        region,
        marketplace_id: primaryMarketplaceId,
      });

      await pool.query(
        `INSERT INTO integration_credentials (
          id, organization_id, connection_id, encrypted_credentials, credential_version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
        ON CONFLICT (connection_id) DO UPDATE SET
          encrypted_credentials = EXCLUDED.encrypted_credentials,
          updated_at = NOW();`,
        [`cred-${connectionId}`, orgId, connectionId, encrypted]
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
      metadata: { description: `Updated Amazon SP-API configuration for Seller ID '${sellerId}' (Region: ${region}).` },
    });

    res.json({ success: true, message: 'Amazon SP-API settings updated successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update Amazon configuration';
    res.status(500).json({ error: msg });
  }
});
