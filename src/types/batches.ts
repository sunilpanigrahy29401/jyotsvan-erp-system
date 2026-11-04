/**
 * Batch, Lot & Traceability Engine Types & Interfaces
 * Phase 14 - Jyotsvan Enterprise Platform
 */

export type BatchType =
  | 'raw_material'
  | 'intermediate'
  | 'finished_good'
  | 'packaging'
  | 'imported'
  | 'other';

export type BatchStatus =
  | 'quarantine'
  | 'released'
  | 'hold'
  | 'rejected'
  | 'expired'
  | 'recalled'
  | 'consumed'
  | 'depleted'
  | 'in_production';

export type BatchQCStatus =
  | 'pending'
  | 'passed'
  | 'failed'
  | 'conditional'
  | 'quarantine'
  | 'exempt';

export type BatchSourceType =
  | 'grn'
  | 'production_order'
  | 'opening_stock'
  | 'stock_adjustment'
  | 'transfer'
  | 'manual';

export type BatchHoldType =
  | 'qc_hold'
  | 'regulatory_hold'
  | 'recall'
  | 'quarantine'
  | 'investigation'
  | 'customer_complaint';

export type BatchHoldSeverity = 'low' | 'medium' | 'high' | 'critical_class_1';

export type BatchHoldStatus = 'active' | 'released' | 'escalated' | 'closed';

export interface Batch {
  id: string;
  organization_id: string;
  batch_number: string;
  sku_id: string;
  batch_type: BatchType;
  status: BatchStatus;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  retest_date?: string | null;
  best_before_date?: string | null;
  initial_quantity: number;
  current_quantity: number;
  reserved_quantity: number;
  quarantine_quantity: number;
  damaged_quantity: number;
  unit_id?: string | null;
  warehouse_id?: string | null;
  location_id?: string | null;
  source_type: BatchSourceType;
  source_reference_id?: string | null;
  source_reference_number?: string | null;
  supplier_id?: string | null;
  supplier_batch_number?: string | null;
  qc_inspection_id?: string | null;
  qc_status: BatchQCStatus;
  coa_document_url?: string | null;
  storage_conditions?: string | null;
  potency_or_purity?: number | null;
  cost_per_unit?: number | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  created_by?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;

  // Joined presentation fields
  sku_code?: string;
  variant_name?: string;
  product_name?: string;
  product_code?: string;
  category_name?: string;
  unit_name?: string;
  unit_short_code?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  location_name?: string;
  location_code?: string;
  supplier_name?: string;
  supplier_code?: string;
  qc_inspection_number?: string;
  qc_overall_result?: string;

  // Computed shelf-life attributes
  days_to_expiry?: number | null;
  shelf_life_status?: 'fresh' | 'near_expiry' | 'critical' | 'expired';
  active_holds_count?: number;
}

export interface BatchGenealogyRecord {
  id: string;
  organization_id: string;
  parent_batch_id: string;
  child_batch_id: string;
  production_order_id?: string | null;
  production_order_number?: string | null;
  quantity_consumed: number;
  unit_id?: string | null;
  loss_or_scrap_quantity?: number;
  relationship_type: 'ingredient_consumed' | 'blended' | 'repackaged' | 'reworked' | 'split';
  step_sequence?: number;
  recorded_by?: string | null;
  recorded_by_email?: string | null;
  notes?: string | null;
  created_at: string;

  // Joined fields for display
  parent_batch_number?: string;
  parent_sku_code?: string;
  parent_product_name?: string;
  child_batch_number?: string;
  child_sku_code?: string;
  child_product_name?: string;
  unit_code?: string;
}

export interface BatchStatusLog {
  id: string;
  organization_id: string;
  batch_id: string;
  from_status: BatchStatus;
  to_status: BatchStatus;
  reason: string;
  justification?: string | null;
  authorized_by?: string | null;
  authorized_by_email?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface BatchHold {
  id: string;
  organization_id: string;
  hold_number: string;
  batch_id: string;
  hold_type: BatchHoldType;
  severity: BatchHoldSeverity;
  status: BatchHoldStatus;
  reason: string;
  affected_quantity: number;
  impact_scope: 'single_batch' | 'genealogy_tree' | 'entire_sku_lot';
  placed_by?: string | null;
  placed_by_email?: string | null;
  released_by?: string | null;
  released_by_email?: string | null;
  released_at?: string | null;
  release_justification?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  batch_number?: string;
  sku_code?: string;
  product_name?: string;
  warehouse_name?: string;
  unit_code?: string;
}

export interface BatchNumberingRule {
  id: string;
  organization_id: string;
  name: string;
  rule_type: 'global' | 'sku_category' | 'product_line' | 'raw_material' | 'finished_good';
  target_type?: string | null;
  target_id?: string | null;
  prefix: string;
  include_year: boolean;
  year_format: 'YYYY' | 'YY';
  include_month: boolean;
  include_day: boolean;
  include_julian_date: boolean;
  sequence_length: number;
  current_sequence: number;
  suffix?: string | null;
  separator: string;
  example_preview?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TraceabilityNode {
  id: string;
  batch_id: string;
  batch_number: string;
  batch_type: BatchType;
  status: BatchStatus;
  sku_id: string;
  sku_code: string;
  product_name: string;
  quantity: number;
  unit_code: string;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  supplier?: {
    id: string;
    name: string;
    code: string;
    po_number?: string;
    grn_number?: string;
  } | null;
  production?: {
    order_id: string;
    order_number: string;
    formulation_code?: string;
    completed_at?: string;
  } | null;
  qc?: {
    inspection_id: string;
    inspection_number: string;
    overall_result: string;
    coa_url?: string;
  } | null;
  inventory?: {
    warehouse_name: string;
    location_name?: string;
    available_qty: number;
    quarantine_qty: number;
  } | null;
  depth: number;
  direction: 'parent' | 'child' | 'root';
  children?: TraceabilityNode[];
  parents?: TraceabilityNode[];
}

export interface TraceabilitySearchResult {
  root_batch: Batch;
  direction: 'backward' | 'forward' | 'bidirectional';
  backward_tree: TraceabilityNode[]; // Ancestors (ingredients -> suppliers)
  forward_tree: TraceabilityNode[]; // Descendants (finished goods -> dispatches)
  summary: {
    total_raw_batches: number;
    total_production_orders: number;
    total_finished_batches: number;
    total_suppliers_involved: number;
    total_warehouses_affected: number;
    total_quarantined_qty: number;
    total_released_qty: number;
    active_holds_found: number;
  };
}

export interface BatchSummaryMetrics {
  total_batches: number;
  active_batches: number;
  quarantine_batches: number;
  released_batches: number;
  hold_or_recalled_batches: number;
  expired_batches: number;
  near_expiry_batches: number; // Expiring in < 30 days
  total_inventory_valuation: number;
  fefo_compliance_rate: number;
}
