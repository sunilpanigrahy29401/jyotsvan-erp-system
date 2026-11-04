export type FormulationStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'inactive'
  | 'archived';

export type ComponentType =
  | 'raw_material'
  | 'packaging'
  | 'semi_finished'
  | 'consumable'
  | 'additive'
  | 'other';

export interface FormulationSubstitution {
  id: string;
  organization_id: string;
  formulation_id: string;
  primary_component_id: string;
  alternate_sku_id: string;
  alternate_sku_code?: string;
  alternate_sku_name?: string;
  conversion_factor: number;
  preference_priority: number;
  substitution_group?: string | null;
  status: 'approved' | 'pending_approval' | 'rejected' | 'inactive';
  approved_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FormulationComponent {
  id: string;
  organization_id: string;
  formulation_id: string;
  component_product_id?: string | null;
  component_sku_id: string;
  component_sku_code?: string;
  component_sku_name?: string;
  component_product_name?: string;
  component_type: ComponentType;
  quantity: number;
  unit_id: string;
  unit_code?: string;
  unit_name?: string;
  sequence_order: number;
  percentage?: number | null;
  wastage_allowance_percentage?: number;
  is_optional: boolean;
  is_substitutable: boolean;
  notes?: string | null;
  estimated_unit_cost?: number;
  estimated_component_cost?: number;
  substitutions?: FormulationSubstitution[];
  created_at?: string;
  updated_at?: string;
}

export interface Formulation {
  id: string;
  organization_id: string;
  formulation_code: string;
  name: string;
  finished_product_id?: string | null;
  finished_product_name?: string;
  finished_sku_id: string;
  finished_sku_code?: string;
  finished_sku_name?: string;
  version: string;
  version_major: number;
  version_minor: number;
  description?: string | null;
  batch_size: number;
  base_quantity?: number;
  batch_size_unit_id: string;
  batch_size_unit_code?: string;
  base_unit_code?: string;
  expected_yield: number;
  expected_yield_pct?: number;
  expected_yield_unit_id: string;
  expected_yield_unit_code?: string;
  expected_wastage_quantity: number;
  expected_wastage_unit_id?: string | null;
  expected_wastage_unit_code?: string;
  yield_percentage?: number;
  effective_from?: string | null;
  effective_to?: string | null;
  status: FormulationStatus;
  qc_template_id?: string | null;
  qc_template_name?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_by_email?: string | null;
  updated_by?: string | null;
  updated_by_email?: string | null;
  approved_by?: string | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  activated_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  components?: FormulationComponent[];
  items?: FormulationComponent[];
  substitutions?: FormulationSubstitution[];
  estimated_total_cost?: number;
  cost_per_batch_unit?: number;
  cost_per_yield_unit?: number;
  version_history?: {
    id: string;
    version: string;
    status: FormulationStatus;
    created_at: string;
    is_active: boolean;
  }[];
}

export interface FormulationSummaryMetrics {
  total_formulations: number;
  active_formulations: number;
  in_review_formulations: number;
  draft_formulations: number;
  average_yield_percentage: number;
  total_finished_skus_covered: number;
  average_material_cost: number;
}

export interface FormulationScaledComponent {
  component_sku_id: string;
  component_sku_code: string;
  component_sku_name: string;
  component_type: ComponentType;
  base_quantity: number;
  scaled_quantity: number;
  unit_code: string;
  wastage_allowance_percentage: number;
  scaled_gross_quantity: number; // base scaled + allowance
  estimated_unit_cost: number;
  scaled_estimated_cost: number;
}

export interface FormulationScalingResult {
  formulation_id: string;
  formulation_code: string;
  formulation_name: string;
  version: string;
  base_batch_size: number;
  target_batch_size: number;
  batch_unit: string;
  scaling_ratio: number;
  base_expected_yield: number;
  scaled_expected_yield: number;
  yield_percentage: number;
  base_expected_wastage: number;
  scaled_expected_wastage: number;
  components: FormulationScaledComponent[];
  total_scaled_material_cost: number;
  cost_per_scaled_unit: number;
}

export interface ComponentComparisonDiff {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  change_type: 'added' | 'removed' | 'modified' | 'unchanged';
  v1_quantity?: number | null;
  v2_quantity?: number | null;
  v1_unit?: string | null;
  v2_unit?: string | null;
  v1_wastage_pct?: number | null;
  v2_wastage_pct?: number | null;
  v1_cost?: number | null;
  v2_cost?: number | null;
  notes?: string;
}

export interface FormulationComparisonResult {
  v1: Formulation;
  v2: Formulation;
  batch_size_changed: boolean;
  yield_changed: boolean;
  wastage_changed: boolean;
  cost_diff: number;
  cost_diff_percentage: number;
  component_diffs: ComponentComparisonDiff[];
}

export interface CreateFormulationPayload {
  formulation_code: string;
  name: string;
  finished_product_id?: string | null;
  finished_sku_id: string;
  version?: string;
  description?: string;
  batch_size: number;
  batch_size_unit_id: string;
  expected_yield: number;
  expected_yield_unit_id: string;
  expected_wastage_quantity?: number;
  expected_wastage_unit_id?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  qc_template_id?: string | null;
  notes?: string;
  components: {
    component_product_id?: string | null;
    component_sku_id: string;
    component_type: ComponentType;
    quantity: number;
    unit_id: string;
    sequence_order?: number;
    percentage?: number | null;
    wastage_allowance_percentage?: number;
    is_optional?: boolean;
    is_substitutable?: boolean;
    notes?: string;
  }[];
  substitutions?: {
    primary_component_index?: number; // index in components array
    primary_component_id?: string;
    alternate_sku_id: string;
    conversion_factor?: number;
    preference_priority?: number;
    substitution_group?: string;
    notes?: string;
  }[];
}
