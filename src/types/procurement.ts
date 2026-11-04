// Type definitions for Phase 10 — Procurement Module

export type PurchaseRequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PurchaseRequestStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'partially_converted'
  | 'converted_to_po'
  | 'completed';

export interface PurchaseRequestItem {
  id: string;
  purchase_request_id: string;
  sku_id: string;
  quantity: number;
  unit_id?: string | null;
  required_by_date?: string | null;
  estimated_unit_cost: number;
  estimated_line_total: number;
  converted_quantity: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined SKU & Product details
  sku_code?: string;
  variant_name?: string;
  barcode?: string | null;
  product_name?: string;
  product_code?: string;
  unit_name?: string;
  unit_short_code?: string;
}

export interface PurchaseRequest {
  id: string;
  organization_id: string;
  request_number: string;
  requested_by?: string | null;
  requested_by_email: string;
  department_id?: string | null;
  department_name?: string | null;
  required_by_date: string;
  priority: PurchaseRequestPriority;
  purpose?: string | null;
  status: PurchaseRequestStatus;
  total_estimated_amount: number;
  approved_by?: string | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseRequestItem[];
  items_count?: number;
  linked_pos_count?: number;
}

export type PurchaseOrderStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'acknowledged'
  | 'partially_received'
  | 'fully_received'
  | 'closed'
  | 'rejected'
  | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  sku_id: string;
  supplier_sku_id?: string | null;
  description?: string | null;
  quantity: number;
  unit_id?: string | null;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  expected_delivery_date?: string | null;
  received_quantity: number;
  cancelled_quantity: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined SKU details
  sku_code?: string;
  variant_name?: string;
  barcode?: string | null;
  product_name?: string;
  product_code?: string;
  unit_name?: string;
  unit_short_code?: string;
  supplier_product_code?: string | null;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  supplier_email?: string | null;
  supplier_phone?: string | null;
  purchase_request_id?: string | null;
  purchase_request_number?: string | null;
  order_date: string;
  expected_delivery_date: string;
  currency: string;
  payment_terms: string;
  shipping_address?: string | null;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  notes?: string | null;
  terms_and_conditions?: string | null;
  revision_number: number;
  created_by?: string | null;
  created_by_email: string;
  approved_by?: string | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  acknowledged_at?: string | null;
  closed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
  items_count?: number;
  total_ordered_qty?: number;
  total_received_qty?: number;
}

export type GoodsReceiptStatus = 
  | 'draft'
  | 'received'
  | 'pending_qc'
  | 'qc_approved'
  | 'qc_rejected'
  | 'completed'
  | 'cancelled';

export type GoodsReceiptQcStatus = 
  | 'not_required'
  | 'pending_qc'
  | 'qc_approved'
  | 'qc_rejected'
  | 'partial_qc';

export interface GoodsReceiptItem {
  id: string;
  grn_id: string;
  purchase_order_item_id: string;
  sku_id: string;
  ordered_quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  quarantine_quantity: number;
  unit_id?: string | null;
  batch_number?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  requires_qc: boolean;
  qc_status: 'pending' | 'passed' | 'failed' | 'quarantine' | 'waived';
  notes?: string | null;
  created_at: string;
  // Joined SKU details
  sku_code?: string;
  variant_name?: string;
  product_name?: string;
  unit_name?: string;
  unit_short_code?: string;
}

export interface GoodsReceipt {
  id: string;
  organization_id: string;
  grn_number: string;
  purchase_order_id: string;
  purchase_order_number?: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  receiving_location_id?: string | null;
  receiving_location_name?: string | null;
  receiving_location_code?: string | null;
  received_date: string;
  received_by?: string | null;
  received_by_email: string;
  status: GoodsReceiptStatus;
  supplier_reference?: string | null;
  delivery_challan_number?: string | null;
  vehicle_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  qc_status: GoodsReceiptQcStatus;
  inventory_posted: boolean;
  inventory_posted_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: GoodsReceiptItem[];
  items_count?: number;
  total_received_qty?: number;
}

export interface ProcurementDocument {
  id: string;
  organization_id: string;
  entity_type: 'purchase_request' | 'purchase_order' | 'goods_receipt';
  entity_id: string;
  document_name: string;
  document_type: 'quotation' | 'purchase_order_pdf' | 'supplier_invoice' | 'delivery_challan' | 'coa' | 'inspection_sheet' | 'other';
  file_url: string;
  file_size_bytes?: number | null;
  uploaded_by?: string | null;
  uploaded_by_email: string;
  created_at: string;
}

export interface ProcurementSummary {
  total_purchase_requests: number;
  pending_requests_approval: number;
  open_purchase_orders: number;
  orders_awaiting_receipt: number;
  partially_received_orders: number;
  completed_orders: number;
  total_procurement_value: number;
  total_grns_created: number;
  pending_qc_grns: number;
}
