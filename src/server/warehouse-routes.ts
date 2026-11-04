import { Router, Request, Response } from 'express';
import { WarehouseService } from './warehouse-service.ts';

export const warehouseRouter = Router();
export const transferRouter = Router();
export const countRouter = Router();

// Middleware to extract tenant orgId and user
function getOrgAndActor(req: Request) {
  const orgId = (req.query.organization_id as string) || (req.body?.organization_id as string) || 'org-jyotsvan-corp';
  const actorId = (req.headers['x-user-id'] as string) || (req.body?.actorId as string) || 'usr-owner-sunil';
  const actorEmail = (req.headers['x-user-email'] as string) || (req.body?.actorEmail as string) || 'sunilpanigrahy29401@gmail.com';
  return { orgId, actorId, actorEmail };
}

// ==========================================
// 1. WAREHOUSE MASTER ROUTES
// ==========================================

warehouseRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const summary = await WarehouseService.getSummaryMetrics(orgId);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    console.error('[GET /api/warehouses/summary]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch warehouse metrics.' });
  }
});

warehouseRouter.get('/metrics/summary', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const summary = await WarehouseService.getSummaryMetrics(orgId);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    console.error('[GET /api/warehouses/metrics/summary]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch warehouse metrics.' });
  }
});

warehouseRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const {
      search,
      type,
      status,
      city,
      state,
      page = '1',
      limit = '50',
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const result = await WarehouseService.getWarehouses({
      orgId,
      search: search as string,
      type: type as string,
      status: status as string,
      city: city as string,
      state: state as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: (sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc',
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[GET /api/warehouses]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch warehouses.' });
  }
});

warehouseRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const warehouse = await WarehouseService.getWarehouseById(req.params.id, orgId);
    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found.' });
    }
    res.json({ success: true, data: warehouse });
  } catch (err: any) {
    console.error('[GET /api/warehouses/:id]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch warehouse.' });
  }
});

warehouseRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const warehouse = await WarehouseService.createWarehouse({
      orgId,
      branchId: req.body.branch_id || req.body.branchId,
      code: req.body.code,
      name: req.body.name,
      warehouseType: req.body.warehouse_type || req.body.warehouseType,
      address: req.body.address,
      addressLine1: req.body.address_line1 || req.body.addressLine1,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postal_code || req.body.postalCode,
      country: req.body.country,
      contactName: req.body.contact_name || req.body.contactName,
      contactPhone: req.body.contact_phone || req.body.contactPhone,
      contactEmail: req.body.contact_email || req.body.contactEmail,
      capacityCubicMeters: req.body.capacity_cubic_meters || req.body.capacityCubicMeters,
      capacitySqFt: req.body.capacity_sq_ft || req.body.capacitySqFt,
      notes: req.body.notes,
      actorId,
      actorEmail,
    });

    res.status(201).json({ success: true, data: warehouse, message: `Warehouse "${warehouse.name}" (${warehouse.code}) registered successfully.` });
  } catch (err: any) {
    console.error('[POST /api/warehouses]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create warehouse.' });
  }
});

warehouseRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const warehouse = await WarehouseService.updateWarehouse(req.params.id, orgId, {
      branchId: req.body.branch_id || req.body.branchId,
      name: req.body.name,
      warehouseType: req.body.warehouse_type || req.body.warehouseType,
      address: req.body.address,
      addressLine1: req.body.address_line1 || req.body.addressLine1,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postal_code || req.body.postalCode,
      country: req.body.country,
      contactName: req.body.contact_name || req.body.contactName,
      contactPhone: req.body.contact_phone || req.body.contactPhone,
      contactEmail: req.body.contact_email || req.body.contactEmail,
      capacityCubicMeters: req.body.capacity_cubic_meters || req.body.capacityCubicMeters,
      capacitySqFt: req.body.capacity_sq_ft || req.body.capacitySqFt,
      notes: req.body.notes,
      status: req.body.status,
      actorId,
      actorEmail,
    });

    res.json({ success: true, data: warehouse, message: 'Warehouse updated successfully.' });
  } catch (err: any) {
    console.error('[PUT /api/warehouses/:id]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to update warehouse.' });
  }
});

warehouseRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status is required.' });

    const warehouse = await WarehouseService.changeWarehouseStatus(req.params.id, orgId, status, actorId, actorEmail);
    res.json({ success: true, data: warehouse, message: `Warehouse status changed to ${status}.` });
  } catch (err: any) {
    console.error('[PATCH /api/warehouses/:id/status]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to change warehouse status.' });
  }
});

// ==========================================
// 2. WAREHOUSE LOCATIONS & TREE
// ==========================================

warehouseRouter.get('/:id/locations', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const { parent_id, type, status } = req.query;

    const locations = await WarehouseService.getLocations({
      orgId,
      warehouseId: req.params.id,
      parentId: parent_id === undefined ? undefined : parent_id === 'null' ? null : (parent_id as string),
      type: type as string,
      status: status as string,
    });

    res.json({ success: true, data: locations });
  } catch (err: any) {
    console.error('[GET /api/warehouses/:id/locations]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch warehouse locations.' });
  }
});

warehouseRouter.get('/:id/locations/tree', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const tree = await WarehouseService.getLocationTree(req.params.id, orgId);
    res.json({ success: true, data: tree });
  } catch (err: any) {
    console.error('[GET /api/warehouses/:id/locations/tree]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch location hierarchy tree.' });
  }
});

warehouseRouter.post('/:id/locations', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const location = await WarehouseService.createLocation({
      orgId,
      warehouseId: req.params.id,
      parentLocationId: req.body.parent_location_id || req.body.parentLocationId,
      code: req.body.code,
      name: req.body.name,
      description: req.body.description,
      locationType: req.body.location_type || req.body.locationType || 'storage',
      zoneCode: req.body.zone_code || req.body.zoneCode,
      aisleCode: req.body.aisle_code || req.body.aisleCode,
      rackCode: req.body.rack_code || req.body.rackCode,
      shelfCode: req.body.shelf_code || req.body.shelfCode,
      binCode: req.body.bin_code || req.body.binCode,
      capacityQuantity: req.body.capacity_quantity || req.body.capacityQuantity,
      capacityUnit: req.body.capacity_unit || req.body.capacityUnit,
      capacityWeight: req.body.capacity_weight || req.body.capacityWeight,
      capacityVolume: req.body.capacity_volume || req.body.capacityVolume,
      utilizationThreshold: req.body.utilization_threshold || req.body.utilizationThreshold,
      notes: req.body.notes,
      actorId,
      actorEmail,
    });

    res.status(201).json({ success: true, data: location, message: `Location "${location.name}" (${location.code}) created successfully.` });
  } catch (err: any) {
    console.error('[POST /api/warehouses/:id/locations]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create location.' });
  }
});

warehouseRouter.put('/:id/locations/:locationId', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const location = await WarehouseService.updateLocation(req.params.locationId, orgId, {
      parentLocationId: req.body.parent_location_id || req.body.parentLocationId,
      name: req.body.name,
      description: req.body.description,
      locationType: req.body.location_type || req.body.locationType,
      zoneCode: req.body.zone_code || req.body.zoneCode,
      aisleCode: req.body.aisle_code || req.body.aisleCode,
      rackCode: req.body.rack_code || req.body.rackCode,
      shelfCode: req.body.shelf_code || req.body.shelfCode,
      binCode: req.body.bin_code || req.body.binCode,
      capacityQuantity: req.body.capacity_quantity || req.body.capacityQuantity,
      capacityUnit: req.body.capacity_unit || req.body.capacityUnit,
      capacityWeight: req.body.capacity_weight || req.body.capacityWeight,
      capacityVolume: req.body.capacity_volume || req.body.capacityVolume,
      utilizationThreshold: req.body.utilization_threshold || req.body.utilizationThreshold,
      notes: req.body.notes,
      status: req.body.status,
      actorId,
      actorEmail,
    });

    res.json({ success: true, data: location, message: 'Location updated successfully.' });
  } catch (err: any) {
    console.error('[PUT /api/warehouses/:id/locations/:locationId]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to update location.' });
  }
});

