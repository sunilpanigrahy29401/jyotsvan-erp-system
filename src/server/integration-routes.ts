// src/server/integration-routes.ts
// RESTful API Router for Phase 24: Enterprise Integration Engine

import { Router } from 'express';
import { IntegrationService } from './integration-service.ts';
import { CustomRestApiAdapter } from './integrations/custom-rest-adapter.ts';
import { decryptCredentials } from './crypto-vault.ts';
import { pool } from './db.ts';

export const integrationRouter = Router();

// Helper to extract organization and user context
function getContext(req: any) {
  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    'org-jyotsvan-corp';

  const userId = (req.headers['x-user-id'] as string) || 'usr-owner-sunil';
  const userName = (req.headers['x-user-name'] as string) || 'Sunil Patel';
  const userEmail = (req.headers['x-user-email'] as string) || 'sunil.patel@jyotsvan.enterprise';

  return { organizationId, userId, userName, userEmail };
}

// -------------------------------------------------------------
// 1. PROVIDERS CATALOG
// -------------------------------------------------------------

// GET /api/integrations/providers
integrationRouter.get('/providers', async (req, res) => {
  try {
    const { category, search } = req.query;
    const providers = await IntegrationService.getProviders(
      category as string,
      search as string
    );
    res.json({ providers, count: providers.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch provider catalog';
    res.status(500).json({ error: msg });
  }
});

// GET /api/integrations/providers/:key
integrationRouter.get('/providers/:key', async (req, res) => {
  try {
    const provider = await IntegrationService.getProviderByKey(req.params.key);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found in registry' });
    }
    res.json({ provider });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch provider details';
    res.status(500).json({ error: msg });
  }
});

// -------------------------------------------------------------
// 2. METRICS OVERVIEW
// -------------------------------------------------------------

// GET /api/integrations/metrics
integrationRouter.get('/metrics', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const metrics = await IntegrationService.getMetrics(organizationId);
    res.json(metrics);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to calculate integration metrics';
    res.status(500).json({ error: msg });
  }
});

// -------------------------------------------------------------
// 3. TENANT CONNECTIONS CRUD & ACTIONS
// -------------------------------------------------------------

// GET /api/integrations/connections
integrationRouter.get('/connections', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const { category, status, search } = req.query;

    const connections = await IntegrationService.getConnections(organizationId, {
      category: category as string,
      status: status as string,
      search: search as string,
    });

    res.json({ connections, count: connections.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch integration connections';
    res.status(500).json({ error: msg });
  }
});

// GET /api/integrations/connections/:id
integrationRouter.get('/connections/:id', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const connection = await IntegrationService.getConnectionById(organizationId, req.params.id);

    if (!connection) {
      return res.status(404).json({ error: 'Integration connection not found' });
    }

    res.json({ connection });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch connection details';
    res.status(500).json({ error: msg });
  }
});

// POST /api/integrations/connections
integrationRouter.post('/connections', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    const {
      provider_key,
      provider_id,
      name,
      configuration = {},
      credentials = {},
      auth_type,
    } = req.body;

    if (!provider_key || !name) {
      return res.status(400).json({ error: 'Provider key and connection name are required' });
    }

    const connection = await IntegrationService.createConnection({
      organization_id: organizationId,
      provider_key,
      provider_id,
      name,
      configuration,
      credentials,
      auth_type,
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
    });

    res.status(201).json({ connection, message: 'Integration connection established successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to provision integration connection';
    res.status(400).json({ error: msg });
  }
});

// PUT /api/integrations/connections/:id
integrationRouter.put('/connections/:id', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    const { name, status, configuration, credentials } = req.body;

    const connection = await IntegrationService.updateConnection(
      organizationId,
      req.params.id,
      {
        name,
        status,
        configuration,
        credentials,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
      }
    );

    res.json({ connection, message: 'Integration connection settings updated' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update connection';
    res.status(400).json({ error: msg });
  }
});

// POST /api/integrations/connections/:id/disconnect
integrationRouter.post('/connections/:id/disconnect', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    const connection = await IntegrationService.disconnectConnection(
      organizationId,
      req.params.id,
      { userId, userName, userEmail }
    );
    res.json({ connection, message: 'Integration disconnected successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to disconnect integration';
    res.status(400).json({ error: msg });
  }
});

// POST /api/integrations/connections/:id/reconnect
integrationRouter.post('/connections/:id/reconnect', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    const connection = await IntegrationService.reconnectConnection(
      organizationId,
      req.params.id,
      { userId, userName, userEmail }
    );
    res.json({ connection, message: 'Integration reconnected and verified' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reconnect integration';
    res.status(400).json({ error: msg });
  }
});

// DELETE /api/integrations/connections/:id
integrationRouter.delete('/connections/:id', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    await IntegrationService.deleteConnection(
      organizationId,
      req.params.id,
      { userId, userName, userEmail }
    );
    res.json({ success: true, message: 'Integration connection deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete integration';
    res.status(400).json({ error: msg });
  }
});

// POST /api/integrations/connections/:id/test
integrationRouter.post('/connections/:id/test', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const { credentials } = req.body;
    const testResult = await IntegrationService.testConnection(
      organizationId,
      req.params.id,
      credentials
    );
    res.json(testResult);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection test failed';
    res.status(400).json({ success: false, error: msg });
  }
});

