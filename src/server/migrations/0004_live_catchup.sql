-- 0004_live_catchup: columns the code writes/reads that the older (live) shape of five tables never received.
-- On the live InsForge database these tables pre-date the migrations, so their "CREATE TABLE IF NOT EXISTS" was a no-op
-- and the later ALTERs for these columns were never reached. Purely additive and idempotent: on a database that already
-- has the columns this does nothing. Found by diffing the live schema against the migration-built schema (2026-11-05).

-- Audit trail: every router and the central audit writer insert these.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_email VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_resource VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id VARCHAR(64);

-- Warehouse stock counts.
ALTER TABLE stock_count_sessions ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE stock_count_sessions ADD COLUMN IF NOT EXISTS count_date DATE;
ALTER TABLE stock_count_sessions ADD COLUMN IF NOT EXISTS freeze_movements BOOLEAN DEFAULT FALSE;
ALTER TABLE stock_count_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14, 2) DEFAULT 0;

-- Warehouse transfers.
ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(64) DEFAULT 'replenishment';
ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;
ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(128);
ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(128);
ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS driver_name VARCHAR(128);
ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(64);
ALTER TABLE warehouse_transfer_items ADD COLUMN IF NOT EXISTS requested_quantity NUMERIC(14, 3);
ALTER TABLE warehouse_transfer_items ADD COLUMN IF NOT EXISTS dispatched_quantity NUMERIC(14, 3) DEFAULT 0;
ALTER TABLE warehouse_transfer_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(128);

-- The older audit_logs shape requires entity_type/entity_id; most writers use target_resource/target_id instead.
-- Relax the legacy requirement so those inserts succeed (no-op where already nullable).
ALTER TABLE audit_logs ALTER COLUMN entity_type DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL;