warehouseRouter.patch('/:id/locations/:locationId/deactivate', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const location = await WarehouseService.deactivateLocation(req.params.locationId, orgId, actorId, actorEmail);
    res.json({ success: true, data: location, message: 'Location deactivated successfully.' });
  } catch (err: any) {
    console.error('[PATCH /api/warehouses/:id/locations/:locationId/deactivate]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to deactivate location.' });
  }
});

// ==========================================
// 3. WAREHOUSE STAFF ASSIGNMENTS
// ==========================================

warehouseRouter.get('/:id/staff', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const staff = await WarehouseService.getWarehouseAssignments(req.params.id, orgId);
    res.json({ success: true, data: staff });
  } catch (err: any) {
    console.error('[GET /api/warehouses/:id/staff]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch warehouse staff.' });
  }
});

warehouseRouter.post('/:id/staff', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const assignment = await WarehouseService.assignUserToWarehouse({
      orgId,
      warehouseId: req.params.id,
      userId: req.body.user_id || req.body.userId,
      roleType: req.body.role_type || req.body.roleType || 'operator',
      assignedBy: actorId,
      actorEmail,
    });

    res.status(201).json({ success: true, data: assignment, message: 'Staff member assigned to warehouse.' });
  } catch (err: any) {
    console.error('[POST /api/warehouses/:id/staff]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to assign staff.' });
  }
});

warehouseRouter.delete('/:id/staff/:assignmentId', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const success = await WarehouseService.removeUserFromWarehouse(req.params.assignmentId, orgId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Assignment not found.' });
    }
    res.json({ success: true, message: 'Staff assignment removed.' });
  } catch (err: any) {
    console.error('[DELETE /api/warehouses/:id/staff/:assignmentId]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to remove staff assignment.' });
  }
});

// ==========================================
// 4. INTERNAL TRANSFERS & STO ROUTER
// ==========================================

transferRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const {
      search,
      source_warehouse_id,
      destination_warehouse_id,
      status,
      priority,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await WarehouseService.getTransfers({
      orgId,
      search: search as string,
      sourceWarehouseId: source_warehouse_id as string,
      destWarehouseId: destination_warehouse_id as string,
      status: status as string,
      priority: priority as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[GET /api/warehouse-transfers]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch transfers.' });
  }
});

transferRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const transfer = await WarehouseService.getTransferById(req.params.id, orgId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found.' });
    }
    res.json({ success: true, data: transfer });
  } catch (err: any) {
    console.error('[GET /api/warehouse-transfers/:id]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch transfer.' });
  }
});

transferRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const transfer = await WarehouseService.createTransfer({
      orgId,
      sourceWarehouseId: req.body.source_warehouse_id || req.body.sourceWarehouseId,
      destinationWarehouseId: req.body.destination_warehouse_id || req.body.destinationWarehouseId,
      sourceLocationId: req.body.source_location_id || req.body.sourceLocationId,
      destinationLocationId: req.body.destination_location_id || req.body.destinationLocationId,
      priority: req.body.priority || 'medium',
      notes: req.body.notes,
      items: (req.body.items || []).map((i: any) => ({
        skuId: i.sku_id || i.skuId,
        quantity: parseFloat(i.quantity),
        sourceLocationId: i.source_location_id || i.sourceLocationId,
        destinationLocationId: i.destination_location_id || i.destinationLocationId,
        notes: i.notes,
      })),
      actorId,
      actorEmail,
    });

    res.status(201).json({ success: true, data: transfer, message: `Transfer Order ${transfer.transfer_number} initiated successfully.` });
  } catch (err: any) {
    console.error('[POST /api/warehouse-transfers]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create transfer.' });
  }
});

transferRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const transfer = await WarehouseService.approveTransfer(req.params.id, orgId, actorId, actorEmail);
    res.json({ success: true, data: transfer, message: `Transfer Order ${transfer.transfer_number} approved.` });
  } catch (err: any) {
    console.error('[POST /api/warehouse-transfers/:id/approve]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to approve transfer.' });
  }
});

transferRouter.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const transfer = await WarehouseService.dispatchTransfer(req.params.id, orgId, actorId, actorEmail);
    res.json({
      success: true,
      data: transfer,
      message: `Transfer Order ${transfer.transfer_number} dispatched. Source stock decremented & ledger logged.`,
    });
  } catch (err: any) {
    console.error('[POST /api/warehouse-transfers/:id/dispatch]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to dispatch transfer.' });
  }
});

transferRouter.post('/:id/receive', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const transfer = await WarehouseService.receiveTransfer(req.params.id, orgId, actorId, actorEmail);
    res.json({
      success: true,
      data: transfer,
      message: `Transfer Order ${transfer.transfer_number} received & completed. Destination inventory incremented.`,
    });
  } catch (err: any) {
    console.error('[POST /api/warehouse-transfers/:id/receive]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to receive transfer.' });
  }
});

transferRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const { reason } = req.body;
    const transfer = await WarehouseService.cancelTransfer(req.params.id, orgId, reason, actorId, actorEmail);
    res.json({ success: true, data: transfer, message: `Transfer Order ${transfer.transfer_number} cancelled.` });
  } catch (err: any) {
    console.error('[POST /api/warehouse-transfers/:id/cancel]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to cancel transfer.' });
  }
});

// ==========================================
// 5. STOCK VERIFICATION & CYCLE COUNTS ROUTER
// ==========================================

countRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const { warehouse_id, status, page = '1', limit = '50' } = req.query;

    const result = await WarehouseService.getCountSessions({
      orgId,
      warehouseId: warehouse_id as string,
      status: status as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[GET /api/warehouse-counts]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch count sessions.' });
  }
});

countRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgAndActor(req);
    const session = await WarehouseService.getCountSessionById(req.params.id, orgId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Count session not found.' });
    }
    res.json({ success: true, data: session });
  } catch (err: any) {
    console.error('[GET /api/warehouse-counts/:id]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch count session.' });
  }
});

countRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const session = await WarehouseService.createCountSession({
      orgId,
      warehouseId: req.body.warehouse_id || req.body.warehouseId,
      locationId: req.body.location_id || req.body.locationId,
      countType: req.body.count_type || req.body.countType || 'full_warehouse',
      skuIds: req.body.sku_ids || req.body.skuIds,
      notes: req.body.notes,
      actorId,
      actorEmail,
    });

    res.status(201).json({
      success: true,
      data: session,
      message: `Stock Verification Audit ${session.count_number} initialized with ${session.total_items_count} SKU snapshots.`,
    });
  } catch (err: any) {
    console.error('[POST /api/warehouse-counts]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create count session.' });
  }
});

countRouter.put('/:id/items', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const items = (req.body.items || []).map((i: any) => ({
      id: i.id,
      countedQuantity: parseFloat(i.counted_quantity !== undefined ? i.counted_quantity : i.countedQuantity),
      notes: i.notes,
    }));

    const session = await WarehouseService.submitCountItems(req.params.id, orgId, items, actorId, actorEmail);
    res.json({
      success: true,
      data: session,
      message: `Physical count recorded for ${items.length} items. Discrepancies detected: ${session.discrepancy_items_count}.`,
    });
  } catch (err: any) {
    console.error('[PUT /api/warehouse-counts/:id/items]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to submit count items.' });
  }
});

countRouter.post('/:id/reconcile', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgAndActor(req);
    const session = await WarehouseService.reconcileCountSession(req.params.id, orgId, actorId, actorEmail);
    res.json({
      success: true,
      data: session,
      message: `Stock Verification Audit ${session.count_number} reconciled. Authoritative Inventory Engine adjustments generated.`,
    });
  } catch (err: any) {
    console.error('[POST /api/warehouse-counts/:id/reconcile]', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to reconcile count session.' });
  }
});
