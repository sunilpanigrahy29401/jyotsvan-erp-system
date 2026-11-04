import { PoolClient } from 'pg';
import { pool } from './db.ts';
import { InventoryService } from './inventory-service.ts';
import type {
  QCParameter,
  QCTemplate,
  QCTemplateParameter,
  QCInspection,
  QCInspectionItem,
  QCDecision,
  QCDocument,
  QCSummaryMetrics,
  SupplierQualityReport,
  SkuQualityReport,
  QCEvaluationResult,
  QCDecisionType,
} from '../types/quality.ts';

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

// Helper to create notifications
async function createNotification(
  client: PoolClient | null,
  organizationId: string,
  recipientEmail: string | null,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: any
) {
  try {
    const notifId = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const db = client || pool;
    await db.query(
      `INSERT INTO notifications (id, organization_id, recipient_email, title, message, category, action_url, is_read, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, 'quality', $6, FALSE, $7, NOW())`,
      [notifId, organizationId, recipientEmail, title, message, actionUrl || null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.warn('[Notification Error]', err);
  }
}

export class QualityService {
  // ==========================================
  // 1. QC PARAMETERS MASTER
  // ==========================================

  static async getParameters(params: {
    orgId: string;
    search?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ parameters: QCParameter[]; total: number; page: number; limit: number }> {
    const { orgId, search, type, status, page = 1, limit = 50 } = params;
    const conditions: string[] = ['p.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (search) {
      conditions.push(`(p.parameter_code ILIKE $${idx} OR p.parameter_name ILIKE $${idx} OR p.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (type) {
      conditions.push(`p.parameter_type = $${idx}`);
      values.push(type);
      idx++;
    }

    if (status) {
      conditions.push(`p.status = $${idx}`);
      values.push(status);
      idx++;
    } else {
      conditions.push(`p.status != 'archived'`);
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query(`SELECT COUNT(*) FROM qc_parameters p WHERE ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const queryStr = `
      SELECT 
        p.id, p.organization_id, p.parameter_code, p.parameter_name, p.description,
        p.parameter_type, p.unit_id, p.minimum_value::float as minimum_value,
        p.maximum_value::float as maximum_value, p.target_value::float as target_value,
        p.allowed_values, p.test_method, p.status, p.created_at, p.updated_at,
        u.short_code as unit_code, u.name as unit_name
      FROM qc_parameters p
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE ${whereClause}
      ORDER BY p.parameter_name ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limit, offset);

    const result = await pool.query(queryStr, values);
    return {
      parameters: result.rows.map(r => ({
        ...r,
        allowed_values: typeof r.allowed_values === 'string' ? JSON.parse(r.allowed_values) : r.allowed_values,
      })),
      total,
      page,
      limit,
    };
  }

  static async getParameterById(id: string, orgId: string): Promise<QCParameter | null> {
    const res = await pool.query(
      `SELECT 
        p.id, p.organization_id, p.parameter_code, p.parameter_name, p.description,
        p.parameter_type, p.unit_id, p.minimum_value::float as minimum_value,
        p.maximum_value::float as maximum_value, p.target_value::float as target_value,
        p.allowed_values, p.test_method, p.status, p.created_at, p.updated_at,
        u.short_code as unit_code, u.name as unit_name
       FROM qc_parameters p
       LEFT JOIN units u ON u.id = p.unit_id
       WHERE p.id = $1 AND p.organization_id = $2`,
      [id, orgId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      allowed_values: typeof r.allowed_values === 'string' ? JSON.parse(r.allowed_values) : r.allowed_values,
    };
  }

  static async createParameter(input: {
    organizationId: string;
    parameterCode: string;
    parameterName: string;
    description?: string;
    parameterType: string;
    unitId?: string | null;
    minimumValue?: number | null;
    maximumValue?: number | null;
    targetValue?: number | null;
    allowedValues?: string[] | null;
    testMethod?: string | null;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<QCParameter> {
    const {
      organizationId,
      parameterCode,
      parameterName,
      description,
      parameterType,
      unitId = null,
      minimumValue = null,
      maximumValue = null,
      targetValue = null,
      allowedValues = null,
      testMethod = null,
      actorId = null,
      actorEmail,
    } = input;

    const id = 'param-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Verify code uniqueness in organization
      const dup = await client.query(
        `SELECT id FROM qc_parameters WHERE organization_id = $1 AND parameter_code = $2`,
        [organizationId, parameterCode.trim().toUpperCase()]
      );
      if (dup.rows.length > 0) {
        throw new Error(`QC Parameter with code "${parameterCode}" already exists.`);
      }

      await client.query(
        `INSERT INTO qc_parameters (
          id, organization_id, parameter_code, parameter_name, description,
          parameter_type, unit_id, minimum_value, maximum_value, target_value,
          allowed_values, test_method, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), NOW())`,
        [
          id,
          organizationId,
          parameterCode.trim().toUpperCase(),
          parameterName.trim(),
          description || null,
          parameterType,
          unitId || null,
          minimumValue !== undefined ? minimumValue : null,
          maximumValue !== undefined ? maximumValue : null,
          targetValue !== undefined ? targetValue : null,
          allowedValues ? JSON.stringify(allowedValues) : null,
          testMethod || null,
        ]
      );

      await recordAudit(client, organizationId, actorId, actorEmail, 'qc_parameter.create', 'qc_parameters', id, {
        code: parameterCode,
        name: parameterName,
        type: parameterType,
      });

      await client.query('COMMIT;');
      return (await this.getParameterById(id, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateParameter(
    id: string,
    orgId: string,
    input: Partial<{
      parameterName: string;
      description: string;
      parameterType: string;
      unitId: string | null;
      minimumValue: number | null;
      maximumValue: number | null;
      targetValue: number | null;
      allowedValues: string[] | null;
      testMethod: string | null;
      status: 'active' | 'inactive' | 'archived';
      actorId: string | null;
      actorEmail: string;
    }>
  ): Promise<QCParameter> {
    const existing = await this.getParameterById(id, orgId);
    if (!existing) throw new Error('QC Parameter not found.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `UPDATE qc_parameters
         SET parameter_name = COALESCE($1, parameter_name),
             description = COALESCE($2, description),
             parameter_type = COALESCE($3, parameter_type),
             unit_id = $4,
             minimum_value = $5,
             maximum_value = $6,
             target_value = $7,
             allowed_values = $8,
             test_method = COALESCE($9, test_method),
             status = COALESCE($10, status),
             updated_at = NOW()
         WHERE id = $11 AND organization_id = $12`,
        [
          input.parameterName ?? null,
          input.description ?? null,
          input.parameterType ?? null,
          input.unitId !== undefined ? input.unitId : existing.unit_id,
          input.minimumValue !== undefined ? input.minimumValue : existing.minimum_value,
          input.maximumValue !== undefined ? input.maximumValue : existing.maximum_value,
          input.targetValue !== undefined ? input.targetValue : existing.target_value,
          input.allowedValues !== undefined ? JSON.stringify(input.allowedValues) : (existing.allowed_values ? JSON.stringify(existing.allowed_values) : null),
          input.testMethod ?? null,
          input.status ?? null,
          id,
          orgId,
        ]
      );

      await recordAudit(client, orgId, input.actorId || null, input.actorEmail || 'system', 'qc_parameter.update', 'qc_parameters', id, {
        updatedFields: Object.keys(input),
      });

      await client.query('COMMIT;');
      return (await this.getParameterById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 2. QC TEMPLATES / SPECIFICATIONS
  // ==========================================

  static async getTemplates(params: {
    orgId: string;
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ templates: QCTemplate[]; total: number; page: number; limit: number }> {
    const { orgId, search, category, status, page = 1, limit = 50 } = params;
    const conditions: string[] = ['t.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (search) {
      conditions.push(`(t.template_code ILIKE $${idx} OR t.name ILIKE $${idx} OR t.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (category) {
      conditions.push(`t.category = $${idx}`);
      values.push(category);
      idx++;
    }

    if (status) {
      conditions.push(`t.status = $${idx}`);
      values.push(status);
      idx++;
    } else {
      conditions.push(`t.status != 'archived'`);
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query(`SELECT COUNT(*) FROM qc_templates t WHERE ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const queryStr = `
      SELECT 
        t.id, t.organization_id, t.template_code, t.name, t.description,
        t.category, t.version, t.is_active, t.status, t.created_at, t.updated_at,
        (SELECT count(*) FROM qc_template_parameters tp WHERE tp.template_id = t.id)::int as parameters_count
      FROM qc_templates t
      WHERE ${whereClause}
      ORDER BY t.name ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limit, offset);

    const result = await pool.query(queryStr, values);
    return {
      templates: result.rows,
      total,
      page,
      limit,
    };
  }

  static async getTemplateById(id: string, orgId: string): Promise<QCTemplate | null> {
    const res = await pool.query(
      `SELECT 
        t.id, t.organization_id, t.template_code, t.name, t.description,
        t.category, t.version, t.is_active, t.status, t.created_at, t.updated_at
       FROM qc_templates t
       WHERE t.id = $1 AND t.organization_id = $2`,
      [id, orgId]
    );
    if (res.rows.length === 0) return null;
    const template = res.rows[0];

    // Fetch Template Parameters
    const paramsRes = await pool.query(
      `SELECT 
        tp.id, tp.template_id, tp.parameter_id, tp.sequence_order, tp.is_mandatory,
        tp.override_min::float as override_min, tp.override_max::float as override_max,
        tp.override_target::float as override_target, tp.override_allowed_values,
        tp.test_method, tp.notes,
        p.parameter_code, p.parameter_name, p.parameter_type, p.unit_id,
        p.minimum_value::float as default_min, p.maximum_value::float as default_max,
        p.target_value::float as default_target, p.allowed_values as default_allowed_values,
        u.short_code as unit_code
       FROM qc_template_parameters tp
       JOIN qc_parameters p ON p.id = tp.parameter_id
       LEFT JOIN units u ON u.id = p.unit_id
       WHERE tp.template_id = $1
       ORDER BY tp.sequence_order ASC`,
      [id]
    );

    template.parameters = paramsRes.rows.map(r => ({
      ...r,
      override_allowed_values: typeof r.override_allowed_values === 'string' ? JSON.parse(r.override_allowed_values) : r.override_allowed_values,
      default_allowed_values: typeof r.default_allowed_values === 'string' ? JSON.parse(r.default_allowed_values) : r.default_allowed_values,
    }));
    template.parameters_count = paramsRes.rows.length;

    return template;
  }

  static async createTemplate(input: {
    organizationId: string;
    templateCode: string;
    name: string;
    description?: string;
    category?: string;
    version?: number;
    parameters?: Array<{
      parameterId: string;
      sequenceOrder?: number;
      isMandatory?: boolean;
      overrideMin?: number | null;
      overrideMax?: number | null;
      overrideTarget?: number | null;
      overrideAllowedValues?: string[] | null;
      testMethod?: string | null;
      notes?: string | null;
    }>;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<QCTemplate> {
    const {
      organizationId,
      templateCode,
      name,
      description,
      category = 'incoming_material',
      version = 1,
      parameters = [],
      actorId = null,
      actorEmail,
    } = input;

    const id = 'tpl-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Verify template uniqueness
      const dup = await client.query(
        `SELECT id FROM qc_templates WHERE organization_id = $1 AND template_code = $2 AND version = $3`,
        [organizationId, templateCode.trim().toUpperCase(), version]
      );
      if (dup.rows.length > 0) {
        throw new Error(`QC Template with code "${templateCode}" and version ${version} already exists.`);
      }

      await client.query(
        `INSERT INTO qc_templates (
          id, organization_id, template_code, name, description, category, version, is_active, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'active', NOW(), NOW())`,
        [id, organizationId, templateCode.trim().toUpperCase(), name.trim(), description || null, category, version]
      );

      // Insert parameters
      let seq = 1;
      for (const p of parameters) {
        const tpId = `tp-${id}-${p.parameterId}`;
        await client.query(
          `INSERT INTO qc_template_parameters (
            id, template_id, parameter_id, sequence_order, is_mandatory,
            override_min, override_max, override_target, override_allowed_values,
            test_method, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            tpId,
            id,
            p.parameterId,
            p.sequenceOrder || seq++,
            p.isMandatory !== undefined ? p.isMandatory : true,
            p.overrideMin !== undefined ? p.overrideMin : null,
            p.overrideMax !== undefined ? p.overrideMax : null,
            p.overrideTarget !== undefined ? p.overrideTarget : null,
            p.overrideAllowedValues ? JSON.stringify(p.overrideAllowedValues) : null,
            p.testMethod || null,
            p.notes || null,
          ]
        );
      }

      await recordAudit(client, organizationId, actorId, actorEmail, 'qc_template.create', 'qc_templates', id, {
        code: templateCode,
        name,
        version,
        parameters_count: parameters.length,
      });

      await client.query('COMMIT;');
      return (await this.getTemplateById(id, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateTemplate(
    id: string,
    orgId: string,
    input: Partial<{
      name: string;
      description: string;
      category: string;
      status: 'active' | 'inactive' | 'archived';
      parameters: Array<{
        parameterId: string;
        sequenceOrder?: number;
        isMandatory?: boolean;
        overrideMin?: number | null;
        overrideMax?: number | null;
        overrideTarget?: number | null;
        overrideAllowedValues?: string[] | null;
        testMethod?: string | null;
        notes?: string | null;
      }>;
      actorId: string | null;
      actorEmail: string;
    }>
  ): Promise<QCTemplate> {
    const existing = await this.getTemplateById(id, orgId);
    if (!existing) throw new Error('QC Template not found.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `UPDATE qc_templates
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             category = COALESCE($3, category),
             status = COALESCE($4, status),
             updated_at = NOW()
         WHERE id = $5 AND organization_id = $6`,
        [input.name ?? null, input.description ?? null, input.category ?? null, input.status ?? null, id, orgId]
      );

      if (input.parameters) {
        // Replace parameter assignments
        await client.query(`DELETE FROM qc_template_parameters WHERE template_id = $1`, [id]);
        let seq = 1;
        for (const p of input.parameters) {
          const tpId = `tp-${id}-${p.parameterId}`;
          await client.query(
            `INSERT INTO qc_template_parameters (
              id, template_id, parameter_id, sequence_order, is_mandatory,
              override_min, override_max, override_target, override_allowed_values,
              test_method, notes, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
            [
              tpId,
              id,
              p.parameterId,
              p.sequenceOrder || seq++,
              p.isMandatory !== undefined ? p.isMandatory : true,
              p.overrideMin !== undefined ? p.overrideMin : null,
              p.overrideMax !== undefined ? p.overrideMax : null,
              p.overrideTarget !== undefined ? p.overrideTarget : null,
              p.overrideAllowedValues ? JSON.stringify(p.overrideAllowedValues) : null,
              p.testMethod || null,
              p.notes || null,
            ]
          );
        }
      }

      await recordAudit(client, orgId, input.actorId || null, input.actorEmail || 'system', 'qc_template.update', 'qc_templates', id, {
        updatedFields: Object.keys(input),
      });

      await client.query('COMMIT;');
      return (await this.getTemplateById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 3. AUTOMATIC TEST EVALUATION ENGINE
  // ==========================================

  static evaluateParameterResult(item: {
    parameter_type_snapshot: string;
    minimum_value?: number | null;
    maximum_value?: number | null;
    allowed_values_snapshot?: string[] | null;
    actual_value?: number | null;
    text_result?: string | null;
    boolean_result?: boolean | null;
    selection_result?: string | null;
  }): QCEvaluationResult {
    const type = item.parameter_type_snapshot;

    if (type === 'numeric' || type === 'percentage') {
      if (item.actual_value === undefined || item.actual_value === null) {
        return 'pending';
      }
      const val = Number(item.actual_value);
      if (isNaN(val)) return 'fail';

      if (item.minimum_value !== null && item.minimum_value !== undefined) {
        if (val < Number(item.minimum_value)) return 'fail';
      }
      if (item.maximum_value !== null && item.maximum_value !== undefined) {
        if (val > Number(item.maximum_value)) return 'fail';
      }
      return 'pass';
    }

    if (type === 'pass_fail') {
      if (!item.selection_result && item.boolean_result === undefined) return 'pending';
      if (item.boolean_result === true) return 'pass';
      if (item.boolean_result === false) return 'fail';
      const sel = (item.selection_result || '').trim().toLowerCase();
      if (sel === 'pass' || sel === 'complies' || sel === 'yes' || sel === 'ok') return 'pass';
      if (sel === 'fail' || sel === 'no' || sel === 'rejected') return 'fail';
      return 'indeterminate';
    }

    if (type === 'boolean') {
      if (item.boolean_result === undefined || item.boolean_result === null) return 'pending';
      return item.boolean_result ? 'pass' : 'fail';
    }

    if (type === 'selection') {
      if (!item.selection_result) return 'pending';
      const allowed = item.allowed_values_snapshot || [];
      if (allowed.length === 0) return 'pass';
      const match = allowed.some(a => a.trim().toLowerCase() === item.selection_result!.trim().toLowerCase());
      return match ? 'pass' : 'fail';
    }

    if (type === 'text') {
      if (!item.text_result) return 'pending';
      return 'pass';
    }

    return 'pending';
  }

  // ==========================================
  // 4. QC INSPECTION LIFECYCLE & WORKFLOWS
  // ==========================================

  static async getInspections(params: {
    orgId: string;
    search?: string;
    status?: string;
    type?: string;
    skuId?: string;
    supplierId?: string;
    warehouseId?: string;
    overallResult?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ inspections: QCInspection[]; total: number; page: number; limit: number }> {
    const {
      orgId,
      search,
      status,
      type,
      skuId,
      supplierId,
      warehouseId,
      overallResult,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params;

    const conditions: string[] = ['i.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (search) {
      conditions.push(`(
        i.inspection_number ILIKE $${idx} OR
        i.source_id ILIKE $${idx} OR
        i.batch_number ILIKE $${idx} OR
        s.sku ILIKE $${idx} OR
        p.name ILIKE $${idx} OR
        sup.name ILIKE $${idx}
      )`);
      values.push(`%${search}%`);
      idx++;
    }

    if (status) {
      conditions.push(`i.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (type) {
      conditions.push(`i.inspection_type = $${idx}`);
      values.push(type);
      idx++;
    }

    if (skuId) {
      conditions.push(`i.sku_id = $${idx}`);
      values.push(skuId);
      idx++;
    }

    if (supplierId) {
      conditions.push(`i.supplier_id = $${idx}`);
      values.push(supplierId);
      idx++;
    }

    if (warehouseId) {
      conditions.push(`i.warehouse_id = $${idx}`);
      values.push(warehouseId);
      idx++;
    }

    if (overallResult) {
      conditions.push(`i.overall_result = $${idx}`);
      values.push(overallResult);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM qc_inspections i
       JOIN skus s ON s.id = i.sku_id
       JOIN products p ON p.id = s.product_id
       LEFT JOIN suppliers sup ON sup.id = i.supplier_id
       WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const validSortCols = ['created_at', 'inspection_number', 'status', 'received_quantity', 'overall_result'];
    const sortCol = validSortCols.includes(sortBy) ? `i.${sortBy}` : 'i.created_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;
    const queryStr = `
      SELECT 
        i.id, i.organization_id, i.inspection_number, i.source_type, i.source_id, i.source_item_id,
        i.supplier_id, i.sku_id, i.warehouse_id, i.location_id, i.batch_number,
        i.manufacturing_date, i.expiry_date,
        i.received_quantity::float as received_quantity,
        i.sample_quantity::float as sample_quantity,
        i.unit_id, i.template_id, i.template_version_snapshot, i.inspection_type,
        i.status, i.overall_result, i.assigned_to, i.assigned_to_email,
        i.inspected_by, i.inspected_by_email, i.parent_inspection_id,
        i.is_reinspection, i.reinspection_reason, i.started_at, i.completed_at,
        i.inventory_released, i.inventory_movement_id, i.created_by, i.created_by_email,
        i.created_at, i.updated_at,
        s.sku as sku_code, s.variant_name as sku_name,
        p.name as product_name,
        sup.name as supplier_name, sup.code as supplier_code,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name,
        u.short_code as unit_code,
        tpl.name as template_name, tpl.template_code as template_code,
        par.inspection_number as parent_inspection_number
      FROM qc_inspections i
      JOIN skus s ON s.id = i.sku_id
      JOIN products p ON p.id = s.product_id
      LEFT JOIN suppliers sup ON sup.id = i.supplier_id
      LEFT JOIN warehouses w ON w.id = i.warehouse_id
      LEFT JOIN warehouse_locations loc ON loc.id = i.location_id
      LEFT JOIN units u ON u.id = i.unit_id
      LEFT JOIN qc_templates tpl ON tpl.id = i.template_id
      LEFT JOIN qc_inspections par ON par.id = i.parent_inspection_id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${direction}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limit, offset);

    const result = await pool.query(queryStr, values);
    return {
      inspections: result.rows,
      total,
      page,
      limit,
    };
  }

  static async getInspectionById(id: string, orgId: string): Promise<QCInspection | null> {
    const res = await pool.query(
      `SELECT 
        i.id, i.organization_id, i.inspection_number, i.source_type, i.source_id, i.source_item_id,
        i.supplier_id, i.sku_id, i.warehouse_id, i.location_id, i.batch_number,
        i.manufacturing_date, i.expiry_date,
        i.received_quantity::float as received_quantity,
        i.sample_quantity::float as sample_quantity,
        i.unit_id, i.template_id, i.template_version_snapshot, i.inspection_type,
        i.status, i.overall_result, i.assigned_to, i.assigned_to_email,
        i.inspected_by, i.inspected_by_email, i.parent_inspection_id,
        i.is_reinspection, i.reinspection_reason, i.started_at, i.completed_at,
        i.inventory_released, i.inventory_movement_id, i.created_by, i.created_by_email,
        i.created_at, i.updated_at,
        s.sku as sku_code, s.variant_name as sku_name,
        p.name as product_name,
        sup.name as supplier_name, sup.code as supplier_code,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name,
        u.short_code as unit_code,
        tpl.name as template_name, tpl.template_code as template_code,
        par.inspection_number as parent_inspection_number
       FROM qc_inspections i
       JOIN skus s ON s.id = i.sku_id
       JOIN products p ON p.id = s.product_id
       LEFT JOIN suppliers sup ON sup.id = i.supplier_id
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       LEFT JOIN warehouse_locations loc ON loc.id = i.location_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN qc_templates tpl ON tpl.id = i.template_id
       LEFT JOIN qc_inspections par ON par.id = i.parent_inspection_id
       WHERE i.id = $1 AND i.organization_id = $2`,
      [id, orgId]
    );
    if (res.rows.length === 0) return null;
    const inspection: QCInspection = res.rows[0];

    // Fetch Items
    const itemsRes = await pool.query(
      `SELECT 
        id, inspection_id, parameter_id, parameter_code_snapshot, parameter_name_snapshot,
        parameter_type_snapshot, unit_id, unit_code_snapshot, expected_value,
        minimum_value::float as minimum_value, maximum_value::float as maximum_value,
        target_value::float as target_value, allowed_values_snapshot, test_method_snapshot,
        is_mandatory, sequence_order, actual_value::float as actual_value,
        text_result, boolean_result, selection_result, auto_evaluation, evaluated_result,
        is_overridden, override_reason, overridden_by, overridden_by_email, overridden_at,
        remarks, tested_by, tested_by_email, tested_at, created_at
       FROM qc_inspection_items
       WHERE inspection_id = $1
       ORDER BY sequence_order ASC`,
      [id]
    );
    inspection.items = itemsRes.rows.map(r => ({
      ...r,
      allowed_values_snapshot: typeof r.allowed_values_snapshot === 'string' ? JSON.parse(r.allowed_values_snapshot) : r.allowed_values_snapshot,
    }));

    // Fetch Decision
    const decRes = await pool.query(
      `SELECT 
        id, organization_id, inspection_id, decision, rejection_reason_code,
        decision_reason, comments, has_override, override_justification,
        accepted_quantity::float as accepted_quantity,
        rejected_quantity::float as rejected_quantity,
        quarantine_quantity::float as quarantine_quantity,
        decided_by, decided_by_email, decision_date, inventory_action_status,
        inventory_movement_ids, created_at
       FROM qc_decisions
       WHERE inspection_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    );
    inspection.decision = decRes.rows.length > 0 ? {
      ...decRes.rows[0],
      inventory_movement_ids: typeof decRes.rows[0].inventory_movement_ids === 'string' ? JSON.parse(decRes.rows[0].inventory_movement_ids) : decRes.rows[0].inventory_movement_ids,
    } : null;

    // Fetch Documents
    const docsRes = await pool.query(
      `SELECT id, organization_id, inspection_id, document_name, document_type, file_url, file_size_bytes, uploaded_by, uploaded_by_email, created_at
       FROM qc_documents
       WHERE inspection_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    inspection.documents = docsRes.rows;

    return inspection;
  }

  static async createInspection(input: {
    organizationId: string;
    sourceType?: 'goods_receipt' | 'production_batch' | 'inventory_lot' | 'manual';
    sourceId: string;
    sourceItemId?: string | null;
    supplierId?: string | null;
    skuId: string;
    warehouseId: string;
    locationId?: string | null;
    batchNumber?: string | null;
    manufacturingDate?: string | null;
    expiryDate?: string | null;
    receivedQuantity: number;
    sampleQuantity?: number;
    templateId?: string | null;
    inspectionType?: 'incoming' | 'in_process' | 'finished_good' | 're_inspection' | 'other';
    assignedTo?: string | null;
    assignedToEmail?: string | null;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<QCInspection> {
    const {
      organizationId,
      sourceType = 'goods_receipt',
      sourceId,
      sourceItemId = null,
      supplierId = null,
      skuId,
      warehouseId,
      locationId = null,
      batchNumber = null,
      manufacturingDate = null,
      expiryDate = null,
      receivedQuantity,
      sampleQuantity = 0,
      templateId = null,
      inspectionType = 'incoming',
      assignedTo = null,
      assignedToEmail = null,
      actorId = null,
      actorEmail,
    } = input;

    if (receivedQuantity <= 0) {
      throw new Error('Received quantity must be strictly greater than zero.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Resolve SKU and Unit
      const skuRes = await client.query(
        `SELECT s.id, s.sku, s.unit_id, s.qc_template_id, s.requires_qc FROM skus s WHERE s.id = $1 AND s.organization_id = $2`,
        [skuId, organizationId]
      );
      if (skuRes.rows.length === 0) {
        throw new Error(`SKU with ID "${skuId}" not found in organization.`);
      }
      const sku = skuRes.rows[0];
      const unitId = sku.unit_id;

      // 2. Resolve QC Template (selected or SKU default or active template)
      let resolvedTemplateId = templateId || sku.qc_template_id;
      if (!resolvedTemplateId) {
        const defaultTpl = await client.query(
          `SELECT id FROM qc_templates WHERE organization_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
          [organizationId]
        );
        if (defaultTpl.rows.length > 0) {
          resolvedTemplateId = defaultTpl.rows[0].id;
        }
      }

      let templateVersion = 1;
      let templateParams: any[] = [];
      if (resolvedTemplateId) {
        const tplRes = await client.query(
          `SELECT version FROM qc_templates WHERE id = $1 AND organization_id = $2`,
          [resolvedTemplateId, organizationId]
        );
        if (tplRes.rows.length > 0) {
          templateVersion = tplRes.rows[0].version;
        }

        const tpRes = await client.query(
          `SELECT 
            tp.parameter_id, tp.sequence_order, tp.is_mandatory,
            tp.override_min, tp.override_max, tp.override_target, tp.override_allowed_values, tp.test_method,
            p.parameter_code, p.parameter_name, p.parameter_type, p.unit_id,
            p.minimum_value as default_min, p.maximum_value as default_max,
            p.target_value as default_target, p.allowed_values as default_allowed,
            p.test_method as default_method,
            u.short_code as unit_code
           FROM qc_template_parameters tp
           JOIN qc_parameters p ON p.id = tp.parameter_id
           LEFT JOIN units u ON u.id = p.unit_id
           WHERE tp.template_id = $1
           ORDER BY tp.sequence_order ASC`,
          [resolvedTemplateId]
        );
        templateParams = tpRes.rows;
      }

      // 3. Generate Sequential Inspection Number (QC-YYYY-XXXXX)
      const year = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) FROM qc_inspections WHERE organization_id = $1`,
        [organizationId]
      );
      const seqNum = (parseInt(countRes.rows[0].count, 10) + 1).toString().padStart(5, '0');
      const inspectionNumber = `QC-${year}-${seqNum}`;
      const inspectionId = 'insp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

      // 4. Insert Inspection Master
      await client.query(
        `INSERT INTO qc_inspections (
          id, organization_id, inspection_number, source_type, source_id, source_item_id,
          supplier_id, sku_id, warehouse_id, location_id, batch_number,
          manufacturing_date, expiry_date, received_quantity, sample_quantity, unit_id,
          template_id, template_version_snapshot, inspection_type, status, overall_result,
          assigned_to, assigned_to_email, is_reinspection,
          created_by, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, 'pending', 'pending', $20, $21, FALSE,
          $22, $23, NOW(), NOW()
        )`,
        [
          inspectionId,
          organizationId,
          inspectionNumber,
          sourceType,
          sourceId,
          sourceItemId,
          supplierId,
          skuId,
          warehouseId,
          locationId,
          batchNumber,
          manufacturingDate || null,
          expiryDate || null,
          receivedQuantity,
          sampleQuantity,
          unitId,
          resolvedTemplateId,
          templateVersion,
          inspectionType,
          assignedTo,
          assignedToEmail,
          actorId,
          actorEmail,
        ]
      );

      // 5. Freeze Specification Snapshot into Inspection Items
      let seq = 1;
      for (const tp of templateParams) {
        const itemId = 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7) + `-${seq}`;
        const minVal = tp.override_min !== null ? tp.override_min : tp.default_min;
        const maxVal = tp.override_max !== null ? tp.override_max : tp.default_max;
        const targetVal = tp.override_target !== null ? tp.override_target : tp.default_target;
        const allowedVals = tp.override_allowed_values || tp.default_allowed;
        const testMeth = tp.test_method || tp.default_method;

        await client.query(
          `INSERT INTO qc_inspection_items (
            id, inspection_id, parameter_id, parameter_code_snapshot, parameter_name_snapshot,
            parameter_type_snapshot, unit_id, unit_code_snapshot,
            minimum_value, maximum_value, target_value, allowed_values_snapshot, test_method_snapshot,
            is_mandatory, sequence_order, auto_evaluation, evaluated_result, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', 'pending', NOW()
          )`,
          [
            itemId,
            inspectionId,
            tp.parameter_id,
            tp.parameter_code,
            tp.parameter_name,
            tp.parameter_type,
            tp.unit_id,
            tp.unit_code,
            minVal,
            maxVal,
            targetVal,
            allowedVals ? (typeof allowedVals === 'string' ? allowedVals : JSON.stringify(allowedVals)) : null,
            testMeth,
            tp.is_mandatory,
            tp.sequence_order || seq++,
          ]
        );
      }

      await recordAudit(client, organizationId, actorId, actorEmail, 'qc_inspection.create', 'qc_inspections', inspectionId, {
        inspection_number: inspectionNumber,
        source_type: sourceType,
        source_id: sourceId,
        sku_id: skuId,
        received_quantity: receivedQuantity,
        parameters_count: templateParams.length,
      });

      await createNotification(
        client,
        organizationId,
        assignedToEmail || actorEmail,
        `New QC Inspection Logged (${inspectionNumber})`,
        `Quality inspection ${inspectionNumber} initiated for SKU ${sku.sku} (${receivedQuantity} units).`,
        `/operations/quality/inspections/${inspectionId}`
      );

      await client.query('COMMIT;');
      return (await this.getInspectionById(inspectionId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async submitInspectionResults(input: {
    inspectionId: string;
    organizationId: string;
    items: Array<{
      id: string;
      actualValue?: number | null;
      textResult?: string | null;
      booleanResult?: boolean | null;
      selectionResult?: string | null;
      remarks?: string | null;
    }>;
    sampleQuantity?: number;
    notes?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<QCInspection> {
    const { inspectionId, organizationId, items, sampleQuantity, actorId = null, actorEmail } = input;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Lock inspection for update
      const inspRes = await client.query(
        `SELECT id, status, is_reinspection FROM qc_inspections WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [inspectionId, organizationId]
      );
      if (inspRes.rows.length === 0) throw new Error('QC Inspection not found.');
      const inspection = inspRes.rows[0];

      if (['approved', 'rejected', 'released', 'cancelled'].includes(inspection.status)) {
        throw new Error(`Cannot submit results on finalized inspection with status "${inspection.status}".`);
      }

      let hasFail = false;
      let hasPending = false;

      for (const it of items) {
        // Fetch current item spec snapshot
        const itemRes = await client.query(
          `SELECT parameter_type_snapshot, minimum_value, maximum_value, allowed_values_snapshot, is_mandatory, is_overridden, evaluated_result
           FROM qc_inspection_items WHERE id = $1 AND inspection_id = $2`,
          [it.id, inspectionId]
        );
        if (itemRes.rows.length === 0) continue;
        const currentItem = itemRes.rows[0];

        const evalResult = this.evaluateParameterResult({
          parameter_type_snapshot: currentItem.parameter_type_snapshot,
          minimum_value: currentItem.minimum_value,
          maximum_value: currentItem.maximum_value,
          allowed_values_snapshot: typeof currentItem.allowed_values_snapshot === 'string' ? JSON.parse(currentItem.allowed_values_snapshot) : currentItem.allowed_values_snapshot,
          actual_value: it.actualValue,
          text_result: it.textResult,
          boolean_result: it.booleanResult,
          selection_result: it.selectionResult,
        });

        // Retain override if already present unless re-evaluated
        const finalEval = currentItem.is_overridden ? currentItem.evaluated_result : evalResult;

        if (currentItem.is_mandatory && finalEval === 'fail') hasFail = true;
        if (currentItem.is_mandatory && finalEval === 'pending') hasPending = true;

        await client.query(
          `UPDATE qc_inspection_items
           SET actual_value = $1,
               text_result = $2,
               boolean_result = $3,
               selection_result = $4,
               auto_evaluation = $5,
               evaluated_result = $6,
               remarks = COALESCE($7, remarks),
               tested_by = $8,
               tested_by_email = $9,
               tested_at = NOW()
           WHERE id = $10 AND inspection_id = $11`,
          [
            it.actualValue !== undefined ? it.actualValue : null,
            it.textResult ?? null,
            it.booleanResult !== undefined ? it.booleanResult : null,
            it.selectionResult ?? null,
            evalResult,
            finalEval,
            it.remarks ?? null,
            actorId,
            actorEmail,
            it.id,
            inspectionId,
          ]
        );
      }

      // Determine overall evaluation
      const overallResult: QCEvaluationResult = hasPending ? 'pending' : (hasFail ? 'fail' : 'pass');

      await client.query(
        `UPDATE qc_inspections
         SET status = 'under_review',
             overall_result = $1,
             sample_quantity = COALESCE($2, sample_quantity),
             inspected_by = $3,
             inspected_by_email = $4,
             started_at = COALESCE(started_at, NOW()),
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $5`,
        [overallResult, sampleQuantity ?? null, actorId, actorEmail, inspectionId]
      );

      await recordAudit(client, organizationId, actorId, actorEmail, 'qc_inspection.submit_results', 'qc_inspections', inspectionId, {
        submittedItemsCount: items.length,
        overallResult,
      });

      await client.query('COMMIT;');
      return (await this.getInspectionById(inspectionId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async overrideItemEvaluation(input: {
    inspectionId: string;
    itemId: string;
    organizationId: string;
    overrideResult: 'pass' | 'fail' | 'conditional';
    overrideReason: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<QCInspection> {
    const { inspectionId, itemId, organizationId, overrideResult, overrideReason, actorId = null, actorEmail } = input;

    if (!overrideReason || overrideReason.trim().length < 5) {
      throw new Error('A detailed override justification reason (minimum 5 characters) is mandatory.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Verify item exists
      const itemRes = await client.query(
        `SELECT id, auto_evaluation, parameter_code_snapshot FROM qc_inspection_items WHERE id = $1 AND inspection_id = $2`,
        [itemId, inspectionId]
      );
      if (itemRes.rows.length === 0) throw new Error('QC Inspection Item not found.');

      await client.query(
        `UPDATE qc_inspection_items
         SET evaluated_result = $1,
             is_overridden = TRUE,
             override_reason = $2,
             overridden_by = $3,
             overridden_by_email = $4,
             overridden_at = NOW()
         WHERE id = $5 AND inspection_id = $6`,
        [overrideResult, overrideReason.trim(), actorId, actorEmail, itemId, inspectionId]
      );

      // Re-evaluate overall inspection result
      const allItems = await client.query(
        `SELECT evaluated_result, is_mandatory FROM qc_inspection_items WHERE inspection_id = $1`,
        [inspectionId]
      );
      let hasFail = false;
      let hasPending = false;
      for (const row of allItems.rows) {
        if (row.is_mandatory && row.evaluated_result === 'fail') hasFail = true;
        if (row.is_mandatory && row.evaluated_result === 'pending') hasPending = true;
      }
      const overallResult: QCEvaluationResult = hasPending ? 'pending' : (hasFail ? 'fail' : 'pass');

      await client.query(
        `UPDATE qc_inspections SET overall_result = $1, updated_at = NOW() WHERE id = $2`,
        [overallResult, inspectionId]
      );

      await recordAudit(client, organizationId, actorId, actorEmail, 'qc_inspection.override', 'qc_inspection_items', itemId, {
        inspectionId,
        parameter: itemRes.rows[0].parameter_code_snapshot,
        original_auto_eval: itemRes.rows[0].auto_evaluation,
        overridden_to: overrideResult,
        override_reason: overrideReason,
      });

      await client.query('COMMIT;');
      return (await this.getInspectionById(inspectionId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 5. QC DECISION & ATOMIC INVENTORY ACTION
  // ==========================================

  static async makeDecision(input: {
    inspectionId: string;
    organizationId: string;
    decision: QCDecisionType;
    rejectionReasonCode?: string | null;
    decisionReason?: string | null;
    comments?: string | null;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    quarantineQuantity?: number;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<{ inspection: QCInspection; decision: QCDecision }> {
    const {
      inspectionId,
      organizationId,
      decision,
      rejectionReasonCode = null,
      decisionReason = null,
      comments = null,
      acceptedQuantity,
      rejectedQuantity,
      quarantineQuantity,
      actorId = null,
      actorEmail,
    } = input;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Lock inspection row FOR UPDATE (Concurrency & Idempotency guard)
      const inspRes = await client.query(
        `SELECT 
          i.id, i.organization_id, i.inspection_number, i.source_type, i.source_id, i.source_item_id,
          i.sku_id, i.warehouse_id, i.location_id, i.batch_number,
          i.received_quantity::float as received_quantity,
          i.unit_id, i.status, i.inventory_released
         FROM qc_inspections i
         WHERE i.id = $1 AND i.organization_id = $2
         FOR UPDATE`,
        [inspectionId, organizationId]
      );

      if (inspRes.rows.length === 0) {
        throw new Error('QC Inspection not found.');
      }
      const insp = inspRes.rows[0];

      // Prevent duplicate final decision / idempotent check
      if (['approved', 'rejected', 'released'].includes(insp.status) && insp.inventory_released) {
        throw new Error(`Inspection "${insp.inspection_number}" has already been finalized with decision status "${insp.status}". Duplicate execution is blocked.`);
      }

      const totalQty = parseFloat(insp.received_quantity) || 0;
      let finalAccepted = acceptedQuantity !== undefined ? acceptedQuantity : 0;
      let finalRejected = rejectedQuantity !== undefined ? rejectedQuantity : 0;
      let finalQuarantine = quarantineQuantity !== undefined ? quarantineQuantity : 0;

      if (decision === 'approved') {
        finalAccepted = acceptedQuantity !== undefined ? acceptedQuantity : totalQty;
        finalRejected = rejectedQuantity !== undefined ? rejectedQuantity : 0;
        finalQuarantine = 0;
      } else if (decision === 'rejected') {
        finalAccepted = 0;
        finalRejected = rejectedQuantity !== undefined ? rejectedQuantity : totalQty;
        finalQuarantine = 0;
      } else if (decision === 'quarantine') {
        finalAccepted = 0;
        finalRejected = 0;
        finalQuarantine = quarantineQuantity !== undefined ? quarantineQuantity : totalQty;
      }

      const decisionId = 'dec-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const createdMovementIds: string[] = [];

      // 2. ATOMIC INVENTORY INTEGRATION VIA INVENTORY ENGINE
      // For incoming QC on goods_receipt: Stock was received into quarantine or held.
      // If approved, release from quarantine to available stock!
      if (finalAccepted > 0) {
        // Check if balance exists in quarantine
        const balRes = await client.query(
          `SELECT id, available_quantity::float as avail, quarantine_quantity::float as quar, total_quantity::float as total
           FROM inventory_balances
           WHERE organization_id = $1 
             AND warehouse_id = $2 
             AND ((location_id IS NULL AND $3::varchar IS NULL) OR location_id = $3)
             AND sku_id = $4 
             AND ((batch_id IS NULL AND $5::varchar IS NULL) OR batch_id = $5)
           FOR UPDATE`,
          [organizationId, insp.warehouse_id, insp.location_id || null, insp.sku_id, insp.batch_number || null]
        );

        if (balRes.rows.length > 0) {
          const currentQuar = balRes.rows[0].quar || 0;
          const currentAvail = balRes.rows[0].avail || 0;
          const currentTotal = balRes.rows[0].total || 0;

          // If quarantine stock has enough, transfer from quarantine to available
          const releaseFromQuar = Math.min(currentQuar, finalAccepted);
          const newQuar = currentQuar - releaseFromQuar;
          const newAvail = currentAvail + finalAccepted;
          const newTotal = (currentQuar < finalAccepted) ? (currentTotal + (finalAccepted - currentQuar)) : currentTotal;

          await client.query(
            `UPDATE inventory_balances
             SET quarantine_quantity = $1,
                 available_quantity = $2,
                 total_quantity = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [newQuar, newAvail, newTotal, balRes.rows[0].id]
          );

          // Create immutable movement ledger record
          const movId = 'mov-qc-rel-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
          await client.query(
            `INSERT INTO inventory_movements (
              id, organization_id, sku_id, warehouse_id, location_id, batch_id,
              movement_type, stock_type, quantity, unit_id,
              reference_type, reference_id, before_quantity, after_quantity,
              performed_by, performed_by_email, reason, notes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'quarantine_release', 'available', $7, $8, 'qc_inspection', $9, $10, $11, $12, $13, $14, $15, NOW())`,
            [
              movId,
              organizationId,
              insp.sku_id,
              insp.warehouse_id,
              insp.location_id,
              insp.batch_number,
              finalAccepted,
              insp.unit_id,
              insp.inspection_number,
              currentAvail,
              newAvail,
              actorId,
              actorEmail,
              `QC Inspection Approved: ${insp.inspection_number}`,
              decisionReason || 'Material released from quarantine to available stock upon QC approval.',
            ]
          );
          createdMovementIds.push(movId);
        } else {
          // Initialize balance row if none existed
          const newBalId = 'bal-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
          await client.query(
            `INSERT INTO inventory_balances (
              id, organization_id, warehouse_id, location_id, sku_id, batch_id,
              available_quantity, reserved_quantity, damaged_quantity, quarantine_quantity, total_quantity,
              unit_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, $7, $8, NOW(), NOW())
            ON CONFLICT (organization_id, warehouse_id, COALESCE(location_id, 'NO_LOC'), sku_id, COALESCE(batch_id, 'NO_BATCH'))
            DO UPDATE SET available_quantity = inventory_balances.available_quantity + $7, total_quantity = inventory_balances.total_quantity + $7, updated_at = NOW()`,
            [newBalId, organizationId, insp.warehouse_id, insp.location_id, insp.sku_id, insp.batch_number, finalAccepted, insp.unit_id]
          );

          const movId = 'mov-qc-in-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
          await client.query(
            `INSERT INTO inventory_movements (
              id, organization_id, sku_id, warehouse_id, location_id, batch_id,
              movement_type, stock_type, quantity, unit_id,
              reference_type, reference_id, before_quantity, after_quantity,
              performed_by, performed_by_email, reason, notes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'receive', 'available', $7, $8, 'qc_inspection', $9, 0, $7, $10, $11, $12, $13, NOW())`,
            [
              movId,
              organizationId,
              insp.sku_id,
              insp.warehouse_id,
              insp.location_id,
              insp.batch_number,
              finalAccepted,
              insp.unit_id,
              insp.inspection_number,
              actorId,
              actorEmail,
              `QC Inspection Approved Inward: ${insp.inspection_number}`,
              decisionReason || 'Initial inward credited upon QC approval.',
            ]
          );
          createdMovementIds.push(movId);
        }
      }

      // If rejected, ensure stock is placed in damaged/quarantine ledger state
      if (finalRejected > 0 && decision === 'rejected') {
        const movId = 'mov-qc-rej-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO inventory_movements (
            id, organization_id, sku_id, warehouse_id, location_id, batch_id,
            movement_type, stock_type, quantity, unit_id,
            reference_type, reference_id, before_quantity, after_quantity,
            performed_by, performed_by_email, reason, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'damage', 'damaged', $7, $8, 'qc_inspection', $9, 0, $7, $10, $11, $12, $13, NOW())`,
          [
            movId,
            organizationId,
            insp.sku_id,
            insp.warehouse_id,
            insp.location_id,
            insp.batch_number,
            finalRejected,
            insp.unit_id,
            insp.inspection_number,
            actorId,
            actorEmail,
            `QC Inspection Rejection: ${insp.inspection_number} (${rejectionReasonCode || 'out_of_spec'})`,
            decisionReason || 'Stock quarantined/locked from available inventory due to QC rejection.',
          ]
        );
        createdMovementIds.push(movId);
      }

      // 3. Update GRN and GRN Item if applicable
      if (insp.source_type === 'goods_receipt' && insp.source_id) {
        const grnStatus = decision === 'approved' ? 'approved' : (decision === 'rejected' ? 'rejected' : 'quarantine');
        await client.query(
          `UPDATE goods_receipts SET qc_status = $1, updated_at = NOW() WHERE grn_number = $2 OR id = $2`,
          [grnStatus, insp.source_id]
        );

        if (insp.source_item_id) {
          await client.query(
            `UPDATE goods_receipt_items
             SET accepted_quantity = $1,
                 rejected_quantity = $2,
                 quarantine_quantity = $3,
                 qc_status = $4
             WHERE id = $5`,
            [finalAccepted, finalRejected, finalQuarantine, grnStatus, insp.source_item_id]
          );
        }
      }

      // 4. Record Decision Table Entry
      const decRes = await client.query(
        `INSERT INTO qc_decisions (
          id, organization_id, inspection_id, decision, rejection_reason_code,
          decision_reason, comments, accepted_quantity, rejected_quantity, quarantine_quantity,
          decided_by, decided_by_email, decision_date, inventory_action_status, inventory_movement_ids, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 'completed', $13, NOW())
        RETURNING *`,
        [
          decisionId,
          organizationId,
          inspectionId,
          decision,
          rejectionReasonCode,
          decisionReason,
          comments,
          finalAccepted,
          finalRejected,
          finalQuarantine,
          actorId,
          actorEmail,
          JSON.stringify(createdMovementIds),
        ]
      );

      // 5. Update Inspection Status
      const newStatus = decision === 'approved' ? 'approved' : (decision === 'rejected' ? 'rejected' : 'quarantine');
      await client.query(
        `UPDATE qc_inspections
         SET status = $1,
             inventory_released = $2,
             inventory_movement_id = $3,
             completed_at = COALESCE(completed_at, NOW()),
             updated_at = NOW()
         WHERE id = $4`,
        [newStatus, finalAccepted > 0, createdMovementIds[0] || null, inspectionId]
      );

      // 6. Enterprise Audit Log
      await recordAudit(client, organizationId, actorId, actorEmail, `qc_inspection.${decision}`, 'qc_decisions', decisionId, {
        inspection_number: insp.inspection_number,
        decision,
        accepted_quantity: finalAccepted,
        rejected_quantity: finalRejected,
        quarantine_quantity: finalQuarantine,
        movements: createdMovementIds,
      });

      // 7. System Notification
      await createNotification(
        client,
        organizationId,
        actorEmail,
        `QC Decision Finalized (${insp.inspection_number})`,
        `Inspection ${insp.inspection_number} marked as ${decision.toUpperCase()}. ${finalAccepted} units approved, ${finalRejected} rejected.`,
        `/operations/quality/inspections/${inspectionId}`
      );

      await client.query('COMMIT;');

      const updatedInspection = await this.getInspectionById(inspectionId, organizationId);
      return {
        inspection: updatedInspection!,
        decision: decRes.rows[0],
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 6. RE-INSPECTION CREATION (TRACEABILITY)
  // ==========================================

  static async createReinspection(input: {
    parentInspectionId: string;
    organizationId: string;
    reinspectionReason: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<QCInspection> {
    const { parentInspectionId, organizationId, reinspectionReason, actorId = null, actorEmail } = input;

    if (!reinspectionReason || reinspectionReason.trim().length < 5) {
      throw new Error('A detailed reason for re-inspection is required (minimum 5 characters).');
    }

    const parent = await this.getInspectionById(parentInspectionId, organizationId);
    if (!parent) throw new Error('Parent QC Inspection not found.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const year = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) FROM qc_inspections WHERE organization_id = $1`,
        [organizationId]
      );
      const seqNum = (parseInt(countRes.rows[0].count, 10) + 1).toString().padStart(5, '0');
      const reinspectionNumber = `QC-${year}-${seqNum}-RE`;
      const reinspectionId = 'insp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

      // Create new child inspection referencing parent
      await client.query(
        `INSERT INTO qc_inspections (
          id, organization_id, inspection_number, source_type, source_id, source_item_id,
          supplier_id, sku_id, warehouse_id, location_id, batch_number,
          manufacturing_date, expiry_date, received_quantity, sample_quantity, unit_id,
          template_id, template_version_snapshot, inspection_type, status, overall_result,
          parent_inspection_id, is_reinspection, reinspection_reason,
          created_by, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, 're_inspection', 'pending', 'pending',
          $19, TRUE, $20,
          $21, $22, NOW(), NOW()
        )`,
        [
          reinspectionId,
          organizationId,
          reinspectionNumber,
          parent.source_type,
          parent.source_id,
          parent.source_item_id,
          parent.supplier_id,
          parent.sku_id,
          parent.warehouse_id,
          parent.location_id,
          parent.batch_number,
          parent.manufacturing_date || null,
          parent.expiry_date || null,
          parent.received_quantity,
          parent.sample_quantity,
          parent.unit_id,
          parent.template_id,
          parent.template_version_snapshot,
          parent.id,
          reinspectionReason.trim(),
          actorId,
          actorEmail,
        ]
      );

      // Clone items from parent specification snapshot with empty results
      if (parent.items && parent.items.length > 0) {
        for (const it of parent.items) {
          const newItemId = 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
          await client.query(
            `INSERT INTO qc_inspection_items (
              id, inspection_id, parameter_id, parameter_code_snapshot, parameter_name_snapshot,
              parameter_type_snapshot, unit_id, unit_code_snapshot,
              minimum_value, maximum_value, target_value, allowed_values_snapshot, test_method_snapshot,
              is_mandatory, sequence_order, auto_evaluation, evaluated_result, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', 'pending', NOW()
            )`,
            [
              newItemId,
              reinspectionId,
              it.parameter_id,
              it.parameter_code_snapshot,
              it.parameter_name_snapshot,
              it.parameter_type_snapshot,
              it.unit_id,
              it.unit_code_snapshot,
              it.minimum_value,
              it.maximum_value,
              it.target_value,
              it.allowed_values_snapshot ? JSON.stringify(it.allowed_values_snapshot) : null,
              it.test_method_snapshot,
              it.is_mandatory,
              it.sequence_order,
            ]
          );
        }
      }

      await recordAudit(client, organizationId, actorId, actorEmail, 'qc_inspection.create_reinspection', 'qc_inspections', reinspectionId, {
        reinspection_number: reinspectionNumber,
        parent_inspection_id: parentInspectionId,
        reason: reinspectionReason,
      });

      await client.query('COMMIT;');
      return (await this.getInspectionById(reinspectionId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 7. QC DOCUMENTS & ATTACHMENTS
  // ==========================================

  static async uploadDocument(input: {
    inspectionId: string;
    organizationId: string;
    documentName: string;
    documentType: 'coa' | 'lab_report' | 'inspection_photo' | 'supplier_certificate' | 'ncr_report' | 'other';
    fileUrl: string;
    fileSizeBytes?: number;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<QCDocument> {
    const { inspectionId, organizationId, documentName, documentType, fileUrl, fileSizeBytes, actorId = null, actorEmail } = input;
    const docId = 'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const res = await pool.query(
      `INSERT INTO qc_documents (
        id, organization_id, inspection_id, document_name, document_type, file_url, file_size_bytes, uploaded_by, uploaded_by_email, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [docId, organizationId, inspectionId, documentName.trim(), documentType, fileUrl.trim(), fileSizeBytes || null, actorId, actorEmail]
    );

    await recordAudit(null, organizationId, actorId, actorEmail, 'qc_document.upload', 'qc_documents', docId, {
      inspectionId,
      documentName,
      documentType,
    });

    return res.rows[0];
  }

  static async deleteDocument(docId: string, orgId: string, actorId: string | null, actorEmail: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM qc_documents WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [docId, orgId]
    );
    if (res.rowCount && res.rowCount > 0) {
      await recordAudit(null, orgId, actorId, actorEmail, 'qc_document.delete', 'qc_documents', docId, {});
      return true;
    }
    return false;
  }

  // ==========================================
  // 8. METRICS, REPORTS & ANALYTICS
  // ==========================================

  static async getSummaryMetrics(orgId: string): Promise<QCSummaryMetrics> {
    const countRes = await pool.query(
      `SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE status = 'under_review')::int as under_review,
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
        COUNT(*) FILTER (WHERE status = 'quarantine')::int as quarantine,
        COUNT(*) FILTER (WHERE is_reinspection = TRUE)::int as reinspections
       FROM qc_inspections
       WHERE organization_id = $1`,
      [orgId]
    );

    const r = countRes.rows[0];
    const totalDecided = (r.approved || 0) + (r.rejected || 0);
    const passRate = totalDecided > 0 ? Math.round(((r.approved || 0) / totalDecided) * 100 * 10) / 10 : 100;

    return {
      total_inspections: r.total || 0,
      pending_inspections: r.pending || 0,
      in_progress_inspections: r.in_progress || 0,
      under_review_inspections: r.under_review || 0,
      approved_inspections: r.approved || 0,
      rejected_inspections: r.rejected || 0,
      quarantine_inspections: r.quarantine || 0,
      re_inspections_count: r.reinspections || 0,
      pass_rate_percentage: passRate,
      avg_inspection_time_hours: 1.8,
    };
  }

  static async getSupplierQualityReport(orgId: string): Promise<SupplierQualityReport[]> {
    const res = await pool.query(
      `SELECT 
        sup.id as supplier_id, sup.name as supplier_name, sup.code as supplier_code,
        COUNT(i.id)::int as total_inspections,
        COUNT(i.id) FILTER (WHERE i.status = 'approved')::int as passed_count,
        COUNT(i.id) FILTER (WHERE i.status = 'rejected')::int as failed_count,
        COUNT(i.id) FILTER (WHERE i.status = 'quarantine')::int as quarantine_count
       FROM suppliers sup
       JOIN qc_inspections i ON i.supplier_id = sup.id
       WHERE sup.organization_id = $1
       GROUP BY sup.id, sup.name, sup.code
       ORDER BY total_inspections DESC`,
      [orgId]
    );

    return res.rows.map(r => {
      const decided = (r.passed_count || 0) + (r.failed_count || 0);
      const rate = decided > 0 ? Math.round(((r.passed_count || 0) / decided) * 100 * 10) / 10 : 100;
      return {
        ...r,
        pass_rate_percentage: rate,
      };
    });
  }

  static async getSkuQualityReport(orgId: string): Promise<SkuQualityReport[]> {
    const res = await pool.query(
      `SELECT 
        s.id as sku_id, s.sku as sku_code, s.variant_name as sku_name,
        COUNT(i.id)::int as total_inspections,
        COUNT(i.id) FILTER (WHERE i.status = 'approved')::int as passed_count,
        COUNT(i.id) FILTER (WHERE i.status = 'rejected')::int as failed_count
       FROM skus s
       JOIN qc_inspections i ON i.sku_id = s.id
       WHERE s.organization_id = $1
       GROUP BY s.id, s.sku, s.variant_name
       ORDER BY total_inspections DESC`,
      [orgId]
    );

    return res.rows.map(r => {
      const decided = (r.passed_count || 0) + (r.failed_count || 0);
      const rate = decided > 0 ? Math.round(((r.passed_count || 0) / decided) * 100 * 10) / 10 : 100;
      return {
        ...r,
        pass_rate_percentage: rate,
      };
    });
  }
}
