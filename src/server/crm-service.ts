// src/server/crm-service.ts
// Enterprise CRM Subsystem Backend Service

import { pool } from './db.ts';
import type {
  Lead,
  LeadStatus,
  CrmAccount,
  CrmContact,
  Deal,
  Pipeline,
  CrmActivity,
  CrmNote,
  CrmDashboardMetrics,
  CrmIntegrationConfig,
  CrmAutomationRule,
  DealHandoff,
} from '../types/crm.ts';

export class CrmService {
  // ==========================================
  // 1. DASHBOARD TELEMETRY & ANALYTICS
  // ==========================================
  public static async getDashboardMetrics(orgId: string): Promise<CrmDashboardMetrics> {
    const client = await pool.connect();
    try {
      // Leads aggregate counts
      const leadStatsRes = await client.query(`
        SELECT 
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as new_leads_month,
          COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
          COUNT(*) FILTER (WHERE assigned_employee_id IS NULL AND status NOT IN ('converted', 'lost', 'archived')) as unassigned_leads,
          COUNT(*) FILTER (WHERE next_follow_up_date <= NOW() AND status NOT IN ('converted', 'lost', 'archived')) as leads_requiring_followup,
          COUNT(*) FILTER (WHERE is_converted = TRUE) as converted_leads
        FROM crm_leads
        WHERE organization_id = $1
      `, [orgId]);

      const leadStats = leadStatsRes.rows[0] || {};
      const totalLeads = parseInt(leadStats.total_leads || '0', 10);
      const convertedLeads = parseInt(leadStats.converted_leads || '0', 10);
      const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

      // Status breakdown
      const statusRes = await client.query(`
        SELECT status, COUNT(*) as count
        FROM crm_leads
        WHERE organization_id = $1
        GROUP BY status
      `, [orgId]);
      const leadsByStatus: Record<string, number> = {};
      statusRes.rows.forEach(r => {
        leadsByStatus[r.status] = parseInt(r.count, 10);
      });

      // Source breakdown
      const sourceRes = await client.query(`
        SELECT COALESCE(s.name, 'Direct / Other') as source, COUNT(l.id) as count, COALESCE(SUM(l.estimated_deal_value), 0) as value
        FROM crm_leads l
        LEFT JOIN crm_lead_sources s ON l.source_id = s.id
        WHERE l.organization_id = $1
        GROUP BY s.name
        ORDER BY count DESC
      `, [orgId]);
      const leadsBySource = sourceRes.rows.map(r => ({
        source: r.source,
        count: parseInt(r.count, 10),
        value: parseFloat(r.value),
      }));

      // Deals aggregate
      const dealStatsRes = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'open') as active_deals_count,
          COALESCE(SUM(deal_value) FILTER (WHERE status = 'open'), 0) as total_pipeline_value,
          COALESCE(SUM(deal_value * (stg.default_probability::numeric / 100)) FILTER (WHERE d.status = 'open'), 0) as weighted_forecast,
          COALESCE(SUM(deal_value) FILTER (WHERE d.status = 'won' AND d.actual_close_date >= date_trunc('month', NOW())), 0) as won_deals_month
        FROM crm_deals d
        JOIN crm_pipeline_stages stg ON d.stage_id = stg.id
        WHERE d.organization_id = $1
      `, [orgId]);
      const dealStats = dealStatsRes.rows[0] || {};

      // Stage breakdown
      const stageRes = await client.query(`
        SELECT stg.name as stage, stg.default_probability, COUNT(d.id) as count, COALESCE(SUM(d.deal_value), 0) as value
        FROM crm_pipeline_stages stg
        LEFT JOIN crm_deals d ON d.stage_id = stg.id AND d.organization_id = $1 AND d.status = 'open'
        WHERE stg.pipeline_id IN (SELECT id FROM crm_pipelines WHERE organization_id = $1 AND is_default = TRUE LIMIT 1)
        GROUP BY stg.id, stg.name, stg.display_order, stg.default_probability
        ORDER BY stg.display_order ASC
      `, [orgId]);
      const dealsByStage = stageRes.rows.map(r => ({
        stage: r.stage,
        count: parseInt(r.count, 10),
        value: parseFloat(r.value),
        probability: parseInt(r.default_probability, 10),
      }));

      // Recent activities
      const recentActRes = await client.query(`
        SELECT a.*, e.display_name as assigned_employee_name
        FROM crm_activities a
        LEFT JOIN employees e ON a.assigned_employee_id = e.id
        WHERE a.organization_id = $1
        ORDER BY a.created_at DESC
        LIMIT 6
      `, [orgId]);

      // Upcoming follow-ups
      const upcomingActRes = await client.query(`
        SELECT a.*, e.display_name as assigned_employee_name
        FROM crm_activities a
        LEFT JOIN employees e ON a.assigned_employee_id = e.id
        WHERE a.organization_id = $1 AND a.is_completed = FALSE
        ORDER BY a.due_date ASC NULLS LAST
        LIMIT 6
      `, [orgId]);

      return {
        total_leads: totalLeads,
        new_leads_month: parseInt(leadStats.new_leads_month || '0', 10),
        qualified_leads: parseInt(leadStats.qualified_leads || '0', 10),
        unassigned_leads: parseInt(leadStats.unassigned_leads || '0', 10),
        leads_requiring_followup: parseInt(leadStats.leads_requiring_followup || '0', 10),
        active_deals_count: parseInt(dealStats.active_deals_count || '0', 10),
        total_pipeline_value: parseFloat(dealStats.total_pipeline_value || '0'),
        weighted_forecast_value: parseFloat(dealStats.weighted_forecast || '0'),
        won_deals_month_value: parseFloat(dealStats.won_deals_month || '0'),
        conversion_rate_percent: conversionRate,
        leads_by_status: leadsByStatus,
        leads_by_source: leadsBySource,
        deals_by_stage: dealsByStage,
        recent_activities: recentActRes.rows,
        upcoming_followups: upcomingActRes.rows,
      };
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 2. LEAD MANAGEMENT
  // ==========================================
  public static async getLeads(
    orgId: string,
    filters: {
      search?: string;
      status?: string;
      source_id?: string;
      assigned_employee_id?: string;
      priority?: string;
      relationship_type?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ leads: Lead[]; total: number }> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          l.*,
          s.name as source_name,
          e.display_name as assigned_employee_name
        FROM crm_leads l
        LEFT JOIN crm_lead_sources s ON l.source_id = s.id
        LEFT JOIN employees e ON l.assigned_employee_id = e.id
        WHERE l.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.search) {
        params.push(`%${filters.search.toLowerCase()}%`);
        query += ` AND (
          LOWER(l.first_name) LIKE $${params.length} OR
          LOWER(l.last_name) LIKE $${params.length} OR
          LOWER(l.display_name) LIKE $${params.length} OR
          LOWER(COALESCE(l.company_name, '')) LIKE $${params.length} OR
          LOWER(COALESCE(l.email, '')) LIKE $${params.length} OR
          l.phone LIKE $${params.length}
        )`;
      }

      if (filters.status) {
        params.push(filters.status);
        query += ` AND l.status = $${params.length}`;
      }

      if (filters.source_id) {
        params.push(filters.source_id);
        query += ` AND l.source_id = $${params.length}`;
      }

      if (filters.assigned_employee_id) {
        params.push(filters.assigned_employee_id);
        query += ` AND l.assigned_employee_id = $${params.length}`;
      }

      if (filters.priority) {
        params.push(filters.priority);
        query += ` AND l.priority = $${params.length}`;
      }

      if (filters.relationship_type) {
        params.push(filters.relationship_type);
        query += ` AND l.relationship_type = $${params.length}`;
      }

      // Count query
      const countRes = await client.query(`SELECT COUNT(*) as count FROM (${query}) q`, params);
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      params.push(limit, offset);
      query += ` ORDER BY l.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const res = await client.query(query, params);
      return { leads: res.rows, total };
    } finally {
      client.release();
    }
  }

  public static async getLeadById(orgId: string, leadId: string): Promise<Lead | null> {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          l.*,
          s.name as source_name,
          e.display_name as assigned_employee_name
        FROM crm_leads l
        LEFT JOIN crm_lead_sources s ON l.source_id = s.id
        LEFT JOIN employees e ON l.assigned_employee_id = e.id
        WHERE l.organization_id = $1 AND l.id = $2
      `, [orgId, leadId]);

      if (res.rows.length === 0) return null;
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  public static async createLead(
    orgId: string,
    data: Partial<Lead>,
    actor: { id: string; email: string }
  ): Promise<Lead> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Duplicate check (phone or email in same org)
      if (data.phone) {
        const dupCheck = await client.query(`
          SELECT id, lead_number, display_name FROM crm_leads
          WHERE organization_id = $1 AND phone = $2 AND status NOT IN ('archived', 'lost')
          LIMIT 1
        `, [orgId, data.phone]);
        if (dupCheck.rows.length > 0) {
          throw new Error(`A lead with phone number ${data.phone} already exists (${dupCheck.rows[0].display_name} - ${dupCheck.rows[0].lead_number}).`);
        }
      }

      // 2. Generate lead number
      const numRes = await client.query(`
        SELECT COUNT(*) as cnt FROM crm_leads WHERE organization_id = $1
      `, [orgId]);
      const nextNum = parseInt(numRes.rows[0]?.cnt || '0', 10) + 1;
      const leadNumber = `LEAD-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      const id = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // 3. Dynamic Lead Scoring Algorithm
      let leadScore = 40;
      if (data.estimated_deal_value && Number(data.estimated_deal_value) >= 1000000) leadScore += 25;
      if (data.purchase_timeline === 'immediate' || data.purchase_timeline === '30_days') leadScore += 20;
      if (data.email) leadScore += 10;
      if (data.company_name) leadScore += 10;
      leadScore = Math.min(leadScore, 100);

      const displayName = data.display_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'New Lead';

      const insertRes = await client.query(`
        INSERT INTO crm_leads (
          id, organization_id, lead_number, first_name, last_name, display_name, company_name,
          designation, email, phone, alternate_phone, website, address, city, state, country, pincode,
          relationship_type, industry, business_category, expected_requirement, estimated_quantity,
          estimated_deal_value, product_interest, purchase_timeline, budget_range, current_supplier, business_size,
          source_id, campaign_id, campaign_name, assigned_employee_id, assigned_team, territory,
          lead_score, priority, status, qualification_notes, next_follow_up_date, tags,
          created_by_user_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34,
          $35, $36, $37, $38, $39, $40,
          $41, NOW(), NOW()
        ) RETURNING *
      `, [
        id, orgId, leadNumber, data.first_name || 'Prospect', data.last_name || '', displayName, data.company_name || null,
        data.designation || null, data.email || null, data.phone || '', data.alternate_phone || null, data.website || null,
        data.address || null, data.city || null, data.state || null, data.country || 'India', data.pincode || null,
        data.relationship_type || 'b2b_client', data.industry || null, data.business_category || null,
        data.expected_requirement || null, data.estimated_quantity || null, data.estimated_deal_value || 0,
        JSON.stringify(data.product_interest || []), data.purchase_timeline || '30_days', data.budget_range || null,
        data.current_supplier || null, data.business_size || 'medium', data.source_id || null, data.campaign_id || null,
        data.campaign_name || null, data.assigned_employee_id || null, data.assigned_team || null, data.territory || null,
        leadScore, data.priority || 'medium', data.status || 'new', data.qualification_notes || null,
        data.next_follow_up_date || null, JSON.stringify(data.tags || []), actor.id
      ]);

      // Record initial status
      await client.query(`
        INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id)
        VALUES ($1, $2, NULL, $3, 'Initial lead creation', $4)
      `, [`lsh-${Date.now()}`, id, data.status || 'new', actor.id]);

      await client.query('COMMIT;');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async updateLead(
    orgId: string,
    leadId: string,
    data: Partial<Lead>,
    actor: { id: string; email: string }
  ): Promise<Lead> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Fetch existing
      const existingRes = await client.query(`SELECT * FROM crm_leads WHERE organization_id = $1 AND id = $2`, [orgId, leadId]);
      if (existingRes.rows.length === 0) throw new Error('Lead not found.');
      const prev = existingRes.rows[0];

      // If status changed, record in history
      if (data.status && data.status !== prev.status) {
        await client.query(`
          INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [`lsh-${Date.now()}`, leadId, prev.status, data.status, data.qualification_notes || 'Status update', actor.id]);
      }

      const updateRes = await client.query(`
        UPDATE crm_leads SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          display_name = COALESCE($3, display_name),
          company_name = COALESCE($4, company_name),
          designation = COALESCE($5, designation),
          email = COALESCE($6, email),
          phone = COALESCE($7, phone),
          alternate_phone = COALESCE($8, alternate_phone),
          website = COALESCE($9, website),
          address = COALESCE($10, address),
          city = COALESCE($11, city),
          state = COALESCE($12, state),
          pincode = COALESCE($13, pincode),
          relationship_type = COALESCE($14, relationship_type),
          industry = COALESCE($15, industry),
          expected_requirement = COALESCE($16, expected_requirement),
          estimated_deal_value = COALESCE($17, estimated_deal_value),
          purchase_timeline = COALESCE($18, purchase_timeline),
          assigned_employee_id = COALESCE($19, assigned_employee_id),
          assigned_team = COALESCE($20, assigned_team),
          territory = COALESCE($21, territory),
          priority = COALESCE($22, priority),
          status = COALESCE($23, status),
          qualification_notes = COALESCE($24, qualification_notes),
          disqualification_reason = COALESCE($25, disqualification_reason),
          next_follow_up_date = COALESCE($26, next_follow_up_date),
          lead_score = COALESCE($27, lead_score),
          updated_at = NOW()
        WHERE organization_id = $28 AND id = $29
        RETURNING *
      `, [
        data.first_name, data.last_name, data.display_name, data.company_name, data.designation,
        data.email, data.phone, data.alternate_phone, data.website, data.address,
        data.city, data.state, data.pincode, data.relationship_type, data.industry,
        data.expected_requirement, data.estimated_deal_value, data.purchase_timeline,
        data.assigned_employee_id, data.assigned_team, data.territory, data.priority,
        data.status, data.qualification_notes, data.disqualification_reason,
        data.next_follow_up_date, data.lead_score, orgId, leadId
      ]);

      await client.query('COMMIT;');
      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 3. TRANSACTION-SAFE LEAD CONVERSION ENGINE
  // ==========================================
  public static async convertLead(
    orgId: string,
    leadId: string,
    params: {
      account_name?: string;
      existing_account_id?: string;
      deal_title?: string;
      pipeline_id?: string;
      deal_value?: number;
      expected_close_date?: string;
      link_to_operational_entity?: {
        entity_type: 'customer' | 'retailer' | 'distributor' | 'cf';
        entity_id: string;
      };
    },
    actor: { id: string; email: string }
  ): Promise<{ account: CrmAccount; contact: CrmContact; deal?: Deal }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const leadRes = await client.query(`SELECT * FROM crm_leads WHERE organization_id = $1 AND id = $2`, [orgId, leadId]);
      if (leadRes.rows.length === 0) throw new Error('Lead not found.');
      const lead = leadRes.rows[0];
      if (lead.is_converted) throw new Error(`Lead has already been converted on ${lead.converted_at}.`);

      // 1. Create or resolve Account
      let accountId = params.existing_account_id;
      let account: CrmAccount;

      if (!accountId) {
        accountId = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const accountName = params.account_name || lead.company_name || `${lead.display_name} Commercial Account`;
        const accountNumRes = await client.query(`SELECT COUNT(*) as cnt FROM crm_accounts WHERE organization_id = $1`, [orgId]);
        const accNum = `ACC-${new Date().getFullYear()}-${String(parseInt(accountNumRes.rows[0]?.cnt || '0', 10) + 1).padStart(4, '0')}`;

        const accRes = await client.query(`
          INSERT INTO crm_accounts (
            id, organization_id, account_number, name, legal_name, relationship_type, industry,
            tier, website, email, phone, address, city, state, pincode, credit_limit,
            assigned_employee_id, territory, status, created_by_user_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $4, $5, $6,
            'tier_2', $7, $8, $9, $10, $11, $12, $13, 0.00,
            $14, $15, 'active', $16, NOW(), NOW()
          ) RETURNING *
        `, [
          accountId, orgId, accNum, accountName, lead.relationship_type, lead.industry,
          lead.website, lead.email, lead.phone, lead.address, lead.city, lead.state, lead.pincode,
          lead.assigned_employee_id, lead.territory, actor.id
        ]);
        account = accRes.rows[0];
      } else {
        const existingAcc = await client.query(`SELECT * FROM crm_accounts WHERE organization_id = $1 AND id = $2`, [orgId, accountId]);
        if (existingAcc.rows.length === 0) throw new Error('Selected target account does not exist.');
        account = existingAcc.rows[0];
      }

      // 2. Link to existing operational entity if requested
      if (params.link_to_operational_entity) {
        const { entity_type, entity_id } = params.link_to_operational_entity;
        await client.query(`
          INSERT INTO crm_account_links (id, organization_id, account_id, entity_type, entity_id, is_primary)
          VALUES ($1, $2, $3, $4, $5, TRUE)
          ON CONFLICT (account_id, entity_type, entity_id) DO NOTHING
        `, [`link-${Date.now()}`, orgId, accountId, entity_type, entity_id]);
      }

      // 3. Create Contact
      const contactId = `con-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const conRes = await client.query(`
        INSERT INTO crm_contacts (
          id, organization_id, account_id, first_name, last_name, display_name,
          designation, email, phone, alternate_phone, is_primary, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, TRUE, 'active', NOW(), NOW()
        ) RETURNING *
      `, [
        contactId, orgId, accountId, lead.first_name, lead.last_name, lead.display_name,
        lead.designation, lead.email, lead.phone, lead.alternate_phone
      ]);
      const contact = conRes.rows[0];

      // 4. Optionally Create Opportunity / Deal
      let deal: Deal | undefined;
      let dealId: string | null = null;
      if (params.deal_title || params.deal_value) {
        dealId = `deal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const dealNumRes = await client.query(`SELECT COUNT(*) as cnt FROM crm_deals WHERE organization_id = $1`, [orgId]);
        const dealNum = `DEAL-${new Date().getFullYear()}-${String(parseInt(dealNumRes.rows[0]?.cnt || '0', 10) + 1).padStart(4, '0')}`;

        // Get default pipeline and stage
        let pipeId = params.pipeline_id;
        if (!pipeId) {
          const pipeRes = await client.query(`SELECT id FROM crm_pipelines WHERE organization_id = $1 AND is_default = TRUE LIMIT 1`, [orgId]);
          pipeId = pipeRes.rows[0]?.id;
        }
        const stageRes = await client.query(`SELECT id FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY display_order ASC LIMIT 1`, [pipeId]);
        const stageId = stageRes.rows[0]?.id;

        const dealVal = params.deal_value || lead.estimated_deal_value || 0;
        const closeDate = params.expected_close_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const ownerEmp = lead.assigned_employee_id || 'emp-007';

        const dealRes = await client.query(`
          INSERT INTO crm_deals (
            id, organization_id, deal_number, title, pipeline_id, stage_id, account_id,
            primary_contact_id, lead_id, deal_value, expected_close_date, owner_employee_id,
            territory, status, created_by_user_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, 'open', $14, NOW(), NOW()
          ) RETURNING *
        `, [
          dealId, orgId, dealNum, params.deal_title || `${account.name} Initial Opportunity`, pipeId, stageId, accountId,
          contactId, leadId, dealVal, closeDate, ownerEmp, lead.territory, actor.id
        ]);
        deal = dealRes.rows[0];
      }

      // 5. Update Lead as Converted & Preserve History
      await client.query(`
        UPDATE crm_leads SET
          status = 'converted',
          is_converted = TRUE,
          converted_at = NOW(),
          converted_by_user_id = $1,
          converted_account_id = $2,
          converted_contact_id = $3,
          converted_deal_id = $4,
          updated_at = NOW()
        WHERE id = $5 AND organization_id = $6
      `, [actor.id, accountId, contactId, dealId, leadId, orgId]);

      // Re-link previous activities to Account & Deal
      await client.query(`
        UPDATE crm_activities SET
          account_id = $1,
          deal_id = COALESCE($2, deal_id)
        WHERE lead_id = $3 AND organization_id = $4
      `, [accountId, dealId, leadId, orgId]);

      // Re-link notes
      await client.query(`
        UPDATE crm_notes SET
          account_id = $1,
          deal_id = COALESCE($2, deal_id)
        WHERE lead_id = $3 AND organization_id = $4
      `, [accountId, dealId, leadId, orgId]);

      await client.query('COMMIT;');
      return { account, contact, deal };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 4. ACCOUNTS & CONTACTS
  // ==========================================
  public static async getAccounts(
    orgId: string,
    filters: { search?: string; relationship_type?: string; tier?: string; status?: string } = {}
  ): Promise<CrmAccount[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          a.*,
          e.display_name as assigned_employee_name,
          l.entity_type as linked_entity_type,
          l.entity_id as linked_entity_id,
          l.entity_name as linked_entity_name,
          (SELECT COUNT(*) FROM crm_contacts WHERE account_id = a.id) as contacts_count,
          (SELECT COUNT(*) FROM crm_deals WHERE account_id = a.id AND status = 'open') as open_deals_count,
          (SELECT COALESCE(SUM(deal_value), 0) FROM crm_deals WHERE account_id = a.id AND status = 'open') as total_deal_value
        FROM crm_accounts a
        LEFT JOIN employees e ON a.assigned_employee_id = e.id
        LEFT JOIN crm_account_links l ON a.id = l.account_id AND l.is_primary = TRUE
        WHERE a.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.search) {
        params.push(`%${filters.search.toLowerCase()}%`);
        query += ` AND (LOWER(a.name) LIKE $${params.length} OR LOWER(a.account_number) LIKE $${params.length} OR LOWER(COALESCE(a.city, '')) LIKE $${params.length})`;
      }
      if (filters.relationship_type) {
        params.push(filters.relationship_type);
        query += ` AND a.relationship_type = $${params.length}`;
      }
      if (filters.tier) {
        params.push(filters.tier);
        query += ` AND a.tier = $${params.length}`;
      }
      if (filters.status) {
        params.push(filters.status);
        query += ` AND a.status = $${params.length}`;
      }

      query += ` ORDER BY a.created_at DESC`;
      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createAccount(
    orgId: string,
    data: Partial<CrmAccount>,
    actor: { id: string; email: string }
  ): Promise<CrmAccount> {
    const client = await pool.connect();
    try {
      const id = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const numRes = await client.query(`SELECT COUNT(*) as cnt FROM crm_accounts WHERE organization_id = $1`, [orgId]);
      const accNum = `ACC-${new Date().getFullYear()}-${String(parseInt(numRes.rows[0]?.cnt || '0', 10) + 1).padStart(4, '0')}`;

      const res = await client.query(`
        INSERT INTO crm_accounts (
          id, organization_id, account_number, name, legal_name, relationship_type, industry,
          tier, website, email, phone, address, city, state, pincode, gstin, pan, credit_limit,
          assigned_employee_id, territory, status, created_by_user_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, 'active', $21, NOW(), NOW()
        ) RETURNING *
      `, [
        id, orgId, accNum, data.name, data.legal_name || data.name, data.relationship_type || 'b2b_client',
        data.industry || null, data.tier || 'tier_2', data.website || null, data.email || null,
        data.phone || null, data.address || null, data.city || null, data.state || null, data.pincode || null,
        data.gstin || null, data.pan || null, data.credit_limit || 0, data.assigned_employee_id || null,
        data.territory || null, actor.id
      ]);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  public static async getContacts(orgId: string, accountId?: string): Promise<CrmContact[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT c.*, a.name as account_name
        FROM crm_contacts c
        LEFT JOIN crm_accounts a ON c.account_id = a.id
        WHERE c.organization_id = $1
      `;
      const params: any[] = [orgId];
      if (accountId) {
        params.push(accountId);
        query += ` AND c.account_id = $${params.length}`;
      }
      query += ` ORDER BY c.is_primary DESC, c.first_name ASC`;
      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createContact(orgId: string, data: Partial<CrmContact>): Promise<CrmContact> {
    const client = await pool.connect();
    try {
      const id = `con-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const displayName = data.display_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
      const res = await client.query(`
        INSERT INTO crm_contacts (
          id, organization_id, account_id, first_name, last_name, display_name,
          designation, department, role, email, phone, alternate_phone, is_primary, notes, status,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14, 'active',
          NOW(), NOW()
        ) RETURNING *
      `, [
        id, orgId, data.account_id || null, data.first_name || '', data.last_name || '', displayName,
        data.designation || null, data.department || null, data.role || 'general', data.email || null,
        data.phone || '', data.alternate_phone || null, Boolean(data.is_primary), data.notes || null
      ]);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 5. DEALS & PIPELINES
  // ==========================================
  public static async getPipelines(orgId: string): Promise<Pipeline[]> {
    const client = await pool.connect();
    try {
      const pipesRes = await client.query(`
        SELECT * FROM crm_pipelines WHERE organization_id = $1 AND is_active = TRUE ORDER BY is_default DESC, name ASC
      `, [orgId]);

      const pipelines: Pipeline[] = [];
      for (const p of pipesRes.rows) {
        const stagesRes = await client.query(`
          SELECT * FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY display_order ASC
        `, [p.id]);
        pipelines.push({ ...p, stages: stagesRes.rows });
      }
      return pipelines;
    } finally {
      client.release();
    }
  }

  public static async getDeals(orgId: string, pipelineId?: string): Promise<Deal[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          d.*,
          p.name as pipeline_name,
          stg.name as stage_name,
          stg.default_probability as stage_probability,
          a.name as account_name,
          c.display_name as primary_contact_name,
          e.display_name as owner_employee_name,
          (d.deal_value * (stg.default_probability::numeric / 100)) as weighted_value
        FROM crm_deals d
        JOIN crm_pipelines p ON d.pipeline_id = p.id
        JOIN crm_pipeline_stages stg ON d.stage_id = stg.id
        JOIN crm_accounts a ON d.account_id = a.id
        LEFT JOIN crm_contacts c ON d.primary_contact_id = c.id
        LEFT JOIN employees e ON d.owner_employee_id = e.id
        WHERE d.organization_id = $1
      `;
      const params: any[] = [orgId];
      if (pipelineId) {
        params.push(pipelineId);
        query += ` AND d.pipeline_id = $${params.length}`;
      }
      query += ` ORDER BY d.expected_close_date ASC`;
      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createDeal(
    orgId: string,
    data: Partial<Deal>,
    actor: { id: string; email: string }
  ): Promise<Deal> {
    const client = await pool.connect();
    try {
      const id = `deal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const numRes = await client.query(`SELECT COUNT(*) as cnt FROM crm_deals WHERE organization_id = $1`, [orgId]);
      const dealNum = `DEAL-${new Date().getFullYear()}-${String(parseInt(numRes.rows[0]?.cnt || '0', 10) + 1).padStart(4, '0')}`;

      const res = await client.query(`
        INSERT INTO crm_deals (
          id, organization_id, deal_number, title, pipeline_id, stage_id, account_id,
          primary_contact_id, lead_id, deal_value, expected_quantity, expected_close_date,
          owner_employee_id, territory, status, description, created_by_user_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, 'open', $15, $16, NOW(), NOW()
        ) RETURNING *
      `, [
        id, orgId, dealNum, data.title, data.pipeline_id, data.stage_id, data.account_id,
        data.primary_contact_id || null, data.lead_id || null, data.deal_value || 0,
        data.expected_quantity || null, data.expected_close_date || new Date().toISOString().split('T')[0],
        data.owner_employee_id || 'emp-007', data.territory || null, data.description || null, actor.id
      ]);

      return res.rows[0];
    } finally {
      client.release();
    }
  }

  public static async updateDealStage(
    orgId: string,
    dealId: string,
    newStageId: string,
    notes?: string,
    actor?: { id: string; email: string }
  ): Promise<Deal> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const curDeal = await client.query(`SELECT * FROM crm_deals WHERE organization_id = $1 AND id = $2`, [orgId, dealId]);
      if (curDeal.rows.length === 0) throw new Error('Deal not found.');
      const prev = curDeal.rows[0];

      const stageRes = await client.query(`SELECT * FROM crm_pipeline_stages WHERE id = $1`, [newStageId]);
      if (stageRes.rows.length === 0) throw new Error('Target stage not found.');
      const stage = stageRes.rows[0];

      let dealStatus = 'open';
      let actualCloseDate: string | null = null;
      if (stage.is_won_stage) {
        dealStatus = 'won';
        actualCloseDate = new Date().toISOString().split('T')[0];
      } else if (stage.is_lost_stage) {
        dealStatus = 'lost';
        actualCloseDate = new Date().toISOString().split('T')[0];
      }

      await client.query(`
        INSERT INTO crm_deal_stage_history (id, deal_id, previous_stage_id, new_stage_id, notes, changed_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [`dsh-${Date.now()}`, dealId, prev.stage_id, newStageId, notes || null, actor?.id || null]);

      const updateRes = await client.query(`
        UPDATE crm_deals SET
          stage_id = $1,
          status = $2,
          actual_close_date = COALESCE($3, actual_close_date),
          updated_at = NOW()
        WHERE id = $4 AND organization_id = $5
        RETURNING *
      `, [newStageId, dealStatus, actualCloseDate, dealId, orgId]);

      await client.query('COMMIT;');
      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 6. SALES HANDOFF GENERATION
  // ==========================================
  public static async createSalesHandoff(
    orgId: string,
    dealId: string,
    params: { special_terms?: string; delivery_timeline?: string },
    actor: { id: string; email: string }
  ): Promise<DealHandoff> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const dealRes = await client.query(`SELECT * FROM crm_deals WHERE organization_id = $1 AND id = $2`, [orgId, dealId]);
      if (dealRes.rows.length === 0) throw new Error('Deal not found.');
      const deal = dealRes.rows[0];

      const itemsRes = await client.query(`SELECT * FROM crm_deal_items WHERE deal_id = $1`, [dealId]);
      const items = itemsRes.rows.length > 0 ? itemsRes.rows : [{
        product_name: deal.title,
        sku: 'COMMERCIAL-ORDER',
        quantity: deal.expected_quantity || 1,
        unit_price: deal.deal_value,
        total: deal.deal_value,
      }];

      const idempotencyKey = `handoff-${dealId}-${deal.deal_value}`;
      const handoffId = `hnd-${Date.now()}`;
      const handoffNum = `HND-${new Date().getFullYear()}-${deal.deal_number.replace('DEAL-', '')}`;

      const insertRes = await client.query(`
        INSERT INTO crm_deal_handoffs (
          id, organization_id, deal_id, handoff_number, account_id, contact_id,
          idempotency_key, pricing_assumptions, line_items, special_terms, delivery_timeline,
          status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          'pending_review', NOW()
        )
        ON CONFLICT (idempotency_key) DO UPDATE
        SET special_terms = EXCLUDED.special_terms
        RETURNING *
      `, [
        handoffId, orgId, dealId, handoffNum, deal.account_id, deal.primary_contact_id,
        idempotencyKey, JSON.stringify({ base_value: deal.deal_value }), JSON.stringify(items),
        params.special_terms || null, params.delivery_timeline || '30 days upon order acceptance'
      ]);

      await client.query(`
        UPDATE crm_deals SET is_handed_off = TRUE, handoff_id = $1 WHERE id = $2
      `, [insertRes.rows[0].id, dealId]);

      await client.query('COMMIT;');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 7. ACTIVITIES & TIMELINE
  // ==========================================
  public static async getActivities(
    orgId: string,
    filters: { lead_id?: string; account_id?: string; deal_id?: string; is_completed?: boolean } = {}
  ): Promise<CrmActivity[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT a.*, e.display_name as assigned_employee_name
        FROM crm_activities a
        LEFT JOIN employees e ON a.assigned_employee_id = e.id
        WHERE a.organization_id = $1
      `;
      const params: any[] = [orgId];

      if (filters.lead_id) {
        params.push(filters.lead_id);
        query += ` AND a.lead_id = $${params.length}`;
      }
      if (filters.account_id) {
        params.push(filters.account_id);
        query += ` AND a.account_id = $${params.length}`;
      }
      if (filters.deal_id) {
        params.push(filters.deal_id);
        query += ` AND a.deal_id = $${params.length}`;
      }
      if (filters.is_completed !== undefined) {
        params.push(filters.is_completed);
        query += ` AND a.is_completed = $${params.length}`;
      }

      query += ` ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC`;
      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async createActivity(
    orgId: string,
    data: Partial<CrmActivity>,
    actor: { id: string; email: string }
  ): Promise<CrmActivity> {
    const client = await pool.connect();
    try {
      const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const res = await client.query(`
        INSERT INTO crm_activities (
          id, organization_id, activity_type, subject, description, due_date,
          is_completed, priority, lead_id, account_id, contact_id, deal_id,
          assigned_employee_id, logged_by_user_id, outcome, outcome_notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, NOW(), NOW()
        ) RETURNING *
      `, [
        id, orgId, data.activity_type || 'follow_up', data.subject, data.description || null,
        data.due_date || null, Boolean(data.is_completed), data.priority || 'normal',
        data.lead_id || null, data.account_id || null, data.contact_id || null, data.deal_id || null,
        data.assigned_employee_id || null, actor.id, data.outcome || null, data.outcome_notes || null
      ]);

      // Update lead last activity date
      if (data.lead_id) {
        await client.query(`UPDATE crm_leads SET last_activity_date = NOW() WHERE id = $1`, [data.lead_id]);
      }

      return res.rows[0];
    } finally {
      client.release();
    }
  }

  public static async completeActivity(
    orgId: string,
    activityId: string,
    outcome?: string,
    notes?: string
  ): Promise<CrmActivity> {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        UPDATE crm_activities SET
          is_completed = TRUE,
          completed_at = NOW(),
          outcome = COALESCE($1, outcome),
          outcome_notes = COALESCE($2, outcome_notes),
          updated_at = NOW()
        WHERE id = $3 AND organization_id = $4
        RETURNING *
      `, [outcome || 'positive', notes || null, activityId, orgId]);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 8. INTEGRATIONS & WEBHOOK INGESTION
  // ==========================================
  public static async getIntegrationConfigs(orgId: string): Promise<CrmIntegrationConfig[]> {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT * FROM crm_integration_configs WHERE organization_id = $1 ORDER BY provider ASC
      `, [orgId]);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public static async ingestInboundLead(
    orgId: string,
    sourceKey: string,
    payload: Record<string, any>,
    ipAddress?: string
  ): Promise<{ success: boolean; lead_id?: string; lead_number?: string; message: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Resolve source
      const srcRes = await client.query(`
        SELECT id FROM crm_lead_sources WHERE organization_id = $1 AND (channel_type = $2 OR code = $2) LIMIT 1
      `, [orgId, sourceKey]);
      const sourceId = srcRes.rows[0]?.id || null;

      const phone = String(payload.phone || payload.mobile || payload.contact_number || '').trim();
      const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
      const firstName = payload.first_name || (payload.name ? String(payload.name).split(' ')[0] : 'Inbound');
      const lastName = payload.last_name || (payload.name && String(payload.name).split(' ').length > 1 ? String(payload.name).split(' ').slice(1).join(' ') : 'Prospect');

      // Duplicate guard
      if (phone) {
        const dupRes = await client.query(`
          SELECT id, lead_number FROM crm_leads WHERE organization_id = $1 AND phone = $2 AND status NOT IN ('archived', 'lost') LIMIT 1
        `, [orgId, phone]);
        if (dupRes.rows.length > 0) {
          // Log duplicate event
          await client.query(`
            INSERT INTO crm_webhook_logs (id, organization_id, source, payload, status, created_lead_id, error_details, ip_address)
            VALUES ($1, $2, $3, $4, 'ignored_duplicate', $5, 'Duplicate lead phone number detected', $6)
          `, [`wh-${Date.now()}`, orgId, sourceKey, JSON.stringify(payload), dupRes.rows[0].id, ipAddress || null]);
          await client.query('COMMIT;');
          return { success: true, lead_id: dupRes.rows[0].id, lead_number: dupRes.rows[0].lead_number, message: 'Existing lead updated' };
        }
      }

      // Generate number
      const numRes = await client.query(`SELECT COUNT(*) as cnt FROM crm_leads WHERE organization_id = $1`, [orgId]);
      const leadNumber = `LEAD-${new Date().getFullYear()}-${String(parseInt(numRes.rows[0]?.cnt || '0', 10) + 1).padStart(4, '0')}`;
      const id = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const insertRes = await client.query(`
        INSERT INTO crm_leads (
          id, organization_id, lead_number, first_name, last_name, display_name, company_name,
          email, phone, city, state, relationship_type, expected_requirement, estimated_deal_value,
          source_id, lead_score, priority, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          $15, 60, 'medium', 'new', NOW(), NOW()
        ) RETURNING id, lead_number
      `, [
        id, orgId, leadNumber, firstName, lastName, `${firstName} ${lastName}`.trim(), payload.company_name || null,
        email, phone, payload.city || null, payload.state || null, payload.relationship_type || 'b2b_client',
        payload.requirement || payload.message || 'Webform submission inquiry', Number(payload.estimated_value || 0),
        sourceId
      ]);

      // Webhook audit log
      await client.query(`
        INSERT INTO crm_webhook_logs (id, organization_id, source, payload, status, created_lead_id, ip_address)
        VALUES ($1, $2, $3, $4, 'processed', $5, $6)
      `, [`wh-${Date.now()}`, orgId, sourceKey, JSON.stringify(payload), id, ipAddress || null]);

      // Increment stats in crm_integration_configs
      await client.query(`
        UPDATE crm_integration_configs SET
          total_records_ingested = total_records_ingested + 1,
          last_successful_sync = NOW()
        WHERE organization_id = $1 AND provider = $2
      `, [orgId, sourceKey]);

      await client.query('COMMIT;');
      return { success: true, lead_id: id, lead_number: leadNumber, message: 'Lead captured successfully' };
    } catch (err: any) {
      await client.query('ROLLBACK;');
      return { success: false, message: err.message || 'Lead ingestion error' };
    } finally {
      client.release();
    }
  }
}
