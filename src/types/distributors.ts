export type DistributorType =
  | 'primary'
  | 'super_distributor'
  | 'regional'
  | 'state'
  | 'district'
  | 'specialty';

export type DistributorStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'blocked'
  | 'terminated'
  | 'archived';

export type DistributorContactRole =
  | 'Owner'
  | 'Sales Contact'
  | 'Accounts Contact'
  | 'Warehouse Contact'
  | 'Operations Contact'
  | 'General Manager';

export type DistributorAddressType =
  | 'registered'
  | 'billing'
  | 'operational'
  | 'warehouse';

export type DistributorTransferStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'picking'
  | 'dispatched'
  | 'in_transit'
  | 'received'
  | 'completed'
  | 'cancelled';

export type TransferPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DistributorDiscrepancyType =
  | 'shortage'
  | 'damaged'
  | 'rejected'
  | 'wrong_batch'
  | 'expired';

export type DiscrepancyResolutionStatus =
  | 'pending'
  | 'investigating'
  | 'settled'
  | 'approved_write_off'
  | 'rejected';

export type DistributorOrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'fulfilled'
  | 'cancelled';

export type DistributorReturnReason =
  | 'damaged'
  | 'expired'
  | 'quality_issue'
  | 'excess'
  | 'wrong_product'
  | 'short_shipment'
  | 'other';

export type DistributorReturnStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'completed'
  | 'cancelled';

export interface DistributorMaster {
  id: string;
  organization_id: string;
  distributor_code: string;
  legal_name: string;
  display_name: string;
  distributor_type: DistributorType;
  status: DistributorStatus;
  gstin?: string | null;
  pan?: string | null;
  primary_contact: string;
  phone: string;
  alternate_phone?: string | null;
  email: string;
  website?: string | null;
  registered_address?: string | null;
  operational_address?: string | null;
  city: string;
  district?: string | null;
  state: string;
  pincode: string;
  country: string;
  territory_id?: string | null;
  territory_name?: string | null;
  region: string;
  appointed_date?: string | null;
  agreement_start_date?: string | null;
  agreement_end_date?: string | null;
  credit_limit: number;
  payment_terms_days: number;
  agreed_discount_percent: number;
  price_list_type?: string | null;
  credit_hold?: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_by_email?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joins / Computeds
  mapped_cfs_count?: number;
  active_skus_count?: number;
  current_outstanding_amount?: number;
  available_credit?: number;
  stock_units_on_hand?: number;
  stock_valuation?: number;
}

