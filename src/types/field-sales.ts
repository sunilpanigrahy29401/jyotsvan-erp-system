// src/types/field-sales.ts
// Enterprise Field Sales Execution Layer Types (Phase 20)

export type FieldCustomerType = 'distributor' | 'retailer';

export type VisitStatus = 'planned' | 'in_progress' | 'completed' | 'skipped' | 'cancelled' | 'missed';

export type VisitPurpose =
  | 'routine_order_booking'
  | 'collection_followup'
  | 'stock_audit'
  | 'relationship_building'
  | 'new_product_pitch'
  | 'complaint_resolution'
  | 'contract_renewal'
  | 'new_customer_onboarding'
  | 'general_inquiry';

export type VisitOutcome =
  | 'order_taken'
  | 'collection_received'
  | 'followup_required'
  | 'product_inquiry'
  | 'complaint_logged'
  | 'stock_checked'
  | 'relationship_meeting'
  | 'new_customer_onboarded'
  | 'no_order'
  | 'customer_unavailable'
  | 'other';

export type LocationVerificationStatus = 'verified' | 'out_of_range' | 'no_gps' | 'pending';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type TaskType =
  | 'follow_up'
  | 'payment_reminder'
  | 'sample_delivery'
  | 'order_booking'
  | 'stock_verification'
  | 'dispute_resolution'
  | 'contract_renewal'
  | 'general';

