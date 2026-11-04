export type RetailerType =
  | 'agro_input_shop'
  | 'dealer_outlet'
  | 'specialty_store'
  | 'agricultural_retailer'
  | 'institutional_buyer'
  | 'cooperative_society'
  | 'general_store'
  | 'other';

export type RetailerStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'blocked'
  | 'terminated'
  | 'archived';

export type RetailerContactDesignation =
  | 'Owner'
  | 'Store Manager'
  | 'Purchase Contact'
  | 'Accounts Contact'
  | 'Sales Contact'
  | 'Other';

export type RetailerAddressType =
  | 'registered'
  | 'store'
  | 'billing'
  | 'delivery'
  | 'storage';

export type RetailerOrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type RetailerReturnReason =
  | 'damaged'
  | 'expired'
  | 'quality_issue'
  | 'wrong_product'
  | 'excess'
  | 'short_shipment'
  | 'other';

export type RetailerReturnStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'completed';

export type VisitPurpose =
  | 'routine_order_booking'
  | 'payment_collection'
  | 'payment_followup'
  | 'stock_audit'
  | 'new_product_launch'
  | 'new_product_pitch'
  | 'complaint_resolution'
  | 'issue_resolution'
  | 'promotional_drive'
  | 'relationship_management'
  | 'other';

export type RetailerVisitPurpose = VisitPurpose;

export type FollowupPriority = 'low' | 'medium' | 'high' | 'urgent';

export type FollowupStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export type RetailerDocumentType =
  | 'gst_certificate'
  | 'pan'
  | 'shop_registration'
  | 'agreement'
  | 'license'
  | 'kyc'
  | 'other';

export interface RetailerMaster {
  id: string;
  organization_id: string;
  retailer_code: string;
  legal_name: string;
  display_name: string;
  retailer_type: RetailerType;
  status: RetailerStatus;
  gstin?: string;
  pan?: string;
  phone: string;
  alternate_phone?: string;
  email: string;
  registered_address?: string;
  operational_address?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  country: string;
  territory_id?: string;
  territory_name?: string;
  region: string;
  primary_distributor_id?: string;
  primary_distributor_name?: string;
  primary_distributor_code?: string;
  cf_id?: string;
  cf_name?: string;
  appointed_date?: string;
  agreement_start_date?: string;
  agreement_end_date?: string;
  credit_limit: number;
  payment_terms_days: number;
  agreed_discount_percent: number;
  warning_threshold: number;
  credit_hold: boolean;
  assigned_salesperson_id?: string;
  assigned_salesperson_name?: string;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Enriched aggregated counts
  mapped_distributors_count?: number;
  active_skus_count?: number;
  stock_units_on_hand?: number;
  stock_valuation?: number;
  current_outstanding_amount?: number;
  available_credit?: number;
  pending_orders_count?: number;
  pending_followups_count?: number;
  last_visit_date?: string;
}

