// src/types/flipkart.ts
// Phase 32: Flipkart Seller API & Marketplace Engine Types

import type {
  IntegrationConnection,
  IntegrationSyncJob,
} from './integrations.ts';
import type {
  MarketplaceOrderItem,
  MarketplaceProductStatus,
  MarketplaceSettlement,
  MarketplaceFee,
} from './marketplace.ts';

export type FlipkartFulfillmentChannel = 'FLIPKART_SMART' | 'SELLER_FULFILLED' | 'AFN' | 'MFN';

export interface FlipkartAuthCredentials {
  appId: string;
  appSecret: string;
  sellerId?: string;
  locationId?: string;
  environment?: 'production' | 'sandbox';
}

export interface FlipkartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface FlipkartApiConfig {
  appId: string;
  appSecret: string;
  sellerId: string;
  locationId?: string;
  environment?: 'production' | 'sandbox';
  baseUrl?: string;
}

export interface FlipkartOrderSearchResponse {
  orderItems: any[];
  hasMore: boolean;
  nextPageUrl?: string;
}

export interface FlipkartInventoryResponse {
  sku: string;
  locations: {
    locationId: string;
    inventory: number;
    pendingInventory?: number;
  }[];
}

export interface FlipkartListingItem {
  fsn: string;
  sku: string;
  status: string;
  price: number;
  mrp: number;
  title: string;
}

export interface FlipkartDispatchShipmentRequest {
  shipmentIds: string[];
  locationId: string;
  tentativePickupDate?: string;
}

export interface FlipkartOrder {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: string;
  marketplace_id: string;
  external_order_id: string;
  order_number: string;
  purchase_date: string;
  order_status: string;
  fulfillment_channel: FlipkartFulfillmentChannel;
  currency: string;
  grand_total: number;
  tax_amount?: number;
  payment_method?: string;
  item_count: number;
  buyer_city?: string;
  buyer_state?: string;
  buyer_postal_code?: string;
  raw_metadata?: Record<string, any>;
  items?: MarketplaceOrderItem[];
  created_at: string;
  updated_at: string;
}

export type FlipkartOrderItem = MarketplaceOrderItem;

export interface FlipkartListing {
  id: string;
  organization_id: string;
  connection_id: string;
  seller_sku: string;
  asin: string; // Used as Flipkart FSN
  title: string;
  category?: string;
  listing_price: number;
  mrp?: number;
  status: string;
  fulfillment_channel: FlipkartFulfillmentChannel;
  currency: string;
  raw_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FlipkartInventory {
  id: string;
  organization_id: string;
  connection_id: string;
  seller_sku: string;
  asin: string;
  fulfillment_channel: FlipkartFulfillmentChannel;
  location_id?: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_inbound: number;
  quantity_total: number;
  raw_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FlipkartReturn {
  id: string;
  organization_id: string;
  connection_id: string;
  external_return_id: string;
  seller_sku: string;
  asin: string;
  return_reason?: string;
  return_reason_details?: string;
  return_status: string;
  return_date: string;
  refund_amount?: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface FlipkartEntityMapping {
  id: string;
  organization_id: string;
  connection_id: string;
  marketplace_sku: string;
  marketplace_asin?: string;
  jyotsvan_sku?: string;
  jyotsvan_product_id?: string;
  mapping_status: 'MAPPED' | 'UNMAPPED' | 'IGNORE';
  confidence_score?: number;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FlipkartPerformanceMetric {
  id: string;
  connection_id: string;
  metric_name: string;
  metric_key: string;
  metric_category: 'FULFILLMENT' | 'CANCELLATION' | 'RETURNS' | 'SERVICE_QUALITY' | 'RATING';
  current_value: number;
  benchmark_target: number;
  unit: string;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  period_start: string;
  period_end: string;
  historical_trend: { date: string; value: number }[];
  metadata?: Record<string, any>;
  updated_at: string;
}

export interface FlipkartOverviewResponse {
  connection: IntegrationConnection;
  isConnected: boolean;
  kpis: {
    grossRevenue30Days: number;
    orders30Days: number;
    unitsSold30Days: number;
    activeListings: number;
    totalListings: number;
    availableInventoryUnits: number;
    pendingDispatches: number;
    pendingReturns: number;
    sellerTier: string;
    sellerRating: number;
    currency: string;
  };
  performanceMetrics: FlipkartPerformanceMetric[];
  recentOrders: FlipkartOrder[];
  topListings: {
    fsn: string;
    sku: string;
    title: string;
    revenue: number;
    unitsSold: number;
    stock: number;
    price: number;
  }[];
  inventorySummary: {
    totalUnits: number;
    inStockSkus: number;
    lowStockSkus: number;
    outOfStockSkus: number;
  };
  fulfillmentSummary: {
    flipkartFulfilledUnits: number; // Flipkart Smart / FBF
    sellerFulfilledUnits: number; // Flipkart Non-Smart / Direct
    onTimeDispatchRate: number;
    slaBreachCount: number;
  };
}

export interface FlipkartSyncRequest {
  entityType?: 'orders' | 'listings' | 'inventory' | 'fulfillment' | 'returns' | 'performance' | 'all';
  entities?: string[];
  syncType?: 'full' | 'incremental';
  windowDays?: number;
}
