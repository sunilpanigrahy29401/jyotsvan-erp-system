// CRM analytics: cockpit dashboard, lead funnel, revenue forecast, win/loss, source and rep performance.
import { pool } from './db.ts';
import { ensureCrmDefaults } from './crm-defaults.ts';

const n = (v: unknown) => Number(v ?? 0);
const FUNNEL = ['new', 'assigned', 'contacted', 'attempted', 'qualified', 'nurturing', 'converted'];

export class CrmReports {
  static async dashboard(orgId: string) {
    await ensureCrmDefaults(orgId);
    const q = async (sql: string, p: any[] = [orgId]) => (await pool.query(sql, p)).rows;
    const [leadStats] = await q(
      `SELECT COUNT(*)::int total_leads,
              COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int new_leads_month,
              COUNT(*) FILTER (WHERE status = 'qualified')::int qualified_leads,
              COUNT(*) FILTER (WHERE assigned_employee_id IS NULL AND status NOT IN ('converted','lost','archived','unqualified'))::int unassigned_leads,
              COUNT(*) FILTER (WHERE next_follow_up_date <= NOW() AND status NOT IN ('converted','lost','archived','unqualified'))::int leads_requiring_followup,
              COUNT(*) FILTER (WHERE first_response_at IS NULL AND sla_due_at < NOW() AND status NOT IN ('converted','lost','archived','unqualified'))::int sla_breached_leads,
              COUNT(*) FILTER (WHERE is_converted)::int converted_leads
         FROM crm_leads WHERE organization_id = $1 AND archived_at IS NULL`);
    const byStatus = await q(`SELECT status, COUNT(*)::int c FROM crm_leads WHERE organization_id = $1 AND archived_at IS NULL GROUP BY status`);
    const bySource = await q(
      `SELECT COALESCE(s.name,'Direct / Other') AS source, COUNT(l.id)::int AS count, COALESCE(SUM(l.estimated_deal_value),0) AS value
         FROM crm_leads l LEFT JOIN crm_lead_sources s ON s.id = l.source_id WHERE l.organization_id = $1 AND l.archived_at IS NULL GROUP BY s.name ORDER BY count DESC`);
    const [deals] = await q(
      `SELECT COUNT(*) FILTER (WHERE d.status = 'open')::int active_deals_count,
              COALESCE(SUM(d.deal_value) FILTER (WHERE d.status = 'open'),0) total_pipeline_value,
              COALESCE(SUM(d.deal_value * s.default_probability / 100.0) FILTER (WHERE d.status = 'open'),0) weighted_forecast,
              COALESCE(SUM(d.deal_value) FILTER (WHERE d.status = 'won' AND d.actual_close_date >= date_trunc('month', NOW())),0) won_month
         FROM crm_deals d JOIN crm_pipeline_stages s ON s.id = d.stage_id WHERE d.organization_id = $1 AND d.archived_at IS NULL`);
    const stages = await q(
      `SELECT s.name AS stage, s.default_probability, COUNT(d.id)::int AS count, COALESCE(SUM(d.deal_value),0) AS value
         FROM crm_pipeline_stages s LEFT JOIN crm_deals d ON d.stage_id = s.id AND d.organization_id = $1 AND d.status = 'open' AND d.archived_at IS NULL
        WHERE s.pipeline_id = (SELECT id FROM crm_pipelines WHERE organization_id = $1 AND is_active = TRUE ORDER BY is_default DESC, created_at LIMIT 1) AND s.is_won_stage = FALSE AND s.is_lost_stage = FALSE
        GROUP BY s.id ORDER BY s.display_order`);
    const recent = await q(`SELECT a.*, e.display_name AS assigned_employee_name FROM crm_activities a LEFT JOIN employees e ON e.id = a.assigned_employee_id WHERE a.organization_id = $1 ORDER BY a.created_at DESC LIMIT 6`);
    const upcoming = await q(`SELECT a.*, e.display_name AS assigned_employee_name FROM crm_activities a LEFT JOIN employees e ON e.id = a.assigned_employee_id WHERE a.organization_id = $1 AND a.is_completed = FALSE ORDER BY a.due_date ASC NULLS LAST LIMIT 6`);
    const [tick] = await q(`SELECT COUNT(*) FILTER (WHERE status IN ('open','pending'))::int open_tickets, COUNT(*) FILTER (WHERE status IN ('open','pending') AND resolution_due_at < NOW())::int overdue_tickets FROM crm_tickets WHERE organization_id = $1`);
    const total = leadStats.total_leads;
    return {
      total_leads: total, new_leads_month: leadStats.new_leads_month, qualified_leads: leadStats.qualified_leads, unassigned_leads: leadStats.unassigned_leads,
      leads_requiring_followup: leadStats.leads_requiring_followup, sla_breached_leads: leadStats.sla_breached_leads,
      active_deals_count: deals.active_deals_count, total_pipeline_value: n(deals.total_pipeline_value), weighted_forecast_value: Math.round(n(deals.weighted_forecast) * 100) / 100,
      won_deals_month_value: n(deals.won_month), conversion_rate_percent: total ? Math.round((leadStats.converted_leads / total) * 1000) / 10 : 0,
      leads_by_status: Object.fromEntries(byStatus.map((r: any) => [r.status, r.c])),
      leads_by_source: bySource.map((r: any) => ({ source: r.source, count: r.count, value: n(r.value) })),
      deals_by_stage: stages.map((r: any) => ({ stage: r.stage, count: r.count, value: n(r.value), probability: r.default_probability })),
      recent_activities: recent, upcoming_followups: upcoming, open_tickets: tick.open_tickets, overdue_tickets: tick.overdue_tickets,
    };
  }

