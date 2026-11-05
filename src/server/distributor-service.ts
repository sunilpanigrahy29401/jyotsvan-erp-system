import { pool } from './db.ts';
import type {
  DistributorMaster,
  DistributorType,
  DistributorStatus,
  DistributorContact,
  DistributorAddress,
  DistributorCFMapping,
  DistributorAssortment,
  DistributorCommercialTerms,
  Territory,
  DistributorSummaryMetrics,
} from '../types/distributors.ts';

export class DistributorService {
  /**
   * List distributors with server-side filters, search, pagination, and calculated metrics
   */
  public async listDistributors(
    orgId: string,
    filters: {
      search?: string;
      status?: DistributorStatus | string;
      distributor_type?: DistributorType | string;
      region?: string;
      state?: string;
      cf_id?: string;
      territory_id?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: DistributorMaster[]; total: number }> {
    const conditions: string[] = ['d.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.search) {
      conditions.push(
        `(d.legal_name ILIKE $${idx} OR d.display_name ILIKE $${idx} OR d.distributor_code ILIKE $${idx} OR d.city ILIKE $${idx} OR d.state ILIKE $${idx} OR d.gstin ILIKE $${idx} OR d.email ILIKE $${idx} OR d.phone ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`d.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.distributor_type && filters.distributor_type !== 'all') {
      conditions.push(`d.distributor_type = $${idx++}`);
      values.push(filters.distributor_type);
    }

    if (filters.region && filters.region !== 'all') {
      conditions.push(`d.region = $${idx++}`);
      values.push(filters.region);
    }

    if (filters.state && filters.state !== 'all') {
      conditions.push(`d.state ILIKE $${idx++}`);
      values.push(`%${filters.state}%`);
    }

    if (filters.territory_id) {
      conditions.push(`d.territory_id = $${idx++}`);
      values.push(filters.territory_id);
    }

    if (filters.cf_id) {
      conditions.push(
        `EXISTS (SELECT 1 FROM distributor_cf_mappings dcm WHERE dcm.distributor_id = d.id AND dcm.cf_id = $${idx++})`
      );
      values.push(filters.cf_id);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM distributors d WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        d.*,
        t.territory_name as territory_name,
        (SELECT COUNT(*) FROM distributor_cf_mappings dcm WHERE dcm.distributor_id = d.id AND dcm.status = 'active') as mapped_cfs_count,
        (SELECT COUNT(*) FROM distributor_assortments da WHERE da.distributor_id = d.id AND da.status = 'active') as active_skus_count,
        (SELECT COALESCE(SUM(ds.quantity_on_hand), 0) FROM distributor_stock ds WHERE ds.distributor_id = d.id) as stock_units_on_hand,
        (SELECT COALESCE(SUM(ds.quantity_on_hand * ds.unit_cost), 0) FROM distributor_stock ds WHERE ds.distributor_id = d.id) as stock_valuation,
        (SELECT COALESCE(SUM(dord.total_estimated_amount), 0) FROM distributor_orders dord WHERE dord.distributor_id = d.id AND dord.status IN ('submitted', 'approved', 'processing')) as current_outstanding_amount
      FROM distributors d
      LEFT JOIN territories t ON t.id = d.territory_id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    values.push(limit, offset);
    const res = await pool.query(dataSql, values);

    return {
      data: res.rows.map(this.mapDistributorRow),
      total,
    };
  }

  /**
   * Get complete details of a single distributor
   */
  public async getDistributorById(orgId: string, distId: string): Promise<DistributorMaster | null> {
    const res = await pool.query(
      `
      SELECT 
        d.*,
        t.territory_name as territory_name,
        (SELECT COUNT(*) FROM distributor_cf_mappings dcm WHERE dcm.distributor_id = d.id AND dcm.status = 'active') as mapped_cfs_count,
        (SELECT COUNT(*) FROM distributor_assortments da WHERE da.distributor_id = d.id AND da.status = 'active') as active_skus_count,
        (SELECT COALESCE(SUM(ds.quantity_on_hand), 0) FROM distributor_stock ds WHERE ds.distributor_id = d.id) as stock_units_on_hand,
        (SELECT COALESCE(SUM(ds.quantity_on_hand * ds.unit_cost), 0) FROM distributor_stock ds WHERE ds.distributor_id = d.id) as stock_valuation,
        (SELECT COALESCE(SUM(dord.total_estimated_amount), 0) FROM distributor_orders dord WHERE dord.distributor_id = d.id AND dord.status IN ('submitted', 'approved', 'processing')) as current_outstanding_amount
      FROM distributors d
      LEFT JOIN territories t ON t.id = d.territory_id
      WHERE d.organization_id = $1 AND d.id = $2
    `,
      [orgId, distId]
    );

    if (res.rows.length === 0) return null;
    return this.mapDistributorRow(res.rows[0]);
  }

  /**
   * Create a new distributor master entity with initial contacts and terms
   */
  public async createDistributor(
    orgId: string,
    payload: {
      distributor_code?: string;
      legal_name: string;
      display_name: string;
      distributor_type?: DistributorType;
      gstin?: string;
      pan?: string;
      primary_contact: string;
      phone: string;
      alternate_phone?: string;
      email: string;
      website?: string;
      registered_address?: string;
      operational_address?: string;
      city: string;
      district?: string;
      state: string;
      pincode: string;
      country?: string;
      territory_id?: string;
      territory_name?: string;
      region: string;
      appointed_date?: string;
      agreement_start_date?: string;
      agreement_end_date?: string;
      credit_limit?: number;
      payment_terms_days?: number;
      agreed_discount_percent?: number;
      price_list_type?: string;
      notes?: string;
      mapped_cf_id?: string;
    },
    actor?: { id: string; email: string }
  ): Promise<DistributorMaster> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const distId = `dist-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const distCode =
        payload.distributor_code?.trim() ||
        `DIST-${payload.state.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      // Check unique code
      const existing = await client.query(
        'SELECT id FROM distributors WHERE organization_id = $1 AND distributor_code = $2',
        [orgId, distCode]
      );
      if (existing.rows.length > 0) {
        throw new Error(`Distributor code ${distCode} is already registered in this organization.`);
      }

      await client.query(
        `
        INSERT INTO distributors (
          id, organization_id, distributor_code, legal_name, display_name, distributor_type, status,
          gstin, pan, primary_contact, phone, alternate_phone, email, website,
          registered_address, operational_address, city, district, state, pincode, country,
          territory_id, territory_name, region, appointed_date, agreement_start_date, agreement_end_date,
          credit_limit, payment_terms_days, agreed_discount_percent, price_list_type, notes,
          created_by, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'active',
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31,
          $32, $33, NOW(), NOW()
        )
      `,
        [
          distId,
          orgId,
          distCode,
          payload.legal_name,
          payload.display_name,
          payload.distributor_type || 'primary',
          payload.gstin || null,
          payload.pan || null,
          payload.primary_contact,
          payload.phone,
          payload.alternate_phone || null,
          payload.email,
          payload.website || null,
          payload.registered_address || payload.operational_address || null,
          payload.operational_address || payload.registered_address || null,
          payload.city,
          payload.district || null,
          payload.state,
          payload.pincode,
          payload.country || 'India',
          payload.territory_id || null,
          payload.territory_name || null,
          payload.region,
          payload.appointed_date ? new Date(payload.appointed_date) : new Date(),
          payload.agreement_start_date ? new Date(payload.agreement_start_date) : new Date(),
          payload.agreement_end_date ? new Date(payload.agreement_end_date) : null,
          Number(payload.credit_limit || 1000000),
          Number(payload.payment_terms_days || 30),
          Number(payload.agreed_discount_percent || 5.0),
          payload.price_list_type || 'standard_distributor',
          payload.notes || null,
          actor?.id || 'usr-system',
          actor?.email || 'system@jyotsvan.enterprise',
        ]
      );

      // Primary Contact
      const contactId = `dcont-${Date.now().toString(36)}-1`;
      await client.query(
        `
        INSERT INTO distributor_contacts (
          id, organization_id, distributor_id, name, designation, phone, email, is_primary, status
        ) VALUES ($1, $2, $3, $4, 'Owner & Key Principal', $5, $6, TRUE, 'active')
      `,
        [contactId, orgId, distId, payload.primary_contact, payload.phone, payload.email]
      );

      // Primary Address
      const addrId = `daddr-${Date.now().toString(36)}-1`;
      await client.query(
        `
        INSERT INTO distributor_addresses (
          id, organization_id, distributor_id, address_type, address_line1, city, district, state, postal_code, is_primary
        ) VALUES ($1, $2, $3, 'operational', $4, $5, $6, $7, $8, TRUE)
      `,
        [
          addrId,
          orgId,
          distId,
          payload.operational_address || payload.registered_address || payload.city,
          payload.city,
          payload.district || null,
          payload.state,
          payload.pincode,
        ]
      );

      // Initial Commercial Terms
      const termsId = `dterms-${Date.now().toString(36)}-1`;
      await client.query(
        `
        INSERT INTO distributor_commercial_terms (
          id, organization_id, distributor_id, payment_terms_days, credit_limit, agreed_discount_percent, price_list_type, order_terms, delivery_terms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Standard 48-hour order dispatch SLA from mapped C&F depot.', 'Door delivery to distributor warehouse.')
      `,
        [
          termsId,
          orgId,
          distId,
          Number(payload.payment_terms_days || 30),
          Number(payload.credit_limit || 1000000),
          Number(payload.agreed_discount_percent || 5.0),
          payload.price_list_type || 'standard_distributor',
        ]
      );

      // Optional initial C&F Mapping
      if (payload.mapped_cf_id) {
        const cfMapId = `dcf-${Date.now().toString(36)}-1`;
        await client.query(
          `
          INSERT INTO distributor_cf_mappings (
            id, organization_id, distributor_id, cf_id, is_preferred, priority_rank, status
          ) VALUES ($1, $2, $3, $4, TRUE, 1, 'active')
          ON CONFLICT (distributor_id, cf_id) DO NOTHING
        `,
          [cfMapId, orgId, distId, payload.mapped_cf_id]
        );
      }

      // Auto-assign top active SKUs to distributor assortment
      const topSkus = await client.query(
        'SELECT id, mrp FROM skus WHERE organization_id = $1 AND status = $2 LIMIT 10',
        [orgId, 'active']
      );
      for (const s of topSkus.rows) {
        const assortId = `assort-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
        await client.query(
          `
          INSERT INTO distributor_assortments (
            id, organization_id, distributor_id, sku_id, status, minimum_order_quantity, target_stock, preferred_pack_size, agreed_price_basis
          ) VALUES ($1, $2, $3, $4, 'active', 10, 100, 10, $5)
          ON CONFLICT (distributor_id, sku_id) DO NOTHING
        `,
          [assortId, orgId, distId, s.id, parseFloat(s.mrp || '100') * 0.85]
        );
      }

      // Audit Log
      await client.query(
        `
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'distributor.create', 'distributor', $5, $6)
      `,
        [
          `audit-${Date.now()}`,
          orgId,
          actor?.id || 'usr-system',
          actor?.email || 'system@jyotsvan.enterprise',
          distId,
          JSON.stringify({ code: distCode, name: payload.legal_name, state: payload.state }),
        ]
      );

      await client.query('COMMIT');

      const created = await this.getDistributorById(orgId, distId);
      return created!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update distributor master profile
   */
  public async updateDistributor(
    orgId: string,
    distId: string,
    payload: Partial<{
      legal_name: string;
      display_name: string;
      distributor_type: DistributorType;
      gstin: string;
      pan: string;
      primary_contact: string;
      phone: string;
      alternate_phone: string;
      email: string;
      website: string;
      registered_address: string;
      operational_address: string;
      city: string;
      district: string;
      state: string;
      pincode: string;
      country: string;
      territory_id: string;
      territory_name: string;
      region: string;
      agreement_end_date: string;
      credit_limit: number;
      payment_terms_days: number;
      agreed_discount_percent: number;
      credit_hold: boolean;
      notes: string;
    }>,
    actor?: { id: string; email: string }
  ): Promise<DistributorMaster | null> {
    const fields: string[] = ['updated_at = NOW()'];
    const values: any[] = [orgId, distId];
    let idx = 3;

    if (payload.legal_name !== undefined) {
      fields.push(`legal_name = $${idx++}`);
      values.push(payload.legal_name);
    }
    if (payload.display_name !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(payload.display_name);
    }
    if (payload.distributor_type !== undefined) {
      fields.push(`distributor_type = $${idx++}`);
      values.push(payload.distributor_type);
    }
    if (payload.gstin !== undefined) {
      fields.push(`gstin = $${idx++}`);
      values.push(payload.gstin);
    }
    if (payload.pan !== undefined) {
      fields.push(`pan = $${idx++}`);
      values.push(payload.pan);
    }
    if (payload.primary_contact !== undefined) {
      fields.push(`primary_contact = $${idx++}`);
      values.push(payload.primary_contact);
    }
    if (payload.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(payload.phone);
    }
    if (payload.alternate_phone !== undefined) {
      fields.push(`alternate_phone = $${idx++}`);
      values.push(payload.alternate_phone);
    }
    if (payload.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(payload.email);
    }
    if (payload.website !== undefined) {
      fields.push(`website = $${idx++}`);
      values.push(payload.website);
    }
    if (payload.registered_address !== undefined) {
      fields.push(`registered_address = $${idx++}`);
      values.push(payload.registered_address);
    }
    if (payload.operational_address !== undefined) {
      fields.push(`operational_address = $${idx++}`);
      values.push(payload.operational_address);
    }
    if (payload.city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(payload.city);
    }
    if (payload.district !== undefined) {
      fields.push(`district = $${idx++}`);
      values.push(payload.district);
    }
    if (payload.state !== undefined) {
      fields.push(`state = $${idx++}`);
      values.push(payload.state);
    }
    if (payload.pincode !== undefined) {
      fields.push(`pincode = $${idx++}`);
      values.push(payload.pincode);
    }
    if (payload.territory_id !== undefined) {
      fields.push(`territory_id = $${idx++}`);
      values.push(payload.territory_id);
    }
    if (payload.territory_name !== undefined) {
      fields.push(`territory_name = $${idx++}`);
      values.push(payload.territory_name);
    }
    if (payload.region !== undefined) {
      fields.push(`region = $${idx++}`);
      values.push(payload.region);
    }
    if (payload.credit_limit !== undefined) {
      fields.push(`credit_limit = $${idx++}`);
      values.push(payload.credit_limit);
    }
    if (payload.payment_terms_days !== undefined) {
      fields.push(`payment_terms_days = $${idx++}`);
      values.push(payload.payment_terms_days);
    }
    if (payload.agreed_discount_percent !== undefined) {
      fields.push(`agreed_discount_percent = $${idx++}`);
      values.push(payload.agreed_discount_percent);
    }
    if (payload.credit_hold !== undefined) {
      fields.push(`credit_hold = $${idx++}`);
      values.push(payload.credit_hold);
    }
    if (payload.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(payload.notes);
    }

    fields.push(`updated_by = $${idx++}`);
    values.push(actor?.id || 'usr-system');

    await pool.query(
      `
      UPDATE distributors
      SET ${fields.join(', ')}
      WHERE organization_id = $1 AND id = $2
    `,
      values
    );

    // Audit log
    await pool.query(
      `
      INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, 'distributor.update', 'distributor', $5, $6)
    `,
      [
        `audit-${Date.now()}`,
        orgId,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        distId,
        JSON.stringify(payload),
      ]
    );

    return this.getDistributorById(orgId, distId);
  }

  /**
   * Controlled Lifecycle Transition (active, suspended, blocked, terminated, archived)
   */
  public async updateDistributorStatus(
    orgId: string,
    distId: string,
    status: DistributorStatus,
    actor?: { id: string; email: string },
    reasonNotes?: string
  ): Promise<DistributorMaster | null> {
    const validTransitions: Record<DistributorStatus, DistributorStatus[]> = {
      draft: ['active', 'archived'],
      active: ['inactive', 'suspended', 'blocked', 'terminated'],
      inactive: ['active', 'archived'],
      suspended: ['active', 'blocked', 'terminated'],
      blocked: ['active', 'suspended', 'terminated'],
      terminated: ['archived'],
      archived: [],
    };

    const current = await this.getDistributorById(orgId, distId);
    if (!current) throw new Error('Distributor not found');

    const allowed = validTransitions[current.status] || [];
    if (!allowed.includes(status)) {
      throw new Error(`Cannot transition distributor status from '${current.status}' to '${status}'.`);
    }

    await pool.query(
      `
      UPDATE distributors
      SET status = $1, notes = COALESCE($2, notes), updated_at = NOW(), updated_by = $3
      WHERE organization_id = $4 AND id = $5
    `,
      [status, reasonNotes || null, actor?.id || 'usr-system', orgId, distId]
    );

    await pool.query(
      `
      INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, 'distributor.status_change', 'distributor', $5, $6)
    `,
      [
        `audit-${Date.now()}`,
        orgId,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        distId,
        JSON.stringify({ from: current.status, to: status, reason: reasonNotes }),
      ]
    );

    return this.getDistributorById(orgId, distId);
  }

  /**
   * Contacts management
   */
  public async getContacts(orgId: string, distId: string): Promise<DistributorContact[]> {
    const res = await pool.query(
      'SELECT * FROM distributor_contacts WHERE organization_id = $1 AND distributor_id = $2 ORDER BY is_primary DESC, created_at ASC',
      [orgId, distId]
    );
    return res.rows;
  }

  public async addContact(
    orgId: string,
    distId: string,
    payload: {
      name: string;
      designation?: string;
      phone: string;
      email?: string;
      is_primary?: boolean;
    }
  ): Promise<DistributorContact> {
    const id = `dcont-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    if (payload.is_primary) {
      await pool.query(
        'UPDATE distributor_contacts SET is_primary = FALSE WHERE organization_id = $1 AND distributor_id = $2',
        [orgId, distId]
      );
    }
    const res = await pool.query(
      `
      INSERT INTO distributor_contacts (id, organization_id, distributor_id, name, designation, phone, email, is_primary, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *
    `,
      [
        id,
        orgId,
        distId,
        payload.name,
        payload.designation || 'Sales Contact',
        payload.phone,
        payload.email || null,
        Boolean(payload.is_primary),
      ]
    );
    return res.rows[0];
  }

  public async deleteContact(orgId: string, distId: string, contactId: string): Promise<boolean> {
    const res = await pool.query(
      'DELETE FROM distributor_contacts WHERE organization_id = $1 AND distributor_id = $2 AND id = $3',
      [orgId, distId, contactId]
    );
    return (res.rowCount || 0) > 0;
  }

  /**
   * Addresses management
   */
  public async getAddresses(orgId: string, distId: string): Promise<DistributorAddress[]> {
    const res = await pool.query(
      'SELECT * FROM distributor_addresses WHERE organization_id = $1 AND distributor_id = $2 ORDER BY is_primary DESC, created_at ASC',
      [orgId, distId]
    );
    return res.rows;
  }

  public async addAddress(
    orgId: string,
    distId: string,
    payload: {
      address_type?: 'registered' | 'billing' | 'operational' | 'warehouse';
      address_line1: string;
      address_line2?: string;
      city: string;
      district?: string;
      state: string;
      postal_code: string;
      country?: string;
      gstin?: string;
      is_primary?: boolean;
    }
  ): Promise<DistributorAddress> {
    const id = `daddr-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    if (payload.is_primary) {
      await pool.query(
        'UPDATE distributor_addresses SET is_primary = FALSE WHERE organization_id = $1 AND distributor_id = $2',
        [orgId, distId]
      );
    }
    const res = await pool.query(
      `
      INSERT INTO distributor_addresses (
        id, organization_id, distributor_id, address_type, address_line1, address_line2, city, district, state, postal_code, country, gstin, is_primary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `,
      [
        id,
        orgId,
        distId,
        payload.address_type || 'operational',
        payload.address_line1,
        payload.address_line2 || null,
        payload.city,
        payload.district || null,
        payload.state,
        payload.postal_code,
        payload.country || 'India',
        payload.gstin || null,
        Boolean(payload.is_primary),
      ]
    );
    return res.rows[0];
  }

  public async deleteAddress(orgId: string, distId: string, addressId: string): Promise<boolean> {
    const res = await pool.query(
      'DELETE FROM distributor_addresses WHERE organization_id = $1 AND distributor_id = $2 AND id = $3',
      [orgId, distId, addressId]
    );
    return (res.rowCount || 0) > 0;
  }

  /**
   * C&F Mapping Management
   */
  public async getMappedCFs(orgId: string, distId: string): Promise<DistributorCFMapping[]> {
    const res = await pool.query(
      `
      SELECT 
        dcm.*,
        c.cf_code,
        c.legal_name as cf_name,
        c.city as cf_city,
        c.state as cf_state,
        c.phone as cf_phone
      FROM distributor_cf_mappings dcm
      JOIN cfs c ON c.id = dcm.cf_id
      WHERE dcm.organization_id = $1 AND dcm.distributor_id = $2
      ORDER BY dcm.is_preferred DESC, dcm.priority_rank ASC
    `,
      [orgId, distId]
    );
    return res.rows;
  }

  public async mapCF(
    orgId: string,
    distId: string,
    payload: {
      cf_id: string;
      is_preferred?: boolean;
      priority_rank?: number;
      effective_from?: string;
      effective_to?: string;
      notes?: string;
    }
  ): Promise<DistributorCFMapping> {
    // Validate C&F exists in org
    const cfCheck = await pool.query('SELECT id FROM cfs WHERE organization_id = $1 AND id = $2', [
      orgId,
      payload.cf_id,
    ]);
    if (cfCheck.rows.length === 0) throw new Error('C&F agency not found in this organization');

    const id = `dcf-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    if (payload.is_preferred) {
      await pool.query(
        'UPDATE distributor_cf_mappings SET is_preferred = FALSE WHERE organization_id = $1 AND distributor_id = $2',
        [orgId, distId]
      );
    }
    const res = await pool.query(
      `
      INSERT INTO distributor_cf_mappings (
        id, organization_id, distributor_id, cf_id, effective_from, effective_to, is_preferred, priority_rank, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
      ON CONFLICT (distributor_id, cf_id) DO UPDATE 
        SET is_preferred = EXCLUDED.is_preferred, priority_rank = EXCLUDED.priority_rank, status = 'active', updated_at = NOW()
      RETURNING *
    `,
      [
        id,
        orgId,
        distId,
        payload.cf_id,
        payload.effective_from ? new Date(payload.effective_from) : new Date(),
        payload.effective_to ? new Date(payload.effective_to) : null,
        payload.is_preferred ?? true,
        payload.priority_rank || 1,
        payload.notes || null,
      ]
    );
    return res.rows[0];
  }

  public async unmapCF(orgId: string, distId: string, cfId: string): Promise<boolean> {
    const res = await pool.query(
      'DELETE FROM distributor_cf_mappings WHERE organization_id = $1 AND distributor_id = $2 AND cf_id = $3',
      [orgId, distId, cfId]
    );
    return (res.rowCount || 0) > 0;
  }

  /**
   * Assortment Management
   */
  public async getAssortment(orgId: string, distId: string): Promise<DistributorAssortment[]> {
    const res = await pool.query(
      `
      SELECT 
        da.*,
        s.sku_code,
        s.name as sku_name,
        (SELECT cat.name FROM products pr JOIN categories cat ON cat.id = pr.category_id WHERE pr.id = s.product_id) AS category,
        s.mrp as standard_mrp,
        s.cost_price as standard_cost,
        u.name as unit_name,
        u.short_code as unit_short_code
      FROM distributor_assortments da
      JOIN skus s ON s.id = da.sku_id
      LEFT JOIN units u ON u.id = s.unit_id
      WHERE da.organization_id = $1 AND da.distributor_id = $2
      ORDER BY da.status ASC, s.name ASC
    `,
      [orgId, distId]
    );
    return res.rows.map(r => ({
      ...r,
      minimum_order_quantity: Number(r.minimum_order_quantity || 0),
      target_stock: Number(r.target_stock || 0),
      preferred_pack_size: Number(r.preferred_pack_size || 1),
      agreed_price_basis: r.agreed_price_basis ? Number(r.agreed_price_basis) : null,
      standard_mrp: Number(r.standard_mrp || 0),
      standard_cost: Number(r.standard_cost || 0),
    }));
  }

  public async addAssortmentItem(
    orgId: string,
    distId: string,
    payload: {
      sku_id: string;
      minimum_order_quantity?: number;
      target_stock?: number;
      preferred_pack_size?: number;
      agreed_price_basis?: number;
      notes?: string;
    }
  ): Promise<DistributorAssortment> {
    const id = `assort-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const res = await pool.query(
      `
      INSERT INTO distributor_assortments (
        id, organization_id, distributor_id, sku_id, status, minimum_order_quantity, target_stock, preferred_pack_size, agreed_price_basis, notes
      ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9)
      ON CONFLICT (distributor_id, sku_id) DO UPDATE
        SET status = 'active', minimum_order_quantity = EXCLUDED.minimum_order_quantity, target_stock = EXCLUDED.target_stock, agreed_price_basis = EXCLUDED.agreed_price_basis, updated_at = NOW()
      RETURNING *
    `,
      [
        id,
        orgId,
        distId,
        payload.sku_id,
        payload.minimum_order_quantity || 10,
        payload.target_stock || 100,
        payload.preferred_pack_size || 10,
        payload.agreed_price_basis || null,
        payload.notes || null,
      ]
    );
    return res.rows[0];
  }

  public async removeAssortmentItem(orgId: string, distId: string, skuId: string): Promise<boolean> {
    const res = await pool.query(
      'DELETE FROM distributor_assortments WHERE organization_id = $1 AND distributor_id = $2 AND sku_id = $3',
      [orgId, distId, skuId]
    );
    return (res.rowCount || 0) > 0;
  }

  /**
   * Commercial Terms
   */
  public async getCommercialTerms(orgId: string, distId: string): Promise<DistributorCommercialTerms | null> {
    const res = await pool.query(
      'SELECT * FROM distributor_commercial_terms WHERE organization_id = $1 AND distributor_id = $2 ORDER BY created_at DESC LIMIT 1',
      [orgId, distId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      credit_limit: Number(r.credit_limit || 0),
      agreed_discount_percent: Number(r.agreed_discount_percent || 0),
    };
  }

  /**
   * Territories
   */
  public async listTerritories(orgId: string): Promise<Territory[]> {
    const res = await pool.query(
      'SELECT * FROM territories WHERE organization_id = $1 AND status = $2 ORDER BY region ASC, state ASC, territory_name ASC',
      [orgId, 'active']
    );
    return res.rows;
  }

  public async createTerritory(
    orgId: string,
    payload: {
      territory_code?: string;
      territory_name: string;
      region: string;
      state: string;
      district?: string;
      pincodes?: string[];
      notes?: string;
    }
  ): Promise<Territory> {
    const id = `terr-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const code =
      payload.territory_code ||
      `TERR-${payload.state.substring(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const res = await pool.query(
      `
      INSERT INTO territories (
        id, organization_id, territory_code, territory_name, region, state, district, pincodes, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
      RETURNING *
    `,
      [
        id,
        orgId,
        code,
        payload.territory_name,
        payload.region,
        payload.state,
        payload.district || null,
        JSON.stringify(payload.pincodes || []),
        payload.notes || null,
      ]
    );
    return res.rows[0];
  }

  /**
   * Overall Summary KPI Metrics for Distributor Management Module
   */
  public async getSummaryMetrics(orgId: string): Promise<DistributorSummaryMetrics> {
    const [distCounts, cfMaps, stockSums, trfSums, discSums, retSums, ordSums] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status IN ('suspended', 'blocked', 'inactive', 'terminated')) as suspended_or_blocked,
          COALESCE(SUM(credit_limit), 0) as total_credit_limit
        FROM distributors
        WHERE organization_id = $1
      `, [orgId]),

      pool.query(`
        SELECT COUNT(DISTINCT cf_id) as mapped_cfs
        FROM distributor_cf_mappings
        WHERE organization_id = $1 AND status = 'active'
      `, [orgId]),

      pool.query(`
        SELECT 
          COALESCE(SUM(quantity_on_hand), 0) as total_units,
          COALESCE(SUM(quantity_on_hand * unit_cost), 0) as total_valuation
        FROM distributor_stock
        WHERE organization_id = $1
      `, [orgId]),

      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit_count,
          COUNT(*) FILTER (WHERE status = 'dispatched') as pending_receiving_count
        FROM distributor_transfers
        WHERE organization_id = $1
      `, [orgId]),

      pool.query(`
        SELECT COUNT(*) as open_discrepancies
        FROM distributor_discrepancies
        WHERE organization_id = $1 AND resolution_status IN ('pending', 'investigating')
      `, [orgId]),

      pool.query(`
        SELECT COUNT(*) as open_returns
        FROM distributor_returns
        WHERE organization_id = $1 AND status IN ('draft', 'submitted', 'approved')
      `, [orgId]),

      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('draft', 'submitted', 'approved')) as pending_orders,
          COALESCE(SUM(total_estimated_amount) FILTER (WHERE status IN ('submitted', 'approved', 'processing')), 0) as credit_utilized
        FROM distributor_orders
        WHERE organization_id = $1
      `, [orgId]),
    ]);

