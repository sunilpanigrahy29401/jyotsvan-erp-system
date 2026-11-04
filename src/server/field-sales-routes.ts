// src/server/field-sales-routes.ts
// Enterprise Field Sales Execution Layer Express Router (Phase 20)

import { Router, Request, Response } from 'express';
import { FieldSalesService } from './field-sales-service.ts';
import { pool } from './db.ts';

export const fieldSalesRouter = Router();

// Helper to resolve user context from headers or session
function resolveUser(req: Request) {
  const orgId = (req.headers['x-organization-id'] as string) || 'org-jyotsvan-corp';
  const userId = (req.headers['x-user-id'] as string) || 'usr-fieldsales';
  const userEmail = (req.headers['x-user-email'] as string) || 'field.sales@jyotsvan.enterprise';
  return { orgId, userId, userEmail };
}

// 1. Dashboard Metrics
fieldSalesRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = resolveUser(req);
    const salespersonId = (req.query.salespersonId as string) || undefined;
    const metrics = await FieldSalesService.getDashboardMetrics(orgId, salespersonId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    console.error('[Field Sales API] Dashboard metrics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

fieldSalesRouter.get('/dashboard/metrics', async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = resolveUser(req);
    const salespersonId = (req.query.salespersonId as string) || undefined;
    const metrics = await FieldSalesService.getDashboardMetrics(orgId, salespersonId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    console.error('[Field Sales API] Dashboard metrics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Visits List
fieldSalesRouter.get('/visits', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const {
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
      limit,
      pageSize,
      offset,
    } = req.query;

    const limitVal = limit || pageSize;

    const result = await FieldSalesService.getVisits({
      organizationId: orgId,
      salespersonId: salespersonId as string,
      customerType: customerType as any,
      customerId: customerId as string,
      status: status as string,
      routeId: routeId as string,
      territoryId: territoryId as string,
      date: date as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string,
      limit: limitVal ? parseInt(limitVal as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({
      success: true,
      data: { visits: result.visits, total: result.total },
      visits: result.visits,
      total: result.total,
    });
  } catch (err: any) {
    console.error('[Field Sales API] Get visits error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Visit Details
fieldSalesRouter.get('/visits/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const visit = await FieldSalesService.getVisitById(req.params.id, orgId);
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found.' });
    }
    res.json({ success: true, data: visit });
  } catch (err: any) {
    console.error('[Field Sales API] Get visit error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Create Planned Visit
fieldSalesRouter.post('/visits', async (req: Request, res: Response) => {
  try {
    const { orgId, userId, userEmail } = resolveUser(req);
    const {
      salespersonId,
      salespersonName,
      customerType,
      customerId,
      plannedDate,
      visitPurpose,
      routeId,
      territoryId,
      notes,
    } = req.body;

    if (!customerType || !customerId || !plannedDate || !visitPurpose) {
      return res.status(400).json({
        success: false,
        error: 'customerType, customerId, plannedDate, and visitPurpose are required.',
      });
    }

    const visit = await FieldSalesService.createVisit(
      {
        organizationId: orgId,
        salespersonId: salespersonId || userId,
        salespersonName: salespersonName || 'Vikram Sharma',
        customerType,
        customerId,
        plannedDate,
        visitPurpose,
        routeId,
        territoryId,
        notes,
      },
      userEmail,
      userId
    );

    res.status(201).json({ success: true, data: visit });
  } catch (err: any) {
    console.error('[Field Sales API] Create visit error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Check-In to Visit
fieldSalesRouter.post('/visits/:id/check-in', async (req: Request, res: Response) => {
  try {
    const { orgId, userId, userEmail } = resolveUser(req);
    const { latitude, longitude, accuracy, notes } = req.body;

    const visit = await FieldSalesService.checkIn(
      {
        visitId: req.params.id,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
        notes,
      },
      orgId,
      userEmail,
      userId
    );

    res.json({ success: true, data: visit, message: 'Check-in recorded successfully.' });
  } catch (err: any) {
    console.error('[Field Sales API] Check-in error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Check-Out of Visit
fieldSalesRouter.post('/visits/:id/check-out', async (req: Request, res: Response) => {
  try {
    const { orgId, userId, userEmail } = resolveUser(req);
    const {
      outcome,
      notes,
      competitorInfo,
      requestedProducts,
      nextFollowUpDate,
      latitude,
      longitude,
      createdOrderId,
      createdCollectionId,
    } = req.body;

    if (!outcome) {
      return res.status(400).json({ success: false, error: 'Visit outcome is required to complete check-out.' });
    }

    const visit = await FieldSalesService.checkOut(
      {
        visitId: req.params.id,
        outcome,
        notes,
        competitorInfo,
        requestedProducts,
        nextFollowUpDate,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        createdOrderId,
        createdCollectionId,
      },
      orgId,
      userEmail,
      userId
    );

    res.json({ success: true, data: visit, message: 'Check-out completed successfully.' });
  } catch (err: any) {
    console.error('[Field Sales API] Check-out error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Update Visit Status (Skip, Cancel, Reschedule)
fieldSalesRouter.patch('/visits/:id/status', async (req: Request, res: Response) => {
  try {
    const { orgId, userId, userEmail } = resolveUser(req);
    const { status, reason, rescheduledDate } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required.' });
    }

    const visit = await FieldSalesService.updateVisitStatus({
      visitId: req.params.id,
      organizationId: orgId,
      status,
      reason,
      rescheduledDate,
      actorEmail: userEmail,
      actorId: userId,
    });

    res.json({ success: true, data: visit, message: `Visit marked as ${status}.` });
  } catch (err: any) {
    console.error('[Field Sales API] Update visit status error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Routes List
fieldSalesRouter.get('/routes', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const { territoryId, salespersonId, status } = req.query;

    const routes = await FieldSalesService.getRoutes({
      organizationId: orgId,
      territoryId: territoryId as string,
      salespersonId: salespersonId as string,
      status: status as string,
    });

    res.json({ success: true, data: routes });
  } catch (err: any) {
    console.error('[Field Sales API] Get routes error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Route Details
fieldSalesRouter.get('/routes/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const route = await FieldSalesService.getRouteById(req.params.id, orgId);
    if (!route) {
      return res.status(404).json({ success: false, error: 'Route not found.' });
    }
    res.json({ success: true, data: route });
  } catch (err: any) {
    console.error('[Field Sales API] Get route details error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Create Route
fieldSalesRouter.post('/routes', async (req: Request, res: Response) => {
  try {
    const { orgId, userId, userEmail } = resolveUser(req);
    const {
      routeCode,
      name,
      description,
      territoryId,
      salespersonId,
      salespersonName,
      frequency,
      daysOfWeek,
      stops,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Route name is required.' });
    }

    const route = await FieldSalesService.createRoute(
      {
        organizationId: orgId,
        routeCode,
        name,
        description,
        territoryId,
        salespersonId: salespersonId || userId,
        salespersonName: salespersonName || 'Vikram Sharma',
        frequency,
        daysOfWeek: daysOfWeek || ['monday'],
        stops: stops || [],
      },
      userEmail,
      userId
    );

    res.status(201).json({ success: true, data: route });
  } catch (err: any) {
    console.error('[Field Sales API] Create route error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 11. Customer Quick View
fieldSalesRouter.get('/customers/:type/:id/quick-view', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const { type, id } = req.params;

    if (type !== 'distributor' && type !== 'retailer') {
      return res.status(400).json({ success: false, error: 'Invalid customer type. Must be distributor or retailer.' });
    }

    const snapshot = await FieldSalesService.getCustomerQuickView(type, id, orgId);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    res.json({ success: true, data: snapshot });
  } catch (err: any) {
    console.error('[Field Sales API] Quick view error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. List All Available Customers (Retailers & Distributors combined)
fieldSalesRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const { territoryId, type, search } = req.query;

    const customers: any[] = [];

    // 1. Fetch Distributors if requested or all
    if (!type || type === 'all' || type === 'distributor') {
      let dQuery = `
        SELECT d.id, d.distributor_code as code, d.display_name as name, d.phone, d.city, d.state,
               d.territory_id, t.name as territory_name, 'distributor' as customer_type,
               COALESCE(d.credit_limit, 500000) as credit_limit, d.credit_hold
        FROM distributors d
        LEFT JOIN territories t ON d.territory_id = t.id
        WHERE d.organization_id = $1 AND d.status = 'active'
      `;
      const dParams: any[] = [orgId];
      if (territoryId && territoryId !== 'all') {
        dQuery += ` AND d.territory_id = $2`;
        dParams.push(territoryId);
      }
      const dRes = await pool.query(dQuery, dParams);
      customers.push(...dRes.rows);
    }

    // 2. Fetch Retailers if requested or all
    if (!type || type === 'all' || type === 'retailer') {
      let rQuery = `
        SELECT r.id, r.retailer_code as code, COALESCE(r.store_name, r.owner_name) as name,
               r.phone, r.city, r.state, r.territory_id, t.name as territory_name, 'retailer' as customer_type,
               COALESCE(r.credit_limit, 150000) as credit_limit, r.credit_hold,
               r.assigned_salesperson_id, r.assigned_salesperson_name
        FROM retailers r
        LEFT JOIN territories t ON r.territory_id = t.id
        WHERE r.organization_id = $1 AND r.status = 'active'
      `;
      const rParams: any[] = [orgId];
      if (territoryId && territoryId !== 'all') {
        rQuery += ` AND r.territory_id = $2`;
        rParams.push(territoryId);
      }
      const rRes = await pool.query(rQuery, rParams);
      customers.push(...rRes.rows);
    }

    // Filter by search if given
    let filtered = customers;
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      filtered = customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(s) ||
          c.code?.toLowerCase().includes(s) ||
          c.city?.toLowerCase().includes(s) ||
          c.territory_name?.toLowerCase().includes(s)
      );
    }

    res.json({ success: true, data: filtered, total: filtered.length });
  } catch (err: any) {
    console.error('[Field Sales API] Get customers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Book Sales Order From Visit
fieldSalesRouter.post('/visits/:id/order', async (req: Request, res: Response) => {
  try {
    const { orgId, userId, userEmail } = resolveUser(req);
    const { customerType, customerId, distributorId, warehouseId, items, notes } = req.body;

    if (!customerType || !customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'customerType, customerId, and items array with skuId/quantity are required.',
      });
    }

    const result = await FieldSalesService.bookOrderFromVisit({
      visitId: req.params.id,
      organizationId: orgId,
      customerType,
      customerId,
      distributorId,
      warehouseId,
      items,
      notes,
      actorEmail: userEmail,
      actorId: userId,
    });

    res.status(201).json({
      success: true,
      data: result.salesOrder,
      message: `Sales Order ${result.salesOrder.order_number} created and attached to visit.`,
    });
  } catch (err: any) {
    console.error('[Field Sales API] Book order error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 14. Record Payment Collection From Visit
fieldSalesRouter.post('/visits/:id/collection', async (req: Request, res: Response) => {
  try {
    const { orgId, userId, userEmail } = resolveUser(req);
    const {
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
    } = req.body;

    if (!customerType || !customerId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'customerType, customerId, and positive amount are required.',
      });
    }

    const result = await FieldSalesService.recordCollectionFromVisit({
      visitId: req.params.id,
      organizationId: orgId,
      customerType,
      customerId,
      amount: parseFloat(amount),
      paymentMethodCode: paymentMethodCode || 'cash',
      paymentMethodName: paymentMethodName || 'Cash Collection',
      referenceNumber,
      chequeNumber,
      chequeDate,
      bankName,
      notes,
      actorEmail: userEmail,
      actorId: userId,
    });

    res.status(201).json({
      success: true,
      data: result.payment,
      receiptNumber: result.receiptNumber,
      message: `Payment collection ${result.receiptNumber} recorded and allocated.`,
    });
  } catch (err: any) {
    console.error('[Field Sales API] Record collection error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 15. Targets List
fieldSalesRouter.get('/targets', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const salespersonId = (req.query.salespersonId as string) || undefined;
    const targets = await FieldSalesService.getTargets(orgId, salespersonId);
    res.json({ success: true, data: targets });
  } catch (err: any) {
    console.error('[Field Sales API] Get targets error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Tasks List
fieldSalesRouter.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const { salespersonId, status, priority } = req.query;
    const tasks = await FieldSalesService.getTasks({
      organizationId: orgId,
      salespersonId: salespersonId as string,
      status: status as string,
      priority: priority as string,
    });
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    console.error('[Field Sales API] Get tasks error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Update Task
fieldSalesRouter.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = resolveUser(req);
    const { status, resolutionNotes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required.' });
    }

    const task = await FieldSalesService.updateTask({
      taskId: req.params.id,
      organizationId: orgId,
      status,
      resolutionNotes,
      completedBy: userId,
    });

    res.json({ success: true, data: task, message: 'Task updated successfully.' });
  } catch (err: any) {
    console.error('[Field Sales API] Update task error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 18. Create Task
fieldSalesRouter.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = resolveUser(req);
    const {
      visitId,
      salespersonId,
      salespersonName,
      customerType,
      customerId,
      customerName,
      taskType,
      title,
      description,
      priority,
      dueDate,
    } = req.body;

    if (!title || !customerType || !customerId || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'title, customerType, customerId, and dueDate are required.',
      });
    }

    const taskId = 'tsk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const resInsert = await pool.query(
      `INSERT INTO field_sales_tasks (
        id, organization_id, visit_id, salesperson_id, salesperson_name,
        customer_type, customer_id, customer_name, task_type, title, description,
        priority, due_date, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'open', NOW(), NOW())
      RETURNING *`,
      [
        taskId,
        orgId,
        visitId || null,
        salespersonId || userId,
        salespersonName || 'Vikram Sharma',
        customerType,
        customerId,
        customerName || 'Customer',
        taskType || 'follow_up',
        title,
        description || null,
        priority || 'medium',
        new Date(dueDate).toISOString(),
      ]
    );

    res.status(201).json({ success: true, data: resInsert.rows[0] });
  } catch (err: any) {
    console.error('[Field Sales API] Create task error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 19. Territory Assignments
fieldSalesRouter.get('/territory-assignments', async (req: Request, res: Response) => {
  try {
    const { orgId } = resolveUser(req);
    const assignments = await FieldSalesService.getTerritoryAssignments(orgId);
    res.json({ success: true, data: assignments });
  } catch (err: any) {
    console.error('[Field Sales API] Get territory assignments error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
