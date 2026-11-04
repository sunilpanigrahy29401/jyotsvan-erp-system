/**
 * Jyotsvan Enterprise Platform - Phase 9 Warehouse Management Types
 * Manages physical organization, hierarchical locations, internal transfers,
 * stock verification / cycle counts, and operational staging.
 */

import { BaseEntity, EntityStatus } from './database';

export type WarehouseType =
  | 'central_hub'
  | 'regional_depot'
  | 'factory_storage'
  | 'transit_hub'
  | 'raw_material'
  | 'finished_goods'
  | 'packaging'
  | 'wip_production'
  | 'dispatch'
  | 'cnf'
  | 'quarantine'
  | 'returns_depot'
  | 'other';

export type WarehouseOperationalStatus = 'active' | 'inactive' | 'maintenance' | 'archived';

export interface WarehouseMaster extends Omit<BaseEntity, 'status'> {
  organization_id: string;
  branch_id?: string | null;
  name: string;
  code: string;
  warehouse_type: WarehouseType;
  address?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  contact_name?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
  email?: string | null;
  contact_email?: string | null;
  capacity_cubic_meters?: number | null;
  capacity_sq_ft?: number | null;
  notes?: string | null;
  status: WarehouseOperationalStatus;
  
  // Computed / aggregated fields
  branch_name?: string;
  total_locations_count?: number;
  total_skus_count?: number;
  total_units_count?: number;
  pending_transfers_count?: number;
  active_counts_count?: number;
}

export type LocationType =
  | 'receiving'
  | 'storage'
  | 'picking'
  | 'packing'
  | 'dispatch'
  | 'quarantine'
  | 'damaged'
  | 'returns'
  | 'wip'
  | 'transit'
  | 'other';

export interface WarehouseLocationHierarchy extends BaseEntity {
  organization_id: string;
  warehouse_id: string;
  parent_location_id?: string | null;
  code: string;
  name: string;
  description?: string | null;
  location_type: LocationType;
  zone_code?: string | null;
  aisle_code?: string | null;
  rack_code?: string | null;
  shelf_code?: string | null;
  bin_code?: string | null;
  capacity_quantity?: number | null;
  capacity_unit?: string | null;
  capacity_weight?: number | null;
  capacity_volume?: number | null;
  utilization_threshold?: number | null;
  notes?: string | null;
  status: EntityStatus;

  // Hierarchical associations
  warehouse_name?: string;
  warehouse_code?: string;
  parent_location_name?: string;
  parent_location_code?: string;
  children?: WarehouseLocationHierarchy[];
  level?: number;
  current_stock_units?: number;
  skus_count?: number;
}

export type TransferStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'dispatched'
  | 'in_transit'
  | 'partially_received'
  | 'received'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type StockTransferStatus = TransferStatus;
export type StockTransferType = 'replenishment' | 'sales_order' | 'production_issue' | 'return' | 'quarantine' | 'relocation' | string;
export type TransferPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WarehouseTransferItem {
  id: string;
  transfer_id: string;
  sku_id: string;
  quantity: number;
  requested_quantity?: number;
  dispatched_quantity?: number;
  received_quantity?: number;
  unit_id?: string | null;
  batch_id?: string | null;
  batch_number?: string | null;
  source_location_id?: string | null;
  destination_location_id?: string | null;
  notes?: string | null;
  status: 'pending' | 'dispatched' | 'received' | 'cancelled';
  created_at: string;

  // Joined SKU & UOM info
  sku_code?: string;
  sku_name?: string;
  variant_name?: string;
  product_name?: string;
  product_code?: string;
  unit_short_code?: string;
  source_location_name?: string;
  destination_location_name?: string;
}

export type StockTransferItem = WarehouseTransferItem;

