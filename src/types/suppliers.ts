// Type definitions for Phase 7 — Supplier Master Management

export type SupplierType = 
  | 'raw_material'
  | 'packaging'
  | 'chemical'
  | 'equipment'
  | 'consumables'
  | 'service'
  | 'other';

export type SupplierStatus = 
  | 'draft'
  | 'active'
  | 'inactive'
  | 'blocked'
  | 'archived';

export type RatingStatus = 
  | 'preferred'
  | 'approved'
  | 'standard'
  | 'conditional'
  | 'probation'
  | 'blacklisted';

export type PaymentTerms = 
  | 'advance'
  | 'net_7'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'custom';

export type AddressType = 
  | 'registered'
  | 'billing'
  | 'warehouse'
  | 'factory'
  | 'dispatch';

export type DocumentType = 
  | 'agreement'
  | 'certificate'
  | 'quotation'
  | 'compliance'
  | 'pan_gst'
  | 'bank_doc'
  | 'other';

export interface SupplierContact {
  id: string;
  organization_id: string;
  supplier_id: string;
  name: string;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  is_primary: boolean;
  status: 'active' | 'inactive';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierAddress {
  id: string;
  organization_id: string;
  supplier_id: string;
  address_type: AddressType;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SupplierSKU {
  id: string;
  organization_id: string;
  supplier_id: string;
  product_id?: string | null;
  sku_id: string;
  supplier_product_code?: string | null;
  supplier_product_name?: string | null;
  supplier_description?: string | null;
  lead_time_days?: number | null;
  minimum_order_quantity: number;
  preferred_supplier: boolean;
  active_price?: number | null;
  status: 'active' | 'inactive' | 'archived';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined canonical SKU & Product fields
  sku?: string;
  variant_name?: string;
  barcode?: string | null;
  pack_size?: string | null;
  pack_unit?: string | null;
  standard_cost_price?: number | null;
  parent_product_id?: string;
  product_name?: string;
  product_code?: string;
  brand?: string | null;
  product_type?: string;
}

export interface SupplierPrice {
  id: string;
  organization_id: string;
  supplier_id: string;
  sku_id: string;
  supplier_sku_id?: string | null;
  price: number;
  currency: string;
  minimum_order_quantity: number;
  price_unit: string;
  effective_from: string;
  effective_to?: string | null;
  status: 'active' | 'expired' | 'inactive';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined metadata
  sku?: string;
  variant_name?: string;
  product_name?: string;
  supplier_product_code?: string | null;
}

export interface SupplierDocument {
  id: string;
  organization_id: string;
  supplier_id: string;
  title: string;
  document_type: DocumentType;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  storage_path: string;
  public_url?: string | null;
  valid_until?: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  supplier_code: string;
  supplier_name: string;
  legal_name?: string | null;
  display_name?: string | null;
  supplier_type: SupplierType;
  status: SupplierStatus;
  registration_number?: string | null;
  tax_id?: string | null;
  pan_number?: string | null;
  tax_registration_status?: string | null;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  alternate_phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  payment_terms: PaymentTerms;
  default_currency: string;
  credit_limit: number;
  lead_time_days: number;
  minimum_order_value: number;
  rating_status: RatingStatus;
  rating_notes?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  raw_bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  created_at: string;
  updated_at: string;
  // Aggregated metadata
  sku_count?: number;
  contact_count?: number;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  // Deep detail relations
  contacts?: SupplierContact[];
  addresses?: SupplierAddress[];
  skus?: SupplierSKU[];
  pricing?: SupplierPrice[];
  prices?: SupplierPrice[];
  documents?: SupplierDocument[];
  recent_activity?: any[];
  audit_logs?: any[];
}

export interface SupplierFilterParams {
  query?: string;
  supplierType?: string;
  status?: string;
  ratingStatus?: string;
  city?: string;
  page?: number;
  pageSize?: number;
  organizationId?: string;
  showSensitive?: boolean;
}

export interface SupplierListResponse {
  data: Supplier[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SupplierPerformanceSummary {
  supplier_id: string;
  supplier_name: string;
  rating_status: RatingStatus;
  rating_notes?: string | null;
  expected_lead_time_days: number;
  metrics: {
    total_purchase_orders: number;
    total_spend_amount: number;
    on_time_delivery_rate: number | null;
    quality_rejection_rate: number | null;
    average_fulfillment_days: number | null;
    compliance_score: number;
    has_transaction_history: boolean;
    message: string;
  };
}
