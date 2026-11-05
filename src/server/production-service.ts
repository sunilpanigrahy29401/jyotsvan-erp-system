import { pool } from './db.ts';
import { QualityService } from './quality-service.ts';
import type {
  ProductionOrder,
  ProductionOrderComponent,
  ProductionMaterialIssue,
  ProductionMaterialReturn,
  ProductionOutput,
  ProductionWastage,
  ProductionPlan,
  MaterialAvailabilityReport,
  MaterialAvailabilityItem,
  ProductionSummaryMetrics,
  CreateProductionOrderPayload,
  CreateProductionPlanPayload,
} from '../types/production.ts';

export class ProductionService {
  /**
   * Helper to write structured audit logs
   */
  private static async logAudit(
    client: any,
    orgId: string,
    actor: { id: string | null; email: string },
    action: string,
    entityId: string,
    details: any
  ) {
    try {
      const logId = `aud-prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, target_resource, entity_id, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          logId,
          orgId,
          actor.id,
          actor.email,
          action,
          'production',
          'production_order',
          entityId,
          entityId,
          JSON.stringify(details),
        ]
      );
    } catch (e) {
      console.warn('[Audit Log Warning] Failed to log production audit event:', e);
    }
  }

  /**
   * Helper to record stock movement in inventory_movements ledger
   */
  private static async recordStockMovement(
    client: any,
    params: {
      orgId: string;
      skuId: string;
      warehouseId: string;
      locationId?: string | null;
      batchNumber?: string | null;
      movementType: 'inward' | 'outward' | 'transfer' | 'adjustment';
      quantity: number;
      unitId: string;
      unitCost?: number;
      referenceType: string;
      referenceId: string;
      reasonCode: string;
      actorId?: string | null;
      actorEmail: string;
      notes?: string;
    }
  ): Promise<string> {
    const movementId = `mov-prd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    await client.query(
      `INSERT INTO inventory_movements (
        id, organization_id, sku_id, warehouse_id, location_id, batch_number,
        movement_type, quantity, unit_id, unit_cost, total_cost,
        reference_type, reference_id, reason_code, notes, created_by, created_by_email, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
      [
        movementId,
        params.orgId,
        params.skuId,
        params.warehouseId,
        params.locationId || null,
        params.batchNumber || null,
        params.movementType,
        params.quantity,
        params.unitId,
        params.unitCost || 0,
        Math.round((params.unitCost || 0) * params.quantity * 100) / 100,
        params.referenceType,
        params.referenceId,
        params.reasonCode,
        params.notes || null,
        params.actorId || null,
        params.actorEmail,
      ]
    );
    return movementId;
  }

  // ==========================================
  // 1. PRODUCTION PLANS
  // ==========================================

  public static async createProductionPlan(
    orgId: string,
    payload: CreateProductionPlanPayload,
    actor: { id: string | null; email: string }
  ): Promise<ProductionPlan> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Generate sequence number
      const countRes = await client.query(
        `SELECT COUNT(*) FROM production_plans WHERE organization_id = $1`,
        [orgId]
      );
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const planNumber = `PP-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;
      const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      await client.query(
        `INSERT INTO production_plans (
          id, organization_id, plan_number, title, planned_date, warehouse_id,
          status, notes, created_by, created_by_email, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, NOW(), NOW())`,
        [
          planId,
          orgId,
          planNumber,
          payload.title,
          payload.planned_date,
          payload.warehouse_id,
          payload.notes || null,
          actor.id,
          actor.email,
        ]
      );

      // If existing order IDs passed, associate them
      if (payload.order_ids && payload.order_ids.length > 0) {
        await client.query(
          `UPDATE production_orders
           SET production_plan_id = $1, updated_at = NOW()
           WHERE id = ANY($2::varchar[]) AND organization_id = $3`,
          [planId, payload.order_ids, orgId]
        );
      }

      await this.logAudit(client, orgId, actor, 'create_production_plan', planId, {
        planNumber,
        title: payload.title,
        plannedDate: payload.planned_date,
        warehouseId: payload.warehouse_id,
      });

      await client.query('COMMIT;');
      return (await this.getProductionPlanById(orgId, planId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async listProductionPlans(
    orgId: string,
    params: { page?: number; limit?: number; search?: string; status?: string }
  ): Promise<{ data: ProductionPlan[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['p.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (params.status && params.status !== 'all') {
      conditions.push(`p.status = $${idx++}`);
      values.push(params.status);
    }

    if (params.search) {
      conditions.push(`(p.plan_number ILIKE $${idx} OR p.title ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM production_plans p WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT 
        p.*,
        w.name as warehouse_name,
        w.code as warehouse_code,
        COUNT(po.id) as orders_count,
        COALESCE(SUM(po.planned_quantity), 0)::float as total_planned_quantity
      FROM production_plans p
      JOIN warehouses w ON w.id = p.warehouse_id
      LEFT JOIN production_orders po ON po.production_plan_id = p.id
      WHERE ${whereClause}
      GROUP BY p.id, w.name, w.code
      ORDER BY p.planned_date DESC, p.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    return {
      data: res.rows.map(r => ({
        ...r,
        orders_count: parseInt(r.orders_count, 10) || 0,
        total_planned_quantity: parseFloat(r.total_planned_quantity) || 0,
      })),
      total,
      page,
      limit,
    };
  }

  public static async getProductionPlanById(orgId: string, planId: string): Promise<ProductionPlan | null> {
    const res = await pool.query(
      `SELECT 
        p.*,
        w.name as warehouse_name,
        w.code as warehouse_code,
        COUNT(po.id) as orders_count,
        COALESCE(SUM(po.planned_quantity), 0)::float as total_planned_quantity
       FROM production_plans p
       JOIN warehouses w ON w.id = p.warehouse_id
       LEFT JOIN production_orders po ON po.production_plan_id = p.id
       WHERE p.id = $1 AND p.organization_id = $2
       GROUP BY p.id, w.name, w.code`,
      [planId, orgId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      orders_count: parseInt(row.orders_count, 10) || 0,
      total_planned_quantity: parseFloat(row.total_planned_quantity) || 0,
    };
  }

  public static async approveProductionPlan(
    orgId: string,
    planId: string,
    actor: { id: string | null; email: string }
  ): Promise<ProductionPlan> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query(
        `UPDATE production_plans
         SET status = 'approved', approved_by = $1, approved_by_email = $2, approved_at = NOW(), updated_at = NOW()
         WHERE id = $3 AND organization_id = $4`,
        [actor.id, actor.email, planId, orgId]
      );

      await this.logAudit(client, orgId, actor, 'approve_production_plan', planId, { status: 'approved' });
      await client.query('COMMIT;');
      return (await this.getProductionPlanById(orgId, planId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 2. PRODUCTION ORDERS & FORMULATION SNAPSHOTTING
  // ==========================================

  public static async createProductionOrder(
    orgId: string,
    payload: CreateProductionOrderPayload,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Fetch Formulation and Validate
      const formRes = await client.query(
        `SELECT f.*, p.name as product_name, s.sku as sku_code, s.variant_name as sku_name
         FROM formulations f
         JOIN skus s ON s.id = f.finished_sku_id
         LEFT JOIN products p ON p.id = f.finished_product_id
         WHERE f.id = $1 AND f.organization_id = $2`,
        [payload.formulation_id, orgId]
      );

      if (formRes.rows.length === 0) {
        throw new Error('Selected formulation recipe was not found.');
      }
      const formulation = formRes.rows[0];

      if (formulation.status !== 'approved' && formulation.status !== 'active') {
        throw new Error(`Cannot create production order from a '${formulation.status}' formulation. Must be approved or active.`);
      }

      // Fetch Formulation Components
      const compRes = await client.query(
        `SELECT fc.*, s.sku as component_sku_code, s.variant_name as component_sku_name,
                s.cost_price as standard_cost, s.product_id as comp_prod_id,
                u.short_code as unit_code
         FROM formulation_components fc
         JOIN skus s ON s.id = fc.component_sku_id
         LEFT JOIN units u ON u.id = fc.unit_id
         WHERE fc.formulation_id = $1 AND fc.organization_id = $2
         ORDER BY fc.sequence_order ASC`,
        [payload.formulation_id, orgId]
      );

      if (compRes.rows.length === 0) {
        throw new Error('Formulation has no registered bill of material components.');
      }

      // 2. Calculate Scaling & Snapshots
      const baseBatchSize = parseFloat(formulation.batch_size);
      const plannedQuantity = payload.planned_quantity;
      if (plannedQuantity <= 0) {
        throw new Error('Planned production quantity must be greater than zero.');
      }

      const scalingRatio = Math.round((plannedQuantity / baseBatchSize) * 10000) / 10000;
      const expectedYield = Math.round(parseFloat(formulation.expected_yield) * scalingRatio * 10000) / 10000;
      const expectedWastage = Math.round(parseFloat(formulation.expected_wastage_quantity || 0) * scalingRatio * 10000) / 10000;

      // 3. Generate Order Number
      const countRes = await client.query(
        `SELECT COUNT(*) FROM production_orders WHERE organization_id = $1`,
        [orgId]
      );
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const orderNumber = `PRD-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;
      const orderId = `po-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const batchNum = payload.production_batch_number || `BAT-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;

      // 4. Insert Production Order
      await client.query(
        `INSERT INTO production_orders (
          id, organization_id, production_order_number, production_plan_id,
          formulation_id, formulation_version, formulation_code_snapshot, formulation_name_snapshot,
          finished_product_id, finished_sku_id, warehouse_id, target_location_id,
          planned_quantity, planned_unit_id, scaling_ratio, expected_yield, expected_yield_unit_id, expected_wastage_quantity,
          actual_output_quantity, actual_wastage_quantity, actual_rejected_quantity,
          planned_start_date, planned_end_date,
          status, material_status, qc_status, qc_template_id, production_batch_number,
          notes, created_by, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          0, 0, 0,
          $19, $20,
          'draft', 'pending', $21, $22, $23,
          $24, $25, $26, NOW(), NOW()
        )`,
        [
          orderId,
          orgId,
          orderNumber,
          payload.production_plan_id || null,
          formulation.id,
          formulation.version,
          formulation.formulation_code,
          formulation.name,
          formulation.finished_product_id,
          formulation.finished_sku_id,
          payload.warehouse_id,
          payload.target_location_id || null,
          plannedQuantity,
          formulation.batch_size_unit_id,
          scalingRatio,
          expectedYield,
          formulation.expected_yield_unit_id,
          expectedWastage,
          payload.planned_start_date || null,
          payload.planned_end_date || null,
          formulation.qc_template_id ? 'pending' : 'not_required',
          payload.qc_template_id || formulation.qc_template_id || null,
          batchNum,
          payload.notes || null,
          actor.id,
          actor.email,
        ]
      );

      // 5. Insert Scaled Components Snapshot
      for (const comp of compRes.rows) {
        const baseQty = parseFloat(comp.quantity);
        const wastagePct = parseFloat(comp.wastage_allowance_percentage || 0);
        const scaledRequiredQty = Math.round(baseQty * scalingRatio * 10000) / 10000;
        const scaledPlannedGrossQty = Math.round(scaledRequiredQty * (1 + wastagePct / 100) * 10000) / 10000;
        const compId = `poc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const standardCost = parseFloat(comp.standard_cost || 0);

        await client.query(
          `INSERT INTO production_order_components (
            id, organization_id, production_order_id, component_product_id, component_sku_id,
            component_type, required_quantity, required_unit_id, wastage_allowance_percentage,
            planned_quantity, reserved_quantity, issued_quantity, actual_consumed_quantity, returned_quantity,
            sequence_order, standard_unit_cost, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, 0, 0, $11, $12, NOW(), NOW())`,
          [
            compId,
            orgId,
            orderId,
            comp.comp_prod_id || null,
            comp.component_sku_id,
            comp.component_type || 'raw_material',
            scaledRequiredQty,
            comp.unit_id,
            wastagePct,
            scaledPlannedGrossQty,
            comp.sequence_order || 1,
            standardCost,
          ]
        );
      }

      await this.logAudit(client, orgId, actor, 'create_production_order', orderId, {
        orderNumber,
        formulationCode: formulation.formulation_code,
        version: formulation.version,
        plannedQuantity,
        scalingRatio,
        expectedYield,
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async listProductionOrders(
    orgId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      material_status?: string;
      warehouse_id?: string;
      sku_id?: string;
      plan_id?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<{ data: ProductionOrder[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['po.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (params.status && params.status !== 'all') {
      conditions.push(`po.status = $${idx++}`);
      values.push(params.status);
    }

    if (params.material_status && params.material_status !== 'all') {
      conditions.push(`po.material_status = $${idx++}`);
      values.push(params.material_status);
    }

    if (params.warehouse_id && params.warehouse_id !== 'all') {
      conditions.push(`po.warehouse_id = $${idx++}`);
      values.push(params.warehouse_id);
    }

    if (params.sku_id) {
      conditions.push(`po.finished_sku_id = $${idx++}`);
      values.push(params.sku_id);
    }

    if (params.plan_id) {
      conditions.push(`po.production_plan_id = $${idx++}`);
      values.push(params.plan_id);
    }

    if (params.search) {
      conditions.push(
        `(po.production_order_number ILIKE $${idx} OR po.production_batch_number ILIKE $${idx} OR s.sku ILIKE $${idx} OR s.variant_name ILIKE $${idx} OR p.name ILIKE $${idx} OR po.formulation_name_snapshot ILIKE $${idx})`
      );
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)
       FROM production_orders po
       JOIN skus s ON s.id = po.finished_sku_id
       LEFT JOIN products p ON p.id = po.finished_product_id
       WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const sortCol = params.sortBy === 'planned_quantity' ? 'po.planned_quantity' : 'po.created_at';
    const sortDir = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        po.*,
        po.planned_quantity::float as planned_quantity,
        po.scaling_ratio::float as scaling_ratio,
        po.expected_yield::float as expected_yield,
        po.expected_wastage_quantity::float as expected_wastage_quantity,
        po.actual_output_quantity::float as actual_output_quantity,
        po.actual_wastage_quantity::float as actual_wastage_quantity,
        po.actual_rejected_quantity::float as actual_rejected_quantity,
        s.sku as finished_sku_code,
        s.variant_name as finished_sku_name,
        p.name as finished_product_name,
        w.name as warehouse_name,
        w.code as warehouse_code,
        u.short_code as planned_unit_code,
        yu.short_code as expected_yield_unit_code,
        loc.name as target_location_name,
        pp.plan_number as production_plan_number,
        qc.name as qc_template_name,
        qci.inspection_number as qc_inspection_number
      FROM production_orders po
      JOIN skus s ON s.id = po.finished_sku_id
      LEFT JOIN products p ON p.id = po.finished_product_id
      JOIN warehouses w ON w.id = po.warehouse_id
      LEFT JOIN units u ON u.id = po.planned_unit_id
      LEFT JOIN units yu ON yu.id = po.expected_yield_unit_id
      LEFT JOIN warehouse_locations loc ON loc.id = po.target_location_id
      LEFT JOIN production_plans pp ON pp.id = po.production_plan_id
      LEFT JOIN qc_templates qc ON qc.id = po.qc_template_id
      LEFT JOIN qc_inspections qci ON qci.id = po.qc_inspection_id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    const data: ProductionOrder[] = res.rows.map(r => {
      const plannedQty = r.planned_quantity;
      const expectedYld = r.expected_yield;
      const actOut = r.actual_output_quantity;
      const actWst = r.actual_wastage_quantity;

      const yieldPct = plannedQty > 0 ? Math.round((expectedYld / plannedQty) * 10000) / 100 : 0;
      const actYieldPct = plannedQty > 0 ? Math.round((actOut / plannedQty) * 10000) / 100 : 0;
      const yieldVar = Math.round((actOut - expectedYld) * 10000) / 10000;
      const yieldVarPct = expectedYld > 0 ? Math.round((yieldVar / expectedYld) * 10000) / 100 : 0;
      const wstVar = Math.round((actWst - r.expected_wastage_quantity) * 10000) / 10000;

      return {
        ...r,
        yield_percentage: yieldPct,
        actual_yield_percentage: actYieldPct,
        yield_variance_quantity: yieldVar,
        yield_variance_percentage: yieldVarPct,
        wastage_variance_quantity: wstVar,
      };
    });

    return { data, total, page, limit };
  }

  public static async getProductionOrderById(orgId: string, orderId: string): Promise<ProductionOrder | null> {
    const res = await pool.query(
      `SELECT 
        po.*,
        po.planned_quantity::float as planned_quantity,
        po.scaling_ratio::float as scaling_ratio,
        po.expected_yield::float as expected_yield,
        po.expected_wastage_quantity::float as expected_wastage_quantity,
        po.actual_output_quantity::float as actual_output_quantity,
        po.actual_wastage_quantity::float as actual_wastage_quantity,
        po.actual_rejected_quantity::float as actual_rejected_quantity,
        s.sku as finished_sku_code,
        s.variant_name as finished_sku_name,
        p.name as finished_product_name,
        w.name as warehouse_name,
        w.code as warehouse_code,
        u.short_code as planned_unit_code,
        yu.short_code as expected_yield_unit_code,
        loc.name as target_location_name,
        pp.plan_number as production_plan_number,
        qc.name as qc_template_name,
        qci.inspection_number as qc_inspection_number
       FROM production_orders po
       JOIN skus s ON s.id = po.finished_sku_id
       LEFT JOIN products p ON p.id = po.finished_product_id
       JOIN warehouses w ON w.id = po.warehouse_id
       LEFT JOIN units u ON u.id = po.planned_unit_id
       LEFT JOIN units yu ON yu.id = po.expected_yield_unit_id
       LEFT JOIN warehouse_locations loc ON loc.id = po.target_location_id
       LEFT JOIN production_plans pp ON pp.id = po.production_plan_id
       LEFT JOIN qc_templates qc ON qc.id = po.qc_template_id
       LEFT JOIN qc_inspections qci ON qci.id = po.qc_inspection_id
       WHERE po.id = $1 AND po.organization_id = $2`,
      [orderId, orgId]
    );

    if (res.rows.length === 0) return null;
    const order: ProductionOrder = res.rows[0];

    // Compute metrics
    const plannedQty = order.planned_quantity;
    const expectedYld = order.expected_yield;
    const actOut = order.actual_output_quantity;
    const actWst = order.actual_wastage_quantity;

    order.yield_percentage = plannedQty > 0 ? Math.round((expectedYld / plannedQty) * 10000) / 100 : 0;
    order.actual_yield_percentage = plannedQty > 0 ? Math.round((actOut / plannedQty) * 10000) / 100 : 0;
    order.yield_variance_quantity = Math.round((actOut - expectedYld) * 10000) / 10000;
    order.yield_variance_percentage = expectedYld > 0 ? Math.round((order.yield_variance_quantity / expectedYld) * 10000) / 100 : 0;
    order.wastage_variance_quantity = Math.round((actWst - order.expected_wastage_quantity) * 10000) / 10000;

    // Fetch Components
    const compRes = await pool.query(
      `SELECT 
        poc.*,
        poc.required_quantity::float as required_quantity,
        poc.wastage_allowance_percentage::float as wastage_allowance_percentage,
        poc.planned_quantity::float as planned_quantity,
        poc.reserved_quantity::float as reserved_quantity,
        poc.issued_quantity::float as issued_quantity,
        poc.actual_consumed_quantity::float as actual_consumed_quantity,
        poc.returned_quantity::float as returned_quantity,
        poc.standard_unit_cost::float as standard_unit_cost,
        s.sku as component_sku_code,
        s.variant_name as component_sku_name,
        p.name as component_product_name,
        u.short_code as required_unit_code
       FROM production_order_components poc
       JOIN skus s ON s.id = poc.component_sku_id
       LEFT JOIN products p ON p.id = poc.component_product_id
       LEFT JOIN units u ON u.id = poc.required_unit_id
       WHERE poc.production_order_id = $1 AND poc.organization_id = $2
       ORDER BY poc.sequence_order ASC`,
      [orderId, orgId]
    );

    order.components = compRes.rows.map(c => {
      const planned = c.planned_quantity;
      const issued = c.issued_quantity;
      const consumed = c.actual_consumed_quantity;
      const returned = c.returned_quantity;
      const netConsumed = Math.round((consumed > 0 ? consumed : (issued - returned)) * 10000) / 10000;
      const remainingIssue = Math.max(0, Math.round((planned - issued) * 10000) / 10000);
      const varianceQty = Math.round((netConsumed - planned) * 10000) / 10000;
      const variancePct = planned > 0 ? Math.round((varianceQty / planned) * 10000) / 100 : 0;

      return {
        ...c,
        remaining_issue_quantity: remainingIssue,
        net_consumed_quantity: netConsumed,
        variance_quantity: varianceQty,
        variance_percentage: variancePct,
        total_planned_cost: Math.round(planned * (c.standard_unit_cost || 0) * 100) / 100,
        total_actual_cost: Math.round(netConsumed * (c.standard_unit_cost || 0) * 100) / 100,
      };
    });

    // Fetch Material Issues
    const issuesRes = await pool.query(
      `SELECT 
        pmi.*,
        pmi.quantity::float as quantity,
        s.sku as sku_code,
        s.variant_name as sku_name,
        w.name as warehouse_name,
        loc.name as location_name,
        u.short_code as unit_code
       FROM production_material_issues pmi
       JOIN skus s ON s.id = pmi.sku_id
       JOIN warehouses w ON w.id = pmi.warehouse_id
       LEFT JOIN warehouse_locations loc ON loc.id = pmi.location_id
       LEFT JOIN units u ON u.id = pmi.unit_id
       WHERE pmi.production_order_id = $1 AND pmi.organization_id = $2
       ORDER BY pmi.created_at DESC`,
      [orderId, orgId]
    );
    order.issues = issuesRes.rows;

    // Fetch Material Returns
    const returnsRes = await pool.query(
      `SELECT 
        pmr.*,
        pmr.quantity::float as quantity,
        s.sku as sku_code,
        s.variant_name as sku_name,
        w.name as warehouse_name,
        loc.name as location_name,
        u.short_code as unit_code
       FROM production_material_returns pmr
       JOIN skus s ON s.id = pmr.sku_id
       JOIN warehouses w ON w.id = pmr.warehouse_id
       LEFT JOIN warehouse_locations loc ON loc.id = pmr.location_id
       LEFT JOIN units u ON u.id = pmr.unit_id
       WHERE pmr.production_order_id = $1 AND pmr.organization_id = $2
       ORDER BY pmr.created_at DESC`,
      [orderId, orgId]
    );
    order.returns = returnsRes.rows;

    // Fetch Outputs
    const outputsRes = await pool.query(
      `SELECT 
        po.*,
        po.quantity::float as quantity,
        s.sku as sku_code,
        s.variant_name as sku_name,
        w.name as warehouse_name,
        loc.name as location_name,
        u.short_code as unit_code,
        qci.inspection_number as qc_inspection_number,
        qci.overall_result as qc_overall_result
       FROM production_outputs po
       JOIN skus s ON s.id = po.sku_id
       JOIN warehouses w ON w.id = po.warehouse_id
       LEFT JOIN warehouse_locations loc ON loc.id = po.location_id
       LEFT JOIN units u ON u.id = po.unit_id
       LEFT JOIN qc_inspections qci ON qci.id = po.qc_inspection_id
       WHERE po.production_order_id = $1 AND po.organization_id = $2
       ORDER BY po.created_at DESC`,
      [orderId, orgId]
    );
    order.outputs = outputsRes.rows;

    // Fetch Wastages
    const wastagesRes = await pool.query(
      `SELECT 
        pw.*,
        pw.quantity::float as quantity,
        s.sku as sku_code,
        s.variant_name as sku_name,
        u.short_code as unit_code
       FROM production_wastages pw
       LEFT JOIN skus s ON s.id = pw.sku_id
       LEFT JOIN units u ON u.id = pw.unit_id
       WHERE pw.production_order_id = $1 AND pw.organization_id = $2
       ORDER BY pw.created_at DESC`,
      [orderId, orgId]
    );
    order.wastages = wastagesRes.rows;

    return order;
  }

  // ==========================================
  // 3. MATERIAL AVAILABILITY CHECK & RESERVATION
  // ==========================================

  public static async checkMaterialAvailability(
    orgId: string,
    orderId: string
  ): Promise<MaterialAvailabilityReport> {
    const order = await this.getProductionOrderById(orgId, orderId);
    if (!order) throw new Error('Production order not found.');

    const warehouseId = order.warehouse_id;
    const items: MaterialAvailabilityItem[] = [];
    let totalCost = 0;
    let shortageItemsCount = 0;

    for (const comp of order.components || []) {
      const balRes = await pool.query(
        `SELECT 
          COALESCE(available_quantity, 0)::float as available_quantity,
          COALESCE(reserved_quantity, 0)::float as reserved_quantity,
          COALESCE(total_quantity, 0)::float as total_quantity
         FROM inventory_balances
         WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3`,
        [comp.component_sku_id, warehouseId, orgId]
      );

      const bal = balRes.rows[0] || { available_quantity: 0, reserved_quantity: 0, total_quantity: 0 };
      const neededGross = comp.planned_quantity;
      const alreadyReserved = comp.reserved_quantity;
      const alreadyIssued = comp.issued_quantity;
      const unfulfilledDemand = Math.max(0, neededGross - alreadyIssued - alreadyReserved);

      const availableInWh = bal.available_quantity;
      const shortage = Math.max(0, Math.round((unfulfilledDemand - availableInWh) * 10000) / 10000);

      let status: 'available' | 'partial_shortage' | 'critical_shortage' | 'fully_reserved' | 'fully_issued' = 'available';

      if (alreadyIssued >= neededGross) {
        status = 'fully_issued';
      } else if (alreadyReserved >= neededGross - alreadyIssued) {
        status = 'fully_reserved';
      } else if (shortage === 0) {
        status = 'available';
      } else if (availableInWh > 0) {
        status = 'partial_shortage';
        shortageItemsCount++;
      } else {
        status = 'critical_shortage';
        shortageItemsCount++;
      }

      const cost = Math.round(neededGross * (comp.standard_unit_cost || 0) * 100) / 100;
      totalCost += cost;

      items.push({
        component_id: comp.id,
        sku_id: comp.component_sku_id,
        sku_code: comp.component_sku_code || '',
        sku_name: comp.component_sku_name || '',
        component_type: comp.component_type,
        required_quantity: comp.required_quantity,
        planned_quantity: comp.planned_quantity,
        unit_code: comp.required_unit_code || 'units',
        warehouse_id: warehouseId,
        warehouse_name: order.warehouse_name || '',
        available_in_warehouse: availableInWh,
        reserved_in_warehouse: bal.reserved_quantity,
        total_in_warehouse: bal.total_quantity,
        already_reserved_for_order: alreadyReserved,
        already_issued_for_order: alreadyIssued,
        shortage_quantity: shortage,
        status,
        standard_unit_cost: comp.standard_unit_cost || 0,
        estimated_cost: cost,
      });
    }

    let overallStatus: 'ready' | 'partial_shortage' | 'critical_shortage' | 'reserved' | 'issued' = 'ready';
    if (items.every(i => i.status === 'fully_issued')) {
      overallStatus = 'issued';
    } else if (items.every(i => i.status === 'fully_reserved' || i.status === 'fully_issued')) {
      overallStatus = 'reserved';
    } else if (shortageItemsCount > 0) {
      overallStatus = items.some(i => i.status === 'critical_shortage') ? 'critical_shortage' : 'partial_shortage';
    }

    return {
      order_id: order.id,
      production_order_number: order.production_order_number,
      warehouse_id: warehouseId,
      warehouse_name: order.warehouse_name || '',
      overall_status: overallStatus,
      items,
      total_required_cost: Math.round(totalCost * 100) / 100,
      total_shortage_items: shortageItemsCount,
    };
  }

  public static async reserveMaterials(
    orgId: string,
    orderId: string,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      if (order.status === 'completed' || order.status === 'cancelled') {
        throw new Error(`Cannot reserve stock for a '${order.status}' order.`);
      }

      // Fetch components
      const compRes = await client.query(
        `SELECT * FROM production_order_components WHERE production_order_id = $1 AND organization_id = $2`,
        [orderId, orgId]
      );

      for (const comp of compRes.rows) {
        const plannedGross = parseFloat(comp.planned_quantity);
        const alreadyIssued = parseFloat(comp.issued_quantity);
        const alreadyReserved = parseFloat(comp.reserved_quantity);
        const neededToReserve = Math.max(0, Math.round((plannedGross - alreadyIssued - alreadyReserved) * 10000) / 10000);

        if (neededToReserve > 0) {
          // Lock warehouse balance row
          const balRes = await client.query(
            `SELECT * FROM inventory_balances
             WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3
             FOR UPDATE`,
            [comp.component_sku_id, order.warehouse_id, orgId]
          );

          if (balRes.rows.length === 0) {
            throw new Error(`No inventory balance found for component SKU ID ${comp.component_sku_id} in warehouse.`);
          }

          const bal = balRes.rows[0];
          const available = parseFloat(bal.available_quantity);
          if (available < neededToReserve) {
            throw new Error(
              `Insufficient stock to reserve for SKU ${comp.component_sku_id}. Available: ${available}, Needed: ${neededToReserve}`
            );
          }

          // Atomic balance reservation
          await client.query(
            `UPDATE inventory_balances
             SET available_quantity = available_quantity - $1,
                 reserved_quantity = reserved_quantity + $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [neededToReserve, bal.id]
          );

          // Update component reserved_quantity
          await client.query(
            `UPDATE production_order_components
             SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
             WHERE id = $2`,
            [neededToReserve, comp.id]
          );

          // Record in stock_reservations table
          const resId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          await client.query(
            `INSERT INTO stock_reservations (
              id, organization_id, sku_id, warehouse_id, quantity, reserved_quantity,
              reference_type, reference_id, status, notes, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $5, 'production_order', $6, 'active', 'Material reservation for production order', $7, NOW(), NOW())`,
            [resId, orgId, comp.component_sku_id, order.warehouse_id, neededToReserve, orderId, actor.id]
          );
        }
      }

      // Update Order Status
      await client.query(
        `UPDATE production_orders
         SET status = CASE WHEN status = 'draft' THEN 'reserved' ELSE status END,
             material_status = 'reserved',
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );

      await this.logAudit(client, orgId, actor, 'reserve_production_materials', orderId, {
        warehouseId: order.warehouse_id,
        status: 'reserved',
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 4. MATERIAL ISSUE (WAREHOUSE TO SHOP FLOOR)
  // ==========================================

  public static async issueMaterials(
    orgId: string,
    orderId: string,
    issues: Array<{
      componentId: string;
      quantity: number;
      warehouseId?: string;
      locationId?: string;
      batchNumber?: string;
      notes?: string;
      idempotencyKey?: string;
    }>,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    if (!issues || issues.length === 0) {
      throw new Error('No material issue items provided.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      if (order.status === 'completed' || order.status === 'cancelled') {
        throw new Error(`Cannot issue materials for a '${order.status}' order.`);
      }

      const orderWhId = order.warehouse_id;

      for (const item of issues) {
        if (item.quantity <= 0) continue;

        // Idempotency check
        if (item.idempotencyKey) {
          const dupRes = await client.query(
            `SELECT id FROM production_material_issues WHERE idempotency_key = $1 AND organization_id = $2`,
            [item.idempotencyKey, orgId]
          );
          if (dupRes.rows.length > 0) continue; // Already processed
        }

        // Lock component row
        const compRes = await client.query(
          `SELECT * FROM production_order_components WHERE id = $1 AND production_order_id = $2 FOR UPDATE`,
          [item.componentId, orderId]
        );
        if (compRes.rows.length === 0) throw new Error(`Component ${item.componentId} not found.`);
        const comp = compRes.rows[0];

        const targetWhId = item.warehouseId || orderWhId;

        // Lock warehouse balance row
        const balRes = await client.query(
          `SELECT * FROM inventory_balances
           WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3
           FOR UPDATE`,
          [comp.component_sku_id, targetWhId, orgId]
        );

        if (balRes.rows.length === 0) {
          throw new Error(`Inventory balance record not found for SKU ${comp.component_sku_id}.`);
        }
        const bal = balRes.rows[0];

        const reservedAvailable = parseFloat(comp.reserved_quantity);
        const qtyToIssue = item.quantity;

        // If reserved quantity exists, consume from reservation first
        const qtyFromReservation = Math.min(reservedAvailable, qtyToIssue);
        const qtyFromAvailable = Math.max(0, qtyToIssue - qtyFromReservation);

        if (qtyFromAvailable > parseFloat(bal.available_quantity)) {
          throw new Error(
            `Insufficient unreserved stock to issue for SKU ${comp.component_sku_id}. Available: ${bal.available_quantity}, Required: ${qtyFromAvailable}`
          );
        }

        // Decrement inventory balance
        await client.query(
          `UPDATE inventory_balances
           SET reserved_quantity = GREATEST(0, reserved_quantity - $1),
               available_quantity = GREATEST(0, available_quantity - $2),
               total_quantity = GREATEST(0, total_quantity - $3),
               updated_at = NOW()
           WHERE id = $4`,
          [qtyFromReservation, qtyFromAvailable, qtyToIssue, bal.id]
        );

        // Record stock movement
        const movId = await this.recordStockMovement(client, {
          orgId,
          skuId: comp.component_sku_id,
          warehouseId: targetWhId,
          locationId: item.locationId || null,
          batchNumber: item.batchNumber || null,
          movementType: 'outward',
          quantity: qtyToIssue,
          unitId: comp.required_unit_id,
          unitCost: parseFloat(comp.standard_unit_cost || 0),
          referenceType: 'production_order',
          referenceId: orderId,
          reasonCode: 'production_issue',
          actorId: actor.id,
          actorEmail: actor.email,
          notes: item.notes || `Production issue for ${order.production_order_number}`,
        });

        // Insert material issue record
        const issueCountRes = await client.query(
          `SELECT COUNT(*) FROM production_material_issues WHERE organization_id = $1`,
          [orgId]
        );
        const seq = parseInt(issueCountRes.rows[0].count, 10) + 1;
        const issueNumber = `ISS-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;
        const issueId = `iss-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        await client.query(
          `INSERT INTO production_material_issues (
            id, organization_id, issue_number, production_order_id, component_id, sku_id,
            warehouse_id, location_id, batch_number, quantity, unit_id,
            inventory_movement_id, issued_by, issued_by_email, notes, idempotency_key, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
          [
            issueId,
            orgId,
            issueNumber,
            orderId,
            comp.id,
            comp.component_sku_id,
            targetWhId,
            item.locationId || null,
            item.batchNumber || null,
            qtyToIssue,
            comp.required_unit_id,
            movId,
            actor.id,
            actor.email,
            item.notes || null,
            item.idempotencyKey || null,
          ]
        );

        // Update component issued & reserved
        await client.query(
          `UPDATE production_order_components
           SET issued_quantity = issued_quantity + $1,
               reserved_quantity = GREATEST(0, reserved_quantity - $2),
               updated_at = NOW()
           WHERE id = $3`,
          [qtyToIssue, qtyFromReservation, comp.id]
        );
      }

      // Re-evaluate order state & material status
      const allCompsRes = await client.query(
        `SELECT planned_quantity, issued_quantity FROM production_order_components WHERE production_order_id = $1`,
        [orderId]
      );

      const isFullyIssued = allCompsRes.rows.every(r => parseFloat(r.issued_quantity) >= parseFloat(r.planned_quantity));
      const isPartiallyIssued = allCompsRes.rows.some(r => parseFloat(r.issued_quantity) > 0);

      const newMaterialStatus = isFullyIssued ? 'fully_issued' : isPartiallyIssued ? 'partially_issued' : order.material_status;
      const newStatus = (order.status === 'draft' || order.status === 'approved' || order.status === 'reserved') ? 'in_production' : order.status;

      await client.query(
        `UPDATE production_orders
         SET status = $1,
             material_status = $2,
             actual_start_date = COALESCE(actual_start_date, NOW()),
             updated_at = NOW()
         WHERE id = $3`,
        [newStatus, newMaterialStatus, orderId]
      );

      await this.logAudit(client, orgId, actor, 'issue_production_materials', orderId, {
        itemsCount: issues.length,
        newStatus,
        newMaterialStatus,
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 5. RECORD ACTUAL CONSUMPTION
  // ==========================================

  public static async recordActualConsumption(
    orgId: string,
    orderId: string,
    consumptions: Array<{ componentId: string; actualConsumedQuantity: number }>,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      for (const item of consumptions) {
        if (item.actualConsumedQuantity < 0) continue;
        await client.query(
          `UPDATE production_order_components
           SET actual_consumed_quantity = $1, updated_at = NOW()
           WHERE id = $2 AND production_order_id = $3 AND organization_id = $4`,
          [item.actualConsumedQuantity, item.componentId, orderId, orgId]
        );
      }

      await this.logAudit(client, orgId, actor, 'record_actual_consumption', orderId, {
        consumptionsCount: consumptions.length,
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 6. MATERIAL RETURN (SHOP FLOOR BACK TO WAREHOUSE)
  // ==========================================

  public static async returnUnusedMaterials(
    orgId: string,
    orderId: string,
    returnData: {
      componentId: string;
      quantity: number;
      warehouseId?: string;
      locationId?: string;
      reason: string;
      notes?: string;
      idempotencyKey?: string;
    },
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    if (returnData.quantity <= 0) {
      throw new Error('Return quantity must be strictly greater than zero.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      const compRes = await client.query(
        `SELECT * FROM production_order_components WHERE id = $1 AND production_order_id = $2 FOR UPDATE`,
        [returnData.componentId, orderId]
      );
      if (compRes.rows.length === 0) throw new Error('Component record not found.');
      const comp = compRes.rows[0];

      const issued = parseFloat(comp.issued_quantity);
      const consumed = parseFloat(comp.actual_consumed_quantity);
      const previouslyReturned = parseFloat(comp.returned_quantity);
      const returnQty = returnData.quantity;

      const maxEligibleReturn = Math.max(0, Math.round((issued - previouslyReturned) * 10000) / 10000);
      if (returnQty > maxEligibleReturn) {
        throw new Error(
          `Cannot return ${returnQty}. Maximum returnable quantity based on issued stock is ${maxEligibleReturn}.`
        );
      }

      const targetWhId = returnData.warehouseId || order.warehouse_id;

      // Lock balance and increment available & total
      const balRes = await client.query(
        `SELECT * FROM inventory_balances
         WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3
         FOR UPDATE`,
        [comp.component_sku_id, targetWhId, orgId]
      );

      if (balRes.rows.length === 0) {
        // Create balance record if not existing
        const balId = `bal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        await client.query(
          `INSERT INTO inventory_balances (
            id, organization_id, sku_id, warehouse_id, available_quantity, reserved_quantity,
            total_quantity, quarantine_quantity, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 0, $5, 0, NOW(), NOW())`,
          [balId, orgId, comp.component_sku_id, targetWhId, returnQty]
        );
      } else {
        await client.query(
          `UPDATE inventory_balances
           SET available_quantity = available_quantity + $1,
               total_quantity = total_quantity + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [returnQty, balRes.rows[0].id]
        );
      }

      // Record inward inventory movement
      const movId = await this.recordStockMovement(client, {
        orgId,
        skuId: comp.component_sku_id,
        warehouseId: targetWhId,
        locationId: returnData.locationId || null,
        movementType: 'inward',
        quantity: returnQty,
        unitId: comp.required_unit_id,
        unitCost: parseFloat(comp.standard_unit_cost || 0),
        referenceType: 'production_order',
        referenceId: orderId,
        reasonCode: 'production_return',
        actorId: actor.id,
        actorEmail: actor.email,
        notes: returnData.reason,
      });

      // Insert return record
      const countRes = await client.query(
        `SELECT COUNT(*) FROM production_material_returns WHERE organization_id = $1`,
        [orgId]
      );
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const returnNumber = `RET-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;
      const returnId = `ret-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      await client.query(
        `INSERT INTO production_material_returns (
          id, organization_id, return_number, production_order_id, component_id, sku_id,
          warehouse_id, location_id, quantity, unit_id, inventory_movement_id,
          returned_by, returned_by_email, reason, notes, idempotency_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
        [
          returnId,
          orgId,
          returnNumber,
          orderId,
          comp.id,
          comp.component_sku_id,
          targetWhId,
          returnData.locationId || null,
          returnQty,
          comp.required_unit_id,
          movId,
          actor.id,
          actor.email,
          returnData.reason,
          returnData.notes || null,
          returnData.idempotencyKey || null,
        ]
      );

      // Update component returned_quantity
      await client.query(
        `UPDATE production_order_components
         SET returned_quantity = returned_quantity + $1, updated_at = NOW()
         WHERE id = $2`,
        [returnQty, comp.id]
      );

      await this.logAudit(client, orgId, actor, 'return_production_materials', orderId, {
        returnNumber,
        skuId: comp.component_sku_id,
        quantity: returnQty,
        reason: returnData.reason,
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 7. RECORD PRODUCTION OUTPUT & QC HANDOFF
  // ==========================================

  public static async recordProductionOutput(
    orgId: string,
    orderId: string,
    outputData: {
      quantity: number;
      warehouseId?: string;
      locationId?: string;
      batchNumber?: string;
      manufacturingDate?: string;
      expiryDate?: string;
      createQCHandoff?: boolean;
      qcTemplateId?: string;
      notes?: string;
      idempotencyKey?: string;
    },
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    if (outputData.quantity <= 0) {
      throw new Error('Finished goods output quantity must be strictly greater than zero.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      const targetWhId = outputData.warehouseId || order.warehouse_id;
      const targetBatchNumber = outputData.batchNumber || order.production_batch_number || `BAT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const reqQCHandoff = outputData.createQCHandoff ?? Boolean(order.qc_template_id || outputData.qcTemplateId);

      let qcInspectionId: string | null = null;
      const stockType: 'quarantine' | 'available' = reqQCHandoff ? 'quarantine' : 'available';

      // 1. Lock warehouse balance and update inventory
      const balRes = await client.query(
        `SELECT * FROM inventory_balances
         WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3
         FOR UPDATE`,
        [order.finished_sku_id, targetWhId, orgId]
      );

      if (balRes.rows.length === 0) {
        const balId = `bal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        await client.query(
          `INSERT INTO inventory_balances (
            id, organization_id, sku_id, warehouse_id, available_quantity, reserved_quantity,
            total_quantity, quarantine_quantity, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, NOW(), NOW())`,
          [
            balId,
            orgId,
            order.finished_sku_id,
            targetWhId,
            stockType === 'available' ? outputData.quantity : 0,
            outputData.quantity,
            stockType === 'quarantine' ? outputData.quantity : 0,
          ]
        );
      } else {
        if (stockType === 'quarantine') {
          await client.query(
            `UPDATE inventory_balances
             SET quarantine_quantity = quarantine_quantity + $1,
                 total_quantity = total_quantity + $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [outputData.quantity, balRes.rows[0].id]
          );
        } else {
          await client.query(
            `UPDATE inventory_balances
             SET available_quantity = available_quantity + $1,
                 total_quantity = total_quantity + $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [outputData.quantity, balRes.rows[0].id]
          );
        }
      }

      // 2. Record inventory movement
      const movId = await this.recordStockMovement(client, {
        orgId,
        skuId: order.finished_sku_id,
        warehouseId: targetWhId,
        locationId: outputData.locationId || null,
        batchNumber: targetBatchNumber,
        movementType: 'inward',
        quantity: outputData.quantity,
        unitId: order.expected_yield_unit_id,
        referenceType: 'production_order',
        referenceId: orderId,
        reasonCode: stockType === 'quarantine' ? 'production_output_quarantine' : 'production_output_available',
        actorId: actor.id,
        actorEmail: actor.email,
        notes: `Production output batch ${targetBatchNumber}`,
      });

      // 3. Create QC Inspection if requested
      if (reqQCHandoff) {
        try {
          const qcInspection = await QualityService.createInspection({
            organizationId: orgId,
            sourceType: 'production_batch',
            sourceId: orderId,
            skuId: order.finished_sku_id,
            warehouseId: targetWhId,
            locationId: outputData.locationId || null,
            batchNumber: targetBatchNumber,
            manufacturingDate: outputData.manufacturingDate || null,
            expiryDate: outputData.expiryDate || null,
            receivedQuantity: outputData.quantity,
            sampleQuantity: Math.max(1, Math.min(20, Math.round(outputData.quantity * 0.02))),
            templateId: outputData.qcTemplateId || order.qc_template_id || null,
            inspectionType: 'finished_good',
            actorId: actor.id,
            actorEmail: actor.email,
          });
          qcInspectionId = qcInspection.id;
        } catch (qcErr) {
          console.warn('[Production QC Warning] Could not auto-create QC inspection:', qcErr);
        }
      }

      // 4. Record Output
      const countRes = await client.query(
        `SELECT COUNT(*) FROM production_outputs WHERE organization_id = $1`,
        [orgId]
      );
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const outputNumber = `OUT-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;
      const outputId = `out-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      await client.query(
        `INSERT INTO production_outputs (
          id, organization_id, output_number, production_order_id, sku_id,
          warehouse_id, location_id, batch_number, quantity, unit_id,
          manufacturing_date, expiry_date, inventory_stock_type, inventory_movement_id,
          qc_inspection_id, operator_user_id, operator_email, notes, idempotency_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())`,
        [
          outputId,
          orgId,
          outputNumber,
          orderId,
          order.finished_sku_id,
          targetWhId,
          outputData.locationId || null,
          targetBatchNumber,
          outputData.quantity,
          order.expected_yield_unit_id,
          outputData.manufacturingDate || null,
          outputData.expiryDate || null,
          stockType,
          movId,
          qcInspectionId,
          actor.id,
          actor.email,
          outputData.notes || null,
          outputData.idempotencyKey || null,
        ]
      );

      // 5. Update Order actual_output_quantity
      await client.query(
        `UPDATE production_orders
         SET actual_output_quantity = actual_output_quantity + $1,
             qc_status = CASE WHEN $2 THEN 'pending' ELSE qc_status END,
             qc_inspection_id = COALESCE(qc_inspection_id, $3),
             status = CASE WHEN status = 'draft' OR status = 'approved' OR status = 'reserved' THEN 'in_production' ELSE status END,
             updated_at = NOW()
         WHERE id = $4`,
        [outputData.quantity, reqQCHandoff, qcInspectionId, orderId]
      );

      await this.logAudit(client, orgId, actor, 'record_production_output', orderId, {
        outputNumber,
        batchNumber: targetBatchNumber,
        quantity: outputData.quantity,
        stockType,
        qcInspectionId,
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 8. RECORD PRODUCTION WASTAGE & PROCESS LOSS
  // ==========================================

  public static async recordWastage(
    orgId: string,
    orderId: string,
    wastageData: {
      category: string;
      quantity: number;
      unitId?: string;
      skuId?: string;
      reason: string;
      notes?: string;
    },
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    if (wastageData.quantity <= 0) {
      throw new Error('Wastage quantity must be strictly greater than zero.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      const unitId = wastageData.unitId || order.expected_yield_unit_id;
      const wastageId = `wst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      await client.query(
        `INSERT INTO production_wastages (
          id, organization_id, production_order_id, category, quantity, unit_id,
          sku_id, reason, recorded_by, recorded_by_email, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          wastageId,
          orgId,
          orderId,
          wastageData.category,
          wastageData.quantity,
          unitId,
          wastageData.skuId || order.finished_sku_id,
          wastageData.reason,
          actor.id,
          actor.email,
          wastageData.notes || null,
        ]
      );

      // Increment actual_wastage_quantity
      await client.query(
        `UPDATE production_orders
         SET actual_wastage_quantity = actual_wastage_quantity + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [wastageData.quantity, orderId]
      );

      await this.logAudit(client, orgId, actor, 'record_production_wastage', orderId, {
        category: wastageData.category,
        quantity: wastageData.quantity,
        reason: wastageData.reason,
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 9. COMPLETE PRODUCTION ORDER & RECONCILIATION
  // ==========================================

  public static async completeProductionOrder(
    orgId: string,
    orderId: string,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      if (order.status === 'completed') {
        throw new Error('This production order is already completed.');
      }
      if (order.status === 'cancelled') {
        throw new Error('Cannot complete a cancelled production order.');
      }

      // Auto reconcile components if actual_consumed_quantity is zero but materials were issued
      await client.query(
        `UPDATE production_order_components
         SET actual_consumed_quantity = CASE 
               WHEN actual_consumed_quantity = 0 AND issued_quantity > 0 THEN GREATEST(0, issued_quantity - returned_quantity)
               ELSE actual_consumed_quantity 
             END,
             updated_at = NOW()
         WHERE production_order_id = $1 AND organization_id = $2`,
        [orderId, orgId]
      );

      await client.query(
        `UPDATE production_orders
         SET status = 'completed',
             actual_end_date = COALESCE(actual_end_date, NOW()),
             completed_by = $1,
             completed_by_email = $2,
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [actor.id, actor.email, orderId]
      );

      await this.logAudit(client, orgId, actor, 'complete_production_order', orderId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 10. CANCEL PRODUCTION ORDER & RELEASE HOLDS
  // ==========================================

  public static async cancelProductionOrder(
    orgId: string,
    orderId: string,
    reason: string,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      if (order.status === 'completed') {
        throw new Error('Cannot cancel a completed production order.');
      }

      // Release any active stock reservations
      const compRes = await client.query(
        `SELECT * FROM production_order_components WHERE production_order_id = $1 AND reserved_quantity > 0`,
        [orderId]
      );

      for (const comp of compRes.rows) {
        const reservedQty = parseFloat(comp.reserved_quantity);
        if (reservedQty > 0) {
          // Decrement reserved and restore available in inventory balances
          await client.query(
            `UPDATE inventory_balances
             SET reserved_quantity = GREATEST(0, reserved_quantity - $1),
                 available_quantity = available_quantity + $1,
                 updated_at = NOW()
             WHERE sku_id = $2 AND warehouse_id = $3 AND organization_id = $4`,
            [reservedQty, comp.component_sku_id, order.warehouse_id, orgId]
          );

          await client.query(
            `UPDATE production_order_components
             SET reserved_quantity = 0, updated_at = NOW()
             WHERE id = $1`,
            [comp.id]
          );
        }
      }

      // Cancel stock_reservations records
      await client.query(
        `UPDATE stock_reservations
         SET status = 'cancelled', updated_at = NOW()
         WHERE reference_type = 'production_order' AND reference_id = $1 AND organization_id = $2`,
        [orderId, orgId]
      );

      await client.query(
        `UPDATE production_orders
         SET status = 'cancelled',
             notes = COALESCE(notes || E'\n', '') || 'Cancellation Reason: ' || $1,
             updated_at = NOW()
         WHERE id = $2`,
        [reason, orderId]
      );

      await this.logAudit(client, orgId, actor, 'cancel_production_order', orderId, { reason });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 11. HOLD / RESUME / APPROVE ORDER
  // ==========================================

  public static async setOrderHold(
    orgId: string,
    orderId: string,
    hold: boolean,
    reason: string,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, orgId]
      );
      if (orderRes.rows.length === 0) throw new Error('Production order not found.');
      const order = orderRes.rows[0];

      const newStatus = hold ? 'on_hold' : (parseFloat(order.actual_output_quantity) > 0 || order.material_status === 'partially_issued' || order.material_status === 'fully_issued' ? 'in_production' : 'approved');

      await client.query(
        `UPDATE production_orders
         SET status = $1,
             notes = COALESCE(notes || E'\n', '') || (CASE WHEN $2 THEN 'Hold: ' ELSE 'Resume: ' END || $3),
             updated_at = NOW()
         WHERE id = $4`,
        [newStatus, hold, reason, orderId]
      );

      await this.logAudit(client, orgId, actor, hold ? 'hold_production_order' : 'resume_production_order', orderId, { reason, newStatus });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async approveOrder(
    orgId: string,
    orderId: string,
    actor: { id: string | null; email: string }
  ): Promise<ProductionOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `UPDATE production_orders
         SET status = 'approved',
             approved_by = $1,
             approved_by_email = $2,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $3 AND organization_id = $4`,
        [actor.id, actor.email, orderId, orgId]
      );

      await this.logAudit(client, orgId, actor, 'approve_production_order', orderId, { status: 'approved' });

      await client.query('COMMIT;');
      return (await this.getProductionOrderById(orgId, orderId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 12. PRODUCTION TELEMETRY & SUMMARY METRICS
  // ==========================================

  public static async getProductionMetrics(orgId: string): Promise<ProductionSummaryMetrics> {
    const res = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status IN ('draft', 'pending_approval', 'approved', 'reserved', 'in_production') THEN 1 END) as open_orders,
        COUNT(CASE WHEN status = 'in_production' THEN 1 END) as in_production,
        COUNT(CASE WHEN status = 'reserved' THEN 1 END) as allocated_orders,
        COUNT(CASE WHEN status = 'completed' AND DATE(completed_at) = CURRENT_DATE THEN 1 END) as completed_today,
        COUNT(CASE WHEN status IN ('draft', 'pending_approval') THEN 1 END) as pending_approval,
        COUNT(CASE WHEN material_status IN ('partial_shortage', 'critical_shortage') THEN 1 END) as material_shortages,
        COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as orders_on_hold,
        COALESCE(SUM(planned_quantity), 0)::float as total_planned_volume,
        COALESCE(SUM(actual_output_quantity), 0)::float as total_actual_volume,
        COALESCE(SUM(actual_wastage_quantity), 0)::float as total_wastage_quantity,
        COALESCE(AVG(CASE WHEN expected_yield > 0 AND actual_output_quantity > 0 THEN ((actual_output_quantity - expected_yield) / expected_yield) * 100 END), 0)::float as avg_yield_variance_percentage,
        COALESCE(AVG(CASE WHEN expected_wastage_quantity > 0 AND actual_wastage_quantity > 0 THEN ((actual_wastage_quantity - expected_wastage_quantity) / expected_wastage_quantity) * 100 END), 0)::float as avg_wastage_variance_percentage
       FROM production_orders
       WHERE organization_id = $1`,
      [orgId]
    );

    const row = res.rows[0] || {};
    const planned = parseFloat(row.total_planned_volume) || 0;
    const actual = parseFloat(row.total_actual_volume) || 0;
    const avgYield = planned > 0 ? Math.round((actual / planned) * 1000) / 10 : 0;

    return {
      open_orders: parseInt(row.open_orders, 10) || 0,
      in_production: parseInt(row.in_production, 10) || 0,
      in_production_orders: parseInt(row.in_production, 10) || 0,
      total_orders: parseInt(row.total_orders, 10) || 0,
      allocated_orders: parseInt(row.allocated_orders, 10) || 0,
      completed_today: parseInt(row.completed_today, 10) || 0,
      pending_approval: parseInt(row.pending_approval, 10) || 0,
      material_shortages: parseInt(row.material_shortages, 10) || 0,
      orders_on_hold: parseInt(row.orders_on_hold, 10) || 0,
      total_planned_volume_month: Math.round(planned * 100) / 100,
      total_actual_volume_month: Math.round(actual * 100) / 100,
      total_planned_volume: Math.round(planned * 100) / 100,
      total_actual_volume: Math.round(actual * 100) / 100,
      total_wastage_quantity: Math.round((parseFloat(row.total_wastage_quantity) || 0) * 100) / 100,
      average_yield_pct: avgYield,
      avg_yield_variance_percentage: Math.round((parseFloat(row.avg_yield_variance_percentage) || 0) * 100) / 100,
      avg_wastage_variance_percentage: Math.round((parseFloat(row.avg_wastage_variance_percentage) || 0) * 100) / 100,
    };
  }
}