export interface WarehouseTransfer extends Omit<BaseEntity, 'status'> {
  organization_id: string;
  transfer_number: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  source_location_id?: string | null;
  destination_location_id?: string | null;
  transfer_type?: StockTransferType;
  status: TransferStatus;
  priority?: TransferPriority;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  vehicle_number?: string | null;
  driver_name?: string | null;
  expected_delivery_date?: string | null;
  requested_by?: string | null;
  requested_by_email?: string | null;
  approved_by?: string | null;
  approved_by_email?: string | null;
  dispatched_by?: string | null;
  dispatched_by_email?: string | null;
  received_by?: string | null;
  received_by_email?: string | null;
  cancelled_by?: string | null;
  cancelled_by_email?: string | null;
  requested_at?: string | null;
  approved_at?: string | null;
  dispatched_at?: string | null;
  received_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  notes?: string | null;

  // Joined metadata
  source_warehouse_name?: string;
  source_warehouse_code?: string;
  destination_warehouse_name?: string;
  destination_warehouse_code?: string;
  source_location_name?: string;
  destination_location_name?: string;
  items_count?: number;
  total_quantity?: number;
  items?: WarehouseTransferItem[];
}

export type StockTransferOrder = WarehouseTransfer;

export type CountType = 'full_warehouse' | 'location' | 'location_specific' | 'sku_specific' | 'high_value_abc' | 'random_sample' | string;
export type StockCountType = CountType;
export type CountSessionStatus = 'draft' | 'scheduled' | 'in_progress' | 'submitted' | 'review' | 'reconciled' | 'cancelled';
export type StockCountStatus = CountSessionStatus;

export interface StockCountItem {
  id: string;
  session_id: string;
  sku_id: string;
  location_id?: string | null;
  system_quantity: number;
  counted_quantity?: number | null;
  variance_quantity?: number | null;
  unit_id?: string | null;
  unit_cost?: number;
  cost_price?: number;
  notes?: string | null;
  status: 'pending' | 'counted' | 'discrepancy' | 'reconciled';
  adjustment_id?: string | null;
  created_at: string;
  updated_at: string;

  // Joined details
  sku_code?: string;
  sku_name?: string;
  variant_name?: string;
  product_name?: string;
  product_code?: string;
  unit_short_code?: string;
  location_name?: string;
  location_code?: string;
  variance_cost_impact?: number;
}

export interface StockCountSession extends Omit<BaseEntity, 'status'> {
  organization_id: string;
  count_number: string;
  name?: string | null;
  warehouse_id: string;
  location_id?: string | null;
  count_type: CountType;
  status: CountSessionStatus;
  count_date?: string | null;
  net_variance_value?: number;
  freeze_movements?: boolean;
  conducted_by?: string | null;
  conducted_by_email?: string | null;
  approved_by?: string | null;
  approved_by_email?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  reconciled_at?: string | null;
  notes?: string | null;

  // Joined metadata
  warehouse_name?: string;
  warehouse_code?: string;
  location_name?: string;
  total_items_count?: number;
  counted_items_count?: number;
  discrepancy_items_count?: number;
  total_variance_units?: number;
  items?: StockCountItem[];
}

export type WarehouseStaffRole = 'manager' | 'supervisor' | 'operator' | 'picker' | 'driver' | 'auditor';

export interface WarehouseAssignment {
  id: string;
  organization_id: string;
  warehouse_id: string;
  user_id: string;
  role_type: WarehouseStaffRole;
  assigned_by?: string | null;
  created_at: string;

  // Joined user profile
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  warehouse_name?: string;
  warehouse_code?: string;
}

export interface WarehouseSummaryMetrics {
  total_warehouses: number;
  active_warehouses: number;
  maintenance_warehouses: number;
  inactive_warehouses: number;
  total_locations_count: number;
  total_skus_stored: number;
  total_available_units: number;
  total_reserved_units: number;
  total_damaged_units: number;
  total_quarantine_units: number;
  total_physical_units: number;
  pending_transfers_count: number;
  in_transit_transfers_count: number;
  completed_transfers_today: number;
  active_counts_count: number;
  total_estimated_valuation: number;
}
