// Legacy schema/seed migrations, formerly run on every server boot from server.ts.
// They are idempotent (CREATE TABLE IF NOT EXISTS / upserts) but unversioned and some seed DEMO data.
// Production must NOT run these automatically: use `npm run db:migrate -- --legacy` deliberately.
import { initDatabaseSchema, pool } from '../db.ts';
import { ensureBaseCatalogueTables } from './legacy-prelude.ts';
import { syncFoundationData } from '../sync-foundation.ts';
import { runProductMasterMigration } from '../migrate-product-master.ts';
import { runSupplierMasterMigration } from '../migrate-supplier-master.ts';
import { runInventoryEngineMigration } from '../migrate-inventory-engine.ts';
import { runWarehouseManagementMigration } from '../migrate-warehouse-management.ts';
import { migrateProcurement } from '../migrate-procurement.ts';
import { migrateQualityControl } from '../migrate-quality-control.ts';
import { runFormulationMigration } from '../migrate-formulations.ts';
import { runProductionMigration } from '../migrate-production.ts';
import { runBatchMigration } from '../migrate-batches.ts';
import { runCFMigration } from '../migrate-cfs.ts';
import { runDistributorMigration } from '../migrate-distributors.ts';
import { runRetailerMigration } from '../migrate-retailers.ts';
import { runSalesOrderMigration } from '../migrate-sales-orders.ts';
import { runFinanceMigration } from '../migrate-finance.ts';
import { runFieldSalesMigration } from '../migrate-field-sales.ts';
import { runPeopleMigration } from '../migrate-people.ts';
import { runNotificationsMigration } from '../migrate-notifications.ts';
import { runAuditLogsMigration } from '../migrate-audit-logs.ts';
import { runIntegrationsMigration } from '../migrate-integrations.ts';
import { runShopifyMigration } from '../migrate-shopify.ts';
import { runMetaAdsMigration } from '../migrate-meta-ads.ts';
import { runGoogleAdsMigration } from '../migrate-google-ads.ts';
import { runAmazonMigration } from '../migrate-amazon.ts';
import { migrateFlipkartIntegration } from '../migrate-flipkart.ts';
import { migrateMyntraIntegration } from '../migrate-myntra.ts';
import { runAiTablesMigration } from '../migrate-ai-tables.ts';
import { runCrmMigration } from '../migrate-crm.ts';

type AnyClient = { query: (...args: any[]) => Promise<any>; release: (...args: any[]) => void };

/**
 * The legacy migrations interleave schema (DDL) with demo seed rows (DML) inside one transaction, and several seeds
 * collide (duplicate keys, ids that differ between files). A single bad seed row rolls back that migration's tables too.
 * In tolerant mode every DML/SELECT statement inside a transaction runs under a SAVEPOINT: a failing seed row is logged and
 * skipped, and the DDL still applies. Disable with LEGACY_TOLERANT_SEEDS=false.
 */
function installTolerantSeeds(): () => void {
  const original = pool.connect.bind(pool) as () => Promise<AnyClient>;
  (pool as any).connect = async () => {
    const client = await original();
    const rawQuery = client.query.bind(client);
    let inTx = false;
    let n = 0;
    client.query = async (...args: any[]) => {
      const text: string = typeof args[0] === 'string' ? args[0] : args[0]?.text || '';
      const head = text.trim().slice(0, 12).toUpperCase();
      if (/^BEGIN/.test(head)) inTx = true;
      else if (/^(COMMIT|ROLLBACK|END)/.test(head)) inTx = false;
      if (inTx && /^(INSERT|UPDATE|DELETE|SELECT)\b/.test(head)) {
        const sp = `legacy_seed_${++n}`;
        await rawQuery(`SAVEPOINT ${sp}`);
        try {
          const res = await rawQuery(...args);
          await rawQuery(`RELEASE SAVEPOINT ${sp}`);
          return res;
        } catch (err) {
          await rawQuery(`ROLLBACK TO SAVEPOINT ${sp}`);
          console.warn(`[Migrations] skipped seed/lookup statement: ${err instanceof Error ? err.message : err} :: ${text.trim().slice(0, 70).replace(/\s+/g, ' ')}`);
          return { rows: [], rowCount: 0 };
        }
      }
      return rawQuery(...args);
    };
    return client;
  };
  return () => {
    (pool as any).connect = original;
  };
}

export async function runLegacyMigrations() {
  const restore = process.env.LEGACY_TOLERANT_SEEDS === 'false' ? () => {} : installTolerantSeeds();
  try {
    return await runLegacyMigrationsInner();
  } finally {
    restore();
  }
}

async function runLegacyMigrationsInner() {
  const migrations = [
    { name: 'Phase 1-5: Foundation Database Schema', fn: initDatabaseSchema },
    { name: 'Phase 1-5: Foundation Data & RBAC', fn: syncFoundationData },
    { name: 'Phase 5b: Base catalogue tables (categories, products)', fn: ensureBaseCatalogueTables },
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

  console.log('[Migrations] Running legacy schema migrations...');
  const results: { name: string; success: boolean; error?: string }[] = [];
  for (const m of migrations) {
    try {
      await m.fn();
      results.push({ name: m.name, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Migrations] FAILED: ${m.name}: ${msg}`);
      results.push({ name: m.name, success: false, error: msg });
    }
  }
  const failed = results.filter((r) => !r.success);
  if (failed.length) console.error(`[Migrations] ${failed.length} legacy migration(s) failed.`);
  return results;
}
