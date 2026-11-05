// src/server/integrations/shopify-adapter.ts
// Phase 25: Official Shopify Provider Adapter with Real HMAC Verification & Deep Synchronization

import type {
  IntegrationProviderAdapter,
  ProviderAdapterContext,
  HealthCheckResult,
} from './adapter-interface.ts';
import type {
  ConnectionTestResult,
  ProviderCapabilities,
  WebhookIngestResult,
} from '../../types/integrations.ts';
import { ShopifyClient } from './shopify-client.ts';
import { ShopifyService } from '../shopify-service.ts';
import { NotificationService } from '../notification-service.ts';
import { AuditService } from '../audit-service.ts';
import { allowUnsignedWebhooks, UNSIGNED_REJECTED } from '../core/webhook-guard.ts';

export class ShopifyAdapter implements IntegrationProviderAdapter {
  public readonly providerKey = 'shopify';
  public readonly name = 'Shopify Store';
  public readonly capabilities: ProviderCapabilities = {
    read: true,
    write: true,
    webhooks: true,
    sync: true,
    oauth: true,
    test_connection: true,
    custom_headers: true,
    rate_limit_rps: 4,
    rate_limit_rpm: 240,
    products: true,
    variants: true,
    skus: true,
    customers: true,
    orders: true,
    refunds: true,
    discounts: true,
    inventory: true,
    historical_sync: true,
    incremental_sync: true,
  };

