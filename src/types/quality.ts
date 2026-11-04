export type QCParameterType = 'numeric' | 'text' | 'boolean' | 'pass_fail' | 'selection' | 'percentage' | 'date';
export type QCInspectionType = 'incoming' | 'in_process' | 'finished_good' | 're_inspection' | 'other';
export type QCInspectionStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'quarantine'
  | 'released'
  | 'cancelled';
export type QCEvaluationResult = 'pass' | 'fail' | 'conditional' | 'pending' | 'indeterminate';
export type QCDecisionType = 'approved' | 'rejected' | 'quarantine' | 'conditional_approval';

export interface QCParameter {
  id: string;
  organization_id: string;
  parameter_code: string;
  parameter_name: string;
  description?: string | null;
  parameter_type: QCParameterType;
  unit_id?: string | null;
  unit_code?: string | null;
  unit_name?: string | null;
  minimum_value?: number | null;
  maximum_value?: number | null;
  target_value?: number | null;
  allowed_values?: string[] | null;
  test_method?: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface QCTemplateParameter {
  id: string;
  template_id: string;
  parameter_id: string;
  sequence_order: number;
  is_mandatory: boolean;
  override_min?: number | null;
  override_max?: number | null;
  override_target?: number | null;
  override_allowed_values?: string[] | null;
  test_method?: string | null;
  notes?: string | null;
  // Joined parameter details
  parameter_code: string;
  parameter_name: string;
  parameter_type: QCParameterType;
  unit_id?: string | null;
  unit_code?: string | null;
  default_min?: number | null;
  default_max?: number | null;
  default_target?: number | null;
  default_allowed_values?: string[] | null;
}

export interface QCTemplate {
  id: string;
  organization_id: string;
  template_code: string;
  name: string;
  description?: string | null;
  category: 'incoming_material' | 'in_process' | 'finished_good' | 'packaging' | 'general';
  version: number;
  is_active: boolean;
  status: 'active' | 'inactive' | 'archived';
  parameters_count?: number;
  parameters?: QCTemplateParameter[];
  created_at: string;
  updated_at: string;
}

export interface QCInspectionItem {
  id: string;
  inspection_id: string;
  parameter_id?: string | null;
  parameter_code_snapshot: string;
  parameter_name_snapshot: string;
  parameter_type_snapshot: QCParameterType;
  unit_id?: string | null;
  unit_code_snapshot?: string | null;
  expected_value?: string | null;
  minimum_value?: number | null;
  maximum_value?: number | null;
  target_value?: number | null;
  allowed_values_snapshot?: string[] | null;
  test_method_snapshot?: string | null;
  is_mandatory: boolean;
  sequence_order: number;
  actual_value?: number | null;
  text_result?: string | null;
  boolean_result?: boolean | null;
  selection_result?: string | null;
  auto_evaluation: QCEvaluationResult;
  evaluated_result: QCEvaluationResult;
  is_overridden: boolean;
  override_reason?: string | null;
  overridden_by?: string | null;
  overridden_by_email?: string | null;
  overridden_at?: string | null;
  remarks?: string | null;
  tested_by?: string | null;
  tested_by_email?: string | null;
  tested_at?: string | null;
  created_at: string;
}

export interface QCDecision {
  id: string;
  organization_id: string;
  inspection_id: string;
  decision: QCDecisionType;
  rejection_reason_code?: string | null;
  decision_reason?: string | null;
  comments?: string | null;
  has_override: boolean;
  override_justification?: string | null;
  accepted_quantity: number;
  rejected_quantity: number;
  quarantine_quantity: number;
  decided_by?: string | null;
  decided_by_email: string;
  decision_date: string;
  inventory_action_status: 'completed' | 'pending' | 'failed' | 'not_applicable';
  inventory_movement_ids?: string[] | null;
  created_at: string;
}

export interface QCDocument {
  id: string;
  organization_id: string;
  inspection_id: string;
  document_name: string;
  document_type: 'coa' | 'lab_report' | 'inspection_photo' | 'supplier_certificate' | 'ncr_report' | 'other';
  file_url: string;
  file_size_bytes?: number | null;
  uploaded_by?: string | null;
  uploaded_by_email: string;
  created_at: string;
}

export interface QCInspection {
  id: string;
  organization_id: string;
  inspection_number: string;
  source_type: 'goods_receipt' | 'production_batch' | 'inventory_lot' | 'manual';
  source_id: string;
  source_item_id?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_code?: string | null;
  sku_id: string;
  sku_code?: string | null;
  sku_name?: string | null;
  product_name?: string | null;
  warehouse_id: string;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  batch_number?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  received_quantity: number;
  sample_quantity: number;
  unit_id?: string | null;
  unit_code?: string | null;
  template_id?: string | null;
  template_name?: string | null;
  template_code?: string | null;
  template_version_snapshot: number;
  inspection_type: QCInspectionType;
  status: QCInspectionStatus;
  overall_result: QCEvaluationResult;
  assigned_to?: string | null;
  assigned_to_email?: string | null;
  inspected_by?: string | null;
  inspected_by_email?: string | null;
  parent_inspection_id?: string | null;
  parent_inspection_number?: string | null;
  is_reinspection: boolean;
  reinspection_reason?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  inventory_released: boolean;
  inventory_movement_id?: string | null;
  created_by?: string | null;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  items?: QCInspectionItem[];
  decision?: QCDecision | null;
  documents?: QCDocument[];
}

export interface QCSummaryMetrics {
  total_inspections: number;
  pending_inspections: number;
  in_progress_inspections: number;
  under_review_inspections: number;
  approved_inspections: number;
  rejected_inspections: number;
  quarantine_inspections: number;
  re_inspections_count: number;
  pass_rate_percentage: number;
  avg_inspection_time_hours: number;
}

export interface SupplierQualityReport {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  total_inspections: number;
  passed_count: number;
  failed_count: number;
  quarantine_count: number;
  pass_rate_percentage: number;
}

export interface SkuQualityReport {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  total_inspections: number;
  passed_count: number;
  failed_count: number;
  pass_rate_percentage: number;
  frequent_failure_parameter?: string | null;
}

export interface NotificationItem {
  id: string;
  organization_id: string;
  recipient_user_id?: string | null;
  recipient_email?: string | null;
  title: string;
  message: string;
  category: string;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  metadata?: any;
  created_at: string;
}
