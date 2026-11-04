/**
 * Jyotsvan Enterprise Platform - Phase 6 Product & SKU Master Types
 * Canonical Product Identity, Multi-Variant SKUs, Hierarchical Categories,
 * Media Assets, Quality Documents, and External Marketplace Mappings.
 */

export type ProductType =
  | 'finished_good'
  | 'raw_material'
  | 'packaging_material'
  | 'semi_finished_good'
  | 'consumable'
  | 'service';

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'archived';

export type ExternalPlatform = 'shopify' | 'amazon' | 'flipkart' | 'myntra' | 'custom';

export type MappingStatus = 'active' | 'inactive' | 'paused' | 'sync_error';

export type DocumentType =
  | 'spec_sheet'
  | 'coa'
  | 'certificate'
  | 'artwork'
  | 'compliance'
  | 'other';

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string | null;
  parent_category_id?: string | null;
  parent_name?: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  product_count?: number;
  children?: Category[];
}

export interface SKU {
  id: string;
  organization_id: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  sku: string;
  variant_name: string;
  barcode?: string | null;
  unit_id?: string | null;
  unit_name?: string | null;
  pack_size: number;
  pack_unit: string;
  net_weight?: number | null;
  gross_weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  cost_price: number;
  selling_price: number;
  mrp: number;
  tax_rate: number;
  tax_code?: string | null;
  reorder_level: number;
  reorder_quantity: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  external_mappings?: ExternalSKUMapping[];
}

export interface ProductImage {
  id: string;
  organization_id: string;
  product_id: string;
  sku_id?: string | null;
  storage_path: string;
  public_url: string;
  alt_text?: string | null;
  is_primary: boolean;
  display_order: number;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProductDocument {
  id: string;
  organization_id: string;
  product_id: string;
  title: string;
  document_type: DocumentType;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  storage_path: string;
  public_url?: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ExternalSKUMapping {
  id: string;
  organization_id: string;
  product_id: string;
  sku_id: string;
  sku_code?: string;
  variant_name?: string;
  product_name?: string;
  platform: ExternalPlatform;
  external_product_id?: string | null;
  external_variant_id?: string | null;
  external_sku: string;
  external_identifier?: string | null;
  status: MappingStatus;
  last_synced_at?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  category_id?: string | null;
  category_name?: string | null;
  product_code: string;
  name: string;
  short_name?: string | null;
  description?: string | null;
  brand: string;
  product_type: ProductType;
  status: ProductStatus;
  sku?: string | null;
  skus_count?: number;
  unit?: string | null;
  unit_id?: string | null;
  cost_price: number;
  selling_price: number;
  mrp: number;
  tax_rate: number;
  tax_code?: string | null;
  tax_category?: string | null;
  packaging_type?: string | null;
  units_per_case?: number;
  case_weight?: number | null;
  reorder_level: number;
  reorder_quantity: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  requires_batch_tracking: boolean;
  requires_expiry_tracking: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  skus?: SKU[];
  images?: ProductImage[];
  documents?: ProductDocument[];
  external_mappings?: ExternalSKUMapping[];
}

export interface ProductListParams {
  organizationId?: string;
  query?: string;
  categoryId?: string;
  productType?: ProductType | 'all';
  status?: ProductStatus | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'product_code' | 'created_at' | 'cost_price' | 'selling_price' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
