// src/types/integrations.ts
// Phase 24: Jyotsvan Enterprise Integration Engine Types

export type IntegrationCategory =
  | 'all'
  | 'communication'
  | 'commerce'
  | 'payments'
  | 'shipping'
  | 'productivity'
  | 'marketing'
  | 'accounting'
  | 'custom';

export type IntegrationProviderKey =
  | 'whatsapp'
  | 'gmail'
  | 'smtp'
  | 'shopify'
  | 'meta_ads'
  | 'woocommerce'
  | 'amazon'
  | 'flipkart'
  | 'razorpay'
  | 'cashfree'
  | 'shiprocket'
  | 'delhivery'
  | 'google_sheets'
  | 'custom_api'
  | 'generic_webhook'
  | string;

export type ProviderStatus = 'active' | 'available' | 'coming_soon' | 'inactive';
export type ProviderImplementationStatus = 'implemented' | 'available' | 'registered' | 'coming_soon';

export interface ProviderCapabilities {
  read?: boolean;
  write?: boolean;
  webhooks?: boolean;
  sync?: boolean;
  oauth?: boolean;
  test_connection?: boolean;
  custom_headers?: boolean;
  products?: boolean;
  variants?: boolean;
  orders?: boolean;
  customers?: boolean;
  inventory?: boolean;
  business_accounts?: boolean;
  ad_accounts?: boolean;
  campaigns?: boolean;
  ad_sets?: boolean;
  ads?: boolean;
  creatives?: boolean;
  insights?: boolean;
  historical_sync?: boolean;
  incremental_sync?: boolean;
  rest_api?: boolean;
  graphql_api?: boolean;
  rate_limit_rps?: number;
  rate_limit_rpm?: number;
  [key: string]: unknown;
}

export type ConfigFieldType = 'text' | 'secret' | 'url' | 'select' | 'number' | 'boolean' | 'json' | 'textarea';

export interface ConfigFieldOption {
  label: string;
  value: string;
}

export interface ProviderConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean;
  options?: ConfigFieldOption[];
  secret?: boolean;
}

export interface ProviderConfigSchema {
  fields: ProviderConfigField[];
  instructions?: string;
  webhookDocumentation?: string;
}

export interface IntegrationProvider {
  id: string;
  provider_key: IntegrationProviderKey;
  name: string;
  description: string;
  category: IntegrationCategory;
  logo_url?: string;
  icon_name?: string;
  documentation_url?: string;
  status: ProviderStatus;
  implementation_status: ProviderImplementationStatus;
  capabilities: ProviderCapabilities;
  configuration_schema: ProviderConfigSchema;
  created_at: string;
  updated_at: string;
}

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'expired'
  | 'pending'
  | 'disabled';

export type ConnectionHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'error'
  | 'expired'
  | 'unknown';

export type AuthType =
  | 'api_key'
  | 'oauth2'
  | 'basic'
  | 'bearer'
  | 'webhook'
  | 'custom'
  | 'none';

export interface IntegrationConnection {
  id: string;
  organization_id: string;
  provider_id: string;
  provider_key: string;
  name: string;
  status: ConnectionStatus;
  auth_type: AuthType;
  external_account_id?: string | null;
  external_account_name?: string | null;
  configuration: Record<string, unknown>; // Sanitized configuration (no secrets)
  health_status: ConnectionHealthStatus;
  health_message?: string | null;
  last_sync_at?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  provider?: IntegrationProvider;
}

export interface IntegrationCredential {
  id: string;
  organization_id: string;
  connection_id: string;
  encrypted_credentials: string; // AES-256-GCM (iv:tag:ciphertext)
  credential_version: number;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationWebhook {
  id: string;
  organization_id: string;
  connection_id: string;
  provider: string;
  event_type: string;
  endpoint_identifier: string;
  webhook_url?: string;
  secret_hash?: string;
  status: 'active' | 'inactive' | 'paused';
  events_received_count: number;
  last_received_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type EventDirection = 'inbound' | 'outbound';
export type EventProcessingStatus =
  | 'received'
  | 'queued'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'ignored';

export interface IntegrationEvent {
  id: string;
  organization_id: string;
  connection_id: string;
  event_type: string;
  direction: EventDirection;
  external_event_id?: string | null;
  payload: Record<string, unknown>;
  status: EventProcessingStatus;
  retry_count: number;
  processed_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface IntegrationLog {
  id: string;
  organization_id: string;
  connection_id?: string | null;
  provider_key: string;
  operation: string;
  direction: 'inbound' | 'outbound' | 'internal';
  method?: string;
  endpoint?: string;
  timestamp?: string;
  request_metadata?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  status_code?: number | null;
  duration_ms?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
}

export type SyncJobType = 'full' | 'incremental' | 'manual' | 'scheduled';
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface IntegrationSyncJob {
  id: string;
  organization_id: string;
  connection_id: string;
  provider_key?: string;
  job_type: SyncJobType;
  sync_type?: string;
  status: SyncJobStatus | string;
  cursor?: string | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTestResult {
  success: boolean;
  provider: string;
  account_name?: string;
  external_account_id?: string;
  message: string;
  latency_ms: number;
  capabilities?: ProviderCapabilities | Record<string, boolean>;
  details?: Record<string, unknown>;
}

export interface IntegrationMetrics {
  total_connections: number;
  active_connections: number;
  failed_connections: number;
  webhook_events: number;
  webhook_failures: number;
  sync_jobs: number;
  sync_failures: number;
  api_requests: number;
  api_failures: number;
  average_latency_ms: number;
}

export interface CreateConnectionParams {
  organization_id: string;
  provider_id?: string;
  provider_key: string;
  name: string;
  auth_type?: AuthType;
  configuration: Record<string, unknown>;
  credentials: Record<string, unknown>; // raw credentials submitted by user, will be encrypted
  user_id?: string;
  user_name?: string;
  user_email?: string;
}

export interface UpdateConnectionParams {
  name?: string;
  status?: ConnectionStatus;
  configuration?: Record<string, unknown>;
  credentials?: Record<string, unknown>; // new credentials if being updated
  user_id?: string;
  user_name?: string;
  user_email?: string;
}

export interface WebhookIngestResult {
  accepted: boolean;
  event_id?: string;
  deduplicated?: boolean;
  status: EventProcessingStatus;
  message: string;
}
