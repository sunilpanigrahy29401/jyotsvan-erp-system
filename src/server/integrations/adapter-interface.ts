// src/server/integrations/adapter-interface.ts
// Phase 24: Provider Adapter Interface & Normalized Result Contracts

import type {
  ConnectionTestResult,
  ProviderCapabilities,
  WebhookIngestResult,
} from '../../types/integrations.ts';

export interface ProviderAdapterContext {
  organizationId: string;
  connectionId?: string;
  providerKey: string;
}

export interface SyncOptions {
  jobType: 'full' | 'incremental' | 'manual' | 'scheduled';
  cursor?: string | null;
  limit?: number;
}

export interface SyncResult {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  newCursor?: string | null;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  message: string;
  status: 'healthy' | 'degraded' | 'error';
}

export interface IntegrationProviderAdapter {
  readonly providerKey: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Tests connection connectivity and credential validity without persisting state.
   */
  testConnection(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<ConnectionTestResult>;

  /**
   * Optional lifecycle hook executed during initial connection provisioning.
   */
  connect?(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<{ externalAccountId?: string; externalAccountName?: string; metadata?: Record<string, unknown> }>;

  /**
   * Optional lifecycle hook executed when connection is disconnected or decommissioned.
   */
  disconnect?(
    connectionId: string,
    credentials?: Record<string, unknown>,
    configuration?: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<void>;

  /**
   * Queries external service for current account identifiers and quota information.
   */
  getAccountInfo?(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<{ externalAccountId?: string; externalAccountName?: string; details?: Record<string, unknown> }>;

  /**
   * Executes data synchronization job.
   */
  sync?(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    options: SyncOptions,
    ctx?: ProviderAdapterContext
  ): Promise<SyncResult>;

  /**
   * Handles inbound webhook payload with cryptographic signature verification.
   */
  handleWebhook?(
    headers: Record<string, string | string[] | undefined>,
    body: Record<string, unknown> | string,
    rawBody: string,
    webhookConfig: { secretHash?: string; endpointIdentifier?: string },
    ctx?: ProviderAdapterContext
  ): Promise<WebhookIngestResult>;

  /**
   * Refreshes OAuth2 access tokens using refresh token if supported.
   */
  refreshToken?(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<{ newCredentials: Record<string, unknown>; expiresAt?: string }>;

  /**
   * Lightweight health check verification.
   */
  healthCheck?(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<HealthCheckResult>;
}