export interface DistributorContact {
  id: string;
  organization_id: string;
  distributor_id: string;
  name: string;
  designation: string;
  phone: string;
  email?: string | null;
  preferred_contact_method?: string;
  is_primary: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DistributorAddress {
  id: string;
  organization_id: string;
  distributor_id: string;
  address_type: DistributorAddressType;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  district?: string | null;
  state: string;
  postal_code: string;
  country: string;
  gstin?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Territory {
  id: string;
  organization_id: string;
  territory_code: string;
  territory_name: string;
  region: string;
  state: string;
  district?: string | null;
  pincodes?: string[];
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorCFMapping {
  id: string;
  organization_id: string;
  distributor_id: string;
  cf_id: string;
  effective_from: string;
  effective_to?: string | null;
  is_preferred: boolean;
  priority_rank: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  cf_code?: string;
  cf_name?: string;
  cf_city?: string;
  cf_state?: string;
  cf_phone?: string;
}

export interface DistributorAssortment {
  id: string;
  organization_id: string;
  distributor_id: string;
  sku_id: string;
  status: 'active' | 'inactive';
  minimum_order_quantity: number;
  target_stock: number;
  preferred_pack_size: number;
  agreed_price_basis?: number | null;
  effective_from: string;
  effective_to?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  sku_code?: string;
  sku_name?: string;
  category?: string;
  unit_name?: string;
  unit_short_code?: string;
  standard_mrp?: number;
  standard_cost?: number;
}

export interface DistributorCommercialTerms {
  id: string;
  organization_id: string;
  distributor_id: string;
  payment_terms_days: number;
  credit_limit: number;
  agreed_discount_percent: number;
  price_list_type: string;
  order_terms?: string | null;
  delivery_terms?: string | null;
  tax_configuration?: Record<string, unknown>;
  effective_from: string;
  effective_to?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorStockItem {
  id: string;
  organization_id: string;
  distributor_id: string;
  distributor_name?: string;
  distributor_code?: string;
  sku_id: string;
  sku_code: string;
  sku_name: string;
  category?: string;
  batch_id?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  shelf_life_days_remaining?: number | null;
  quantity_on_hand: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_damaged: number;
  quantity_quarantine: number;
  unit_id?: string | null;
  unit_short_code?: string | null;
  unit_cost: number;
  estimated_valuation: number;
  source_cf_id?: string | null;
  source_cf_name?: string | null;
  last_inward_at?: string | null;
  last_outward_at?: string | null;
  updated_at: string;
}

export interface DistributorTransfer {
  id: string;
  organization_id: string;
  transfer_number: string;
  distributor_id: string;
  cf_id: string;
  source_warehouse_id?: string | null;
  status: DistributorTransferStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  vehicle_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  eway_bill_number?: string | null;
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
  created_at: string;
  updated_at: string;
  // Computed / Joined
  distributor_name?: string;
  distributor_code?: string;
  cf_name?: string;
  cf_code?: string;
  source_warehouse_name?: string;
  total_requested_quantity?: number;
  total_dispatched_quantity?: number;
  total_received_quantity?: number;
  total_shortage_quantity?: number;
  total_damaged_quantity?: number;
  total_valuation?: number;
  items?: DistributorTransferItem[];
}

export interface DistributorTransferItem {
  id: string;
  transfer_id: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  batch_id?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  requested_quantity: number;
  dispatched_quantity: number;
  received_quantity: number;
  shortage_quantity: number;
  damaged_quantity: number;
  rejected_quantity: number;
  unit_id?: string | null;
  unit_short_code?: string | null;
  unit_cost: number;
  notes?: string | null;
  status: string;
  created_at: string;
}

export interface DistributorDiscrepancy {
  id: string;
  organization_id: string;
  transfer_id: string;
  transfer_number?: string;
  distributor_id: string;
  distributor_name?: string;
  distributor_code?: string;
  cf_id?: string;
  cf_name?: string;
  item_id: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  batch_id?: string | null;
  batch_number?: string | null;
  discrepancy_type: DistributorDiscrepancyType;
  quantity: number;
  unit_cost: number;
  total_loss_value: number;
  reported_by?: string | null;
  reported_by_email?: string | null;
  reported_at: string;
  resolution_status: DiscrepancyResolutionStatus;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
}

export interface DistributorOrder {
  id: string;
  organization_id: string;
  order_number: string;
  distributor_id: string;
  distributor_name?: string;
  distributor_code?: string;
  cf_id?: string | null;
  cf_name?: string | null;
  status: DistributorOrderStatus;
  requested_date: string;
  requested_delivery_date?: string | null;
  total_items_count: number;
  total_quantity: number;
  total_estimated_amount: number;
  currency: string;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  items?: DistributorOrderItem[];
}

export interface DistributorOrderItem {
  id: string;
  order_id: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_cost: number;
  total_price: number;
  notes?: string | null;
}

export interface DistributorReturn {
  id: string;
  organization_id: string;
  return_number: string;
  distributor_id: string;
  distributor_name?: string;
  distributor_code?: string;
  destination_cf_id?: string | null;
  destination_cf_name?: string | null;
  destination_warehouse_id?: string | null;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  batch_id?: string | null;
  batch_number?: string | null;
  quantity: number;
  unit_cost: number;
  total_value: number;
  reason: DistributorReturnReason;
  reference_transfer_id?: string | null;
  reference_transfer_number?: string | null;
  status: DistributorReturnStatus;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  received_by?: string | null;
  received_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorDocument {
  id: string;
  organization_id: string;
  distributor_id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type?: string | null;
  expiry_date?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
  notes?: string | null;
}

export interface DistributorSummaryMetrics {
  total_distributors: number;
  active_distributors: number;
  suspended_or_blocked_distributors: number;
  total_mapped_cfs: number;
  total_channel_stock_units: number;
  estimated_channel_stock_value: number;
  transfers_in_transit_count: number;
  pending_receiving_count: number;
  pending_orders_count: number;
  open_discrepancies_count: number;
  open_returns_count: number;
  total_credit_limit: number;
  total_credit_utilized: number;
}
