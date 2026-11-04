// src/types/people.ts
// Enterprise Staff, HRMS, Payroll & People Management Types (Phase 21 Full Scope)

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'intern'
  | 'consultant'
  | 'temporary'
  | 'other';

export type EmployeeStatus =
  | 'draft'
  | 'active'
  | 'on_leave'
  | 'probation'
  | 'suspended'
  | 'resigned'
  | 'terminated'
  | 'inactive'
  | 'archived';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface Designation {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  department_id?: string | null;
  department_name?: string | null;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  organization_id: string;
  employee_code: string;
  user_id?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  display_name: string;
  date_of_birth?: string | null;
  gender?: Gender | null;
  phone: string;
  alternate_phone?: string | null;
  email: string;
  personal_email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  permanent_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  joining_date: string;
  confirmation_date?: string | null;
  probation_months?: number;
  probation_status?: 'in_probation' | 'confirmed' | 'extended';
  employment_type: EmploymentType;
  department_id: string;
  department_name?: string;
  department_code?: string;
  branch_id: string;
  branch_name?: string;
  branch_code?: string;
  designation_id?: string | null;
  designation_name?: string;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  reporting_manager_code?: string | null;
  grade?: string | null;
  work_location?: string | null;
  shift_id?: string | null;
  shift_name?: string | null;
  status: EmployeeStatus;
  exit_date?: string | null;
  exit_reason?: string | null;
  avatar_url?: string | null;
  notes?: string | null;
  
  // Banking Details
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;

  // Indian Statutory Compliance Identifiers
  pan_number?: string | null;
  aadhaar_number?: string | null;
  uan?: string | null;
  pf_number?: string | null;
  esi_number?: string | null;
  tax_regime?: 'new' | 'old' | null;

  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'leave'
  | 'holiday'
  | 'weekly_off'
  | 'wfh';

export type AttendanceSource = 'web' | 'mobile' | 'system' | 'manual';

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  branch_name?: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_hours?: number | null;
  break_minutes?: number | null;
  status: AttendanceStatus;
  source: AttendanceSource;
  check_in_location?: string | null;
  check_out_location?: string | null;
  remarks?: string | null;
  is_corrected: boolean;
  is_locked?: boolean;
  shift_id?: string | null;
  shift_name?: string | null;
  overtime_minutes?: number;
  late_minutes?: number;
  early_departure_minutes?: number;
  created_at: string;
  updated_at: string;
}

export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface AttendanceCorrection {
  id: string;
  organization_id: string;
  attendance_record_id?: string | null;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  requested_date: string;
  original_check_in?: string | null;
  original_check_out?: string | null;
  original_status?: AttendanceStatus | null;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  requested_status: AttendanceStatus;
  reason: string;
  status: CorrectionStatus;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Shifts & Rosters
export interface ShiftMaster {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  grace_period_mins: number;
  break_duration_mins: number;
  half_day_hours: number;
  full_day_hours: number;
  is_overnight: boolean;
  overtime_eligible: boolean;
  night_allowance: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  organization_id: string;
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to?: string | null;
  employee_name?: string;
  employee_code?: string;
  shift_name?: string;
  shift_code?: string;
  created_at: string;
}

// Holiday Calendar
export interface HolidayCalendar {
  id: string;
  organization_id: string;
  branch_id?: string | null;
  holiday_name: string;
  holiday_date: string;
  holiday_type: 'national' | 'state' | 'plant' | 'restricted';
  is_optional: boolean;
  description?: string | null;
  created_at: string;
}

// Leave Management
export interface LeaveType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  annual_allocation: number;
  is_paid: boolean;
  carry_forward: boolean;
  max_carry_forward?: number;
  monthly_accrual?: boolean;
  accrual_rate?: number;
  sandwich_rule_applies?: boolean;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  leave_type_id: string;
  leave_type_name?: string;
  leave_type_code?: string;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
}