// POST /api/integrations/test (Unsaved / Preview test)
integrationRouter.post('/test', async (req, res) => {
  try {
    const { provider_key, configuration = {}, credentials = {} } = req.body;
    if (!provider_key) {
      return res.status(400).json({ error: 'Provider key is required for testing' });
    }
    const testResult = await IntegrationService.testUnsavedConnection(
      provider_key,
      configuration,
      credentials
    );
    res.json(testResult);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection test failed';
    res.status(400).json({ success: false, error: msg });
  }
});

// -------------------------------------------------------------
// 4. SYNCHRONIZATION JOBS
// -------------------------------------------------------------

// POST /api/integrations/connections/:id/sync
integrationRouter.post('/connections/:id/sync', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    const { job_type = 'manual' } = req.body;

    const job = await IntegrationService.triggerSync(
      organizationId,
      req.params.id,
      job_type,
      { userId, userName, userEmail }
    );

    res.json({ job, message: 'Data synchronization job executed' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to trigger synchronization';
    res.status(400).json({ error: msg });
  }
});

// GET /api/integrations/connections/:id/sync-jobs
integrationRouter.get('/connections/:id/sync-jobs', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const jobs = await IntegrationService.getSyncJobs(organizationId, req.params.id);
    res.json({ jobs, count: jobs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch sync jobs';
    res.status(500).json({ error: msg });
  }
});

// GET /api/integrations/sync-jobs
integrationRouter.get('/sync-jobs', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const jobs = await IntegrationService.getSyncJobs(organizationId);
    res.json({ jobs, count: jobs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch sync jobs';
    res.status(500).json({ error: msg });
  }
});

// -------------------------------------------------------------
// 5. WEBHOOK MANAGEMENT & INGESTION
// -------------------------------------------------------------

// GET /api/integrations/webhooks
integrationRouter.get('/webhooks', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const { connection_id } = req.query;
    const webhooks = await IntegrationService.getWebhooks(organizationId, connection_id as string);
    res.json({ webhooks, count: webhooks.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch webhooks';
    res.status(500).json({ error: msg });
  }
});

// POST /api/integrations/webhooks/:id/rotate-secret
integrationRouter.post('/webhooks/:id/rotate-secret', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    const result = await IntegrationService.regenerateWebhookSecret(
      organizationId,
      req.params.id,
      { userId, userName, userEmail }
    );
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to rotate webhook secret';
    res.status(400).json({ error: msg });
  }
});

// POST /api/integrations/webhooks/:provider/:identifier (Public Inbound Ingestion)
integrationRouter.post('/webhooks/:provider/:identifier', async (req, res) => {
  try {
    const { provider, identifier } = req.params;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string);

    const result = await IntegrationService.handleInboundWebhook(
      provider,
      identifier,
      req.headers,
      req.body,
      rawBody,
      clientIp
    );

    if (!result.accepted) {
      return res.status(401).json(result);
    }

    res.status(200).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Inbound webhook processing error';
    res.status(500).json({ accepted: false, error: msg });
  }
});

// -------------------------------------------------------------
// 6. OPERATIONAL LOGS & EVENTS
// -------------------------------------------------------------

// GET /api/integrations/logs
integrationRouter.get('/logs', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const { connection_id, provider_key, limit } = req.query;

    const logs = await IntegrationService.getLogs(organizationId, {
      connectionId: connection_id as string,
      providerKey: provider_key as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({ logs, count: logs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch integration logs';
    res.status(500).json({ error: msg });
  }
});

// GET /api/integrations/events
integrationRouter.get('/events', async (req, res) => {
  try {
    const { organizationId } = getContext(req);
    const { connection_id, direction, limit } = req.query;

    const events = await IntegrationService.getEvents(organizationId, {
      connectionId: connection_id as string,
      direction: direction as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({ events, count: events.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch integration events';
    res.status(500).json({ error: msg });
  }
});

// -------------------------------------------------------------
// 7. CUSTOM REST API INTERACTIVE RUNNER
// -------------------------------------------------------------

// POST /api/integrations/connections/:id/execute-rest
integrationRouter.post('/connections/:id/execute-rest', async (req, res) => {
  try {
    const { organizationId, userId, userName, userEmail } = getContext(req);
    const { method = 'GET', path = '', body, headers } = req.body;

    const conn = await IntegrationService.getConnectionById(organizationId, req.params.id);
    if (!conn) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (conn.provider_key !== 'custom_api') {
      return res.status(400).json({ error: 'Execute REST is only available on Custom REST API connections.' });
    }

    // Decrypt credentials
    const credRes = await pool.query(
      `SELECT encrypted_credentials FROM integration_credentials WHERE organization_id = $1 AND connection_id = $2`,
      [organizationId, conn.id]
    );

    let credentials: Record<string, unknown> = {};
    if (credRes.rows.length > 0 && credRes.rows[0].encrypted_credentials) {
      credentials = decryptCredentials(credRes.rows[0].encrypted_credentials);
    }

    const adapter = new CustomRestApiAdapter();
    const result = await adapter.executeRequest(
      method.toUpperCase(),
      path,
      credentials,
      conn.configuration,
      body,
      headers
    );

    // Log trace
    await IntegrationService.logOperation({
      organizationId,
      connectionId: conn.id,
      providerKey: conn.provider_key,
      operation: `${method.toUpperCase()} ${path || '/'}`,
      direction: 'outbound',
      requestMetadata: { method, path, body },
      responseMetadata: { status: result.status, data: result.data },
      statusCode: result.status,
      durationMs: result.latencyMs,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'REST request execution failed';
    res.status(400).json({ error: msg });
  }
});
