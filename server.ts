import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { pool, query, initDatabaseSchema } from './src/server/db.ts';
import { syncFoundationData } from './src/server/sync-foundation.ts';
import { productRouter } from './src/server/product-routes.ts';
import { runProductMasterMigration } from './src/server/migrate-product-master.ts';
import { supplierRouter } from './src/server/supplier-routes.ts';
import { runSupplierMasterMigration } from './src/server/migrate-supplier-master.ts';
import { inventoryRouter } from './src/server/inventory-routes.ts';
import { runInventoryEngineMigration } from './src/server/migrate-inventory-engine.ts';
import { warehouseRouter, transferRouter, countRouter } from './src/server/warehouse-routes.ts';
import { runWarehouseManagementMigration } from './src/server/migrate-warehouse-management.ts';
import { procurementRouter } from './src/server/procurement-routes.ts';
import { migrateProcurement } from './src/server/migrate-procurement.ts';
import { qualityRouter } from './src/server/quality-routes.ts';
import { migrateQualityControl } from './src/server/migrate-quality-control.ts';
import { formulationRouter } from './src/server/formulation-routes.ts';
import { runFormulationMigration } from './src/server/migrate-formulations.ts';
import { productionRouter } from './src/server/production-routes.ts';
import { runProductionMigration } from './src/server/migrate-production.ts';
import { batchRouter } from './src/server/batch-routes.ts';
import { runBatchMigration } from './src/server/migrate-batches.ts';
import { cfRouter } from './src/server/cf-routes.ts';
import { runCFMigration } from './src/server/migrate-cfs.ts';
import { distributorRouter } from './src/server/distributor-routes.ts';
import { runDistributorMigration } from './src/server/migrate-distributors.ts';
import { retailerRouter } from './src/server/retailer-routes.ts';
import { runRetailerMigration } from './src/server/migrate-retailers.ts';
import { salesOrderRouter, salesReturnRouter } from './src/server/sales-order-routes.ts';
import { runSalesOrderMigration } from './src/server/migrate-sales-orders.ts';
import { financeRouter } from './src/server/finance-routes.ts';
import { runFinanceMigration } from './src/server/migrate-finance.ts';
import { fieldSalesRouter } from './src/server/field-sales-routes.ts';
import { runFieldSalesMigration } from './src/server/migrate-field-sales.ts';
import { peopleRouter } from './src/server/people-routes.ts';
import { runPeopleMigration } from './src/server/migrate-people.ts';
import { notificationRouter } from './src/server/notification-routes.ts';
import { runNotificationsMigration } from './src/server/migrate-notifications.ts';
import { auditRouter } from './src/server/audit-routes.ts';
import { runAuditLogsMigration } from './src/server/migrate-audit-logs.ts';
import { integrationRouter } from './src/server/integration-routes.ts';
import { runIntegrationsMigration } from './src/server/migrate-integrations.ts';
import { shopifyRouter } from './src/server/shopify-routes.ts';
import { runShopifyMigration } from './src/server/migrate-shopify.ts';
import { metaRoutes } from './src/server/meta-routes.ts';
import { runMetaAdsMigration } from './src/server/migrate-meta-ads.ts';
import { googleAdsRouter } from './src/server/google-ads-routes.ts';
import { runGoogleAdsMigration } from './src/server/migrate-google-ads.ts';
import { amazonRouter } from './src/server/amazon-routes.ts';
import { runAmazonMigration } from './src/server/migrate-amazon.ts';
import { flipkartRouter } from './src/server/flipkart-routes.ts';
import { migrateFlipkartIntegration } from './src/server/migrate-flipkart.ts';
import { myntraRouter } from './src/server/myntra-routes.ts';
import { migrateMyntraIntegration } from './src/server/migrate-myntra.ts';
import { marketplaceHubRouter } from './src/server/marketplace-hub-routes.ts';
import { analyticsRouter } from './src/server/analytics-routes.ts';
import { reportsRouter } from './src/server/reports-routes.ts';
import { aiRouter } from './src/server/ai-routes.ts';
import { runAiTablesMigration } from './src/server/migrate-ai-tables.ts';
import { crmRouter } from './src/server/crm-routes.ts';
import { runCrmMigration } from './src/server/migrate-crm.ts';

const currentFilename = typeof __filename !== 'undefined' ? __filename : '';
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// 1. Basic Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const start = Date.now();
  try {
    const dbResult = await pool.query('SELECT NOW() as current_time, current_database(), current_user, version()');
    const latencyMs = Date.now() - start;
    res.json({
      status: 'healthy',
      database: 'connected',
      engine: 'PostgreSQL (InsForge)',
      latencyMs,
      currentTime: dbResult.rows[0]?.current_time,
      databaseName: dbResult.rows[0]?.current_database,
      user: dbResult.rows[0]?.current_user,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database check failed';
    res.status(500).json({
      status: 'degraded',
      database: 'error',
      error: errorMsg,
    });
  }
});

