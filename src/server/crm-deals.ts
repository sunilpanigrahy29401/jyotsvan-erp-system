// Pipelines & stages (custom), deals, stage movement with win/loss capture, deal line items, kanban board and sales handoff.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { fireEvent } from './crm-automation.ts';
import { CrmError, buildSet, nonNegative, pickFields, tx, nextNumber, type Actor } from './crm-core.ts';

const DEAL_COLS = ['title', 'account_id', 'primary_contact_id', 'lead_id', 'deal_value', 'expected_quantity', 'expected_close_date', 'owner_employee_id', 'territory',
  'competitor_name', 'description', 'win_loss_reason'] as const;

async function exists(c: Pick<import('pg').PoolClient, 'query'>, sql: string, params: any[], msg: string, code: string) {
  if (!(await c.query(sql, params)).rows.length) throw new CrmError(msg, 400, code);
}

export class CrmDeals {
  // ---- pipelines -----------------------------------------------------------------------------------------------
  static async listPipelines(orgId: string, includeInactive = false) {
    const pipes = (await pool.query(`SELECT * FROM crm_pipelines WHERE organization_id = $1 ${includeInactive ? '' : 'AND is_active = TRUE'} ORDER BY is_default DESC, name`, [orgId])).rows;
    if (!pipes.length) return [];
    const stages = (await pool.query(`SELECT * FROM crm_pipeline_stages WHERE pipeline_id = ANY($1::text[]) ORDER BY display_order`, [pipes.map((p: any) => p.id)])).rows;
    return pipes.map((p: any) => ({ ...p, stages: stages.filter((s: any) => s.pipeline_id === p.id) }));
  }

  private static validateStage(s: Record<string, any>) {
    if (s.is_won_stage && s.is_lost_stage) throw new CrmError('A stage cannot be both won and lost.', 400, 'INVALID_STAGE');
    if (s.default_probability !== undefined && (!Number.isInteger(Number(s.default_probability)) || Number(s.default_probability) < 0 || Number(s.default_probability) > 100)) {
      throw new CrmError('Probability must be an integer between 0 and 100.', 400, 'INVALID_PROBABILITY');
    }
  }

