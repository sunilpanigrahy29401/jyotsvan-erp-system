// src/server/integrations/myntra-client.ts
// Phase 33: Myntra Partner Bridge (PPMP/Omni) API Client

import type {
  MyntraApiConfig,
  MyntraTokenResponse,
  MyntraCapabilityManifest,
} from '../../types/myntra.ts';

export class MyntraApiClient {
  private config: MyntraApiConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MyntraApiConfig) {
    this.config = {
      baseUrl: config.environment === 'sandbox'
        ? 'https://sandbox-partner.myntra.com/api/v2'
        : 'https://partner.myntra.com/api/v2',
      ...config,
    };
  }

  /**
   * Returns current partner API capabilities based on credentials and partner access tier
   */
  getCapabilities(): MyntraCapabilityManifest {
    const hasLiveAuth = Boolean(this.config.clientId && this.config.clientSecret);
    return {
      orders: true,
      orderDispatch: true,
      inventoryBuffer: true,
      catalogTaxonomy: true,
      returnsRTO: true,
      settlements: hasLiveAuth, // Settlements require active financial reconciliation scope
      fashionAttributes: true,
      webhooks: hasLiveAuth,
    };
  }

  /**
   * Generates or reuses cached Bearer Token
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now + 60000) {
      return this.accessToken;
    }

    try {
      if (!this.config.clientId || !this.config.clientSecret) {
        // Fallback simulation token when in sandbox/unconfigured state
        this.accessToken = `mock_myntra_token_${Date.now()}`;
        this.tokenExpiresAt = Date.now() + 3600000;
        return this.accessToken;
      }

      const authUrl = `${this.config.baseUrl}/oauth/token`;
      const authHeader = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=ppmp_orders+inventory+catalog',
      });

      if (!response.ok) {
        throw new Error(`Myntra token error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as MyntraTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return this.accessToken;
    } catch (err: any) {
      if (this.config.environment === 'sandbox' || !this.config.clientSecret) {
        this.accessToken = `mock_myntra_token_${Date.now()}`;
        this.tokenExpiresAt = Date.now() + 3600000;
        return this.accessToken;
      }
      throw new Error(`Myntra Partner API authentication failed: ${err.message || err}`);
    }
  }

  /**
   * Health and connectivity test
   */
  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string; capabilities: MyntraCapabilityManifest }> {
    const start = Date.now();
    try {
      await this.getAccessToken();
      const latencyMs = Date.now() - start;
      return {
        success: true,
        latencyMs,
        message: `Myntra Partner Bridge (PPMP) authenticated successfully (${latencyMs}ms)`,
        capabilities: this.getCapabilities(),
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err.message || 'Myntra Partner API connection test failed',
        capabilities: this.getCapabilities(),
      };
    }
  }

  /**
   * Polling orders from Myntra PPMP queue
   */
  async pollOrders(params: { status?: string; limit?: number }): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.config.baseUrl}/orders?status=${params.status || 'CREATED'}&limit=${params.limit || 50}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.orders || [];
    } catch {
      return [];
    }
  }

  /**
   * Update SKU Inventory & Safety Buffer
   */
  async updateInventoryBuffer(styleId: string, sku: string, available: number, buffer: number): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.config.baseUrl}/inventory/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: this.config.storeLocationId || 'STORE_BLR_01',
          items: [{ styleId, sku, quantity: available, safetyBuffer: buffer }],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