    return {
      total_distributors: parseInt(distCounts.rows[0]?.total || '0', 10),
      active_distributors: parseInt(distCounts.rows[0]?.active || '0', 10),
      suspended_or_blocked_distributors: parseInt(distCounts.rows[0]?.suspended_or_blocked || '0', 10),
      total_mapped_cfs: parseInt(cfMaps.rows[0]?.mapped_cfs || '0', 10),
      total_channel_stock_units: Number(stockSums.rows[0]?.total_units || 0),
      estimated_channel_stock_value: Number(stockSums.rows[0]?.total_valuation || 0),
      transfers_in_transit_count: parseInt(trfSums.rows[0]?.in_transit_count || '0', 10),
      pending_receiving_count: parseInt(trfSums.rows[0]?.pending_receiving_count || '0', 10),
      pending_orders_count: parseInt(ordSums.rows[0]?.pending_orders || '0', 10),
      open_discrepancies_count: parseInt(discSums.rows[0]?.open_discrepancies || '0', 10),
      open_returns_count: parseInt(retSums.rows[0]?.open_returns || '0', 10),
      total_credit_limit: Number(distCounts.rows[0]?.total_credit_limit || 0),
      total_credit_utilized: Number(ordSums.rows[0]?.credit_utilized || 0),
    };
  }

  private mapDistributorRow(row: any): DistributorMaster {
    const creditLimit = Number(row.credit_limit || 0);
    const outstanding = Number(row.current_outstanding_amount || 0);
    return {
      ...row,
      credit_limit: creditLimit,
      payment_terms_days: Number(row.payment_terms_days || 30),
      agreed_discount_percent: Number(row.agreed_discount_percent || 0),
      mapped_cfs_count: Number(row.mapped_cfs_count || 0),
      active_skus_count: Number(row.active_skus_count || 0),
      stock_units_on_hand: Number(row.stock_units_on_hand || 0),
      stock_valuation: Number(row.stock_valuation || 0),
      current_outstanding_amount: outstanding,
      available_credit: Math.max(0, creditLimit - outstanding),
    };
  }
}