export type TargetType = 'sales_value' | 'order_count' | 'visit_count' | 'collection_amount' | 'new_customers';
export type TargetPeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface FieldSalesVisit {
  id: string;
  organization_id: string;
  salesperson_id: string;
  salesperson_name: string;
  salesperson_email?: string;
  customer_type: FieldCustomerType;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  territory_id?: string | null;
  territory_name?: string | null;
  route_id?: string | null;
  route_name?: string | null;
  planned_date: string;
  actual_date?: string | null;
  visit_purpose: VisitPurpose;
  status: VisitStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  duration_minutes?: number | null;
  location_verified?: boolean;
  location_status?: LocationVerificationStatus;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_in_accuracy?: number | null;
  check_in_distance_meters?: number | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  notes?: string | null;
  outcome?: VisitOutcome | null;
  competitor_info?: string | null;
  requested_products?: string | null;
  next_follow_up_date?: string | null;
  cancellation_reason?: string | null;
  skipped_reason?: string | null;
  order_taken_id?: string | null;
  order_taken_number?: string | null;
  order_amount?: number | null;
  collection_taken_id?: string | null;
  collection_taken_number?: string | null;
  collection_amount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface FieldSalesRouteStop {
  id: string;
  route_id: string;
  organization_id: string;
  stop_sequence: number;
  customer_type: FieldCustomerType;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  address?: string;
  city?: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  expected_duration_minutes: number;
  priority: 'high' | 'medium' | 'low';
  default_purpose: VisitPurpose;
  notes?: string;
  status: 'active' | 'inactive';
}

export type RouteFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface FieldSalesRoute {
  id: string;
  organization_id: string;
  route_code: string;
  name: string;
  description?: string;
  territory_id?: string | null;
  territory_name?: string | null;
  salesperson_id?: string | null;
  salesperson_name?: string | null;
  frequency: RouteFrequency;
  days_of_week: string[];
  status: 'active' | 'inactive' | 'archived';
  total_stops: number;
  estimated_duration_hours: number;
  stops?: FieldSalesRouteStop[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesTerritoryAssignment {
  id: string;
  organization_id: string;
  territory_id: string;
  territory_name?: string;
  territory_code?: string;
  salesperson_id: string;
  salesperson_name: string;
  salesperson_email?: string;
  role: string;
  effective_from: string;
  effective_to?: string | null;
  priority_rank: number;
  is_primary: boolean;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FieldSalesTarget {
  id: string;
  organization_id: string;
  salesperson_id: string;
  salesperson_name: string;
  territory_id?: string | null;
  territory_name?: string | null;
  target_type: TargetType;
  period_type: TargetPeriodType;
  period_identifier: string; // e.g. '2026-03'
  start_date: string;
  end_date: string;
  target_value: number;
  achieved_value: number;
  achievement_percent: number;
  status: 'active' | 'closed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FieldSalesTask {
  id: string;
  organization_id: string;
  visit_id?: string | null;
  salesperson_id: string;
  salesperson_name: string;
  customer_type: FieldCustomerType;
  customer_id: string;
  customer_name: string;
  task_type: TaskType;
  title: string;
  description?: string;
  priority: TaskPriority;
  due_date: string;
  status: TaskStatus;
  completed_at?: string | null;
  completed_by?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerQuickView {
  customer_id: string;
  customer_type: FieldCustomerType;
  code: string;
  name: string;
  legal_name?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  territory_id?: string | null;
  territory_name?: string | null;
  primary_salesperson_name?: string | null;
  outstanding_balance: number;
  credit_limit: number;
  available_credit: number;
  credit_hold: boolean;
  payment_terms_days: number;
  last_visit_date?: string | null;
  last_visit_outcome?: string | null;
  next_scheduled_visit?: string | null;
  recent_orders: Array<{
    id: string;
    order_number: string;
    order_date: string;
    grand_total: number;
    order_status: string;
    payment_status: string;
  }>;
  recent_payments: Array<{
    id: string;
    payment_number: string;
    payment_date: string;
    amount: number;
    payment_method_name: string;
  }>;
  open_tasks: FieldSalesTask[];
  contacts: Array<{
    name: string;
    designation: string;
    phone: string;
    email?: string;
    is_primary: boolean;
  }>;
}

export interface FieldSalesDashboardMetrics {
  today_planned_visits: number;
  today_completed_visits: number;
  today_in_progress_visits: number;
  today_pending_visits: number;
  today_skipped_cancelled_visits: number;
  today_orders_count: number;
  today_orders_value: number;
  today_collections_value: number;
  monthly_target_achievement_pct: number;
  monthly_sales_target: number;
  monthly_sales_achieved: number;
  monthly_visits_target: number;
  monthly_visits_achieved: number;
  active_route_today?: {
    id: string;
    name: string;
    total_stops: number;
    completed_stops: number;
  } | null;
  pending_tasks_count: number;
  overdue_tasks_count: number;
  salesperson_rankings: Array<{
    salesperson_id: string;
    salesperson_name: string;
    visits_completed: number;
    orders_count: number;
    orders_value: number;
    collections_value: number;
    achievement_pct: number;
  }>;
  territory_coverage: Array<{
    territory_id: string;
    territory_name: string;
    total_customers: number;
    visited_this_month: number;
    coverage_pct: number;
  }>;
  recent_activities: Array<{
    id: string;
    type: 'visit_completed' | 'order_booked' | 'collection_recorded' | 'task_resolved' | 'check_in';
    title: string;
    description: string;
    timestamp: string;
    salesperson_name: string;
    customer_name: string;
  }>;
}

export interface CheckInPayload {
  visitId: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  notes?: string;
}

export interface CheckOutPayload {
  visitId: string;
  outcome: VisitOutcome;
  notes?: string;
  competitorInfo?: string;
  requestedProducts?: string;
  nextFollowUpDate?: string;
  latitude?: number | null;
  longitude?: number | null;
  createdOrderId?: string;
  createdCollectionId?: string;
}

export interface CreateVisitPayload {
  organizationId: string;
  salespersonId: string;
  salespersonName: string;
  customerType: FieldCustomerType;
  customerId: string;
  plannedDate: string;
  visitPurpose: VisitPurpose;
  routeId?: string | null;
  territoryId?: string | null;
  notes?: string;
}

export interface CreateRoutePayload {
  organizationId: string;
  routeCode?: string;
  name: string;
  description?: string;
  territoryId?: string;
  salespersonId?: string;
  salespersonName?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  daysOfWeek: string[];
  stops: Array<{
    stopSequence: number;
    customerType: FieldCustomerType;
    customerId: string;
    expectedDurationMinutes?: number;
    priority?: 'high' | 'medium' | 'low';
    defaultPurpose?: VisitPurpose;
    notes?: string;
  }>;
}
