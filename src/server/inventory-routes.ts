import { Router, Request, Response } from 'express';
import { InventoryService } from './inventory-service.ts';

export const inventoryRouter = Router();

// 1. GET /api/inventory/summary - Executive KPI metrics
inventoryRouter.get('/summary', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  try {
    const summary = await InventoryService.getSummary(orgId);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch inventory summary' });
  }
});

// 2. GET /api/inventory/balances - List/filter stock balances
inventoryRouter.get('/balances', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const search = req.query.search as string;
  const skuId = req.query.skuId as string;
  const warehouseId = req.query.warehouseId as string;
  const locationId = req.query.locationId as string;
  const categoryId = req.query.categoryId as string;
  const stockStatus = req.query.stockStatus as string;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const sortBy = req.query.sortBy as string;
  const sortOrder = req.query.sortOrder as 'asc' | 'desc';

  try {
    const result = await InventoryService.getBalances({
      orgId,
      search,
      skuId,
      warehouseId,
      locationId,
      categoryId,
      stockStatus,
      page,
      limit,
      sortBy,
      sortOrder,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch stock balances' });
  }
});

// 3. GET /api/inventory/balances/:id - Single balance details
inventoryRouter.get('/balances/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';

  try {
    const balance = await InventoryService.getBalanceById(id, orgId);
    if (!balance) {
      return res.status(404).json({ error: 'Stock balance record not found' });
    }
    res.json({ balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch balance details' });
  }
});

// 4. GET /api/inventory/sku/:skuId - 360-degree SKU stock profile
inventoryRouter.get('/sku/:skuId', async (req: Request, res: Response) => {
  const { skuId } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';

  try {
    const profile = await InventoryService.getSku360Profile(skuId, orgId);
    if (!profile) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    res.json({ profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch SKU stock profile' });
  }
});

// 5. GET /api/inventory/movements - Immutable stock movement ledger
inventoryRouter.get('/movements', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const skuId = req.query.skuId as string;
  const warehouseId = req.query.warehouseId as string;
  const movementType = req.query.movementType as string;
  const referenceType = req.query.referenceType as string;
  const search = req.query.search as string;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  try {
    const result = await InventoryService.getMovements({
      orgId,
      skuId,
      warehouseId,
      movementType,
      referenceType,
      search,
      page,
      limit,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch stock movements' });
  }
});

// 6. POST /api/inventory/adjustments - Execute stock adjustment
inventoryRouter.post('/adjustments', async (req: Request, res: Response) => {
  const {
    organization_id,
    sku_id,
    warehouse_id,
    location_id,
    batch_id,
    stock_type,
    direction,
    quantity,
    reason,
    notes,
    idempotency_key,
    actor_id,
    actor_email,
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorEmail = actor_email || 'admin@jyotsvan.enterprise';

  if (!sku_id) return res.status(400).json({ error: 'SKU ID is required' });
  if (!warehouse_id) return res.status(400).json({ error: 'Warehouse ID is required' });
  if (!direction || !['increase', 'decrease'].includes(direction)) {
    return res.status(400).json({ error: 'Direction must be "increase" or "decrease"' });
  }
  if (!quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Adjustment quantity must be greater than zero' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Adjustment reason is required' });
  }

  try {
    const result = await InventoryService.adjustStock({
      organizationId: orgId,
      skuId: sku_id,
      warehouseId: warehouse_id,
      locationId: location_id || null,
      batchId: batch_id || null,
      stockType: stock_type || 'available',
      direction,
      quantity: Number(quantity),
      reason: reason.trim(),
      notes: notes || null,
      idempotencyKey: idempotency_key || null,
      actorId: actor_id || null,
      actorEmail,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to execute stock adjustment' });
  }
});

// 7. GET /api/inventory/adjustments - List adjustments history
inventoryRouter.get('/adjustments', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const skuId = req.query.skuId as string;
  const warehouseId = req.query.warehouseId as string;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  try {
    const result = await InventoryService.getAdjustments({
      orgId,
      skuId,
      warehouseId,
      page,
      limit,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch adjustments' });
  }
});

// 8. POST /api/inventory/opening-balance - Setup opening balance
inventoryRouter.post('/opening-balance', async (req: Request, res: Response) => {
  const {
    organization_id,
    sku_id,
    warehouse_id,
    location_id,
    quantity,
    notes,
    actor_id,
    actor_email,
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorEmail = actor_email || 'admin@jyotsvan.enterprise';

  if (!sku_id) return res.status(400).json({ error: 'SKU ID is required' });
  if (!warehouse_id) return res.status(400).json({ error: 'Warehouse ID is required' });
  if (quantity === undefined || Number(quantity) < 0) {
    return res.status(400).json({ error: 'Quantity must be zero or greater' });
  }

  try {
    const result = await InventoryService.setOpeningBalance({
      organizationId: orgId,
      skuId: sku_id,
      warehouseId: warehouse_id,
      locationId: location_id || null,
      quantity: Number(quantity),
      notes: notes || null,
      actorId: actor_id || null,
      actorEmail,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to set opening balance' });
  }
});

// 9. GET /api/inventory/reservations - List stock reservations
inventoryRouter.get('/reservations', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const skuId = req.query.skuId as string;
  const warehouseId = req.query.warehouseId as string;
  const status = req.query.status as string;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  try {
    const result = await InventoryService.getReservations({
      orgId,
      skuId,
      warehouseId,
      status,
      page,
      limit,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reservations' });
  }
});

// 10. POST /api/inventory/reservations - Create reservation
inventoryRouter.post('/reservations', async (req: Request, res: Response) => {
  const {
    organization_id,
    sku_id,
    warehouse_id,
    location_id,
    quantity,
    reference_type,
    reference_id,
    notes,
    expires_at,
    actor_id,
    actor_email,
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorEmail = actor_email || 'admin@jyotsvan.enterprise';

  if (!sku_id) return res.status(400).json({ error: 'SKU ID is required' });
  if (!warehouse_id) return res.status(400).json({ error: 'Warehouse ID is required' });
  if (!quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Reservation quantity must be greater than zero' });
  }

  try {
    const result = await InventoryService.reserveStock({
      organizationId: orgId,
      skuId: sku_id,
      warehouseId: warehouse_id,
      locationId: location_id || null,
      quantity: Number(quantity),
      referenceType: reference_type || 'manual_hold',
      referenceId: reference_id || null,
      notes: notes || null,
      expiresAt: expires_at || undefined,
      actorId: actor_id || null,
      actorEmail,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reserve stock' });
  }
});

// 11. POST /api/inventory/reservations/:id/release - Release reservation
inventoryRouter.post('/reservations/:id/release', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organization_id, actor_id, actor_email, reason } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorEmail = actor_email || 'admin@jyotsvan.enterprise';

  try {
    const result = await InventoryService.releaseReservation(
      id,
      orgId,
      actor_id || null,
      actorEmail,
      reason
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to release reservation' });
  }
});

// 12. POST /api/inventory/reservations/:id/consume - Consume reservation
inventoryRouter.post('/reservations/:id/consume', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organization_id, actor_id, actor_email, reason } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorEmail = actor_email || 'admin@jyotsvan.enterprise';

  try {
    const result = await InventoryService.consumeReservation(
      id,
      orgId,
      actor_id || null,
      actorEmail,
      reason
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to consume reservation' });
  }
});

// 13. POST /api/inventory/transfer - Atomic Multi-Warehouse Stock Transfer
inventoryRouter.post('/transfer', async (req: Request, res: Response) => {
  const {
    organization_id,
    sku_id,
    from_warehouse_id,
    from_location_id,
    to_warehouse_id,
    to_location_id,
    quantity,
    reason,
    notes,
    actor_id,
    actor_email,
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorEmail = actor_email || 'admin@jyotsvan.enterprise';

  if (!sku_id) return res.status(400).json({ error: 'SKU ID is required' });
  if (!from_warehouse_id) return res.status(400).json({ error: 'Source warehouse ID is required' });
  if (!to_warehouse_id) return res.status(400).json({ error: 'Destination warehouse ID is required' });
  if (!quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Transfer quantity must be greater than zero' });
  }

  try {
    const result = await InventoryService.transferStock({
      organizationId: orgId,
      skuId: sku_id,
      fromWarehouseId: from_warehouse_id,
      fromLocationId: from_location_id || null,
      toWarehouseId: to_warehouse_id,
      toLocationId: to_location_id || null,
      quantity: Number(quantity),
      reason: reason || null,
      notes: notes || null,
      actorId: actor_id || null,
      actorEmail,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to transfer stock' });
  }
});

// 14. GET /api/inventory/integrity-check - Run diagnostic reconciliation engine
inventoryRouter.get('/integrity-check', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  try {
    const report = await InventoryService.runIntegrityCheck(orgId);
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to run integrity diagnostic' });
  }
});
