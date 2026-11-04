export type CFType = 'company_owned' | 'third_party' | 'regional' | 'state' | 'super_cf';

export type CFStatus = 'draft' | 'active' | 'inactive' | 'suspended' | 'terminated' | 'archived';

export type CFTransferStatus = 
  | 'draft' 
  | 'requested' 
  | 'approved' 
  | 'dispatched' 
  | 'in_transit' 
  | 'partially_received' 
  | 'completed' 
  | 'cancelled';

export type CFDispatchStatus = 
  | 'draft' 
  | 'requested' 
  | 'approved' 
  | 'picking' 
  | 'dispatched' 
  | 'completed' 
  | 'cancelled';

export type CFDiscrepancyType = 'shortage' | 'excess' | 'damaged' | 'wrong_batch' | 'rejected';

export type CFDiscrepancyResolution = 'pending' | 'investigating' | 'approved_write_off' | 'supplier_claim' | 'settled';

export interface CFContact {
  id: string;
  organization_id: string;
  cf_id: string;
  name: string;
  designation: string;
  phone: string;
  email?: string;
  preferred_contact_method: 'phone' | 'email' | 'whatsapp';
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CFAddress {
  id: string;
  organization_id: string;
  cf_id: string;
  address_type: 'registered' | 'warehouse' | 'billing' | 'shipping' | 'operational';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  gstin?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CFWarehouseMapping {
  id: string;
  organization_id: string;
  cf_id: string;
  warehouse_id: string;
  is_primary_depot: boolean;
  custody_agreement_ref?: string;
  assigned_at: string;
  assigned_by?: string;
  notes?: string;
  status: 'active' | 'inactive';
  // Joined fields from warehouses
  warehouse_name?: string;
  warehouse_code?: string;
  warehouse_city?: string;
  warehouse_state?: string;
  capacity_sq_ft?: number;
  total_locations_count?: number;
  total_skus_count?: number;
  total_units_count?: number;
}

export interface CFTerritory {
  id: string;
  organization_id: string;
  cf_id: string;
  state: string;
  region: string;
  district?: string;
  territory_name: string;
  pincodes?: string[];
  is_exclusive: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CFDocument {
  id: string;
  organization_id: string;
  cf_id: string;
  document_type: 
    | 'agreement' 
    | 'gst_certificate' 
    | 'pan_card' 
    | 'address_proof' 
    | 'security_deposit_receipt' 
    | 'nda' 
    | 'authorization_letter' 
    | 'insurance_policy' 
    | 'other';
  title: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  expiry_date?: string;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
}

export interface CFMaster {
  id: string;
  organization_id: string;
  cf_code: string;
  legal_name: string;
  display_name: string;
  cf_type: CFType;
  status: CFStatus;
  contact_person: string;
  phone: string;
  alternate_phone?: string;
  email: string;
  gstin?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  territory: string;
  region: string;
  appointed_date?: string;
  agreement_start_date?: string;
  agreement_end_date?: string;
  security_deposit_amount?: number;
  commission_rate?: number;
  credit_limit?: number;
  financial_metadata?: Record<string, any>;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Aggregated operational metrics
  associated_warehouses_count?: number;
  total_stock_units?: number;
  estimated_inventory_value?: number;
  pending_inward_transfers_count?: number;
  in_transit_units?: number;
  active_dispatches_count?: number;
  discrepancy_count?: number;

  // Joined child relations (when fetched with detail)
  contacts?: CFContact[];
  addresses?: CFAddress[];
  warehouses?: CFWarehouseMapping[];
  territories?: CFTerritory[];
  documents?: CFDocument[];
}

export interface CFTransferItem {
  id: string;
  transfer_id: string;
  sku_id: string;
  batch_id?: string;
  batch_number?: string;
  requested_quantity: number;
  dispatched_quantity: number;
  received_quantity: number;
  shortage_quantity: number;
  damaged_quantity: number;
  rejected_quantity: number;
  unit_id?: string;
  unit_cost?: number;
  notes?: string;
  status: 'pending' | 'partially_received' | 'received' | 'discrepant';
  
  // Joined sku info
  sku_code?: string;
  sku_name?: string;
  unit_name?: string;
  expiry_date?: string;
}

export interface CFTransferDiscrepancy {
  id: string;
  organization_id: string;
  transfer_id: string;
  item_id: string;
  sku_id: string;
  batch_id?: string;
  discrepancy_type: CFDiscrepancyType;
  quantity: number;
  unit_cost?: number;
  reported_by?: string;
  reported_by_email?: string;
  reported_at: string;
  resolution_status: CFDiscrepancyResolution;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  
  // Joined details
  sku_code?: string;
  sku_name?: string;
  batch_number?: string;
  transfer_number?: string;
}

export interface CFTransfer {
  id: string;
  organization_id: string;
  transfer_number: string;
  source_warehouse_id: string;
  cf_id: string;
  destination_warehouse_id: string;
  transfer_type: 'primary_allocation' | 'replenishment' | 'inter_depot' | 'consignment';
  status: CFTransferStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  shipping_carrier?: string;
  tracking_number?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  eway_bill_number?: string;
  expected_delivery_date?: string;
  requested_by?: string;
  requested_by_email?: string;
  approved_by?: string;
  approved_by_email?: string;
  dispatched_by?: string;
  dispatched_by_email?: string;
  received_by?: string;
  received_by_email?: string;
  cancelled_by?: string;
  cancelled_by_email?: string;
  requested_at?: string;
  approved_at?: string;
  dispatched_at?: string;
  received_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined Details
  cf_name?: string;
  cf_code?: string;
  source_warehouse_name?: string;
  source_warehouse_code?: string;
  destination_warehouse_name?: string;
  destination_warehouse_code?: string;
  total_items_count?: number;
  total_requested_quantity?: number;
  total_dispatched_quantity?: number;
  total_received_quantity?: number;
  total_discrepancy_quantity?: number;
  items?: CFTransferItem[];
  discrepancies?: CFTransferDiscrepancy[];
}

export interface CFDispatchItem {
  id: string;
  dispatch_id: string;
  sku_id: string;
  batch_id?: string;
  batch_number?: string;
  location_id?: string;
  requested_quantity: number;
  picked_quantity: number;
  dispatched_quantity: number;
  unit_id?: string;
  unit_cost?: number;
  notes?: string;
  status: 'pending' | 'picked' | 'dispatched';
  
  // Joined fields
  sku_code?: string;
  sku_name?: string;
  unit_name?: string;
  location_code?: string;
  expiry_date?: string;
}

export interface CFDispatch {
  id: string;
  organization_id: string;
  dispatch_number: string;
  cf_id: string;
  warehouse_id: string;
  destination_type: 'distributor' | 'retailer' | 'inter_depot' | 'return_to_plant';
  destination_name: string;
  destination_reference?: string;
  status: CFDispatchStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  shipping_carrier?: string;
  tracking_number?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  eway_bill_number?: string;
  dispatch_date?: string;
  requested_by?: string;
  requested_by_email?: string;
  approved_by?: string;
  approved_by_email?: string;
  dispatched_by?: string;
  dispatched_by_email?: string;
  requested_at?: string;
  approved_at?: string;
  dispatched_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  cf_name?: string;
  cf_code?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  total_items_count?: number;
  total_requested_quantity?: number;
  total_picked_quantity?: number;
  total_dispatched_quantity?: number;
  items?: CFDispatchItem[];
}

export interface CFStockItem {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  category_name?: string;
  unit_short_code?: string;
  cf_id: string;
  cf_name: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id?: string;
  location_code?: string;
  batch_id?: string;
  batch_number?: string;
  available_quantity: number;
  reserved_quantity: number;
  quarantine_quantity: number;
  damaged_quantity: number;
  total_quantity: number;
  unit_cost: number;
  estimated_inventory_value: number;
  expiry_date?: string;
  manufacturing_date?: string;
  shelf_life_status?: 'fresh' | 'near_expiry' | 'critical' | 'expired';
  days_to_expiry?: number;
}

export interface CFSummaryMetrics {
  total_cfs: number;
  active_cfs: number;
  suspended_cfs: number;
  total_warehouses: number;
  total_stock_units: number;
  estimated_inventory_value: number;
  pending_inward_transfers: number;
  in_transit_stock_units: number;
  pending_dispatches: number;
  total_discrepancy_count: number;
  expiring_batches_count: number;
}

export interface CFQueryParams {
  search?: string;
  type?: CFType;
  status?: CFStatus;
  state?: string;
  region?: string;
  territory?: string;
  warehouseId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
