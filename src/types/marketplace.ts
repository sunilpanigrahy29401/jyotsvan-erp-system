// src/types/marketplace.ts
// Phase 30 & 31: Generic Marketplace Engine & Normalized Multi-Channel Commerce Types

export type MarketplaceProviderKey = 'amazon' | 'flipkart' | 'myntra' | 'meesho' | 'nykaa' | string;

export type MarketplaceFulfillmentChannel = 'AFN' | 'MFN' | 'FBA' | 'FBM' | 'SELLER_FULFILLED' | 'MARKETPLACE_FULFILLED' | 'HYBRID';

export type MarketplaceOrderStatus =
  | 'PENDING'
  | 'UNSHIPPED'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'UNKNOWN';

export type MarketplaceProductStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'SUPPRESSED' | 'ARCHIVED' | 'OUT_OF_STOCK' | 'BLOCKED';

export type MappingStatus = 'mapped' | 'unmapped' | 'auto_matched' | 'ignored';

export interface MarketplaceMarketplace {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  marketplace_id: string; // e.g. "A21TJRUUN4KGV" for Amazon.in
  country_code: string; // e.g. "IN", "US"
  name: string; // e.g. "Amazon India"
  currency: string; // e.g. "INR"
  domain_name?: string; // e.g. "amazon.in"
  default_language_code?: string;
  is_participating: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceOrder {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  marketplace_id: string;
  external_order_id: string; // e.g. "402-1234567-8901234"
  order_number?: string;
  purchase_date: string;
  last_update_date?: string;
  order_status: MarketplaceOrderStatus;
  fulfillment_channel: MarketplaceFulfillmentChannel;
  sales_channel?: string;
  ship_service_level?: string;
  currency: string;
  order_total: number;
  items_subtotal: number;
  shipping_price: number;
  tax_total: number;
  discount_total: number;
  buyer_email?: string | null;
  buyer_name?: string | null;
  shipping_address?: {
    name?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state_or_region?: string;
    postal_code?: string;
    country_code?: string;
    phone?: string;
  } | null;
  is_business_order?: boolean;
  is_prime?: boolean;
  is_replacement_order?: boolean;
  raw_metadata?: Record<string, unknown>;
  items?: MarketplaceOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface MarketplaceOrderItem {
  id: string;
  organization_id: string;
  connection_id: string;
  order_id: string;
  external_order_id: string;
  external_order_item_id: string;
  seller_sku: string;
  asin?: string | null;
  title: string;
  quantity_ordered: number;
  quantity_shipped: number;
  item_price: number;
  item_tax: number;
  shipping_price: number;
  shipping_tax: number;
  item_discount: number;
  promotion_ids?: string[];
  condition_id?: string;
  raw_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceProduct {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  marketplace_id: string;
  external_product_id: string;
  seller_sku: string;
  asin?: string | null;
  fnsku?: string | null;
  title: string;
  description?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  item_type?: string | null;
  product_status: MarketplaceProductStatus;
  listing_price: number;
  currency: string;
  main_image_url?: string | null;
  product_url?: string | null;
  fulfillment_channel?: MarketplaceFulfillmentChannel;
  attributes?: Record<string, unknown>;
  raw_metadata?: Record<string, unknown>;
  mapping?: MarketplaceEntityMapping | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceInventory {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  marketplace_id: string;
  seller_sku: string;
  asin?: string | null;
  fnsku?: string | null;
  fulfillment_channel: MarketplaceFulfillmentChannel;
  available_quantity: number;
  reserved_quantity: number;
  inbound_working: number;
  inbound_shipped: number;
  inbound_receiving: number;
  total_quantity: number;
  condition?: string;
  last_updated_at?: string;
  raw_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceReturn {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  marketplace_id: string;
  external_return_id: string;
  order_id?: string;
  order_item_id?: string;
  seller_sku: string;
  asin?: string | null;
  quantity: number;
  return_reason?: string;
  return_reason_details?: string;
  return_status: string; // 'COMPLETED', 'AUTHORIZED', 'IN_TRANSIT', 'CANCELLED'
  return_date: string;
  refund_amount?: number;
  currency: string;
  fulfillment_center_id?: string;
  raw_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceReport {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  report_id: string;
  report_type: string;
  marketplace_id?: string;
  data_start_time?: string;
  data_end_time?: string;
  report_status: 'SUBMITTED' | 'IN_QUEUE' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'FATAL';
  document_id?: string;
  processing_status: 'PENDING' | 'PARSING' | 'COMPLETED' | 'FAILED';
  records_parsed?: number;
  generated_at?: string;
  raw_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceSettlement {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  marketplace_id: string;
  settlement_id: string;
  settlement_start_date: string;
  settlement_end_date: string;
  deposit_date?: string;
  currency: string;
  total_amount: number;
  gross_sales_amount: number;
  refunds_amount: number;
  fees_amount: number;
  adjustments_amount: number;
  taxes_amount: number;
  status: 'PENDING' | 'CLOSED' | 'PROCESSING';
  raw_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceFee {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  marketplace_id?: string;
  settlement_id?: string;
  external_order_id?: string;
  seller_sku?: string;
  fee_type: string; // 'ReferralFee', 'FBAWeightHandling', 'ClosingFee', 'PickAndPack', 'StorageFee', 'RefundCommission', 'ServiceFee'
  fee_amount: number;
  currency: string;
  description?: string;
  posted_date: string;
  raw_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceEntityMapping {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  entity_type: 'sku' | 'product' | 'category';
  marketplace_sku: string;
  marketplace_asin?: string | null;
  marketplace_title?: string | null;
  jyotsvan_sku?: string | null;
  jyotsvan_product_id?: string | null;
  jyotsvan_product_name?: string | null;
  mapping_status: MappingStatus;
  notes?: string | null;
  mapped_by?: string | null;
  mapped_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceSyncCheckpoint {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: MarketplaceProviderKey;
  entity_type: string;
  marketplace_id?: string;
  last_sync_at: string;
  last_checkpoint_token?: string | null;
  cursor?: string | null;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'RUNNING';
  created_at: string;
  updated_at: string;
}

export interface MarketplaceOverviewResponse {
  isConnected: boolean;
  connection: any;
  marketplaces: MarketplaceMarketplace[];
  activeMarketplace: MarketplaceMarketplace | null;
  kpis: {
    ordersTotal: number;
    orders30Days: number;
    grossRevenue30Days: number;
    unitsSold30Days: number;
    activeListings: number;
    totalListings: number;
    fbaStockUnits: number;
    fbmStockUnits: number;
    pendingReturns: number;
    fees30Days: number;
    netSettlement30Days: number;
    currency: string;
  };
  recentOrders: MarketplaceOrder[];
  topProducts: {
    sku: string;
    asin?: string;
    title: string;
    unitsSold: number;
    revenue: number;
    stock: number;
  }[];
  inventorySummary: {
    fbaUnits: number;
    fbmUnits: number;
    reservedUnits: number;
    inboundUnits: number;
    lowStockSkus: number;
  };
  capabilities: Record<string, boolean>;
  syncStatus: {
    orders: string;
    products: string;
    inventory: string;
    returns: string;
    reports: string;
    settlements: string;
    fees: string;
    lastSyncedAt: string | null;
  };
}
