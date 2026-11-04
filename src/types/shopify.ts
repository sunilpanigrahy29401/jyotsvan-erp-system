// src/types/shopify.ts
// Enterprise Types for Phase 25 Shopify Integration Engine

import type { IntegrationConnection } from './integrations.ts';

export interface ShopifyShop {
  id: number | string;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  currency: string;
  money_format?: string;
  timezone: string;
  iana_timezone?: string;
  country: string;
  country_name?: string;
  plan_name?: string;
  plan_display_name?: string;
  created_at?: string;
  phone?: string;
}

export interface ShopifyVariant {
  id: number | string;
  product_id: number | string;
  title: string;
  price: string | number;
  compare_at_price?: string | number | null;
  sku: string;
  position?: number;
  inventory_item_id?: number | string;
  inventory_quantity?: number;
  barcode?: string;
  weight?: number;
  weight_unit?: string;
  requires_shipping?: boolean;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  mapping_status?: 'mapped' | 'unmapped' | 'conflict';
  internal_sku_code?: string;
  internal_product_id?: string;
}

export interface ShopifyImage {
  id: number | string;
  product_id?: number | string;
  src: string;
  alt?: string | null;
  position?: number;
  width?: number;
  height?: number;
}

export interface ShopifyProduct {
  id: number | string;
  title: string;
  handle: string;
  body_html?: string;
  vendor: string;
  product_type: string;
  tags?: string;
  status?: 'active' | 'archived' | 'draft';
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  image?: ShopifyImage | null;
  options?: { id: number | string; name: string; position: number; values: string[] }[];
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  // Augmented internal mapping status
  mapping_status?: 'mapped' | 'unmapped' | 'partial' | 'conflict';
  mapped_sku_count?: number;
  total_variant_count?: number;
}

export interface ShopifyCustomerAddress {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
  default?: boolean;
}

export interface ShopifyCustomer {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  orders_count: number;
  state: string;
  total_spent: string | number;
  currency: string;
  default_address?: ShopifyCustomerAddress;
  addresses?: ShopifyCustomerAddress[];
  tags?: string;
  created_at: string;
  updated_at: string;
  // Augmented mapping
  mapped_customer_id?: string | null;
  is_mapped?: boolean;
}

export interface ShopifyTaxLine {
  title: string;
  price: string | number;
  rate: number;
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string | number;
  type: string;
}

export interface ShopifyLineItem {
  id: number | string;
  variant_id?: number | string;
  product_id?: number | string;
  title: string;
  variant_title?: string | null;
  sku: string;
  quantity: number;
  price: string | number;
  total_discount?: string | number;
  tax_lines?: ShopifyTaxLine[];
  requires_shipping?: boolean;
  fulfillment_status?: string | null;
  // Augmented internal mapping
  internal_sku_id?: string | null;
  internal_sku_code?: string | null;
  is_sku_mapped?: boolean;
}

export interface ShopifyRefundLineItem {
  id: number | string;
  quantity: number;
  line_item_id: number | string;
  line_item?: ShopifyLineItem;
  subtotal: number | string;
  total_tax: number | string;
}

export interface ShopifyRefund {
  id: number | string;
  order_id: number | string;
  created_at: string;
  note?: string;
  refund_line_items?: ShopifyRefundLineItem[];
  transactions?: {
    id: number | string;
    amount: string | number;
    kind: string;
    status: string;
    gateway: string;
  }[];
}

export interface ShopifyOrder {
  id: number | string;
  name: string;
  order_number: number | string;
  email?: string;
  phone?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  total_price: string | number;
  subtotal_price: string | number;
  total_tax: string | number;
  total_discounts: string | number;
  total_shipping_price_set?: { shop_money: { amount: string; currency_code: string } };
  currency: string;
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided';
  fulfillment_status: 'fulfilled' | 'null' | 'partial' | 'restocked' | 'unfulfilled' | null;
  tags?: string;
  customer?: ShopifyCustomer;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyCustomerAddress;
  billing_address?: ShopifyCustomerAddress;
  discount_codes?: ShopifyDiscountCode[];
  tax_lines?: ShopifyTaxLine[];
  refunds?: ShopifyRefund[];
  // Augmented ERP status
  internal_order_id?: string | null;
  internal_order_number?: string | null;
  internal_sync_status?: 'synced' | 'pending' | 'failed' | 'unmapped_sku';
}

export interface ShopifyLocation {
  id: number | string;
  name: string;
  address1?: string;
  city?: string;
  province?: string;
  country?: string;
  country_code?: string;
  zip?: string;
  phone?: string;
  active: boolean;
  legacy?: boolean;
  // Augmented mapping
  mapped_warehouse_id?: string | null;
  mapped_warehouse_name?: string | null;
  mapped_warehouse_code?: string | null;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number | string;
  location_id: number | string;
  available: number;
  updated_at?: string;
  // Augmented
  sku?: string;
  product_title?: string;
  erp_available_stock?: number;
  in_sync?: boolean;
}

export interface IntegrationEntityMapping {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: string;
  entity_type: 'product' | 'variant' | 'sku' | 'customer' | 'order' | 'refund' | 'discount' | 'location';
  external_id: string;
  internal_id: string;
  external_identifier?: string | null;
  internal_identifier?: string | null;
  mapping_status: 'mapped' | 'unmapped' | 'conflict';
  metadata: Record<string, unknown>;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifySyncException {
  id: string;
  organization_id: string;
  connection_id: string;
  entity_type: 'sku' | 'order' | 'location' | 'customer';
  external_id: string;
  external_identifier?: string | null;
  error_code: string;
  exception_code?: string;
  error_message: string;
  raw_payload: Record<string, unknown>;
  status: 'pending' | 'resolved' | 'ignored';
  resolution_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyOverviewMetrics {
  synced_products: number;
  mapped_skus: number;
  unmapped_skus: number;
  synced_orders: number;
  synced_customers: number;
  total_inventory_items: number;
  pending_syncs: number;
  sync_errors: number;
  total_revenue_inr: number;
  orders_this_month: number;
  last_synced_at?: string | null;
  sync_health: 'healthy' | 'warning' | 'error' | 'disconnected';
}

export interface ShopifyOverviewResponse {
  connection: IntegrationConnection;
  shop: ShopifyShop | null;
  metrics: ShopifyOverviewMetrics;
  recent_activity: {
    id: string;
    type: 'sync' | 'webhook' | 'order' | 'inventory';
    title: string;
    description: string;
    status: 'success' | 'warning' | 'error' | 'info';
    timestamp: string;
  }[];
  recent_orders: ShopifyOrder[];
}

export interface ShopifySyncRequest {
  entity_types?: ('all' | 'products' | 'orders' | 'customers' | 'inventory' | 'refunds')[];
  sync_type?: 'full' | 'incremental' | 'historical';
  date_from?: string;
  date_to?: string;
  limit?: number;
}
