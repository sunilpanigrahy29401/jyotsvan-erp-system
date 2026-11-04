// src/server/migrate-sales-orders.ts
// Schema Migrations & Initial Seed Data for Phase 18 Sales Orders, Pricing, Allocations & Returns

import { pool } from './db.ts';

export async function runSalesOrderMigration() {
  console.log('[Phase 18 Migration] Initializing Sales Orders, Pricing & Fulfillment schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Sales Orders Master Table (`sales_orders`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        order_number VARCHAR(64) NOT NULL,
        order_type VARCHAR(64) NOT NULL DEFAULT 'standard',
        customer_type VARCHAR(64) NOT NULL,
        distributor_id VARCHAR(64) REFERENCES distributors(id) ON DELETE SET NULL,
        retailer_id VARCHAR(64) REFERENCES retailers(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_reference VARCHAR(128),
        order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        requested_delivery_date TIMESTAMPTZ,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        source_c_and_f_id VARCHAR(64) REFERENCES cfs(id) ON DELETE SET NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'INR',
        subtotal NUMERIC(16,2) NOT NULL DEFAULT 0,
        discount_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        order_discount_pct NUMERIC(5,2) DEFAULT 0,
        order_discount_amount NUMERIC(16,2) DEFAULT 0,
        taxable_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        tax_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        grand_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        rounding_adjustment NUMERIC(8,2) DEFAULT 0,
        is_interstate BOOLEAN DEFAULT FALSE,
        cgst_total NUMERIC(16,2) DEFAULT 0,
        sgst_total NUMERIC(16,2) DEFAULT 0,
        igst_total NUMERIC(16,2) DEFAULT 0,
        credit_status VARCHAR(64) NOT NULL DEFAULT 'approved',
        credit_limit_snapshot NUMERIC(16,2) DEFAULT 0,
        credit_exposure_snapshot NUMERIC(16,2) DEFAULT 0,
        credit_override_reason TEXT,
        credit_override_by VARCHAR(64),
        credit_override_at TIMESTAMPTZ,
        inventory_status VARCHAR(64) NOT NULL DEFAULT 'pending',
        fulfillment_status VARCHAR(64) NOT NULL DEFAULT 'unfulfilled',
        payment_status VARCHAR(64) NOT NULL DEFAULT 'unpaid',
        order_status VARCHAR(64) NOT NULL DEFAULT 'draft',
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        notes TEXT,
        internal_notes TEXT,
        billing_address JSONB,
        shipping_address JSONB,
        cancellation_reason TEXT,
        cancelled_by VARCHAR(64),
        cancelled_at TIMESTAMPTZ,
        rejection_reason TEXT,
        rejected_by VARCHAR(64),
        rejected_at TIMESTAMPTZ,
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        updated_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_sales_order_num UNIQUE (organization_id, order_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_orders_org_status ON sales_orders(organization_id, order_status);
      CREATE INDEX IF NOT EXISTS idx_sales_orders_org_dist ON sales_orders(organization_id, distributor_id);
      CREATE INDEX IF NOT EXISTS idx_sales_orders_org_ret ON sales_orders(organization_id, retailer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_orders_wh ON sales_orders(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date DESC);
    `);

    // 2. Sales Order Line Items Table (`sales_order_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        product_name_snapshot VARCHAR(255) NOT NULL,
        sku_code_snapshot VARCHAR(64) NOT NULL,
        variant_name_snapshot VARCHAR(128),
        ordered_quantity NUMERIC(16,4) NOT NULL DEFAULT 1,
        uom VARCHAR(32) NOT NULL DEFAULT 'Unit',
        unit_id VARCHAR(64),
        unit_price NUMERIC(16,4) NOT NULL DEFAULT 0,
        gross_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        discount_pct NUMERIC(5,2) DEFAULT 0,
        discount_amount NUMERIC(16,4) DEFAULT 0,
        taxable_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        tax_rate NUMERIC(5,2) DEFAULT 18,
        tax_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        cgst_amount NUMERIC(16,4) DEFAULT 0,
        sgst_amount NUMERIC(16,4) DEFAULT 0,
        igst_amount NUMERIC(16,4) DEFAULT 0,
        net_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        reserved_quantity NUMERIC(16,4) DEFAULT 0,
        picked_quantity NUMERIC(16,4) DEFAULT 0,
        dispatched_quantity NUMERIC(16,4) DEFAULT 0,
        fulfilled_quantity NUMERIC(16,4) DEFAULT 0,
        returned_quantity NUMERIC(16,4) DEFAULT 0,
        cancelled_quantity NUMERIC(16,4) DEFAULT 0,
        remaining_quantity NUMERIC(16,4) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_so_items_order ON sales_order_items(sales_order_id);
      CREATE INDEX IF NOT EXISTS idx_so_items_sku ON sales_order_items(sku_id);
    `);

    // 3. Sales Order Status History (`sales_order_status_history`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_status_history (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        old_status VARCHAR(64),
        new_status VARCHAR(64) NOT NULL,
        changed_by VARCHAR(64),
        changed_by_email VARCHAR(255),
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_so_hist_order ON sales_order_status_history(sales_order_id);
    `);

    // 4. Sales Order Reservations (`sales_order_reservations`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_reservations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        sales_order_item_id VARCHAR(64) REFERENCES sales_order_items(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64),
        location_id VARCHAR(64),
        quantity NUMERIC(16,4) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'reserved',
        reserved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        released_at TIMESTAMPTZ,
        release_reason TEXT,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_so_res_order ON sales_order_reservations(sales_order_id);
      CREATE INDEX IF NOT EXISTS idx_so_res_sku ON sales_order_reservations(sku_id);
    `);

    // 5. Sales Order Dispatches Table (`sales_order_dispatches`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_dispatches (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        dispatch_number VARCHAR(64) NOT NULL,
        warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        transporter_name VARCHAR(128),
        tracking_number VARCHAR(128),
        vehicle_number VARCHAR(64),
        e_way_bill_number VARCHAR(64),
        status VARCHAR(64) NOT NULL DEFAULT 'dispatched',
        dispatched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        dispatched_by VARCHAR(64),
        dispatched_by_email VARCHAR(255),
        delivered_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_so_dsp_order ON sales_order_dispatches(sales_order_id);
    `);

    // 6. Sales Order Dispatch Items (`sales_order_dispatch_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_dispatch_items (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        dispatch_id VARCHAR(64) NOT NULL REFERENCES sales_order_dispatches(id) ON DELETE CASCADE,
        sales_order_item_id VARCHAR(64) REFERENCES sales_order_items(id) ON DELETE SET NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64),
        location_id VARCHAR(64),
        dispatched_quantity NUMERIC(16,4) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 7. Sales Returns Table (`sales_returns`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        return_number VARCHAR(64) NOT NULL,
        sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        distributor_id VARCHAR(64) REFERENCES distributors(id) ON DELETE SET NULL,
        retailer_id VARCHAR(64) REFERENCES retailers(id) ON DELETE SET NULL,
        warehouse_id VARCHAR(64) REFERENCES warehouses(id) ON DELETE SET NULL,
        reason VARCHAR(64) NOT NULL,
        condition VARCHAR(64) NOT NULL,
        qc_required BOOLEAN DEFAULT TRUE,
        status VARCHAR(64) NOT NULL DEFAULT 'requested',
        total_returned_quantity NUMERIC(16,4) DEFAULT 0,
        total_refund_amount NUMERIC(16,2) DEFAULT 0,
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        received_by VARCHAR(64),
        received_at TIMESTAMPTZ,
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_so_returns_order ON sales_returns(sales_order_id);
    `);

    // 8. Sales Return Items (`sales_return_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sales_return_id VARCHAR(64) NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        sales_order_item_id VARCHAR(64) REFERENCES sales_order_items(id) ON DELETE SET NULL,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        batch_id VARCHAR(64),
        returned_quantity NUMERIC(16,4) NOT NULL,
        unit_price NUMERIC(16,4) NOT NULL DEFAULT 0,
        total_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        disposition VARCHAR(64) DEFAULT 'quarantine',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 9. Seed Initial Sales Orders if table is empty
    const orderCountRes = await client.query(`SELECT COUNT(*) FROM sales_orders WHERE organization_id = 'org-jyotsvan-corp'`);
    if (parseInt(orderCountRes.rows[0]?.count || '0', 10) === 0) {
      console.log('[Phase 18 Migration] Seeding initial commercial sales orders...');

      // Find references
      const distRes = await client.query(`SELECT id, legal_name, display_name FROM distributors WHERE organization_id = 'org-jyotsvan-corp' LIMIT 3`);
      const retRes = await client.query(`SELECT id, legal_name, display_name FROM retailers WHERE organization_id = 'org-jyotsvan-corp' LIMIT 3`);
      const whRes = await client.query(`SELECT id, name FROM warehouses WHERE organization_id = 'org-jyotsvan-corp' LIMIT 2`);
      const skuRes = await client.query(`SELECT id, product_id, sku, selling_price, cost_price FROM skus WHERE organization_id = 'org-jyotsvan-corp' LIMIT 5`);

      const whId = whRes.rows[0]?.id || 'wh-blr-central';
      const distId = distRes.rows[0]?.id;
      const retId = retRes.rows[0]?.id;

      if (skuRes.rows.length >= 2) {
        const sku1 = skuRes.rows[0];
        const sku2 = skuRes.rows[1];

        // Seed 1: Approved & Reserved Distributor Order
        const so1Id = 'so-seed-2026-001';
        const price1 = parseFloat(sku1.selling_price || '450');
        const price2 = parseFloat(sku2.selling_price || '850');
        const gross1 = price1 * 50 + price2 * 25;
        const discount1 = gross1 * 0.05;
        const taxable1 = gross1 - discount1;
        const tax1 = taxable1 * 0.18;
        const grand1 = Math.round(taxable1 + tax1);

        await client.query(`
          INSERT INTO sales_orders (
            id, organization_id, order_number, order_type, customer_type, distributor_id,
            customer_name, customer_reference, order_date, warehouse_id, currency,
            subtotal, discount_total, taxable_amount, tax_total, grand_total,
            credit_status, inventory_status, fulfillment_status, payment_status,
            order_status, status, is_interstate, cgst_total, sgst_total, igst_total,
            created_by_email, created_at, updated_at
          ) VALUES (
            $1, 'org-jyotsvan-corp', 'SO-2026-000101', 'standard', 'distributor', $2,
            $3, 'PO-MAHA-9921', NOW() - INTERVAL '3 days', $4, 'INR',
            $5, $6, $7, $8, $9,
            'approved', 'reserved', 'reserved', 'unpaid',
            'reserved', 'reserved', FALSE, $10, $11, 0,
            'sales@jyotsvan.enterprise', NOW() - INTERVAL '3 days', NOW()
          )
        `, [
          so1Id,
          distId,
          distRes.rows[0]?.display_name || 'Apex Agro & FMCG Distributors',
          whId,
          gross1,
          discount1,
          taxable1,
          tax1,
          grand1,
          tax1 / 2,
          tax1 / 2,
        ]);

        await client.query(`
          INSERT INTO sales_order_items (
            id, organization_id, sales_order_id, product_id, sku_id, product_name_snapshot,
            sku_code_snapshot, ordered_quantity, uom, unit_price, gross_amount, discount_pct,
            discount_amount, taxable_amount, tax_rate, tax_amount, cgst_amount, sgst_amount,
            net_amount, reserved_quantity, fulfilled_quantity, remaining_quantity
          ) VALUES 
          ('soitem-seed-1a', 'org-jyotsvan-corp', $1, $2, $3, 'Digestive Tonic (500ml)', $4, 50, 'Bottles', $5, $6, 5, $7, $8, 18, $9, $10, $10, $11, 50, 0, 50),
          ('soitem-seed-1b', 'org-jyotsvan-corp', $1, $12, $13, 'Immunity Rasayan (1kg)', $14, 25, 'Jars', $15, $16, 5, $17, $18, 18, $19, $20, $20, $21, 25, 0, 25)
        `, [
          so1Id,
          sku1.product_id,
          sku1.id,
          sku1.sku,
          price1,
          price1 * 50,
          (price1 * 50) * 0.05,
          (price1 * 50) * 0.95,
          ((price1 * 50) * 0.95) * 0.18,
          (((price1 * 50) * 0.95) * 0.18) / 2,
          ((price1 * 50) * 0.95) * 1.18,
          sku2.product_id,
          sku2.id,
          sku2.sku,
          price2,
          price2 * 25,
          (price2 * 25) * 0.05,
          (price2 * 25) * 0.95,
          ((price2 * 25) * 0.95) * 0.18,
          (((price2 * 25) * 0.95) * 0.18) / 2,
          ((price2 * 25) * 0.95) * 1.18,
        ]);

        await client.query(`
          INSERT INTO sales_order_reservations (
            id, organization_id, sales_order_id, sales_order_item_id, sku_id, warehouse_id, quantity, status
          ) VALUES 
          ('sores-seed-1a', 'org-jyotsvan-corp', $1, 'soitem-seed-1a', $2, $3, 50, 'reserved'),
          ('sores-seed-1b', 'org-jyotsvan-corp', $1, 'soitem-seed-1b', $4, $3, 25, 'reserved')
        `, [so1Id, sku1.id, whId, sku2.id]);

        // Seed 2: Completed Retailer Order with Dispatches and RMA return
        const so2Id = 'so-seed-2026-002';
        const gross2 = price1 * 20;
        const discount2 = 0;
        const taxable2 = gross2;
        const tax2 = taxable2 * 0.18;
        const grand2 = Math.round(taxable2 + tax2);

        await client.query(`
          INSERT INTO sales_orders (
            id, organization_id, order_number, order_type, customer_type, retailer_id,
            customer_name, customer_reference, order_date, warehouse_id, currency,
            subtotal, discount_total, taxable_amount, tax_total, grand_total,
            credit_status, inventory_status, fulfillment_status, payment_status,
            order_status, status, is_interstate, cgst_total, sgst_total,
            created_by_email, created_at, updated_at
          ) VALUES (
            $1, 'org-jyotsvan-corp', 'SO-2026-000102', 'retailer_order', 'retailer', $2,
            $3, 'RET-REF-441', NOW() - INTERVAL '7 days', $4, 'INR',
            $5, $6, $7, $8, $9,
            'approved', 'fulfilled', 'completed', 'paid',
            'completed', 'completed', FALSE, $10, $11,
            'field@jyotsvan.enterprise', NOW() - INTERVAL '7 days', NOW()
          )
        `, [
          so2Id,
          retId,
          retRes.rows[0]?.display_name || 'Shree Ganesh Ayurvedic Store',
          whId,
          gross2,
          discount2,
          taxable2,
          tax2,
          grand2,
          tax2 / 2,
          tax2 / 2,
        ]);

        await client.query(`
          INSERT INTO sales_order_items (
            id, organization_id, sales_order_id, product_id, sku_id, product_name_snapshot,
            sku_code_snapshot, ordered_quantity, uom, unit_price, gross_amount, discount_pct,
            discount_amount, taxable_amount, tax_rate, tax_amount, cgst_amount, sgst_amount,
            net_amount, reserved_quantity, fulfilled_quantity, remaining_quantity
          ) VALUES 
          ('soitem-seed-2a', 'org-jyotsvan-corp', $1, $2, $3, 'Digestive Tonic (500ml)', $4, 20, 'Bottles', $5, $6, 0, 0, $6, 18, $7, $8, $8, $9, 0, 20, 0)
        `, [
          so2Id,
          sku1.product_id,
          sku1.id,
          sku1.sku,
          price1,
          gross2,
          tax2,
          tax2 / 2,
          grand2,
        ]);

        await client.query(`
          INSERT INTO sales_order_dispatches (
            id, organization_id, sales_order_id, dispatch_number, warehouse_id,
            transporter_name, tracking_number, vehicle_number, e_way_bill_number,
            status, dispatched_at, dispatched_by_email, notes
          ) VALUES (
            'dsp-seed-001', 'org-jyotsvan-corp', $1, 'DSP-2026-000088', $2,
            'VRL Dedicated Logistics', 'LR-9918231', 'KA-01-MJ-8891', '521998241029',
            'delivered', NOW() - INTERVAL '5 days', 'logistics@jyotsvan.enterprise', 'Delivered intact'
          )
        `, [so2Id, whId]);

        await client.query(`
          INSERT INTO sales_returns (
            id, organization_id, return_number, sales_order_id, retailer_id, warehouse_id,
            reason, condition, qc_required, status, total_returned_quantity, total_refund_amount,
            created_by_email, notes
          ) VALUES (
            'ret-seed-001', 'org-jyotsvan-corp', 'RMA-2026-000012', $1, $2, $3,
            'damaged', 'damaged_outer_box', TRUE, 'approved', 2, $4,
            'field@jyotsvan.enterprise', 'Two bottles outer carton crushed during local van transit'
          )
        `, [so2Id, retId, whId, price1 * 2 * 1.18]);
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 18 Migration] Sales Orders & Fulfillment Engine schema setup complete.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 18 Migration Error]', err);
    throw err;
  } finally {
    client.release();
  }
}