  static async createPipeline(orgId: string, body: Record<string, any>) {
    const name = String(body.name || '').trim();
    if (!name) throw new CrmError('Pipeline name is required.', 400, 'NAME_REQUIRED');
    const stages: any[] = Array.isArray(body.stages) && body.stages.length ? body.stages : [
      { name: 'New', probability: 10 }, { name: 'Qualified', probability: 30 }, { name: 'Proposal', probability: 60 },
      { name: 'Won', probability: 100, is_won_stage: true }, { name: 'Lost', probability: 0, is_lost_stage: true }];
    stages.forEach((s) => CrmDeals.validateStage({ ...s, default_probability: s.probability ?? s.default_probability }));
    if (!stages.some((s) => !s.is_won_stage && !s.is_lost_stage)) throw new CrmError('A pipeline needs at least one open stage.', 400, 'INVALID_STAGE');
    return tx(async (c) => {
      const code = String(body.code || name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'pipeline';
      const first = !(await c.query(`SELECT 1 FROM crm_pipelines WHERE organization_id = $1 AND is_active = TRUE`, [orgId])).rows.length;
      const makeDefault = Boolean(body.is_default) || first;
      if (makeDefault) await c.query(`UPDATE crm_pipelines SET is_default = FALSE WHERE organization_id = $1`, [orgId]);
      const id = newId('pipe');
      await c.query(`INSERT INTO crm_pipelines (id, organization_id, name, code, is_default) VALUES ($1,$2,$3,$4,$5)`, [id, orgId, name, code, makeDefault]);
      let order = 1;
      const used = new Set<string>();
      for (const s of stages) {
        let sc = String(s.code || s.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `stage_${order}`;
        while (used.has(sc)) sc += '_';
        used.add(sc);
        await c.query(
          `INSERT INTO crm_pipeline_stages (id, pipeline_id, name, code, display_order, default_probability, is_won_stage, is_lost_stage, color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [newId('stg'), id, String(s.name).trim(), sc, order++, Number(s.probability ?? s.default_probability ?? 50), Boolean(s.is_won_stage), Boolean(s.is_lost_stage), s.color || '#3b82f6']);
      }
      return (await CrmDeals.listPipelinesWith(c, orgId, id))[0];
    });
  }

  private static async listPipelinesWith(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, id: string) {
    const p = (await c.query(`SELECT * FROM crm_pipelines WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows;
    const s = (await c.query(`SELECT * FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY display_order`, [id])).rows;
    return p.map((x: any) => ({ ...x, stages: s }));
  }

  static async updatePipeline(orgId: string, id: string, body: Record<string, any>) {
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_pipelines WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Pipeline not found.', 404, 'NOT_FOUND');
      const cols: Record<string, any> = {};
      if (body.name !== undefined) { if (!String(body.name).trim()) throw new CrmError('Pipeline name is required.', 400, 'NAME_REQUIRED'); cols.name = String(body.name).trim(); }
      if (body.is_active === false) {
        if (cur.is_default) throw new CrmError('Make another pipeline the default before deactivating this one.', 409, 'IS_DEFAULT');
        const open = Number((await c.query(`SELECT COUNT(*)::int n FROM crm_deals WHERE pipeline_id = $1 AND status = 'open' AND archived_at IS NULL`, [id])).rows[0].n);
        if (open) throw new CrmError(`${open} open deal(s) are still in this pipeline.`, 409, 'HAS_OPEN_DEALS');
        cols.is_active = false;
      } else if (body.is_active === true) cols.is_active = true;
      if (body.is_default === true) {
        await c.query(`UPDATE crm_pipelines SET is_default = FALSE WHERE organization_id = $1`, [orgId]);
        cols.is_default = true; cols.is_active = true;
      }
      if (Object.keys(cols).length) {
        const set = buildSet(cols);
        await c.query(`UPDATE crm_pipelines SET ${set.sql} WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2}`, [...set.values, orgId, id]);
      }
      return (await CrmDeals.listPipelinesWith(c, orgId, id))[0];
    });
  }

  static async deletePipeline(orgId: string, id: string) {
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_pipelines WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Pipeline not found.', 404, 'NOT_FOUND');
      if (cur.is_default) throw new CrmError('The default pipeline cannot be deleted.', 409, 'IS_DEFAULT');
      const n = Number((await c.query(`SELECT COUNT(*)::int n FROM crm_deals WHERE pipeline_id = $1`, [id])).rows[0].n);
      if (n) throw new CrmError(`This pipeline has ${n} deal(s). Deactivate it instead.`, 409, 'HAS_DEALS');
      await c.query(`DELETE FROM crm_pipeline_stages WHERE pipeline_id = $1`, [id]);
      await c.query(`DELETE FROM crm_pipelines WHERE id = $1`, [id]);
      return { id };
    });
  }

  static async addStage(orgId: string, pipelineId: string, body: Record<string, any>) {
    const name = String(body.name || '').trim();
    if (!name) throw new CrmError('Stage name is required.', 400, 'NAME_REQUIRED');
    const s = { is_won_stage: Boolean(body.is_won_stage), is_lost_stage: Boolean(body.is_lost_stage), default_probability: body.probability ?? body.default_probability ?? 50 };
    CrmDeals.validateStage(s);
    return tx(async (c) => {
      await exists(c, `SELECT 1 FROM crm_pipelines WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, pipelineId], 'Pipeline not found.', 'NOT_FOUND');
      const max = Number((await c.query(`SELECT COALESCE(MAX(display_order),0)::int m FROM crm_pipeline_stages WHERE pipeline_id = $1`, [pipelineId])).rows[0].m);
      let code = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'stage';
      if ((await c.query(`SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = $1 AND code = $2`, [pipelineId, code])).rows.length) code += `_${max + 1}`;
      return (await c.query(
        `INSERT INTO crm_pipeline_stages (id, pipeline_id, name, code, display_order, default_probability, is_won_stage, is_lost_stage, color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [newId('stg'), pipelineId, name, code, max + 1, Number(s.default_probability), s.is_won_stage, s.is_lost_stage, body.color || '#3b82f6'])).rows[0];
    });
  }

  static async updateStage(orgId: string, stageId: string, body: Record<string, any>) {
    const cols: Record<string, any> = {};
    if (body.name !== undefined) { if (!String(body.name).trim()) throw new CrmError('Stage name is required.', 400, 'NAME_REQUIRED'); cols.name = String(body.name).trim(); }
    if (body.probability !== undefined || body.default_probability !== undefined) cols.default_probability = Number(body.probability ?? body.default_probability);
    if (body.color !== undefined) cols.color = body.color;
    if (body.is_won_stage !== undefined) cols.is_won_stage = Boolean(body.is_won_stage);
    if (body.is_lost_stage !== undefined) cols.is_lost_stage = Boolean(body.is_lost_stage);
    CrmDeals.validateStage(cols);
    const st = (await pool.query(`SELECT s.* FROM crm_pipeline_stages s JOIN crm_pipelines p ON p.id = s.pipeline_id WHERE p.organization_id = $1 AND s.id = $2`, [orgId, stageId])).rows[0];
    if (!st) throw new CrmError('Stage not found.', 404, 'NOT_FOUND');
    if ((cols.is_won_stage ?? st.is_won_stage) && (cols.is_lost_stage ?? st.is_lost_stage)) throw new CrmError('A stage cannot be both won and lost.', 400, 'INVALID_STAGE');
    if (!Object.keys(cols).length) return st;
    const set = buildSet(cols);
    return (await pool.query(`UPDATE crm_pipeline_stages SET ${set.sql} WHERE id = $${set.values.length + 1} RETURNING *`, [...set.values, stageId])).rows[0];
  }

  static async deleteStage(orgId: string, stageId: string) {
    return tx(async (c) => {
      const st = (await c.query(`SELECT s.* FROM crm_pipeline_stages s JOIN crm_pipelines p ON p.id = s.pipeline_id WHERE p.organization_id = $1 AND s.id = $2 FOR UPDATE OF s`, [orgId, stageId])).rows[0];
      if (!st) throw new CrmError('Stage not found.', 404, 'NOT_FOUND');
      const n = Number((await c.query(`SELECT COUNT(*)::int n FROM crm_deals WHERE stage_id = $1`, [stageId])).rows[0].n);
      if (n) throw new CrmError(`${n} deal(s) are in this stage. Move them first.`, 409, 'HAS_DEALS');
      const open = Number((await c.query(`SELECT COUNT(*)::int n FROM crm_pipeline_stages WHERE pipeline_id = $1 AND is_won_stage = FALSE AND is_lost_stage = FALSE AND id <> $2`, [st.pipeline_id, stageId])).rows[0].n);
      if (!st.is_won_stage && !st.is_lost_stage && !open) throw new CrmError('A pipeline needs at least one open stage.', 409, 'LAST_OPEN_STAGE');
      await c.query(`DELETE FROM crm_deal_stage_history WHERE previous_stage_id = $1 OR new_stage_id = $1`, [stageId]);
      await c.query(`DELETE FROM crm_pipeline_stages WHERE id = $1`, [stageId]);
      await c.query(`UPDATE crm_pipeline_stages s SET display_order = r.rn FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY display_order) rn FROM crm_pipeline_stages WHERE pipeline_id = $1) r WHERE s.id = r.id`, [st.pipeline_id]);
      return { id: stageId };
    });
  }

  static async reorderStages(orgId: string, pipelineId: string, ids: string[]) {
    return tx(async (c) => {
      await exists(c, `SELECT 1 FROM crm_pipelines WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, pipelineId], 'Pipeline not found.', 'NOT_FOUND');
      const cur = (await c.query(`SELECT id FROM crm_pipeline_stages WHERE pipeline_id = $1`, [pipelineId])).rows.map((r: any) => r.id).sort();
      if (!Array.isArray(ids) || [...ids].sort().join() !== cur.join()) throw new CrmError('stage_ids must list every stage of the pipeline exactly once.', 400, 'INVALID_ORDER');
      for (let i = 0; i < ids.length; i++) await c.query(`UPDATE crm_pipeline_stages SET display_order = $1 WHERE id = $2`, [i + 1, ids[i]]);
      return (await CrmDeals.listPipelinesWith(c, orgId, pipelineId))[0];
    });
  }

  // ---- deals ---------------------------------------------------------------------------------------------------
  static async list(orgId: string, f: Record<string, any>, page: { limit: number; offset: number }) {
    const params: any[] = [orgId];
    let where = 'd.organization_id = $1';
    if (f.archived === 'only') where += ' AND d.archived_at IS NOT NULL'; else where += ' AND d.archived_at IS NULL';
    for (const k of ['pipeline_id', 'stage_id', 'account_id', 'status', 'owner_employee_id']) if (f[k]) { params.push(f[k]); where += ` AND d.${k} = $${params.length}`; }
    if (f.search) { params.push(`%${String(f.search).toLowerCase()}%`); where += ` AND (LOWER(d.title) LIKE $${params.length} OR LOWER(d.deal_number) LIKE $${params.length} OR LOWER(a.name) LIKE $${params.length})`; }
    const total = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_deals d JOIN crm_accounts a ON a.id = d.account_id WHERE ${where}`, params)).rows[0].n);
    params.push(page.limit, page.offset);
    const rows = (await pool.query(
      `SELECT d.*, a.name AS account_name, s.name AS stage_name, s.default_probability AS probability, s.is_won_stage, s.is_lost_stage, e.display_name AS owner_name, c.display_name AS contact_name
         FROM crm_deals d JOIN crm_accounts a ON a.id = d.account_id JOIN crm_pipeline_stages s ON s.id = d.stage_id
         LEFT JOIN employees e ON e.id = d.owner_employee_id LEFT JOIN crm_contacts c ON c.id = d.primary_contact_id
        WHERE ${where} ORDER BY d.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  }

  static async get(orgId: string, id: string) {
    const d = (await pool.query(
      `SELECT d.*, a.name AS account_name, s.name AS stage_name, s.default_probability AS probability, s.is_won_stage, s.is_lost_stage, e.display_name AS owner_name
         FROM crm_deals d JOIN crm_accounts a ON a.id = d.account_id JOIN crm_pipeline_stages s ON s.id = d.stage_id LEFT JOIN employees e ON e.id = d.owner_employee_id
        WHERE d.organization_id = $1 AND d.id = $2`, [orgId, id])).rows[0];
    if (!d) throw new CrmError('Deal not found.', 404, 'NOT_FOUND');
    const items = (await pool.query(`SELECT * FROM crm_deal_items WHERE deal_id = $1 ORDER BY created_at`, [id])).rows;
    const history = (await pool.query(
      `SELECT h.*, ps.name AS previous_stage_name, ns.name AS new_stage_name FROM crm_deal_stage_history h
         LEFT JOIN crm_pipeline_stages ps ON ps.id = h.previous_stage_id LEFT JOIN crm_pipeline_stages ns ON ns.id = h.new_stage_id WHERE h.deal_id = $1 ORDER BY h.created_at DESC`, [id])).rows;
    const handoff = d.handoff_id ? (await pool.query(`SELECT * FROM crm_deal_handoffs WHERE id = $1`, [d.handoff_id])).rows[0] : null;
    return { ...d, items, stage_history: history, handoff };
  }

  private static validateDeal(d: Record<string, any>, creating: boolean) {
    if (creating) {
      if (!d.title) throw new CrmError('Deal title is required.', 400, 'TITLE_REQUIRED');
      if (!d.account_id) throw new CrmError('An account is required.', 400, 'ACCOUNT_REQUIRED');
      if (!d.owner_employee_id) throw new CrmError('A deal owner is required.', 400, 'OWNER_REQUIRED');
      if (!d.expected_close_date) throw new CrmError('Expected close date is required.', 400, 'CLOSE_DATE_REQUIRED');
    }
    nonNegative(d.deal_value, 'deal_value');
    nonNegative(d.expected_quantity, 'expected_quantity');
    if (d.expected_close_date && Number.isNaN(Date.parse(d.expected_close_date))) throw new CrmError('Expected close date is not a valid date.', 400, 'INVALID_DATE');
  }

  private static async refs(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, d: Record<string, any>) {
    if (d.account_id) await exists(c, `SELECT 1 FROM crm_accounts WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`, [d.account_id, orgId], 'Account does not exist in this organization.', 'INVALID_ACCOUNT');
    if (d.owner_employee_id) await exists(c, `SELECT 1 FROM employees WHERE id = $1 AND organization_id = $2`, [d.owner_employee_id, orgId], 'Owner does not exist in this organization.', 'INVALID_EMPLOYEE');
    if (d.primary_contact_id) await exists(c, `SELECT 1 FROM crm_contacts WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`, [d.primary_contact_id, orgId], 'Contact does not exist in this organization.', 'INVALID_CONTACT');
    if (d.lead_id) await exists(c, `SELECT 1 FROM crm_leads WHERE id = $1 AND organization_id = $2`, [d.lead_id, orgId], 'Lead does not exist in this organization.', 'INVALID_LEAD');
  }

  static async create(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, DEAL_COLS);
    CrmDeals.validateDeal(d, true);
    const deal = await tx(async (c) => {
      await CrmDeals.refs(c, orgId, d);
      const pipe = body.pipeline_id
        ? (await c.query(`SELECT id FROM crm_pipelines WHERE organization_id = $1 AND id = $2 AND is_active = TRUE`, [orgId, body.pipeline_id])).rows[0]
        : (await c.query(`SELECT id FROM crm_pipelines WHERE organization_id = $1 AND is_active = TRUE ORDER BY is_default DESC, created_at LIMIT 1`, [orgId])).rows[0];
      if (!pipe) throw new CrmError('No active pipeline found.', 400, 'NO_PIPELINE');
      const stage = body.stage_id
        ? (await c.query(`SELECT * FROM crm_pipeline_stages WHERE id = $1 AND pipeline_id = $2`, [body.stage_id, pipe.id])).rows[0]
        : (await c.query(`SELECT * FROM crm_pipeline_stages WHERE pipeline_id = $1 AND is_won_stage = FALSE AND is_lost_stage = FALSE ORDER BY display_order LIMIT 1`, [pipe.id])).rows[0];
      if (!stage) throw new CrmError('Stage does not belong to the pipeline.', 400, 'INVALID_STAGE');
      if (stage.is_won_stage || stage.is_lost_stage) throw new CrmError('Create deals in an open stage, then close them.', 400, 'INVALID_STAGE');
      const no = await nextNumber(c, orgId, 'deal', 'DEAL');
      const r = await c.query(
        `INSERT INTO crm_deals (id, organization_id, deal_number, title, pipeline_id, stage_id, account_id, primary_contact_id, lead_id, deal_value, expected_quantity, expected_close_date,
                                owner_employee_id, territory, status, description, competitor_name, created_by_user_id, custom_fields)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'open',$15,$16,$17,$18) RETURNING *`,
        [newId('deal'), orgId, no, d.title, pipe.id, stage.id, d.account_id, d.primary_contact_id ?? null, d.lead_id ?? null, d.deal_value ?? 0, d.expected_quantity ?? null,
          d.expected_close_date, d.owner_employee_id, d.territory ?? null, d.description ?? null, d.competitor_name ?? null, actor.id, JSON.stringify(body.custom_fields ?? {})]);
      await c.query(`INSERT INTO crm_deal_stage_history (id, deal_id, previous_stage_id, new_stage_id, notes, changed_by_user_id) VALUES ($1,$2,NULL,$3,'Deal created',$4)`, [newId('dsh'), r.rows[0].id, stage.id, actor.id]);
      return r.rows[0];
    });
    void fireEvent(orgId, 'deal.created', deal, actor.id);
    return deal;
  }

  static async update(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, DEAL_COLS);
    CrmDeals.validateDeal(d, false);
    for (const k of ['title', 'account_id', 'owner_employee_id', 'expected_close_date', 'deal_value']) if (k in d && d[k] === null) delete d[k];
    if (body.custom_fields !== undefined) d.custom_fields = JSON.stringify(body.custom_fields ?? {});
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_deals WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Deal not found.', 404, 'NOT_FOUND');
      if (cur.status !== 'open' && ('deal_value' in d || 'account_id' in d)) throw new CrmError('The value and account of a closed deal cannot change. Re-open it first.', 409, 'DEAL_CLOSED');
      await CrmDeals.refs(c, orgId, d);
      if (!Object.keys(d).length) return cur;
      const set = buildSet(d);
      return (await c.query(`UPDATE crm_deals SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id])).rows[0];
    });
  }

  static async moveStage(orgId: string, dealId: string, stageId: string, body: Record<string, any>, actor: Actor) {
    if (!stageId) throw new CrmError('stage_id is required.', 400, 'STAGE_REQUIRED');
    let eventName = 'deal.stage_changed';
    const deal = await tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_deals WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, dealId])).rows[0];
      if (!cur) throw new CrmError('Deal not found.', 404, 'NOT_FOUND');
      if (cur.archived_at) throw new CrmError('Archived deals cannot move.', 409, 'DEAL_ARCHIVED');
      const stage = (await c.query(`SELECT * FROM crm_pipeline_stages WHERE id = $1 AND pipeline_id = $2`, [stageId, cur.pipeline_id])).rows[0];
      if (!stage) throw new CrmError('That stage does not belong to the deal\'s pipeline.', 400, 'INVALID_STAGE');
      if (stage.id === cur.stage_id) return cur;
      const reason = String(body.win_loss_reason ?? body.reason ?? '').trim();
      if (stage.is_lost_stage && !reason && !cur.win_loss_reason) throw new CrmError('A reason is required when a deal is lost.', 400, 'REASON_REQUIRED');
      const status = stage.is_won_stage ? 'won' : stage.is_lost_stage ? 'lost' : 'open';
      const closing = status !== 'open';
      const days = Math.max(0, Math.round((Date.now() - new Date(cur.updated_at).getTime()) / 86_400_000));
      await c.query(`INSERT INTO crm_deal_stage_history (id, deal_id, previous_stage_id, new_stage_id, duration_days, notes, changed_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [newId('dsh'), dealId, cur.stage_id, stage.id, days, clean2(body.notes), actor.id]);
      const r = await c.query(
        `UPDATE crm_deals SET stage_id = $3, status = $4, actual_close_date = $5, win_loss_reason = COALESCE($6, win_loss_reason), competitor_name = COALESCE($7, competitor_name), updated_at = NOW()
          WHERE organization_id = $1 AND id = $2 RETURNING *`,
        [orgId, dealId, stage.id, status, closing ? new Date().toISOString().slice(0, 10) : null, reason || null, clean2(body.competitor_name)]);
      if (status === 'won') eventName = 'deal.won'; else if (status === 'lost') eventName = 'deal.lost';
      return r.rows[0];
    });
    void fireEvent(orgId, eventName, deal, actor.id);
    return deal;
  }

  static async archive(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_deals SET archived_at = NOW(), updated_at = NOW() WHERE organization_id = $1 AND id = $2 AND archived_at IS NULL RETURNING *`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Deal not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }

  static async restore(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_deals SET archived_at = NULL, updated_at = NOW() WHERE organization_id = $1 AND id = $2 AND archived_at IS NOT NULL RETURNING *`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Archived deal not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }

  /** Replaces the deal's line items. With sync_value the deal value becomes the items total. */
  static async setItems(orgId: string, dealId: string, items: any[], syncValue: boolean) {
    if (!Array.isArray(items)) throw new CrmError('items must be an array.', 400, 'INVALID_ITEMS');
    return tx(async (c) => {
      const deal = (await c.query(`SELECT * FROM crm_deals WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, dealId])).rows[0];
      if (!deal) throw new CrmError('Deal not found.', 404, 'NOT_FOUND');
      if (deal.status !== 'open') throw new CrmError('Items of a closed deal cannot change.', 409, 'DEAL_CLOSED');
      await c.query(`DELETE FROM crm_deal_items WHERE deal_id = $1`, [dealId]);
      let total = 0;
      for (const it of items) {
        const qty = Number(it.quantity), price = Number(it.unit_price);
        if (!String(it.product_name || '').trim() || !(qty > 0) || !(price >= 0)) throw new CrmError('Each item needs product_name, quantity > 0 and unit_price >= 0.', 400, 'INVALID_ITEMS');
        if (it.product_id) await exists(c, `SELECT 1 FROM products WHERE id = $1 AND organization_id = $2`, [it.product_id, orgId], `Product ${it.product_id} does not exist.`, 'INVALID_PRODUCT');
        const line = Math.round(qty * price * 100) / 100;
        total += line;
        await c.query(`INSERT INTO crm_deal_items (id, deal_id, product_id, product_name, sku, quantity, unit_price, total_price, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [newId('itm'), dealId, it.product_id ?? null, String(it.product_name).trim(), it.sku ?? null, qty, price, line, it.notes ?? null]);
      }
      if (syncValue && items.length) await c.query(`UPDATE crm_deals SET deal_value = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, dealId, total]);
      return { items: (await c.query(`SELECT * FROM crm_deal_items WHERE deal_id = $1 ORDER BY created_at`, [dealId])).rows, total };
    });
  }

  // ---- kanban --------------------------------------------------------------------------------------------------
  static async board(orgId: string, pipelineId?: string, ownerId?: string) {
    const pipe = pipelineId
      ? (await pool.query(`SELECT * FROM crm_pipelines WHERE organization_id = $1 AND id = $2`, [orgId, pipelineId])).rows[0]
      : (await pool.query(`SELECT * FROM crm_pipelines WHERE organization_id = $1 AND is_active = TRUE ORDER BY is_default DESC, created_at LIMIT 1`, [orgId])).rows[0];
    if (!pipe) return { pipeline: null, columns: [] };
    const stages = (await pool.query(`SELECT * FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY display_order`, [pipe.id])).rows;
    const params: any[] = [orgId, pipe.id];
    let own = '';
    if (ownerId) { params.push(ownerId); own = ` AND d.owner_employee_id = $3`; }
    const deals = (await pool.query(
      `SELECT d.id, d.deal_number, d.title, d.deal_value, d.expected_close_date, d.stage_id, d.status, d.owner_employee_id, a.name AS account_name, e.display_name AS owner_name
         FROM crm_deals d JOIN crm_accounts a ON a.id = d.account_id LEFT JOIN employees e ON e.id = d.owner_employee_id
        WHERE d.organization_id = $1 AND d.pipeline_id = $2 AND d.archived_at IS NULL${own}
          AND (d.status = 'open' OR d.actual_close_date >= CURRENT_DATE - 30) ORDER BY d.deal_value DESC`, params)).rows;
    return {
      pipeline: pipe,
      columns: stages.map((s: any) => {
        const ds = deals.filter((d: any) => d.stage_id === s.id);
        const value = ds.reduce((t: number, d: any) => t + Number(d.deal_value), 0);
        return { stage: s, deals: ds, count: ds.length, value, weighted_value: Math.round(value * s.default_probability) / 100 };
      }),
    };
  }

  // ---- sales handoff ---------------------------------------------------------------------------------------------
  static async listHandoffs(orgId: string, status?: string) {
    const params: any[] = [orgId];
    let w = '';
    if (status) { params.push(status); w = ` AND h.status = $2`; }
    return (await pool.query(
      `SELECT h.*, d.title AS deal_title, d.deal_value, a.name AS account_name FROM crm_deal_handoffs h JOIN crm_deals d ON d.id = h.deal_id JOIN crm_accounts a ON a.id = h.account_id
        WHERE h.organization_id = $1${w} ORDER BY h.created_at DESC LIMIT 200`, params)).rows;
  }

  static async createHandoff(orgId: string, dealId: string, body: Record<string, any>, actor: Actor) {
    return tx(async (c) => {
      const deal = (await c.query(`SELECT * FROM crm_deals WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, dealId])).rows[0];
      if (!deal) throw new CrmError('Deal not found.', 404, 'NOT_FOUND');
      if (deal.status !== 'won') throw new CrmError('Only a won deal can be handed off to sales operations.', 409, 'DEAL_NOT_WON');
      const existing = (await c.query(`SELECT * FROM crm_deal_handoffs WHERE idempotency_key = $1`, [`handoff-${dealId}`])).rows[0];
      if (existing && existing.status !== 'rejected') return existing;
      const items = (await c.query(`SELECT product_id, product_name, sku, quantity, unit_price, total_price FROM crm_deal_items WHERE deal_id = $1`, [dealId])).rows;
      const lines = items.length ? items : [{ product_name: deal.title, sku: null, quantity: Number(deal.expected_quantity || 1), unit_price: Number(deal.deal_value), total_price: Number(deal.deal_value) }];
      const no = await nextNumber(c, orgId, 'handoff', 'HND');
      const key = existing ? `handoff-${dealId}-${Date.now()}` : `handoff-${dealId}`;
      const h = (await c.query(
        `INSERT INTO crm_deal_handoffs (id, organization_id, deal_id, handoff_number, account_id, contact_id, idempotency_key, pricing_assumptions, line_items, special_terms, delivery_timeline, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_review') RETURNING *`,
        [newId('hnd'), orgId, dealId, no, deal.account_id, deal.primary_contact_id, key, JSON.stringify({ deal_value: deal.deal_value, created_by: actor.id }), JSON.stringify(lines),
          clean2(body.special_terms), clean2(body.delivery_timeline) || '30 days from order acceptance'])).rows[0];
      await c.query(`UPDATE crm_deals SET is_handed_off = TRUE, handoff_id = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, dealId, h.id]);
      return h;
    });
  }

  static async reviewHandoff(orgId: string, id: string, decision: string, note: string | undefined, actor: Actor) {
    if (!['approved', 'rejected'].includes(decision)) throw new CrmError('decision must be approved or rejected.', 400, 'INVALID_DECISION');
    if (decision === 'rejected' && !String(note || '').trim()) throw new CrmError('A reason is required to reject a handoff.', 400, 'REASON_REQUIRED');
    return tx(async (c) => {
      const h = (await c.query(`SELECT * FROM crm_deal_handoffs WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!h) throw new CrmError('Handoff not found.', 404, 'NOT_FOUND');
      if (h.status !== 'pending_review') throw new CrmError('This handoff has already been reviewed.', 409, 'INVALID_STATE');
      const r = await c.query(
        `UPDATE crm_deal_handoffs SET status = $3, approved_by_user_id = $4, approved_at = NOW(), special_terms = CASE WHEN $5::text IS NULL THEN special_terms ELSE COALESCE(special_terms || E'\\n', '') || 'Review: ' || $5 END
          WHERE id = $1 AND organization_id = $2 RETURNING *`, [id, orgId, decision, actor.id, clean2(note)]);
      if (decision === 'rejected') await c.query(`UPDATE crm_deals SET is_handed_off = FALSE, handoff_id = NULL WHERE id = $1`, [h.deal_id]);
      return r.rows[0];
    });
  }
}

function clean2(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}