  /** Lead funnel: how many leads reached each stage (status history), with step-to-step conversion. */
  static async funnel(orgId: string, from?: string, to?: string) {
    const p: any[] = [orgId];
    let range = '';
    if (from) { p.push(from); range += ` AND l.created_at >= $${p.length}`; }
    if (to) { p.push(to); range += ` AND l.created_at < ($${p.length}::date + 1)`; }
    const total = n((await pool.query(`SELECT COUNT(*)::int c FROM crm_leads l WHERE l.organization_id = $1${range}`, p)).rows[0].c);
    const reached = (await pool.query(
      `SELECT h.new_status AS status, COUNT(DISTINCT h.lead_id)::int c FROM crm_lead_status_history h JOIN crm_leads l ON l.id = h.lead_id WHERE l.organization_id = $1${range} GROUP BY h.new_status`, p)).rows;
    const map = new Map<string, number>(reached.map((r: any) => [r.status, r.c]));
    const steps = FUNNEL.map((s, i) => {
      const count = s === 'new' ? total : map.get(s) ?? 0;
      return { stage: s, count };
    });
    // A lead that was converted/qualified counts as having passed the earlier steps, so counts are made monotonically non-increasing.
    for (let i = steps.length - 2; i >= 0; i--) steps[i].count = Math.max(steps[i].count, steps[i + 1].count);
    const result = steps.map((s, i) => ({ ...s, conversion_from_previous_percent: i === 0 || !steps[i - 1].count ? null : Math.round((s.count / steps[i - 1].count) * 1000) / 10 }));
    return { total_leads: total, steps: result, lost: map.get('lost') ?? 0, unqualified: map.get('unqualified') ?? 0 };
  }

  /** Open pipeline forecast by expected close month (weighted by stage probability) plus a per-owner view. */
  static async forecast(orgId: string, pipelineId?: string) {
    const p: any[] = [orgId];
    let pipe = '';
    if (pipelineId) { p.push(pipelineId); pipe = ` AND d.pipeline_id = $2`; }
    const byMonth = (await pool.query(
      `SELECT to_char(date_trunc('month', d.expected_close_date), 'YYYY-MM') AS month, COUNT(*)::int AS deals, SUM(d.deal_value) AS value, SUM(d.deal_value * s.default_probability / 100.0) AS weighted
         FROM crm_deals d JOIN crm_pipeline_stages s ON s.id = d.stage_id WHERE d.organization_id = $1 AND d.status = 'open' AND d.archived_at IS NULL${pipe} GROUP BY 1 ORDER BY 1`, p)).rows;
    const byOwner = (await pool.query(
      `SELECT d.owner_employee_id, e.display_name AS owner_name, COUNT(*)::int AS deals, SUM(d.deal_value) AS value, SUM(d.deal_value * s.default_probability / 100.0) AS weighted
         FROM crm_deals d JOIN crm_pipeline_stages s ON s.id = d.stage_id LEFT JOIN employees e ON e.id = d.owner_employee_id
        WHERE d.organization_id = $1 AND d.status = 'open' AND d.archived_at IS NULL${pipe} GROUP BY d.owner_employee_id, e.display_name ORDER BY weighted DESC`, p)).rows;
    const overdue = n((await pool.query(`SELECT COUNT(*)::int c FROM crm_deals d WHERE d.organization_id = $1 AND d.status = 'open' AND d.archived_at IS NULL AND d.expected_close_date < CURRENT_DATE${pipe}`, p)).rows[0].c);
    const fmt = (r: any) => ({ ...r, value: n(r.value), weighted: Math.round(n(r.weighted) * 100) / 100 });
    return { by_month: byMonth.map(fmt), by_owner: byOwner.map(fmt), past_due_deals: overdue, total_weighted: Math.round(byMonth.reduce((t: number, r: any) => t + n(r.weighted), 0) * 100) / 100 };
  }