export type LeaveRequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface LeaveRequest {
  id: string;
  organization_id: string;
  request_number: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  leave_type_id: string;
  leave_type_name?: string;
  leave_type_code?: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_period?: 'first_half' | 'second_half' | null;
  total_days: number;
  reason: string;
  status: LeaveRequestStatus;
  approver_id?: string | null;
  approver_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

// Salary Components & Structures
export type ComponentClassification = 'earning' | 'deduction' | 'employer_contribution';
export type CalculationMethod = 'fixed' | 'percentage_of_basic' | 'percentage_of_gross' | 'formula';

export interface SalaryComponent {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  classification: ComponentClassification;
  calculation_method: CalculationMethod;
  default_value: number;
  is_taxable: boolean;
  is_pf_applicable: boolean;
  is_esi_applicable: boolean;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SalaryStructure {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description?: string | null;
  total_ctc_monthly?: number;
  total_ctc_annual?: number;
  status: 'active' | 'inactive';
  components?: SalaryStructureComponent[];
  created_at: string;
  updated_at: string;
}

export interface SalaryStructureComponent {
  id: string;
  salary_structure_id: string;
  component_id: string;
  component_code?: string;
  component_name?: string;
  classification?: ComponentClassification;
  calculation_method: CalculationMethod;
  amount_or_percentage: number;
  display_order: number;
}

export interface EmployeeSalaryAssignment {
  id: string;
  organization_id: string;
  employee_id: string;
  salary_structure_id: string;
  employee_name?: string;
  employee_code?: string;
  structure_name?: string;
  effective_from: string;
  effective_to?: string | null;
  base_ctc_annual: number;
  base_ctc_monthly: number;
  basic_monthly: number;
  hra_monthly: number;
  da_monthly: number;
  special_allowance_monthly: number;
  conveyance_monthly: number;
  medical_monthly: number;
  epf_applicable: boolean;
  esi_applicable: boolean;
  pt_applicable: boolean;
  tds_monthly: number;
  notes?: string | null;
  status: 'active' | 'superseded';
  created_at: string;
}

// Payroll Period, Run & Payslip
export type PayrollStatus = 'draft' | 'calculated' | 'under_review' | 'approved' | 'locked' | 'paid';

export interface PayrollPeriod {
  id: string;
  organization_id: string;
  period_name: string; // "October 2026"
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  total_working_days: number;
  status: 'open' | 'locked' | 'closed';
  created_at: string;
}

export interface PayrollRun {
  id: string;
  organization_id: string;
  period_id: string;
  period_name?: string;
  run_number: string;
  start_date: string;
  end_date: string;
  payout_date?: string | null;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net_payable: number;
  total_employer_cost: number;
  total_epf: number;
  total_esi: number;
  total_pt: number;
  total_tds: number;
  status: PayrollStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  locked_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: string;
  organization_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  designation_name?: string;
  branch_name?: string;
  pan_number?: string;
  uan?: string;
  bank_name?: string;
  bank_account_number?: string;
  period_month: number;
  period_year: number;
  period_name?: string;
  total_days: number;
  present_days: number;
  paid_leaves: number;
  unpaid_leaves_lop: number;
  effective_paid_days: number;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  special_allowance: number;
  medical_allowance: number;
  overtime_pay: number;
  bonus_incentives: number;
  gross_earnings: number;
  epf_employee: number;
  esi_employee: number;
  professional_tax: number;
  tds_tax: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  epf_employer: number;
  esi_employer: number;
  total_employer_contribution: number;
  total_ctc_incurred: number;
  payment_status: 'unpaid' | 'paid' | 'on_hold';
  payment_reference?: string | null;
  created_at: string;
}

// Approved Payroll Run Handoff Contract (Future Accounting Integration)
export interface ApprovedPayrollRunHandoff {
  contract_version: '1.0';
  payroll_run_id: string;
  run_number: string;
  organization_id: string;
  period_name: string;
  period_month: number;
  period_year: number;
  disbursement_date: string;
  total_gross_salary: number;
  total_net_salary_payable: number;
  total_employee_deductions: {
    epf: number;
    esi: number;
    professional_tax: number;
    tds: number;
    other_deductions: number;
    sum: number;
  };
  total_employer_contributions: {
    epf: number;
    esi: number;
    gratuity_provision: number;
    sum: number;
  };
  department_breakdown: Array<{
    department_id: string;
    department_name: string;
    employee_count: number;
    gross_salary: number;
    net_salary: number;
    employer_cost: number;
  }>;
  approval_status: 'approved' | 'locked';
  approved_by: string;
  approved_at: string;
  payroll_lock_status: boolean;
  immutable_hash: string;
  source_engine: 'Jyotsvan-HRMS-Payroll-Engine-v1';
  exported_at: string;
}

// Employee Exit & Separation
export interface EmployeeExit {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  designation_name?: string;
  resignation_date: string;
  notice_period_days: number;
  tentative_last_working_day: string;
  actual_last_working_day?: string | null;
  resignation_reason: string;
  status: 'submitted' | 'under_review' | 'approved' | 'clearance_in_progress' | 'settled' | 'rejected';
  clearance_checklist: {
    it_assets: boolean;
    id_card: boolean;
    department_handover: boolean;
    finance_loans_cleared: boolean;
    hr_docs: boolean;
  };
  final_settlement_days?: number;
  gratuity_eligible?: boolean;
  gratuity_amount?: number;
  leave_encashment_amount?: number;
  rehire_eligible: boolean;
  exit_interview_notes?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

// HR Unified Requests & Announcements
export type HRRequestType = 
  | 'leave' 
  | 'attendance_correction' 
  | 'profile_update' 
  | 'shift_change' 
  | 'document_verification' 
  | 'resignation';

export interface HRRequest {
  id: string;
  organization_id: string;
  request_number: string;
  request_type: HRRequestType;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  reviewer_comments?: string | null;
  created_at: string;
}

export interface HRAnnouncement {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  category: 'company' | 'policy' | 'holiday' | 'event' | 'urgent';
  target_audience: 'all' | 'branch' | 'department';
  target_branch_id?: string | null;
  target_dept_id?: string | null;
  priority: 'normal' | 'high' | 'urgent';
  published_by: string;
  published_at: string;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
}

// Onboarding Checklist
export interface OnboardingChecklist {
  id: string;
  organization_id: string;
  employee_id: string;
  personal_info_verified: boolean;
  documents_uploaded: boolean;
  bank_details_verified: boolean;
  statutory_id_verified: boolean;
  department_assigned: boolean;
  shift_assigned: boolean;
  salary_structure_assigned: boolean;
  id_card_issued: boolean;
  it_assets_issued: boolean;
  welcome_kit_provided: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
}

// Performance & Tasks
export type TargetType =
  | 'sales_value'
  | 'collections_value'
  | 'visits_count'
  | 'orders_count'
  | 'production_output'
  | 'procurement_savings'
  | 'tasks_completed'
  | 'attendance_rate'
  | 'custom';

export type TargetPeriod = 'monthly' | 'quarterly' | 'annual';

export interface EmployeeTarget {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  target_type: TargetType;
  title: string;
  period_type: TargetPeriod;
  period_identifier: string;
  start_date: string;
  end_date: string;
  target_value: number;
  achieved_value: number;
  achievement_percent: number;
  unit?: string;
  status: 'active' | 'achieved' | 'missed' | 'cancelled';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReviewType = 'annual' | 'quarterly' | 'probation' | 'mid_year';
export type ReviewStatus = 'draft' | 'submitted' | 'under_review' | 'completed';

export interface PerformanceReview {
  id: string;
  organization_id: string;
  review_number: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  reviewer_employee_id?: string | null;
  reviewer_name?: string | null;
  period: string;
  review_type: ReviewType;
  rating_score?: number | null; // 1.0 - 5.0
  status: ReviewStatus;
  strengths?: string | null;
  growth_areas?: string | null;
  goals_for_next_period?: string | null;
  manager_comments?: string | null;
  employee_comments?: string | null;
  summary_notes?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType =
  | 'id_proof'
  | 'pan_card'
  | 'aadhaar_card'
  | 'contract'
  | 'resume'
  | 'joining_letter'
  | 'education_certificate'
  | 'tax_declaration'
  | 'appraisal'
  | 'other';

export interface EmployeeDocument {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  document_type: DocumentType;
  title: string;
  file_name: string;
  file_size?: number | null;
  file_type?: string | null;
  storage_path?: string | null;
  is_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PeopleTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface PeopleTask {
  id: string;
  organization_id: string;
  task_number: string;
  title: string;
  description?: string | null;
  assigned_employee_id?: string | null;
  assigned_employee_name?: string | null;
  assigned_employee_code?: string | null;
  assigned_user_id?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  source_module: 'people' | 'field_sales' | 'operations' | 'finance' | 'quality';
  priority: TaskPriority;
  status: PeopleTaskStatus;
  due_date: string;
  completed_at?: string | null;
  completed_by?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgNode {
  id: string;
  employee_code: string;
  display_name: string;
  designation: string;
  department: string;
  branch: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  status: EmployeeStatus;
  reporting_manager_id?: string | null;
  direct_reports_count: number;
  children: OrgNode[];
}

export interface PeopleDashboardMetrics {
  total_employees: number;
  active_employees: number;
  on_leave_today: number;
  present_today: number;
  attendance_rate_percent: number;
  pending_leave_requests: number;
  pending_attendance_corrections: number;
  pending_reviews: number;
  open_tasks_count: number;
  departments_count: number;
  branches_count: number;
  monthly_payroll_cost?: number;
  pending_payroll_runs?: number;
}

export interface Employee360View extends Employee {
  reporting_manager?: {
    id: string;
    employee_code: string;
    display_name: string;
    designation: string;
  } | null;
  direct_reports?: Array<{
    id: string;
    employee_code: string;
    display_name: string;
    designation: string;
    department: string;
  }>;
  attendance_summary?: {
    total_days: number;
    present_days: number;
    absent_days: number;
    leave_days: number;
    half_days: number;
    wfh_days: number;
    average_hours: number;
  };
  leave_balances?: LeaveBalance[];
  recent_leaves?: LeaveRequest[];
  tasks?: PeopleTask[];
  performance_reviews?: PerformanceReview[];
  targets?: EmployeeTarget[];
  documents?: EmployeeDocument[];
  salary_assignment?: EmployeeSalaryAssignment | null;
  recent_payslips?: Payslip[];
  onboarding_checklist?: OnboardingChecklist | null;
  field_sales_data?: {
    assigned_territory?: string;
    total_visits_month: number;
    total_orders_month: number;
    total_revenue_month: number;
    total_collections_month: number;
  };
  expense_claims?: Array<{
    id: string;
    expense_number: string;
    expense_date: string;
    category_name: string;
    total_amount: number;
    status: string;
  }>;
}