export interface RetailerContact {
  id: string;
  organization_id: string;
  retailer_id: string;
  name: string;
  designation: RetailerContactDesignation | string;
  phone: string;
  email?: string;
  preferred_contact_method: 'phone' | 'email' | 'whatsapp' | 'in_person';
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface RetailerAddress {
  id: string;
  organization_id: string;
  retailer_id: string;
  address_type: RetailerAddressType;
  address_line1: string;
  address_line2?: string;
  city: string;
  district?: string;
  state: string;
  postal_code: string;
  country: string;
  gstin?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RetailerDistributorMapping {
  id: string;
  organization_id: string;
  retailer_id: string;
  distributor_id: string;
  distributor_code?: string;
  distributor_name?: string;
  distributor_city?: string;
  distributor_state?: string;
  distributor_type?: string;
  effective_from: string;
  effective_to?: string;
  is_preferred: boolean;
  priority_rank: number;
  status: 'active' | 'inactive';
  territory_id?: string;
  territory_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RetailerSalespersonAssignment {
  id: string;
  organization_id: string;
  retailer_id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  role: string;
  effective_from: string;
  effective_to?: string;
  is_primary: boolean;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RetailerAssortment {
  id: string;
  organization_id: string;
  retailer_id: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  category?: string;
  uom?: string;
  status: 'active' | 'inactive';
  minimum_order_quantity: number;
  target_stock: number;
  preferred_pack_size: number;
  agreed_price_basis?: number;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RetailerCommercialTerms {
  id: string;
  organization_id: string;
  retailer_id: string;
  price_list_type: string;
  payment_terms_days: number;
  credit_limit: number;
  warning_threshold: number;
  credit_hold: boolean;
  agreed_discount_percent: number;
  order_terms?: string;
  delivery_terms?: string;
  tax_configuration?: Record<string, any>;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RetailerStockItem {
  id: string;
  organization_id: string;
  retailer_id: string;
  retailer_name?: string;
  retailer_code?: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  category?: string;
  batch_id?: string;
  batch_number?: string;
  manufacture_date?: string;
  expiry_date?: string;
  shelf_life_days_remaining?: number;
  expiry_risk_status?: 'normal' | 'near_expiry' | 'expired';
  quantity_on_hand: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_damaged: number;
  quantity_quarantine: number;
  unit_id?: string;
  unit_name?: string;
  uom?: string;
  unit_cost: number;
  total_valuation?: number;
  distributor_name?: string;
  source_distributor_id?: string;
  source_distributor_name?: string;
  source_distributor_code?: string;
  source_cf_id?: string;
  source_cf_name?: string;
  last_inward_at?: string;
  last_outward_at?: string;
  updated_at: string;
}

export interface RetailerReceivingRecord {
  id: string;
  organization_id: string;
  retailer_id: string;
  retailer_name?: string;
  distributor_id: string;
  distributor_name?: string;
  distributor_dispatch_reference?: string;
  grn_number?: string;
  transfer_id?: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  batch_id?: string;
  batch_number?: string;
  dispatched_quantity: number;
  received_quantity: number;
  shortage_quantity: number;
  damaged_quantity: number;
  rejected_quantity: number;
  unit_cost: number;
  receiving_date: string;
  received_date?: string;
  notes?: string;
  created_at: string;
}

export interface RetailerOrderItem {
  id?: string;
  order_id?: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  requested_quantity: number;
  approved_quantity?: number;
  uom?: string;
  unit_cost?: number;
  estimated_unit_price?: number;
  total_price?: number;
  estimated_line_total?: number;
  notes?: string;
}

export interface RetailerOrderRequest {
  id: string;
  organization_id: string;
  order_number: string;
  retailer_id: string;
  retailer_name?: string;
  retailer_code?: string;
  distributor_id: string;
  distributor_name?: string;
  distributor_code?: string;
  status: RetailerOrderStatus;
  requested_date: string;
  requested_delivery_date?: string;
  total_items_count: number;
  total_quantity: number;
  total_estimated_amount: number;
  currency: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: RetailerOrderItem[];
}

export interface RetailerReturn {
  id: string;
  organization_id: string;
  return_number: string;
  retailer_id: string;
  retailer_name?: string;
  distributor_id: string;
  distributor_name?: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  batch_id?: string;
  batch_number?: string;
  quantity: number;
  uom?: string;
  reason: RetailerReturnReason;
  status: RetailerReturnStatus;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RetailerVisit {
  id: string;
  organization_id: string;
  retailer_id: string;
  retailer_name?: string;
  salesperson_id?: string;
  salesperson_name: string;
  visit_date: string;
  purpose: VisitPurpose;
  notes?: string;
  outcome?: string;
  next_follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RetailerFollowUp {
  id: string;
  organization_id: string;
  retailer_id: string;
  retailer_name?: string;
  retailer_code?: string;
  visit_id?: string;
  assigned_user_id?: string;
  assigned_user_name: string;
  due_date: string;
  priority: FollowupPriority;
  subject: string;
  notes?: string;
  status: FollowupStatus;
  completion_date?: string;
  is_overdue?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RetailerDocument {
  id: string;
  organization_id: string;
  retailer_id: string;
  document_type: RetailerDocumentType;
  title: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type?: string;
  expiry_date?: string;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
}

export interface RetailerSummaryMetrics {
  totalRetailers: number;
  activeRetailers: number;
  newRetailersThisMonth: number;
  inactiveOrBlockedRetailers: number;
  pendingOrderRequests: number;
  pendingOrdersValue: number;
  pendingFollowupsCount: number;
  overdueFollowupsCount: number;
  totalChannelStockUnits: number;
  totalChannelStockValuation: number;
  nearExpiryItemsCount: number;
  activeReturnsCount: number;
  totalCreditExposure: number;
  totalCreditLimitAssigned: number;
  creditHoldCount: number;
  recentVisitsCount: number;
}
