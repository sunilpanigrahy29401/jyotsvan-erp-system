// Express application factory (no listen/Vite here) so the API can be tested with supertest.
import express from 'express';
import helmet from 'helmet';
import { pool } from './db.ts';
import { productRouter } from './product-routes.ts';
import { supplierRouter } from './supplier-routes.ts';
import { inventoryRouter } from './inventory-routes.ts';
import { warehouseRouter, transferRouter, countRouter } from './warehouse-routes.ts';
import { procurementRouter } from './procurement-routes.ts';
import { qualityRouter } from './quality-routes.ts';
import { formulationRouter } from './formulation-routes.ts';
import { productionRouter } from './production-routes.ts';
import { batchRouter } from './batch-routes.ts';
import { cfRouter } from './cf-routes.ts';
import { distributorRouter } from './distributor-routes.ts';
import { retailerRouter } from './retailer-routes.ts';
import { salesOrderRouter, salesReturnRouter } from './sales-order-routes.ts';
import { financeRouter } from './finance-routes.ts';
import { fieldSalesRouter } from './field-sales-routes.ts';
import { peopleRouter } from './people-routes.ts';
import { notificationRouter } from './notification-routes.ts';
import { auditRouter } from './audit-routes.ts';
import { integrationRouter } from './integration-routes.ts';
import { shopifyRouter } from './shopify-routes.ts';
import { metaRoutes } from './meta-routes.ts';
import { googleAdsRouter } from './google-ads-routes.ts';
import { amazonRouter } from './amazon-routes.ts';
import { flipkartRouter } from './flipkart-routes.ts';
import { myntraRouter } from './myntra-routes.ts';
import { marketplaceHubRouter } from './marketplace-hub-routes.ts';
import { analyticsRouter } from './analytics-routes.ts';
import { reportsRouter } from './reports-routes.ts';
import { aiRouter } from './ai-routes.ts';
import { crmRouter } from './crm-routes.ts';
import { authRouter } from './core/auth-routes.ts';
import { authenticate, enforceTenantContext, rateLimit, requireSuperAdmin } from './core/middleware.ts';
import { enforcePermissions, isPublic } from './core/permission-map.ts';
import { pendingMigrations } from './core/migrator.ts';

declare module 'http' {
  interface IncomingMessage {
    rawBody?: string;
  }
}

function parseTrustProxy(): boolean | number | string {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === '' || v === 'false') return false;
  if (v === 'true') return true;
  return /^\d+$/.test(v) ? Number(v) : v;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', parseTrustProxy());

  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      // Dev serves Vite's inline HMR scripts; in production the policy is report-only until it has been observed in staging.
      contentSecurityPolicy: isProd
        ? {
            reportOnly: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: ["'self'", 'https://*.insforge.app'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Capture the exact bytes for webhook signature verification.
  app.use(
    express.json({
      limit: process.env.JSON_BODY_LIMIT || '5mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );

  // ---- Public ----------------------------------------------------------------
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);

  // ---- Everything else under /api requires a verified session and permission ----
  const gate = express.Router();
  gate.use(authenticate);
  gate.use(enforceTenantContext);
  gate.use(enforcePermissions);
  app.use('/api', (req, res, next) => (isPublic(req.method, req.path) ? next() : gate(req, res, next)));

  // Admin diagnostics (replaces the old unauthenticated /api/db/*, /api/insforge/health endpoints)
  app.get('/api/admin/system-status', requireSuperAdmin, rateLimit({ windowMs: 60_000, max: 20 }), async (_req, res) => {
    const start = Date.now();
    try {
      await pool.query('SELECT 1');
      res.json({ database: 'connected', latencyMs: Date.now() - start, pendingMigrations: await pendingMigrations(pool) });
    } catch {
      res.status(503).json({ database: 'unreachable' });
    }
  });

  app.use('/api', productRouter);
  app.use('/api', supplierRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/warehouses', warehouseRouter);
  app.use('/api/warehouse-transfers', transferRouter);
  app.use('/api/warehouse-counts', countRouter);
  app.use('/api/procurement', procurementRouter);
  app.use('/api/quality', qualityRouter);
  app.use('/api/formulations', formulationRouter);
  app.use('/api/production', productionRouter);
  app.use('/api/batches', batchRouter);
  app.use('/api/cfs', cfRouter);
  app.use('/api/distributors', distributorRouter);
  app.use('/api/retailers', retailerRouter);
  app.use('/api/sales-orders', salesOrderRouter);
  app.use('/api/sales-returns', salesReturnRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/field-sales', fieldSalesRouter);
  app.use('/api/people', peopleRouter);
  app.use('/api', notificationRouter);
  app.use('/api', auditRouter);
  app.use('/api/integrations', integrationRouter);
  app.use('/api', integrationRouter);
  app.use('/api/integrations/shopify', shopifyRouter);
  app.use('/api/shopify', shopifyRouter);
  app.use('/api/integrations/meta', metaRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/integrations/google-ads', googleAdsRouter);
  app.use('/api/google-ads', googleAdsRouter);
  app.use('/api/integrations/amazon', amazonRouter);
  app.use('/api/amazon', amazonRouter);
  app.use('/api/integrations/flipkart', flipkartRouter);
  app.use('/api/flipkart', flipkartRouter);
  app.use('/api/integrations/myntra', myntraRouter);
  app.use('/api/myntra', myntraRouter);
  app.use('/api/commerce/marketplaces', marketplaceHubRouter);
  app.use('/api/marketplaces', marketplaceHubRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/crm', crmRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // Last-resort error handler: never leak internals.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server] unhandled error', req.method, req.path, err instanceof Error ? err.stack : err);
    if (res.headersSent) return;
    const status = (err as { status?: number })?.status;
    if (status === 400 || status === 413) return res.status(status).json({ error: 'Invalid request.' });
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

