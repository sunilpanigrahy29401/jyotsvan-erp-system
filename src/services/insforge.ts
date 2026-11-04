import { createClient, InsForgeClient } from '@insforge/sdk';
import { ENV } from '../config/env';

/**
 * InsForge Client Service
 * Provides official SDK adapter for InsForge Backend-as-a-Service and PostgreSQL database.
 */
class InsForgeService {
  public client: InsForgeClient | null = null;
  public isConfigured: boolean;
  public apiUrl: string;
  public anonKey: string;

  constructor() {
    this.isConfigured = ENV.isInsforgeConfigured;
    this.apiUrl = ENV.apiUrl;
    this.anonKey = ENV.anonKey;

    if (this.isConfigured && this.apiUrl) {
      try {
        this.client = createClient({
          baseUrl: this.apiUrl,
          anonKey: this.anonKey || undefined,
        });
      } catch (err) {
        console.warn('Failed to initialize InsForge SDK client:', err);
      }
    }
  }

  /**
   * Health status of InsForge connection.
   */
  public async checkHealth(): Promise<{ status: 'connected' | 'not_configured' | 'error'; message: string }> {
    if (!this.isConfigured) {
      return {
        status: 'not_configured',
        message: 'InsForge environment variables (VITE_INSFORGE_API_URL or INSFORGE_API_URL and VITE_INSFORGE_ANON_KEY or INSFORGE_ANON_KEY) are not detected in the environment.',
      };
    }

    try {
      if (this.client) {
        // Attempt to check public auth configuration via InsForge SDK
        const authConfig = await this.client.auth.getPublicAuthConfig();
        if (authConfig && !authConfig.error) {
          return {
            status: 'connected',
            message: 'Successfully connected to InsForge Backend Platform via @insforge/sdk.',
          };
        }
      }

      // Fallback HTTP check
      const response = await fetch(`${this.apiUrl}/health`, {
        headers: this.anonKey ? { 'Authorization': `Bearer ${this.anonKey}` } : {},
      });

      if (!response.ok && response.status !== 404) {
        return {
          status: 'error',
          message: `InsForge API responded with status ${response.status}: ${response.statusText}`,
        };
      }

      return {
        status: 'connected',
        message: 'Successfully connected to InsForge Backend Platform.',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
      return {
        status: 'error',
        message: `Unable to reach InsForge endpoint at ${this.apiUrl}: ${errorMsg}`,
      };
    }
  }

  public getConfigurationStatus() {
    return {
      isConfigured: this.isConfigured,
      apiUrl: this.apiUrl,
      projectId: ENV.projectId,
      hasAnonKey: Boolean(this.anonKey),
    };
  }
}

export const insforgeService = new InsForgeService();
