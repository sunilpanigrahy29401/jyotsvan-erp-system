import { pool } from './db.ts';
import type {
  RetailerMaster,
  RetailerType,
  RetailerStatus,
  RetailerContact,
  RetailerAddress,
  RetailerDistributorMapping,
  RetailerSalespersonAssignment,
  RetailerAssortment,
  RetailerCommercialTerms,
  RetailerSummaryMetrics,
} from '../types/retailers.ts';

export class RetailerService {
  /**
   * List retailers with server-side filters, search, pagination, and calculated metrics
   */
  public async listRetailers(
    orgId: string,
    filters: {
      search?: string;
      status?: RetailerStatus | string;
      retailer_type?: RetailerType | string;
      region?: string;
      state?: string;
      distributor_id?: string;
      territory_id?: string;
      salesperson_id?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: RetailerMaster[]; total: number }> {
    const conditions: string[] = ['r.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.search) {
      conditions.push(
        `(r.legal_name ILIKE $${idx} OR r.display_name ILIKE $${idx} OR r.retailer_code ILIKE $${idx} OR r.city ILIKE $${idx} OR r.state ILIKE $${idx} OR r.gstin ILIKE $${idx} OR r.email ILIKE $${idx} OR r.phone ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`r.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.retailer_type && filters.retailer_type !== 'all') {
      conditions.push(`r.retailer_type = $${idx++}`);
      values.push(filters.retailer_type);
    }

    if (filters.region && filters.region !== 'all') {
      conditions.push(`r.region = $${idx++}`);
      values.push(filters.region);
    }

    if (filters.state && filters.state !== 'all') {
      conditions.push(`r.state ILIKE $${idx++}`);
      values.push(`%${filters.state}%`);
    }

    if (filters.territory_id) {
      conditions.push(`r.territory_id = $${idx++}`);
      values.push(filters.territory_id);
    }

    if (filters.distributor_id) {
      conditions.push(
        `(r.primary_distributor_id = $${idx} OR EXISTS (SELECT 1 FROM retailer_distributor_mappings rdm WHERE rdm.retailer_id = r.id AND rdm.distributor_id = $${idx}))`
      );
      values.push(filters.distributor_id);
      idx++;
    }

    if (filters.salesperson_id) {
      conditions.push(
        `(r.assigned_salesperson_id = $${idx} OR EXISTS (SELECT 1 FROM retailer_salesperson_assignments rsa WHERE rsa.retailer_id = r.id AND rsa.user_id = $${idx}))`
      );
      values.push(filters.salesperson_id);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM retailers r WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        r.*,
        t.territory_name as territory_name,
        d.display_name as primary_distributor_name,
        d.distributor_code as primary_distributor_code,
        c.name as cf_name,
        (SELECT COUNT(*) FROM retailer_distributor_mappings rdm WHERE rdm.retailer_id = r.id AND rdm.status = 'active') as mapped_distributors_count,
        (SELECT COUNT(*) FROM retailer_assortments ra WHERE ra.retailer_id = r.id AND ra.status = 'active') as active_skus_count,
        (SELECT COALESCE(SUM(rs.quantity_on_hand), 0) FROM retailer_stock rs WHERE rs.retailer_id = r.id) as stock_units_on_hand,
        (SELECT COALESCE(SUM(rs.quantity_on_hand * rs.unit_cost), 0) FROM retailer_stock rs WHERE rs.retailer_id = r.id) as stock_valuation,
        (SELECT COALESCE(SUM(ro.total_estimated_amount), 0) FROM retailer_order_requests ro WHERE ro.retailer_id = r.id AND ro.status IN ('submitted', 'approved')) as current_outstanding_amount,
        (SELECT COUNT(*) FROM retailer_order_requests ro WHERE ro.retailer_id = r.id AND ro.status = 'submitted') as pending_orders_count,
        (SELECT COUNT(*) FROM retailer_follow_ups rf WHERE rf.retailer_id = r.id AND rf.status IN ('open', 'in_progress')) as pending_followups_count,
        (SELECT MAX(rv.visit_date) FROM retailer_visits rv WHERE rv.retailer_id = r.id) as last_visit_date
      FROM retailers r
      LEFT JOIN territories t ON t.id = r.territory_id
      LEFT JOIN distributors d ON d.id = r.primary_distributor_id
      LEFT JOIN cfs c ON c.id = r.cf_id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const dataRes = await pool.query(dataSql, [...values, limit, offset]);

    const data: RetailerMaster[] = dataRes.rows.map((row) => ({
      ...row,
      credit_limit: parseFloat(row.credit_limit || '0'),
      payment_terms_days: parseInt(row.payment_terms_days || '15', 10),
      agreed_discount_percent: parseFloat(row.agreed_discount_percent || '0'),
      warning_threshold: parseFloat(row.warning_threshold || '80'),
      mapped_distributors_count: parseInt(row.mapped_distributors_count || '0', 10),
      active_skus_count: parseInt(row.active_skus_count || '0', 10),
      stock_units_on_hand: parseFloat(row.stock_units_on_hand || '0'),
      stock_valuation: parseFloat(row.stock_valuation || '0'),
      current_outstanding_amount: parseFloat(row.current_outstanding_amount || '0'),
      available_credit: Math.max(0, parseFloat(row.credit_limit || '0') - parseFloat(row.current_outstanding_amount || '0')),
      pending_orders_count: parseInt(row.pending_orders_count || '0', 10),
      pending_followups_count: parseInt(row.pending_followups_count || '0', 10),
    }));

    return { data, total };
  }

  /**
   * Get single retailer by ID with rich relational attributes
   */
  public async getRetailerById(orgId: string, id: string): Promise<RetailerMaster | null> {
    const sql = `
      SELECT 
        r.*,
        t.territory_name as territory_name,
        d.display_name as primary_distributor_name,
        d.distributor_code as primary_distributor_code,
        c.name as cf_name,
        (SELECT COUNT(*) FROM retailer_distributor_mappings rdm WHERE rdm.retailer_id = r.id AND rdm.status = 'active') as mapped_distributors_count,
        (SELECT COUNT(*) FROM retailer_assortments ra WHERE ra.retailer_id = r.id AND ra.status = 'active') as active_skus_count,
        (SELECT COALESCE(SUM(rs.quantity_on_hand), 0) FROM retailer_stock rs WHERE rs.retailer_id = r.id) as stock_units_on_hand,
        (SELECT COALESCE(SUM(rs.quantity_on_hand * rs.unit_cost), 0) FROM retailer_stock rs WHERE rs.retailer_id = r.id) as stock_valuation,
        (SELECT COALESCE(SUM(ro.total_estimated_amount), 0) FROM retailer_order_requests ro WHERE ro.retailer_id = r.id AND ro.status IN ('submitted', 'approved')) as current_outstanding_amount,
        (SELECT COUNT(*) FROM retailer_order_requests ro WHERE ro.retailer_id = r.id AND ro.status = 'submitted') as pending_orders_count,
        (SELECT COUNT(*) FROM retailer_follow_ups rf WHERE rf.retailer_id = r.id AND rf.status IN ('open', 'in_progress')) as pending_followups_count,
        (SELECT MAX(rv.visit_date) FROM retailer_visits rv WHERE rv.retailer_id = r.id) as last_visit_date
      FROM retailers r
      LEFT JOIN territories t ON t.id = r.territory_id
      LEFT JOIN distributors d ON d.id = r.primary_distributor_id
      LEFT JOIN cfs c ON c.id = r.cf_id
      WHERE r.organization_id = $1 AND r.id = $2
    `;

    const res = await pool.query(sql, [orgId, id]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      ...row,
      credit_limit: parseFloat(row.credit_limit || '0'),
      payment_terms_days: parseInt(row.payment_terms_days || '15', 10),
      agreed_discount_percent: parseFloat(row.agreed_discount_percent || '0'),
      warning_threshold: parseFloat(row.warning_threshold || '80'),
      mapped_distributors_count: parseInt(row.mapped_distributors_count || '0', 10),
      active_skus_count: parseInt(row.active_skus_count || '0', 10),
      stock_units_on_hand: parseFloat(row.stock_units_on_hand || '0'),
      stock_valuation: parseFloat(row.stock_valuation || '0'),
      current_outstanding_amount: parseFloat(row.current_outstanding_amount || '0'),
      available_credit: Math.max(0, parseFloat(row.credit_limit || '0') - parseFloat(row.current_outstanding_amount || '0')),
      pending_orders_count: parseInt(row.pending_orders_count || '0', 10),
      pending_followups_count: parseInt(row.pending_followups_count || '0', 10),
    };
  }

  /**
   * Create a new Retailer Master entity with audit logging
   */
  public async createRetailer(
    orgId: string,
    data: Partial<RetailerMaster>,
    actor: { id: string; email: string }
  ): Promise<RetailerMaster> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Auto-generate code if absent
      let code = data.retailer_code?.trim().toUpperCase();
      if (!code) {
        const countRes = await client.query(
          'SELECT COUNT(*) FROM retailers WHERE organization_id = $1',
          [orgId]
        );
        const seq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
        code = `RET-${(data.region || 'GEN').substring(0, 3).toUpperCase()}-${String(seq).padStart(3, '0')}`;
      }

      // Ensure unique code
      const dupCheck = await client.query(
        'SELECT id FROM retailers WHERE organization_id = $1 AND retailer_code = $2',
        [orgId, code]
      );
      if (dupCheck.rows.length > 0) {
        throw new Error(`Retailer code '${code}' already exists in this organization.`);
      }

      const id = data.id || `ret-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const insertSql = `
        INSERT INTO retailers (
          id, organization_id, retailer_code, legal_name, display_name, retailer_type, status,
          gstin, pan, phone, alternate_phone, email, registered_address, operational_address,
          city, district, state, pincode, country, territory_id, region,
          primary_distributor_id, cf_id, appointed_date, agreement_start_date, agreement_end_date,
          credit_limit, payment_terms_days, agreed_discount_percent, warning_threshold, credit_hold,
          assigned_salesperson_id, assigned_salesperson_name, notes, created_by, created_by_email
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31,
          $32, $33, $34, $35, $36
        ) RETURNING *
      `;

      const values = [
        id,
        orgId,
        code,
        data.legal_name || data.display_name,
        data.display_name || data.legal_name,
        data.retailer_type || 'agro_input_shop',
        data.status || 'active',
        data.gstin || null,
        data.pan || null,
        data.phone || '+91 00000 00000',
        data.alternate_phone || null,
        data.email || `${code.toLowerCase()}@partner.jyotsvan.enterprise`,
        data.registered_address || null,
        data.operational_address || data.registered_address || null,
        data.city || 'Mumbai',
        data.district || null,
        data.state || 'Maharashtra',
        data.pincode || '400001',
        data.country || 'India',
        data.territory_id || null,
        data.region || 'West',
        data.primary_distributor_id || null,
        data.cf_id || null,
        data.appointed_date || new Date().toISOString(),
        data.agreement_start_date || new Date().toISOString(),
        data.agreement_end_date || null,
        data.credit_limit || 200000,
        data.payment_terms_days || 15,
        data.agreed_discount_percent || 3.0,
        data.warning_threshold || 80.0,
        data.credit_hold || false,
        data.assigned_salesperson_id || null,
        data.assigned_salesperson_name || null,
        data.notes || null,
        actor.id,
        actor.email,
      ];

      const res = await client.query(insertSql, values);
      const retailer = res.rows[0];

      // Auto-insert default contact if provided
      if (data.phone) {
        await client.query(
          `INSERT INTO retailer_contacts (
            id, organization_id, retailer_id, name, designation, phone, email, preferred_contact_method, is_primary, status
          ) VALUES ($1, $2, $3, $4, 'Owner', $5, $6, 'phone', TRUE, 'active')`,
          [
            `cont-${id}-1`,
            orgId,
            id,
            retailer.display_name + ' (Owner)',
            retailer.phone,
            retailer.email,
          ]
        );
      }

      // Auto-insert default store address
      await client.query(
        `INSERT INTO retailer_addresses (
          id, organization_id, retailer_id, address_type, address_line1, city, district, state, postal_code, country, gstin, is_primary
        ) VALUES ($1, $2, $3, 'store', $4, $5, $6, $7, $8, 'India', $9, TRUE)`,
        [
          `addr-${id}-1`,
          orgId,
          id,
          retailer.operational_address || retailer.registered_address || retailer.city,
          retailer.city,
          retailer.district,
          retailer.state,
          retailer.pincode,
          retailer.gstin,
        ]
      );

      // Auto-insert distributor mapping if primary distributor given
      if (data.primary_distributor_id) {
        await client.query(
          `INSERT INTO retailer_distributor_mappings (
            id, organization_id, retailer_id, distributor_id, effective_from, is_preferred, priority_rank, status, territory_id, notes
          ) VALUES ($1, $2, $3, $4, NOW(), TRUE, 1, 'active', $5, 'Primary distributor mapping.')`,
          [`map-${id}-${data.primary_distributor_id}`, orgId, id, data.primary_distributor_id, data.territory_id || null]
        );
      }

      // Auto-insert commercial terms
      await client.query(
        `INSERT INTO retailer_commercial_terms (
          id, organization_id, retailer_id, price_list_type, payment_terms_days, credit_limit, warning_threshold, credit_hold, agreed_discount_percent
        ) VALUES ($1, $2, $3, 'retail_standard', $4, $5, $6, $7, $8)`,
        [
          `terms-${id}`,
          orgId,
          id,
          data.payment_terms_days || 15,
          data.credit_limit || 200000,
          data.warning_threshold || 80.0,
          data.credit_hold || false,
          data.agreed_discount_percent || 3.0,
        ]
      );

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, 'create', 'retailer', $4, $5, NOW())`,
        [`aud-${Date.now()}`, orgId, actor.id, id, JSON.stringify(retailer)]
      );

      await client.query('COMMIT;');
      return this.getRetailerById(orgId, id) as Promise<RetailerMaster>;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing Retailer Master record
   */
  public async updateRetailer(
    orgId: string,
    id: string,
    data: Partial<RetailerMaster>,
    actor: { id: string; email: string }
  ): Promise<RetailerMaster> {
    const existing = await this.getRetailerById(orgId, id);
    if (!existing) throw new Error('Retailer not found');

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const updateSql = `
        UPDATE retailers SET
          legal_name = COALESCE($1, legal_name),
          display_name = COALESCE($2, display_name),
          retailer_type = COALESCE($3, retailer_type),
          status = COALESCE($4, status),
          gstin = COALESCE($5, gstin),
          pan = COALESCE($6, pan),
          phone = COALESCE($7, phone),
          alternate_phone = COALESCE($8, alternate_phone),
          email = COALESCE($9, email),
          registered_address = COALESCE($10, registered_address),
          operational_address = COALESCE($11, operational_address),
          city = COALESCE($12, city),
          district = COALESCE($13, district),
          state = COALESCE($14, state),
          pincode = COALESCE($15, pincode),
          territory_id = COALESCE($16, territory_id),
          region = COALESCE($17, region),
          primary_distributor_id = COALESCE($18, primary_distributor_id),
          cf_id = COALESCE($19, cf_id),
          credit_limit = COALESCE($20, credit_limit),
          payment_terms_days = COALESCE($21, payment_terms_days),
          agreed_discount_percent = COALESCE($22, agreed_discount_percent),
          warning_threshold = COALESCE($23, warning_threshold),
          credit_hold = COALESCE($24, credit_hold),
          assigned_salesperson_id = COALESCE($25, assigned_salesperson_id),
          assigned_salesperson_name = COALESCE($26, assigned_salesperson_name),
          notes = COALESCE($27, notes),
          updated_by = $28,
          updated_at = NOW()
        WHERE organization_id = $29 AND id = $30
        RETURNING *
      `;

      const values = [
        data.legal_name,
        data.display_name,
        data.retailer_type,
        data.status,
        data.gstin,
        data.pan,
        data.phone,
        data.alternate_phone,
        data.email,
        data.registered_address,
        data.operational_address,
        data.city,
        data.district,
        data.state,
        data.pincode,
        data.territory_id,
        data.region,
        data.primary_distributor_id,
        data.cf_id,
        data.credit_limit,
        data.payment_terms_days,
        data.agreed_discount_percent,
        data.warning_threshold,
        data.credit_hold,
        data.assigned_salesperson_id,
        data.assigned_salesperson_name,
        data.notes,
        actor.id,
        orgId,
        id,
      ];

      const res = await client.query(updateSql, values);
      const updated = res.rows[0];

      // Also update commercial terms table if credit limit or terms passed
      if (data.credit_limit !== undefined || data.payment_terms_days !== undefined || data.agreed_discount_percent !== undefined) {
        await client.query(
          `UPDATE retailer_commercial_terms SET
            credit_limit = COALESCE($1, credit_limit),
            payment_terms_days = COALESCE($2, payment_terms_days),
            agreed_discount_percent = COALESCE($3, agreed_discount_percent),
            warning_threshold = COALESCE($4, warning_threshold),
            credit_hold = COALESCE($5, credit_hold),
            updated_at = NOW()
           WHERE retailer_id = $6 AND organization_id = $7`,
          [
            data.credit_limit,
            data.payment_terms_days,
            data.agreed_discount_percent,
            data.warning_threshold,
            data.credit_hold,
            id,
            orgId,
          ]
        );
      }

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, old_values, new_values, created_at)
         VALUES ($1, $2, $3, 'update', 'retailer', $4, $5, $6, NOW())`,
        [`aud-${Date.now()}`, orgId, actor.id, id, JSON.stringify(existing), JSON.stringify(updated)]
      );

      await client.query('COMMIT;');
      return this.getRetailerById(orgId, id) as Promise<RetailerMaster>;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update Retailer status with lifecycle validation
   */
  public async updateRetailerStatus(
    orgId: string,
    id: string,
    status: RetailerStatus,
    actor: { id: string; email: string },
    notes?: string
  ): Promise<RetailerMaster> {
    const validStatuses: RetailerStatus[] = [
      'draft',
      'active',
      'inactive',
      'suspended',
      'blocked',
      'terminated',
      'archived',
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const existing = await this.getRetailerById(orgId, id);
    if (!existing) throw new Error('Retailer not found');

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `UPDATE retailers SET status = $1, notes = COALESCE($2, notes), updated_by = $3, updated_at = NOW()
         WHERE organization_id = $4 AND id = $5`,
        [status, notes ? `${existing.notes || ''}\n[Status Change]: ${notes}` : null, actor.id, orgId, id]
      );

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, old_values, new_values, created_at)
         VALUES ($1, $2, $3, 'status_change', 'retailer', $4, $5, $6, NOW())`,
        [
          `aud-${Date.now()}`,
          orgId,
          actor.id,
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify({ status, notes }),
        ]
      );

      await client.query('COMMIT;');
      return this.getRetailerById(orgId, id) as Promise<RetailerMaster>;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // Contacts Sub-resources
  // ==========================================
  public async getContacts(orgId: string, retailerId: string): Promise<RetailerContact[]> {
    const res = await pool.query(
      `SELECT * FROM retailer_contacts WHERE organization_id = $1 AND retailer_id = $2 ORDER BY is_primary DESC, created_at ASC`,
      [orgId, retailerId]
    );
    return res.rows;
  }

  public async addContact(
    orgId: string,
    retailerId: string,
    data: Partial<RetailerContact>
  ): Promise<RetailerContact> {
    const id = `cont-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO retailer_contacts (
        id, organization_id, retailer_id, name, designation, phone, email, preferred_contact_method, is_primary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        id,
        orgId,
        retailerId,
        data.name || 'Contact Person',
        data.designation || 'Store Manager',
        data.phone || '+91 00000 00000',
        data.email || null,
        data.preferred_contact_method || 'phone',
        data.is_primary || false,
        data.status || 'active',
      ]
    );
    return res.rows[0];
  }

  public async deleteContact(orgId: string, retailerId: string, contactId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM retailer_contacts WHERE organization_id = $1 AND retailer_id = $2 AND id = $3`,
      [orgId, retailerId, contactId]
    );
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // Addresses Sub-resources
  // ==========================================
  public async getAddresses(orgId: string, retailerId: string): Promise<RetailerAddress[]> {
    const res = await pool.query(
      `SELECT * FROM retailer_addresses WHERE organization_id = $1 AND retailer_id = $2 ORDER BY is_primary DESC, created_at ASC`,
      [orgId, retailerId]
    );
    return res.rows;
  }

  public async addAddress(
    orgId: string,
    retailerId: string,
    data: Partial<RetailerAddress>
  ): Promise<RetailerAddress> {
    const id = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const res = await pool.query(
      `INSERT INTO retailer_addresses (
        id, organization_id, retailer_id, address_type, address_line1, address_line2, city, district, state, postal_code, country, gstin, is_primary, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        id,
        orgId,
        retailerId,
        data.address_type || 'store',
        data.address_line1 || 'Address Line',
        data.address_line2 || null,
        data.city || 'City',
        data.district || null,
        data.state || 'State',
        data.postal_code || '400001',
        data.country || 'India',
        data.gstin || null,
        data.is_primary || false,
        data.notes || null,
      ]
    );
    return res.rows[0];
  }

  public async deleteAddress(orgId: string, retailerId: string, addressId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM retailer_addresses WHERE organization_id = $1 AND retailer_id = $2 AND id = $3`,
      [orgId, retailerId, addressId]
    );
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // Distributor Mapping Sub-resources
  // ==========================================
  public async getDistributorMappings(orgId: string, retailerId: string): Promise<RetailerDistributorMapping[]> {
    const sql = `
      SELECT 
        rdm.*,
        d.distributor_code,
        d.display_name as distributor_name,
        d.city as distributor_city,
        d.state as distributor_state,
        d.distributor_type,
        t.territory_name
      FROM retailer_distributor_mappings rdm
      JOIN distributors d ON d.id = rdm.distributor_id
      LEFT JOIN territories t ON t.id = rdm.territory_id
      WHERE rdm.organization_id = $1 AND rdm.retailer_id = $2
      ORDER BY rdm.priority_rank ASC, rdm.created_at ASC
    `;
    const res = await pool.query(sql, [orgId, retailerId]);
    return res.rows;
  }

  public async mapDistributor(
    orgId: string,
    retailerId: string,
    data: {
      distributor_id: string;
      is_preferred?: boolean;
      priority_rank?: number;
      territory_id?: string;
      notes?: string;
    }
  ): Promise<RetailerDistributorMapping> {
    // Validate distributor is in same organization
    const distCheck = await pool.query(
      `SELECT id FROM distributors WHERE id = $1 AND organization_id = $2`,
      [data.distributor_id, orgId]
    );
    if (distCheck.rows.length === 0) {
      throw new Error('Distributor not found or belongs to different organization.');
    }

    const id = `rdm-${retailerId}-${data.distributor_id}`;
    const res = await pool.query(
      `INSERT INTO retailer_distributor_mappings (
        id, organization_id, retailer_id, distributor_id, is_preferred, priority_rank, territory_id, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      ON CONFLICT (retailer_id, distributor_id) DO UPDATE SET
        is_preferred = EXCLUDED.is_preferred,
        priority_rank = EXCLUDED.priority_rank,
        territory_id = EXCLUDED.territory_id,
        notes = EXCLUDED.notes,
        status = 'active',
        updated_at = NOW()
      RETURNING *`,
      [
        id,
        orgId,
        retailerId,
        data.distributor_id,
        data.is_preferred !== undefined ? data.is_preferred : true,
        data.priority_rank || 1,
        data.territory_id || null,
        data.notes || null,
      ]
    );

    // If preferred, also update primary distributor in retailer master
    if (data.is_preferred) {
      await pool.query(
        `UPDATE retailers SET primary_distributor_id = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
        [data.distributor_id, retailerId, orgId]
      );
    }

    return res.rows[0];
  }

  public async unmapDistributor(orgId: string, retailerId: string, distributorId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM retailer_distributor_mappings WHERE organization_id = $1 AND retailer_id = $2 AND distributor_id = $3`,
      [orgId, retailerId, distributorId]
    );
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // Salesperson Assignments
  // ==========================================
  public async getSalespersonAssignments(orgId: string, retailerId: string): Promise<RetailerSalespersonAssignment[]> {
    const res = await pool.query(
      `SELECT rsa.*, u.email as user_email
       FROM retailer_salesperson_assignments rsa
       LEFT JOIN users u ON u.id = rsa.user_id
       WHERE rsa.organization_id = $1 AND rsa.retailer_id = $2
       ORDER BY rsa.is_primary DESC, rsa.created_at ASC`,
      [orgId, retailerId]
    );
    return res.rows;
  }

  public async assignSalesperson(
    orgId: string,
    retailerId: string,
    data: {
      user_id: string;
      user_name: string;
      role?: string;
      is_primary?: boolean;
      notes?: string;
    }
  ): Promise<RetailerSalespersonAssignment> {
    const id = `rsa-${retailerId}-${data.user_id}`;
    const res = await pool.query(
      `INSERT INTO retailer_salesperson_assignments (
        id, organization_id, retailer_id, user_id, user_name, role, is_primary, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      ON CONFLICT (id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        role = EXCLUDED.role,
        is_primary = EXCLUDED.is_primary,
        notes = EXCLUDED.notes,
        status = 'active',
        updated_at = NOW()
      RETURNING *`,
      [
        id,
        orgId,
        retailerId,
        data.user_id,
        data.user_name,
        data.role || 'Territory Sales Executive',
        data.is_primary !== undefined ? data.is_primary : true,
        data.notes || null,
      ]
    );

    if (data.is_primary) {
      await pool.query(
        `UPDATE retailers SET assigned_salesperson_id = $1, assigned_salesperson_name = $2, updated_at = NOW() WHERE id = $3 AND organization_id = $4`,
        [data.user_id, data.user_name, retailerId, orgId]
      );
    }

    return res.rows[0];
  }

  public async unassignSalesperson(orgId: string, retailerId: string, assignmentId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM retailer_salesperson_assignments WHERE organization_id = $1 AND retailer_id = $2 AND id = $3`,
      [orgId, retailerId, assignmentId]
    );
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // Product Assortment Sub-resources
  // ==========================================
  public async getAssortment(orgId: string, retailerId: string): Promise<RetailerAssortment[]> {
    const sql = `
      SELECT 
        ra.*,
        s.sku_code,
        s.name as sku_name,
        (SELECT cat.name FROM products pr JOIN categories cat ON cat.id = pr.category_id WHERE pr.id = s.product_id) AS category,
        s.uom
      FROM retailer_assortments ra
      JOIN skus s ON s.id = ra.sku_id
      WHERE ra.organization_id = $1 AND ra.retailer_id = $2
      ORDER BY ra.created_at ASC
    `;
    const res = await pool.query(sql, [orgId, retailerId]);
    return res.rows.map(r => ({
      ...r,
      minimum_order_quantity: parseFloat(r.minimum_order_quantity || '0'),
      target_stock: parseFloat(r.target_stock || '0'),
      preferred_pack_size: parseFloat(r.preferred_pack_size || '1'),
      agreed_price_basis: r.agreed_price_basis ? parseFloat(r.agreed_price_basis) : undefined,
    }));
  }

  public async addAssortmentItem(
    orgId: string,
    retailerId: string,
    data: {
      sku_id: string;
      minimum_order_quantity?: number;
      target_stock?: number;
      preferred_pack_size?: number;
      agreed_price_basis?: number;
      notes?: string;
    }
  ): Promise<RetailerAssortment> {
    const id = `rassort-${retailerId}-${data.sku_id}`;
    const res = await pool.query(
      `INSERT INTO retailer_assortments (
        id, organization_id, retailer_id, sku_id, minimum_order_quantity, target_stock, preferred_pack_size, agreed_price_basis, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      ON CONFLICT (retailer_id, sku_id) DO UPDATE SET
        minimum_order_quantity = EXCLUDED.minimum_order_quantity,
        target_stock = EXCLUDED.target_stock,
        preferred_pack_size = EXCLUDED.preferred_pack_size,
        agreed_price_basis = EXCLUDED.agreed_price_basis,
        notes = EXCLUDED.notes,
        status = 'active',
        updated_at = NOW()
      RETURNING *`,
      [
        id,
        orgId,
        retailerId,
        data.sku_id,
        data.minimum_order_quantity || 5,
        data.target_stock || 30,
        data.preferred_pack_size || 1,
        data.agreed_price_basis || null,
        data.notes || null,
      ]
    );
    return res.rows[0];
  }

  public async removeAssortmentItem(orgId: string, retailerId: string, skuId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM retailer_assortments WHERE organization_id = $1 AND retailer_id = $2 AND sku_id = $3`,
      [orgId, retailerId, skuId]
    );
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // Commercial Terms
  // ==========================================
  public async getCommercialTerms(orgId: string, retailerId: string): Promise<RetailerCommercialTerms | null> {
    const res = await pool.query(
      `SELECT * FROM retailer_commercial_terms WHERE organization_id = $1 AND retailer_id = $2`,
      [orgId, retailerId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      payment_terms_days: parseInt(r.payment_terms_days || '15', 10),
      credit_limit: parseFloat(r.credit_limit || '0'),
      warning_threshold: parseFloat(r.warning_threshold || '80'),
      agreed_discount_percent: parseFloat(r.agreed_discount_percent || '0'),
    };
  }

  // ==========================================
  // Summary Metrics & Telemetry
  // ==========================================
  public async getSummaryMetrics(orgId: string): Promise<RetailerSummaryMetrics> {
    const retMetricsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_retailers,
        COUNT(*) FILTER (WHERE status = 'active') as active_retailers,
        COUNT(*) FILTER (WHERE status IN ('inactive', 'blocked', 'suspended')) as inactive_or_blocked,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_retailers,
        COALESCE(SUM(credit_limit), 0) as total_credit_limit,
        COUNT(*) FILTER (WHERE credit_hold = true) as credit_hold_count
      FROM retailers
      WHERE organization_id = $1`,
      [orgId]
    );

    const stockMetricsRes = await pool.query(
      `SELECT 
        COALESCE(SUM(quantity_on_hand), 0) as total_units,
        COALESCE(SUM(quantity_on_hand * unit_cost), 0) as total_val
      FROM retailer_stock
      WHERE organization_id = $1`,
      [orgId]
    );

    const nearExpiryRes = await pool.query(
      `SELECT COUNT(*) as near_expiry_count
       FROM retailer_stock rs
       JOIN batches b ON b.id = rs.batch_id
       WHERE rs.organization_id = $1 
         AND b.expiry_date IS NOT NULL 
         AND b.expiry_date <= NOW() + INTERVAL '60 days'
         AND rs.quantity_on_hand > 0`,
      [orgId]
    );

    const ordersRes = await pool.query(
      `SELECT 
        COUNT(*) as pending_requests,
        COALESCE(SUM(total_estimated_amount), 0) as pending_val
      FROM retailer_order_requests
      WHERE organization_id = $1 AND status = 'submitted'`,
      [orgId]
    );

    const returnsRes = await pool.query(
      `SELECT COUNT(*) as active_returns FROM retailer_returns WHERE organization_id = $1 AND status IN ('requested', 'approved')`,
      [orgId]
    );

    const followupsRes = await pool.query(
      `SELECT 
        COUNT(*) as pending_count,
        COUNT(*) FILTER (WHERE due_date < NOW()) as overdue_count
      FROM retailer_follow_ups
      WHERE organization_id = $1 AND status IN ('open', 'in_progress')`,
      [orgId]
    );

    const visitsRes = await pool.query(
      `SELECT COUNT(*) as recent_visits
       FROM retailer_visits
       WHERE organization_id = $1 AND visit_date >= NOW() - INTERVAL '30 days'`,
      [orgId]
    );

    const retRow = retMetricsRes.rows[0] || {};
    const stockRow = stockMetricsRes.rows[0] || {};
    const ordersRow = ordersRes.rows[0] || {};
    const followupsRow = followupsRes.rows[0] || {};

    return {
      totalRetailers: parseInt(retRow.total_retailers || '0', 10),
      activeRetailers: parseInt(retRow.active_retailers || '0', 10),
      newRetailersThisMonth: parseInt(retRow.new_retailers || '0', 10),
      inactiveOrBlockedRetailers: parseInt(retRow.inactive_or_blocked || '0', 10),
      pendingOrderRequests: parseInt(ordersRow.pending_requests || '0', 10),
      pendingOrdersValue: parseFloat(ordersRow.pending_val || '0'),
      pendingFollowupsCount: parseInt(followupsRow.pending_count || '0', 10),
      overdueFollowupsCount: parseInt(followupsRow.overdue_count || '0', 10),
      totalChannelStockUnits: parseFloat(stockRow.total_units || '0'),
      totalChannelStockValuation: parseFloat(stockRow.total_val || '0'),
      nearExpiryItemsCount: parseInt(nearExpiryRes.rows[0]?.near_expiry_count || '0', 10),
      activeReturnsCount: parseInt(returnsRes.rows[0]?.active_returns || '0', 10),
      totalCreditExposure: parseFloat(ordersRow.pending_val || '0'),
      totalCreditLimitAssigned: parseFloat(retRow.total_credit_limit || '0'),
      creditHoldCount: parseInt(retRow.credit_hold_count || '0', 10),
      recentVisitsCount: parseInt(visitsRes.rows[0]?.recent_visits || '0', 10),
    };
  }
}
