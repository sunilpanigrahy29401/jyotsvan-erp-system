-- 001: tables the application needs that do not exist in the live database (generated from the migration-built schema).
-- Idempotent. Contains no data.

CREATE TABLE IF NOT EXISTS public.audit_retention_policies (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    retention_period_days integer DEFAULT 730 NOT NULL,
    auto_archive_enabled boolean DEFAULT true NOT NULL,
    legal_hold_enabled boolean DEFAULT false NOT NULL,
    tamper_detection_enabled boolean DEFAULT true NOT NULL,
    notify_on_security_event boolean DEFAULT true NOT NULL,
    notify_on_integrity_breach boolean DEFAULT true NOT NULL,
    updated_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    ip character varying(64),
    success boolean NOT NULL,
    reason character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.auth_login_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.auth_login_attempts_id_seq OWNED BY public.auth_login_attempts.id;

CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id character varying(80) NOT NULL,
    user_id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    refresh_token_hash text NOT NULL,
    user_agent text,
    ip character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.field_sales_order_drafts (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    visit_id character varying(64),
    salesperson_id character varying(64) NOT NULL,
    customer_type character varying(32) DEFAULT 'retailer'::character varying NOT NULL,
    customer_id character varying(64) NOT NULL,
    customer_name character varying(255) NOT NULL,
    distributor_id character varying(64),
    warehouse_id character varying(64),
    order_type character varying(32) DEFAULT 'retailer_secondary'::character varying NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(16,2) DEFAULT 0 NOT NULL,
    discount_total numeric(16,2) DEFAULT 0 NOT NULL,
    tax_total numeric(16,2) DEFAULT 0 NOT NULL,
    grand_total numeric(16,2) DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    sales_order_id character varying(64),
    sales_order_number character varying(64),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.field_sales_route_stops (
    id character varying(64) NOT NULL,
    route_id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    stop_sequence integer DEFAULT 1 NOT NULL,
    customer_type character varying(32) DEFAULT 'retailer'::character varying NOT NULL,
    customer_id character varying(64) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_code character varying(64),
    address text,
    city character varying(128),
    phone character varying(64),
    latitude numeric(10,7),
    longitude numeric(10,7),
    expected_duration_minutes integer DEFAULT 30 NOT NULL,
    priority character varying(32) DEFAULT 'medium'::character varying NOT NULL,
    default_purpose character varying(64) DEFAULT 'routine_order_booking'::character varying NOT NULL,
    notes text,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.field_sales_routes (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    route_code character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    territory_id character varying(64),
    salesperson_id character varying(64),
    salesperson_name character varying(128),
    frequency character varying(32) DEFAULT 'weekly'::character varying NOT NULL,
    days_of_week jsonb DEFAULT '["monday", "wednesday", "friday"]'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    total_stops integer DEFAULT 0 NOT NULL,
    estimated_duration_hours numeric(6,2) DEFAULT 4.0 NOT NULL,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.field_sales_targets (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    salesperson_id character varying(64) NOT NULL,
    salesperson_name character varying(128) NOT NULL,
    territory_id character varying(64),
    territory_name character varying(128),
    target_type character varying(64) DEFAULT 'sales_value'::character varying NOT NULL,
    period_type character varying(32) DEFAULT 'monthly'::character varying NOT NULL,
    period_identifier character varying(32) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    target_value numeric(16,2) DEFAULT 0 NOT NULL,
    achieved_value numeric(16,2) DEFAULT 0 NOT NULL,
    achievement_percent numeric(6,2) DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.field_sales_tasks (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    visit_id character varying(64),
    salesperson_id character varying(64) NOT NULL,
    salesperson_name character varying(128) NOT NULL,
    customer_type character varying(32) DEFAULT 'retailer'::character varying NOT NULL,
    customer_id character varying(64) NOT NULL,
    customer_name character varying(255) NOT NULL,
    task_type character varying(64) DEFAULT 'follow_up'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    priority character varying(32) DEFAULT 'medium'::character varying NOT NULL,
    due_date timestamp with time zone NOT NULL,
    status character varying(32) DEFAULT 'open'::character varying NOT NULL,
    completed_at timestamp with time zone,
    completed_by character varying(64),
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.field_sales_visits (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    salesperson_id character varying(64) NOT NULL,
    salesperson_name character varying(128) NOT NULL,
    salesperson_email character varying(255),
    customer_type character varying(32) DEFAULT 'retailer'::character varying NOT NULL,
    customer_id character varying(64) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_code character varying(64),
    customer_phone character varying(64),
    customer_address text,
    customer_city character varying(128),
    customer_state character varying(128),
    customer_latitude numeric(10,7),
    customer_longitude numeric(10,7),
    territory_id character varying(64),
    territory_name character varying(128),
    route_id character varying(64),
    route_name character varying(255),
    planned_date timestamp with time zone NOT NULL,
    actual_date timestamp with time zone,
    visit_purpose character varying(64) DEFAULT 'routine_order_booking'::character varying NOT NULL,
    status character varying(32) DEFAULT 'planned'::character varying NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    duration_minutes integer,
    location_verified boolean DEFAULT false NOT NULL,
    location_status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    check_in_latitude numeric(10,7),
    check_in_longitude numeric(10,7),
    check_in_accuracy numeric(8,2),
    check_in_distance_meters numeric(10,2),
    check_out_latitude numeric(10,7),
    check_out_longitude numeric(10,7),
    notes text,
    outcome character varying(64),
    competitor_info text,
    requested_products text,
    next_follow_up_date timestamp with time zone,
    cancellation_reason text,
    skipped_reason text,
    order_taken_id character varying(64),
    order_taken_number character varying(64),
    order_amount numeric(16,2) DEFAULT 0,
    collection_taken_id character varying(64),
    collection_taken_number character varying(64),
    collection_amount numeric(16,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.formulation_components (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    formulation_id character varying(64) NOT NULL,
    component_product_id character varying(64),
    component_sku_id character varying(64) NOT NULL,
    component_type character varying(64) DEFAULT 'raw_material'::character varying NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit_id character varying(64) NOT NULL,
    sequence_order integer DEFAULT 1 NOT NULL,
    percentage numeric(8,4),
    wastage_allowance_percentage numeric(6,2) DEFAULT 0.00,
    is_optional boolean DEFAULT false NOT NULL,
    is_substitutable boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_comp_qty CHECK ((quantity > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.formulation_costings (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    formulation_id character varying(64) NOT NULL,
    cost_basis character varying(64) DEFAULT 'standard_cost'::character varying NOT NULL,
    total_material_cost numeric(14,2) DEFAULT 0.00 NOT NULL,
    cost_per_batch_unit numeric(14,4) DEFAULT 0.0000 NOT NULL,
    cost_per_yield_unit numeric(14,4) DEFAULT 0.0000 NOT NULL,
    currency character varying(8) DEFAULT 'INR'::character varying NOT NULL,
    breakdown jsonb,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.formulation_substitutions (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    formulation_id character varying(64) NOT NULL,
    primary_component_id character varying(64) NOT NULL,
    alternate_sku_id character varying(64) NOT NULL,
    conversion_factor numeric(10,4) DEFAULT 1.0000 NOT NULL,
    preference_priority integer DEFAULT 1 NOT NULL,
    substitution_group character varying(64),
    status character varying(32) DEFAULT 'approved'::character varying NOT NULL,
    approved_by character varying(64),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_subst_factor CHECK ((conversion_factor > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.formulations (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    formulation_code character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    finished_product_id character varying(64),
    finished_sku_id character varying(64) NOT NULL,
    version character varying(32) DEFAULT '1.0'::character varying NOT NULL,
    version_major integer DEFAULT 1 NOT NULL,
    version_minor integer DEFAULT 0 NOT NULL,
    description text,
    batch_size numeric(14,4) DEFAULT 1000.0000 NOT NULL,
    batch_size_unit_id character varying(64) NOT NULL,
    expected_yield numeric(14,4) DEFAULT 950.0000 NOT NULL,
    expected_yield_unit_id character varying(64) NOT NULL,
    expected_wastage_quantity numeric(14,4) DEFAULT 50.0000,
    expected_wastage_unit_id character varying(64),
    effective_from date,
    effective_to date,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    qc_template_id character varying(64),
    notes text,
    created_by character varying(64),
    created_by_email character varying(255),
    updated_by character varying(64),
    updated_by_email character varying(255),
    approved_by character varying(64),
    approved_by_email character varying(255),
    approved_at timestamp with time zone,
    activated_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_form_batch_size CHECK ((batch_size > (0)::numeric)),
    CONSTRAINT chk_form_wastage CHECK ((expected_wastage_quantity >= (0)::numeric)),
    CONSTRAINT chk_form_yield CHECK ((expected_yield >= (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.google_ads_accounts (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    customer_id character varying(64) NOT NULL,
    descriptive_name character varying(255) NOT NULL,
    currency_code character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    time_zone character varying(64) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    status character varying(64) DEFAULT 'ENABLED'::character varying NOT NULL,
    can_manage_clients boolean DEFAULT false,
    is_manager_account boolean DEFAULT false,
    is_primary boolean DEFAULT true,
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_ad_groups (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    campaign_id character varying(64) NOT NULL,
    external_adgroup_id character varying(128) NOT NULL,
    external_campaign_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(64) DEFAULT 'ENABLED'::character varying NOT NULL,
    type character varying(64) DEFAULT 'SEARCH_STANDARD'::character varying,
    cpc_bid numeric(16,2),
    target_cpa numeric(16,2),
    currency character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_campaigns (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    external_campaign_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(64) DEFAULT 'ENABLED'::character varying NOT NULL,
    advertising_channel_type character varying(64) DEFAULT 'SEARCH'::character varying NOT NULL,
    bidding_strategy_type character varying(64) DEFAULT 'MAXIMIZE_CONVERSIONS'::character varying,
    daily_budget numeric(16,2) DEFAULT 0,
    currency character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    start_date date,
    end_date date,
    target_cpa numeric(16,2),
    target_roas numeric(8,2),
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_conversion_actions (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    external_conversion_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(64) DEFAULT 'PURCHASE'::character varying NOT NULL,
    type character varying(64) DEFAULT 'WEBPAGE'::character varying NOT NULL,
    status character varying(64) DEFAULT 'ENABLED'::character varying NOT NULL,
    primary_for_goal boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_daily_insights (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    campaign_id character varying(64),
    ad_group_id character varying(64),
    keyword_id character varying(64),
    search_term_id character varying(64),
    location_id character varying(64),
    device_type character varying(64),
    conversion_action_id character varying(64),
    date date NOT NULL,
    level character varying(32) NOT NULL,
    spend numeric(16,2) DEFAULT 0 NOT NULL,
    impressions bigint DEFAULT 0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    conversions numeric(16,2) DEFAULT 0 NOT NULL,
    conversion_value numeric(16,2) DEFAULT 0 NOT NULL,
    currency character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_devices (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    campaign_id character varying(64),
    device_type character varying(64) NOT NULL,
    device_label character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_keywords (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    campaign_id character varying(64) NOT NULL,
    ad_group_id character varying(64) NOT NULL,
    external_criterion_id character varying(128) NOT NULL,
    keyword_text character varying(255) NOT NULL,
    match_type character varying(32) DEFAULT 'BROAD'::character varying NOT NULL,
    status character varying(64) DEFAULT 'ENABLED'::character varying NOT NULL,
    quality_score integer,
    cpc_bid numeric(16,2),
    currency character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_locations (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    campaign_id character varying(64),
    location_name character varying(255) NOT NULL,
    country_code character varying(8) DEFAULT 'IN'::character varying NOT NULL,
    region character varying(128),
    city character varying(128),
    location_type character varying(64) DEFAULT 'REGION'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.google_ads_search_terms (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    account_id character varying(64) NOT NULL,
    campaign_id character varying(64) NOT NULL,
    ad_group_id character varying(64) NOT NULL,
    keyword_id character varying(64),
    query_text character varying(255) NOT NULL,
    match_type character varying(32) DEFAULT 'BROAD'::character varying,
    status character varying(32) DEFAULT 'NONE'::character varying,
    currency character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_connections (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    provider_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(32) DEFAULT 'connected'::character varying NOT NULL,
    auth_type character varying(32) DEFAULT 'api_key'::character varying NOT NULL,
    external_account_id character varying(255),
    external_account_name character varying(255),
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    health_status character varying(32) DEFAULT 'healthy'::character varying NOT NULL,
    health_message text,
    last_sync_at timestamp with time zone,
    last_success_at timestamp with time zone,
    last_error_at timestamp with time zone,
    last_error_message text,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    encrypted_credentials text NOT NULL,
    credential_version integer DEFAULT 1 NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_entity_mappings (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    entity_type character varying(64) NOT NULL,
    external_id character varying(255) NOT NULL,
    internal_id character varying(255) NOT NULL,
    external_identifier character varying(255),
    internal_identifier character varying(255),
    mapping_status character varying(32) DEFAULT 'mapped'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_events (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    event_type character varying(128) NOT NULL,
    direction character varying(32) DEFAULT 'inbound'::character varying NOT NULL,
    external_event_id character varying(255),
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'received'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    processed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_logs (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64),
    provider_key character varying(64) NOT NULL,
    operation character varying(128) NOT NULL,
    direction character varying(32) DEFAULT 'outbound'::character varying NOT NULL,
    request_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status_code integer,
    duration_ms integer,
    error_code character varying(64),
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_providers (
    id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    category character varying(64) NOT NULL,
    logo_url text,
    icon_name character varying(64),
    documentation_url text,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    implementation_status character varying(32) DEFAULT 'registered'::character varying NOT NULL,
    capabilities jsonb DEFAULT '{}'::jsonb NOT NULL,
    configuration_schema jsonb DEFAULT '{"fields": []}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_sync_jobs (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    job_type character varying(32) DEFAULT 'manual'::character varying NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    cursor text,
    records_processed integer DEFAULT 0 NOT NULL,
    records_created integer DEFAULT 0 NOT NULL,
    records_updated integer DEFAULT 0 NOT NULL,
    records_failed integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    entity_type character varying(64)
);

CREATE TABLE IF NOT EXISTS public.integration_webhooks (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider character varying(64) NOT NULL,
    event_type character varying(128) NOT NULL,
    endpoint_identifier character varying(128) NOT NULL,
    secret_hash character varying(255),
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    events_received_count integer DEFAULT 0 NOT NULL,
    last_received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_ad_accounts (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    external_ad_account_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    account_status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    currency character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    timezone character varying(64) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    business_id character varying(128),
    business_name character varying(255),
    amount_spent numeric(16,2) DEFAULT 0,
    balance numeric(16,2) DEFAULT 0,
    min_daily_budget numeric(16,2),
    capabilities jsonb DEFAULT '[]'::jsonb,
    is_primary boolean DEFAULT true,
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_ad_sets (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    ad_account_id character varying(64) NOT NULL,
    campaign_id character varying(64),
    external_adset_id character varying(128) NOT NULL,
    external_campaign_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    effective_status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    daily_budget numeric(16,2),
    lifetime_budget numeric(16,2),
    bid_strategy character varying(128),
    optimization_goal character varying(128),
    billing_event character varying(128),
    targeting_summary text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    created_time timestamp with time zone,
    updated_time timestamp with time zone,
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_ads (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    ad_account_id character varying(64) NOT NULL,
    campaign_id character varying(64),
    adset_id character varying(64),
    external_ad_id character varying(128) NOT NULL,
    external_adset_id character varying(128) NOT NULL,
    external_campaign_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    effective_status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    creative_id character varying(64),
    preview_url text,
    created_time timestamp with time zone,
    updated_time timestamp with time zone,
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_breakdown_insights (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    ad_account_id character varying(64) NOT NULL,
    level character varying(32) DEFAULT 'account'::character varying NOT NULL,
    date date NOT NULL,
    breakdown_type character varying(64) NOT NULL,
    breakdown_value character varying(128) NOT NULL,
    breakdown_secondary_value character varying(128),
    spend numeric(16,2) DEFAULT 0 NOT NULL,
    impressions bigint DEFAULT 0 NOT NULL,
    reach bigint DEFAULT 0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    conversions numeric(16,2) DEFAULT 0 NOT NULL,
    conversion_value numeric(16,2) DEFAULT 0 NOT NULL,
    cpc numeric(16,4) DEFAULT 0,
    ctr numeric(10,4) DEFAULT 0,
    roas numeric(10,4) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    ad_account_id character varying(64) NOT NULL,
    external_campaign_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    objective character varying(128) DEFAULT 'OUTCOME_SALES'::character varying NOT NULL,
    status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    effective_status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    buying_type character varying(64) DEFAULT 'AUCTION'::character varying,
    daily_budget numeric(16,2),
    lifetime_budget numeric(16,2),
    budget_remaining numeric(16,2),
    start_time timestamp with time zone,
    stop_time timestamp with time zone,
    created_time timestamp with time zone,
    updated_time timestamp with time zone,
    last_synced_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_creatives (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    ad_account_id character varying(64) NOT NULL,
    external_creative_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    title text,
    body text,
    call_to_action_type character varying(64),
    image_url text,
    thumbnail_url text,
    video_id character varying(128),
    object_type character varying(64),
    object_story_id character varying(128),
    url_tags text,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_daily_insights (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    ad_account_id character varying(64) NOT NULL,
    level character varying(32) NOT NULL,
    date date NOT NULL,
    external_account_id character varying(128),
    external_campaign_id character varying(128) DEFAULT ''::character varying,
    external_adset_id character varying(128) DEFAULT ''::character varying,
    external_ad_id character varying(128) DEFAULT ''::character varying,
    campaign_name character varying(255),
    adset_name character varying(255),
    ad_name character varying(255),
    spend numeric(16,2) DEFAULT 0 NOT NULL,
    currency character varying(16) DEFAULT 'INR'::character varying NOT NULL,
    impressions bigint DEFAULT 0 NOT NULL,
    reach bigint DEFAULT 0 NOT NULL,
    frequency numeric(10,4) DEFAULT 1.0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    unique_clicks bigint DEFAULT 0,
    link_clicks bigint DEFAULT 0 NOT NULL,
    cpc numeric(16,4) DEFAULT 0 NOT NULL,
    cpm numeric(16,4) DEFAULT 0 NOT NULL,
    ctr numeric(10,4) DEFAULT 0 NOT NULL,
    conversions numeric(16,2) DEFAULT 0 NOT NULL,
    conversion_value numeric(16,2) DEFAULT 0 NOT NULL,
    cost_per_conversion numeric(16,2) DEFAULT 0 NOT NULL,
    roas numeric(10,4) DEFAULT 0 NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb,
    action_values jsonb DEFAULT '[]'::jsonb,
    raw_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_sync_exceptions (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    entity_type character varying(64) NOT NULL,
    external_id character varying(128),
    error_code character varying(128) NOT NULL,
    error_message text NOT NULL,
    severity character varying(32) DEFAULT 'error'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    last_attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_entity_mappings (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    entity_type character varying(32) DEFAULT 'sku'::character varying NOT NULL,
    marketplace_sku character varying(128) NOT NULL,
    marketplace_asin character varying(64),
    marketplace_title character varying(500),
    jyotsvan_sku character varying(128),
    jyotsvan_product_id character varying(64),
    jyotsvan_product_name character varying(255),
    mapping_status character varying(32) DEFAULT 'unmapped'::character varying NOT NULL,
    notes text,
    mapped_by character varying(64),
    mapped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_fees (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    marketplace_id character varying(64),
    settlement_id character varying(128),
    external_order_id character varying(128),
    seller_sku character varying(128),
    fee_type character varying(128) NOT NULL,
    fee_amount numeric(14,2) DEFAULT 0 NOT NULL,
    currency character varying(8) DEFAULT 'INR'::character varying NOT NULL,
    description text,
    posted_date timestamp with time zone NOT NULL,
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_inventory (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    marketplace_id character varying(64) NOT NULL,
    seller_sku character varying(128) NOT NULL,
    asin character varying(64),
    fnsku character varying(64),
    fulfillment_channel character varying(32) DEFAULT 'FBA'::character varying NOT NULL,
    available_quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    inbound_working integer DEFAULT 0 NOT NULL,
    inbound_shipped integer DEFAULT 0 NOT NULL,
    inbound_receiving integer DEFAULT 0 NOT NULL,
    total_quantity integer DEFAULT 0 NOT NULL,
    condition character varying(64) DEFAULT 'NewItem'::character varying,
    last_updated_at timestamp with time zone DEFAULT now(),
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_marketplaces (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    marketplace_id character varying(64) NOT NULL,
    country_code character varying(8) NOT NULL,
    name character varying(255) NOT NULL,
    currency character varying(8) NOT NULL,
    domain_name character varying(255),
    default_language_code character varying(16),
    is_participating boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    order_id character varying(64) NOT NULL,
    external_order_id character varying(128) NOT NULL,
    external_order_item_id character varying(128) NOT NULL,
    seller_sku character varying(128) NOT NULL,
    asin character varying(64),
    title character varying(500) NOT NULL,
    quantity_ordered integer DEFAULT 1 NOT NULL,
    quantity_shipped integer DEFAULT 0 NOT NULL,
    item_price numeric(14,2) DEFAULT 0 NOT NULL,
    item_tax numeric(14,2) DEFAULT 0 NOT NULL,
    shipping_price numeric(14,2) DEFAULT 0 NOT NULL,
    shipping_tax numeric(14,2) DEFAULT 0 NOT NULL,
    item_discount numeric(14,2) DEFAULT 0 NOT NULL,
    promotion_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    condition_id character varying(64),
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    marketplace_id character varying(64) NOT NULL,
    external_order_id character varying(128) NOT NULL,
    order_number character varying(128),
    purchase_date timestamp with time zone NOT NULL,
    last_update_date timestamp with time zone,
    order_status character varying(64) NOT NULL,
    fulfillment_channel character varying(32) DEFAULT 'MFN'::character varying NOT NULL,
    sales_channel character varying(128),
    ship_service_level character varying(64),
    currency character varying(8) DEFAULT 'INR'::character varying NOT NULL,
    order_total numeric(14,2) DEFAULT 0 NOT NULL,
    items_subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    shipping_price numeric(14,2) DEFAULT 0 NOT NULL,
    tax_total numeric(14,2) DEFAULT 0 NOT NULL,
    discount_total numeric(14,2) DEFAULT 0 NOT NULL,
    buyer_email character varying(255),
    buyer_name character varying(255),
    shipping_address jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_business_order boolean DEFAULT false NOT NULL,
    is_prime boolean DEFAULT false NOT NULL,
    is_replacement_order boolean DEFAULT false NOT NULL,
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_performance (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    metric_name character varying(128) NOT NULL,
    metric_key character varying(64) NOT NULL,
    metric_category character varying(64) NOT NULL,
    current_value numeric(10,2) NOT NULL,
    benchmark_target numeric(10,2) NOT NULL,
    unit character varying(32) DEFAULT '%'::character varying NOT NULL,
    status character varying(32) DEFAULT 'GOOD'::character varying NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    historical_trend jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_products (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    marketplace_id character varying(64) NOT NULL,
    external_product_id character varying(128) NOT NULL,
    seller_sku character varying(128) NOT NULL,
    asin character varying(64),
    fnsku character varying(64),
    title character varying(500) NOT NULL,
    description text,
    brand character varying(255),
    manufacturer character varying(255),
    item_type character varying(128),
    product_status character varying(64) DEFAULT 'ACTIVE'::character varying NOT NULL,
    listing_price numeric(14,2) DEFAULT 0 NOT NULL,
    currency character varying(8) DEFAULT 'INR'::character varying NOT NULL,
    main_image_url text,
    product_url text,
    fulfillment_channel character varying(32) DEFAULT 'MFN'::character varying NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_reports (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    report_id character varying(128) NOT NULL,
    report_type character varying(128) NOT NULL,
    marketplace_id character varying(64),
    data_start_time timestamp with time zone,
    data_end_time timestamp with time zone,
    report_status character varying(64) DEFAULT 'SUBMITTED'::character varying NOT NULL,
    document_id character varying(128),
    processing_status character varying(64) DEFAULT 'PENDING'::character varying NOT NULL,
    records_parsed integer DEFAULT 0 NOT NULL,
    generated_at timestamp with time zone,
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_returns (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    marketplace_id character varying(64) NOT NULL,
    external_return_id character varying(128) NOT NULL,
    order_id character varying(64),
    order_item_id character varying(64),
    seller_sku character varying(128) NOT NULL,
    asin character varying(64),
    quantity integer DEFAULT 1 NOT NULL,
    return_reason character varying(255),
    return_reason_details text,
    return_status character varying(64) DEFAULT 'COMPLETED'::character varying NOT NULL,
    return_date timestamp with time zone NOT NULL,
    refund_amount numeric(14,2) DEFAULT 0,
    currency character varying(8) DEFAULT 'INR'::character varying NOT NULL,
    fulfillment_center_id character varying(64),
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_settlements (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    marketplace_id character varying(64) NOT NULL,
    settlement_id character varying(128) NOT NULL,
    settlement_start_date timestamp with time zone NOT NULL,
    settlement_end_date timestamp with time zone NOT NULL,
    deposit_date timestamp with time zone,
    currency character varying(8) DEFAULT 'INR'::character varying NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    gross_sales_amount numeric(14,2) DEFAULT 0 NOT NULL,
    refunds_amount numeric(14,2) DEFAULT 0 NOT NULL,
    fees_amount numeric(14,2) DEFAULT 0 NOT NULL,
    adjustments_amount numeric(14,2) DEFAULT 0 NOT NULL,
    taxes_amount numeric(14,2) DEFAULT 0 NOT NULL,
    status character varying(64) DEFAULT 'CLOSED'::character varying NOT NULL,
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_sync_checkpoints (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    provider_key character varying(64) NOT NULL,
    entity_type character varying(64) NOT NULL,
    marketplace_id character varying(64),
    last_sync_at timestamp with time zone DEFAULT now() NOT NULL,
    last_checkpoint_token text,
    cursor text,
    status character varying(32) DEFAULT 'SUCCESS'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_sync_jobs (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64),
    provider_key character varying(64) NOT NULL,
    sync_type character varying(32) DEFAULT 'incremental'::character varying NOT NULL,
    entity_types text[] DEFAULT '{}'::text[] NOT NULL,
    trigger_source character varying(32) DEFAULT 'MANUAL'::character varying NOT NULL,
    status character varying(32) DEFAULT 'RUNNING'::character varying NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms integer DEFAULT 0 NOT NULL,
    records_processed integer DEFAULT 0 NOT NULL,
    records_created integer DEFAULT 0 NOT NULL,
    records_updated integer DEFAULT 0 NOT NULL,
    records_failed integer DEFAULT 0 NOT NULL,
    error_message text,
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_category_preferences (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    category character varying(64) NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    event_type character varying(64) NOT NULL,
    entity_type character varying(64) NOT NULL,
    entity_id character varying(128) NOT NULL,
    actor_user_id character varying(64),
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    idempotency_key character varying(255),
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    error_message text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    notification_type character varying(64) NOT NULL,
    category character varying(64) NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT false NOT NULL,
    whatsapp_enabled boolean DEFAULT false NOT NULL,
    sms_enabled boolean DEFAULT false NOT NULL,
    push_enabled boolean DEFAULT false NOT NULL,
    min_priority character varying(32) DEFAULT 'low'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.production_material_issues (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    issue_number character varying(64) NOT NULL,
    production_order_id character varying(64) NOT NULL,
    component_id character varying(64) NOT NULL,
    sku_id character varying(64) NOT NULL,
    warehouse_id character varying(64) NOT NULL,
    location_id character varying(64),
    batch_id character varying(64),
    batch_number character varying(128),
    quantity numeric(14,4) NOT NULL,
    unit_id character varying(64) NOT NULL,
    reservation_id character varying(64),
    inventory_movement_id character varying(64),
    issued_by character varying(64),
    issued_by_email character varying(255),
    notes text,
    idempotency_key character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_issue_qty CHECK ((quantity > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.production_material_returns (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    return_number character varying(64) NOT NULL,
    production_order_id character varying(64) NOT NULL,
    component_id character varying(64) NOT NULL,
    sku_id character varying(64) NOT NULL,
    warehouse_id character varying(64) NOT NULL,
    location_id character varying(64),
    quantity numeric(14,4) NOT NULL,
    unit_id character varying(64) NOT NULL,
    inventory_movement_id character varying(64),
    returned_by character varying(64),
    returned_by_email character varying(255),
    reason text NOT NULL,
    notes text,
    idempotency_key character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_return_qty CHECK ((quantity > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.production_order_components (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    production_order_id character varying(64) NOT NULL,
    component_product_id character varying(64),
    component_sku_id character varying(64) NOT NULL,
    component_type character varying(64) DEFAULT 'raw_material'::character varying NOT NULL,
    required_quantity numeric(14,4) NOT NULL,
    required_unit_id character varying(64) NOT NULL,
    wastage_allowance_percentage numeric(6,2) DEFAULT 0.00,
    planned_quantity numeric(14,4) NOT NULL,
    reserved_quantity numeric(14,4) DEFAULT 0.0000 NOT NULL,
    issued_quantity numeric(14,4) DEFAULT 0.0000 NOT NULL,
    actual_consumed_quantity numeric(14,4) DEFAULT 0.0000 NOT NULL,
    returned_quantity numeric(14,4) DEFAULT 0.0000 NOT NULL,
    sequence_order integer DEFAULT 1 NOT NULL,
    is_substitute boolean DEFAULT false NOT NULL,
    substituted_for_sku_id character varying(64),
    standard_unit_cost numeric(14,4) DEFAULT 0.0000,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_order_comp_qty CHECK ((required_quantity > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.production_orders (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    production_order_number character varying(64) NOT NULL,
    production_plan_id character varying(64),
    formulation_id character varying(64) NOT NULL,
    formulation_version character varying(32) NOT NULL,
    formulation_code_snapshot character varying(64) NOT NULL,
    formulation_name_snapshot character varying(255) NOT NULL,
    finished_product_id character varying(64),
    finished_sku_id character varying(64) NOT NULL,
    warehouse_id character varying(64) NOT NULL,
    target_location_id character varying(64),
    planned_quantity numeric(14,4) NOT NULL,
    planned_unit_id character varying(64) NOT NULL,
    scaling_ratio numeric(10,4) DEFAULT 1.0000 NOT NULL,
    expected_yield numeric(14,4) NOT NULL,
    expected_yield_unit_id character varying(64) NOT NULL,
    expected_wastage_quantity numeric(14,4) DEFAULT 0.0000,
    actual_output_quantity numeric(14,4) DEFAULT 0.0000 NOT NULL,
    actual_wastage_quantity numeric(14,4) DEFAULT 0.0000 NOT NULL,
    actual_rejected_quantity numeric(14,4) DEFAULT 0.0000 NOT NULL,
    planned_start_date date,
    planned_end_date date,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    material_status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    qc_status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    qc_template_id character varying(64),
    qc_inspection_id character varying(64),
    production_batch_number character varying(64),
    notes text,
    created_by character varying(64),
    created_by_email character varying(255),
    approved_by character varying(64),
    approved_by_email character varying(255),
    approved_at timestamp with time zone,
    completed_by character varying(64),
    completed_by_email character varying(255),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_prod_expected_yield CHECK ((expected_yield >= (0)::numeric)),
    CONSTRAINT chk_prod_planned_qty CHECK ((planned_quantity > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.production_outputs (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    output_number character varying(64) NOT NULL,
    production_order_id character varying(64) NOT NULL,
    sku_id character varying(64) NOT NULL,
    warehouse_id character varying(64) NOT NULL,
    location_id character varying(64),
    batch_number character varying(128) NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit_id character varying(64) NOT NULL,
    manufacturing_date date,
    expiry_date date,
    inventory_stock_type character varying(32) DEFAULT 'quarantine'::character varying NOT NULL,
    inventory_movement_id character varying(64),
    qc_inspection_id character varying(64),
    operator_user_id character varying(64),
    operator_email character varying(255),
    notes text,
    idempotency_key character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_output_qty CHECK ((quantity > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.production_plans (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    plan_number character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    planned_date date NOT NULL,
    warehouse_id character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_by character varying(64),
    created_by_email character varying(255),
    approved_by character varying(64),
    approved_by_email character varying(255),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.production_wastages (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    production_order_id character varying(64) NOT NULL,
    category character varying(64) NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit_id character varying(64) NOT NULL,
    sku_id character varying(64),
    reason text NOT NULL,
    recorded_by character varying(64),
    recorded_by_email character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_wastage_qty CHECK ((quantity > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.sales_order_pick_items (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    sales_order_id character varying(64) NOT NULL,
    sales_order_item_id character varying(64),
    sku_id character varying(64),
    warehouse_id character varying(64),
    location_id character varying(64),
    batch_id character varying(64),
    batch_number character varying(128),
    picked_quantity numeric(14,3) DEFAULT 0 NOT NULL,
    picked_by character varying(64),
    picked_by_email character varying(255),
    picked_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'picked'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sales_territory_assignments (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    territory_id character varying(64) NOT NULL,
    salesperson_id character varying(64) NOT NULL,
    salesperson_name character varying(128) NOT NULL,
    salesperson_email character varying(255),
    role character varying(64) DEFAULT 'sales_officer'::character varying NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_to timestamp with time zone,
    priority_rank integer DEFAULT 1 NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shopify_sync_checkpoints (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    entity_type character varying(64) NOT NULL,
    last_synced_at timestamp with time zone,
    last_cursor character varying(255),
    records_synced_total integer DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'idle'::character varying NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shopify_sync_exceptions (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    connection_id character varying(64) NOT NULL,
    entity_type character varying(64) NOT NULL,
    external_id character varying(255) NOT NULL,
    external_identifier character varying(255),
    error_code character varying(64) NOT NULL,
    error_message text NOT NULL,
    raw_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    resolution_notes text,
    resolved_at timestamp with time zone,
    resolved_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.auth_login_attempts ALTER COLUMN id SET DEFAULT nextval('public.auth_login_attempts_id_seq'::regclass);

ALTER TABLE ONLY public.audit_retention_policies
    ADD CONSTRAINT audit_retention_policies_organization_id_key UNIQUE (organization_id);

ALTER TABLE ONLY public.audit_retention_policies
    ADD CONSTRAINT audit_retention_policies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_login_attempts
    ADD CONSTRAINT auth_login_attempts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);

ALTER TABLE ONLY public.field_sales_order_drafts
    ADD CONSTRAINT field_sales_order_drafts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.field_sales_route_stops
    ADD CONSTRAINT field_sales_route_stops_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.field_sales_routes
    ADD CONSTRAINT field_sales_routes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.field_sales_targets
    ADD CONSTRAINT field_sales_targets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.field_sales_tasks
    ADD CONSTRAINT field_sales_tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.field_sales_visits
    ADD CONSTRAINT field_sales_visits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.formulation_components
    ADD CONSTRAINT formulation_components_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.formulation_costings
    ADD CONSTRAINT formulation_costings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.formulation_substitutions
    ADD CONSTRAINT formulation_substitutions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_accounts
    ADD CONSTRAINT google_ads_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_ad_groups
    ADD CONSTRAINT google_ads_ad_groups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_campaigns
    ADD CONSTRAINT google_ads_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_conversion_actions
    ADD CONSTRAINT google_ads_conversion_actions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_devices
    ADD CONSTRAINT google_ads_devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_keywords
    ADD CONSTRAINT google_ads_keywords_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_locations
    ADD CONSTRAINT google_ads_locations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_ads_search_terms
    ADD CONSTRAINT google_ads_search_terms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT integration_connections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_credentials
    ADD CONSTRAINT integration_credentials_connection_id_key UNIQUE (connection_id);

ALTER TABLE ONLY public.integration_credentials
    ADD CONSTRAINT integration_credentials_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_mappings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_events
    ADD CONSTRAINT integration_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_providers
    ADD CONSTRAINT integration_providers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_providers
    ADD CONSTRAINT integration_providers_provider_key_key UNIQUE (provider_key);

ALTER TABLE ONLY public.integration_sync_jobs
    ADD CONSTRAINT integration_sync_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integration_webhooks
    ADD CONSTRAINT integration_webhooks_endpoint_identifier_key UNIQUE (endpoint_identifier);

ALTER TABLE ONLY public.integration_webhooks
    ADD CONSTRAINT integration_webhooks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_ad_accounts
    ADD CONSTRAINT marketing_ad_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_ad_sets
    ADD CONSTRAINT marketing_ad_sets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_breakdown_insights
    ADD CONSTRAINT marketing_breakdown_insights_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_creatives
    ADD CONSTRAINT marketing_creatives_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_daily_insights
    ADD CONSTRAINT marketing_daily_insights_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketing_sync_exceptions
    ADD CONSTRAINT marketing_sync_exceptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_entity_mappings
    ADD CONSTRAINT marketplace_entity_mappings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_fees
    ADD CONSTRAINT marketplace_fees_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_inventory
    ADD CONSTRAINT marketplace_inventory_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_marketplaces
    ADD CONSTRAINT marketplace_marketplaces_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_performance
    ADD CONSTRAINT marketplace_performance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_products
    ADD CONSTRAINT marketplace_products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_reports
    ADD CONSTRAINT marketplace_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_returns
    ADD CONSTRAINT marketplace_returns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_settlements
    ADD CONSTRAINT marketplace_settlements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_sync_checkpoints
    ADD CONSTRAINT marketplace_sync_checkpoints_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_sync_jobs
    ADD CONSTRAINT marketplace_sync_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_category_preferences
    ADD CONSTRAINT notification_category_preferences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT production_order_components_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT production_plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.production_wastages
    ADD CONSTRAINT production_wastages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sales_order_pick_items
    ADD CONSTRAINT sales_order_pick_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sales_territory_assignments
    ADD CONSTRAINT sales_territory_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shopify_sync_checkpoints
    ADD CONSTRAINT shopify_sync_checkpoints_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shopify_sync_exceptions
    ADD CONSTRAINT shopify_sync_exceptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.formulation_components
    ADD CONSTRAINT uk_form_comp_sku UNIQUE (formulation_id, component_sku_id);

ALTER TABLE ONLY public.formulation_costings
    ADD CONSTRAINT uk_form_costing_basis UNIQUE (formulation_id, cost_basis);

ALTER TABLE ONLY public.formulation_substitutions
    ADD CONSTRAINT uk_form_subst UNIQUE (formulation_id, primary_component_id, alternate_sku_id);

ALTER TABLE ONLY public.field_sales_routes
    ADD CONSTRAINT uk_org_field_route_code UNIQUE (organization_id, route_code);

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT uk_org_form_code_version UNIQUE (organization_id, formulation_code, version);

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT uk_org_issue_num UNIQUE (organization_id, issue_number);

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT uk_org_output_num UNIQUE (organization_id, output_number);

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT uk_org_plan_number UNIQUE (organization_id, plan_number);

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT uk_org_prod_order_num UNIQUE (organization_id, production_order_number);

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT uk_org_return_num UNIQUE (organization_id, return_number);

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT uk_org_sku_version UNIQUE (organization_id, finished_sku_id, version);

ALTER TABLE ONLY public.sales_territory_assignments
    ADD CONSTRAINT uk_org_territory_user UNIQUE (organization_id, territory_id, salesperson_id);

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT uk_prod_order_comp UNIQUE (production_order_id, component_sku_id);

ALTER TABLE ONLY public.field_sales_route_stops
    ADD CONSTRAINT uk_route_stop_seq UNIQUE (route_id, stop_sequence);

ALTER TABLE ONLY public.field_sales_targets
    ADD CONSTRAINT uk_target_user_period UNIQUE (organization_id, salesperson_id, target_type, period_identifier);

ALTER TABLE ONLY public.notification_category_preferences
    ADD CONSTRAINT uk_user_cat_pref UNIQUE (organization_id, user_id, category);

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT uk_user_notif_pref UNIQUE (organization_id, user_id, notification_type);

ALTER TABLE ONLY public.integration_events
    ADD CONSTRAINT uq_connection_external_event UNIQUE (connection_id, external_event_id);

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT uq_entity_mapping UNIQUE (organization_id, connection_id, entity_type, external_id);

ALTER TABLE ONLY public.google_ads_ad_groups
    ADD CONSTRAINT uq_gads_org_adgroup UNIQUE (organization_id, external_adgroup_id);

ALTER TABLE ONLY public.google_ads_campaigns
    ADD CONSTRAINT uq_gads_org_campaign UNIQUE (organization_id, external_campaign_id);

ALTER TABLE ONLY public.google_ads_conversion_actions
    ADD CONSTRAINT uq_gads_org_convactions UNIQUE (organization_id, external_conversion_id);

ALTER TABLE ONLY public.google_ads_accounts
    ADD CONSTRAINT uq_gads_org_customer UNIQUE (organization_id, customer_id);

ALTER TABLE ONLY public.google_ads_devices
    ADD CONSTRAINT uq_gads_org_dev UNIQUE (organization_id, account_id, device_type);

ALTER TABLE ONLY public.google_ads_keywords
    ADD CONSTRAINT uq_gads_org_keyword UNIQUE (organization_id, external_criterion_id);

ALTER TABLE ONLY public.google_ads_locations
    ADD CONSTRAINT uq_gads_org_loc UNIQUE (organization_id, account_id, location_name, location_type);

ALTER TABLE ONLY public.google_ads_search_terms
    ADD CONSTRAINT uq_gads_org_query UNIQUE (organization_id, ad_group_id, query_text);

ALTER TABLE ONLY public.marketplace_sync_checkpoints
    ADD CONSTRAINT uq_mkt_checkpoint UNIQUE (connection_id, entity_type, marketplace_id);

ALTER TABLE ONLY public.marketplace_marketplaces
    ADD CONSTRAINT uq_mkt_conn_mktid UNIQUE (connection_id, marketplace_id);

ALTER TABLE ONLY public.marketing_daily_insights
    ADD CONSTRAINT uq_mkt_daily_insight UNIQUE (organization_id, ad_account_id, level, date, external_campaign_id, external_adset_id, external_ad_id);

ALTER TABLE ONLY public.marketplace_entity_mappings
    ADD CONSTRAINT uq_mkt_entity_sku UNIQUE (connection_id, provider_key, marketplace_sku);

ALTER TABLE ONLY public.marketplace_inventory
    ADD CONSTRAINT uq_mkt_inv_sku_ch UNIQUE (connection_id, marketplace_id, seller_sku, fulfillment_channel);

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT uq_mkt_order_ext UNIQUE (connection_id, external_order_id);

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT uq_mkt_order_item UNIQUE (order_id, external_order_item_id);

ALTER TABLE ONLY public.marketing_ad_accounts
    ADD CONSTRAINT uq_mkt_org_account UNIQUE (organization_id, external_ad_account_id);

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT uq_mkt_org_ad UNIQUE (organization_id, external_ad_id);

ALTER TABLE ONLY public.marketing_ad_sets
    ADD CONSTRAINT uq_mkt_org_adset UNIQUE (organization_id, external_adset_id);

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT uq_mkt_org_campaign UNIQUE (organization_id, external_campaign_id);

ALTER TABLE ONLY public.marketing_creatives
    ADD CONSTRAINT uq_mkt_org_creative UNIQUE (organization_id, external_creative_id);

ALTER TABLE ONLY public.marketplace_performance
    ADD CONSTRAINT uq_mkt_perf_metric UNIQUE (connection_id, metric_key, period_start);

ALTER TABLE ONLY public.marketplace_products
    ADD CONSTRAINT uq_mkt_prod_sku UNIQUE (connection_id, marketplace_id, seller_sku);

ALTER TABLE ONLY public.marketplace_reports
    ADD CONSTRAINT uq_mkt_report_id UNIQUE (connection_id, report_id);

ALTER TABLE ONLY public.marketplace_returns
    ADD CONSTRAINT uq_mkt_return_ext UNIQUE (connection_id, external_return_id);

ALTER TABLE ONLY public.marketplace_settlements
    ADD CONSTRAINT uq_mkt_settle_id UNIQUE (connection_id, settlement_id);

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT uq_org_provider_name UNIQUE (organization_id, provider_key, name);

ALTER TABLE ONLY public.shopify_sync_checkpoints
    ADD CONSTRAINT uq_shopify_checkpoint UNIQUE (organization_id, connection_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email ON public.auth_login_attempts USING btree (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_org ON public.auth_sessions USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON public.auth_sessions USING btree (user_id) WHERE (revoked_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_entity_map_ext_ident ON public.integration_entity_mappings USING btree (organization_id, entity_type, external_identifier);

CREATE INDEX IF NOT EXISTS idx_entity_map_internal ON public.integration_entity_mappings USING btree (organization_id, entity_type, internal_id);

CREATE INDEX IF NOT EXISTS idx_entity_map_lookup ON public.integration_entity_mappings USING btree (organization_id, connection_id, entity_type, external_id);

CREATE INDEX IF NOT EXISTS idx_form_comp_form_id ON public.formulation_components USING btree (formulation_id);

CREATE INDEX IF NOT EXISTS idx_form_comp_org_id ON public.formulation_components USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_form_comp_sku_id ON public.formulation_components USING btree (component_sku_id);

CREATE INDEX IF NOT EXISTS idx_form_comp_type ON public.formulation_components USING btree (component_type);

CREATE INDEX IF NOT EXISTS idx_form_subst_alt_sku ON public.formulation_substitutions USING btree (alternate_sku_id);

CREATE INDEX IF NOT EXISTS idx_form_subst_form_id ON public.formulation_substitutions USING btree (formulation_id);

CREATE INDEX IF NOT EXISTS idx_formulations_code ON public.formulations USING btree (formulation_code);

CREATE INDEX IF NOT EXISTS idx_formulations_effective ON public.formulations USING btree (effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_formulations_org_status ON public.formulations USING btree (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_formulations_product ON public.formulations USING btree (finished_product_id);

CREATE INDEX IF NOT EXISTS idx_formulations_sku ON public.formulations USING btree (finished_sku_id);

CREATE INDEX IF NOT EXISTS idx_fs_drafts_org ON public.field_sales_order_drafts USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_fs_drafts_sales ON public.field_sales_order_drafts USING btree (salesperson_id);

CREATE INDEX IF NOT EXISTS idx_fs_drafts_visit ON public.field_sales_order_drafts USING btree (visit_id);

CREATE INDEX IF NOT EXISTS idx_fs_routes_org ON public.field_sales_routes USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_fs_routes_status ON public.field_sales_routes USING btree (status);

CREATE INDEX IF NOT EXISTS idx_fs_routes_terr ON public.field_sales_routes USING btree (territory_id);

CREATE INDEX IF NOT EXISTS idx_fs_routes_user ON public.field_sales_routes USING btree (salesperson_id);

CREATE INDEX IF NOT EXISTS idx_fs_stops_cust ON public.field_sales_route_stops USING btree (customer_type, customer_id);

CREATE INDEX IF NOT EXISTS idx_fs_stops_route ON public.field_sales_route_stops USING btree (route_id);

CREATE INDEX IF NOT EXISTS idx_fs_targets_org ON public.field_sales_targets USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_fs_targets_period ON public.field_sales_targets USING btree (period_identifier);

CREATE INDEX IF NOT EXISTS idx_fs_targets_user ON public.field_sales_targets USING btree (salesperson_id);

CREATE INDEX IF NOT EXISTS idx_fs_tasks_due ON public.field_sales_tasks USING btree (due_date);

CREATE INDEX IF NOT EXISTS idx_fs_tasks_org ON public.field_sales_tasks USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_fs_tasks_status ON public.field_sales_tasks USING btree (status);

CREATE INDEX IF NOT EXISTS idx_fs_tasks_user ON public.field_sales_tasks USING btree (salesperson_id);

CREATE INDEX IF NOT EXISTS idx_fs_visits_created ON public.field_sales_visits USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fs_visits_cust ON public.field_sales_visits USING btree (customer_type, customer_id);

CREATE INDEX IF NOT EXISTS idx_fs_visits_org ON public.field_sales_visits USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_fs_visits_planned ON public.field_sales_visits USING btree (planned_date);

CREATE INDEX IF NOT EXISTS idx_fs_visits_sales ON public.field_sales_visits USING btree (salesperson_id);

CREATE INDEX IF NOT EXISTS idx_fs_visits_status ON public.field_sales_visits USING btree (status);

CREATE INDEX IF NOT EXISTS idx_gads_adgroups_camp ON public.google_ads_ad_groups USING btree (organization_id, campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_gads_campaigns_org ON public.google_ads_campaigns USING btree (organization_id, account_id, status);

CREATE INDEX IF NOT EXISTS idx_gads_insights_adgroup ON public.google_ads_daily_insights USING btree (ad_group_id, date);

CREATE INDEX IF NOT EXISTS idx_gads_insights_camp ON public.google_ads_daily_insights USING btree (campaign_id, date);

CREATE INDEX IF NOT EXISTS idx_gads_insights_keyword ON public.google_ads_daily_insights USING btree (keyword_id, date);

CREATE INDEX IF NOT EXISTS idx_gads_insights_org_date ON public.google_ads_daily_insights USING btree (organization_id, date, level);

CREATE INDEX IF NOT EXISTS idx_gads_keywords_ag ON public.google_ads_keywords USING btree (organization_id, ad_group_id, status);

CREATE INDEX IF NOT EXISTS idx_int_conn_org ON public.integration_connections USING btree (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_int_conn_provider ON public.integration_connections USING btree (provider_key);

CREATE INDEX IF NOT EXISTS idx_int_events_conn ON public.integration_events USING btree (connection_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_int_events_org_status ON public.integration_events USING btree (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_int_logs_conn ON public.integration_logs USING btree (connection_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_int_logs_org_time ON public.integration_logs USING btree (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_int_sync_conn ON public.integration_sync_jobs USING btree (connection_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_int_webhooks_ident ON public.integration_webhooks USING btree (endpoint_identifier);

CREATE INDEX IF NOT EXISTS idx_int_webhooks_org ON public.integration_webhooks USING btree (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_sync_jobs_org ON public.marketplace_sync_jobs USING btree (organization_id, provider_key, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_mkt_acc_org ON public.marketing_ad_accounts USING btree (organization_id, connection_id);

CREATE INDEX IF NOT EXISTS idx_mkt_ad_set ON public.marketing_ads USING btree (adset_id, status);

CREATE INDEX IF NOT EXISTS idx_mkt_ads_cmp ON public.marketing_ad_sets USING btree (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_mkt_brk_org_date ON public.marketing_breakdown_insights USING btree (organization_id, breakdown_type, date);

CREATE INDEX IF NOT EXISTS idx_mkt_cmp_acc ON public.marketing_campaigns USING btree (ad_account_id, status);

CREATE INDEX IF NOT EXISTS idx_mkt_daily_acc_date ON public.marketing_daily_insights USING btree (ad_account_id, date);

CREATE INDEX IF NOT EXISTS idx_mkt_daily_cmp_date ON public.marketing_daily_insights USING btree (external_campaign_id, date);

CREATE INDEX IF NOT EXISTS idx_mkt_daily_org_date ON public.marketing_daily_insights USING btree (organization_id, date, level);

CREATE INDEX IF NOT EXISTS idx_mkt_fees_org_date ON public.marketplace_fees USING btree (organization_id, posted_date DESC);

CREATE INDEX IF NOT EXISTS idx_mkt_inv_org_sku ON public.marketplace_inventory USING btree (organization_id, seller_sku);

CREATE INDEX IF NOT EXISTS idx_mkt_mappings_sku ON public.marketplace_entity_mappings USING btree (organization_id, marketplace_sku);

CREATE INDEX IF NOT EXISTS idx_mkt_order_items_order ON public.marketplace_order_items USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_mkt_order_items_sku ON public.marketplace_order_items USING btree (seller_sku);

CREATE INDEX IF NOT EXISTS idx_mkt_orders_org_date ON public.marketplace_orders USING btree (organization_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_mkt_orders_status ON public.marketplace_orders USING btree (connection_id, order_status);

CREATE INDEX IF NOT EXISTS idx_mkt_perf_conn_cat ON public.marketplace_performance USING btree (connection_id, metric_category);

CREATE INDEX IF NOT EXISTS idx_mkt_prods_org_sku ON public.marketplace_products USING btree (organization_id, seller_sku);

CREATE INDEX IF NOT EXISTS idx_mkt_reports_org_type ON public.marketplace_reports USING btree (organization_id, report_type);

CREATE INDEX IF NOT EXISTS idx_mkt_returns_org_date ON public.marketplace_returns USING btree (organization_id, return_date DESC);

CREATE INDEX IF NOT EXISTS idx_mkt_settlements_org_date ON public.marketplace_settlements USING btree (organization_id, settlement_end_date DESC);

CREATE INDEX IF NOT EXISTS idx_notif_cat_pref_user ON public.notification_category_preferences USING btree (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_notif_outbox_status ON public.notification_outbox USING btree (status, created_at);

CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON public.notification_preferences USING btree (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_pick_items_order ON public.sales_order_pick_items USING btree (sales_order_id);

CREATE INDEX IF NOT EXISTS idx_prod_issues_order ON public.production_material_issues USING btree (production_order_id);

CREATE INDEX IF NOT EXISTS idx_prod_issues_sku ON public.production_material_issues USING btree (sku_id);

CREATE INDEX IF NOT EXISTS idx_prod_issues_wh ON public.production_material_issues USING btree (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_prod_order_comp_order ON public.production_order_components USING btree (production_order_id);

CREATE INDEX IF NOT EXISTS idx_prod_order_comp_sku ON public.production_order_components USING btree (component_sku_id);

CREATE INDEX IF NOT EXISTS idx_prod_orders_dates ON public.production_orders USING btree (planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_prod_orders_org_status ON public.production_orders USING btree (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_prod_orders_plan ON public.production_orders USING btree (production_plan_id);

CREATE INDEX IF NOT EXISTS idx_prod_orders_sku ON public.production_orders USING btree (finished_sku_id);

CREATE INDEX IF NOT EXISTS idx_prod_orders_wh ON public.production_orders USING btree (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_prod_outputs_batch ON public.production_outputs USING btree (batch_number);

CREATE INDEX IF NOT EXISTS idx_prod_outputs_order ON public.production_outputs USING btree (production_order_id);

CREATE INDEX IF NOT EXISTS idx_prod_outputs_sku ON public.production_outputs USING btree (sku_id);

CREATE INDEX IF NOT EXISTS idx_prod_plans_date ON public.production_plans USING btree (planned_date);

CREATE INDEX IF NOT EXISTS idx_prod_plans_org_status ON public.production_plans USING btree (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_prod_plans_wh ON public.production_plans USING btree (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_prod_returns_order ON public.production_material_returns USING btree (production_order_id);

CREATE INDEX IF NOT EXISTS idx_prod_returns_sku ON public.production_material_returns USING btree (sku_id);

CREATE INDEX IF NOT EXISTS idx_prod_wastages_order ON public.production_wastages USING btree (production_order_id);

CREATE INDEX IF NOT EXISTS idx_shopify_exceptions ON public.shopify_sync_exceptions USING btree (organization_id, connection_id, status);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_chk ON public.shopify_sync_checkpoints USING btree (organization_id, connection_id);

CREATE INDEX IF NOT EXISTS idx_terr_assign_org ON public.sales_territory_assignments USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_terr_assign_status ON public.sales_territory_assignments USING btree (status);

CREATE INDEX IF NOT EXISTS idx_terr_assign_terr ON public.sales_territory_assignments USING btree (territory_id);

CREATE INDEX IF NOT EXISTS idx_terr_assign_user ON public.sales_territory_assignments USING btree (salesperson_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mkt_breakdown_insight ON public.marketing_breakdown_insights USING btree (organization_id, ad_account_id, level, date, breakdown_type, breakdown_value, COALESCE(breakdown_secondary_value, ''::character varying));

ALTER TABLE ONLY public.audit_retention_policies
    ADD CONSTRAINT audit_retention_policies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_order_drafts
    ADD CONSTRAINT field_sales_order_drafts_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributors(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_order_drafts
    ADD CONSTRAINT field_sales_order_drafts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_order_drafts
    ADD CONSTRAINT field_sales_order_drafts_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.field_sales_visits(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_order_drafts
    ADD CONSTRAINT field_sales_order_drafts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_route_stops
    ADD CONSTRAINT field_sales_route_stops_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_route_stops
    ADD CONSTRAINT field_sales_route_stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.field_sales_routes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_routes
    ADD CONSTRAINT field_sales_routes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_routes
    ADD CONSTRAINT field_sales_routes_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_routes
    ADD CONSTRAINT field_sales_routes_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_targets
    ADD CONSTRAINT field_sales_targets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_targets
    ADD CONSTRAINT field_sales_targets_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_targets
    ADD CONSTRAINT field_sales_targets_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_tasks
    ADD CONSTRAINT field_sales_tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_tasks
    ADD CONSTRAINT field_sales_tasks_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_tasks
    ADD CONSTRAINT field_sales_tasks_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.field_sales_visits(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_visits
    ADD CONSTRAINT field_sales_visits_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_visits
    ADD CONSTRAINT field_sales_visits_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.field_sales_routes(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.field_sales_visits
    ADD CONSTRAINT field_sales_visits_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.field_sales_visits
    ADD CONSTRAINT field_sales_visits_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulation_components
    ADD CONSTRAINT formulation_components_component_product_id_fkey FOREIGN KEY (component_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulation_components
    ADD CONSTRAINT formulation_components_component_sku_id_fkey FOREIGN KEY (component_sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulation_components
    ADD CONSTRAINT formulation_components_formulation_id_fkey FOREIGN KEY (formulation_id) REFERENCES public.formulations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.formulation_components
    ADD CONSTRAINT formulation_components_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulation_components
    ADD CONSTRAINT formulation_components_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulation_costings
    ADD CONSTRAINT formulation_costings_formulation_id_fkey FOREIGN KEY (formulation_id) REFERENCES public.formulations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.formulation_costings
    ADD CONSTRAINT formulation_costings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulation_substitutions
    ADD CONSTRAINT formulation_substitutions_alternate_sku_id_fkey FOREIGN KEY (alternate_sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulation_substitutions
    ADD CONSTRAINT formulation_substitutions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulation_substitutions
    ADD CONSTRAINT formulation_substitutions_formulation_id_fkey FOREIGN KEY (formulation_id) REFERENCES public.formulations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.formulation_substitutions
    ADD CONSTRAINT formulation_substitutions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulation_substitutions
    ADD CONSTRAINT formulation_substitutions_primary_component_id_fkey FOREIGN KEY (primary_component_id) REFERENCES public.formulation_components(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_batch_size_unit_id_fkey FOREIGN KEY (batch_size_unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_expected_wastage_unit_id_fkey FOREIGN KEY (expected_wastage_unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_expected_yield_unit_id_fkey FOREIGN KEY (expected_yield_unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_finished_product_id_fkey FOREIGN KEY (finished_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_finished_sku_id_fkey FOREIGN KEY (finished_sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_qc_template_id_fkey FOREIGN KEY (qc_template_id) REFERENCES public.qc_templates(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.formulations
    ADD CONSTRAINT formulations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.google_ads_accounts
    ADD CONSTRAINT google_ads_accounts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_accounts
    ADD CONSTRAINT google_ads_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_ad_groups
    ADD CONSTRAINT google_ads_ad_groups_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_ad_groups
    ADD CONSTRAINT google_ads_ad_groups_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_ad_groups
    ADD CONSTRAINT google_ads_ad_groups_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_ad_groups
    ADD CONSTRAINT google_ads_ad_groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_campaigns
    ADD CONSTRAINT google_ads_campaigns_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_campaigns
    ADD CONSTRAINT google_ads_campaigns_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_campaigns
    ADD CONSTRAINT google_ads_campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_conversion_actions
    ADD CONSTRAINT google_ads_conversion_actions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_conversion_actions
    ADD CONSTRAINT google_ads_conversion_actions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_ad_group_id_fkey FOREIGN KEY (ad_group_id) REFERENCES public.google_ads_ad_groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_conversion_action_id_fkey FOREIGN KEY (conversion_action_id) REFERENCES public.google_ads_conversion_actions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.google_ads_keywords(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.google_ads_locations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_daily_insights
    ADD CONSTRAINT google_ads_daily_insights_search_term_id_fkey FOREIGN KEY (search_term_id) REFERENCES public.google_ads_search_terms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_devices
    ADD CONSTRAINT google_ads_devices_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_devices
    ADD CONSTRAINT google_ads_devices_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_devices
    ADD CONSTRAINT google_ads_devices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_keywords
    ADD CONSTRAINT google_ads_keywords_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_keywords
    ADD CONSTRAINT google_ads_keywords_ad_group_id_fkey FOREIGN KEY (ad_group_id) REFERENCES public.google_ads_ad_groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_keywords
    ADD CONSTRAINT google_ads_keywords_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_keywords
    ADD CONSTRAINT google_ads_keywords_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_keywords
    ADD CONSTRAINT google_ads_keywords_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_locations
    ADD CONSTRAINT google_ads_locations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_locations
    ADD CONSTRAINT google_ads_locations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_locations
    ADD CONSTRAINT google_ads_locations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_search_terms
    ADD CONSTRAINT google_ads_search_terms_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_search_terms
    ADD CONSTRAINT google_ads_search_terms_ad_group_id_fkey FOREIGN KEY (ad_group_id) REFERENCES public.google_ads_ad_groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_search_terms
    ADD CONSTRAINT google_ads_search_terms_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_ads_search_terms
    ADD CONSTRAINT google_ads_search_terms_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.google_ads_keywords(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.google_ads_search_terms
    ADD CONSTRAINT google_ads_search_terms_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT integration_connections_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT integration_connections_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.integration_providers(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.integration_credentials
    ADD CONSTRAINT integration_credentials_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_credentials
    ADD CONSTRAINT integration_credentials_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_mappings_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_mappings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_events
    ADD CONSTRAINT integration_events_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_events
    ADD CONSTRAINT integration_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_sync_jobs
    ADD CONSTRAINT integration_sync_jobs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_sync_jobs
    ADD CONSTRAINT integration_sync_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_webhooks
    ADD CONSTRAINT integration_webhooks_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.integration_webhooks
    ADD CONSTRAINT integration_webhooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ad_accounts
    ADD CONSTRAINT marketing_ad_accounts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ad_accounts
    ADD CONSTRAINT marketing_ad_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ad_sets
    ADD CONSTRAINT marketing_ad_sets_ad_account_id_fkey FOREIGN KEY (ad_account_id) REFERENCES public.marketing_ad_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ad_sets
    ADD CONSTRAINT marketing_ad_sets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ad_sets
    ADD CONSTRAINT marketing_ad_sets_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ad_sets
    ADD CONSTRAINT marketing_ad_sets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_ad_account_id_fkey FOREIGN KEY (ad_account_id) REFERENCES public.marketing_ad_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_adset_id_fkey FOREIGN KEY (adset_id) REFERENCES public.marketing_ad_sets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_creative_id_fkey FOREIGN KEY (creative_id) REFERENCES public.marketing_creatives(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_breakdown_insights
    ADD CONSTRAINT marketing_breakdown_insights_ad_account_id_fkey FOREIGN KEY (ad_account_id) REFERENCES public.marketing_ad_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_breakdown_insights
    ADD CONSTRAINT marketing_breakdown_insights_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_breakdown_insights
    ADD CONSTRAINT marketing_breakdown_insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_ad_account_id_fkey FOREIGN KEY (ad_account_id) REFERENCES public.marketing_ad_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_creatives
    ADD CONSTRAINT marketing_creatives_ad_account_id_fkey FOREIGN KEY (ad_account_id) REFERENCES public.marketing_ad_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_creatives
    ADD CONSTRAINT marketing_creatives_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_creatives
    ADD CONSTRAINT marketing_creatives_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_daily_insights
    ADD CONSTRAINT marketing_daily_insights_ad_account_id_fkey FOREIGN KEY (ad_account_id) REFERENCES public.marketing_ad_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_daily_insights
    ADD CONSTRAINT marketing_daily_insights_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_daily_insights
    ADD CONSTRAINT marketing_daily_insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_sync_exceptions
    ADD CONSTRAINT marketing_sync_exceptions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketing_sync_exceptions
    ADD CONSTRAINT marketing_sync_exceptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_entity_mappings
    ADD CONSTRAINT marketplace_entity_mappings_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_entity_mappings
    ADD CONSTRAINT marketplace_entity_mappings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_fees
    ADD CONSTRAINT marketplace_fees_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_fees
    ADD CONSTRAINT marketplace_fees_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_inventory
    ADD CONSTRAINT marketplace_inventory_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_inventory
    ADD CONSTRAINT marketplace_inventory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_marketplaces
    ADD CONSTRAINT marketplace_marketplaces_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_marketplaces
    ADD CONSTRAINT marketplace_marketplaces_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_performance
    ADD CONSTRAINT marketplace_performance_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_performance
    ADD CONSTRAINT marketplace_performance_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_products
    ADD CONSTRAINT marketplace_products_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_products
    ADD CONSTRAINT marketplace_products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_reports
    ADD CONSTRAINT marketplace_reports_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_reports
    ADD CONSTRAINT marketplace_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_returns
    ADD CONSTRAINT marketplace_returns_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_returns
    ADD CONSTRAINT marketplace_returns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_settlements
    ADD CONSTRAINT marketplace_settlements_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_settlements
    ADD CONSTRAINT marketplace_settlements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_sync_checkpoints
    ADD CONSTRAINT marketplace_sync_checkpoints_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_sync_checkpoints
    ADD CONSTRAINT marketplace_sync_checkpoints_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_sync_jobs
    ADD CONSTRAINT marketplace_sync_jobs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.marketplace_sync_jobs
    ADD CONSTRAINT marketplace_sync_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_category_preferences
    ADD CONSTRAINT notification_category_preferences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_category_preferences
    ADD CONSTRAINT notification_category_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.production_order_components(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_inventory_movement_id_fkey FOREIGN KEY (inventory_movement_id) REFERENCES public.inventory_movements(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.stock_reservations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_issues
    ADD CONSTRAINT production_material_issues_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.production_order_components(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_inventory_movement_id_fkey FOREIGN KEY (inventory_movement_id) REFERENCES public.inventory_movements(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_returned_by_fkey FOREIGN KEY (returned_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_material_returns
    ADD CONSTRAINT production_material_returns_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT production_order_components_component_product_id_fkey FOREIGN KEY (component_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT production_order_components_component_sku_id_fkey FOREIGN KEY (component_sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT production_order_components_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT production_order_components_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT production_order_components_required_unit_id_fkey FOREIGN KEY (required_unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_order_components
    ADD CONSTRAINT production_order_components_substituted_for_sku_id_fkey FOREIGN KEY (substituted_for_sku_id) REFERENCES public.skus(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_expected_yield_unit_id_fkey FOREIGN KEY (expected_yield_unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_finished_product_id_fkey FOREIGN KEY (finished_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_finished_sku_id_fkey FOREIGN KEY (finished_sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_formulation_id_fkey FOREIGN KEY (formulation_id) REFERENCES public.formulations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_planned_unit_id_fkey FOREIGN KEY (planned_unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_production_plan_id_fkey FOREIGN KEY (production_plan_id) REFERENCES public.production_plans(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_qc_inspection_id_fkey FOREIGN KEY (qc_inspection_id) REFERENCES public.qc_inspections(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_qc_template_id_fkey FOREIGN KEY (qc_template_id) REFERENCES public.qc_templates(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_target_location_id_fkey FOREIGN KEY (target_location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_inventory_movement_id_fkey FOREIGN KEY (inventory_movement_id) REFERENCES public.inventory_movements(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_operator_user_id_fkey FOREIGN KEY (operator_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_qc_inspection_id_fkey FOREIGN KEY (qc_inspection_id) REFERENCES public.qc_inspections(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_outputs
    ADD CONSTRAINT production_outputs_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT production_plans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT production_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT production_plans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_plans
    ADD CONSTRAINT production_plans_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_wastages
    ADD CONSTRAINT production_wastages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_wastages
    ADD CONSTRAINT production_wastages_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.production_wastages
    ADD CONSTRAINT production_wastages_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_wastages
    ADD CONSTRAINT production_wastages_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.production_wastages
    ADD CONSTRAINT production_wastages_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.sales_order_pick_items
    ADD CONSTRAINT sales_order_pick_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sales_order_pick_items
    ADD CONSTRAINT sales_order_pick_items_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sales_territory_assignments
    ADD CONSTRAINT sales_territory_assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sales_territory_assignments
    ADD CONSTRAINT sales_territory_assignments_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sales_territory_assignments
    ADD CONSTRAINT sales_territory_assignments_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shopify_sync_checkpoints
    ADD CONSTRAINT shopify_sync_checkpoints_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shopify_sync_checkpoints
    ADD CONSTRAINT shopify_sync_checkpoints_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shopify_sync_exceptions
    ADD CONSTRAINT shopify_sync_exceptions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shopify_sync_exceptions
    ADD CONSTRAINT shopify_sync_exceptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

