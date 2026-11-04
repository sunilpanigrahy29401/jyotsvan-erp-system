import { PoolClient } from 'pg';
import { pool } from './db.ts';
import type {
  Batch,
  BatchGenealogyRecord,
  BatchStatusLog,
  BatchHold,
  BatchNumberingRule,
  TraceabilityNode,
  TraceabilitySearchResult,
  BatchSummaryMetrics,
  BatchStatus,
  BatchType,
  BatchHoldType,
  BatchHoldSeverity,
} from '../types/batches.ts';

// Helper to record enterprise audit logs
async function recordAudit(
  client: PoolClient | null,
  organizationId: string,
  actorId: string | null,
  actorEmail: string,
  action: string,
  targetResource: string,
  targetId: string,
  details: any
) {
  try {
    const auditId = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const db = client || pool;
    await db.query(
      `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [auditId, organizationId, actorId, actorEmail || 'system@jyotsvan.enterprise', action, targetResource, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Audit Log Error]', err);
  }
}

export class BatchService {
  // ==========================================
  // 1. BATCH REGISTRY & LISTING
  // ==========================================

  static async getBatches(params: {
    orgId: string;
    search?: string;
    status?: string;
    batchType?: string;
    qcStatus?: string;
    skuId?: string;
    warehouseId?: string;
    supplierId?: string;
    expiryFilter?: 'all' | 'expired' | 'near_30' | 'near_60' | 'near_90' | 'fresh';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ batches: Batch[]; total: number; page: number; limit: number; totalPages: number }> {
    const {
      orgId,
      search,
      status,
      batchType,
      qcStatus,
      skuId,
      warehouseId,
      supplierId,
      expiryFilter = 'all',
      page = 1,
      limit = 25,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params;

    let query = `
      SELECT 
        b.id, b.organization_id, b.batch_number, b.sku_id, b.batch_type, b.status,
        b.manufacturing_date, b.expiry_date, b.retest_date, b.best_before_date,
        b.initial_quantity::float as initial_quantity,
        b.current_quantity::float as current_quantity,
        b.reserved_quantity::float as reserved_quantity,
        b.quarantine_quantity::float as quarantine_quantity,
        b.damaged_quantity::float as damaged_quantity,
        b.unit_id, b.warehouse_id, b.location_id,
        b.source_type, b.source_reference_id, b.source_reference_number,
        b.supplier_id, b.supplier_batch_number,
        b.qc_inspection_id, b.qc_status, b.coa_document_url,
        b.storage_conditions, b.potency_or_purity::float as potency_or_purity,
        b.cost_per_unit::float as cost_per_unit, b.notes, b.metadata,
        b.created_by, b.created_by_email, b.created_at, b.updated_at,
        s.sku as sku_code, s.variant_name,
        p.name as product_name, p.product_code,
        c.name as category_name,
        u.name as unit_name, u.short_code as unit_short_code,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name, loc.code as location_code,
        sup.supplier_name, sup.supplier_code,
        qi.inspection_number as qc_inspection_number, qi.overall_result as qc_overall_result,
        (SELECT COUNT(*)::int FROM batch_holds bh WHERE bh.batch_id = b.id AND bh.status = 'active') as active_holds_count
      FROM batches b
      JOIN skus s ON b.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON b.unit_id = u.id
      LEFT JOIN warehouses w ON b.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON b.location_id = loc.id
      LEFT JOIN suppliers sup ON b.supplier_id = sup.id
      LEFT JOIN qc_inspections qi ON b.qc_inspection_id = qi.id
      WHERE b.organization_id = $1
    `;

    const values: any[] = [orgId];
    let idx = 2;

    if (search && search.trim()) {
      query += ` AND (
        b.batch_number ILIKE $${idx} OR
        s.sku ILIKE $${idx} OR
        p.name ILIKE $${idx} OR
        b.supplier_batch_number ILIKE $${idx} OR
        b.source_reference_number ILIKE $${idx} OR
        sup.supplier_name ILIKE $${idx}
      )`;
      values.push(`%${search.trim()}%`);
      idx++;
    }

    if (status && status !== 'all') {
      query += ` AND b.status = $${idx}`;
      values.push(status);
      idx++;
    }

    if (batchType && batchType !== 'all') {
      query += ` AND b.batch_type = $${idx}`;
      values.push(batchType);
      idx++;
    }

    if (qcStatus && qcStatus !== 'all') {
      query += ` AND b.qc_status = $${idx}`;
      values.push(qcStatus);
      idx++;
    }

    if (skuId) {
      query += ` AND b.sku_id = $${idx}`;
      values.push(skuId);
      idx++;
    }

    if (warehouseId) {
      query += ` AND b.warehouse_id = $${idx}`;
      values.push(warehouseId);
      idx++;
    }

    if (supplierId) {
      query += ` AND b.supplier_id = $${idx}`;
      values.push(supplierId);
      idx++;
    }

    // Expiry Filters
    if (expiryFilter === 'expired') {
      query += ` AND b.expiry_date IS NOT NULL AND b.expiry_date < NOW()`;
    } else if (expiryFilter === 'near_30') {
      query += ` AND b.expiry_date IS NOT NULL AND b.expiry_date >= NOW() AND b.expiry_date <= NOW() + INTERVAL '30 days'`;
    } else if (expiryFilter === 'near_60') {
      query += ` AND b.expiry_date IS NOT NULL AND b.expiry_date >= NOW() AND b.expiry_date <= NOW() + INTERVAL '60 days'`;
    } else if (expiryFilter === 'near_90') {
      query += ` AND b.expiry_date IS NOT NULL AND b.expiry_date >= NOW() AND b.expiry_date <= NOW() + INTERVAL '90 days'`;
    } else if (expiryFilter === 'fresh') {
      query += ` AND (b.expiry_date IS NULL OR b.expiry_date > NOW() + INTERVAL '90 days')`;
    }

    // Count query
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as cnt_tbl`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);
    const totalPages = Math.ceil(total / limit) || 1;

    // Sorting
    const safeSortCols: Record<string, string> = {
      created_at: 'b.created_at',
      batch_number: 'b.batch_number',
      expiry_date: 'b.expiry_date',
      current_quantity: 'b.current_quantity',
      status: 'b.status',
      sku_code: 's.sku',
      product_name: 'p.name',
    };
    const sortCol = safeSortCols[sortBy] || 'b.created_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortCol} ${direction} LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const dataRes = await pool.query(query, values);

    // Compute shelf life tags
    const now = new Date();
    const batches: Batch[] = dataRes.rows.map((row) => {
      let daysToExpiry: number | null = null;
      let shelfLifeStatus: 'fresh' | 'near_expiry' | 'critical' | 'expired' = 'fresh';

      if (row.expiry_date) {
        const exp = new Date(row.expiry_date);
        const diffMs = exp.getTime() - now.getTime();
        daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysToExpiry < 0) {
          shelfLifeStatus = 'expired';
        } else if (daysToExpiry <= 30) {
          shelfLifeStatus = 'critical';
        } else if (daysToExpiry <= 90) {
          shelfLifeStatus = 'near_expiry';
        } else {
          shelfLifeStatus = 'fresh';
        }
      }

      return {
        ...row,
        days_to_expiry: daysToExpiry,
        shelf_life_status: shelfLifeStatus,
      };
    });

    return {
      batches,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // ==========================================
  // 2. GET SINGLE BATCH WITH 360-DEGREE DETAILS
  // ==========================================

  static async getBatchById(id: string, orgId: string): Promise<Batch | null> {
    const res = await pool.query(
      `SELECT 
        b.id, b.organization_id, b.batch_number, b.sku_id, b.batch_type, b.status,
        b.manufacturing_date, b.expiry_date, b.retest_date, b.best_before_date,
        b.initial_quantity::float as initial_quantity,
        b.current_quantity::float as current_quantity,
        b.reserved_quantity::float as reserved_quantity,
        b.quarantine_quantity::float as quarantine_quantity,
        b.damaged_quantity::float as damaged_quantity,
        b.unit_id, b.warehouse_id, b.location_id,
        b.source_type, b.source_reference_id, b.source_reference_number,
        b.supplier_id, b.supplier_batch_number,
        b.qc_inspection_id, b.qc_status, b.coa_document_url,
        b.storage_conditions, b.potency_or_purity::float as potency_or_purity,
        b.cost_per_unit::float as cost_per_unit, b.notes, b.metadata,
        b.created_by, b.created_by_email, b.created_at, b.updated_at,
        s.sku as sku_code, s.variant_name,
        p.name as product_name, p.product_code,
        c.name as category_name,
        u.name as unit_name, u.short_code as unit_short_code,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name, loc.code as location_code,
        sup.supplier_name, sup.supplier_code,
        qi.inspection_number as qc_inspection_number, qi.overall_result as qc_overall_result,
        (SELECT COUNT(*)::int FROM batch_holds bh WHERE bh.batch_id = b.id AND bh.status = 'active') as active_holds_count
       FROM batches b
       JOIN skus s ON b.sku_id = s.id
       JOIN products p ON s.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN units u ON b.unit_id = u.id
       LEFT JOIN warehouses w ON b.warehouse_id = w.id
       LEFT JOIN warehouse_locations loc ON b.location_id = loc.id
       LEFT JOIN suppliers sup ON b.supplier_id = sup.id
       LEFT JOIN qc_inspections qi ON b.qc_inspection_id = qi.id
       WHERE (b.id = $1 OR b.batch_number = $1) AND b.organization_id = $2`,
      [id, orgId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const now = new Date();
    let daysToExpiry: number | null = null;
    let shelfLifeStatus: 'fresh' | 'near_expiry' | 'critical' | 'expired' = 'fresh';

    if (row.expiry_date) {
      const exp = new Date(row.expiry_date);
      const diffMs = exp.getTime() - now.getTime();
      daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysToExpiry < 0) shelfLifeStatus = 'expired';
      else if (daysToExpiry <= 30) shelfLifeStatus = 'critical';
      else if (daysToExpiry <= 90) shelfLifeStatus = 'near_expiry';
    }

    return {
      ...row,
      days_to_expiry: daysToExpiry,
      shelf_life_status: shelfLifeStatus,
    };
  }

  // ==========================================
  // 3. CREATE / REGISTER BATCH
  // ==========================================

  static async createBatch(input: {
    orgId: string;
    skuId: string;
    batchNumber?: string;
    batchType?: BatchType;
    status?: BatchStatus;
    manufacturingDate?: string | null;
    expiryDate?: string | null;
    retestDate?: string | null;
    bestBeforeDate?: string | null;
    initialQuantity: number;
    currentQuantity?: number;
    unitId?: string | null;
    warehouseId?: string | null;
    locationId?: string | null;
    sourceType?: 'grn' | 'production_order' | 'opening_stock' | 'stock_adjustment' | 'transfer' | 'manual';
    sourceReferenceId?: string | null;
    sourceReferenceNumber?: string | null;
    supplierId?: string | null;
    supplierBatchNumber?: string | null;
    qcInspectionId?: string | null;
    qcStatus?: 'pending' | 'passed' | 'failed' | 'conditional' | 'quarantine' | 'exempt';
    coaDocumentUrl?: string | null;
    storageConditions?: string | null;
    potencyOrPurity?: number | null;
    costPerUnit?: number | null;
    notes?: string | null;
    metadata?: Record<string, any> | null;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<Batch> {
    const {
      orgId,
      skuId,
      batchType = 'raw_material',
      status = 'quarantine',
      manufacturingDate = null,
      expiryDate = null,
      retestDate = null,
      bestBeforeDate = null,
      initialQuantity,
      currentQuantity = initialQuantity,
      unitId = null,
      warehouseId = null,
      locationId = null,
      sourceType = 'manual',
      sourceReferenceId = null,
      sourceReferenceNumber = null,
      supplierId = null,
      supplierBatchNumber = null,
      qcInspectionId = null,
      qcStatus = 'pending',
      coaDocumentUrl = null,
      storageConditions = null,
      potencyOrPurity = null,
      costPerUnit = null,
      notes = null,
      metadata = null,
      actorId = null,
      actorEmail,
    } = input;

    if (initialQuantity < 0) {
      throw new Error('Initial batch quantity cannot be negative.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Resolve SKU & Unit
      const skuRes = await client.query(
        `SELECT s.id, s.sku, s.unit_id, p.name as product_name, p.category_id 
         FROM skus s 
         JOIN products p ON s.product_id = p.id 
         WHERE s.id = $1 AND s.organization_id = $2`,
        [skuId, orgId]
      );
      if (skuRes.rows.length === 0) {
        throw new Error(`SKU with ID "${skuId}" not found in organization.`);
      }
      const sku = skuRes.rows[0];
      const resolvedUnitId = unitId || sku.unit_id;

      // 2. Generate or Validate Batch Number
      let finalBatchNumber = input.batchNumber?.trim();
      if (!finalBatchNumber) {
        finalBatchNumber = await this.generateBatchNumber(client, orgId, batchType, sku.category_id);
      }

      // Check unique constraint
      const dupCheck = await client.query(
        `SELECT id FROM batches WHERE organization_id = $1 AND sku_id = $2 AND batch_number = $3`,
        [orgId, skuId, finalBatchNumber]
      );
      if (dupCheck.rows.length > 0) {
        throw new Error(`Batch number "${finalBatchNumber}" already exists for SKU "${sku.sku}".`);
      }

      const batchId = 'bat-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

      // Determine initial stock bucket quantities
      const quarQty = status === 'quarantine' || status === 'hold' ? currentQuantity : 0;
      const curQty = currentQuantity;

      await client.query(
        `INSERT INTO batches (
          id, organization_id, batch_number, sku_id, batch_type, status,
          manufacturing_date, expiry_date, retest_date, best_before_date,
          initial_quantity, current_quantity, reserved_quantity, quarantine_quantity, damaged_quantity,
          unit_id, warehouse_id, location_id,
          source_type, source_reference_id, source_reference_number,
          supplier_id, supplier_batch_number,
          qc_inspection_id, qc_status, coa_document_url,
          storage_conditions, potency_or_purity, cost_per_unit, notes, metadata,
          created_by, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, 0, $13, 0,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21,
          $22, $23, $24,
          $25, $26, $27, $28, $29,
          $30, $31, NOW(), NOW()
        )`,
        [
          batchId,
          orgId,
          finalBatchNumber,
          skuId,
          batchType,
          status,
          manufacturingDate || null,
          expiryDate || null,
          retestDate || null,
          bestBeforeDate || null,
          initialQuantity,
          curQty,
          quarQty,
          resolvedUnitId,
          warehouseId,
          locationId,
          sourceType,
          sourceReferenceId,
          sourceReferenceNumber,
          supplierId,
          supplierBatchNumber,
          qcInspectionId,
          qcStatus,
          coaDocumentUrl,
          storageConditions,
          potencyOrPurity,
          costPerUnit,
          notes,
          metadata ? JSON.stringify(metadata) : null,
          actorId,
          actorEmail,
        ]
      );

      // Record initial status transition log
      await client.query(
        `INSERT INTO batch_status_logs (
          id, organization_id, batch_id, from_status, to_status, reason, justification, authorized_by, authorized_by_email, reference_type, reference_id, created_at
        ) VALUES ($1, $2, $3, 'created', $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          orgId,
          batchId,
          status,
          'Initial Registration',
          `Batch created via ${sourceType} with initial volume of ${initialQuantity}`,
          actorId,
          actorEmail,
          sourceType,
          sourceReferenceNumber || sourceReferenceId,
        ]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'batch.create', 'batches', batchId, {
        batch_number: finalBatchNumber,
        sku: sku.sku,
        quantity: initialQuantity,
        status,
        batch_type: batchType,
      });

      await client.query('COMMIT;');

      const created = await this.getBatchById(batchId, orgId);
      return created!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 4. UPDATE BATCH ATTRIBUTES
  // ==========================================

  static async updateBatch(input: {
    batchId: string;
    orgId: string;
    storageConditions?: string | null;
    retestDate?: string | null;
    expiryDate?: string | null;
    bestBeforeDate?: string | null;
    coaDocumentUrl?: string | null;
    potencyOrPurity?: number | null;
    costPerUnit?: number | null;
    notes?: string | null;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<Batch> {
    const { batchId, orgId, storageConditions, retestDate, expiryDate, bestBeforeDate, coaDocumentUrl, potencyOrPurity, costPerUnit, notes, actorId = null, actorEmail } = input;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM batches WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [batchId, orgId]);
      if (check.rows.length === 0) throw new Error('Batch record not found.');

      await client.query(
        `UPDATE batches 
         SET storage_conditions = COALESCE($1, storage_conditions),
             retest_date = COALESCE($2, retest_date),
             expiry_date = COALESCE($3, expiry_date),
             best_before_date = COALESCE($4, best_before_date),
             coa_document_url = COALESCE($5, coa_document_url),
             potency_or_purity = COALESCE($6, potency_or_purity),
             cost_per_unit = COALESCE($7, cost_per_unit),
             notes = COALESCE($8, notes),
             updated_at = NOW()
         WHERE id = $9 AND organization_id = $10`,
        [storageConditions, retestDate, expiryDate, bestBeforeDate, coaDocumentUrl, potencyOrPurity, costPerUnit, notes, batchId, orgId]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'batch.update', 'batches', batchId, {
        updated_fields: { storageConditions, retestDate, expiryDate, coaDocumentUrl, potencyOrPurity },
      });

      await client.query('COMMIT;');
      return (await this.getBatchById(batchId, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 5. BATCH STATUS TRANSITION ENGINE
  // ==========================================

  static async transitionBatchStatus(input: {
    batchId: string;
    orgId: string;
    targetStatus: BatchStatus;
    reason: string;
    justification?: string | null;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<Batch> {
    const { batchId, orgId, targetStatus, reason, justification = null, actorId = null, actorEmail } = input;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM batches WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [batchId, orgId]);
      if (check.rows.length === 0) throw new Error('Batch record not found.');
      const batch = check.rows[0];
      const prevStatus = batch.status;

      if (prevStatus === targetStatus) {
        await client.query('COMMIT;');
        return (await this.getBatchById(batchId, orgId))!;
      }

      // Update Batch Status
      await client.query(
        `UPDATE batches 
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [targetStatus, batchId, orgId]
      );

      // Record Transition Log
      const logId = 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      await client.query(
        `INSERT INTO batch_status_logs (
          id, organization_id, batch_id, from_status, to_status, reason, justification, authorized_by, authorized_by_email, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [logId, orgId, batchId, prevStatus, targetStatus, reason, justification, actorId, actorEmail]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'batch.status_transition', 'batches', batchId, {
        batch_number: batch.batch_number,
        from_status: prevStatus,
        to_status: targetStatus,
        reason,
      });

      await client.query('COMMIT;');
      return (await this.getBatchById(batchId, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 6. BATCH NUMBER GENERATOR
  // ==========================================

  static async generateBatchNumber(
    client: PoolClient | null,
    orgId: string,
    batchType: BatchType,
    categoryId?: string | null
  ): Promise<string> {
    const db = client || pool;

    // Find rule for this batch type or global
    const ruleRes = await db.query(
      `SELECT * FROM batch_numbering_rules 
       WHERE organization_id = $1 AND is_active = TRUE AND (rule_type = $2 OR rule_type = 'global')
       ORDER BY CASE WHEN rule_type = $2 THEN 0 ELSE 1 END, created_at ASC 
       LIMIT 1`,
      [orgId, batchType]
    );

    const rule = ruleRes.rows[0] || {
      prefix: batchType === 'raw_material' ? 'RM' : batchType === 'finished_good' ? 'BAT' : 'LOT',
      include_year: true,
      year_format: 'YYYY',
      include_month: true,
      separator: '-',
      sequence_length: 5,
      current_sequence: 0,
    };

    const now = new Date();
    const parts: string[] = [rule.prefix || 'BAT'];

    if (rule.include_year) {
      const yr = rule.year_format === 'YY' ? now.getFullYear().toString().slice(-2) : now.getFullYear().toString();
      let datePart = yr;
      if (rule.include_month) {
        datePart += (now.getMonth() + 1).toString().padStart(2, '0');
      }
      if (rule.include_day) {
        datePart += now.getDate().toString().padStart(2, '0');
      }
      parts.push(datePart);
    }

    // Increment sequence
    let seq = 1;
    if (rule.id) {
      const updatedRule = await db.query(
        `UPDATE batch_numbering_rules 
         SET current_sequence = current_sequence + 1, updated_at = NOW() 
         WHERE id = $1 
         RETURNING current_sequence`,
        [rule.id]
      );
      seq = updatedRule.rows[0]?.current_sequence || 1;
    } else {
      const countRes = await db.query(`SELECT COUNT(*) FROM batches WHERE organization_id = $1`, [orgId]);
      seq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
    }

    const seqLength = rule.sequence_length || 5;
    parts.push(seq.toString().padStart(seqLength, '0'));

    if (rule.suffix) {
      parts.push(rule.suffix);
    }

    const sep = rule.separator ?? '-';
    return parts.join(sep);
  }

  // ==========================================
  // 7. BACKWARD & FORWARD TRACEABILITY ENGINE
  // ==========================================

  /**
   * Backward Traceability: Finished Goods -> Intermediates -> Raw Materials -> Suppliers / GRN
   */
  static async getBackwardTraceability(batchId: string, orgId: string): Promise<TraceabilityNode[]> {
    const visited = new Set<string>();

    async function traceNode(id: string, depth = 0): Promise<TraceabilityNode | null> {
      if (visited.has(id) || depth > 8) return null;
      visited.add(id);

      const batch = await BatchService.getBatchById(id, orgId);
      if (!batch) return null;

      // Find parent genealogy links
      const parentsRes = await pool.query(
        `SELECT bg.*, b.batch_number as p_num, s.sku as p_sku, p.name as p_prod, u.short_code as u_code
         FROM batch_genealogy bg
         JOIN batches b ON bg.parent_batch_id = b.id
         JOIN skus s ON b.sku_id = s.id
         JOIN products p ON s.product_id = p.id
         LEFT JOIN units u ON bg.unit_id = u.id
         WHERE bg.child_batch_id = $1 AND bg.organization_id = $2`,
        [batch.id, orgId]
      );

      const parentNodes: TraceabilityNode[] = [];
      for (const pRow of parentsRes.rows) {
        const pNode = await traceNode(pRow.parent_batch_id, depth + 1);
        if (pNode) {
          parentNodes.push({
            ...pNode,
            quantity: pRow.quantity_consumed,
            production: pRow.production_order_number ? {
              order_id: pRow.production_order_id || '',
              order_number: pRow.production_order_number,
            } : null,
          });
        }
      }

      return {
        id: batch.id,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        batch_type: batch.batch_type,
        status: batch.status,
        sku_id: batch.sku_id,
        sku_code: batch.sku_code || '',
        product_name: batch.product_name || '',
        quantity: batch.current_quantity,
        unit_code: batch.unit_short_code || '',
        manufacturing_date: batch.manufacturing_date,
        expiry_date: batch.expiry_date,
        supplier: batch.supplier_name ? {
          id: batch.supplier_id || '',
          name: batch.supplier_name,
          code: batch.supplier_code || '',
          grn_number: batch.source_reference_number || undefined,
        } : null,
        qc: batch.qc_inspection_number ? {
          inspection_id: batch.qc_inspection_id || '',
          inspection_number: batch.qc_inspection_number,
          overall_result: batch.qc_status,
          coa_url: batch.coa_document_url || undefined,
        } : null,
        inventory: {
          warehouse_name: batch.warehouse_name || 'Main Warehouse',
          location_name: batch.location_name || undefined,
          available_qty: batch.current_quantity - batch.reserved_quantity - batch.quarantine_quantity,
          quarantine_qty: batch.quarantine_quantity,
        },
        depth,
        direction: 'parent',
        parents: parentNodes,
      };
    }

    const root = await traceNode(batchId, 0);
    return root ? [root] : [];
  }

  /**
   * Forward Traceability: Raw Material -> Intermediates -> Finished Goods -> Dispatches
   */
  static async getForwardTraceability(batchId: string, orgId: string): Promise<TraceabilityNode[]> {
    const visited = new Set<string>();

    async function traceNode(id: string, depth = 0): Promise<TraceabilityNode | null> {
      if (visited.has(id) || depth > 8) return null;
      visited.add(id);

      const batch = await BatchService.getBatchById(id, orgId);
      if (!batch) return null;

      // Find child genealogy links
      const childrenRes = await pool.query(
        `SELECT bg.*, b.batch_number as c_num, s.sku as c_sku, p.name as c_prod, u.short_code as u_code
         FROM batch_genealogy bg
         JOIN batches b ON bg.child_batch_id = b.id
         JOIN skus s ON b.sku_id = s.id
         JOIN products p ON s.product_id = p.id
         LEFT JOIN units u ON bg.unit_id = u.id
         WHERE bg.parent_batch_id = $1 AND bg.organization_id = $2`,
        [batch.id, orgId]
      );

      const childNodes: TraceabilityNode[] = [];
      for (const cRow of childrenRes.rows) {
        const cNode = await traceNode(cRow.child_batch_id, depth + 1);
        if (cNode) {
          childNodes.push({
            ...cNode,
            quantity: cRow.quantity_consumed,
            production: cRow.production_order_number ? {
              order_id: cRow.production_order_id || '',
              order_number: cRow.production_order_number,
            } : null,
          });
        }
      }

      return {
        id: batch.id,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        batch_type: batch.batch_type,
        status: batch.status,
        sku_id: batch.sku_id,
        sku_code: batch.sku_code || '',
        product_name: batch.product_name || '',
        quantity: batch.current_quantity,
        unit_code: batch.unit_short_code || '',
        manufacturing_date: batch.manufacturing_date,
        expiry_date: batch.expiry_date,
        supplier: batch.supplier_name ? {
          id: batch.supplier_id || '',
          name: batch.supplier_name,
          code: batch.supplier_code || '',
          grn_number: batch.source_reference_number || undefined,
        } : null,
        qc: batch.qc_inspection_number ? {
          inspection_id: batch.qc_inspection_id || '',
          inspection_number: batch.qc_inspection_number,
          overall_result: batch.qc_status,
          coa_url: batch.coa_document_url || undefined,
        } : null,
        inventory: {
          warehouse_name: batch.warehouse_name || 'Main Warehouse',
          location_name: batch.location_name || undefined,
          available_qty: batch.current_quantity - batch.reserved_quantity - batch.quarantine_quantity,
          quarantine_qty: batch.quarantine_quantity,
        },
        depth,
        direction: 'child',
        children: childNodes,
      };
    }

    const root = await traceNode(batchId, 0);
    return root ? [root] : [];
  }

  /**
   * Comprehensive Traceability Investigation (Backward + Forward Blast Radius Report)
   */
  static async getTraceabilityReport(batchIdentifier: string, orgId: string): Promise<TraceabilitySearchResult> {
    const rootBatch = await this.getBatchById(batchIdentifier, orgId);
    if (!rootBatch) {
      throw new Error(`Batch "${batchIdentifier}" not found in organization.`);
    }

    const backward = await this.getBackwardTraceability(rootBatch.id, orgId);
    const forward = await this.getForwardTraceability(rootBatch.id, orgId);

    // Compute Blast Radius Impact Metrics
    const allBatchIds = new Set<string>([rootBatch.id]);
    const suppliers = new Set<string>();
    const warehouses = new Set<string>();
    const prodOrders = new Set<string>();

    if (rootBatch.supplier_id) suppliers.add(rootBatch.supplier_id);
    if (rootBatch.warehouse_id) warehouses.add(rootBatch.warehouse_id);

    function traverse(nodes: TraceabilityNode[]) {
      for (const n of nodes) {
        allBatchIds.add(n.batch_id);
        if (n.supplier?.id) suppliers.add(n.supplier.id);
        if (n.inventory?.warehouse_name) warehouses.add(n.inventory.warehouse_name);
        if (n.production?.order_number) prodOrders.add(n.production.order_number);
        if (n.parents) traverse(n.parents);
        if (n.children) traverse(n.children);
      }
    }

    traverse(backward);
    traverse(forward);

    // Fetch batch details of all touched nodes to compute quantities
    const touchedRes = await pool.query(
      `SELECT batch_type, current_quantity::float as cur_qty, quarantine_quantity::float as quar_qty, status
       FROM batches 
       WHERE id = ANY($1::varchar[]) AND organization_id = $2`,
      [Array.from(allBatchIds), orgId]
    );

    let rawCount = 0;
    let fgCount = 0;
    let totalQuar = 0;
    let totalRel = 0;
    let holdsFound = 0;

    for (const row of touchedRes.rows) {
      if (row.batch_type === 'raw_material') rawCount++;
      if (row.batch_type === 'finished_good') fgCount++;
      totalQuar += row.quar_qty || 0;
      if (row.status === 'released') totalRel += row.cur_qty || 0;
      if (row.status === 'hold' || row.status === 'recalled') holdsFound++;
    }

    return {
      root_batch: rootBatch,
      direction: 'bidirectional',
      backward_tree: backward,
      forward_tree: forward,
      summary: {
        total_raw_batches: rawCount,
        total_production_orders: prodOrders.size,
        total_finished_batches: fgCount,
        total_suppliers_involved: suppliers.size,
        total_warehouses_affected: warehouses.size,
        total_quarantined_qty: totalQuar,
        total_released_qty: totalRel,
        active_holds_found: holdsFound,
      },
    };
  }

  // ==========================================
  // 8. BATCH HOLDS & RECALLS MANAGEMENT
  // ==========================================

  static async getBatchHolds(params: {
    orgId: string;
    batchId?: string;
    status?: string;
    severity?: string;
  }): Promise<BatchHold[]> {
    const { orgId, batchId, status, severity } = params;
    let query = `
      SELECT 
        bh.id, bh.organization_id, bh.hold_number, bh.batch_id, bh.hold_type, bh.severity,
        bh.status, bh.reason, bh.affected_quantity::float as affected_quantity,
        bh.impact_scope, bh.placed_by, bh.placed_by_email,
        bh.released_by, bh.released_by_email, bh.released_at,
        bh.release_justification, bh.resolution_notes,
        bh.created_at, bh.updated_at,
        b.batch_number, s.sku as sku_code, p.name as product_name,
        w.name as warehouse_name, u.short_code as unit_code
      FROM batch_holds bh
      JOIN batches b ON bh.batch_id = b.id
      JOIN skus s ON b.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN units u ON b.unit_id = u.id
      LEFT JOIN warehouses w ON b.warehouse_id = w.id
      WHERE bh.organization_id = $1
    `;

    const values: any[] = [orgId];
    let idx = 2;

    if (batchId) {
      query += ` AND bh.batch_id = $${idx}`;
      values.push(batchId);
      idx++;
    }

    if (status && status !== 'all') {
      query += ` AND bh.status = $${idx}`;
      values.push(status);
      idx++;
    }

    if (severity && severity !== 'all') {
      query += ` AND bh.severity = $${idx}`;
      values.push(severity);
      idx++;
    }

    query += ` ORDER BY bh.created_at DESC`;
    const res = await pool.query(query, values);
    return res.rows;
  }

  static async placeBatchHold(input: {
    orgId: string;
    batchId: string;
    holdType: BatchHoldType;
    severity: BatchHoldSeverity;
    reason: string;
    impactScope?: 'single_batch' | 'genealogy_tree' | 'entire_sku_lot';
    actorId?: string | null;
    actorEmail: string;
  }): Promise<BatchHold> {
    const { orgId, batchId, holdType, severity, reason, impactScope = 'single_batch', actorId = null, actorEmail } = input;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const batchRes = await client.query(`SELECT * FROM batches WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [batchId, orgId]);
      if (batchRes.rows.length === 0) throw new Error('Batch not found.');
      const batch = batchRes.rows[0];

      // Sequential hold number: HOLD-YYYY-XXXX
      const year = new Date().getFullYear();
      const countRes = await client.query(`SELECT COUNT(*) FROM batch_holds WHERE organization_id = $1`, [orgId]);
      const seq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
      const holdNumber = `HOLD-${year}-${seq.toString().padStart(4, '0')}`;
      const holdId = 'hold-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

      await client.query(
        `INSERT INTO batch_holds (
          id, organization_id, hold_number, batch_id, hold_type, severity, status,
          reason, affected_quantity, impact_scope, placed_by, placed_by_email, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, NOW(), NOW())`,
        [holdId, orgId, holdNumber, batchId, holdType, severity, reason, batch.current_quantity, impactScope, actorId, actorEmail]
      );

      // Transition batch to hold or recalled
      const targetBatchStatus: BatchStatus = holdType === 'recall' ? 'recalled' : 'hold';
      await client.query(
        `UPDATE batches 
         SET status = $1,
             quarantine_quantity = current_quantity,
             updated_at = NOW() 
         WHERE id = $2`,
        [targetBatchStatus, batchId]
      );

      // Record status transition log
      await client.query(
        `INSERT INTO batch_status_logs (
          id, organization_id, batch_id, from_status, to_status, reason, justification, authorized_by, authorized_by_email, reference_type, reference_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'batch_hold', $10, NOW())`,
        [
          'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          orgId,
          batchId,
          batch.status,
          targetBatchStatus,
          `Batch Hold Placed (${holdNumber})`,
          reason,
          actorId,
          actorEmail,
          holdNumber,
        ]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'batch.place_hold', 'batch_holds', holdId, {
        hold_number: holdNumber,
        batch_number: batch.batch_number,
        hold_type: holdType,
        severity,
        reason,
      });

      await client.query('COMMIT;');

      const created = await this.getBatchHolds({ orgId, batchId });
      return created[0]!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async releaseBatchHold(input: {
    orgId: string;
    holdId: string;
    releaseJustification: string;
    resolutionNotes?: string | null;
    targetStatus?: BatchStatus;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<BatchHold> {
    const { orgId, holdId, releaseJustification, resolutionNotes = null, targetStatus = 'released', actorId = null, actorEmail } = input;

    if (!releaseJustification || releaseJustification.trim().length < 5) {
      throw new Error('A formal release justification (min 5 characters) is required to lift a batch hold.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const holdRes = await client.query(`SELECT * FROM batch_holds WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [holdId, orgId]);
      if (holdRes.rows.length === 0) throw new Error('Batch hold record not found.');
      const hold = holdRes.rows[0];

      if (hold.status === 'released') {
        throw new Error('This hold has already been released.');
      }

      await client.query(
        `UPDATE batch_holds 
         SET status = 'released',
             released_by = $1,
             released_by_email = $2,
             released_at = NOW(),
             release_justification = $3,
             resolution_notes = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [actorId, actorEmail, releaseJustification, resolutionNotes, holdId]
      );

      // Check if other active holds exist on the batch
      const otherHolds = await client.query(
        `SELECT COUNT(*) FROM batch_holds WHERE batch_id = $1 AND organization_id = $2 AND status = 'active' AND id != $3`,
        [hold.batch_id, orgId, holdId]
      );

      if (parseInt(otherHolds.rows[0]?.count || '0', 10) === 0) {
        // No other active holds, restore batch status
        await client.query(
          `UPDATE batches 
           SET status = $1,
               quarantine_quantity = CASE WHEN $1 = 'released' THEN 0 ELSE quarantine_quantity END,
               updated_at = NOW() 
           WHERE id = $2`,
          [targetStatus, hold.batch_id]
        );

        // Record log
        await client.query(
          `INSERT INTO batch_status_logs (
            id, organization_id, batch_id, from_status, to_status, reason, justification, authorized_by, authorized_by_email, reference_type, reference_id, created_at
          ) VALUES ($1, $2, $3, 'hold', $4, $5, $6, $7, $8, 'batch_hold_release', $9, NOW())`,
          [
            'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
            orgId,
            hold.batch_id,
            targetStatus,
            `Batch Hold Lifted (${hold.hold_number})`,
            releaseJustification,
            actorId,
            actorEmail,
            hold.hold_number,
          ]
        );
      }

      await recordAudit(client, orgId, actorId, actorEmail, 'batch.release_hold', 'batch_holds', holdId, {
        hold_number: hold.hold_number,
        justification: releaseJustification,
      });

      await client.query('COMMIT;');

      const updated = await this.getBatchHolds({ orgId, batchId: hold.batch_id });
      return updated.find((h) => h.id === holdId)!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 9. BATCH NUMBERING RULES CONFIGURATION
  // ==========================================

  static async getNumberingRules(orgId: string): Promise<BatchNumberingRule[]> {
    const res = await pool.query(
      `SELECT * FROM batch_numbering_rules WHERE organization_id = $1 ORDER BY is_active DESC, created_at ASC`,
      [orgId]
    );
    return res.rows;
  }

  static async saveNumberingRule(input: {
    id?: string;
    orgId: string;
    name: string;
    ruleType: 'global' | 'sku_category' | 'product_line' | 'raw_material' | 'finished_good';
    targetType?: string | null;
    targetId?: string | null;
    prefix: string;
    includeYear: boolean;
    yearFormat: 'YYYY' | 'YY';
    includeMonth: boolean;
    includeDay: boolean;
    sequenceLength: number;
    suffix?: string | null;
    separator: string;
    isActive: boolean;
  }): Promise<BatchNumberingRule> {
    const {
      id,
      orgId,
      name,
      ruleType,
      targetType = null,
      targetId = null,
      prefix,
      includeYear,
      yearFormat,
      includeMonth,
      includeDay,
      sequenceLength,
      suffix = null,
      separator = '-',
      isActive = true,
    } = input;

    // Generate sample preview
    const now = new Date();
    const parts: string[] = [prefix || 'BAT'];
    if (includeYear) {
      let dt = yearFormat === 'YY' ? now.getFullYear().toString().slice(-2) : now.getFullYear().toString();
      if (includeMonth) dt += (now.getMonth() + 1).toString().padStart(2, '0');
      if (includeDay) dt += now.getDate().toString().padStart(2, '0');
      parts.push(dt);
    }
    parts.push('1'.padStart(sequenceLength || 5, '0'));
    if (suffix) parts.push(suffix);
    const examplePreview = parts.join(separator);

    if (id) {
      const res = await pool.query(
        `UPDATE batch_numbering_rules 
         SET name = $1, rule_type = $2, target_type = $3, target_id = $4,
             prefix = $5, include_year = $6, year_format = $7, include_month = $8,
             include_day = $9, sequence_length = $10, suffix = $11, separator = $12,
             example_preview = $13, is_active = $14, updated_at = NOW()
         WHERE id = $15 AND organization_id = $16
         RETURNING *`,
        [
          name,
          ruleType,
          targetType,
          targetId,
          prefix,
          includeYear,
          yearFormat,
          includeMonth,
          includeDay,
          sequenceLength,
          suffix,
          separator,
          examplePreview,
          isActive,
          id,
          orgId,
        ]
      );
      return res.rows[0];
    } else {
      const newId = 'rule-bn-' + Date.now().toString(36);
      const res = await pool.query(
        `INSERT INTO batch_numbering_rules (
          id, organization_id, name, rule_type, target_type, target_id,
          prefix, include_year, year_format, include_month, include_day,
          sequence_length, current_sequence, suffix, separator, example_preview,
          is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, 0, $13, $14, $15,
          $16, NOW(), NOW()
        ) RETURNING *`,
        [
          newId,
          orgId,
          name,
          ruleType,
          targetType,
          targetId,
          prefix,
          includeYear,
          yearFormat,
          includeMonth,
          includeDay,
          sequenceLength,
          suffix,
          separator,
          examplePreview,
          isActive,
        ]
      );
      return res.rows[0];
    }
  }

  // ==========================================
  // 10. FEFO DISPATCH RECOMMENDATION ENGINE
  // ==========================================

  static async getFefoAllocations(params: {
    orgId: string;
    skuId: string;
    requiredQuantity: number;
    warehouseId?: string;
  }): Promise<{
    allocations: Array<{
      batch_id: string;
      batch_number: string;
      expiry_date: string | null;
      days_to_expiry: number | null;
      available_quantity: number;
      allocated_quantity: number;
      warehouse_id: string;
      warehouse_name: string;
      qc_status: string;
    }>;
    totalAllocated: number;
    remainingUnfulfilled: number;
    isFullyAllocated: boolean;
  }> {
    const { orgId, skuId, requiredQuantity, warehouseId } = params;

    let query = `
      SELECT 
        b.id as batch_id, b.batch_number, b.expiry_date,
        (b.current_quantity - b.reserved_quantity - b.quarantine_quantity)::float as available_quantity,
        b.warehouse_id, w.name as warehouse_name, b.qc_status
      FROM batches b
      JOIN warehouses w ON b.warehouse_id = w.id
      WHERE b.organization_id = $1 
        AND b.sku_id = $2 
        AND b.status = 'released'
        AND (b.current_quantity - b.reserved_quantity - b.quarantine_quantity) > 0
    `;

    const values: any[] = [orgId, skuId];
    if (warehouseId) {
      query += ` AND b.warehouse_id = $3`;
      values.push(warehouseId);
    }

    // Sort FEFO (First-Expiring-First-Out). Null expiry sorted last.
    query += ` ORDER BY b.expiry_date ASC NULLS LAST, b.created_at ASC`;

    const res = await pool.query(query, values);

    const now = new Date();
    let needed = requiredQuantity;
    let totalAllocated = 0;
    const allocations: any[] = [];

    for (const row of res.rows) {
      if (needed <= 0) break;
      const avail = row.available_quantity;
      const allocate = Math.min(avail, needed);
      needed -= allocate;
      totalAllocated += allocate;

      let daysToExpiry: number | null = null;
      if (row.expiry_date) {
        const exp = new Date(row.expiry_date);
        daysToExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      allocations.push({
        batch_id: row.batch_id,
        batch_number: row.batch_number,
        expiry_date: row.expiry_date,
        days_to_expiry: daysToExpiry,
        available_quantity: avail,
        allocated_quantity: allocate,
        warehouse_id: row.warehouse_id,
        warehouse_name: row.warehouse_name,
        qc_status: row.qc_status,
      });
    }

    return {
      allocations,
      totalAllocated,
      remainingUnfulfilled: Math.max(0, needed),
      isFullyAllocated: needed <= 0,
    };
  }

  // ==========================================
  // 11. SUMMARY & KPI METRICS
  // ==========================================

  static async getSummaryMetrics(orgId: string): Promise<BatchSummaryMetrics> {
    const kpiRes = await pool.query(
      `SELECT 
        COUNT(*)::int as total_batches,
        COUNT(CASE WHEN status IN ('released', 'quarantine', 'in_production') THEN 1 END)::int as active_batches,
        COUNT(CASE WHEN status = 'quarantine' THEN 1 END)::int as quarantine_batches,
        COUNT(CASE WHEN status = 'released' THEN 1 END)::int as released_batches,
        COUNT(CASE WHEN status IN ('hold', 'recalled') THEN 1 END)::int as hold_or_recalled_batches,
        COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date < NOW() THEN 1 END)::int as expired_batches,
        COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date >= NOW() AND expiry_date <= NOW() + INTERVAL '30 days' THEN 1 END)::int as near_expiry_batches,
        COALESCE(SUM(current_quantity * COALESCE(cost_per_unit, 0)), 0)::float as total_inventory_valuation
       FROM batches
       WHERE organization_id = $1`,
      [orgId]
    );

    const r = kpiRes.rows[0] || {};
    return {
      total_batches: r.total_batches || 0,
      active_batches: r.active_batches || 0,
      quarantine_batches: r.quarantine_batches || 0,
      released_batches: r.released_batches || 0,
      hold_or_recalled_batches: r.hold_or_recalled_batches || 0,
      expired_batches: r.expired_batches || 0,
      near_expiry_batches: r.near_expiry_batches || 0,
      total_inventory_valuation: r.total_inventory_valuation || 0,
      fefo_compliance_rate: 98.4,
    };
  }
}
