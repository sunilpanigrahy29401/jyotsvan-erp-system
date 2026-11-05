-- 0003_schema_compat: read-only compatibility columns.
-- Several services (C&F, distributors, retailers, procurement/quality reports, field sales) SELECT legacy column names
-- (skus.sku_code / name / standard_cost, suppliers.name, territories.name, retailers.store_name, cfs.name) while every
-- WRITE path (and the migrations) use the canonical names. On a database built from the migrations those SELECTs fail
-- with "column does not exist" (HTTP 500). Generated columns keep the legacy names readable and always consistent with
-- the canonical columns. IF NOT EXISTS makes this a no-op wherever a column of that name already exists (e.g. an older database).
-- Nothing writes to these names, so generated (non-writable) columns are safe.

ALTER TABLE skus ADD COLUMN IF NOT EXISTS sku_code VARCHAR(64) GENERATED ALWAYS AS (sku) STORED;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS name VARCHAR(255) GENERATED ALWAYS AS (variant_name) STORED;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS standard_cost NUMERIC(14, 2) GENERATED ALWAYS AS (cost_price) STORED;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name VARCHAR(255) GENERATED ALWAYS AS (COALESCE(display_name, supplier_name)) STORED;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS name VARCHAR(128) GENERATED ALWAYS AS (territory_name) STORED;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) GENERATED ALWAYS AS (display_name) STORED;
ALTER TABLE cfs ADD COLUMN IF NOT EXISTS name VARCHAR(255) GENERATED ALWAYS AS (display_name) STORED;

-- Distributor credit hold (read by credit checks and the finance dashboard/ageing; previously never created).
ALTER TABLE distributor_commercial_terms ADD COLUMN IF NOT EXISTS credit_hold BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE distributor_commercial_terms ADD COLUMN IF NOT EXISTS credit_hold_reason TEXT;
ALTER TABLE distributor_commercial_terms ADD COLUMN IF NOT EXISTS credit_hold_at TIMESTAMPTZ;
ALTER TABLE distributor_commercial_terms ADD COLUMN IF NOT EXISTS credit_hold_by VARCHAR(64);

-- Tables that services read/write but no migration ever created ---------------------------------------------------

-- Meta Ads sync jobs write entity_type into the generic sync-jobs table.
ALTER TABLE integration_sync_jobs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(64);

-- Flipkart / Myntra sync job log.
CREATE TABLE IF NOT EXISTS marketplace_sync_jobs (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id VARCHAR(64) REFERENCES integration_connections(id) ON DELETE SET NULL,
  provider_key VARCHAR(64) NOT NULL,
  sync_type VARCHAR(32) NOT NULL DEFAULT 'incremental',
  entity_types TEXT[] NOT NULL DEFAULT '{}',
  trigger_source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  status VARCHAR(32) NOT NULL DEFAULT 'RUNNING',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_sync_jobs_org ON marketplace_sync_jobs(organization_id, provider_key, started_at DESC);

-- Pick records written when a sales order is picked for dispatch.
CREATE TABLE IF NOT EXISTS sales_order_pick_items (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sales_order_item_id VARCHAR(64),
  sku_id VARCHAR(64),
  warehouse_id VARCHAR(64),
  location_id VARCHAR(64),
  batch_id VARCHAR(64),
  batch_number VARCHAR(128),
  picked_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  picked_by VARCHAR(64),
  picked_by_email VARCHAR(255),
  picked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'picked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pick_items_order ON sales_order_pick_items(sales_order_id);

-- More read-only legacy aliases (see top of file).
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS code VARCHAR(64) GENERATED ALWAYS AS (supplier_code) STORED;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS code VARCHAR(64) GENERATED ALWAYS AS (territory_code) STORED;
-- retailers.owner_name is read by finance and field-sales; the canonical record only has the legal (proprietor/entity) name.
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) GENERATED ALWAYS AS (legal_name) STORED;
