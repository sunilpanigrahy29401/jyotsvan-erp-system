// src/types/myntra.ts
// Phase 33: Myntra Partner Bridge (PPMP/Omni) & Fashion Marketplace Types

import type { IntegrationConnection } from './integrations.ts';
import type { MarketplaceOrderItem } from './marketplace.ts';

export type MyntraFulfillmentModel = 'PPMP' | 'OMNI_CHANNEL' | 'JIT' | 'DIRECT_DISPATCH';

export interface MyntraAuthCredentials {
  clientId: string;
  clientSecret: string;
  sellerPartnerId?: string;
  storeLocationId?: string;
  environment?: 'production' | 'sandbox';
}

export interface MyntraTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface MyntraApiConfig {
  clientId: string;
  clientSecret: string;
  sellerPartnerId: string;
  storeLocationId?: string;
  environment?: 'production' | 'sandbox';
  baseUrl?: string;
}

export interface MyntraCapabilityManifest {
  orders: boolean;
  orderDispatch: boolean;
  inventoryBuffer: boolean;
  catalogTaxonomy: boolean;
  returnsRTO: boolean;
  settlements: boolean;
  fashionAttributes: boolean;
  webhooks: boolean;
}

export interface MyntraOrder {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key: string;
  marketplace_id: string;
  external_order_id: string;
  order_number: string;
  purchase_date: string;
  order_status: string;
  fulfillment_channel: string;
  currency: string;
  grand_total: number;
  tax_amount?: number;
  shipping_amount?: number;
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

export interface MyntraListing {
  id: string;
  organization_id: string;
  connection_id: string;
  seller_sku: string;
  style_id: string; // Myntra Style ID / Master Article
  sku_id?: string; // Myntra Sku ID
  title: string;
  category?: string;
  brand: string;
  size?: string;
  color?: string;
  gender?: 'Unisex' | 'Men' | 'Women' | 'Kids';
  listing_price: number;
  mrp: number;
  status: string;
  fulfillment_channel: string;
  currency: string;
  raw_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MyntraInventory {
  id: string;
  organization_id: string;
  connection_id: string;
  seller_sku: string;
  style_id: string;
  fulfillment_channel: string;
  location_id?: string;
  quantity_available: number;
  quantity_reserved: number; // Safety buffer hold
  safety_buffer: number;
  quantity_total: number;
  raw_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MyntraReturn {
  id: string;
  organization_id: string;
  connection_id: string;
  external_return_id: string;
  order_id?: string;
  seller_sku: string;
  style_id?: string;
  return_type: 'RTO' | 'CUSTOMER_RETURN' | 'QUALITY_REJECT';
  return_reason?: string;
  return_status: string;
  return_date: string;
  refund_amount?: number;
  qc_verdict?: 'RESTOCKABLE' | 'DAMAGED' | 'WRONG_ITEM_RETURNED' | 'PENDING_INSPECTION';
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface MyntraPerformanceMetric {
  id: string;
  connection_id: string;
  metric_name: string;
  metric_key: string;
  metric_category: 'SLA_ADHERENCE' | 'CANCELLATION' | 'RETURNS' | 'CATALOG_QUALITY' | 'RATING';
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

export interface MyntraOverviewResponse {
  connection: IntegrationConnection;
  isConnected: boolean;
  kpis: {
    grossRevenue30Days: number;
    orders30Days: number;
    unitsSold30Days: number;
    activeListings: number;
    totalListings: number;
    availableInventoryUnits: number;
    safetyBufferUnits: number;
    pendingDispatches: number;
    pendingReturns: number;
    sellerTier: string;
    slaAdherenceRate: number;
    currency: string;
  };
  capabilities: MyntraCapabilityManifest;
  performanceMetrics: MyntraPerformanceMetric[];
  recentOrders: MyntraOrder[];
  topListings: {
    styleId: string;
    sku: string;
    title: string;
    category: string;
    revenue: number;
    unitsSold: number;
    stock: number;
    price: number;
  }[];
  inventorySummary: {
    totalUnits: number;
    inStockSkus: number;
    lowStockSkus: number;
    bufferProtectedSkus: number;
  };
  fulfillmentSummary: {
    ppmpFulfilledUnits: number;
    omniChannelUnits: number;
    onTimeDispatchRate: number;
    rtoRate: number;
  };
}

export interface MyntraSyncRequest {
  entityType?: 'orders' | 'listings' | 'inventory' | 'returns' | 'performance' | 'all';
  entities?: string[];
  syncType?: 'full' | 'incremental';
  windowDays?: number;
}
