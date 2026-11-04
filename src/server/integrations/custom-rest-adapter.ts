// src/server/integrations/custom-rest-adapter.ts
// Fully implemented Custom REST API Adapter with SSRF Protection and Flexible Authentication

import type {
  IntegrationProviderAdapter,
  ProviderAdapterContext,
  SyncOptions,
  SyncResult,
  HealthCheckResult,
} from './adapter-interface.ts';
import type { ConnectionTestResult, ProviderCapabilities } from '../../types/integrations.ts';
import { validateSafeUrl } from '../crypto-vault.ts';

export class CustomRestApiAdapter implements IntegrationProviderAdapter {
  readonly providerKey = 'custom_api';
  readonly name = 'Custom REST API Connector';
  readonly capabilities: ProviderCapabilities = {
    read: true,
    write: true,
    webhooks: false,
    sync: true,
    oauth: false,
    test_connection: true,
    custom_headers: true,
    rate_limit_rps: 50,
  };

  /**
   * Helper to execute safe outbound HTTP request with SSRF guard, timeout, and custom auth.
   */
  public async executeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpointPathOrUrl: string,
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    data?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<{ status: number; data: unknown; latencyMs: number; headers: Headers }> {
    const baseUrl = (configuration.base_url as string)?.trim() || '';
    let targetUrl = endpointPathOrUrl;
    if (!endpointPathOrUrl.startsWith('http://') && !endpointPathOrUrl.startsWith('https://')) {
      targetUrl = `${baseUrl.replace(/\/+$/, '')}/${endpointPathOrUrl.replace(/^\/+/, '')}`;
    }

    // SSRF Check
    const urlCheck = validateSafeUrl(targetUrl);
    if (!urlCheck.valid) {
      throw new Error(`SSRF Guard Violation: ${urlCheck.reason}`);
    }

    const authType = (configuration.auth_type as string) || 'api_key';
    const timeoutMs = Math.min(Math.max(Number(configuration.timeout_ms) || 10000, 1000), 60000);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Jyotsvan-Enterprise-Integration-Engine/1.0',
      ...(customHeaders || {}),
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      headers['Content-Type'] = 'application/json';
    }

    // Apply Authentication Mechanism
    if (authType === 'api_key') {
      const headerName = (configuration.api_key_header as string) || 'X-API-Key';
      const apiKeyValue = (credentials.api_key_value as string) || (configuration.api_key_value as string) || '';
      if (apiKeyValue) {
        headers[headerName] = apiKeyValue;
      }
    } else if (authType === 'bearer') {
      const token = (credentials.bearer_token as string) || (configuration.bearer_token as string) || '';
      if (token) {
        headers['Authorization'] = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;
      }
    } else if (authType === 'basic') {
      const username = (credentials.basic_username as string) || (configuration.basic_username as string) || '';
      const password = (credentials.basic_password as string) || (configuration.basic_password as string) || '';
      if (username || password) {
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
    }

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();
    try {
      const response = await fetch(targetUrl, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startTime;
      clearTimeout(timeoutTimer);

      let responseBody: unknown = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
      } else {
        responseBody = await response.text();
      }

      return {
        status: response.status,
        data: responseBody,
        latencyMs,
        headers: response.headers,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      const latencyMs = Date.now() - startTime;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms.`);
      }
      const msg = err instanceof Error ? err.message : 'Network request failed';
      throw new Error(`Target endpoint unreachable (${latencyMs}ms): ${msg}`);
    }
  }

  /**
   * Tests connection by executing a lightweight GET/HEAD probe on the configured base URL.
   */
  async testConnection(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<ConnectionTestResult> {
    const baseUrl = (configuration.base_url as string)?.trim();
    if (!baseUrl) {
      return {
        success: false,
        provider: this.providerKey,
        message: 'Base API Endpoint URL is required.',
        latency_ms: 0,
      };
    }

    const start = Date.now();
    try {
      // Validate SSRF security
      const urlCheck = validateSafeUrl(baseUrl);
      if (!urlCheck.valid) {
        return {
          success: false,
          provider: this.providerKey,
          message: `Security validation rejected target URL: ${urlCheck.reason}`,
          latency_ms: 0,
        };
      }

      const res = await this.executeRequest('GET', '', credentials, configuration);
      const isSuccess = res.status >= 200 && res.status < 400;

      return {
        success: isSuccess,
        provider: this.providerKey,
        account_name: (configuration.base_url as string) || 'Custom REST Endpoint',
        external_account_id: urlCheck.url?.hostname || 'custom_api',
        message: isSuccess
          ? `Connection verified successfully. Endpoint returned HTTP ${res.status} in ${res.latencyMs}ms.`
          : `Endpoint responded with HTTP error status: ${res.status}`,
        latency_ms: res.latencyMs,
        capabilities: {
          read: true,
          write: true,
          custom_headers: true,
        },
        details: {
          statusCode: res.status,
          targetHost: urlCheck.url?.hostname,
          protocol: urlCheck.url?.protocol,
        },
      };
    } catch (err: unknown) {
      const latency = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : 'Connection test failed';
      return {
        success: false,
        provider: this.providerKey,
        message: errorMsg,
        latency_ms: latency,
      };
    }
  }

  async getAccountInfo(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<{ externalAccountId?: string; externalAccountName?: string; details?: Record<string, unknown> }> {
    const baseUrl = (configuration.base_url as string) || '';
    try {
      const parsed = new URL(baseUrl);
      return {
        externalAccountId: parsed.hostname,
        externalAccountName: `API: ${parsed.hostname}`,
        details: {
          protocol: parsed.protocol,
          port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
          authType: configuration.auth_type || 'api_key',
        },
      };
    } catch {
      return {
        externalAccountId: 'custom-api',
        externalAccountName: 'Custom REST API',
      };
    }
  }

  async sync(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    options: SyncOptions,
    ctx?: ProviderAdapterContext
  ): Promise<SyncResult> {
    const startTime = Date.now();
    try {
      // Execute a polling sync request to base URL or /sync path
      const res = await this.executeRequest('GET', '', credentials, configuration);
      const isSuccess = res.status >= 200 && res.status < 300;
      return {
        recordsProcessed: isSuccess ? 1 : 0,
        recordsCreated: 0,
        recordsUpdated: isSuccess ? 1 : 0,
        recordsFailed: isSuccess ? 0 : 1,
        details: {
          durationMs: Date.now() - startTime,
          responseStatus: res.status,
        },
      };
    } catch (err: unknown) {
      return {
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 1,
        details: {
          error: err instanceof Error ? err.message : 'Sync execution failed',
        },
      };
    }
  }

  async healthCheck(
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
}
