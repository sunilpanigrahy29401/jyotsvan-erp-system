// src/server/amazon-service.ts
// Phase 31: Amazon SP-API & Marketplace Business Logic, Synchronization & Normalization Engine

import { pool } from './db.ts';
import { AmazonSpApiClient } from './integrations/amazon-client.ts';
import { decryptCredentials, encryptCredentials } from './crypto-vault.ts';
import { AuditService } from './audit-service.ts';
import { NotificationService } from './notification-service.ts';
import type {
  AmazonOverviewResponse,
  AmazonMarketplace,
  AmazonOrder,
  AmazonProduct,
  AmazonInventory,
  AmazonReturn,
  AmazonReport,
  AmazonSettlement,
  AmazonFee,
  AmazonEntityMapping,
  AmazonSyncRequest,
  AmazonRegion,
} from '../types/amazon.ts';
import type { IntegrationConnection } from '../types/integrations.ts';

export class AmazonService {
  /**
   * Helper to retrieve connection record and initialize authenticated AmazonSpApiClient
   */
  public static async getClientForConnection(
    organizationId: string,
    connectionId?: string
  ): Promise<{ client: AmazonSpApiClient; connection: IntegrationConnection }> {
    let queryStr = `SELECT * FROM integration_connections WHERE organization_id = $1 AND provider_key = 'amazon'`;
    const queryParams: any[] = [organizationId];

    if (connectionId && connectionId !== 'default' && connectionId !== 'primary') {
      queryStr += ` AND id = $2`;
      queryParams.push(connectionId);
    } else {
      queryStr += ` ORDER BY (status = 'connected') DESC, updated_at DESC LIMIT 1`;
    }

    const connRes = await pool.query(queryStr, queryParams);

    if (connRes.rows.length === 0) {
      throw new Error(`No Amazon SP-API connection found for organization '${organizationId}'. Please configure your Amazon Seller Account.`);
    }

    const connection = connRes.rows[0] as IntegrationConnection;
    const config = (connection.configuration || {}) as Record<string, any>;

    let lwaAppId = '';
    let lwaClientSecret = '';
    let lwaRefreshToken = '';
    let sellerId = config.seller_id || connection.external_account_id || 'A2JYOTSVANORGANICS';
    let region = (config.region || 'fe') as AmazonRegion;
    let marketplaceId = config.primary_marketplace_id || 'A21TJRUUN4KGV';

    const credRes = await pool.query(
      `SELECT encrypted_credentials FROM integration_credentials WHERE organization_id = $1 AND connection_id = $2`,
      [organizationId, connection.id]
    );

    if (credRes.rows.length > 0 && credRes.rows[0].encrypted_credentials) {
      try {
        const decrypted = decryptCredentials(credRes.rows[0].encrypted_credentials);
        if (decrypted.lwa_app_id) lwaAppId = decrypted.lwa_app_id as string;
        if (decrypted.lwa_client_secret) lwaClientSecret = decrypted.lwa_client_secret as string;
        if (decrypted.lwa_refresh_token) lwaRefreshToken = decrypted.lwa_refresh_token as string;
        if (decrypted.seller_id) sellerId = decrypted.seller_id as string;
        if (decrypted.region) region = decrypted.region as AmazonRegion;
        if (decrypted.marketplace_id) marketplaceId = decrypted.marketplace_id as string;
      } catch (err) {
        console.warn('[AmazonService] Failed to decrypt stored credentials; using fallback parameters:', err);
      }
    }

    const client = new AmazonSpApiClient({
      sellerId,
      lwaAppId,
      lwaClientSecret,
      lwaRefreshToken,
      region,
      marketplaceId,
      organizationId,
      connectionId: connection.id,
    });

    return { client, connection };
  }

  // --------------------------------------------------------------------------
  // 1. EXECUTIVE OVERVIEW & MARKETPLACE KPIS
  // --------------------------------------------------------------------------

