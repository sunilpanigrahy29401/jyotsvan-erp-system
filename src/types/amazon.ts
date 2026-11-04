// src/types/amazon.ts
// Phase 31: Amazon Selling Partner API (SP-API) Integration Types

import type {
  MarketplaceMarketplace,
  MarketplaceOrder,
  MarketplaceProduct,
  MarketplaceInventory,
  MarketplaceReturn,
  MarketplaceReport,
  MarketplaceSettlement,
  MarketplaceFee,
  MarketplaceEntityMapping,
  MarketplaceOverviewResponse,
} from './marketplace.ts';

export type AmazonRegion = 'na' | 'eu' | 'fe';

export interface AmazonSpApiCredentials {
  seller_id: string; // Amazon Merchant / Seller ID (e.g., "A2ABC1234XYZ")
  lwa_app_id?: string; // Login with Amazon App Client ID
  lwa_client_secret?: string; // Login with Amazon Client Secret
  lwa_refresh_token?: string; // LWA Refresh Token for authorization
  aws_access_key_id?: string; // AWS IAM User Access Key
  aws_secret_access_key?: string; // AWS IAM User Secret Key
  aws_role_arn?: string; // Optional AWS STS Role ARN for AssumeRole
  region?: AmazonRegion; // Default 'fe' for India / APAC, 'na' for North America, 'eu' for Europe
  marketplace_id?: string; // Default primary marketplace ID (e.g., "A21TJRUUN4KGV" for Amazon.in)
}

export interface AmazonConnectionConfig {
  seller_id: string;
  region: AmazonRegion;
  primary_marketplace_id: string;
  auto_sync_orders: boolean;
  auto_sync_inventory: boolean;
  sync_interval_mins: number;
  fba_enabled: boolean;
  fbm_enabled: boolean;
  settlement_currency: string;
}

export interface AmazonMarketplaceParticipation {
  marketplace: {
    id: string;
    countryCode: string;
    name: string;
    defaultCurrencyCode: string;
    defaultLanguageCode: string;
    domainName: string;
  };
  participation: {
    isParticipating: boolean;
    hasSuspendedListings: boolean;
  };
}

export type AmazonSyncEntityType =
  | 'marketplaces'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'returns'
  | 'reports'
  | 'settlements'
  | 'fees'
  | 'all';

export interface AmazonSyncRequest {
  entityType?: AmazonSyncEntityType;
  entities?: string[];
  syncType?: 'full' | 'incremental';
  sync_type?: 'full' | 'incremental';
  marketplaceId?: string;
  windowDays?: number;
}

export type {
  MarketplaceMarketplace as AmazonMarketplace,
  MarketplaceOrder as AmazonOrder,
  MarketplaceProduct as AmazonProduct,
  MarketplaceInventory as AmazonInventory,
  MarketplaceReturn as AmazonReturn,
  MarketplaceReport as AmazonReport,
  MarketplaceSettlement as AmazonSettlement,
  MarketplaceFee as AmazonFee,
  MarketplaceEntityMapping as AmazonEntityMapping,
  MarketplaceOverviewResponse as AmazonOverviewResponse,
};
