// src/types/sales-orders.ts
// Enterprise Sales Orders Type Definitions (Phase 18)

export type OrderType =
  | 'standard'
  | 'distributor_order'
  | 'retailer_order'
  | 'direct_business_order'
  | 'field_sales_order'
  | 'manual_order';

export type CustomerType = 'distributor' | 'retailer' | 'direct_customer';

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'reserved'
  | 'partially_dispatched'
  | 'dispatched'
  | 'completed'
  | 'cancelled';

export type CreditStatus = 'approved' | 'within_limit' | 'exceeds_limit' | 'on_hold' | 'overridden' | 'waived';

export type InventoryStatus =
  | 'pending'
  | 'available'
  | 'partially_reserved'
  | 'reserved'
  | 'shortage'
  | 'backordered';

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'partially_reserved'
  | 'reserved'
  | 'picking'
  | 'picked'
  | 'partially_dispatched'
  | 'dispatched'
  | 'completed';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export type ReturnReason =
  | 'damaged'
  | 'wrong_product'
  | 'quality_issue'
  | 'expired'
  | 'excess'
  | 'other';

export type ReturnCondition = 'unopened' | 'damaged' | 'expired' | 'opened_usable' | 'opened_intact';

export type ReturnStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'received'
  | 'quarantined'
  | 'qc_passed'
  | 'qc_rejected'
  | 'completed'
  | 'cancelled';

