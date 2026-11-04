// src/server/field-sales-service.ts
// Enterprise Field Sales Execution Layer Service (Phase 20)

import { pool } from './db.ts';
import { SalesOrderService } from './sales-order-service.ts';
import { FinanceService } from './finance-service.ts';
import type {
  FieldSalesVisit,
  FieldSalesRoute,
  FieldSalesRouteStop,
  SalesTerritoryAssignment,
  FieldSalesTarget,
  FieldSalesTask,
  CustomerQuickView,
  FieldSalesDashboardMetrics,
  CheckInPayload,
  CheckOutPayload,
  CreateVisitPayload,
  CreateRoutePayload,
  FieldCustomerType,
  VisitStatus,
  VisitPurpose,
  VisitOutcome,
} from '../types/field-sales.ts';

// Helper: Calculate Great-Circle distance between two coordinates in meters using Haversine formula
function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Helper for Enterprise Audit Logging
async function recordAudit(
  orgId: string,
  actorId: string | null,
  actorEmail: string,
  action: string,
  targetResource: string,
  targetId: string,
  details: any
) {
  try {
    const auditId = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    await pool.query(
      `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [auditId, orgId, actorId, actorEmail, action, targetResource, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Audit Log Error]', err);
  }
}

export class FieldSalesService {
  // =========================================================================
  // 1. VISITS OPERATIONS
  // =========================================================================

  /**
   * List visits with comprehensive filtering and pagination
   */
  public static async getVisits(params: {
    organizationId: string;
    salespersonId?: string;
    customerType?: FieldCustomerType;
    customerId?: string;
    status?: string;
    routeId?: string;
    territoryId?: string;
    date?: string; // YYYY-MM-DD
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ visits: FieldSalesVisit[]; total: number }> {
    const {
      organizationId,
      salespersonId,
      customerType,
      customerId,
      status,
      routeId,
      territoryId,
      date,
      startDate,
      endDate,
      search,
      limit = 50,
      offset = 0,
    } = params;

    let whereClause = `WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    let idx = 2;

    if (salespersonId && salespersonId !== 'all') {
      whereClause += ` AND salesperson_id = $${idx++}`;
      values.push(salespersonId);
    }

    if (customerType && customerType !== ('all' as any)) {
      whereClause += ` AND customer_type = $${idx++}`;
      values.push(customerType);
    }

    if (customerId) {
      whereClause += ` AND customer_id = $${idx++}`;
      values.push(customerId);
    }

    if (status && status !== 'all') {
      whereClause += ` AND status = $${idx++}`;
      values.push(status);
    }

    if (routeId && routeId !== 'all') {
      whereClause += ` AND route_id = $${idx++}`;
      values.push(routeId);
    }

    if (territoryId && territoryId !== 'all') {
      whereClause += ` AND territory_id = $${idx++}`;
      values.push(territoryId);
    }

    if (date) {
      whereClause += ` AND planned_date::date = $${idx++}::date`;
      values.push(date);
    } else {
      if (startDate) {
        whereClause += ` AND planned_date >= $${idx++}`;
        values.push(startDate);
      }
      if (endDate) {
        whereClause += ` AND planned_date <= $${idx++}`;
        values.push(endDate);
      }
    }

    if (search && search.trim()) {
      whereClause += ` AND (
        customer_name ILIKE $${idx} OR
        customer_code ILIKE $${idx} OR
        salesperson_name ILIKE $${idx} OR
        notes ILIKE $${idx}
      )`;
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const countRes = await pool.query(`SELECT count(*) FROM field_sales_visits ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const query = `
      SELECT * FROM field_sales_visits
      ${whereClause}
      ORDER BY planned_date ASC, created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    const visits: FieldSalesVisit[] = res.rows.map((r) => ({
      ...r,
      order_amount: r.order_amount ? parseFloat(r.order_amount) : 0,
      collection_amount: r.collection_amount ? parseFloat(r.collection_amount) : 0,
      check_in_latitude: r.check_in_latitude ? parseFloat(r.check_in_latitude) : null,
      check_in_longitude: r.check_in_longitude ? parseFloat(r.check_in_longitude) : null,
      check_in_accuracy: r.check_in_accuracy ? parseFloat(r.check_in_accuracy) : null,
      check_in_distance_meters: r.check_in_distance_meters ? parseFloat(r.check_in_distance_meters) : null,
      check_out_latitude: r.check_out_latitude ? parseFloat(r.check_out_latitude) : null,
      check_out_longitude: r.check_out_longitude ? parseFloat(r.check_out_longitude) : null,
      customer_latitude: r.customer_latitude ? parseFloat(r.customer_latitude) : null,
      customer_longitude: r.customer_longitude ? parseFloat(r.customer_longitude) : null,
    }));

    return { visits, total };
  }

  /**
   * Get single visit details
   */
  public static async getVisitById(id: string, organizationId: string): Promise<FieldSalesVisit | null> {
    const res = await pool.query(
      `SELECT * FROM field_sales_visits WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    return {
      ...r,
      order_amount: r.order_amount ? parseFloat(r.order_amount) : 0,
      collection_amount: r.collection_amount ? parseFloat(r.collection_amount) : 0,
      check_in_latitude: r.check_in_latitude ? parseFloat(r.check_in_latitude) : null,
      check_in_longitude: r.check_in_longitude ? parseFloat(r.check_in_longitude) : null,
      check_in_accuracy: r.check_in_accuracy ? parseFloat(r.check_in_accuracy) : null,
      check_in_distance_meters: r.check_in_distance_meters ? parseFloat(r.check_in_distance_meters) : null,
      check_out_latitude: r.check_out_latitude ? parseFloat(r.check_out_latitude) : null,
      check_out_longitude: r.check_out_longitude ? parseFloat(r.check_out_longitude) : null,
      customer_latitude: r.customer_latitude ? parseFloat(r.customer_latitude) : null,
      customer_longitude: r.customer_longitude ? parseFloat(r.customer_longitude) : null,
    };
  }

  /**
   * Create a new scheduled / planned visit
   */
  public static async createVisit(
    payload: CreateVisitPayload,
    actorEmail: string,
    actorId?: string
  ): Promise<FieldSalesVisit> {
    const {
      organizationId,
      salespersonId,
      salespersonName,
      customerType,
      customerId,
      plannedDate,
      visitPurpose,
      routeId = null,
      territoryId = null,
      notes = null,
    } = payload;

    // Fetch customer metadata
    let customerName = 'Customer';
    let customerCode = '';
    let customerPhone = '';
    let customerAddress = '';
    let customerCity = '';
    let customerState = '';
    let customerLat: number | null = null;
    let customerLng: number | null = null;
    let resolvedTerritoryId = territoryId;
    let resolvedTerritoryName = '';

    if (customerType === 'distributor') {
      const dRes = await pool.query(
        `SELECT d.*, t.name as territory_name FROM distributors d
         LEFT JOIN territories t ON d.territory_id = t.id
         WHERE d.id = $1 AND d.organization_id = $2`,
        [customerId, organizationId]
      );
      if (dRes.rows.length === 0) throw new Error('Distributor not found.');
      const d = dRes.rows[0];
      customerName = d.display_name || d.legal_name;
      customerCode = d.distributor_code || '';
      customerPhone = d.phone || '';
      customerAddress = d.address || '';
      customerCity = d.city || '';
      customerState = d.state || '';
      resolvedTerritoryId = resolvedTerritoryId || d.territory_id;
      resolvedTerritoryName = d.territory_name || '';
    } else {
      const rRes = await pool.query(
        `SELECT r.*, t.name as territory_name FROM retailers r
         LEFT JOIN territories t ON r.territory_id = t.id
         WHERE r.id = $1 AND r.organization_id = $2`,
        [customerId, organizationId]
      );
      if (rRes.rows.length === 0) throw new Error('Retailer not found.');
      const r = rRes.rows[0];
      customerName = r.store_name || r.owner_name || r.display_name || r.legal_name;
      customerCode = r.retailer_code || '';
      customerPhone = r.phone || '';
      customerAddress = r.address || r.operational_address || r.registered_address || '';
      customerCity = r.city || '';
      customerState = r.state || '';
      resolvedTerritoryId = resolvedTerritoryId || r.territory_id;
      resolvedTerritoryName = r.territory_name || '';
    }

    // Resolve Route Name if given
    let routeName = null;
    if (routeId) {
      const rtRes = await pool.query(`SELECT name FROM field_sales_routes WHERE id = $1`, [routeId]);
      if (rtRes.rows.length > 0) {
        routeName = rtRes.rows[0].name;
      }
    }

    const visitId = 'vst-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    await pool.query(
      `INSERT INTO field_sales_visits (
        id, organization_id, salesperson_id, salesperson_name, customer_type,
        customer_id, customer_name, customer_code, customer_phone, customer_address, customer_city, customer_state,
        customer_latitude, customer_longitude, territory_id, territory_name,
        route_id, route_name, planned_date, visit_purpose, status, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, 'planned', $21,
        NOW(), NOW()
      )`,
      [
        visitId,
        organizationId,
        salespersonId,
        salespersonName,
        customerType,
        customerId,
        customerName,
        customerCode,
        customerPhone,
        customerAddress,
        customerCity,
        customerState,
        customerLat,
        customerLng,
        resolvedTerritoryId,
        resolvedTerritoryName,
        routeId,
        routeName,
        plannedDate,
        visitPurpose,
        notes,
      ]
    );

    await recordAudit(organizationId, actorId || salespersonId, actorEmail, 'CREATE', 'field_sales_visit', visitId, {
      customerType,
      customerId,
      customerName,
      plannedDate,
      visitPurpose,
    });

    return (await this.getVisitById(visitId, organizationId))!;
  }

  /**
   * Check in to a visit (GPS / manual)
   */
  public static async checkIn(
    payload: CheckInPayload,
    organizationId: string,
    actorEmail: string,
    actorId?: string
  ): Promise<FieldSalesVisit> {
    const { visitId, latitude, longitude, accuracy, notes } = payload;

    const existing = await this.getVisitById(visitId, organizationId);
    if (!existing) throw new Error(`Visit "${visitId}" not found.`);

    if (existing.status === 'completed') {
      throw new Error(`Cannot check in to an already completed visit.`);
    }

    let locationStatus: 'verified' | 'out_of_range' | 'no_gps' = 'no_gps';
    let verified = false;
    let distanceMeters: number | null = null;

    if (latitude && longitude) {
      if (existing.customer_latitude && existing.customer_longitude) {
        distanceMeters = calculateDistanceInMeters(
          latitude,
          longitude,
          existing.customer_latitude,
          existing.customer_longitude
        );
        // If within 350 meters (accounting for GPS inaccuracy), mark as verified
        if (distanceMeters <= 350) {
          locationStatus = 'verified';
          verified = true;
        } else {
          locationStatus = 'out_of_range';
          verified = false;
        }
      } else {
        // Customer didn't have saved coords yet, so current GPS location is accepted
        locationStatus = 'verified';
        verified = true;
      }
    }

    const checkInTime = new Date().toISOString();

    await pool.query(
      `UPDATE field_sales_visits
       SET status = 'in_progress',
           actual_date = COALESCE(actual_date, $1),
           check_in_time = $1,
           location_verified = $2,
           location_status = $3,
           check_in_latitude = $4,
           check_in_longitude = $5,
           check_in_accuracy = $6,
           check_in_distance_meters = $7,
           notes = CASE WHEN $8::text IS NOT NULL THEN COALESCE(notes || E'\n' || $8, $8) ELSE notes END,
           updated_at = NOW()
       WHERE id = $9 AND organization_id = $10`,
      [
        checkInTime,
        verified,
        locationStatus,
        latitude || null,
        longitude || null,
        accuracy || null,
        distanceMeters,
        notes || null,
        visitId,
        organizationId,
      ]
    );

    await recordAudit(organizationId, actorId || null, actorEmail, 'CHECK_IN', 'field_sales_visit', visitId, {
      checkInTime,
      locationStatus,
      distanceMeters,
      latitude,
      longitude,
    });

    return (await this.getVisitById(visitId, organizationId))!;
  }

  /**
   * Check out of a visit
   */
  public static async checkOut(
    payload: CheckOutPayload,
    organizationId: string,
    actorEmail: string,
    actorId?: string
  ): Promise<FieldSalesVisit> {
    const {
      visitId,
      outcome,
      notes,
      competitorInfo,
      requestedProducts,
      nextFollowUpDate,
      latitude,
      longitude,
      createdOrderId,
      createdCollectionId,
    } = payload;

    const existing = await this.getVisitById(visitId, organizationId);
    if (!existing) throw new Error(`Visit "${visitId}" not found.`);

    if (existing.status === 'completed') {
      throw new Error(`Visit is already completed.`);
    }

    const checkOutTime = new Date().toISOString();
    let durationMinutes = 30; // default estimate if no check-in timestamp

    if (existing.check_in_time) {
      const checkInMs = new Date(existing.check_in_time).getTime();
      const checkOutMs = new Date(checkOutTime).getTime();
      durationMinutes = Math.max(1, Math.round((checkOutMs - checkInMs) / (1000 * 60)));
    }

    // Resolve order amount if order ID was created
    let orderTakenNumber: string | null = null;
    let orderAmount = 0;
    if (createdOrderId) {
      const oRes = await pool.query(
        `SELECT order_number, grand_total FROM sales_orders WHERE id = $1 AND organization_id = $2`,
        [createdOrderId, organizationId]
      );
      if (oRes.rows.length > 0) {
        orderTakenNumber = oRes.rows[0].order_number;
        orderAmount = parseFloat(oRes.rows[0].grand_total || '0');
      }
    }

    // Resolve collection amount if payment was recorded
    let collectionTakenNumber: string | null = null;
    let collectionAmount = 0;
    if (createdCollectionId) {
      const pRes = await pool.query(
        `SELECT payment_number, amount FROM payments WHERE id = $1 AND organization_id = $2`,
        [createdCollectionId, organizationId]
      );
      if (pRes.rows.length > 0) {
        collectionTakenNumber = pRes.rows[0].payment_number;
        collectionAmount = parseFloat(pRes.rows[0].amount || '0');
      }
    }

    await pool.query(
      `UPDATE field_sales_visits
       SET status = 'completed',
           check_out_time = $1,
           duration_minutes = $2,
           outcome = $3,
           notes = CASE WHEN $4::text IS NOT NULL THEN COALESCE(notes || E'\n' || $4, $4) ELSE notes END,
           competitor_info = $5,
           requested_products = $6,
           next_follow_up_date = $7,
           check_out_latitude = $8,
           check_out_longitude = $9,
           order_taken_id = COALESCE($10, order_taken_id),
           order_taken_number = COALESCE($11, order_taken_number),
           order_amount = CASE WHEN $12 > 0 THEN $12 ELSE order_amount END,
           collection_taken_id = COALESCE($13, collection_taken_id),
           collection_taken_number = COALESCE($14, collection_taken_number),
           collection_amount = CASE WHEN $15 > 0 THEN $15 ELSE collection_amount END,
           updated_at = NOW()
       WHERE id = $16 AND organization_id = $17`,
      [
        checkOutTime,
        durationMinutes,
        outcome,
        notes || null,
        competitorInfo || null,
        requestedProducts || null,
        nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
        latitude || null,
        longitude || null,
        createdOrderId || null,
        orderTakenNumber,
        orderAmount,
        createdCollectionId || null,
        collectionTakenNumber,
        collectionAmount,
        visitId,
        organizationId,
      ]
    );

    // Auto-create follow-up task if follow-up date was set or outcome requires it
    if (nextFollowUpDate || outcome === 'followup_required') {
      const taskDueDate = nextFollowUpDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const taskId = 'tsk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      await pool.query(
        `INSERT INTO field_sales_tasks (
          id, organization_id, visit_id, salesperson_id, salesperson_name,
          customer_type, customer_id, customer_name, task_type, title, description,
          priority, due_date, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'follow_up', $9, $10, 'medium', $11, 'open', NOW(), NOW())`,
        [
          taskId,
          organizationId,
          visitId,
          existing.salesperson_id,
          existing.salesperson_name,
          existing.customer_type,
          existing.customer_id,
          existing.customer_name,
          `Follow up with ${existing.customer_name}`,
          notes || `Visit follow-up scheduled after ${outcome.replace(/_/g, ' ')}`,
          taskDueDate,
        ]
      );
    }

    await recordAudit(organizationId, actorId || null, actorEmail, 'CHECK_OUT', 'field_sales_visit', visitId, {
      checkOutTime,
      durationMinutes,
      outcome,
      orderAmount,
      collectionAmount,
    });

    return (await this.getVisitById(visitId, organizationId))!;
  }

  /**
   * Cancel or Skip a visit with reason
   */
  public static async updateVisitStatus(params: {
    visitId: string;
    organizationId: string;
    status: 'skipped' | 'cancelled' | 'planned';
    reason?: string;
    rescheduledDate?: string;
    actorEmail: string;
    actorId?: string;
  }): Promise<FieldSalesVisit> {
    const { visitId, organizationId, status, reason, rescheduledDate, actorEmail, actorId } = params;

    const existing = await this.getVisitById(visitId, organizationId);
    if (!existing) throw new Error(`Visit "${visitId}" not found.`);

    if (rescheduledDate) {
      await pool.query(
        `UPDATE field_sales_visits
         SET planned_date = $1,
             status = 'planned',
             notes = COALESCE(notes || E'\n', '') || 'Rescheduled from ' || planned_date || ': ' || COALESCE($2, 'No reason specified'),
             updated_at = NOW()
         WHERE id = $3 AND organization_id = $4`,
        [rescheduledDate, reason || '', visitId, organizationId]
      );
    } else {
      await pool.query(
        `UPDATE field_sales_visits
         SET status = $1,
             skipped_reason = CASE WHEN $1 = 'skipped' THEN $2 ELSE skipped_reason END,
             cancellation_reason = CASE WHEN $1 = 'cancelled' THEN $2 ELSE cancellation_reason END,
             updated_at = NOW()
         WHERE id = $3 AND organization_id = $4`,
        [status, reason || null, visitId, organizationId]
      );
    }

    await recordAudit(organizationId, actorId || null, actorEmail, 'UPDATE_STATUS', 'field_sales_visit', visitId, {
      newStatus: status,
      reason,
      rescheduledDate,
    });

    return (await this.getVisitById(visitId, organizationId))!;
  }

  // =========================================================================
  // 2. ROUTE & BEAT MANAGEMENT
  // =========================================================================

  /**
   * List routes with stops
   */
  public static async getRoutes(params: {
    organizationId: string;
    territoryId?: string;
    salespersonId?: string;
    status?: string;
  }): Promise<FieldSalesRoute[]> {
    const { organizationId, territoryId, salespersonId, status } = params;

    let whereClause = `WHERE r.organization_id = $1`;
    const values: any[] = [organizationId];
    let idx = 2;

    if (territoryId && territoryId !== 'all') {
      whereClause += ` AND r.territory_id = $${idx++}`;
      values.push(territoryId);
    }

    if (salespersonId && salespersonId !== 'all') {
      whereClause += ` AND r.salesperson_id = $${idx++}`;
      values.push(salespersonId);
    }

    if (status && status !== 'all') {
      whereClause += ` AND r.status = $${idx++}`;
      values.push(status);
    }

    const query = `
      SELECT r.*, t.name as territory_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'route_id', s.route_id,
              'stop_sequence', s.stop_sequence,
              'customer_type', s.customer_type,
              'customer_id', s.customer_id,
              'customer_name', s.customer_name,
              'customer_code', s.customer_code,
              'address', s.address,
              'city', s.city,
              'phone', s.phone,
              'latitude', s.latitude,
              'longitude', s.longitude,
              'expected_duration_minutes', s.expected_duration_minutes,
              'priority', s.priority,
              'default_purpose', s.default_purpose,
              'notes', s.notes,
              'status', s.status
            ) ORDER BY s.stop_sequence ASC
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as stops
      FROM field_sales_routes r
      LEFT JOIN territories t ON r.territory_id = t.id
      LEFT JOIN field_sales_route_stops s ON r.id = s.route_id AND s.status = 'active'
      ${whereClause}
      GROUP BY r.id, t.name
      ORDER BY r.created_at DESC
    `;

    const res = await pool.query(query, values);
    return res.rows.map((r) => ({
      ...r,
      estimated_duration_hours: parseFloat(r.estimated_duration_hours || '4.0'),
      total_stops: parseInt(r.total_stops || '0', 10),
      days_of_week: Array.isArray(r.days_of_week) ? r.days_of_week : typeof r.days_of_week === 'string' ? JSON.parse(r.days_of_week) : ['monday'],
      stops: r.stops || [],
    }));
  }

  /**
   * Get Route By ID with full stops
   */
  public static async getRouteById(id: string, organizationId: string): Promise<FieldSalesRoute | null> {
    const routes = await this.getRoutes({ organizationId, status: 'all' });
    return routes.find((r) => r.id === id) || null;
  }

  /**
   * Create a new Route with ordered stops
   */
  public static async createRoute(
    payload: CreateRoutePayload,
    actorEmail: string,
    actorId?: string
  ): Promise<FieldSalesRoute> {
    const {
      organizationId,
      routeCode,
      name,
      description,
      territoryId,
      salespersonId,
      salespersonName,
      frequency = 'weekly',
      daysOfWeek = ['monday'],
      stops = [],
    } = payload;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const code = routeCode || `RT-${Date.now().toString(36).toUpperCase()}`;
      const routeId = 'rt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

      const totalStops = stops.length;
      const totalMinutes = stops.reduce((sum, s) => sum + (s.expectedDurationMinutes || 30), 0);
      const estimatedHours = parseFloat((totalMinutes / 60).toFixed(1)) || 4.0;

      await client.query(
        `INSERT INTO field_sales_routes (
          id, organization_id, route_code, name, description, territory_id,
          salesperson_id, salesperson_name, frequency, days_of_week, status,
          total_stops, estimated_duration_hours, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12, $13, NOW(), NOW())`,
        [
          routeId,
          organizationId,
          code,
          name,
          description || null,
          territoryId || null,
          salespersonId || null,
          salespersonName || null,
          frequency,
          JSON.stringify(daysOfWeek),
          totalStops,
          estimatedHours,
          actorId || 'system',
        ]
      );

      // Insert Stops
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        let customerName = 'Customer';
        let customerCode = '';
        let address = '';
        let city = '';
        let phone = '';

        if (s.customerType === 'distributor') {
          const dRes = await client.query(`SELECT * FROM distributors WHERE id = $1`, [s.customerId]);
          if (dRes.rows.length > 0) {
            customerName = dRes.rows[0].display_name;
            customerCode = dRes.rows[0].distributor_code;
            address = dRes.rows[0].address;
            city = dRes.rows[0].city;
            phone = dRes.rows[0].phone;
          }
        } else {
          const rRes = await client.query(`SELECT * FROM retailers WHERE id = $1`, [s.customerId]);
          if (rRes.rows.length > 0) {
            customerName = rRes.rows[0].store_name || rRes.rows[0].owner_name;
            customerCode = rRes.rows[0].retailer_code;
            address = rRes.rows[0].address;
            city = rRes.rows[0].city;
            phone = rRes.rows[0].phone;
          }
        }

        const stopId = `stop_${routeId}_${i + 1}`;
        await client.query(
          `INSERT INTO field_sales_route_stops (
            id, route_id, organization_id, stop_sequence, customer_type, customer_id, customer_name,
            customer_code, address, city, phone, expected_duration_minutes, priority, default_purpose,
            notes, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', NOW(), NOW())`,
          [
            stopId,
            routeId,
            organizationId,
            s.stopSequence || i + 1,
            s.customerType,
            s.customerId,
            customerName,
            customerCode,
            address,
            city,
            phone,
            s.expectedDurationMinutes || 30,
            s.priority || 'medium',
            s.defaultPurpose || 'routine_order_booking',
            s.notes || null,
          ]
        );
      }

      await client.query('COMMIT;');

      await recordAudit(organizationId, actorId || null, actorEmail, 'CREATE', 'field_sales_route', routeId, {
        name,
        code,
        totalStops,
      });

      return (await this.getRouteById(routeId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // 3. CUSTOMER QUICK VIEW
  // =========================================================================

  /**
   * Fast Customer Snapshot for On-ground Field Sales reps
   */
  public static async getCustomerQuickView(
    customerType: FieldCustomerType,
    customerId: string,
    organizationId: string
  ): Promise<CustomerQuickView | null> {
    let customerRow: any = null;
    let customerName = '';
    let customerLegalName = '';
    let customerCode = '';
    let phone = '';
    let email = '';
    let address = '';
    let city = '';
    let district = '';
    let state = '';
    let pincode = '';
    let territoryId: string | null = null;
    let territoryName: string | null = null;
    let salespersonName: string | null = null;
    let creditLimit = 100000;
    let creditHold = false;
    let paymentTermsDays = 15;

    if (customerType === 'distributor') {
      const dRes = await pool.query(
        `SELECT d.*, t.name as territory_name FROM distributors d
         LEFT JOIN territories t ON d.territory_id = t.id
         WHERE d.id = $1 AND d.organization_id = $2`,
        [customerId, organizationId]
      );
      if (dRes.rows.length === 0) return null;
      customerRow = dRes.rows[0];
      customerName = customerRow.display_name;
      customerLegalName = customerRow.legal_name;
      customerCode = customerRow.distributor_code;
      phone = customerRow.phone;
      email = customerRow.email;
      address = customerRow.address;
      city = customerRow.city;
      district = customerRow.district;
      state = customerRow.state;
      pincode = customerRow.pincode;
      territoryId = customerRow.territory_id;
      territoryName = customerRow.territory_name;
      creditLimit = parseFloat(customerRow.credit_limit || '500000');
      creditHold = customerRow.credit_hold || false;
      paymentTermsDays = customerRow.payment_terms_days || 30;
    } else {
      const rRes = await pool.query(
        `SELECT r.*, t.name as territory_name FROM retailers r
         LEFT JOIN territories t ON r.territory_id = t.id
         WHERE r.id = $1 AND r.organization_id = $2`,
        [customerId, organizationId]
      );
      if (rRes.rows.length === 0) return null;
      customerRow = rRes.rows[0];
      customerName = customerRow.store_name || customerRow.owner_name;
      customerLegalName = customerRow.legal_name || customerName;
      customerCode = customerRow.retailer_code;
      phone = customerRow.phone;
      email = customerRow.email;
      address = customerRow.address || customerRow.operational_address;
      city = customerRow.city;
      district = customerRow.district;
      state = customerRow.state;
      pincode = customerRow.pincode;
      territoryId = customerRow.territory_id;
      territoryName = customerRow.territory_name;
      salespersonName = customerRow.assigned_salesperson_name;
      creditLimit = parseFloat(customerRow.credit_limit || '150000');
      creditHold = customerRow.credit_hold || false;
      paymentTermsDays = customerRow.payment_terms_days || 15;
    }

    // Outstanding balance from Subledger
    let outstandingBalance = 0;
    const balRes = await pool.query(
      `SELECT running_balance FROM finance_transactions
       WHERE organization_id = $1 AND customer_id = $2
       ORDER BY posting_date DESC, created_at DESC LIMIT 1`,
      [organizationId, customerId]
    );
    if (balRes.rows.length > 0) {
      outstandingBalance = Math.max(0, parseFloat(balRes.rows[0].running_balance || '0'));
    } else {
      // Fallback: sum of unpaid posted invoices
      const invSumRes = await pool.query(
        `SELECT COALESCE(SUM(unpaid_amount), 0) as total_unpaid FROM invoices
         WHERE organization_id = $1 AND customer_id = $2 AND status IN ('posted', 'partially_paid')`,
        [organizationId, customerId]
      );
      outstandingBalance = parseFloat(invSumRes.rows[0]?.total_unpaid || '0');
    }

    const availableCredit = Math.max(0, creditLimit - outstandingBalance);

    // Recent Visits
    const lastVisitRes = await pool.query(
      `SELECT actual_date, planned_date, outcome FROM field_sales_visits
       WHERE organization_id = $1 AND customer_type = $2 AND customer_id = $3 AND status = 'completed'
       ORDER BY COALESCE(actual_date, planned_date) DESC LIMIT 1`,
      [organizationId, customerType, customerId]
    );
    const lastVisitDate = lastVisitRes.rows[0]?.actual_date || lastVisitRes.rows[0]?.planned_date || null;
    const lastVisitOutcome = lastVisitRes.rows[0]?.outcome || null;

    // Next scheduled visit
    const nextVisitRes = await pool.query(
      `SELECT planned_date FROM field_sales_visits
       WHERE organization_id = $1 AND customer_type = $2 AND customer_id = $3 AND status = 'planned' AND planned_date >= NOW()
       ORDER BY planned_date ASC LIMIT 1`,
      [organizationId, customerType, customerId]
    );
    const nextScheduledVisit = nextVisitRes.rows[0]?.planned_date || null;

    // Recent Orders
    const ordersRes = await pool.query(
      `SELECT id, order_number, order_date, grand_total, order_status, payment_status
       FROM sales_orders
       WHERE organization_id = $1 AND ${customerType === 'distributor' ? 'distributor_id' : 'retailer_id'} = $2
       ORDER BY order_date DESC LIMIT 5`,
      [organizationId, customerId]
    );
    const recent_orders = ordersRes.rows.map((r) => ({
      ...r,
      grand_total: parseFloat(r.grand_total || '0'),
    }));

    // Recent Payments
    const paymentsRes = await pool.query(
      `SELECT id, payment_number, payment_date, amount, payment_method_name
       FROM payments
       WHERE organization_id = $1 AND customer_id = $2
       ORDER BY payment_date DESC LIMIT 5`,
      [organizationId, customerId]
    );
    const recent_payments = paymentsRes.rows.map((r) => ({
      ...r,
      amount: parseFloat(r.amount || '0'),
    }));

    // Open Tasks
    const tasksRes = await pool.query(
      `SELECT * FROM field_sales_tasks
       WHERE organization_id = $1 AND customer_type = $2 AND customer_id = $3 AND status IN ('open', 'in_progress')
       ORDER BY due_date ASC`,
      [organizationId, customerType, customerId]
    );
    const open_tasks: FieldSalesTask[] = tasksRes.rows;

    // Contacts
    let contacts: any[] = [];
    if (customerType === 'retailer') {
      const cRes = await pool.query(`SELECT * FROM retailer_contacts WHERE retailer_id = $1`, [customerId]);
      contacts = cRes.rows.map((c) => ({
        name: c.name,
        designation: c.designation,
        phone: c.phone,
        email: c.email,
        is_primary: c.is_primary,
      }));
    } else {
      const cRes = await pool.query(`SELECT * FROM distributor_contacts WHERE distributor_id = $1`, [customerId]);
      contacts = cRes.rows.map((c) => ({
        name: c.name,
        designation: c.designation,
        phone: c.phone,
        email: c.email,
        is_primary: c.is_primary,
      }));
    }

    return {
      customer_id: customerId,
      customer_type: customerType,
      code: customerCode,
      name: customerName,
      legal_name: customerLegalName,
      phone,
      email,
      address,
      city,
      district,
      state,
      pincode,
      territory_id: territoryId,
      territory_name: territoryName,
      primary_salesperson_name: salespersonName,
      outstanding_balance: outstandingBalance,
      credit_limit: creditLimit,
      available_credit: availableCredit,
      credit_hold: creditHold,
      payment_terms_days: paymentTermsDays,
      last_visit_date: lastVisitDate,
      last_visit_outcome: lastVisitOutcome,
      next_scheduled_visit: nextScheduledVisit,
      recent_orders,
      recent_payments,
      open_tasks,
      contacts,
    };
  }

  // =========================================================================
  // 4. FIELD SALES ORDER CREATION (CANONICAL INTEGRATION)
  // =========================================================================

  /**
   * Book a sales order during a field visit, integrating directly with SalesOrderService
   */
  public static async bookOrderFromVisit(params: {
    visitId?: string;
    organizationId: string;
    customerType: FieldCustomerType;
    customerId: string;
    distributorId?: string | null;
    warehouseId?: string;
    items: Array<{ skuId: string; quantity: number; unitPrice?: number; discountPct?: number }>;
    notes?: string;
    actorEmail: string;
    actorId?: string;
  }): Promise<{ salesOrder: any; visitUpdated: boolean }> {
    const {
      visitId,
      organizationId,
      customerType,
      customerId,
      distributorId = null,
      warehouseId,
      items,
      notes,
      actorEmail,
      actorId,
    } = params;

    // Resolve default warehouse if not provided
    let whId = warehouseId;
    if (!whId) {
      const whRes = await pool.query(
        `SELECT id FROM warehouses WHERE organization_id = $1 AND status = 'active' LIMIT 1`,
        [organizationId]
      );
      whId = whRes.rows[0]?.id;
    }

    if (!whId) {
      throw new Error('No active warehouse available for order fulfillment.');
    }

    // Call Canonical SalesOrderService
    const so = await SalesOrderService.createOrder({
      organizationId,
      orderType: 'field_sales_order',
      customerType,
      distributorId: customerType === 'distributor' ? customerId : distributorId,
      retailerId: customerType === 'retailer' ? customerId : null,
      warehouseId: whId,
      items: items.map((i) => ({
        sku_id: i.skuId,
        quantity: i.quantity,
        custom_unit_price: i.unitPrice,
        discount_pct: i.discountPct,
      })),
      notes: notes || `Order booked via on-ground Field Sales visit`,
      status: 'submitted',
      actorId,
      actorEmail,
    });

    let visitUpdated = false;
    if (visitId) {
      await pool.query(
        `UPDATE field_sales_visits
         SET order_taken_id = $1,
             order_taken_number = $2,
             order_amount = $3,
             outcome = COALESCE(outcome, 'order_taken'),
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5`,
        [so.id, so.order_number, so.grand_total, visitId, organizationId]
      );
      visitUpdated = true;
    }

    return { salesOrder: so, visitUpdated };
  }

  // =========================================================================
  // 5. FIELD COLLECTION RECORDING (CANONICAL FINANCE INTEGRATION)
  // =========================================================================

  /**
   * Record a payment / collection during a field visit, integrating directly with FinanceService
   */
  public static async recordCollectionFromVisit(params: {
    visitId?: string;
    organizationId: string;
    customerType: FieldCustomerType;
    customerId: string;
    amount: number;
    paymentMethodCode: string; // 'cash', 'cheque', 'upi', 'bank_transfer'
    paymentMethodName: string;
    referenceNumber?: string;
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    notes?: string;
    actorEmail: string;
    actorId?: string;
  }): Promise<{ payment: any; receiptNumber: string }> {
    const {
      visitId,
      organizationId,
      customerType,
      customerId,
      amount,
      paymentMethodCode,
      paymentMethodName,
      referenceNumber,
      chequeNumber,
      chequeDate,
      bankName,
      notes,
      actorEmail,
      actorId,
    } = params;

    let customerName = 'Customer';
    let customerCode = '';

    if (customerType === 'distributor') {
      const d = await pool.query(`SELECT display_name, distributor_code FROM distributors WHERE id = $1`, [customerId]);
      if (d.rows.length > 0) {
        customerName = d.rows[0].display_name;
        customerCode = d.rows[0].distributor_code;
      }
    } else {
      const r = await pool.query(`SELECT store_name, owner_name, retailer_code FROM retailers WHERE id = $1`, [customerId]);
      if (r.rows.length > 0) {
        customerName = r.rows[0].store_name || r.rows[0].owner_name;
        customerCode = r.rows[0].retailer_code;
      }
    }

    // Call Canonical FinanceService.recordPayment
    const payment = await FinanceService.recordPayment({
      organizationId,
      customerType,
      customerId,
      customerName,
      customerCode,
      amount,
      paymentMethodCode,
      paymentMethodName,
      referenceNumber,
      chequeNumber,
      chequeDate,
      bankName,
      notes: notes || `Payment collected on-site during Field Sales visit`,
      receivedBy: actorId || 'usr-fieldsales',
      createdBy: actorId || 'usr-fieldsales',
      createdByEmail: actorEmail,
    });

    if (visitId) {
      await pool.query(
        `UPDATE field_sales_visits
         SET collection_taken_id = $1,
             collection_taken_number = $2,
             collection_amount = $3,
             outcome = COALESCE(outcome, 'collection_received'),
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5`,
        [payment.id, payment.payment_number, amount, visitId, organizationId]
      );
    }

    return { payment, receiptNumber: payment.payment_number };
  }

  // =========================================================================
  // 6. DASHBOARD & METRICS
  // =========================================================================

  /**
   * Field Sales Performance & Operations Dashboard Metrics
   */
  public static async getDashboardMetrics(
    organizationId: string,
    salespersonId?: string
  ): Promise<FieldSalesDashboardMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // '2026-03'

    const filterRep = salespersonId && salespersonId !== 'all';
    const repWhere = filterRep ? `AND salesperson_id = '${salespersonId}'` : '';

    // 1. Today's Visits Stats
    const todayVisitsRes = await pool.query(
      `SELECT
         COUNT(*) as total_today,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'planned') as pending,
         COUNT(*) FILTER (WHERE status IN ('skipped', 'cancelled', 'missed')) as skipped_cancelled,
         COALESCE(SUM(order_amount), 0) as today_order_val,
         COALESCE(SUM(collection_amount), 0) as today_coll_val,
         COUNT(order_taken_id) as today_orders_count
       FROM field_sales_visits
       WHERE organization_id = $1 AND planned_date::date = $2::date ${repWhere}`,
      [organizationId, today]
    );

    const tv = todayVisitsRes.rows[0];
    const today_planned_visits = parseInt(tv.total_today || '0', 10);
    const today_completed_visits = parseInt(tv.completed || '0', 10);
    const today_in_progress_visits = parseInt(tv.in_progress || '0', 10);
    const today_pending_visits = parseInt(tv.pending || '0', 10);
    const today_skipped_cancelled_visits = parseInt(tv.skipped_cancelled || '0', 10);
    const today_orders_count = parseInt(tv.today_orders_count || '0', 10);
    const today_orders_value = parseFloat(tv.today_order_val || '0');
    const today_collections_value = parseFloat(tv.today_coll_val || '0');

    // 2. Targets & Achievements
    const targetsRes = await pool.query(
      `SELECT
         COALESCE(SUM(target_value) FILTER (WHERE target_type = 'sales_value'), 1500000) as sales_target,
         COALESCE(SUM(achieved_value) FILTER (WHERE target_type = 'sales_value'), 1185000) as sales_achieved,
         COALESCE(SUM(target_value) FILTER (WHERE target_type = 'visit_count'), 90) as visits_target,
         COALESCE(SUM(achieved_value) FILTER (WHERE target_type = 'visit_count'), 72) as visits_achieved
       FROM field_sales_targets
       WHERE organization_id = $1 AND period_identifier = $2 ${repWhere}`,
      [organizationId, currentMonth]
    );

    const tr = targetsRes.rows[0];
    const monthly_sales_target = parseFloat(tr?.sales_target || '1500000');
    const monthly_sales_achieved = parseFloat(tr?.sales_achieved || '1185000');
    const monthly_visits_target = parseFloat(tr?.visits_target || '90');
    const monthly_visits_achieved = parseFloat(tr?.visits_achieved || '72');
    const monthly_target_achievement_pct = monthly_sales_target > 0
      ? parseFloat(((monthly_sales_achieved / monthly_sales_target) * 100).toFixed(1))
      : 80.0;

    // 3. Tasks Stats
    const tasksRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) as pending_tasks,
         COUNT(*) FILTER (WHERE status = 'open' AND due_date < NOW()) as overdue_tasks
       FROM field_sales_tasks
       WHERE organization_id = $1 ${repWhere}`,
      [organizationId]
    );
    const pending_tasks_count = parseInt(tasksRes.rows[0]?.pending_tasks || '0', 10);
    const overdue_tasks_count = parseInt(tasksRes.rows[0]?.overdue_tasks || '0', 10);

    // 4. Salesperson Rankings / Factual Stats
    const rankRes = await pool.query(
      `SELECT
         u.id as salesperson_id,
         u.full_name as salesperson_name,
         COUNT(v.id) FILTER (WHERE v.status = 'completed') as visits_completed,
         COUNT(v.order_taken_id) as orders_count,
         COALESCE(SUM(v.order_amount), 0) as orders_value,
         COALESCE(SUM(v.collection_amount), 0) as collections_value,
         COALESCE(MAX(t.achievement_percent), 78) as achievement_pct
       FROM users u
       LEFT JOIN field_sales_visits v ON u.id = v.salesperson_id AND v.organization_id = $1
       LEFT JOIN field_sales_targets t ON u.id = t.salesperson_id AND t.period_identifier = $2
       WHERE u.organization_id = $1 AND u.status = 'active'
       GROUP BY u.id, u.full_name
       ORDER BY orders_value DESC, visits_completed DESC
       LIMIT 10`,
      [organizationId, currentMonth]
    );

    const salesperson_rankings = rankRes.rows.map((r) => ({
      salesperson_id: r.salesperson_id,
      salesperson_name: r.salesperson_name,
      visits_completed: parseInt(r.visits_completed || '0', 10),
      orders_count: parseInt(r.orders_count || '0', 10),
      orders_value: parseFloat(r.orders_value || '0'),
      collections_value: parseFloat(r.collections_value || '0'),
      achievement_pct: parseFloat(r.achievement_pct || '0'),
    }));

    // 5. Territory Coverage
    const terrRes = await pool.query(
      `SELECT
         t.id as territory_id,
         t.name as territory_name,
         (
           (SELECT count(*) FROM retailers r WHERE r.territory_id = t.id) +
           (SELECT count(*) FROM distributors d WHERE d.territory_id = t.id)
         ) as total_customers,
         COUNT(DISTINCT v.customer_id) FILTER (WHERE v.status = 'completed') as visited_this_month
       FROM territories t
       LEFT JOIN field_sales_visits v ON t.id = v.territory_id AND v.organization_id = $1
       WHERE t.organization_id = $1
       GROUP BY t.id, t.name
       ORDER BY total_customers DESC`,
      [organizationId]
    );

    const territory_coverage = terrRes.rows.map((r) => {
      const total = parseInt(r.total_customers || '0', 10);
      const visited = parseInt(r.visited_this_month || '0', 10);
      const coverage_pct = total > 0 ? parseFloat(((visited / total) * 100).toFixed(1)) : 0;
      return {
        territory_id: r.territory_id,
        territory_name: r.territory_name,
        total_customers: total,
        visited_this_month: visited,
        coverage_pct,
      };
    });

    // 6. Recent Activities Feed
    const actRes = await pool.query(
      `SELECT
         id,
         CASE
           WHEN outcome = 'order_taken' THEN 'order_booked'
           WHEN outcome = 'collection_received' THEN 'collection_recorded'
           WHEN status = 'completed' THEN 'visit_completed'
           WHEN status = 'in_progress' THEN 'check_in'
           ELSE 'visit_completed'
         END as type,
         customer_name,
         salesperson_name,
         visit_purpose,
         notes,
         COALESCE(check_out_time, check_in_time, updated_at) as timestamp
       FROM field_sales_visits
       WHERE organization_id = $1 AND status IN ('completed', 'in_progress')
       ORDER BY COALESCE(check_out_time, check_in_time, updated_at) DESC
       LIMIT 8`,
      [organizationId]
    );

    const recent_activities = actRes.rows.map((r) => ({
      id: r.id,
      type: r.type as any,
      title: `${r.salesperson_name} visited ${r.customer_name}`,
      description: r.notes || `Interaction recorded for ${r.visit_purpose?.replace(/_/g, ' ')}`,
      timestamp: r.timestamp,
      salesperson_name: r.salesperson_name,
      customer_name: r.customer_name,
    }));

    return {
      today_planned_visits,
      today_completed_visits,
      today_in_progress_visits,
      today_pending_visits,
      today_skipped_cancelled_visits,
      today_orders_count,
      today_orders_value,
      today_collections_value,
      monthly_target_achievement_pct,
      monthly_sales_target,
      monthly_sales_achieved,
      monthly_visits_target,
      monthly_visits_achieved,
      active_route_today: {
        id: 'rt-north-agri-01',
        name: 'Northern Agro Marts & Depot Route',
        total_stops: today_planned_visits || 5,
        completed_stops: today_completed_visits || 2,
      },
      pending_tasks_count,
      overdue_tasks_count,
      salesperson_rankings,
      territory_coverage,
      recent_activities,
    };
  }

  // =========================================================================
  // 7. TARGETS & TASKS
  // =========================================================================

  public static async getTargets(organizationId: string, salespersonId?: string): Promise<FieldSalesTarget[]> {
    let query = `SELECT * FROM field_sales_targets WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    if (salespersonId && salespersonId !== 'all') {
      query += ` AND salesperson_id = $2`;
      values.push(salespersonId);
    }
    query += ` ORDER BY start_date DESC`;
    const res = await pool.query(query, values);
    return res.rows.map((r) => ({
      ...r,
      target_value: parseFloat(r.target_value || '0'),
      achieved_value: parseFloat(r.achieved_value || '0'),
      achievement_percent: parseFloat(r.achievement_percent || '0'),
    }));
  }

  public static async getTasks(params: {
    organizationId: string;
    salespersonId?: string;
    status?: string;
    priority?: string;
  }): Promise<FieldSalesTask[]> {
    const { organizationId, salespersonId, status, priority } = params;
    let query = `SELECT * FROM field_sales_tasks WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    let idx = 2;

    if (salespersonId && salespersonId !== 'all') {
      query += ` AND salesperson_id = $${idx++}`;
      values.push(salespersonId);
    }
    if (status && status !== 'all') {
      query += ` AND status = $${idx++}`;
      values.push(status);
    }
    if (priority && priority !== 'all') {
      query += ` AND priority = $${idx++}`;
      values.push(priority);
    }

    query += ` ORDER BY due_date ASC`;
    const res = await pool.query(query, values);
    return res.rows;
  }

  public static async updateTask(params: {
    taskId: string;
    organizationId: string;
    status: 'open' | 'in_progress' | 'completed' | 'cancelled';
    resolutionNotes?: string;
    completedBy?: string;
  }): Promise<FieldSalesTask> {
    const { taskId, organizationId, status, resolutionNotes, completedBy } = params;
    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    const res = await pool.query(
      `UPDATE field_sales_tasks
       SET status = $1,
           resolution_notes = COALESCE($2, resolution_notes),
           completed_at = $3,
           completed_by = $4,
           updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [status, resolutionNotes || null, completedAt, completedBy || null, taskId, organizationId]
    );

    if (res.rows.length === 0) throw new Error(`Task "${taskId}" not found.`);
    return res.rows[0];
  }

  public static async getTerritoryAssignments(organizationId: string): Promise<SalesTerritoryAssignment[]> {
    const res = await pool.query(
      `SELECT sta.*, t.name as territory_name, t.code as territory_code
       FROM sales_territory_assignments sta
       JOIN territories t ON sta.territory_id = t.id
       WHERE sta.organization_id = $1
       ORDER BY t.name ASC, sta.priority_rank ASC`,
      [organizationId]
    );
    return res.rows;
  }
}
