export type ProductionOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'reserved'
  | 'in_production'
  | 'completed'
  | 'on_hold'
  | 'cancelled'
  | 'failed';

export type ProductionPlanStatus =
  | 'draft'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ProductionMaterialStatus =
  | 'pending'
  | 'available'
  | 'partial_shortage'
  | 'critical_shortage'
  | 'reserved'
  | 'partially_issued'
  | 'fully_issued';

export type ProductionQCStatus =
  | 'not_required'
  | 'pending'
  | 'passed'
  | 'rejected'
  | 'quarantined';

export type WastageCategory =
  | 'Process Loss'
  | 'Spillage'
  | 'Damaged Material'
  | 'Rejection'
  | 'Evaporation'
  | 'Packaging Loss'
  | 'Equipment Cleaning'
  | 'Other';

export interface ProductionPlan {
  id: string;
  organization_id: string;
  plan_number: string;
  title: string;
  planned_date: string;
  target_completion_date?: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  status: ProductionPlanStatus;
  notes?: string;
  orders_count?: number;
  total_orders_count?: number;
  total_planned_quantity?: number;
  created_by?: string;
  created_by_email?: string;
  approved_by?: string;
  approved_by_email?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionOrderComponent {
  id: string;
  organization_id: string;
  production_order_id: string;
  component_product_id?: string;
  component_sku_id: string;
  component_sku_code?: string;
  component_sku_name?: string;
  component_product_name?: string;
  component_type: string;
  required_quantity: number;
  required_unit_id: string;
  required_unit_code?: string;
  wastage_allowance_percentage: number;
  planned_quantity: number;
  reserved_quantity: number;
  issued_quantity: number;
  actual_consumed_quantity: number;
  consumed_quantity?: number;
  returned_quantity: number;
  remaining_issue_quantity?: number;
  net_consumed_quantity?: number;
  variance_quantity?: number;
  variance_percentage?: number;
  sequence_order: number;
  is_substitute: boolean;
  substituted_for_sku_id?: string;
  standard_unit_cost?: number;
  planned_cost?: number;
  actual_cost?: number;
  total_planned_cost?: number;
  total_actual_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionMaterialIssue {
  id: string;
  organization_id: string;
  issue_number: string;
  production_order_id: string;
  component_id: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  component_sku_name?: string;
  component_sku_code?: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  batch_id?: string;
  batch_number?: string;
  quantity: number;
  unit_id: string;
  unit_code?: string;
  reservation_id?: string;
  inventory_movement_id?: string;
  issued_by?: string;
  issued_by_email?: string;
  notes?: string;
  idempotency_key?: string;
  created_at: string;
}

export interface ProductionMaterialReturn {
  id: string;
  organization_id: string;
  return_number: string;
  production_order_id: string;
  component_id: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  component_sku_name?: string;
  component_sku_code?: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  quantity: number;
  unit_id: string;
  unit_code?: string;
  inventory_movement_id?: string;
  returned_by?: string;
  returned_by_email?: string;
  reason: string;
  notes?: string;
  idempotency_key?: string;
  created_at: string;
}

export interface ProductionOutput {
  id: string;
  organization_id: string;
  output_number: string;
  production_order_id: string;
  sku_id: string;
  sku_code?: string;
  sku_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  batch_number: string;
  quantity: number;
  unit_id: string;
  unit_code?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  inventory_stock_type: 'quarantine' | 'available';
  inventory_movement_id?: string;
  qc_inspection_id?: string;
  qc_inspection_number?: string;
  qc_overall_result?: string;
  qc_status?: string;
  operator_user_id?: string;
  operator_email?: string;
  recorded_by_email?: string;
  notes?: string;
  idempotency_key?: string;
  created_at: string;
}

export interface ProductionWastage {
  id: string;
  organization_id: string;
  production_order_id: string;
  category: WastageCategory;
  quantity: number;
  unit_id: string;
  unit_code?: string;
  sku_id?: string;
  sku_code?: string;
  sku_name?: string;
  reason: string;
  recorded_by?: string;
  recorded_by_email?: string;
  notes?: string;
  created_at: string;
}

export interface ProductionOrder {
  id: string;
  organization_id: string;
  production_order_number: string;
  production_plan_id?: string;
  production_plan_number?: string;
  plan_number?: string;
  formulation_id: string;
  formulation_code_snapshot: string;
  formulation_name_snapshot: string;
  formulation_code?: string;
  formulation_name?: string;
  formulation_version: string;
  finished_product_id?: string;
  finished_product_name?: string;
  finished_sku_id: string;
  finished_sku_code: string;
  finished_sku_name: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  target_location_id?: string;
  target_location_name?: string;
  planned_quantity: number;
  planned_unit_id: string;
  planned_unit_code?: string;
  unit_code?: string;
  unit_id?: string;
  scaling_ratio: number;
  expected_yield: number;
  expected_yield_quantity?: number;
  expected_yield_unit_id: string;
  expected_yield_unit_code?: string;
  expected_wastage_quantity: number;
  actual_output_quantity: number;
  actual_wastage_quantity: number;
  actual_rejected_quantity: number;
  yield_percentage?: number;
  actual_yield_percentage?: number;
  yield_variance_quantity?: number;
  yield_variance_percentage?: number;
  wastage_variance_quantity?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status: ProductionOrderStatus;
  material_status: ProductionMaterialStatus;
  qc_status: ProductionQCStatus;
  qc_template_id?: string;
  qc_template_name?: string;
  qc_inspection_id?: string;
  qc_inspection_number?: string;
  production_batch_number?: string;
  batch_number?: string;
  is_on_hold?: boolean;
  priority?: string;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  approved_by?: string;
  approved_by_email?: string;
  approved_at?: string;
  completed_by?: string;
  completed_by_email?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  components?: ProductionOrderComponent[];
  issues?: ProductionMaterialIssue[];
  material_issues?: ProductionMaterialIssue[];
  returns?: ProductionMaterialReturn[];
  material_returns?: ProductionMaterialReturn[];
  outputs?: ProductionOutput[];
  wastages?: ProductionWastage[];
}

export interface MaterialAvailabilityItem {
  component_id: string;
  sku_id: string;
  sku_code: string;
  sku_name: string;
  component_type: string;
  required_quantity: number;
  planned_quantity: number;
  unit_code: string;
  warehouse_id: string;
  warehouse_name: string;
  available_in_warehouse: number;
  reserved_in_warehouse: number;
  total_in_warehouse: number;
  already_reserved_for_order: number;
  already_issued_for_order: number;
  shortage_quantity: number;
  status: 'available' | 'partial_shortage' | 'critical_shortage' | 'fully_reserved' | 'fully_issued';
  standard_unit_cost: number;
  estimated_cost: number;
}

export interface MaterialAvailabilityReport {
  order_id: string;
  production_order_number: string;
  warehouse_id: string;
  warehouse_name: string;
  overall_status: 'ready' | 'partial_shortage' | 'critical_shortage' | 'reserved' | 'issued';
  items: MaterialAvailabilityItem[];
  total_required_cost: number;
  total_shortage_items: number;
}

export interface ProductionSummaryMetrics {
  open_orders: number;
  in_production: number;
  in_production_orders?: number;
  total_orders?: number;
  completed_today: number;
  pending_approval: number;
  material_shortages: number;
  orders_on_hold: number;
  avg_yield_variance_percentage: number;
  avg_wastage_variance_percentage: number;
  total_planned_volume_month: number;
  total_actual_volume_month: number;
  total_planned_volume?: number;
  total_actual_volume?: number;
  average_yield_pct?: number;
  allocated_orders?: number;
  total_wastage_quantity?: number;
}

export interface CreateProductionOrderPayload {
  finished_sku_id?: string;
  finishedSkuId?: string;
  formulation_id?: string;
  formulationId?: string;
  formulation_version?: string;
  formulationVersion?: string;
  planned_quantity?: number;
  plannedQuantity?: number;
  warehouse_id?: string;
  warehouseId?: string;
  target_location_id?: string;
  targetLocationId?: string;
  planned_start_date?: string;
  plannedStartDate?: string;
  planned_end_date?: string;
  plannedEndDate?: string;
  production_plan_id?: string;
  productionPlanId?: string;
  planId?: string;
  priority?: string;
  production_batch_number?: string;
  batchNumber?: string;
  qc_template_id?: string;
  qcTemplateId?: string;
  notes?: string;
}

export interface CreateProductionPlanPayload {
  title: string;
  planned_date?: string;
  plannedDate?: string;
  target_completion_date?: string;
  targetCompletionDate?: string;
  warehouse_id?: string;
  warehouseId?: string;
  notes?: string;
  order_ids?: string[];
}