export interface SalesOrderItem {
  id: string;
  organization_id: string;
  sales_order_id: string;
  product_id: string;
  sku_id: string;
  product_name_snapshot: string;
  sku_code_snapshot: string;
  variant_name_snapshot?: string;
  ordered_quantity: number;
  uom: string;
  unit_id?: string;
  unit_price: number;
  gross_amount: number;
  discount_pct: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  net_amount: number;
  reserved_quantity: number;
  picked_quantity: number;
  dispatched_quantity: number;
  fulfilled_quantity: number;
  returned_quantity: number;
  cancelled_quantity: number;
  remaining_quantity: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SalesOrder {
  id: string;
  organization_id: string;
  order_number: string;
  order_type: OrderType;
  customer_type: CustomerType;
  distributor_id?: string | null;
  retailer_id?: string | null;
  customer_name: string;
  customer_code?: string;
  customer_reference?: string;
  order_date: string;
  requested_delivery_date?: string | null;
  warehouse_id: string;
  warehouse_name?: string;
  source_c_and_f_id?: string | null;
  cf_name?: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  order_discount_pct?: number;
  order_discount_amount?: number;
  taxable_amount: number;
  tax_total: number;
  grand_total: number;
  rounding_adjustment: number;
  is_interstate?: boolean;
  cgst_total?: number;
  sgst_total?: number;
  igst_total?: number;
  credit_status: CreditStatus;
  credit_check_status?: CreditStatus;
  credit_limit_snapshot?: number;
  credit_exposure_snapshot?: number;
  credit_override_reason?: string;
  credit_override_by?: string;
  credit_override_at?: string;
  inventory_status: InventoryStatus;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  status: OrderStatus;
  notes?: string;
  internal_notes?: string;
  billing_address?: any;
  shipping_address?: any;
  created_by?: string;
  created_by_email: string;
  approved_by?: string;
  approved_by_email?: string;
  approved_at?: string;
  cancelled_by?: string;
  cancelled_by_email?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  items?: SalesOrderItem[];
  dispatches?: SalesOrderDispatch[];
  reservations?: SalesOrderReservation[];
  returns?: SalesReturn[];
  history?: SalesOrderStatusHistory[];
  audit_logs?: any[];
}

export interface SalesOrderStatusHistory {
  id: string;
  organization_id: string;
  sales_order_id: string;
  old_status?: string | null;
  new_status: string;
  changed_by?: string;
  changed_by_email: string;
  reason?: string;
  metadata?: any;
  created_at: string;
}

export interface SalesOrderReservation {
  id: string;
  organization_id: string;
  sales_order_id: string;
  sales_order_item_id: string;
  stock_reservation_id?: string;
  sku_id: string;
  sku_code?: string;
  product_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  batch_id?: string;
  batch_number?: string;
  reserved_quantity: number;
  quantity?: number;
  status: 'active' | 'reserved' | 'picked' | 'dispatched' | 'released';
  created_at: string;
  updated_at: string;
}

export interface SalesOrderPickItem {
  id: string;
  organization_id: string;
  sales_order_id: string;
  sales_order_item_id: string;
  sku_id: string;
  warehouse_id: string;
  location_id?: string;
  batch_id?: string;
  batch_number?: string;
  picked_quantity: number;
  picked_by?: string;
  picked_by_email: string;
  picked_at: string;
  status: 'picked' | 'staged' | 'dispatched' | 'cancelled';
}

export interface SalesOrderDispatch {
  id: string;
  organization_id: string;
  dispatch_number: string;
  sales_order_id: string;
  order_number?: string;
  customer_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  transporter_name?: string;
  tracking_number?: string;
  vehicle_number?: string;
  e_way_bill_number?: string;
  dispatch_date: string;
  dispatched_by?: string;
  dispatched_by_email: string;
  status: 'dispatched' | 'in_transit' | 'delivered' | 'returned';
  notes?: string;
  created_at: string;
  items?: SalesOrderDispatchItem[];
}

export interface SalesOrderDispatchItem {
  id: string;
  organization_id: string;
  dispatch_id: string;
  sales_order_id: string;
  sales_order_item_id: string;
  sku_id: string;
  sku_code?: string;
  product_name?: string;
  batch_id?: string;
  batch_number?: string;
  dispatched_quantity: number;
  movement_id?: string;
  created_at: string;
}

export interface SalesReturn {
  id: string;
  organization_id: string;
  return_number: string;
  sales_order_id: string;
  order_number?: string;
  customer_type: CustomerType;
  distributor_id?: string;
  retailer_id?: string;
  customer_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  return_date: string;
  reason: ReturnReason;
  condition: ReturnCondition;
  qc_required: boolean;
  qc_inspection_id?: string;
  status: ReturnStatus;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  total_refund_amount?: number;
  total_returned_quantity?: number;
  notes?: string;
  created_by?: string;
  created_by_email: string;
  approved_by?: string;
  approved_by_email?: string;
  approved_at?: string;
  received_by?: string;
  received_by_email?: string;
  received_at?: string;
  created_at: string;
  updated_at: string;
  items?: SalesReturnItem[];
}

export interface SalesReturnItem {
  id: string;
  organization_id: string;
  sales_return_id: string;
  sales_order_item_id?: string;
  sku_id: string;
  sku_code?: string;
  product_name?: string;
  batch_id?: string;
  batch_number?: string;
  returned_quantity: number;
  unit_price: number;
  tax_amount: number;
  total_amount: number;
  disposition: 'restock_available' | 'quarantine' | 'scrap' | 'return_to_vendor';
  movement_id?: string;
  notes?: string;
  created_at: string;
}

export interface SalesOrderSummaryMetrics {
  totalOrders: number;
  totalOrderValue: number;
  total_orders?: number;
  total_order_value?: number;
  orders_by_status?: Record<string, number>;
  draftOrders: number;
  pendingApproval: number;
  approvedOrders: number;
  reservedOrders: number;
  partiallyDispatched: number;
  completedOrders: number;
  cancelledOrders: number;
  backorderedOrders: number;
  totalActiveReturns: number;
  totalReturnsValue: number;
}

export interface PricingResolutionItemInput {
  sku_id: string;
  quantity: number;
  custom_unit_price?: number;
  discount_pct?: number;
}

export interface PricingCalculationResult {
  sku_id: string;
  product_id: string;
  product_name: string;
  sku_code: string;
  variant_name?: string;
  uom: string;
  unit_id?: string;
  standard_price: number;
  resolved_unit_price: number;
  price_source: 'custom_override' | 'contract_assortment' | 'price_tier' | 'standard_mrp';
  quantity: number;
  gross_amount: number;
  discount_pct: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  net_amount: number;
}

export interface PricingCalculationSummary {
  items: PricingCalculationResult[];
  subtotal: number;
  item_discount_total: number;
  order_discount_pct: number;
  order_discount_amount: number;
  total_discount: number;
  taxable_amount: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  tax_total: number;
  rounding_adjustment: number;
  grand_total: number;
  is_interstate: boolean;
}

export interface CreditEvaluationResult {
  customer_id: string;
  customer_name: string;
  customer_type: CustomerType;
  credit_limit: number;
  current_outstanding: number;
  credit_hold: boolean;
  credit_hold_reason?: string;
  order_amount: number;
  projected_exposure: number;
  available_credit: number;
  status: CreditStatus;
  requires_override: boolean;
  warning_message?: string;
}

export interface SkuAvailabilityResult {
  sku_id: string;
  sku_code: string;
  product_name: string;
  uom: string;
  ordered_quantity: number;
  already_reserved_quantity: number;
  warehouse_available_quantity: number;
  allocatable_quantity: number;
  shortage_quantity: number;
  is_fully_available: boolean;
  available_batches: {
    batch_id: string;
    batch_number: string;
    manufacturing_date?: string;
    expiry_date?: string;
    available_quantity: number;
    qc_status: string;
    location_id?: string;
    location_code?: string;
  }[];
}

export interface InvoiceHandoffData {
  order_id: string;
  order_number: string;
  order_date: string;
  customer_type: CustomerType;
  customer_id?: string;
  customer_name: string;
  customer_code?: string;
  customer_gstin?: string;
  billing_address?: any;
  shipping_address?: any;
  warehouse_id: string;
  warehouse_name: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  taxable_amount: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  tax_total: number;
  grand_total: number;
  rounding_adjustment: number;
  fulfillment_status: FulfillmentStatus;
  items: {
    sku_id: string;
    sku_code: string;
    product_name: string;
    ordered_quantity: number;
    fulfilled_quantity: number;
    unit_price: number;
    tax_rate: number;
    taxable_amount: number;
    tax_amount: number;
    net_amount: number;
  }[];
  dispatches: {
    dispatch_number: string;
    dispatch_date: string;
    transporter_name?: string;
    tracking_number?: string;
    vehicle_number?: string;
    e_way_bill_number?: string;
  }[];
}