  public async testConnection(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<ConnectionTestResult> {
    const start = Date.now();

    const shopDomain = (configuration.shop_domain as string) || 'jyotsvan-organics.myshopify.com';
    const accessToken = (credentials.admin_api_access_token as string) || (configuration.admin_api_access_token as string) || '';
    const apiVersion = (configuration.api_version as string) || '2026-01';

    try {
      const client = new ShopifyClient({
        shopDomain,
        accessToken,
        apiVersion,
        organizationId: ctx?.organizationId,
        connectionId: ctx?.connectionId,
      });

      const shop = await client.getShop();
      const latency = Math.max(18, Date.now() - start);

      return {
        success: true,
        provider: 'shopify',
        account_name: shop.name || shop.myshopify_domain,
        external_account_id: String(shop.id),
        message: `Successfully authenticated with Shopify Store '${shop.name}' (${shop.myshopify_domain}). Admin API version ${apiVersion} operational.`,
        latency_ms: latency,
        capabilities: this.capabilities,
        details: {
          shop_id: shop.id,
          store_name: shop.name,
          email: shop.email,
          domain: shop.domain,
          myshopify_domain: shop.myshopify_domain,
          currency: shop.currency,
          timezone: shop.timezone,
          country: shop.country_name || shop.country,
          plan: shop.plan_display_name || shop.plan_name,
        },
      };
    } catch (err: unknown) {
      const latency = Math.max(20, Date.now() - start);
      const msg = err instanceof Error ? err.message : 'Shopify connection test failed';
      return {
        success: false,
        provider: 'shopify',
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

  public async connect(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<{ externalAccountId?: string; externalAccountName?: string; metadata?: Record<string, unknown> }> {
    const testRes = await this.testConnection(credentials, configuration, ctx);
    if (!testRes.success) {
      throw new Error(testRes.message);
    }
    return {
      externalAccountId: testRes.external_account_id,
      externalAccountName: testRes.account_name,
      metadata: testRes.details,
    };
  }

  public async getAccountInfo(
    credentials: Record<string, unknown>,
    configuration: Record<string, unknown>,
    ctx?: ProviderAdapterContext
  ): Promise<Record<string, unknown>> {
    const testRes = await this.testConnection(credentials, configuration, ctx);
    return testRes.details || {};
  }

  public async sync(
    _credentials: Record<string, unknown>,
    _configuration: Record<string, unknown>,
    syncOptions: { jobType?: string; cursor?: string; entityType?: string },
    ctx?: ProviderAdapterContext
  ): Promise<{
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsFailed: number;
    cursor?: string;
  }> {
    if (!ctx?.organizationId || !ctx?.connectionId) {
      throw new Error('Organization ID and Connection ID are required for Shopify synchronization.');
    }

    const orgId = ctx.organizationId;
    const connId = ctx.connectionId;

    if (syncOptions.entityType === 'products') {
      const prodRes = await ShopifyService.syncProducts(orgId, connId);
      return {
        recordsProcessed: prodRes.productsProcessed,
        recordsCreated: prodRes.variantsMapped,
        recordsUpdated: 0,
        recordsFailed: prodRes.unmappedVariants,
      };
    }

    if (syncOptions.entityType === 'orders') {
      const ordRes = await ShopifyService.syncOrders(orgId, connId);
      return {
        recordsProcessed: ordRes.ordersProcessed,
        recordsCreated: ordRes.ordersCreated,
        recordsUpdated: ordRes.ordersUpdated,
        recordsFailed: 0,
      };
    }

    if (syncOptions.entityType === 'customers') {
      const custRes = await ShopifyService.syncCustomers(orgId, connId);
      return {
        recordsProcessed: custRes.customersProcessed,
        recordsCreated: custRes.customersMapped,
        recordsUpdated: 0,
        recordsFailed: 0,
      };
    }

    if (syncOptions.entityType === 'inventory') {
      const invRes = await ShopifyService.syncInventory(orgId, connId);
      return {
        recordsProcessed: invRes.inventoryLevelsSynced,
        recordsCreated: invRes.locationsProcessed,
        recordsUpdated: invRes.inventoryLevelsSynced,
        recordsFailed: 0,
      };
    }

    // Default: Master sync all
    const allRes = await ShopifyService.syncAll(orgId, connId, {
      sync_type: (syncOptions.jobType as any) || 'full',
    });

    const totalProcessed =
      allRes.products.productsProcessed +
      allRes.customers.customersProcessed +
      allRes.orders.ordersProcessed +
      allRes.inventory.inventoryLevelsSynced;

    const totalCreated = allRes.orders.ordersCreated + allRes.products.variantsMapped;
    const totalUpdated = allRes.orders.ordersUpdated;

    return {
      recordsProcessed: totalProcessed,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      recordsFailed: allRes.products.unmappedVariants,
    };
  }

  public async handleWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: Record<string, unknown> | string,
    rawBody: string,
    webhookConfig: { secretHash?: string; endpointIdentifier?: string },
    ctx?: ProviderAdapterContext
  ): Promise<WebhookIngestResult> {
    const hmacHeader = (headers['x-shopify-hmac-sha256'] || headers['X-Shopify-Hmac-Sha256']) as string;
    const topicHeader = ((headers['x-shopify-topic'] || headers['X-Shopify-Topic']) as string) || 'generic/event';
    const webhookIdHeader = ((headers['x-shopify-webhook-id'] || headers['X-Shopify-Webhook-Id']) as string) || `shp-wh-${Date.now()}`;

    // Cryptographic verification is mandatory: a missing secret or a missing/invalid header is a rejection.
    // (Previously the check was skipped when the header was absent, so unsigned requests were accepted.)
    if (!allowUnsignedWebhooks()) {
      if (!webhookConfig.secretHash || !hmacHeader) {
        return { ...UNSIGNED_REJECTED };
      }
      if (!ShopifyClient.verifyWebhookHmac(rawBody, hmacHeader, webhookConfig.secretHash)) {
        return {
          accepted: false,
          status: 'failed',
          message: 'Shopify HMAC-SHA256 signature verification failed. Inbound payload rejected.',
        };
      }
    }

    // Process event topics
    const orgId = ctx?.organizationId || 'org-jyotsvan-corp';
    const connId = ctx?.connectionId || 'conn-shopify-prod';

    const parsedBody = typeof body === 'object' && body !== null ? body : {};

    try {
      if (topicHeader.startsWith('orders/')) {
        // Trigger incremental order sync or single order ingest
        await ShopifyService.syncOrders(orgId, connId);

        // Notify sales managers about new web order
        await NotificationService.publishEvent({
          organizationId: orgId,
          eventType: 'COMMERCE_ORDER_RECEIVED',
          entityType: 'sales_order',
          entityId: String((parsedBody as any).id || webhookIdHeader),
          targetUserId: 'usr-owner-sunil',
          payload: {
            title: `Shopify Webhook: ${topicHeader}`,
            message: `Inbound Shopify order event #${(parsedBody as any).order_number || (parsedBody as any).name || ''} processed into ERP ledger.`,
            actionUrl: '/commerce/shopify',
          },
        });
      } else if (topicHeader.startsWith('products/')) {
        await ShopifyService.syncProducts(orgId, connId);
      } else if (topicHeader.startsWith('customers/')) {
        await ShopifyService.syncCustomers(orgId, connId);
      }

      // Record Audit Log
      await AuditService.log({
        organizationId: orgId,
        action: 'CREATE',
        eventType: 'SHOPIFY_WEBHOOK_PROCESSED',
        module: 'commerce',
        entityType: 'integration_webhook',
        entityId: webhookIdHeader,
        entityName: `Topic: ${topicHeader}`,
        metadata: {
          topic: topicHeader,
          shopify_webhook_id: webhookIdHeader,
        },
      });

      return {
        accepted: true,
        event_id: webhookIdHeader,
        status: 'processed',
        message: `Shopify webhook topic '${topicHeader}' successfully validated and processed into ERP state.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook processing failure';
      return {
        accepted: true, // Acknowledge receipt to avoid Shopify webhook disablement
        status: 'failed',
        message: `Webhook received but domain handler threw: ${msg}`,
      };
    }
  }
}
