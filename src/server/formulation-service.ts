import { pool } from './db.ts';
import type {
  Formulation,
  FormulationComponent,
  FormulationSubstitution,
  FormulationSummaryMetrics,
  FormulationScalingResult,
  FormulationScaledComponent,
  FormulationComparisonResult,
  ComponentComparisonDiff,
  CreateFormulationPayload,
  FormulationStatus,
} from '../types/formulations.ts';

export class FormulationService {
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
      const logId = `aud-form-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, target_resource, entity_id, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          logId,
          orgId,
          actor.id,
          actor.email,
          action,
          'formulations',
          'formulation_recipe',
          entityId,
          entityId,
          JSON.stringify(details),
        ]
      );
    } catch (e) {
      console.warn('[Audit Log Warning] Failed to log audit event:', e);
    }
  }

  /**
   * Deep Recursive Circular BOM Dependency Detector
   * Ensures that finished SKU -> Component SKUs does not contain cycles at any depth.
   */
  public static async detectCircularDependency(
    orgId: string,
    targetFinishedSkuId: string,
    componentSkuIds: string[],
    clientOrPool: any = pool
  ): Promise<{ hasCycle: boolean; cyclePath?: string[] }> {
    // 1. Direct self-reference check
    if (componentSkuIds.includes(targetFinishedSkuId)) {
      return {
        hasCycle: true,
        cyclePath: [targetFinishedSkuId, targetFinishedSkuId],
      };
    }

    // 2. Fetch all existing active/draft formulation component edges in the organization
    const edgesRes = await clientOrPool.query(
      `SELECT f.finished_sku_id, fc.component_sku_id
       FROM formulations f
       JOIN formulation_components fc ON fc.formulation_id = f.id
       WHERE f.organization_id = $1 AND f.status != 'archived'`,
      [orgId]
    );

    // Build Adjacency Graph: parent_sku -> Set of child_skus
    const adjMap = new Map<string, Set<string>>();
    for (const row of edgesRes.rows) {
      if (!adjMap.has(row.finished_sku_id)) {
        adjMap.set(row.finished_sku_id, new Set());
      }
      adjMap.get(row.finished_sku_id)!.add(row.component_sku_id);
    }

    // Add proposed edges for the target formulation being created/updated
    if (!adjMap.has(targetFinishedSkuId)) {
      adjMap.set(targetFinishedSkuId, new Set());
    }
    for (const compSkuId of componentSkuIds) {
      adjMap.get(targetFinishedSkuId)!.add(compSkuId);
    }

    // Recursive Depth-First Search for cycle detection starting from targetFinishedSkuId
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    function dfs(currentSku: string): boolean {
      visited.add(currentSku);
      recursionStack.add(currentSku);
      path.push(currentSku);

      const neighbors = adjMap.get(currentSku);
      if (neighbors) {
        for (const nextSku of neighbors) {
          if (!visited.has(nextSku)) {
            if (dfs(nextSku)) return true;
          } else if (recursionStack.has(nextSku)) {
            path.push(nextSku);
            return true;
          }
        }
      }

      recursionStack.delete(currentSku);
      path.pop();
      return false;
    }

    if (dfs(targetFinishedSkuId)) {
      return { hasCycle: true, cyclePath: path };
    }

    return { hasCycle: false };
  }

  /**
   * List formulations with advanced multi-parameter filtering, search, and pagination
   */
  public static async listFormulations(
    orgId: string,
    filters: {
      search?: string;
      status?: string;
      finishedSkuId?: string;
      finishedProductId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: Formulation[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['f.organization_id = $1'];
    const params: any[] = [orgId];
    let pIdx = 2;

    if (filters.status && filters.status !== 'all') {
      conditions.push(`f.status = $${pIdx++}`);
      params.push(filters.status);
    }

    if (filters.finishedSkuId) {
      conditions.push(`f.finished_sku_id = $${pIdx++}`);
      params.push(filters.finishedSkuId);
    }

    if (filters.finishedProductId) {
      conditions.push(`f.finished_product_id = $${pIdx++}`);
      params.push(filters.finishedProductId);
    }

    if (filters.search && filters.search.trim() !== '') {
      const q = `%${filters.search.trim()}%`;
      conditions.push(`(
        f.formulation_code ILIKE $${pIdx} OR
        f.name ILIKE $${pIdx} OR
        s.sku ILIKE $${pIdx} OR
        p.name ILIKE $${pIdx} OR
        f.version ILIKE $${pIdx}
      )`);
      params.push(q);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    // Total Count
    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT f.id) as total
       FROM formulations f
       JOIN skus s ON s.id = f.finished_sku_id
       LEFT JOIN products p ON p.id = f.finished_product_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // List Query with component counts and unit metadata
    const listRes = await pool.query(
      `SELECT 
        f.id, f.organization_id, f.formulation_code, f.name, f.finished_product_id, f.finished_sku_id,
        f.version, f.version_major, f.version_minor, f.description,
        f.batch_size, f.batch_size_unit_id, bu.short_code as batch_size_unit_code,
        f.expected_yield, f.expected_yield_unit_id, yu.short_code as expected_yield_unit_code,
        f.expected_wastage_quantity, f.expected_wastage_unit_id, wu.short_code as expected_wastage_unit_code,
        f.effective_from, f.effective_to, f.status, f.qc_template_id,
        qt.name as qc_template_name,
        f.notes, f.created_by_email, f.approved_by_email, f.approved_at, f.activated_at, f.archived_at,
        f.created_at, f.updated_at,
        s.sku as finished_sku_code, s.variant_name as finished_sku_name,
        p.name as finished_product_name,
        (
          SELECT COUNT(*) FROM formulation_components fc WHERE fc.formulation_id = f.id
        ) as component_count,
        COALESCE(fc_cost.total_material_cost, 0) as estimated_total_cost,
        COALESCE(fc_cost.cost_per_batch_unit, 0) as cost_per_batch_unit,
        COALESCE(fc_cost.cost_per_yield_unit, 0) as cost_per_yield_unit
       FROM formulations f
       JOIN skus s ON s.id = f.finished_sku_id
       LEFT JOIN products p ON p.id = f.finished_product_id
       LEFT JOIN units bu ON bu.id = f.batch_size_unit_id
       LEFT JOIN units yu ON yu.id = f.expected_yield_unit_id
       LEFT JOIN units wu ON wu.id = f.expected_wastage_unit_id
       LEFT JOIN qc_templates qt ON qt.id = f.qc_template_id
       LEFT JOIN formulation_costings fc_cost ON fc_cost.formulation_id = f.id AND fc_cost.cost_basis = 'standard_cost'
       WHERE ${whereClause}
       ORDER BY f.updated_at DESC
       LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      [...params, limit, offset]
    );

    const items: Formulation[] = listRes.rows.map(r => {
      const batchSize = Number(r.batch_size);
      const expectedYield = Number(r.expected_yield);
      const yieldPct = batchSize > 0 ? (expectedYield / batchSize) * 100 : 0;

      return {
        id: r.id,
        organization_id: r.organization_id,
        formulation_code: r.formulation_code,
        name: r.name,
        finished_product_id: r.finished_product_id,
        finished_product_name: r.finished_product_name,
        finished_sku_id: r.finished_sku_id,
        finished_sku_code: r.finished_sku_code,
        finished_sku_name: r.finished_sku_name,
        version: r.version,
        version_major: r.version_major,
        version_minor: r.version_minor,
        description: r.description,
        batch_size: batchSize,
        batch_size_unit_id: r.batch_size_unit_id,
        batch_size_unit_code: r.batch_size_unit_code || 'units',
        expected_yield: expectedYield,
        expected_yield_unit_id: r.expected_yield_unit_id,
        expected_yield_unit_code: r.expected_yield_unit_code || 'units',
        expected_wastage_quantity: Number(r.expected_wastage_quantity || 0),
        expected_wastage_unit_id: r.expected_wastage_unit_id,
        expected_wastage_unit_code: r.expected_wastage_unit_code,
        yield_percentage: Math.round(yieldPct * 100) / 100,
        effective_from: r.effective_from,
        effective_to: r.effective_to,
        status: r.status as FormulationStatus,
        qc_template_id: r.qc_template_id,
        qc_template_name: r.qc_template_name,
        notes: r.notes,
        created_by_email: r.created_by_email,
        approved_by_email: r.approved_by_email,
        approved_at: r.approved_at,
        activated_at: r.activated_at,
        archived_at: r.archived_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        estimated_total_cost: Number(r.estimated_total_cost || 0),
        cost_per_batch_unit: Number(r.cost_per_batch_unit || 0),
        cost_per_yield_unit: Number(r.cost_per_yield_unit || 0),
      };
    });

    return { data: items, total, page, limit };
  }

  /**
   * Get single Formulation in full detail with components, substitutions, cost rollup, and version history
   */
  public static async getFormulationById(
    orgId: string,
    id: string
  ): Promise<Formulation | null> {
    const fRes = await pool.query(
      `SELECT 
        f.id, f.organization_id, f.formulation_code, f.name, f.finished_product_id, f.finished_sku_id,
        f.version, f.version_major, f.version_minor, f.description,
        f.batch_size, f.batch_size_unit_id, bu.short_code as batch_size_unit_code,
        f.expected_yield, f.expected_yield_unit_id, yu.short_code as expected_yield_unit_code,
        f.expected_wastage_quantity, f.expected_wastage_unit_id, wu.short_code as expected_wastage_unit_code,
        f.effective_from, f.effective_to, f.status, f.qc_template_id,
        qt.name as qc_template_name,
        f.notes, f.created_by_email, f.approved_by_email, f.approved_at, f.activated_at, f.archived_at,
        f.created_at, f.updated_at,
        s.sku as finished_sku_code, s.variant_name as finished_sku_name,
        p.name as finished_product_name
       FROM formulations f
       JOIN skus s ON s.id = f.finished_sku_id
       LEFT JOIN products p ON p.id = f.finished_product_id
       LEFT JOIN units bu ON bu.id = f.batch_size_unit_id
       LEFT JOIN units yu ON yu.id = f.expected_yield_unit_id
       LEFT JOIN units wu ON wu.id = f.expected_wastage_unit_id
       LEFT JOIN qc_templates qt ON qt.id = f.qc_template_id
       WHERE f.id = $1 AND f.organization_id = $2`,
      [id, orgId]
    );

    if (fRes.rows.length === 0) return null;
    const r = fRes.rows[0];

    // Fetch Components with SKU and Cost Details
    const compRes = await pool.query(
      `SELECT 
        fc.id, fc.organization_id, fc.formulation_id, fc.component_product_id, fc.component_sku_id,
        fc.component_type, fc.quantity, fc.unit_id, u.short_code as unit_code, u.name as unit_name,
        fc.sequence_order, fc.percentage, fc.wastage_allowance_percentage,
        fc.is_optional, fc.is_substitutable, fc.notes,
        s.sku as component_sku_code, s.variant_name as component_sku_name, s.cost_price,
        p.name as component_product_name
       FROM formulation_components fc
       JOIN skus s ON s.id = fc.component_sku_id
       LEFT JOIN products p ON p.id = fc.component_product_id OR p.id = s.product_id
       LEFT JOIN units u ON u.id = fc.unit_id
       WHERE fc.formulation_id = $1 AND fc.organization_id = $2
       ORDER BY fc.sequence_order ASC, fc.created_at ASC`,
      [id, orgId]
    );

    // Fetch Substitutions
    const substRes = await pool.query(
      `SELECT 
        fs.id, fs.organization_id, fs.formulation_id, fs.primary_component_id, fs.alternate_sku_id,
        fs.conversion_factor, fs.preference_priority, fs.substitution_group, fs.status, fs.notes,
        s.sku as alternate_sku_code, s.variant_name as alternate_sku_name
       FROM formulation_substitutions fs
       JOIN skus s ON s.id = fs.alternate_sku_id
       WHERE fs.formulation_id = $1 AND fs.organization_id = $2
       ORDER BY fs.preference_priority ASC`,
      [id, orgId]
    );

    const substMap = new Map<string, FormulationSubstitution[]>();
    for (const sub of substRes.rows) {
      const list = substMap.get(sub.primary_component_id) || [];
      list.push({
        id: sub.id,
        organization_id: sub.organization_id,
        formulation_id: sub.formulation_id,
        primary_component_id: sub.primary_component_id,
        alternate_sku_id: sub.alternate_sku_id,
        alternate_sku_code: sub.alternate_sku_code,
        alternate_sku_name: sub.alternate_sku_name,
        conversion_factor: Number(sub.conversion_factor),
        preference_priority: sub.preference_priority,
        substitution_group: sub.substitution_group,
        status: sub.status,
        notes: sub.notes,
      });
      substMap.set(sub.primary_component_id, list);
    }

    let calculatedTotalMaterialCost = 0;
    const components: FormulationComponent[] = compRes.rows.map(c => {
      const qty = Number(c.quantity);
      const wastagePct = Number(c.wastage_allowance_percentage || 0);
      const grossQty = qty * (1 + wastagePct / 100);
      const unitCost = Number(c.cost_price || 0);
      const estimatedComponentCost = Math.round(grossQty * unitCost * 100) / 100;
      calculatedTotalMaterialCost += estimatedComponentCost;

      return {
        id: c.id,
        organization_id: c.organization_id,
        formulation_id: c.formulation_id,
        component_product_id: c.component_product_id,
        component_sku_id: c.component_sku_id,
        component_sku_code: c.component_sku_code,
        component_sku_name: c.component_sku_name,
        component_product_name: c.component_product_name,
        component_type: c.component_type,
        quantity: qty,
        unit_id: c.unit_id,
        unit_code: c.unit_code || 'units',
        unit_name: c.unit_name,
        sequence_order: c.sequence_order,
        percentage: c.percentage ? Number(c.percentage) : null,
        wastage_allowance_percentage: wastagePct,
        is_optional: Boolean(c.is_optional),
        is_substitutable: Boolean(c.is_substitutable),
        notes: c.notes,
        estimated_unit_cost: unitCost,
        estimated_component_cost: estimatedComponentCost,
        substitutions: substMap.get(c.id) || [],
      };
    });

    // Fetch Version History for the same SKU
    const vHistRes = await pool.query(
      `SELECT id, version, status, created_at, (status = 'active') as is_active
       FROM formulations
       WHERE organization_id = $1 AND finished_sku_id = $2
       ORDER BY created_at DESC`,
      [orgId, r.finished_sku_id]
    );

    const batchSize = Number(r.batch_size);
    const expectedYield = Number(r.expected_yield);
    const yieldPct = batchSize > 0 ? (expectedYield / batchSize) * 100 : 0;
    const costPerBatch = batchSize > 0 ? calculatedTotalMaterialCost / batchSize : 0;
    const costPerYield = expectedYield > 0 ? calculatedTotalMaterialCost / expectedYield : 0;

    return {
      id: r.id,
      organization_id: r.organization_id,
      formulation_code: r.formulation_code,
      name: r.name,
      finished_product_id: r.finished_product_id,
      finished_product_name: r.finished_product_name,
      finished_sku_id: r.finished_sku_id,
      finished_sku_code: r.finished_sku_code,
      finished_sku_name: r.finished_sku_name,
      version: r.version,
      version_major: r.version_major,
      version_minor: r.version_minor,
      description: r.description,
      batch_size: batchSize,
      batch_size_unit_id: r.batch_size_unit_id,
      batch_size_unit_code: r.batch_size_unit_code || 'units',
      expected_yield: expectedYield,
      expected_yield_unit_id: r.expected_yield_unit_id,
      expected_yield_unit_code: r.expected_yield_unit_code || 'units',
      expected_wastage_quantity: Number(r.expected_wastage_quantity || 0),
      expected_wastage_unit_id: r.expected_wastage_unit_id,
      expected_wastage_unit_code: r.expected_wastage_unit_code,
      yield_percentage: Math.round(yieldPct * 100) / 100,
      effective_from: r.effective_from,
      effective_to: r.effective_to,
      status: r.status as FormulationStatus,
      qc_template_id: r.qc_template_id,
      qc_template_name: r.qc_template_name,
      notes: r.notes,
      created_by_email: r.created_by_email,
      approved_by_email: r.approved_by_email,
      approved_at: r.approved_at,
      activated_at: r.activated_at,
      archived_at: r.archived_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      components,
      estimated_total_cost: Math.round(calculatedTotalMaterialCost * 100) / 100,
      cost_per_batch_unit: Math.round(costPerBatch * 10000) / 10000,
      cost_per_yield_unit: Math.round(costPerYield * 10000) / 10000,
      version_history: vHistRes.rows.map(vh => ({
        id: vh.id,
        version: vh.version,
        status: vh.status,
        created_at: vh.created_at,
        is_active: Boolean(vh.is_active),
      })),
    };
  }

  /**
   * Create New Formulation with Components and Substitutions (Transactional)
   */
  public static async createFormulation(
    orgId: string,
    actor: { id: string | null; email: string },
    payload: CreateFormulationPayload
  ): Promise<Formulation> {
    // 1. Validation
    if (!payload.formulation_code || payload.formulation_code.trim() === '') {
      throw new Error('Formulation code is required.');
    }
    if (!payload.name || payload.name.trim() === '') {
      throw new Error('Formulation name is required.');
    }
    if (!payload.finished_sku_id) {
      throw new Error('Finished Product / SKU is required.');
    }
    if (!payload.batch_size || payload.batch_size <= 0) {
      throw new Error('Batch size must be greater than 0.');
    }
    if (!payload.batch_size_unit_id) {
      throw new Error('Batch size unit is required.');
    }
    if (payload.expected_yield === undefined || payload.expected_yield < 0) {
      throw new Error('Expected yield cannot be negative.');
    }
    if (!payload.expected_yield_unit_id) {
      throw new Error('Expected yield unit is required.');
    }
    if (!payload.components || payload.components.length === 0) {
      throw new Error('Formulation must contain at least one component / ingredient.');
    }

    const version = payload.version?.trim() || '1.0';
    const versionParts = version.split('.').map(p => parseInt(p, 10));
    const versionMajor = !isNaN(versionParts[0]) ? versionParts[0] : 1;
    const versionMinor = !isNaN(versionParts[1]) ? versionParts[1] : 0;

    const componentSkuIds = payload.components.map(c => c.component_sku_id);

    // 2. Validate Circular BOM Protection
    const cycleCheck = await this.detectCircularDependency(orgId, payload.finished_sku_id, componentSkuIds);
    if (cycleCheck.hasCycle) {
      throw new Error(
        `Circular BOM dependency detected: Finished product cannot depend on itself directly or indirectly (${cycleCheck.cyclePath?.join(' -> ')}).`
      );
    }

    // 3. Begin Transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Verify Finished SKU belongs to organization
      const skuCheck = await client.query(
        'SELECT product_id FROM skus WHERE id = $1 AND organization_id = $2',
        [payload.finished_sku_id, orgId]
      );
      if (skuCheck.rows.length === 0) {
        throw new Error('Selected Finished SKU does not exist in the active organization.');
      }
      const finishedProductId = payload.finished_product_id || skuCheck.rows[0].product_id;

      // Check unique version per finished SKU
      const verCheck = await client.query(
        'SELECT id FROM formulations WHERE organization_id = $1 AND finished_sku_id = $2 AND version = $3',
        [orgId, payload.finished_sku_id, version]
      );
      if (verCheck.rows.length > 0) {
        throw new Error(`Version ${version} already exists for this finished SKU.`);
      }

      const formId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Insert Formulation
      await client.query(
        `INSERT INTO formulations (
          id, organization_id, formulation_code, name, finished_product_id, finished_sku_id,
          version, version_major, version_minor, description, batch_size, batch_size_unit_id,
          expected_yield, expected_yield_unit_id, expected_wastage_quantity, expected_wastage_unit_id,
          effective_from, effective_to, status, qc_template_id, notes, created_by, created_by_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'draft', $19, $20, $21, $22)`,
        [
          formId,
          orgId,
          payload.formulation_code.trim().toUpperCase(),
          payload.name.trim(),
          finishedProductId,
          payload.finished_sku_id,
          version,
          versionMajor,
          versionMinor,
          payload.description?.trim() || null,
          payload.batch_size,
          payload.batch_size_unit_id,
          payload.expected_yield,
          payload.expected_yield_unit_id,
          payload.expected_wastage_quantity || 0,
          payload.expected_wastage_unit_id || null,
          payload.effective_from || null,
          payload.effective_to || null,
          payload.qc_template_id || null,
          payload.notes?.trim() || null,
          actor.id,
          actor.email,
        ]
      );

      // Insert Components
      const insertedComponentIds: string[] = [];
      let seq = 1;
      for (const comp of payload.components) {
        if (!comp.component_sku_id) throw new Error('Each component must have a valid SKU.');
        if (!comp.quantity || comp.quantity <= 0) throw new Error('Component quantity must be greater than 0.');
        if (!comp.unit_id) throw new Error('Component unit is required.');

        // Verify component SKU belongs to organization
        const compSkuRes = await client.query(
          'SELECT product_id FROM skus WHERE id = $1 AND organization_id = $2',
          [comp.component_sku_id, orgId]
        );
        if (compSkuRes.rows.length === 0) {
          throw new Error(`Component SKU ${comp.component_sku_id} not found in this organization.`);
        }

        const compId = `comp-${Date.now()}-${seq}-${Math.random().toString(36).substr(2, 4)}`;
        insertedComponentIds.push(compId);

        await client.query(
          `INSERT INTO formulation_components (
            id, organization_id, formulation_id, component_product_id, component_sku_id,
            component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
            is_optional, is_substitutable, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            compId,
            orgId,
            formId,
            comp.component_product_id || compSkuRes.rows[0].product_id,
            comp.component_sku_id,
            comp.component_type || 'raw_material',
            comp.quantity,
            comp.unit_id,
            comp.sequence_order || seq,
            comp.percentage || null,
            comp.wastage_allowance_percentage || 0,
            Boolean(comp.is_optional),
            Boolean(comp.is_substitutable),
            comp.notes?.trim() || null,
          ]
        );
        seq++;
      }

      // Insert Substitutions if any
      if (payload.substitutions && payload.substitutions.length > 0) {
        let subSeq = 1;
        for (const sub of payload.substitutions) {
          let primaryCompId = sub.primary_component_id;
          if (!primaryCompId && sub.primary_component_index !== undefined) {
            primaryCompId = insertedComponentIds[sub.primary_component_index];
          }
          if (!primaryCompId) continue;

          const substId = `subst-${Date.now()}-${subSeq}-${Math.random().toString(36).substr(2, 4)}`;
          await client.query(
            `INSERT INTO formulation_substitutions (
              id, organization_id, formulation_id, primary_component_id, alternate_sku_id,
              conversion_factor, preference_priority, substitution_group, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9)`,
            [
              substId,
              orgId,
              formId,
              primaryCompId,
              sub.alternate_sku_id,
              sub.conversion_factor || 1.0,
              sub.preference_priority || subSeq,
              sub.substitution_group || null,
              sub.notes || null,
            ]
          );
          subSeq++;
        }
      }

      await this.logAudit(client, orgId, actor, 'formulation.create', formId, {
        code: payload.formulation_code,
        name: payload.name,
        version,
        componentsCount: payload.components.length,
      });

      await client.query('COMMIT;');

      return (await this.getFormulationById(orgId, formId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update Draft or Under-Review Formulation
   */
  public static async updateFormulation(
    orgId: string,
    id: string,
    actor: { id: string | null; email: string },
    payload: Partial<CreateFormulationPayload>
  ): Promise<Formulation> {
    const existing = await this.getFormulationById(orgId, id);
    if (!existing) throw new Error('Formulation not found.');

    if (existing.status !== 'draft' && existing.status !== 'under_review') {
      throw new Error(
        `Cannot edit a formulation in '${existing.status}' status. Create a new version (e.g., v${existing.version_major}.${existing.version_minor + 1}) to make changes to approved or active recipes.`
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // If components provided, perform circular dependency validation
      if (payload.components && payload.components.length > 0) {
        const componentSkuIds = payload.components.map(c => c.component_sku_id);
        const cycleCheck = await this.detectCircularDependency(orgId, existing.finished_sku_id, componentSkuIds);
        if (cycleCheck.hasCycle) {
          throw new Error(
            `Circular BOM dependency detected: ${cycleCheck.cyclePath?.join(' -> ')}`
          );
        }
      }

      // Update Header
      await client.query(
        `UPDATE formulations SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          batch_size = COALESCE($3, batch_size),
          batch_size_unit_id = COALESCE($4, batch_size_unit_id),
          expected_yield = COALESCE($5, expected_yield),
          expected_yield_unit_id = COALESCE($6, expected_yield_unit_id),
          expected_wastage_quantity = COALESCE($7, expected_wastage_quantity),
          expected_wastage_unit_id = COALESCE($8, expected_wastage_unit_id),
          effective_from = COALESCE($9, effective_from),
          effective_to = COALESCE($10, effective_to),
          qc_template_id = COALESCE($11, qc_template_id),
          notes = COALESCE($12, notes),
          updated_by = $13,
          updated_by_email = $14,
          updated_at = NOW()
        WHERE id = $15 AND organization_id = $16`,
        [
          payload.name?.trim() || null,
          payload.description !== undefined ? payload.description : null,
          payload.batch_size || null,
          payload.batch_size_unit_id || null,
          payload.expected_yield !== undefined ? payload.expected_yield : null,
          payload.expected_yield_unit_id || null,
          payload.expected_wastage_quantity !== undefined ? payload.expected_wastage_quantity : null,
          payload.expected_wastage_unit_id !== undefined ? payload.expected_wastage_unit_id : null,
          payload.effective_from !== undefined ? payload.effective_from : null,
          payload.effective_to !== undefined ? payload.effective_to : null,
          payload.qc_template_id !== undefined ? payload.qc_template_id : null,
          payload.notes !== undefined ? payload.notes : null,
          actor.id,
          actor.email,
          id,
          orgId,
        ]
      );

      // If components provided, replace them
      if (payload.components && payload.components.length > 0) {
        await client.query('DELETE FROM formulation_components WHERE formulation_id = $1', [id]);
        await client.query('DELETE FROM formulation_substitutions WHERE formulation_id = $1', [id]);

        const insertedComponentIds: string[] = [];
        let seq = 1;
        for (const comp of payload.components) {
          const compSkuRes = await client.query(
            'SELECT product_id FROM skus WHERE id = $1 AND organization_id = $2',
            [comp.component_sku_id, orgId]
          );
          if (compSkuRes.rows.length === 0) {
            throw new Error(`Component SKU ${comp.component_sku_id} not found in this organization.`);
          }

          const compId = `comp-${Date.now()}-${seq}-${Math.random().toString(36).substr(2, 4)}`;
          insertedComponentIds.push(compId);

          await client.query(
            `INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              compId,
              orgId,
              id,
              comp.component_product_id || compSkuRes.rows[0].product_id,
              comp.component_sku_id,
              comp.component_type || 'raw_material',
              comp.quantity,
              comp.unit_id,
              comp.sequence_order || seq,
              comp.percentage || null,
              comp.wastage_allowance_percentage || 0,
              Boolean(comp.is_optional),
              Boolean(comp.is_substitutable),
              comp.notes?.trim() || null,
            ]
          );
          seq++;
        }

        // Re-insert substitutions
        if (payload.substitutions && payload.substitutions.length > 0) {
          let subSeq = 1;
          for (const sub of payload.substitutions) {
            let primaryCompId = sub.primary_component_id;
            if (!primaryCompId && sub.primary_component_index !== undefined) {
              primaryCompId = insertedComponentIds[sub.primary_component_index];
            }
            if (!primaryCompId) continue;

            const substId = `subst-${Date.now()}-${subSeq}-${Math.random().toString(36).substr(2, 4)}`;
            await client.query(
              `INSERT INTO formulation_substitutions (
                id, organization_id, formulation_id, primary_component_id, alternate_sku_id,
                conversion_factor, preference_priority, substitution_group, status, notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9)`,
              [
                substId,
                orgId,
                id,
                primaryCompId,
                sub.alternate_sku_id,
                sub.conversion_factor || 1.0,
                sub.preference_priority || subSeq,
                sub.substitution_group || null,
                sub.notes || null,
              ]
            );
            subSeq++;
          }
        }
      }

      await this.logAudit(client, orgId, actor, 'formulation.update', id, {
        name: payload.name,
        componentsUpdated: Boolean(payload.components),
      });

      await client.query('COMMIT;');

      return (await this.getFormulationById(orgId, id))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Versioning: Clone formulation to create a new Draft version (e.g. 1.0 -> 1.1 or 2.0)
   */
  public static async createNewVersion(
    orgId: string,
    sourceFormulationId: string,
    actor: { id: string | null; email: string },
    options: {
      versionType: 'major' | 'minor' | 'custom';
      customVersion?: string;
      notes?: string;
    }
  ): Promise<Formulation> {
    const source = await this.getFormulationById(orgId, sourceFormulationId);
    if (!source) throw new Error('Source formulation not found.');

    let newMajor = source.version_major;
    let newMinor = source.version_minor;
    let newVersion = '';

    if (options.versionType === 'major') {
      newMajor = source.version_major + 1;
      newMinor = 0;
      newVersion = `${newMajor}.0`;
    } else if (options.versionType === 'minor') {
      newMinor = source.version_minor + 1;
      newVersion = `${newMajor}.${newMinor}`;
    } else {
      if (!options.customVersion || options.customVersion.trim() === '') {
        throw new Error('Custom version number is required.');
      }
      newVersion = options.customVersion.trim();
      const parts = newVersion.split('.').map(p => parseInt(p, 10));
      newMajor = !isNaN(parts[0]) ? parts[0] : source.version_major + 1;
      newMinor = !isNaN(parts[1]) ? parts[1] : 0;
    }

    // Check version uniqueness for this SKU
    const verCheck = await pool.query(
      'SELECT id FROM formulations WHERE organization_id = $1 AND finished_sku_id = $2 AND version = $3',
      [orgId, source.finished_sku_id, newVersion]
    );
    if (verCheck.rows.length > 0) {
      throw new Error(`Version ${newVersion} already exists for ${source.finished_sku_code}.`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const newFormId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      await client.query(
        `INSERT INTO formulations (
          id, organization_id, formulation_code, name, finished_product_id, finished_sku_id,
          version, version_major, version_minor, description, batch_size, batch_size_unit_id,
          expected_yield, expected_yield_unit_id, expected_wastage_quantity, expected_wastage_unit_id,
          effective_from, effective_to, status, qc_template_id, notes, created_by, created_by_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'draft', $19, $20, $21, $22)`,
        [
          newFormId,
          orgId,
          source.formulation_code,
          `${source.name} (v${newVersion})`,
          source.finished_product_id,
          source.finished_sku_id,
          newVersion,
          newMajor,
          newMinor,
          source.description,
          source.batch_size,
          source.batch_size_unit_id,
          source.expected_yield,
          source.expected_yield_unit_id,
          source.expected_wastage_quantity,
          source.expected_wastage_unit_id,
          null, // Effective dates will be set on activation
          null,
          source.qc_template_id,
          options.notes?.trim() || `Cloned from v${source.version}`,
          actor.id,
          actor.email,
        ]
      );

      // Deep copy components & map old component IDs to new component IDs
      const compIdMap = new Map<string, string>();
      if (source.components && source.components.length > 0) {
        let seq = 1;
        for (const c of source.components) {
          const newCompId = `comp-${Date.now()}-${seq}-${Math.random().toString(36).substr(2, 4)}`;
          compIdMap.set(c.id, newCompId);

          await client.query(
            `INSERT INTO formulation_components (
              id, organization_id, formulation_id, component_product_id, component_sku_id,
              component_type, quantity, unit_id, sequence_order, percentage, wastage_allowance_percentage,
              is_optional, is_substitutable, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              newCompId,
              orgId,
              newFormId,
              c.component_product_id,
              c.component_sku_id,
              c.component_type,
              c.quantity,
              c.unit_id,
              c.sequence_order,
              c.percentage,
              c.wastage_allowance_percentage,
              c.is_optional,
              c.is_substitutable,
              c.notes,
            ]
          );
          seq++;
        }
      }

      // Deep copy substitutions
      if (source.substitutions && source.substitutions.length > 0) {
        let subSeq = 1;
        for (const sub of source.substitutions) {
          const newPrimaryCompId = compIdMap.get(sub.primary_component_id);
          if (!newPrimaryCompId) continue;

          const newSubId = `subst-${Date.now()}-${subSeq}-${Math.random().toString(36).substr(2, 4)}`;
          await client.query(
            `INSERT INTO formulation_substitutions (
              id, organization_id, formulation_id, primary_component_id, alternate_sku_id,
              conversion_factor, preference_priority, substitution_group, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              newSubId,
              orgId,
              newFormId,
              newPrimaryCompId,
              sub.alternate_sku_id,
              sub.conversion_factor,
              sub.preference_priority,
              sub.substitution_group,
              sub.status,
              sub.notes,
            ]
          );
          subSeq++;
        }
      }

      await this.logAudit(client, orgId, actor, 'formulation.version_created', newFormId, {
        sourceVersion: source.version,
        newVersion,
        skuCode: source.finished_sku_code,
      });

      await client.query('COMMIT;');

      return (await this.getFormulationById(orgId, newFormId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lifecycle State Transition: Submit for Review
   */
  public static async submitForReview(
    orgId: string,
    id: string,
    actor: { id: string | null; email: string }
  ): Promise<Formulation> {
    const f = await this.getFormulationById(orgId, id);
    if (!f) throw new Error('Formulation not found.');
    if (f.status !== 'draft') {
      throw new Error(`Only draft formulations can be submitted for review. Current status: ${f.status}`);
    }
    if (!f.components || f.components.length === 0) {
      throw new Error('Formulation cannot be submitted without at least one component.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query(
        `UPDATE formulations SET status = 'under_review', updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
        [id, orgId]
      );
      await this.logAudit(client, orgId, actor, 'formulation.submit_review', id, { version: f.version });
      await client.query('COMMIT;');
      return (await this.getFormulationById(orgId, id))!;
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Lifecycle State Transition: Approve Formulation
   */
  public static async approveFormulation(
    orgId: string,
    id: string,
    actor: { id: string | null; email: string }
  ): Promise<Formulation> {
    const f = await this.getFormulationById(orgId, id);
    if (!f) throw new Error('Formulation not found.');
    if (f.status !== 'under_review' && f.status !== 'draft') {
      throw new Error(`Formulation cannot be approved from '${f.status}' status.`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query(
        `UPDATE formulations SET 
          status = 'approved',
          approved_by = $1,
          approved_by_email = $2,
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = $3 AND organization_id = $4`,
        [actor.id, actor.email, id, orgId]
      );
      await this.logAudit(client, orgId, actor, 'formulation.approve', id, {
        version: f.version,
        approvedBy: actor.email,
      });
      await client.query('COMMIT;');
      return (await this.getFormulationById(orgId, id))!;
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Lifecycle State Transition: Activate Approved Formulation
   * Guarantees no overlapping active versions by safely retiring previous active recipes.
   */
  public static async activateFormulation(
    orgId: string,
    id: string,
    actor: { id: string | null; email: string },
    effectiveFrom?: string
  ): Promise<Formulation> {
    const f = await this.getFormulationById(orgId, id);
    if (!f) throw new Error('Formulation not found.');
    if (f.status !== 'approved' && f.status !== 'inactive') {
      throw new Error(`Only approved or inactive formulations can be activated. Current status: ${f.status}`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Deactivate any currently active formulation for this finished SKU
      const existingActiveRes = await client.query(
        `SELECT id, version FROM formulations 
         WHERE organization_id = $1 AND finished_sku_id = $2 AND status = 'active' AND id != $3`,
        [orgId, f.finished_sku_id, id]
      );

      for (const prev of existingActiveRes.rows) {
        await client.query(
          `UPDATE formulations SET 
            status = 'inactive',
            effective_to = CURRENT_DATE,
            updated_at = NOW()
           WHERE id = $1`,
          [prev.id]
        );
        await this.logAudit(client, orgId, actor, 'formulation.superseded_deactivate', prev.id, {
          supersededByVersion: f.version,
          supersededById: id,
        });
      }

      // Activate current version
      const fromDate = effectiveFrom || new Date().toISOString().split('T')[0];
      await client.query(
        `UPDATE formulations SET 
          status = 'active',
          effective_from = $1,
          effective_to = NULL,
          activated_at = NOW(),
          updated_at = NOW()
        WHERE id = $2 AND organization_id = $3`,
        [fromDate, id, orgId]
      );

      await this.logAudit(client, orgId, actor, 'formulation.activate', id, {
        version: f.version,
        effectiveFrom: fromDate,
        supersededVersionsCount: existingActiveRes.rows.length,
      });

      await client.query('COMMIT;');
      return (await this.getFormulationById(orgId, id))!;
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Lifecycle State Transition: Deactivate Formulation
   */
  public static async deactivateFormulation(
    orgId: string,
    id: string,
    actor: { id: string | null; email: string }
  ): Promise<Formulation> {
    const f = await this.getFormulationById(orgId, id);
    if (!f) throw new Error('Formulation not found.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query(
        `UPDATE formulations SET 
          status = 'inactive',
          effective_to = CURRENT_DATE,
          updated_at = NOW()
        WHERE id = $1 AND organization_id = $2`,
        [id, orgId]
      );
      await this.logAudit(client, orgId, actor, 'formulation.deactivate', id, { version: f.version });
      await client.query('COMMIT;');
      return (await this.getFormulationById(orgId, id))!;
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Lifecycle State Transition: Archive Formulation
   */
  public static async archiveFormulation(
    orgId: string,
    id: string,
    actor: { id: string | null; email: string }
  ): Promise<Formulation> {
    const f = await this.getFormulationById(orgId, id);
    if (!f) throw new Error('Formulation not found.');
    if (f.status === 'active') {
      throw new Error('Active formulations must be deactivated before archiving.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query(
        `UPDATE formulations SET 
          status = 'archived',
          archived_at = NOW(),
          updated_at = NOW()
        WHERE id = $1 AND organization_id = $2`,
        [id, orgId]
      );
      await this.logAudit(client, orgId, actor, 'formulation.archive', id, { version: f.version });
      await client.query('COMMIT;');
      return (await this.getFormulationById(orgId, id))!;
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Batch Scaling Simulation Engine
   * Calculates scaled component quantities and yields based on target batch volume
   */
  public static async scaleBatch(
    orgId: string,
    formulationId: string,
    targetBatchSize: number
  ): Promise<FormulationScalingResult> {
    if (!targetBatchSize || targetBatchSize <= 0) {
      throw new Error('Target batch size must be greater than 0.');
    }

    const f = await this.getFormulationById(orgId, formulationId);
    if (!f) throw new Error('Formulation not found.');

    const scalingRatio = targetBatchSize / f.batch_size;
    const scaledExpectedYield = Math.round(f.expected_yield * scalingRatio * 10000) / 10000;
    const scaledExpectedWastage = Math.round(f.expected_wastage_quantity * scalingRatio * 10000) / 10000;

    let totalScaledMaterialCost = 0;
    const scaledComponents: FormulationScaledComponent[] = (f.components || []).map(comp => {
      const baseQty = comp.quantity;
      const scaledNetQty = Math.round(baseQty * scalingRatio * 10000) / 10000;
      const wastagePct = comp.wastage_allowance_percentage || 0;
      const scaledGrossQty = Math.round(scaledNetQty * (1 + wastagePct / 100) * 10000) / 10000;
      const unitCost = comp.estimated_unit_cost || 0;
      const compScaledCost = Math.round(scaledGrossQty * unitCost * 100) / 100;
      totalScaledMaterialCost += compScaledCost;

      return {
        component_sku_id: comp.component_sku_id,
        component_sku_code: comp.component_sku_code || '',
        component_sku_name: comp.component_sku_name || '',
        component_type: comp.component_type,
        base_quantity: baseQty,
        scaled_quantity: scaledNetQty,
        unit_code: comp.unit_code || 'units',
        wastage_allowance_percentage: wastagePct,
        scaled_gross_quantity: scaledGrossQty,
        estimated_unit_cost: unitCost,
        scaled_estimated_cost: compScaledCost,
      };
    });

    const costPerScaledUnit =
      scaledExpectedYield > 0 ? Math.round((totalScaledMaterialCost / scaledExpectedYield) * 10000) / 10000 : 0;

    return {
      formulation_id: f.id,
      formulation_code: f.formulation_code,
      formulation_name: f.name,
      version: f.version,
      base_batch_size: f.batch_size,
      target_batch_size: targetBatchSize,
      batch_unit: f.batch_size_unit_code || 'units',
      scaling_ratio: Math.round(scalingRatio * 10000) / 10000,
      base_expected_yield: f.expected_yield,
      scaled_expected_yield: scaledExpectedYield,
      yield_percentage: f.yield_percentage || (targetBatchSize > 0 ? Math.round((scaledExpectedYield / targetBatchSize) * 10000) / 100 : 0),
      base_expected_wastage: f.expected_wastage_quantity,
      scaled_expected_wastage: scaledExpectedWastage,
      components: scaledComponents,
      total_scaled_material_cost: Math.round(totalScaledMaterialCost * 100) / 100,
      cost_per_scaled_unit: costPerScaledUnit,
    };
  }

  /**
   * Version Comparison Workbench Engine
   * Compares two formulation revisions (e.g. v1.0 vs v1.1) and outputs deep component & metric diffs.
   */
  public static async compareVersions(
    orgId: string,
    id1: string,
    id2: string
  ): Promise<FormulationComparisonResult> {
    const v1 = await this.getFormulationById(orgId, id1);
    const v2 = await this.getFormulationById(orgId, id2);

    if (!v1 || !v2) throw new Error('One or both formulations could not be found.');

    const cost1 = v1.estimated_total_cost || 0;
    const cost2 = v2.estimated_total_cost || 0;
    const costDiff = Math.round((cost2 - cost1) * 100) / 100;
    const costDiffPct = cost1 > 0 ? Math.round(((cost2 - cost1) / cost1) * 10000) / 100 : 0;

    const v1CompMap = new Map<string, FormulationComponent>();
    for (const c of v1.components || []) v1CompMap.set(c.component_sku_id, c);

    const v2CompMap = new Map<string, FormulationComponent>();
    for (const c of v2.components || []) v2CompMap.set(c.component_sku_id, c);

    const allSkuIds = new Set<string>([...v1CompMap.keys(), ...v2CompMap.keys()]);
    const componentDiffs: ComponentComparisonDiff[] = [];

    for (const skuId of allSkuIds) {
      const c1 = v1CompMap.get(skuId);
      const c2 = v2CompMap.get(skuId);

      if (c1 && !c2) {
        componentDiffs.push({
          sku_id: skuId,
          sku_code: c1.component_sku_code || skuId,
          sku_name: c1.component_sku_name || '',
          change_type: 'removed',
          v1_quantity: c1.quantity,
          v1_unit: c1.unit_code,
          v1_wastage_pct: c1.wastage_allowance_percentage,
          v1_cost: c1.estimated_component_cost,
        });
      } else if (!c1 && c2) {
        componentDiffs.push({
          sku_id: skuId,
          sku_code: c2.component_sku_code || skuId,
          sku_name: c2.component_sku_name || '',
          change_type: 'added',
          v2_quantity: c2.quantity,
          v2_unit: c2.unit_code,
          v2_wastage_pct: c2.wastage_allowance_percentage,
          v2_cost: c2.estimated_component_cost,
        });
      } else if (c1 && c2) {
        const qtyChanged = c1.quantity !== c2.quantity;
        const wastageChanged = c1.wastage_allowance_percentage !== c2.wastage_allowance_percentage;
        const unitChanged = c1.unit_id !== c2.unit_id;

        componentDiffs.push({
          sku_id: skuId,
          sku_code: c2.component_sku_code || skuId,
          sku_name: c2.component_sku_name || '',
          change_type: qtyChanged || wastageChanged || unitChanged ? 'modified' : 'unchanged',
          v1_quantity: c1.quantity,
          v2_quantity: c2.quantity,
          v1_unit: c1.unit_code,
          v2_unit: c2.unit_code,
          v1_wastage_pct: c1.wastage_allowance_percentage,
          v2_wastage_pct: c2.wastage_allowance_percentage,
          v1_cost: c1.estimated_component_cost,
          v2_cost: c2.estimated_component_cost,
        });
      }
    }

    return {
      v1,
      v2,
      batch_size_changed: v1.batch_size !== v2.batch_size,
      yield_changed: v1.expected_yield !== v2.expected_yield,
      wastage_changed: v1.expected_wastage_quantity !== v2.expected_wastage_quantity,
      cost_diff: costDiff,
      cost_diff_percentage: costDiffPct,
      component_diffs: componentDiffs,
    };
  }

  /**
   * Executive Key Performance Telemetry Metrics
   */
  public static async getSummaryMetrics(orgId: string): Promise<FormulationSummaryMetrics> {
    const countsRes = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as in_review_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(DISTINCT finished_sku_id) as skus_covered,
        AVG(CASE WHEN batch_size > 0 THEN (expected_yield / batch_size) * 100 END) as avg_yield_pct
       FROM formulations
       WHERE organization_id = $1 AND status != 'archived'`,
      [orgId]
    );

    const costRes = await pool.query(
      `SELECT AVG(total_material_cost) as avg_cost 
       FROM formulation_costings 
       WHERE organization_id = $1`,
      [orgId]
    );

    const r = countsRes.rows[0];
    return {
      total_formulations: parseInt(r.total || '0', 10),
      active_formulations: parseInt(r.active_count || '0', 10),
      in_review_formulations: parseInt(r.in_review_count || '0', 10),
      draft_formulations: parseInt(r.draft_count || '0', 10),
      total_finished_skus_covered: parseInt(r.skus_covered || '0', 10),
      average_yield_percentage: Math.round(parseFloat(r.avg_yield_pct || '95') * 10) / 10,
      average_material_cost: Math.round(parseFloat(costRes.rows[0]?.avg_cost || '42500')),
    };
  }

  /**
   * Available SKUs for Finished Goods and Components with current Unit and Cost
   */
  public static async getAvailableSkus(orgId: string): Promise<any[]> {
    const res = await pool.query(
      `SELECT 
        s.id as sku_id, s.sku as sku_code, s.variant_name as sku_name, s.barcode,
        s.cost_price, s.selling_price, s.unit_id, u.short_code as unit_code, u.name as unit_name,
        p.id as product_id, p.name as product_name, p.product_code, p.product_type,
        (
          SELECT json_agg(json_build_object(
            'supplier_id', sp.supplier_id,
            'supplier_name', sup.supplier_name,
            'price', sp.price,
            'currency', sp.currency
          ))
          FROM supplier_prices sp
          JOIN suppliers sup ON sup.id = sp.supplier_id
          WHERE sp.sku_id = s.id AND sp.status = 'active'
        ) as supplier_prices
       FROM skus s
       JOIN products p ON p.id = s.product_id
       LEFT JOIN units u ON u.id = s.unit_id
       WHERE s.organization_id = $1 AND s.status = 'active'
       ORDER BY p.name ASC, s.sku ASC`,
      [orgId]
    );

    return res.rows.map(r => ({
      sku_id: r.sku_id,
      sku_code: r.sku_code,
      sku_name: r.sku_name,
      barcode: r.barcode,
      cost_price: Number(r.cost_price || 0),
      selling_price: Number(r.selling_price || 0),
      unit_id: r.unit_id,
      unit_code: r.unit_code || 'units',
      unit_name: r.unit_name || 'Units',
      product_id: r.product_id,
      product_name: r.product_name,
      product_code: r.product_code,
      product_type: r.product_type,
      supplier_prices: r.supplier_prices || [],
    }));
  }
}
