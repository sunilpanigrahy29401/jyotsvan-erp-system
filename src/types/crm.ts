// src/types/crm.ts
// Enterprise CRM Subsystem Type Definitions

export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'contacted'
  | 'attempted'
  | 'qualified'
  | 'nurturing'
  | 'unqualified'
  | 'converted'
  | 'lost'
  | 'archived';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export type CommercialRelationshipType =
  | 'b2b_client'
  | 'distributor'
  | 'dealer'
  | 'retailer'
  | 'franchise'
  | 'cf_partner'
  | 'institutional'
  | 'd2c'
  | 'supplier'
  | 'strategic_partner';

export type OperationalEntityType =
  | 'customer'
  | 'retailer'
  | 'distributor'
  | 'cf'
  | 'supplier';

export interface LeadSource {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  channel_type: 'webform' | 'indiamart' | 'meta_ads' | 'google_ads' | 'referral' | 'direct' | 'field_event' | 'shopify';
  is_active: boolean;
  created_at: string;
}

export interface LeadTag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  lead_number: string;
  first_name: string;
  last_name: string;
  display_name: string;
  company_name?: string | null;
  designation?: string | null;
  email?: string | null;
  phone: string;
  alternate_phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;

  // Business context
  relationship_type: CommercialRelationshipType;
  industry?: string | null;
  business_category?: string | null;
  expected_requirement?: string | null;
  estimated_quantity?: number | null;
  estimated_deal_value?: number | null;
  product_interest?: string[] | null;
  purchase_timeline?: string | null; // immediate, 30_days, 90_days, exploratory
  budget_range?: string | null;
  current_supplier?: string | null;
  business_size?: string | null; // small, medium, enterprise

  // CRM context
  source_id?: string | null;
  source_name?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  assigned_employee_id?: string | null;
  assigned_employee_name?: string | null;
  assigned_team?: string | null;
  territory?: string | null;
  lead_score: number;
  priority: LeadPriority;
  status: LeadStatus;
  qualification_notes?: string | null;
  disqualification_reason?: string | null;

  // Conversion metadata
  is_converted: boolean;
  converted_at?: string | null;
  converted_by_user_id?: string | null;
  converted_account_id?: string | null;
  converted_contact_id?: string | null;
  converted_deal_id?: string | null;

  next_follow_up_date?: string | null;
  last_activity_date?: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface CrmAccount {
  id: string;
  organization_id: string;
  account_number: string;
  name: string;
  legal_name?: string | null;
  relationship_type: CommercialRelationshipType;
  industry?: string | null;
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'vip';
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  credit_limit?: number | null;
  annual_revenue?: number | null;
  assigned_employee_id?: string | null;
  assigned_employee_name?: string | null;
  territory?: string | null;
  status: 'active' | 'prospect' | 'dormant' | 'blocked';
  created_at: string;
  updated_at: string;

  // Operational entity links
  linked_entity_type?: OperationalEntityType | null;
  linked_entity_id?: string | null;
  linked_entity_name?: string | null;

  contacts_count?: number;
  open_deals_count?: number;
  total_deal_value?: number;
}

export interface CrmContact {
  id: string;
  organization_id: string;
  account_id?: string | null;
  account_name?: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  designation?: string | null;
  department?: string | null;
  role: 'primary' | 'decision_maker' | 'influencer' | 'procurement' | 'finance' | 'technical' | 'general';
  email?: string | null;
  phone: string;
  alternate_phone?: string | null;
  is_primary: boolean;
  notes?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  code: string;
  display_order: number;
  default_probability: number; // 0 - 100
  is_won_stage: boolean;
  is_lost_stage: boolean;
  color: string;
}

export interface Pipeline {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  is_default: boolean;
  is_active: boolean;
  stages: PipelineStage[];
}

