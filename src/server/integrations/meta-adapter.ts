// src/server/integrations/meta-adapter.ts
// Phase 26: Official Meta Ads Provider Adapter for Jyotsvan Enterprise Integration Engine

import type {
  IntegrationProviderAdapter,
  ProviderAdapterContext,
  HealthCheckResult,
  SyncOptions,
  SyncResult,
} from './adapter-interface.ts';
import type {
  ConnectionTestResult,
  ProviderCapabilities,
} from '../../types/integrations.ts';
import { MetaClient } from './meta-client.ts';
import { META_ADS_PROVIDER } from '../migrate-meta-ads.ts';

export class MetaAdsAdapter implements IntegrationProviderAdapter {
  public readonly providerKey = 'meta_ads';
  public readonly name = 'Meta Ads (Facebook & Instagram)';
  public readonly capabilities: ProviderCapabilities = META_ADS_PROVIDER.capabilities;

  public async testConnection(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<ConnectionTestResult> {
    const start = Date.now();

    const accessToken =
      (credentials.access_token as string) ||
      (configuration.access_token as string) ||
      '';
    const appId =
      (configuration.app_id as string) ||
      (credentials.app_id as string) ||
      process.env.META_APP_ID;
    const appSecret =
      (credentials.app_secret as string) ||
      (configuration.app_secret as string) ||
      process.env.META_APP_SECRET;
    const apiVersion = (configuration.api_version as string) || 'v21.0';
    const adAccountId = (configuration.ad_account_id as string) || undefined;

    try {
      const client = new MetaClient({
        accessToken,
        appId,
        appSecret,
        apiVersion,
        adAccountId,
        organizationId: ctx?.organizationId,
        connectionId: ctx?.connectionId,
      });

      // 1. Validate identity / user
      const user = await client.getMe();
      // 2. Discover ad accounts accessible
      const accounts = await client.getAdAccounts();
      const latency = Math.max(15, Date.now() - start);

      const targetAccount =
        accounts.find((a) => a.id === adAccountId || a.account_id === adAccountId?.replace(/^act_/, '')) ||
        accounts[0];

      return {
        success: true,
        provider: 'meta_ads',
        account_name: targetAccount?.name || user.name,
        external_account_id: targetAccount?.id || user.id,
        message: `Successfully authenticated with Meta Graph API ${apiVersion}. Connected as '${user.name}'. Found ${accounts.length} authorized ad accounts.`,
        latency_ms: latency,
        capabilities: this.capabilities,
        details: {
          user_id: user.id,
          user_name: user.name,
          ad_accounts_count: accounts.length,
          ad_accounts: accounts.map((a) => ({
            id: a.id,
            account_id: a.account_id,
            name: a.name,
            currency: a.currency,
            account_status: a.account_status,
            business_name: a.business_name,
          })),
        },
      };
    } catch (err: unknown) {
      const latency = Math.max(20, Date.now() - start);
      const msg = err instanceof Error ? err.message : 'Meta Ads connection test failed';
      return {
        success: false,
        provider: 'meta_ads',
        message: `Connection failed: ${msg}`,
        latency_ms: latency,
        capabilities: this.capabilities,
        details: { error: msg },
      };
    }
  }

  public async healthCheck(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<HealthCheckResult> {
    const res = await this.testConnection(credentials, configuration, ctx);
    return {
      healthy: res.success,
      latencyMs: res.latency_ms,
      message: res.message,
      status: res.success ? 'healthy' : 'error',
    };
  }

  public async getAccountInfo(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<{ externalAccountId?: string; externalAccountName?: string; details?: Record<string, unknown> }> {
    const res = await this.testConnection(credentials, configuration, ctx);
    return {
      externalAccountId: res.external_account_id,
      externalAccountName: res.account_name,
      details: res.details,
    };
  }
}