// 2. Comprehensive InsForge Environment Health & Foundation Diagnostic
app.get('/api/insforge/health', async (req, res) => {
  const start = Date.now();
  try {
    // A. DB Connectivity & Engine
    const dbMeta = await pool.query(`
      SELECT current_database() as db_name, current_user as db_user, version() as version;
    `);

    // B. Schema Tables & Row Counts
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const tableCounts: Record<string, number> = {};
    for (const row of tablesRes.rows) {
      try {
        const c = await pool.query(`SELECT count(*) FROM "${row.table_name}"`);
        tableCounts[row.table_name] = parseInt(c.rows[0].count, 10);
      } catch {
        tableCounts[row.table_name] = 0;
      }
    }

    // C. Inspect RLS Status on Public Tables
    const rlsRes = await pool.query(`
      SELECT relname as table_name, relrowsecurity as rls_enabled
      FROM pg_class
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public' AND pg_class.relkind = 'r'
      ORDER BY relname;
    `);
    const rlsStatus = rlsRes.rows.map(r => ({
      table: r.table_name,
      rlsEnabled: Boolean(r.rls_enabled),
    }));

    // D. Storage Buckets
    let storageBuckets: string[] = [];
    try {
      const bucketsRes = await pool.query(`SELECT name, public FROM storage.buckets ORDER BY name`);
      storageBuckets = bucketsRes.rows.map(b => `${b.name} (${b.public ? 'public' : 'private'})`);
    } catch {
      storageBuckets = [];
    }

    // E. Auth & Identity Verification
    let authUserCount = 0;
    try {
      const authRes = await pool.query(`SELECT count(*) FROM auth.users`);
      authUserCount = parseInt(authRes.rows[0]?.count || '0', 10);
    } catch {
      authUserCount = 0;
    }

    const latencyMs = Date.now() - start;

    res.json({
      environment: 'InsForge PostgreSQL Managed Cloud',
      status: 'operational',
      database: {
        connected: true,
        name: dbMeta.rows[0]?.db_name,
        user: dbMeta.rows[0]?.db_user,
        latencyMs,
      },
      schemas: ['public', 'auth', 'storage', 'system'],
      publicTables: tableCounts,
      rlsPolicies: rlsStatus,
      storageBuckets,
      identity: {
        publicUsersCount: tableCounts['users'] || 0,
        authUsersCount: authUserCount,
        verifiedOwnerSeeded: Boolean(tableCounts['users'] && tableCounts['users'] > 0),
      },
      rbac: {
        rolesCount: tableCounts['roles'] || 0,
        permissionsCount: tableCounts['permissions'] || 0,
        rolePermissionsCount: tableCounts['role_permissions'] || 0,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Diagnostic failed';
    res.status(500).json({ status: 'error', error: errorMsg });
  }
});

// 3. Database Info & Tables Summary Endpoint
app.get('/api/db/status', async (req, res) => {
  try {
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const counts: Record<string, number> = {};
    for (const row of tablesResult.rows) {
      try {
        const countRes = await pool.query(`SELECT count(*) FROM "${row.table_name}"`);
        counts[row.table_name] = parseInt(countRes.rows[0].count, 10);
      } catch {
        counts[row.table_name] = 0;
      }
    }

    res.json({
      connected: true,
      database: 'insforge',
      tables: tablesResult.rows.map(r => r.table_name),
      counts,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve database status';
    res.status(500).json({ connected: false, error: errorMsg });
  }
});

// 4. Server-Side User Profile & RBAC Resolution
app.get('/api/auth/profile', async (req, res) => {
  const email = (req.query.email as string)?.trim().toLowerCase();
  const userId = (req.query.userId as string)?.trim();

  if (!email && !userId) {
    return res.status(400).json({ error: 'Email or userId query parameter is required' });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, organization_id, email, full_name, phone_number, avatar_url, is_super_admin, default_branch_id, status, created_at, updated_at
       FROM users
       WHERE ${userId ? 'id = $1' : 'LOWER(email) = LOWER($1)'}`,
      [userId || email]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    const user = userRes.rows[0];

    // Fetch Roles
    const rolesRes = await pool.query(
      `SELECT r.id, r.name, r.slug, r.description, r.is_system
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.organization_id = $2`,
      [user.id, user.organization_id]
    );

    // Fetch Permissions
    const permissionsRes = await pool.query(
      `SELECT DISTINCT p.code, p.module, p.description
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1 AND ur.organization_id = $2`,
      [user.id, user.organization_id]
    );

    res.json({
      user,
      roles: rolesRes.rows,
      permissions: permissionsRes.rows.map(p => p.code),
      permissionDetails: permissionsRes.rows,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Profile lookup failed';
    res.status(500).json({ error: errorMsg });
  }
});

// 5. Generic Query Proxy for Client Data Fetching
app.post('/api/db/query', async (req, res) => {
  const { sql, params } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL query required' });
  }

  try {
    const result = await query(sql, params);
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => f.name),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Query execution error';
    res.status(400).json({ error: errorMsg });
  }
});

// Mount Product & SKU Master, Supplier Master, Inventory Engine, Warehouse Management, and Procurement Endpoints
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

// 6. Sync / Initialize Trigger & Migration Execution
export async function runAllMigrations() {
  const migrations = [
    { name: 'Phase 1-5: Foundation Database Schema', fn: initDatabaseSchema },
    { name: 'Phase 1-5: Foundation Data & RBAC', fn: syncFoundationData },
    { name: 'Phase 6: Product & SKU Master', fn: runProductMasterMigration },
    { name: 'Phase 7: Supplier Master', fn: runSupplierMasterMigration },
    { name: 'Phase 8: Inventory Engine & Stock Ledger', fn: runInventoryEngineMigration },
    { name: 'Phase 9: Warehouse Management & Locations', fn: runWarehouseManagementMigration },
    { name: 'Phase 10: Procurement & Purchase Orders', fn: migrateProcurement },
    { name: 'Phase 11: Quality Control & Inspections', fn: migrateQualityControl },
    { name: 'Phase 12: BOM & Formulations', fn: runFormulationMigration },
    { name: 'Phase 13: Manufacturing & Production Execution', fn: runProductionMigration },
    { name: 'Phase 14: Batch, Lot & Traceability Engine', fn: runBatchMigration },
    { name: 'Phase 15: C&F Management & Depot Logistics', fn: runCFMigration },
    { name: 'Phase 16: Distributor Management & Commercial Terms', fn: runDistributorMigration },
    { name: 'Phase 17: Retailer Management & Channel Operations', fn: runRetailerMigration },
    { name: 'Phase 18: Sales Orders, Pricing & Commercial Operations', fn: runSalesOrderMigration },
    { name: 'Phase 19: Finance, Invoicing, Payments, Collections & Subledger', fn: runFinanceMigration },
    { name: 'Phase 20: Field Sales Execution Layer', fn: runFieldSalesMigration },
    { name: 'Phase 21: Staff & People Management Layer', fn: runPeopleMigration },
    { name: 'Phase 21b: Enterprise CRM & Commercial Growth Engine', fn: runCrmMigration },
    { name: 'Phase 22: Central Notification Engine', fn: runNotificationsMigration },
    { name: 'Phase 23: Enterprise Audit Logs & Immutable Compliance Trail', fn: runAuditLogsMigration },
    { name: 'Phase 24: Enterprise Integration Engine', fn: runIntegrationsMigration },
    { name: 'Phase 25: Shopify Direct-to-Consumer Integration', fn: runShopifyMigration },
    { name: 'Phase 26: Meta Marketing & Ads API Integration', fn: runMetaAdsMigration },
    { name: 'Phase 28-29: Google Ads Integration & Analytics Telemetry', fn: runGoogleAdsMigration },
    { name: 'Phase 30-31: Marketplace Engine & Amazon SP-API Integration', fn: runAmazonMigration },
    { name: 'Phase 32: Flipkart Seller API & Marketplace Integration', fn: migrateFlipkartIntegration },
    { name: 'Phase 33: Myntra Partner Bridge (PPMP/Omni) Integration', fn: migrateMyntraIntegration },
    { name: 'Phase 38-42: Enterprise AI Foundation, Insights & Actions', fn: runAiTablesMigration },
  ];

  console.log('[InsForge Backend] Initializing all enterprise schema migrations...');
  const results: { name: string; success: boolean; error?: string }[] = [];

  for (const m of migrations) {
    try {
      console.log(`[InsForge Backend] -> Executing: ${m.name}...`);
      await m.fn();
      results.push({ name: m.name, success: true });
      console.log(`[InsForge Backend] -> ✓ Completed: ${m.name}`);
    } catch (err: any) {
      console.error(`[InsForge Backend] -> ✗ Error in ${m.name}:`, err.message || err);
      results.push({ name: m.name, success: false, error: err.message || String(err) });
    }
  }

  console.log('[InsForge Backend] All migrations executed.');
  return results;
}

app.all('/api/db/init', async (req, res) => {
  try {
    const results = await runAllMigrations();
    res.json({ success: true, message: 'InsForge PostgreSQL schema & foundation records synchronized.', results });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Schema init error';
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[InsForge Enterprise Backend] Server running on http://0.0.0.0:${PORT}`);
    // Run schema synchronization and migrations in the background
    runAllMigrations().catch((err) => {
      console.warn('[InsForge Backend] Background migration warning:', err);
    });
  });
}

startServer().catch((err) => {
  console.error('[InsForge Enterprise Backend] Failed to start server:', err);
});
