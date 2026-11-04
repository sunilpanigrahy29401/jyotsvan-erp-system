import type {
  InventorySummary,
  InventoryBalance,
  InventoryMovement,
  StockReservation,
  StockAdjustment,
  Sku360Profile,
  IntegrityReport,
  StockAdjustmentParams,
  StockTransferParams,
  StockReservationParams,
  OpeningBalanceParams,
} from '../types/inventory';

const BASE_URL = '/api/inventory';

export const inventoryApi = {
  // 1. Get KPI Summary
  async getSummary(orgId = 'org-jyotsvan-corp'): Promise<InventorySummary> {
    const res = await fetch(`${BASE_URL}/summary?organizationId=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch inventory summary');
    }
    const data = await res.json();
    return data.summary;
  },

  // 2. Get Stock Balances
  async getBalances(params: {
    organizationId?: string;
    search?: string;
    skuId?: string;
    warehouseId?: string;
    locationId?: string;
    categoryId?: string;
    stockStatus?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    balances: InventoryBalance[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.organizationId) query.set('organizationId', params.organizationId);
    if (params.search) query.set('search', params.search);
    if (params.skuId) query.set('skuId', params.skuId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.locationId) query.set('locationId', params.locationId);
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.stockStatus) query.set('stockStatus', params.stockStatus);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const res = await fetch(`${BASE_URL}/balances?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch stock balances');
    }
    return res.json();
  },

  // 3. Get SKU 360 Profile
  async getSku360(skuId: string, orgId = 'org-jyotsvan-corp'): Promise<Sku360Profile> {
    const res = await fetch(`${BASE_URL}/sku/${encodeURIComponent(skuId)}?organizationId=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch SKU stock profile');
    }
    const data = await res.json();
    return data.profile;
  },

  // 4. Get Movement Ledger
  async getMovements(params: {
    organizationId?: string;
    skuId?: string;
    warehouseId?: string;
    movementType?: string;
    referenceType?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    movements: InventoryMovement[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.organizationId) query.set('organizationId', params.organizationId);
    if (params.skuId) query.set('skuId', params.skuId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.movementType) query.set('movementType', params.movementType);
    if (params.referenceType) query.set('referenceType', params.referenceType);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/movements?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch stock movements');
    }
    return res.json();
  },

  // 5. Execute Stock Adjustment
  async adjustStock(payload: StockAdjustmentParams): Promise<{
    success: boolean;
    adjustment: StockAdjustment;
    balance: InventoryBalance;
    movement: InventoryMovement;
  }> {
    const res = await fetch(`${BASE_URL}/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to execute stock adjustment');
    }
    return res.json();
  },

  // 6. Get Stock Adjustments History
  async getAdjustments(params: {
    organizationId?: string;
    skuId?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    adjustments: StockAdjustment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.organizationId) query.set('organizationId', params.organizationId);
    if (params.skuId) query.set('skuId', params.skuId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/adjustments?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch adjustments');
    }
    return res.json();
  },

  // 7. Establish Opening Balance
  async setOpeningBalance(payload: OpeningBalanceParams): Promise<{
    success: boolean;
    balance: InventoryBalance;
    movement: InventoryMovement;
  }> {
    const res = await fetch(`${BASE_URL}/opening-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to set opening balance');
    }
    return res.json();
  },

  // 8. Get Stock Reservations
  async getReservations(params: {
    organizationId?: string;
    skuId?: string;
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    reservations: StockReservation[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.organizationId) query.set('organizationId', params.organizationId);
    if (params.skuId) query.set('skuId', params.skuId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/reservations?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch reservations');
    }
    return res.json();
  },

  // 9. Create Stock Reservation
  async reserveStock(payload: StockReservationParams): Promise<{
    success: boolean;
    reservation: StockReservation;
    balance: InventoryBalance;
    movement: InventoryMovement;
  }> {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create reservation');
    }
    return res.json();
  },

  // 10. Release Stock Reservation
  async releaseReservation(
    id: string,
    payload: { organization_id?: string; actor_id?: string; actor_email?: string; reason?: string }
  ): Promise<{
    success: boolean;
    reservation: StockReservation;
    balance: InventoryBalance;
    movement: InventoryMovement;
  }> {
    const res = await fetch(`${BASE_URL}/reservations/${encodeURIComponent(id)}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to release reservation');
    }
    return res.json();
  },

  // 11. Consume Stock Reservation
  async consumeReservation(
    id: string,
    payload: { organization_id?: string; actor_id?: string; actor_email?: string; reason?: string }
  ): Promise<{
    success: boolean;
    reservation: StockReservation;
    balance: InventoryBalance;
    movement: InventoryMovement;
  }> {
    const res = await fetch(`${BASE_URL}/reservations/${encodeURIComponent(id)}/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to consume reservation');
    }
    return res.json();
  },

  // 12. Atomic Inter-Warehouse Transfer
  async transferStock(payload: StockTransferParams): Promise<{
    success: boolean;
    fromBalance: InventoryBalance;
    toBalance: InventoryBalance;
    fromMovement: InventoryMovement;
    toMovement: InventoryMovement;
  }> {
    const res = await fetch(`${BASE_URL}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to execute stock transfer');
    }
    return res.json();
  },

  // 13. Integrity Check
  async runIntegrityCheck(orgId = 'org-jyotsvan-corp'): Promise<IntegrityReport> {
    const res = await fetch(`${BASE_URL}/integrity-check?organizationId=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to run integrity check');
    }
    const data = await res.json();
    return data.report;
  },
};
