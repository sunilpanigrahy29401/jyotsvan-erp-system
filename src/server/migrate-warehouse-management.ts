import { pool } from './db.ts';

export async function runWarehouseManagementMigration() {
  console.log('[Phase 9 Migration] Initializing Warehouse Management Module Schema...');
  const client = await pool.connect();

  try {
    // 1. Alter / Enhance `warehouses` table
    await client.query(`
      ALTER TABLE warehouses 
      ADD COLUMN IF NOT EXISTS address_line1 TEXT,
      ADD COLUMN IF NOT EXISTS postal_code VARCHAR(32),
      ADD COLUMN IF NOT EXISTS country VARCHAR(128) DEFAULT 'India' NOT NULL,
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(128),
      ADD COLUMN IF NOT EXISTS contact_person VARCHAR(128),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(64),
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS capacity_cubic_meters NUMERIC(15, 2),
      ADD COLUMN IF NOT EXISTS capacity_sq_ft NUMERIC(15, 2),
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    await client.query(`
      UPDATE warehouses 
      SET contact_name = COALESCE(contact_name, 'Warehouse Manager'),
          contact_phone = COALESCE(contact_phone, '+91 22 4567 8900'),
          contact_email = COALESCE(contact_email, 'warehouse@jyotsvan.enterprise')
      WHERE contact_name IS NULL OR contact_phone IS NULL OR contact_email IS NULL;
    `);

    // 2. Alter / Enhance `warehouse_locations` table for Hierarchy & Capacity
    await client.query(`
      ALTER TABLE warehouse_locations
      ADD COLUMN IF NOT EXISTS parent_location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS location_type VARCHAR(64) NOT NULL DEFAULT 'storage',
      ADD COLUMN IF NOT EXISTS zone_code VARCHAR(64),
      ADD COLUMN IF NOT EXISTS aisle_code VARCHAR(64),
      ADD COLUMN IF NOT EXISTS rack_code VARCHAR(64),
      ADD COLUMN IF NOT EXISTS shelf_code VARCHAR(64),
      ADD COLUMN IF NOT EXISTS bin_code VARCHAR(64),
      ADD COLUMN IF NOT EXISTS capacity_quantity NUMERIC(14, 3),
      ADD COLUMN IF NOT EXISTS capacity_unit VARCHAR(64),
      ADD COLUMN IF NOT EXISTS capacity_weight NUMERIC(14, 3),
      ADD COLUMN IF NOT EXISTS capacity_volume NUMERIC(14, 3),
      ADD COLUMN IF NOT EXISTS utilization_threshold NUMERIC(5, 2) DEFAULT 85,
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_locations_parent ON warehouse_locations(parent_location_id);
      CREATE INDEX IF NOT EXISTS idx_locations_type ON warehouse_locations(location_type);
      CREATE INDEX IF NOT EXISTS idx_locations_wh_status ON warehouse_locations(warehouse_id, status);
    `);

    // 3. Internal Transfers Table (`warehouse_transfers`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse_transfers (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        transfer_number VARCHAR(64) NOT NULL,
        source_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        destination_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        source_location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        destination_location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        transfer_type VARCHAR(64) DEFAULT 'replenishment',
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        shipping_carrier VARCHAR(128),
        tracking_number VARCHAR(128),
        vehicle_number VARCHAR(64),
        driver_name VARCHAR(128),
        expected_delivery_date TIMESTAMPTZ,
        requested_by VARCHAR(64),
        requested_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_by_email VARCHAR(255),
        dispatched_by VARCHAR(64),
        dispatched_by_email VARCHAR(255),
        received_by VARCHAR(64),
        received_by_email VARCHAR(255),
        cancelled_by VARCHAR(64),
        cancelled_by_email VARCHAR(255),
        requested_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        dispatched_at TIMESTAMPTZ,
        received_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_transfer_num UNIQUE (organization_id, transfer_number),
        CONSTRAINT chk_transfer_diff_wh CHECK (
          source_warehouse_id <> destination_warehouse_id OR 
          (source_location_id IS NOT NULL AND destination_location_id IS NOT NULL AND source_location_id <> destination_location_id)
        )
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_org_status ON warehouse_transfers(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_transfers_src_wh ON warehouse_transfers(source_warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_dst_wh ON warehouse_transfers(destination_warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_created ON warehouse_transfers(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transfers_number ON warehouse_transfers(transfer_number);
    `);

    // 4. Warehouse Transfer Items Table (`warehouse_transfer_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
        id VARCHAR(64) PRIMARY KEY,
        transfer_id VARCHAR(64) NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
        requested_quantity NUMERIC(14, 3),
        dispatched_quantity NUMERIC(14, 3) DEFAULT 0,
        received_quantity NUMERIC(14, 3) DEFAULT 0,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        batch_id VARCHAR(64),
        batch_number VARCHAR(128),
        source_location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        destination_location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        notes TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trf_items_transfer ON warehouse_transfer_items(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_trf_items_sku ON warehouse_transfer_items(sku_id);
    `);

    // 5. Stock Verification / Count Sessions Table (`stock_count_sessions`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_count_sessions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        count_number VARCHAR(64) NOT NULL,
        name VARCHAR(255),
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        count_type VARCHAR(64) NOT NULL DEFAULT 'full_warehouse',
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        count_date DATE,
        freeze_movements BOOLEAN DEFAULT FALSE,
        conducted_by VARCHAR(64),
        conducted_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_by_email VARCHAR(255),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        reconciled_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_count_session_num UNIQUE (organization_id, count_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_counts_org_status ON stock_count_sessions(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_counts_wh ON stock_count_sessions(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_counts_created ON stock_count_sessions(created_at DESC);
    `);

    // 6. Stock Count Items Table (`stock_count_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_count_items (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL REFERENCES stock_count_sessions(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        system_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        counted_quantity NUMERIC(14, 3),
        variance_quantity NUMERIC(14, 3) DEFAULT 0,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        unit_cost NUMERIC(14, 2) DEFAULT 0,
        notes TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        adjustment_id VARCHAR(64) REFERENCES stock_adjustments(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_count_items_session ON stock_count_items(session_id);
      CREATE INDEX IF NOT EXISTS idx_count_items_sku ON stock_count_items(sku_id);
      CREATE INDEX IF NOT EXISTS idx_count_items_status ON stock_count_items(status);
    `);

    // 7. Warehouse User Assignments (`warehouse_assignments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse_assignments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_type VARCHAR(64) NOT NULL DEFAULT 'operator',
        assigned_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_wh_user_assignment UNIQUE (warehouse_id, user_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wh_assign_wh ON warehouse_assignments(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_wh_assign_user ON warehouse_assignments(user_id);
    `);

    // 8. Register Phase 9 RBAC Permissions
    const warehousePermissions = [
      { id: 'perm-wh-01', code: 'warehouses.view', module: 'warehouses', description: 'View physical warehouses, depots, and storage facilities' },
      { id: 'perm-wh-02', code: 'warehouses.create', module: 'warehouses', description: 'Register new warehouses and distribution centers' },
      { id: 'perm-wh-03', code: 'warehouses.edit', module: 'warehouses', description: 'Modify warehouse capacities, types, and branch assignments' },
      { id: 'perm-wh-04', code: 'warehouses.archive', module: 'warehouses', description: 'Archive or decommission storage warehouses' },
      { id: 'perm-wh-05', code: 'warehouses.export', module: 'warehouses', description: 'Export warehouse registers, locations, and inventory audits' },
      { id: 'perm-wh-06', code: 'warehouse_locations.view', module: 'warehouses', description: 'View warehouse storage racks, bins, and staging areas' },
      { id: 'perm-wh-07', code: 'warehouse_locations.create', module: 'warehouses', description: 'Define storage bins, racks, aisles, and zones within warehouses' },
      { id: 'perm-wh-08', code: 'warehouse_locations.edit', module: 'warehouses', description: 'Update warehouse location definitions, hierarchy, and capacities' },
      { id: 'perm-wh-09', code: 'warehouse_locations.delete', module: 'warehouses', description: 'Deactivate storage bins and zones' },
      { id: 'perm-wh-10', code: 'warehouse_transfers.view', module: 'warehouses', description: 'View inter-warehouse stock transfer orders (STO)' },
      { id: 'perm-wh-11', code: 'warehouse_transfers.create', module: 'warehouses', description: 'Initiate and submit stock transfer requests' },
      { id: 'perm-wh-12', code: 'warehouse_transfers.approve', module: 'warehouses', description: 'Authorize and approve stock transfer orders' },
      { id: 'perm-wh-13', code: 'warehouse_transfers.dispatch', module: 'warehouses', description: 'Execute transfer dispatch and decrement source inventory' },
      { id: 'perm-wh-14', code: 'warehouse_transfers.receive', module: 'warehouses', description: 'Receive incoming transfers and increment destination inventory' },
      { id: 'perm-wh-15', code: 'warehouse_transfers.cancel', module: 'warehouses', description: 'Cancel pending stock transfer orders' },
      { id: 'perm-wh-16', code: 'warehouse_receiving.view', module: 'warehouses', description: 'View warehouse receiving docks and incoming queues' },
      { id: 'perm-wh-17', code: 'warehouse_receiving.create', module: 'warehouses', description: 'Log incoming shipments into receiving staging areas' },
      { id: 'perm-wh-18', code: 'warehouse_receiving.complete', module: 'warehouses', description: 'Execute putaway from receiving dock to storage bins' },
      { id: 'perm-wh-19', code: 'warehouse_dispatch.view', module: 'warehouses', description: 'View dispatch staging areas and outbound shipments' },
      { id: 'perm-wh-20', code: 'warehouse_dispatch.create', module: 'warehouses', description: 'Generate picking lists and allocate dispatch staging' },
      { id: 'perm-wh-21', code: 'warehouse_dispatch.complete', module: 'warehouses', description: 'Mark dispatch as gate-out complete' },
      { id: 'perm-wh-22', code: 'warehouse_count.view', module: 'warehouses', description: 'View cycle count sessions and physical stock audits' },
      { id: 'perm-wh-23', code: 'warehouse_count.create', module: 'warehouses', description: 'Initiate physical stock verification count sessions' },
      { id: 'perm-wh-24', code: 'warehouse_count.approve', module: 'warehouses', description: 'Authorize count variance reconciliation and stock adjustments' },
    ];

    for (const perm of warehousePermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module`,
        [perm.id, perm.code, perm.module, perm.description]
      );
    }

    // Map permissions to roles
    const rolesToMap = ['role-super-admin', 'role-management', 'role-operations-manager', 'role-warehouse-manager'];
    for (const rId of rolesToMap) {
      const roleExists = await client.query('SELECT id FROM roles WHERE id = $1', [rId]);
      if (roleExists.rows.length > 0) {
        for (const p of warehousePermissions) {
          const permLookup = await client.query('SELECT id FROM permissions WHERE code = $1', [p.code]);
          if (permLookup.rows.length > 0) {
            const actualPermId = permLookup.rows[0].id;
            const rpId = `rp-${rId}-${actualPermId}`;
            await client.query(
              `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT DO NOTHING`,
              [rpId, rId, actualPermId]
            );
          }
        }
      }
    }

    // 9. Seed Hierarchical Warehouse Locations for existing warehouses
    const orgId = 'org-jyotsvan-corp';
    const whRes = await client.query('SELECT id, code, name FROM warehouses WHERE organization_id = $1 ORDER BY code ASC', [orgId]);

    if (whRes.rows.length > 0) {
      const centralWh = whRes.rows.find(w => w.id === 'wh-central-01') || whRes.rows[0];

      // Zones & Sub-Locations Hierarchy for Central Hub
      const hierarchicalLocations = [
        // Level 1: Zones / Areas
        {
          id: 'loc-c-rcv-01',
          code: 'RCV-ZONE',
          name: 'Receiving Dock & Inward Staging',
          type: 'receiving',
          parentId: null,
          zone: 'ZONE-RCV',
          capQty: 2000,
          notes: 'Inbound truck unloading and primary inspection staging dock',
        },
        {
          id: 'loc-c-zone-a',
          code: 'ZONE-A',
          name: 'Zone A - Heavy Engineered Equipment',
          type: 'storage',
          parentId: null,
          zone: 'ZONE-A',
          capQty: 5000,
          notes: 'High-bay racking for hydraulic pumps and motor units',
        },
        {
          id: 'loc-c-zone-b',
          code: 'ZONE-B',
          name: 'Zone B - Precision Components & Valves',
          type: 'storage',
          parentId: null,
          zone: 'ZONE-B',
          capQty: 8000,
          notes: 'Climate-controlled racking for cryogenic and control valves',
        },
        {
          id: 'loc-c-pick-01',
          code: 'PICK-STAGE',
          name: 'Picking & Consolidation Area',
          type: 'picking',
          parentId: null,
          zone: 'ZONE-STAGE',
          capQty: 1500,
          notes: 'Order picking consolidation and wave staging tables',
        },
        {
          id: 'loc-c-pack-01',
          code: 'PACK-LINE',
          name: 'Packing & Crating Line',
          type: 'packing',
          parentId: null,
          zone: 'ZONE-STAGE',
          capQty: 1000,
          notes: 'Heavy wooden crate packaging and moisture barrier wrapping',
        },
        {
          id: 'loc-c-dsp-01',
          code: 'DSP-DOCK',
          name: 'Outbound Dispatch Dock & Bay 1-3',
          type: 'dispatch',
          parentId: null,
          zone: 'ZONE-DSP',
          capQty: 3000,
          notes: 'Verified shipments ready for carrier trailer pickup',
        },
        {
          id: 'loc-c-quar-01',
          code: 'QUAR-CAGE',
          name: 'Quality Quarantine Secure Enclosure',
          type: 'quarantine',
          parentId: null,
          zone: 'ZONE-QC',
          capQty: 500,
          notes: 'Padlocked QA inspection holding area for pending batches',
        },
        {
          id: 'loc-c-dam-01',
          code: 'DAM-HOLD',
          name: 'Damaged & Return Goods Bay',
          type: 'damaged',
          parentId: null,
          zone: 'ZONE-RET',
          capQty: 400,
          notes: 'Quarantined damaged items pending insurance/salvage review',
        },

        // Level 2: Aisles & Racks under Zone A
        {
          id: 'loc-c-rack-a1',
          code: 'RACK-A1',
          name: 'Rack A1 (Heavy Duty)',
          type: 'storage',
          parentId: 'loc-c-zone-a',
          zone: 'ZONE-A',
          aisle: 'AISLE-01',
          rack: 'RACK-A1',
          capQty: 1500,
          notes: 'Heavy duty pallet racking rated for 5,000 kg per tier',
        },
        {
          id: 'loc-c-rack-a2',
          code: 'RACK-A2',
          name: 'Rack A2 (Standard Pallet)',
          type: 'storage',
          parentId: 'loc-c-zone-a',
          zone: 'ZONE-A',
          aisle: 'AISLE-02',
          rack: 'RACK-A2',
          capQty: 1800,
          notes: 'Double deep pallet storage',
        },

        // Level 3: Shelf / Bins under Rack A1
        {
          id: 'loc-c-bin-a1-01',
          code: 'BIN-A1-01-A',
          name: 'Bin A1-01-A (Lower Bay)',
          type: 'storage',
          parentId: 'loc-c-rack-a1',
          zone: 'ZONE-A',
          aisle: 'AISLE-01',
          rack: 'RACK-A1',
          shelf: 'SHELF-01',
          bin: 'BIN-01A',
          capQty: 500,
          notes: 'Ground level pallet slot for high-turnover hydraulic pumps',
        },
        {
          id: 'loc-c-bin-a1-02',
          code: 'BIN-A1-01-B',
          name: 'Bin A1-01-B (Upper Tier)',
          type: 'storage',
          parentId: 'loc-c-rack-a1',
          zone: 'ZONE-A',
          aisle: 'AISLE-01',
          rack: 'RACK-A1',
          shelf: 'SHELF-02',
          bin: 'BIN-01B',
          capQty: 500,
          notes: 'Second tier pallet location',
        },

        // Level 2: Racks under Zone B
        {
          id: 'loc-c-rack-b1',
          code: 'RACK-B1',
          name: 'Rack B1 (Climate Controlled)',
          type: 'storage',
          parentId: 'loc-c-zone-b',
          zone: 'ZONE-B',
          aisle: 'AISLE-03',
          rack: 'RACK-B1',
          capQty: 2500,
          notes: 'Dust-free enclosed storage for precision valve assemblies',
        },
        {
          id: 'loc-c-bin-b1-01',
          code: 'BIN-B1-01',
          name: 'Bin B1-01 (Top Shelf)',
          type: 'storage',
          parentId: 'loc-c-rack-b1',
          zone: 'ZONE-B',
          aisle: 'AISLE-03',
          rack: 'RACK-B1',
          shelf: 'SHELF-01',
          bin: 'BIN-01',
          capQty: 800,
          notes: 'Small parts bin dividers for valve rebuild kits',
        },
      ];

      for (const loc of hierarchicalLocations) {
        await client.query(
          `INSERT INTO warehouse_locations (
             id, organization_id, warehouse_id, parent_location_id, code, name, description,
             location_type, zone_code, aisle_code, rack_code, shelf_code, bin_code,
             capacity_quantity, capacity_unit, utilization_threshold, notes, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pcs', 85, $15, 'active', NOW(), NOW())
           ON CONFLICT (warehouse_id, code) 
           DO UPDATE SET 
             parent_location_id = EXCLUDED.parent_location_id,
             location_type = EXCLUDED.location_type,
             name = EXCLUDED.name,
             zone_code = EXCLUDED.zone_code,
             aisle_code = EXCLUDED.aisle_code,
             rack_code = EXCLUDED.rack_code,
             shelf_code = EXCLUDED.shelf_code,
             bin_code = EXCLUDED.bin_code,
             capacity_quantity = EXCLUDED.capacity_quantity,
             notes = EXCLUDED.notes`,
          [
            loc.id,
            orgId,
            centralWh.id,
            loc.parentId || null,
            loc.code,
            loc.name,
            loc.notes,
            loc.type,
            loc.zone || null,
            (loc as any).aisle || null,
            (loc as any).rack || null,
            (loc as any).shelf || null,
            (loc as any).bin || null,
            loc.capQty || 1000,
            loc.notes,
          ]
        );
      }
    }

    // 10. Seed Realistic Warehouse Transfers across lifecycle stages
    const skuRes = await client.query('SELECT id, sku FROM skus WHERE organization_id = $1 LIMIT 5', [orgId]);
    const whList = await client.query('SELECT id, code FROM warehouses WHERE organization_id = $1', [orgId]);

    if (whList.rows.length >= 2 && skuRes.rows.length > 0) {
      const srcWh = whList.rows[0].id;
      const dstWh = whList.rows[1].id;
      const sku1 = skuRes.rows[0].id;
      const sku2 = skuRes.rows[1]?.id || sku1;

      // Seed Completed Transfer
      const trfCompletedId = 'trf-demo-01';
      await client.query(
        `INSERT INTO warehouse_transfers (
           id, organization_id, transfer_number, source_warehouse_id, destination_warehouse_id,
           source_location_id, destination_location_id, status, priority,
           requested_by, requested_by_email, approved_by, approved_by_email,
           dispatched_by, dispatched_by_email, received_by, received_by_email,
           requested_at, approved_at, dispatched_at, received_at, completed_at,
           notes, created_at, updated_at
         ) VALUES ($1, $2, 'TRF-2026-0001', $3, $4, 'loc-c-bin-a1-01', NULL, 'completed', 'high',
                   'usr-owner-sunil', 'sunilpanigrahy29401@gmail.com',
                   'usr-owner-sunil', 'sunilpanigrahy29401@gmail.com',
                   'usr-wh-manager', 'wh.manager@jyotsvan.enterprise',
                   'usr-depot-lead', 'depot.lead@jyotsvan.enterprise',
                   NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 18 hours',
                   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
                   'Replenishment of regional hub safety stock', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day')
         ON CONFLICT (organization_id, transfer_number) DO NOTHING`,
        [trfCompletedId, orgId, srcWh, dstWh]
      );

      await client.query(
        `INSERT INTO warehouse_transfer_items (
           id, transfer_id, sku_id, quantity, received_quantity, status, created_at
         ) VALUES ('trf-item-01-a', $1, $2, 25, 25, 'received', NOW() - INTERVAL '3 days')
         ON CONFLICT DO NOTHING`,
        [trfCompletedId, sku1]
      );

      // Seed In-Transit / Dispatched Transfer
      const trfTransitId = 'trf-demo-02';
      await client.query(
        `INSERT INTO warehouse_transfers (
           id, organization_id, transfer_number, source_warehouse_id, destination_warehouse_id,
           source_location_id, destination_location_id, status, priority,
           requested_by, requested_by_email, approved_by, approved_by_email,
           dispatched_by, dispatched_by_email,
           requested_at, approved_at, dispatched_at,
           notes, created_at, updated_at
         ) VALUES ($1, $2, 'TRF-2026-0002', $3, $4, 'loc-c-bin-b1-01', NULL, 'in_transit', 'urgent',
                   'usr-owner-sunil', 'sunilpanigrahy29401@gmail.com',
                   'usr-owner-sunil', 'sunilpanigrahy29401@gmail.com',
                   'usr-wh-manager', 'wh.manager@jyotsvan.enterprise',
                   NOW() - INTERVAL '1 day', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '8 hours',
                   'Priority transfer for OEM customer order fulfilment', NOW() - INTERVAL '1 day', NOW() - INTERVAL '8 hours')
         ON CONFLICT (organization_id, transfer_number) DO NOTHING`,
        [trfTransitId, orgId, srcWh, dstWh]
      );

      await client.query(
        `INSERT INTO warehouse_transfer_items (
           id, transfer_id, sku_id, quantity, received_quantity, status, created_at
         ) VALUES ('trf-item-02-a', $1, $2, 15, 0, 'dispatched', NOW() - INTERVAL '1 day')
         ON CONFLICT DO NOTHING`,
        [trfTransitId, sku2]
      );

      // Seed Requested / Awaiting Approval Transfer
      const trfReqId = 'trf-demo-03';
      await client.query(
        `INSERT INTO warehouse_transfers (
           id, organization_id, transfer_number, source_warehouse_id, destination_warehouse_id,
           status, priority, requested_by, requested_by_email, requested_at,
           notes, created_at, updated_at
         ) VALUES ($1, $2, 'TRF-2026-0003', $3, $4, 'requested', 'medium',
                   'usr-wh-op1', 'operator.hub@jyotsvan.enterprise', NOW() - INTERVAL '4 hours',
                   'Routine inter-branch rebalancing request', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours')
         ON CONFLICT (organization_id, transfer_number) DO NOTHING`,
        [trfReqId, orgId, dstWh, srcWh]
      );

      await client.query(
        `INSERT INTO warehouse_transfer_items (
           id, transfer_id, sku_id, quantity, received_quantity, status, created_at
         ) VALUES ('trf-item-03-a', $1, $2, 10, 0, 'pending', NOW() - INTERVAL '4 hours')
         ON CONFLICT DO NOTHING`,
        [trfReqId, sku1]
      );
    }

    // 11. Seed Stock Verification / Physical Count Sessions
    if (whList.rows.length > 0 && skuRes.rows.length > 0) {
      const whId = whList.rows[0].id;
      const countId = 'cnt-demo-01';

      await client.query(
        `INSERT INTO stock_count_sessions (
           id, organization_id, count_number, warehouse_id, count_type, status,
           conducted_by, conducted_by_email, started_at, completed_at, notes, created_at, updated_at
         ) VALUES ($1, $2, 'CNT-2026-001', $3, 'full_warehouse', 'submitted',
                   'usr-owner-sunil', 'sunilpanigrahy29401@gmail.com',
                   NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 hours',
                   'End of Month Physical Stock Verification & Discrepancy Audit',
                   NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 hours')
         ON CONFLICT (organization_id, count_number) DO NOTHING`,
        [countId, orgId, whId]
      );

      // Add Count Items
      for (let i = 0; i < skuRes.rows.length; i++) {
        const sku = skuRes.rows[i];
        const balRes = await client.query(
          `SELECT available_quantity FROM inventory_balances WHERE warehouse_id = $1 AND sku_id = $2`,
          [whId, sku.id]
        );
        const sysQty = balRes.rows.length > 0 ? parseFloat(balRes.rows[0].available_quantity) : 100;
        const countedQty = i === 0 ? sysQty - 2 : sysQty;
        const variance = countedQty - sysQty;

        await client.query(
          `INSERT INTO stock_count_items (
             id, session_id, sku_id, location_id, system_quantity, counted_quantity,
             variance_quantity, status, notes, created_at, updated_at
           ) VALUES ($1, $2, $3, 'loc-c-bin-a1-01', $4, $5, $6, $7, $8, NOW() - INTERVAL '1 day', NOW())
           ON CONFLICT DO NOTHING`,
          [
            `cnt-item-${countId}-${sku.id}`,
            countId,
            sku.id,
            sysQty,
            countedQty,
            variance,
            variance === 0 ? 'counted' : 'discrepancy',
            variance === 0 ? 'System and physical count match' : 'Found physical count 2 units lower (packaging seal check)',
          ]
        );
      }
    }

    // 12. Seed Warehouse Staff Assignments
    if (whList.rows.length > 0) {
      const whId = whList.rows[0].id;
      const userRes = await client.query('SELECT id, email FROM users WHERE organization_id = $1 LIMIT 5', [orgId]);

      if (userRes.rows.length > 0) {
        await client.query(
          `INSERT INTO warehouse_assignments (
             id, organization_id, warehouse_id, user_id, role_type, assigned_by, created_at
           ) VALUES ($1, $2, $3, $4, 'manager', 'system', NOW())
           ON CONFLICT (warehouse_id, user_id) DO NOTHING`,
          ['wh-assign-01', orgId, whId, userRes.rows[0].id]
        );
      }
    }

    console.log('[Phase 9 Migration] Warehouse Management Module schema and baseline seed initialized successfully.');
  } catch (err) {
    console.error('[Phase 9 Migration] Failed to migrate Warehouse Management Module schema:', err);
    throw err;
  } finally {
    client.release();
  }
}