  public static async getOverview(
    organizationId: string,
    connectionId?: string,
    marketplaceId?: string
  ): Promise<AmazonOverviewResponse> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);

    // Marketplaces
    const mktRes = await pool.query(
      `SELECT * FROM marketplace_marketplaces WHERE organization_id = $1 AND connection_id = $2 ORDER BY is_participating DESC, name ASC`,
      [organizationId, connection.id]
    );
    const marketplaces = mktRes.rows as AmazonMarketplace[];
    const activeMarketplace = marketplaces.find((m) => m.marketplace_id === (marketplaceId || connection.configuration.primary_marketplace_id)) || marketplaces[0] || null;

    // 30 Days Order KPIs
    const orderKpiRes = await pool.query(
      `SELECT
        COUNT(*)::int as total_orders,
        COALESCE(SUM(order_total), 0)::numeric as gross_revenue,
        COUNT(CASE WHEN purchase_date >= NOW() - INTERVAL '30 days' THEN 1 END)::int as orders_30d,
        COALESCE(SUM(CASE WHEN purchase_date >= NOW() - INTERVAL '30 days' THEN order_total ELSE 0 END), 0)::numeric as revenue_30d,
        COALESCE(SUM(CASE WHEN purchase_date >= NOW() - INTERVAL '30 days' THEN (
          SELECT COALESCE(SUM(quantity_ordered), 0) FROM marketplace_order_items WHERE order_id = marketplace_orders.id
        ) ELSE 0 END), 0)::int as units_30d
       FROM marketplace_orders
       WHERE organization_id = $1 AND connection_id = $2`,
      [organizationId, connection.id]
    );
    const orderKpi = orderKpiRes.rows[0] || {};

    // Listings KPIs
    const prodKpiRes = await pool.query(
      `SELECT
        COUNT(*)::int as total_listings,
        COUNT(CASE WHEN product_status = 'ACTIVE' THEN 1 END)::int as active_listings
       FROM marketplace_products
       WHERE organization_id = $1 AND connection_id = $2`,
      [organizationId, connection.id]
    );
    const prodKpi = prodKpiRes.rows[0] || {};

    // Inventory KPIs
    const invKpiRes = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN fulfillment_channel = 'FBA' THEN available_quantity ELSE 0 END), 0)::int as fba_units,
        COALESCE(SUM(CASE WHEN fulfillment_channel = 'MFN' THEN available_quantity ELSE 0 END), 0)::int as fbm_units,
        COALESCE(SUM(reserved_quantity), 0)::int as reserved_units,
        COALESCE(SUM(inbound_working + inbound_shipped + inbound_receiving), 0)::int as inbound_units,
        COUNT(CASE WHEN available_quantity < 20 THEN 1 END)::int as low_stock_skus
       FROM marketplace_inventory
       WHERE organization_id = $1 AND connection_id = $2`,
      [organizationId, connection.id]
    );
    const invKpi = invKpiRes.rows[0] || {};

    // Returns KPI
    const retKpiRes = await pool.query(
      `SELECT COUNT(*)::int as pending_returns FROM marketplace_returns WHERE organization_id = $1 AND connection_id = $2`,
      [organizationId, connection.id]
    );
    const pendingReturns = retKpiRes.rows[0]?.pending_returns || 0;

    // Fees & Settlement 30 Days
    const feesRes = await pool.query(
      `SELECT COALESCE(SUM(fee_amount), 0)::numeric as fees_30d FROM marketplace_fees WHERE organization_id = $1 AND connection_id = $2 AND posted_date >= NOW() - INTERVAL '30 days'`,
      [organizationId, connection.id]
    );
    const fees30d = Number(feesRes.rows[0]?.fees_30d || 0);

    const settleRes = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0)::numeric as net_settlement_30d FROM marketplace_settlements WHERE organization_id = $1 AND connection_id = $2 AND settlement_end_date >= NOW() - INTERVAL '30 days'`,
      [organizationId, connection.id]
    );
    const netSettlement30d = Number(settleRes.rows[0]?.net_settlement_30d || 0);

    // Recent Orders (with items)
    const recentOrdersRes = await pool.query(
      `SELECT * FROM marketplace_orders WHERE organization_id = $1 AND connection_id = $2 ORDER BY purchase_date DESC LIMIT 5`,
      [organizationId, connection.id]
    );
    const recentOrders: AmazonOrder[] = [];
    for (const ord of recentOrdersRes.rows) {
      const itemsRes = await pool.query(
        `SELECT * FROM marketplace_order_items WHERE order_id = $1`,
        [ord.id]
      );
      recentOrders.push({
        ...ord,
        items: itemsRes.rows,
      });
    }

    // Top Products
    const topProdsRes = await pool.query(
      `SELECT
        p.seller_sku as sku,
        p.asin,
        p.title,
        COALESCE(SUM(oi.quantity_ordered), 0)::int as "unitsSold",
        COALESCE(SUM(oi.quantity_ordered * oi.item_price), 0)::numeric as revenue,
        COALESCE(inv.available_quantity, 0)::int as stock
       FROM marketplace_products p
       LEFT JOIN marketplace_order_items oi ON oi.seller_sku = p.seller_sku AND oi.organization_id = p.organization_id
       LEFT JOIN marketplace_inventory inv ON inv.seller_sku = p.seller_sku AND inv.organization_id = p.organization_id
       WHERE p.organization_id = $1 AND p.connection_id = $2
       GROUP BY p.seller_sku, p.asin, p.title, inv.available_quantity
       ORDER BY revenue DESC
       LIMIT 5`,
      [organizationId, connection.id]
    );

    // Checkpoints status
    const chkRes = await pool.query(
      `SELECT entity_type, status, last_sync_at FROM marketplace_sync_checkpoints WHERE organization_id = $1 AND connection_id = $2`,
      [organizationId, connection.id]
    );
    const syncMap: Record<string, string> = {
      orders: 'IDLE',
      products: 'IDLE',
      inventory: 'IDLE',
      returns: 'IDLE',
      reports: 'IDLE',
      settlements: 'IDLE',
      fees: 'IDLE',
    };
    chkRes.rows.forEach((r) => {
      syncMap[r.entity_type] = r.status || 'SUCCESS';
    });

    return {
      isConnected: connection.status === 'connected',
      connection,
      marketplaces,
      activeMarketplace,
      kpis: {
        ordersTotal: Number(orderKpi.total_orders || 0),
        orders30Days: Number(orderKpi.orders_30d || 0),
        grossRevenue30Days: Number(orderKpi.revenue_30d || 0),
        unitsSold30Days: Number(orderKpi.units_30d || 0),
        activeListings: Number(prodKpi.active_listings || 0),
        totalListings: Number(prodKpi.total_listings || 0),
        fbaStockUnits: Number(invKpi.fba_units || 0),
        fbmStockUnits: Number(invKpi.fbm_units || 0),
        pendingReturns,
        fees30Days: fees30d,
        netSettlement30Days: netSettlement30d,
        currency: activeMarketplace?.currency || 'INR',
      },
      recentOrders,
      topProducts: topProdsRes.rows.map((r) => ({
        sku: r.sku,
        asin: r.asin,
        title: r.title,
        unitsSold: Number(r.unitsSold || 0),
        revenue: Number(r.revenue || 0),
        stock: Number(r.stock || 0),
      })),
      inventorySummary: {
        fbaUnits: Number(invKpi.fba_units || 0),
        fbmUnits: Number(invKpi.fbm_units || 0),
        reservedUnits: Number(invKpi.reserved_units || 0),
        inboundUnits: Number(invKpi.inbound_units || 0),
        lowStockSkus: Number(invKpi.low_stock_skus || 0),
      },
      capabilities: {
        orders: true,
        products: true,
        inventory: true,
        returns: true,
        reports: true,
        settlements: true,
        fees: true,
        sync: true,
        sku_mapping: true,
      },
      syncStatus: {
        orders: syncMap.orders || 'SUCCESS',
        products: syncMap.products || 'SUCCESS',
        inventory: syncMap.inventory || 'SUCCESS',
        returns: syncMap.returns || 'SUCCESS',
        reports: syncMap.reports || 'SUCCESS',
        settlements: syncMap.settlements || 'SUCCESS',
        fees: syncMap.fees || 'SUCCESS',
        lastSyncedAt: connection.last_sync_at,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 2. ORDERS & ORDER ITEMS
  // --------------------------------------------------------------------------

  public static async getOrders(
    organizationId: string,
    connectionId?: string,
    filter: {
      marketplaceId?: string;
      status?: string;
      fulfillmentChannel?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ orders: AmazonOrder[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);

    let whereClause = `WHERE o.organization_id = $1 AND o.connection_id = $2`;
    const params: any[] = [organizationId, connection.id];

    if (filter.marketplaceId && filter.marketplaceId !== 'ALL') {
      params.push(filter.marketplaceId);
      whereClause += ` AND o.marketplace_id = $${params.length}`;
    }

    if (filter.status && filter.status !== 'ALL') {
      params.push(filter.status);
      whereClause += ` AND o.order_status = $${params.length}`;
    }

    if (filter.fulfillmentChannel && filter.fulfillmentChannel !== 'ALL') {
      params.push(filter.fulfillmentChannel);
      whereClause += ` AND o.fulfillment_channel = $${params.length}`;
    }

    if (filter.startDate) {
      params.push(filter.startDate);
      whereClause += ` AND o.purchase_date >= $${params.length}`;
    }

    if (filter.endDate) {
      params.push(filter.endDate);
      whereClause += ` AND o.purchase_date <= $${params.length}`;
    }

    if (filter.search) {
      params.push(`%${filter.search}%`);
      whereClause += ` AND (o.external_order_id ILIKE $${params.length} OR o.buyer_name ILIKE $${params.length} OR o.buyer_email ILIKE $${params.length})`;
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM marketplace_orders o ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const ordersRes = await pool.query(
      `SELECT o.* FROM marketplace_orders o ${whereClause} ORDER BY o.purchase_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const orders: AmazonOrder[] = [];
    for (const ord of ordersRes.rows) {
      const itemsRes = await pool.query(`SELECT * FROM marketplace_order_items WHERE order_id = $1`, [ord.id]);
      orders.push({
        ...ord,
        items: itemsRes.rows,
      });
    }

    return { orders, total };
  }

  // --------------------------------------------------------------------------
  // 3. PRODUCTS & CATALOG
  // --------------------------------------------------------------------------

  public static async getProducts(
    organizationId: string,
    connectionId?: string,
    filter: {
      marketplaceId?: string;
      status?: string;
      fulfillmentChannel?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ products: AmazonProduct[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);

    let whereClause = `WHERE p.organization_id = $1 AND p.connection_id = $2`;
    const params: any[] = [organizationId, connection.id];

    if (filter.marketplaceId && filter.marketplaceId !== 'ALL') {
      params.push(filter.marketplaceId);
      whereClause += ` AND p.marketplace_id = $${params.length}`;
    }

    if (filter.status && filter.status !== 'ALL') {
      params.push(filter.status);
      whereClause += ` AND p.product_status = $${params.length}`;
    }

    if (filter.fulfillmentChannel && filter.fulfillmentChannel !== 'ALL') {
      params.push(filter.fulfillmentChannel);
      whereClause += ` AND p.fulfillment_channel = $${params.length}`;
    }

    if (filter.search) {
      params.push(`%${filter.search}%`);
      whereClause += ` AND (p.seller_sku ILIKE $${params.length} OR p.asin ILIKE $${params.length} OR p.title ILIKE $${params.length})`;
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM marketplace_products p ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const prodsRes = await pool.query(
      `SELECT p.*,
        m.id as map_id, m.jyotsvan_sku, m.jyotsvan_product_name, m.mapping_status
       FROM marketplace_products p
       LEFT JOIN marketplace_entity_mappings m ON m.marketplace_sku = p.seller_sku AND m.organization_id = p.organization_id
       ${whereClause}
       ORDER BY p.title ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const products: AmazonProduct[] = prodsRes.rows.map((row) => ({
      id: row.id,
      organization_id: row.organization_id,
      connection_id: row.connection_id,
      provider_key: row.provider_key,
      marketplace_id: row.marketplace_id,
      external_product_id: row.external_product_id,
      seller_sku: row.seller_sku,
      asin: row.asin,
      fnsku: row.fnsku,
      title: row.title,
      description: row.description,
      brand: row.brand,
      manufacturer: row.manufacturer,
      item_type: row.item_type,
      product_status: row.product_status,
      listing_price: Number(row.listing_price || 0),
      currency: row.currency,
      main_image_url: row.main_image_url,
      product_url: row.product_url,
      fulfillment_channel: row.fulfillment_channel,
      attributes: row.attributes,
      raw_metadata: row.raw_metadata,
      mapping: row.map_id
        ? {
            id: row.map_id,
            organization_id: row.organization_id,
            connection_id: row.connection_id,
            provider_key: row.provider_key,
            entity_type: 'sku',
            marketplace_sku: row.seller_sku,
            marketplace_asin: row.asin,
            jyotsvan_sku: row.jyotsvan_sku,
            jyotsvan_product_name: row.jyotsvan_product_name,
            mapping_status: row.mapping_status,
            created_at: '',
            updated_at: '',
          }
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { products, total };
  }

  // --------------------------------------------------------------------------
  // 4. INVENTORY (FBA & FBM)
  // --------------------------------------------------------------------------

  public static async getInventory(
    organizationId: string,
    connectionId?: string,
    filter: {
      marketplaceId?: string;
      fulfillmentChannel?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ inventory: AmazonInventory[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);

    let whereClause = `WHERE inv.organization_id = $1 AND inv.connection_id = $2`;
    const params: any[] = [organizationId, connection.id];

    if (filter.marketplaceId && filter.marketplaceId !== 'ALL') {
      params.push(filter.marketplaceId);
      whereClause += ` AND inv.marketplace_id = $${params.length}`;
    }

    if (filter.fulfillmentChannel && filter.fulfillmentChannel !== 'ALL') {
      params.push(filter.fulfillmentChannel);
      whereClause += ` AND inv.fulfillment_channel = $${params.length}`;
    }

    if (filter.search) {
      params.push(`%${filter.search}%`);
      whereClause += ` AND (inv.seller_sku ILIKE $${params.length} OR inv.asin ILIKE $${params.length} OR inv.fnsku ILIKE $${params.length})`;
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM marketplace_inventory inv ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const invRes = await pool.query(
      `SELECT inv.* FROM marketplace_inventory inv ${whereClause} ORDER BY inv.seller_sku ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { inventory: invRes.rows as AmazonInventory[], total };
  }

  // --------------------------------------------------------------------------
  // 5. RETURNS
  // --------------------------------------------------------------------------

  public static async getReturns(
    organizationId: string,
    connectionId?: string,
    filter: {
      marketplaceId?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ returns: AmazonReturn[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);

    let whereClause = `WHERE ret.organization_id = $1 AND ret.connection_id = $2`;
    const params: any[] = [organizationId, connection.id];

    if (filter.marketplaceId && filter.marketplaceId !== 'ALL') {
      params.push(filter.marketplaceId);
      whereClause += ` AND ret.marketplace_id = $${params.length}`;
    }

    if (filter.status && filter.status !== 'ALL') {
      params.push(filter.status);
      whereClause += ` AND ret.return_status = $${params.length}`;
    }

    if (filter.search) {
      params.push(`%${filter.search}%`);
      whereClause += ` AND (ret.external_return_id ILIKE $${params.length} OR ret.seller_sku ILIKE $${params.length} OR ret.return_reason ILIKE $${params.length})`;
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM marketplace_returns ret ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const retRes = await pool.query(
      `SELECT ret.* FROM marketplace_returns ret ${whereClause} ORDER BY ret.return_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { returns: retRes.rows as AmazonReturn[], total };
  }

  // --------------------------------------------------------------------------
  // 6. REPORTS
  // --------------------------------------------------------------------------

  public static async getReports(
    organizationId: string,
    connectionId?: string,
    filter: {
      reportType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: AmazonReport[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);

    let whereClause = `WHERE rep.organization_id = $1 AND rep.connection_id = $2`;
    const params: any[] = [organizationId, connection.id];

    if (filter.reportType && filter.reportType !== 'ALL') {
      params.push(filter.reportType);
      whereClause += ` AND rep.report_type = $${params.length}`;
    }

    if (filter.status && filter.status !== 'ALL') {
      params.push(filter.status);
      whereClause += ` AND rep.report_status = $${params.length}`;
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM marketplace_reports rep ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const repRes = await pool.query(
      `SELECT rep.* FROM marketplace_reports rep ${whereClause} ORDER BY rep.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { reports: repRes.rows as AmazonReport[], total };
  }

  public static async requestReport(
    organizationId: string,
    connectionId: string,
    reportType: string,
    marketplaceId?: string,
    dataStartTime?: string,
    dataEndTime?: string
  ): Promise<AmazonReport> {
    const { client, connection } = await this.getClientForConnection(organizationId, connectionId);
    const mktId = String(marketplaceId || connection.configuration.primary_marketplace_id || 'A21TJRUUN4KGV');

    const resp = await client.createReport({
      reportType,
      marketplaceIds: [mktId],
      dataStartTime,
      dataEndTime,
    });

    const reportId = resp.reportId || `REP-AMZ-${Date.now()}`;
    const id = `rep-${reportId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const insRes = await pool.query(
      `INSERT INTO marketplace_reports (
        id, organization_id, connection_id, provider_key, report_id, report_type,
        marketplace_id, data_start_time, data_end_time, report_status,
        processing_status, records_parsed, generated_at, created_at, updated_at
      ) VALUES ($1, $2, $3, 'amazon', $4, $5, $6, $7, $8, 'SUBMITTED', 'PENDING', 0, NOW(), NOW(), NOW())
      ON CONFLICT (connection_id, report_id) DO UPDATE SET
        report_status = 'SUBMITTED',
        updated_at = NOW()
      RETURNING *;`,
      [
        id,
        organizationId,
        connection.id,
        reportId,
        reportType,
        mktId,
        dataStartTime ? new Date(dataStartTime) : null,
        dataEndTime ? new Date(dataEndTime) : null,
      ]
    );

    await AuditService.log({
      organizationId,
      entityType: 'integration_connection',
      entityId: connection.id,
      action: 'CREATE',
      eventType: 'SYSTEM_EVENT',
      module: 'integrations',
      actorType: 'SYSTEM',
      actorEmail: 'system@jyotsvan.enterprise',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
      metadata: { description: `Requested Amazon SP-API report '${reportType}' (${reportId}) for marketplace '${mktId}'.` },
    });

    return insRes.rows[0] as AmazonReport;
  }

  // --------------------------------------------------------------------------
  // 7. SETTLEMENTS & FEES
  // --------------------------------------------------------------------------

  public static async getSettlements(
    organizationId: string,
    connectionId?: string
  ): Promise<{ settlements: AmazonSettlement[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);
    const res = await pool.query(
      `SELECT * FROM marketplace_settlements WHERE organization_id = $1 AND connection_id = $2 ORDER BY settlement_end_date DESC`,
      [organizationId, connection.id]
    );
    return { settlements: res.rows as AmazonSettlement[], total: res.rows.length };
  }

  public static async getFees(
    organizationId: string,
    connectionId?: string,
    filter: { feeType?: string; limit?: number; offset?: number } = {}
  ): Promise<{ fees: AmazonFee[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);

    let whereClause = `WHERE organization_id = $1 AND connection_id = $2`;
    const params: any[] = [organizationId, connection.id];

    if (filter.feeType && filter.feeType !== 'ALL') {
      params.push(filter.feeType);
      whereClause += ` AND fee_type = $${params.length}`;
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM marketplace_fees ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const res = await pool.query(
      `SELECT * FROM marketplace_fees ${whereClause} ORDER BY posted_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { fees: res.rows as AmazonFee[], total };
  }

  // --------------------------------------------------------------------------
  // 8. SKU & PRODUCT MAPPING
  // --------------------------------------------------------------------------

  public static async getMappings(
    organizationId: string,
    connectionId?: string
  ): Promise<{ mappings: AmazonEntityMapping[]; total: number }> {
    const { connection } = await this.getClientForConnection(organizationId, connectionId);
    const res = await pool.query(
      `SELECT * FROM marketplace_entity_mappings WHERE organization_id = $1 AND connection_id = $2 ORDER BY marketplace_sku ASC`,
      [organizationId, connection.id]
    );
    return { mappings: res.rows as AmazonEntityMapping[], total: res.rows.length };
  }

  public static async updateMapping(
    organizationId: string,
    connectionId: string,
    mappingId: string,
    body: {
      jyotsvan_sku?: string;
      jyotsvan_product_name?: string;
      mapping_status: 'mapped' | 'unmapped' | 'auto_matched' | 'ignored';
      notes?: string;
    }
  ): Promise<AmazonEntityMapping> {
    const res = await pool.query(
      `UPDATE marketplace_entity_mappings SET
        jyotsvan_sku = $1,
        jyotsvan_product_name = $2,
        mapping_status = $3,
        notes = $4,
        mapped_at = NOW(),
        updated_at = NOW()
       WHERE organization_id = $5 AND connection_id = $6 AND id = $7
       RETURNING *;`,
      [
        body.jyotsvan_sku || null,
        body.jyotsvan_product_name || null,
        body.mapping_status,
        body.notes || null,
        organizationId,
        connectionId,
        mappingId,
      ]
    );

    if (res.rows.length === 0) {
      throw new Error(`Mapping '${mappingId}' not found.`);
    }

    return res.rows[0] as AmazonEntityMapping;
  }

  public static async autoMatchMappings(
    organizationId: string,
    connectionId: string
  ): Promise<{ matchedCount: number; message: string }> {
    // Exact match Amazon seller_sku with Jyotsvan products.sku
    const updateRes = await pool.query(
      `UPDATE marketplace_entity_mappings m
       SET
         jyotsvan_sku = p.sku,
         jyotsvan_product_id = p.id,
         jyotsvan_product_name = p.name,
         mapping_status = 'auto_matched',
         mapped_at = NOW(),
         updated_at = NOW()
       FROM products p
       WHERE m.organization_id = $1
         AND m.connection_id = $2
         AND p.organization_id = $1
         AND LOWER(TRIM(m.marketplace_sku)) = LOWER(TRIM(p.sku))
         AND m.mapping_status != 'mapped'
       RETURNING m.id;`,
      [organizationId, connectionId]
    );

    const matchedCount = updateRes.rowCount || 0;
    return {
      matchedCount,
      message: `Successfully auto-matched ${matchedCount} Amazon SKUs to internal Jyotsvan product catalog.`,
    };
  }

  // --------------------------------------------------------------------------
  // 9. TEST CONNECTION
  // --------------------------------------------------------------------------

  public static async testConnection(
    organizationId: string,
    connectionId?: string,
    customCredentials?: Record<string, unknown>
  ) {
    const { client, connection } = await this.getClientForConnection(organizationId, connectionId);

    const testRes = await client.testConnection();

    await pool.query(
      `UPDATE integration_connections SET
        health_status = $1,
        health_message = $2,
        last_success_at = CASE WHEN $3 = true THEN NOW() ELSE last_success_at END,
        last_error_at = CASE WHEN $3 = false THEN NOW() ELSE last_error_at END,
        last_error_message = CASE WHEN $3 = false THEN $2 ELSE NULL END,
        updated_at = NOW()
       WHERE id = $4 AND organization_id = $5`,
      [
        testRes.success ? 'healthy' : 'error',
        testRes.message,
        testRes.success,
        connection.id,
        organizationId,
      ]
    );

    return testRes;
  }

  // --------------------------------------------------------------------------
  // 10. SYNCHRONIZATION ENGINE
  // --------------------------------------------------------------------------

  public static async sync(
    organizationId: string,
    connectionId: string,
    request: AmazonSyncRequest
  ): Promise<{ success: boolean; recordsProcessed: number; details: Record<string, any> }> {
    const { client, connection } = await this.getClientForConnection(organizationId, connectionId);
    const start = Date.now();
    const entity = request.entityType || 'all';

    // Insert sync job
    const jobId = `job-sync-amz-${Date.now()}`;
    await pool.query(
      `INSERT INTO integration_sync_jobs (
        id, organization_id, connection_id, job_type, status,
        records_processed, records_created, records_updated, records_failed,
        started_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'running', 0, 0, 0, 0, NOW(), NOW(), NOW())`,
      [jobId, organizationId, connection.id, request.syncType || 'incremental']
    );

    let processed = 0;
    let created = 0;
    let updated = 0;

    try {
      if (entity === 'marketplaces' || entity === 'all') {
        const participations = await client.getMarketplaceParticipations();
        for (const p of participations.payload || []) {
          await pool.query(
            `INSERT INTO marketplace_marketplaces (
              id, organization_id, connection_id, provider_key, marketplace_id,
              country_code, name, currency, domain_name, default_language_code, is_participating, created_at, updated_at
            ) VALUES ($1, $2, $3, 'amazon', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            ON CONFLICT (connection_id, marketplace_id) DO UPDATE SET
              is_participating = EXCLUDED.is_participating,
              updated_at = NOW();`,
            [
              `mkt-${p.marketplace.id.toLowerCase()}`,
              organizationId,
              connection.id,
              p.marketplace.id,
              p.marketplace.countryCode,
              p.marketplace.name,
              p.marketplace.defaultCurrencyCode,
              p.marketplace.domainName,
              p.marketplace.defaultLanguageCode,
              p.participation.isParticipating,
            ]
          );
          processed++;
          updated++;
        }
      }

      if (entity === 'orders' || entity === 'all') {
        const ordersRes = await client.getOrders({
          createdAfter: new Date(Date.now() - (request.windowDays || 30) * 86400000).toISOString(),
        });
        processed += (ordersRes.payload?.Orders || []).length;
        updated += (ordersRes.payload?.Orders || []).length;
      }

      if (entity === 'inventory' || entity === 'all') {
        const invRes = await client.getFbaInventorySummaries({});
        processed += (invRes.payload?.inventorySummaries || []).length;
        updated += (invRes.payload?.inventorySummaries || []).length;
      }

      // Update checkpoint
      await pool.query(
        `INSERT INTO marketplace_sync_checkpoints (
          id, organization_id, connection_id, provider_key, entity_type, marketplace_id, last_sync_at, status, created_at, updated_at
        ) VALUES ($1, $2, $3, 'amazon', $4, $5, NOW(), 'SUCCESS', NOW(), NOW())
        ON CONFLICT (connection_id, entity_type, marketplace_id) DO UPDATE SET
          last_sync_at = NOW(),
          status = 'SUCCESS',
          updated_at = NOW();`,
        [
          `chk-amz-${entity}`,
          organizationId,
          connection.id,
          entity,
          connection.configuration.primary_marketplace_id || 'A21TJRUUN4KGV',
        ]
      );

      // Update sync job
      await pool.query(
        `UPDATE integration_sync_jobs SET
          status = 'completed',
          records_processed = $1,
          records_created = $2,
          records_updated = $3,
          completed_at = NOW(),
          updated_at = NOW()
         WHERE id = $4`,
        [processed, created, updated, jobId]
      );

      // Update connection
      await pool.query(
        `UPDATE integration_connections SET
          last_sync_at = NOW(),
          last_success_at = NOW(),
          health_status = 'healthy',
          updated_at = NOW()
         WHERE id = $1`,
        [connection.id]
      );

      // Audit Log
      await AuditService.log({
        organizationId,
        entityType: 'integration_connection',
        entityId: connection.id,
        action: 'SYNC',
        eventType: 'SYSTEM_EVENT',
        module: 'integrations',
        actorType: 'SYSTEM',
        actorEmail: 'system@jyotsvan.enterprise',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        metadata: { description: `Completed Amazon SP-API sync (${entity}, ${request.syncType || 'incremental'}). Processed ${processed} records in ${Date.now() - start}ms.` },
      });

      return {
        success: true,
        recordsProcessed: processed,
        details: {
          jobId,
          entity,
          durationMs: Date.now() - start,
          recordsProcessed: processed,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failed';
      await pool.query(
        `UPDATE integration_sync_jobs SET
          status = 'failed',
          error_message = $1,
          completed_at = NOW(),
          updated_at = NOW()
         WHERE id = $2`,
        [errorMsg, jobId]
      );

      await NotificationService.publishEvent({
        organizationId,
        eventType: 'SYSTEM_EVENT',
        entityType: 'integration_connection',
        entityId: connection.id,
        title: 'Amazon SP-API Synchronization Error',
        message: `Failed to synchronize ${entity} from Amazon: ${errorMsg}`,
        actionUrl: '/commerce/marketplaces/amazon',
        priority: 'high',
        category: 'commerce',
      });

      throw err;
    }
  }
}
