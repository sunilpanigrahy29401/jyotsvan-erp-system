import { pool } from './db.ts';
import type {
  RetailerVisit,
  RetailerFollowUp,
  FollowupStatus,
  FollowupPriority,
  RetailerDocument,
  RetailerDocumentType,
} from '../types/retailers.ts';

export class RetailerActivityService {
  // ==========================================
  // Visits Foundation
  // ==========================================

  public async listVisits(
    orgId: string,
    filters: {
      retailer_id?: string;
      salesperson_id?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: RetailerVisit[]; total: number }> {
    const conditions: string[] = ['rv.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.retailer_id && filters.retailer_id !== 'all') {
      conditions.push(`rv.retailer_id = $${idx++}`);
      values.push(filters.retailer_id);
    }

    if (filters.salesperson_id && filters.salesperson_id !== 'all') {
      conditions.push(`rv.salesperson_id = $${idx++}`);
      values.push(filters.salesperson_id);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM retailer_visits rv WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        rv.*,
        r.display_name as retailer_name
      FROM retailer_visits rv
      JOIN retailers r ON r.id = rv.retailer_id
      WHERE ${whereClause}
      ORDER BY rv.visit_date DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const res = await pool.query(dataSql, [...values, limit, offset]);
    return { data: res.rows, total };
  }

  public async logVisit(
    orgId: string,
    data: {
      retailer_id: string;
      salesperson_id?: string;
      salesperson_name: string;
      visit_date?: string;
      purpose: string;
      notes?: string;
      outcome?: string;
      next_follow_up_date?: string;
    }
  ): Promise<RetailerVisit> {
    const id = `visit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO retailer_visits (
        id, organization_id, retailer_id, salesperson_id, salesperson_name,
        visit_date, purpose, notes, outcome, next_follow_up_date
      ) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()), $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        orgId,
        data.retailer_id,
        data.salesperson_id || null,
        data.salesperson_name,
        data.visit_date || null,
        data.purpose || 'routine_order_booking',
        data.notes || null,
        data.outcome || null,
        data.next_follow_up_date || null,
      ]
    );

    // If next_follow_up_date is supplied, auto-create a linked open follow-up task
    if (data.next_follow_up_date) {
      const fupId = `fup-${id}`;
      await pool.query(
        `INSERT INTO retailer_follow_ups (
          id, organization_id, retailer_id, visit_id, assigned_user_id,
          assigned_user_name, due_date, priority, subject, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'medium', $8, $9, 'open')`,
        [
          fupId,
          orgId,
          data.retailer_id,
          id,
          data.salesperson_id || null,
          data.salesperson_name,
          data.next_follow_up_date,
          `Follow-up on visit outcome (${data.purpose})`,
          data.outcome || data.notes || 'Scheduled follow-up task',
        ]
      );
    }

    return res.rows[0];
  }

  // ==========================================
  // Follow-ups & Tasks
  // ==========================================

  public async listFollowups(
    orgId: string,
    filters: {
      retailer_id?: string;
      priority?: FollowupPriority | string;
      status?: FollowupStatus | string;
      overdue_only?: boolean;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: RetailerFollowUp[]; total: number }> {
    const conditions: string[] = ['rf.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.retailer_id && filters.retailer_id !== 'all') {
      conditions.push(`rf.retailer_id = $${idx++}`);
      values.push(filters.retailer_id);
    }

    if (filters.priority && filters.priority !== 'all') {
      conditions.push(`rf.priority = $${idx++}`);
      values.push(filters.priority);
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`rf.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.overdue_only) {
      conditions.push(`rf.due_date < NOW() AND rf.status IN ('open', 'in_progress')`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM retailer_follow_ups rf WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        rf.*,
        r.display_name as retailer_name,
        r.retailer_code as retailer_code,
        CASE WHEN rf.due_date < NOW() AND rf.status IN ('open', 'in_progress') THEN true ELSE false END as is_overdue
      FROM retailer_follow_ups rf
      JOIN retailers r ON r.id = rf.retailer_id
      WHERE ${whereClause}
      ORDER BY (CASE WHEN rf.status IN ('open', 'in_progress') THEN 0 ELSE 1 END), rf.due_date ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const res = await pool.query(dataSql, [...values, limit, offset]);
    return { data: res.rows, total };
  }

  public async createFollowup(
    orgId: string,
    data: {
      retailer_id: string;
      visit_id?: string;
      assigned_user_id?: string;
      assigned_user_name: string;
      due_date: string;
      priority: FollowupPriority;
      subject: string;
      notes?: string;
    }
  ): Promise<RetailerFollowUp> {
    const id = `fup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO retailer_follow_ups (
        id, organization_id, retailer_id, visit_id, assigned_user_id,
        assigned_user_name, due_date, priority, subject, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
      RETURNING *`,
      [
        id,
        orgId,
        data.retailer_id,
        data.visit_id || null,
        data.assigned_user_id || null,
        data.assigned_user_name,
        data.due_date,
        data.priority || 'medium',
        data.subject,
        data.notes || null,
      ]
    );
    return res.rows[0];
  }

  public async updateFollowupStatus(
    orgId: string,
    id: string,
    status: FollowupStatus,
    notes?: string
  ): Promise<RetailerFollowUp> {
    const completionDate = status === 'completed' ? new Date().toISOString() : null;
    const res = await pool.query(
      `UPDATE retailer_follow_ups SET
        status = $1,
        completion_date = $2,
        notes = COALESCE($3, notes),
        updated_at = NOW()
      WHERE organization_id = $4 AND id = $5
      RETURNING *`,
      [status, completionDate, notes ? `[Status update to ${status}]: ${notes}` : null, orgId, id]
    );
    if (res.rows.length === 0) throw new Error('Follow-up task not found');
    return res.rows[0];
  }

  // ==========================================
  // Documents Management
  // ==========================================

  public async listDocuments(orgId: string, retailerId: string): Promise<RetailerDocument[]> {
    const res = await pool.query(
      `SELECT * FROM retailer_documents WHERE organization_id = $1 AND retailer_id = $2 ORDER BY uploaded_at DESC`,
      [orgId, retailerId]
    );
    return res.rows.map(r => ({
      ...r,
      file_size: parseInt(r.file_size || '0', 10)
    }));
  }

  public async uploadDocument(
    orgId: string,
    data: {
      retailer_id: string;
      document_type: RetailerDocumentType;
      title: string;
      file_url: string;
      file_name: string;
      file_size?: number;
      mime_type?: string;
      expiry_date?: string;
      notes?: string;
    },
    actor: { id: string; email: string }
  ): Promise<RetailerDocument> {
    const id = `rdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO retailer_documents (
        id, organization_id, retailer_id, document_type, title, file_url,
        file_name, file_size, mime_type, expiry_date, uploaded_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        orgId,
        data.retailer_id,
        data.document_type || 'shop_registration',
        data.title,
        data.file_url,
        data.file_name,
        data.file_size || 0,
        data.mime_type || 'application/pdf',
        data.expiry_date || null,
        actor.email,
        data.notes || null,
      ]
    );
    const r = res.rows[0];
    return {
      ...r,
      file_size: parseInt(r.file_size || '0', 10)
    };
  }

  public async deleteDocument(orgId: string, retailerId: string, documentId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM retailer_documents WHERE organization_id = $1 AND retailer_id = $2 AND id = $3`,
      [orgId, retailerId, documentId]
    );
    return (res.rowCount || 0) > 0;
  }
}