export interface Deal {
  id: string;
  organization_id: string;
  deal_number: string;
  title: string;
  pipeline_id: string;
  pipeline_name?: string;
  stage_id: string;
  stage_name?: string;
  stage_probability?: number;
  account_id: string;
  account_name?: string;
  primary_contact_id?: string | null;
  primary_contact_name?: string | null;
  lead_id?: string | null;
  deal_value: number;
  expected_quantity?: number | null;
  weighted_value?: number;
  expected_close_date: string;
  actual_close_date?: string | null;
  owner_employee_id: string;
  owner_employee_name?: string;
  territory?: string | null;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  win_loss_reason?: string | null;
  competitor_name?: string | null;
  description?: string | null;
  is_handed_off: boolean;
  handoff_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: DealItem[];
}

export interface DealItem {
  id: string;
  deal_id: string;
  product_id?: string | null;
  product_name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
}

export interface DealHandoff {
  id: string;
  organization_id: string;
  deal_id: string;
  handoff_number: string;
  account_id: string;
  contact_id?: string | null;
  idempotency_key: string;
  pricing_assumptions: Record<string, unknown>;
  line_items: Array<{
    product_name: string;
    sku?: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  special_terms?: string | null;
  delivery_timeline?: string | null;
  status: 'pending_review' | 'approved_by_sales' | 'converted_to_order' | 'rejected';
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  sales_order_id?: string | null;
  created_at: string;
}

export type ActivityType =
  | 'phone_call'
  | 'meeting'
  | 'site_visit'
  | 'email'
  | 'whatsapp'
  | 'follow_up'
  | 'demonstration'
  | 'negotiation'
  | 'task'
  | 'note';

export interface CrmActivity {
  id: string;
  organization_id: string;
  activity_type: ActivityType;
  subject: string;
  description?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  is_completed: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Polymorphic associations
  lead_id?: string | null;
  account_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;

  assigned_employee_id?: string | null;
  assigned_employee_name?: string | null;
  logged_by_user_id: string;
  logged_by_user_name?: string;

  outcome?: 'positive' | 'neutral' | 'negative' | 'rescheduled' | 'no_show' | null;
  outcome_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmNote {
  id: string;
  organization_id: string;
  lead_id?: string | null;
  account_id?: string | null;
  deal_id?: string | null;
  title?: string | null;
  content: string;
  created_by_name: string;
  created_at: string;
}

export interface CrmAutomationRule {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  trigger_event:
    | 'lead_created'
    | 'lead_assigned'
    | 'lead_qualified'
    | 'deal_created'
    | 'deal_stage_changed'
    | 'deal_won'
    | 'followup_due';
  conditions: Record<string, unknown>;
  action_type:
    | 'assign_lead'
    | 'set_priority'
    | 'create_task'
    | 'notify_owner'
    | 'log_activity';
  action_params: Record<string, unknown>;
  is_active: boolean;
  execution_count: number;
  last_executed_at?: string | null;
  created_at: string;
}

export interface CrmIntegrationConfig {
  id: string;
  organization_id: string;
  provider: 'webform' | 'indiamart' | 'meta_ads' | 'google_ads' | 'shopify' | 'whatsapp' | 'chatwoot';
  provider_name: string;
  status: 'connected' | 'not_connected' | 'awaiting_credentials' | 'configuration_required' | 'error' | 'disabled';
  last_successful_sync?: string | null;
  last_attempted_sync?: string | null;
  total_records_ingested: number;
  failed_records_count: number;
  error_message?: string | null;
  config_summary: Record<string, unknown>;
  created_at: string;
}

export interface CrmDashboardMetrics {
  total_leads: number;
  new_leads_month: number;
  qualified_leads: number;
  unassigned_leads: number;
  leads_requiring_followup: number;
  active_deals_count: number;
  total_pipeline_value: number;
  weighted_forecast_value: number;
  won_deals_month_value: number;
  conversion_rate_percent: number;
  leads_by_status: Record<string, number>;
  leads_by_source: Array<{ source: string; count: number; value: number }>;
  deals_by_stage: Array<{ stage: string; count: number; value: number; probability: number }>;
  recent_activities: CrmActivity[];
  upcoming_followups: CrmActivity[];
}
