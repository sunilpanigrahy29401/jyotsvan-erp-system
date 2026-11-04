import { pool } from './db.ts';

export async function runInventoryEngineMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    console.log('[Phase 8 Migration] Initializing Inventory Engine Schema...');

    // 1. Inventory Balances Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_balances (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64),
        available_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        reserved_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        damaged_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        quarantine_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        total_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT chk_inv_bal_available CHECK (available_quantity >= 0),
        CONSTRAINT chk_inv_bal_reserved CHECK (reserved_quantity >= 0),
        CONSTRAINT chk_inv_bal_damaged CHECK (damaged_quantity >= 0),
        CONSTRAINT chk_inv_bal_quarantine CHECK (quarantine_quantity >= 0),
        CONSTRAINT chk_inv_bal_total CHECK (total_quantity >= 0)
      );
    `);

    // Unique index for balance key: organization + warehouse + location + sku + batch
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uk_inv_balances_key 
      ON inventory_balances (organization_id, warehouse_id, COALESCE(location_id, 'NO_LOC'), sku_id, COALESCE(batch_id, 'NO_BATCH'));
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inv_balances_org ON inventory_balances (organization_id);
      CREATE INDEX IF NOT EXISTS idx_inv_balances_sku ON inventory_balances (sku_id);
      CREATE INDEX IF NOT EXISTS idx_inv_balances_wh ON inventory_balances (warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_inv_balances_loc ON inventory_balances (location_id);
      CREATE INDEX IF NOT EXISTS idx_inv_balances_total ON inventory_balances (total_quantity);
    `);

    // 2. Inventory Movements (Immutable Stock Movement Ledger)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        batch_id VARCHAR(64),
        movement_type VARCHAR(64) NOT NULL,
        stock_type VARCHAR(32) NOT NULL DEFAULT 'available',
        quantity NUMERIC(14, 3) NOT NULL,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        reference_type VARCHAR(64),
        reference_id VARCHAR(128),
        before_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        after_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
        performed_by VARCHAR(64),
        performed_by_email VARCHAR(255),
        reason TEXT,
        notes TEXT,
        idempotency_key VARCHAR(128),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inv_mov_org_sku ON inventory_movements (organization_id, sku_id);
      CREATE INDEX IF NOT EXISTS idx_inv_mov_wh ON inventory_movements (warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_inv_mov_type ON inventory_movements (movement_type);
      CREATE INDEX IF NOT EXISTS idx_inv_mov_created ON inventory_movements (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inv_mov_ref ON inventory_movements (reference_type, reference_id);
      CREATE INDEX IF NOT EXISTS idx_inv_mov_idempotency ON inventory_movements (organization_id, idempotency_key);
    `);

    // 3. Stock Reservations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        reservation_number VARCHAR(64) NOT NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        batch_id VARCHAR(64),
        quantity NUMERIC(14, 3) NOT NULL,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        reference_type VARCHAR(64) NOT NULL DEFAULT 'manual_hold',
        reference_id VARCHAR(128),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        released_by VARCHAR(64),
        consumed_by VARCHAR(64),
        expires_at TIMESTAMPTZ,
        released_at TIMESTAMPTZ,
        consumed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_res_number UNIQUE (organization_id, reservation_number),
        CONSTRAINT chk_stock_res_qty CHECK (quantity > 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_res_org_status ON stock_reservations (organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_stock_res_sku ON stock_reservations (sku_id);
      CREATE INDEX IF NOT EXISTS idx_stock_res_wh ON stock_reservations (warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_stock_res_ref ON stock_reservations (reference_type, reference_id);
    `);

    // 4. Stock Adjustments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        adjustment_number VARCHAR(64) NOT NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        location_id VARCHAR(64) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        batch_id VARCHAR(64),
        stock_type VARCHAR(32) NOT NULL DEFAULT 'available',
        adjustment_type VARCHAR(32) NOT NULL,
        quantity NUMERIC(14, 3) NOT NULL,
        unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
        previous_quantity NUMERIC(14, 3) NOT NULL,
        new_quantity NUMERIC(14, 3) NOT NULL,
        reason VARCHAR(128) NOT NULL,
        notes TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'applied',
        movement_id VARCHAR(64) REFERENCES inventory_movements(id) ON DELETE SET NULL,
        adjusted_by VARCHAR(64),
        adjusted_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_adj_number UNIQUE (organization_id, adjustment_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_adj_org ON stock_adjustments (organization_id);
      CREATE INDEX IF NOT EXISTS idx_stock_adj_sku ON stock_adjustments (sku_id);
      CREATE INDEX IF NOT EXISTS idx_stock_adj_created ON stock_adjustments (created_at DESC);
    `);

    // 5. Seed RBAC Permissions for Inventory Engine
    const inventoryPermissions = [
      { code: 'inventory.view', module: 'inventory', description: 'View stock levels, warehouse distribution, balances, and SKU quantities' },
      { code: 'inventory.create', module: 'inventory', description: 'Initialize inventory records and stock intake lines' },
      { code: 'inventory.edit', module: 'inventory', description: 'Modify inventory thresholds and metadata' },
      { code: 'inventory.adjust', module: 'inventory', description: 'Perform physical stock count adjustments and corrections' },
      { code: 'inventory.opening_balance', module: 'inventory', description: 'Establish baseline opening stock balances for migration' },
      { code: 'inventory.reserve', module: 'inventory', description: 'Create stock reservations for orders and allocations' },
      { code: 'inventory.release_reservation', module: 'inventory', description: 'Cancel or release reserved stock back to available pool' },
      { code: 'inventory.consume_reservation', module: 'inventory', description: 'Consume reserved stock upon dispatch or work order' },
      { code: 'inventory.transfer', module: 'inventory', description: 'Execute atomic multi-warehouse and location stock transfers' },
      { code: 'inventory.reconcile', module: 'inventory', description: 'Run integrity diagnostics and ledger reconciliation audits' },
      { code: 'inventory.export', module: 'inventory', description: 'Export inventory valuation, balances, and movement ledgers' },
    ];

    const permMap: Record<string, string> = {};

    for (const p of inventoryPermissions) {
      const generatedId = 'perm-' + p.code.replace('.', '-');
      const permRes = await client.query(`
        INSERT INTO permissions (id, code, module, description, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (code) DO UPDATE SET 
          module = EXCLUDED.module,
          description = EXCLUDED.description
        RETURNING id;
      `, [generatedId, p.code, p.module, p.description]);
      permMap[p.code] = permRes.rows[0].id;
    }

    // Assign to roles
    const rolePermissionMappings = [
      // Super Admin gets all
      ...inventoryPermissions.map(p => ({ roleId: 'role-super-admin', permId: permMap[p.code] })),
      // Warehouse Manager gets all
      ...inventoryPermissions.map(p => ({ roleId: 'role-warehouse-manager', permId: permMap[p.code] })),
      // Management gets view, export, reconcile
      { roleId: 'role-management', permId: permMap['inventory.view'] },
      { roleId: 'role-management', permId: permMap['inventory.reconcile'] },
      { roleId: 'role-management', permId: permMap['inventory.export'] },
      // Purchase Manager gets view and export
      { roleId: 'role-purchase-manager', permId: permMap['inventory.view'] },
      { roleId: 'role-purchase-manager', permId: permMap['inventory.export'] },
      // Production Manager gets view, adjust, transfer, reserve
      { roleId: 'role-production-manager', permId: permMap['inventory.view'] },
      { roleId: 'role-production-manager', permId: permMap['inventory.adjust'] },
      { roleId: 'role-production-manager', permId: permMap['inventory.reserve'] },
      { roleId: 'role-production-manager', permId: permMap['inventory.transfer'] },
      // Finance gets view, export, reconcile
      { roleId: 'role-finance', permId: permMap['inventory.view'] },
      { roleId: 'role-finance', permId: permMap['inventory.reconcile'] },
      { roleId: 'role-finance', permId: permMap['inventory.export'] },
    ];

    for (const mapping of rolePermissionMappings) {
      const rpId = `rp-${mapping.roleId}-${mapping.permId}`;
      await client.query(`
        INSERT INTO role_permissions (id, role_id, permission_id, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [rpId, mapping.roleId, mapping.permId]);
    }

    // 6. Seed Baseline Inventory Balances and Opening Movements if not already seeded
    const countCheck = await client.query('SELECT COUNT(*) FROM inventory_balances WHERE organization_id = $1', ['org-jyotsvan-corp']);
    if (parseInt(countCheck.rows[0].count, 10) === 0) {
      console.log('[Phase 8 Migration] Seeding initial inventory balances and movement ledger...');

      // Fetch canonical SKUs
      const skusRes = await client.query('SELECT id, sku, variant_name, unit_id, reorder_level FROM skus WHERE organization_id = $1', ['org-jyotsvan-corp']);
      const skus = skusRes.rows;

      // Warehouses
      const whCentral = 'wh-central-01';
      const whPlant = 'wh-plant-01';
      const whDel = 'wh-del-01';

      // Seed realistic initial stock allocations with movement records
      const initialStockConfigs = [
        // SKU 1 (JY-PON-500ML)
        { skuIdx: 0, warehouseId: whCentral, locationId: 'loc-c-03', available: 450, reserved: 20, damaged: 5, quarantine: 0 },
        { skuIdx: 0, warehouseId: whPlant, locationId: 'loc-p-03', available: 800, reserved: 0, damaged: 0, quarantine: 50 },
        { skuIdx: 0, warehouseId: whDel, locationId: 'loc-n-01', available: 150, reserved: 10, damaged: 0, quarantine: 0 },

        // SKU 2 (JY-PON-1L)
        { skuIdx: 1, warehouseId: whCentral, locationId: 'loc-c-03', available: 320, reserved: 30, damaged: 2, quarantine: 0 },
        { skuIdx: 1, warehouseId: whPlant, locationId: 'loc-p-03', available: 500, reserved: 0, damaged: 0, quarantine: 0 },
        { skuIdx: 1, warehouseId: whDel, locationId: 'loc-n-01', available: 100, reserved: 0, damaged: 0, quarantine: 0 },

        // SKU 3 (JY-BGN-250G)
        { skuIdx: 2, warehouseId: whCentral, locationId: 'loc-c-04', available: 200, reserved: 15, damaged: 0, quarantine: 0 },
        { skuIdx: 2, warehouseId: whPlant, locationId: 'loc-p-03', available: 400, reserved: 0, damaged: 0, quarantine: 25 },

        // SKU 4 (JY-BGN-1KG)
        { skuIdx: 3, warehouseId: whCentral, locationId: 'loc-c-04', available: 85, reserved: 5, damaged: 0, quarantine: 0 },
        { skuIdx: 3, warehouseId: whPlant, locationId: 'loc-p-03', available: 150, reserved: 0, damaged: 0, quarantine: 0 },
      ];

      for (let i = 0; i < initialStockConfigs.length; i++) {
        const config = initialStockConfigs[i];
        if (!skus[config.skuIdx]) continue;
        const targetSku = skus[config.skuIdx];
        const balanceId = `bal-${targetSku.sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${config.warehouseId.substring(3)}`;
        const totalQty = config.available + config.reserved + config.damaged + config.quarantine;

        // 1. Insert Balance
        await client.query(`
          INSERT INTO inventory_balances (
            id, organization_id, warehouse_id, location_id, sku_id,
            available_quantity, reserved_quantity, damaged_quantity, quarantine_quantity, total_quantity,
            unit_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - INTERVAL '30 days', NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [
          balanceId,
          'org-jyotsvan-corp',
          config.warehouseId,
          config.locationId,
          targetSku.id,
          config.available,
          config.reserved,
          config.damaged,
          config.quarantine,
          totalQty,
          targetSku.unit_id || 'u-pcs'
        ]);

        // 2. Insert corresponding opening_balance movement
        const movementId = `mov-op-${balanceId}-${Date.now()}`;
        await client.query(`
          INSERT INTO inventory_movements (
            id, organization_id, sku_id, warehouse_id, location_id,
            movement_type, stock_type, quantity, unit_id,
            reference_type, reference_id, before_quantity, after_quantity,
            performed_by, performed_by_email, reason, notes, idempotency_key, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW() - INTERVAL '30 days');
        `, [
          movementId,
          'org-jyotsvan-corp',
          targetSku.id,
          config.warehouseId,
          config.locationId,
          'opening_balance',
          'available',
          totalQty,
          targetSku.unit_id || 'u-pcs',
          'opening_balance',
          `INIT-${targetSku.sku}`,
          0,
          totalQty,
          'usr-super-admin',
          'admin@jyotsvan.enterprise',
          'Phase 8 Master Stock Migration & Opening Inventory Initialization',
          'Initial plant and regional hub stock baseline',
          `IDEM-OPEN-${balanceId}`
        ]);

        // 3. If reserved > 0, create an active reservation record
        if (config.reserved > 0) {
          const resId = `res-${balanceId}-${i}`;
          const resNum = `RES-2026-000${i + 1}`;
          await client.query(`
            INSERT INTO stock_reservations (
              id, organization_id, reservation_number, sku_id, warehouse_id, location_id,
              quantity, unit_id, reference_type, reference_id, status, notes,
              created_by, created_by_email, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() - INTERVAL '2 days', NOW())
            ON CONFLICT (id) DO NOTHING;
          `, [
            resId,
            'org-jyotsvan-corp',
            resNum,
            targetSku.id,
            config.warehouseId,
            config.locationId,
            config.reserved,
            targetSku.unit_id || 'u-pcs',
            'ecommerce_hold',
            `DTC-ORD-${1000 + i}`,
            'active',
            'Automated inventory hold for Shopify express dispatch',
            'usr-super-admin',
            'admin@jyotsvan.enterprise'
          ]);
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 8 Migration] Inventory Engine Schema & RBAC registered successfully.');
  } catch (err) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    console.error('[Phase 8 Migration Error]', err);
    throw err;
  } finally {
    client.release();
  }
}