  static async winLoss(orgId: string, from?: string, to?: string) {
    const p: any[] = [orgId];
    let range = '';
    if (from) { p.push(from); range += ` AND d.actual_close_date >= $${p.length}`; }
    if (to) { p.push(to); range += ` AND d.actual_close_date <= $${p.length}`; }
    const base = `FROM crm_deals d WHERE d.organization_id = $1 AND d.status IN ('won','lost') AND d.archived_at IS NULL${range}`;
    const [tot] = (await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status='won')::int won, COUNT(*) FILTER (WHERE status='lost')::int lost,
              COALESCE(SUM(deal_value) FILTER (WHERE status='won'),0) won_value, COALESCE(SUM(deal_value) FILTER (WHERE status='lost'),0) lost_value,
              ROUND(AVG(actual_close_date - created_at::date) FILTER (WHERE status='won')::numeric, 1) avg_cycle_days ${base}`, p)).rows;
    const reasons = (await pool.query(`SELECT COALESCE(NULLIF(win_loss_reason,''),'(none given)') AS reason, status, COUNT(*)::int c, SUM(deal_value) value ${base} GROUP BY 1,2 ORDER BY c DESC`, p)).rows;
    const competitors = (await pool.query(`SELECT competitor_name, COUNT(*) FILTER (WHERE status='lost')::int lost_to, COUNT(*) FILTER (WHERE status='won')::int won_against ${base} AND competitor_name IS NOT NULL GROUP BY 1 ORDER BY lost_to DESC`, p)).rows;
    const decided = tot.won + tot.lost;
    return {
      won: tot.won, lost: tot.lost, win_rate_percent: decided ? Math.round((tot.won / decided) * 1000) / 10 : null, won_value: n(tot.won_value), lost_value: n(tot.lost_value),
      avg_sales_cycle_days: tot.avg_cycle_days === null ? null : n(tot.avg_cycle_days),
      reasons: reasons.map((r: any) => ({ ...r, value: n(r.value) })), competitors,
    };
  }

  static async sourcePerformance(orgId: string) {
    const rows = (await pool.query(
      `SELECT COALESCE(s.name,'Direct / Other') AS source, COUNT(l.id)::int AS leads, COUNT(l.id) FILTER (WHERE l.is_converted)::int AS converted,
              ROUND(AVG(l.lead_score)::numeric,1) AS avg_score,
              COALESCE((SELECT SUM(d.deal_value) FROM crm_deals d JOIN crm_leads l2 ON l2.id = d.lead_id WHERE d.status = 'won' AND d.organization_id = $1 AND l2.source_id IS NOT DISTINCT FROM l.source_id),0) AS won_value
         FROM crm_leads l LEFT JOIN crm_lead_sources s ON s.id = l.source_id WHERE l.organization_id = $1 AND l.archived_at IS NULL GROUP BY l.source_id, s.name ORDER BY leads DESC`, [orgId])).rows;
    return rows.map((r: any) => ({ ...r, avg_score: r.avg_score === null ? null : n(r.avg_score), won_value: n(r.won_value), conversion_percent: r.leads ? Math.round((r.converted / r.leads) * 1000) / 10 : 0 }));
  }

  static async repPerformance(orgId: string) {
    const rows = (await pool.query(
      `SELECT e.id, e.display_name,
              (SELECT COUNT(*)::int FROM crm_leads l WHERE l.organization_id = $1 AND l.assigned_employee_id = e.id AND l.archived_at IS NULL AND l.is_converted = FALSE AND l.status NOT IN ('lost','unqualified')) AS open_leads,
              (SELECT COUNT(*)::int FROM crm_leads l WHERE l.organization_id = $1 AND l.assigned_employee_id = e.id AND l.is_converted) AS converted_leads,
              (SELECT COUNT(*)::int FROM crm_leads l WHERE l.organization_id = $1 AND l.assigned_employee_id = e.id AND l.first_response_at IS NULL AND l.sla_due_at < NOW() AND l.archived_at IS NULL AND l.is_converted = FALSE) AS sla_breaches,
              (SELECT COUNT(*)::int FROM crm_deals d WHERE d.organization_id = $1 AND d.owner_employee_id = e.id AND d.status = 'open' AND d.archived_at IS NULL) AS open_deals,
              (SELECT COALESCE(SUM(d.deal_value),0) FROM crm_deals d WHERE d.organization_id = $1 AND d.owner_employee_id = e.id AND d.status = 'won' AND d.actual_close_date >= date_trunc('month', NOW())) AS won_this_month,
              (SELECT COUNT(*)::int FROM crm_activities a WHERE a.organization_id = $1 AND a.assigned_employee_id = e.id AND a.is_completed AND a.completed_at >= NOW() - INTERVAL '30 days') AS activities_30d,
              (SELECT COUNT(*)::int FROM crm_activities a WHERE a.organization_id = $1 AND a.assigned_employee_id = e.id AND NOT a.is_completed AND a.due_date < NOW()) AS overdue_tasks
         FROM employees e WHERE e.organization_id = $1 AND e.status = 'active'
          AND (EXISTS (SELECT 1 FROM crm_leads l WHERE l.assigned_employee_id = e.id) OR EXISTS (SELECT 1 FROM crm_deals d WHERE d.owner_employee_id = e.id) OR EXISTS (SELECT 1 FROM crm_activities a WHERE a.assigned_employee_id = e.id))
        ORDER BY won_this_month DESC, open_deals DESC`, [orgId])).rows;
    return rows.map((r: any) => ({ ...r, won_this_month: n(r.won_this_month) }));
  }
}
