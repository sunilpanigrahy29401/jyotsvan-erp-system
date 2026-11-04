/**
 * Inventory Engine Types & Interfaces
 * Phase 8 - Jyotsvan Enterprise Platform
 */

export type StockType = 'available' | 'reserved' | 'damaged' | 'quarantine';

export type MovementType =
  | 'opening_balance'
  | 'receipt'
  | 'issue'
  | 'transfer_out'
  | 'transfer_in'
  | 'sale_dispatch'
  | 'customer_return'
  | 'supplier_return'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'adjustment_increase'
  | 'adjustment_decrease'
  | 'damage'
  | 'damage_release'
  | 'quarantine'
  | 'quarantine_release'
  | 'qc_rejection'
  | 'qc_release'
  | 'production_output'
  | 'production_consumption'
  | 'production_yield'
  | 'reservation_hold'
  | 'reservation_release'
  | 'reservation_consume'
  | 'purchase_intake';

export type ReservationStatus = 'active' | 'released' | 'consumed' | 'cancelled' | 'expired';

export type ReservationReferenceType =
  | 'manual_hold'
  | 'sales_order_draft'
  | 'ecommerce_hold'
  | 'marketplace_allocation'
  | 'distributor_order'
  | 'production_work_order'
  | 'production_stage'
  | 'quarantine_hold';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';

export interface InventoryBalance {
  id: string;
  organization_id: string;
  warehouse_id: string;
  location_id?: string | null;
  sku_id: string;
  batch_id?: string | null;
  available_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  quarantine_quantity: number;
  total_quantity: number;
  unit_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  sku_code?: string;
  variant_name?: string;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  brand?: string;
  category_name?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  location_name?: string;
  location_code?: string;
  unit_name?: string;
  unit_short_code?: string;
  reorder_level?: number;
  reorder_quantity?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  cost_price?: number;
  selling_price?: number;
  unit_price_cents?: number;
  estimated_valuation_cents?: number;
  stock_status?: StockStatus;
}

export interface InventoryMovement {
  id: string;
  organization_id: string;
  sku_id: string;
  warehouse_id: string;
  location_id?: string | null;
  batch_id?: string | null;
  movement_type: MovementType | string;
  stock_type: StockType;
  quantity: number;
  unit_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  before_quantity: number;
  after_quantity: number;
  performed_by?: string | null;
  performed_by_email?: string | null;
  reason?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
  metadata?: any;
  created_at: string;
  // Joined fields
  sku_code?: string;
  variant_name?: string;
  product_name?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  location_name?: string;
  unit_short_code?: string;
}

export interface StockReservation {
  id: string;
  organization_id: string;
  reservation_number: string;
  sku_id: string;
  warehouse_id: string;
  location_id?: string | null;
  batch_id?: string | null;
  quantity: number;
  unit_id?: string | null;
  reference_type: ReservationReferenceType | string;
  reference_id?: string | null;
  status: ReservationStatus;
  notes?: string | null;
  created_by?: string | null;
  created_by_email?: string | null;
  released_by?: string | null;
  consumed_by?: string | null;
  expires_at?: string | null;
  released_at?: string | null;
  consumed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  sku_code?: string;
  variant_name?: string;
  product_name?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  location_name?: string;
  unit_short_code?: string;
}

export interface StockAdjustment {
  id: string;
  organization_id: string;
  adjustment_number: string;
  sku_id: string;
  warehouse_id: string;
  location_id?: string | null;
  batch_id?: string | null;
  stock_type: StockType;
  adjustment_type: 'increase' | 'decrease' | 'relocation' | 'reclassification';
  direction?: 'increase' | 'decrease';
  quantity: number;
  unit_id?: string | null;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  notes?: string | null;
  status: 'applied' | 'pending_approval' | 'approved' | 'rejected';
  movement_id?: string | null;
  adjusted_by?: string | null;
  adjusted_by_email?: string | null;
  performed_by_email?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  sku_code?: string;
  variant_name?: string;
  product_name?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  location_name?: string;
  unit_short_code?: string;
}

export interface InventorySummary {
  total_skus?: number;
  total_skus_tracked: number;
  total_available_units: number;
  total_available_stock?: number;
  total_reserved_units: number;
  total_reserved_stock?: number;
  total_damaged_units: number;
  total_damaged_stock?: number;
  total_quarantine_units: number;
  total_quarantine_stock?: number;
  total_physical_units: number;
  low_stock_skus_count: number;
  low_stock_sku_count?: number;
  out_of_stock_skus_count: number;
  active_reservations_count: number;
  recent_movements_today_count: number;
  estimated_stock_valuation: number;
  total_valuation_cents?: number;
}

export interface StockFilterParams {
  search?: string;
  skuId?: string;
  warehouseId?: string;
  locationId?: string;
  categoryId?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
  stockType?: StockType;
  movementType?: MovementType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IntegrityDiscrepancy {
  type: string;
  severity?: 'critical' | 'warning' | 'info';
  balance_id?: string;
  sku_id?: string;
  sku_code?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  description?: string;
  details?: string;
  stored_value?: number;
  calculated_value?: number;
  drift_amount?: number;
}

export interface IntegrityReport {
  timestamp: string;
  organization_id?: string;
  status?: 'passed' | 'discrepancies_detected';
  isHealthy?: boolean;
  checkedBalancesCount?: number;
  discrepancyCount?: number;
  total_balances_scanned: number;
  total_movements_verified: number;
  total_reservations_scanned: number;
  discrepancies_count: number;
  discrepancies: IntegrityDiscrepancy[];
  checks?: {
    negative_stock_check: boolean;
    equation_consistency_check: boolean;
    movement_ledger_parity_check: boolean;
    orphan_references_check: boolean;
  };
}

export interface SkuStock360Profile {
  sku: any;
  product: any;
  total_available: number;
  total_reserved: number;
  total_damaged: number;
  total_quarantine: number;
  total_physical: number;
  stock_status: StockStatus;
  warehouse_balances: InventoryBalance[];
  recent_movements: InventoryMovement[];
  active_reservations: StockReservation[];
  totals?: {
    total_available: number;
    total_reserved: number;
    total_damaged: number;
    total_quarantine: number;
    total_physical: number;
    estimated_valuation?: number;
  };
  balances?: InventoryBalance[];
  recentMovements?: InventoryMovement[];
  activeReservations?: StockReservation[];
}

export type Sku360Profile = SkuStock360Profile;

export interface StockAdjustmentParams {
  organization_id?: string;
  sku_id: string;
  warehouse_id: string;
  location_id?: string;
  batch_id?: string;
  stock_type?: StockType;
  direction: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  notes?: string;
  idempotency_key?: string;
  actor_id?: string;
  actor_email?: string;
}

export interface StockTransferParams {
  organization_id?: string;
  sku_id: string;
  from_warehouse_id: string;
  from_location_id?: string;
  to_warehouse_id: string;
  to_location_id?: string;
  quantity: number;
  reason: string;
  notes?: string;
  actor_id?: string;
  actor_email?: string;
}

export interface StockReservationParams {
  organization_id?: string;
  sku_id: string;
  warehouse_id: string;
  location_id?: string;
  quantity: number;
  reference_type: string;
  reference_id?: string;
  expires_at?: string;
  notes?: string;
  actor_id?: string;
  actor_email?: string;
}

export interface OpeningBalanceParams {
  organization_id?: string;
  sku_id: string;
  warehouse_id: string;
  location_id?: string;
  quantity: number;
  notes?: string;
  actor_id?: string;
  actor_email?: string;
}
