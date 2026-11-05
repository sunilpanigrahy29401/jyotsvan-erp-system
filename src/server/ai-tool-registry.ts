// src/server/ai-tool-registry.ts
// Phase 38: Canonical Enterprise AI Controlled Tool Registry

import { pool } from './db.ts';

export interface AiToolContext {
  organizationId: string;
  userId: string;
  userRole: string;
  userPermissions: string[];
}

export interface AiToolDefinition {
  name: string;
  description: string;
  requiredPermission: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (args: Record<string, any>, ctx: AiToolContext) => Promise<any>;
}


/** Permission check for AI tools. Authority comes only from the verified permission list; role *names* grant nothing. */
function toolPermits(ctx: AiToolContext, required?: string): boolean {
  if (!required) return true;
  return ctx.userPermissions.includes('*:*') || ctx.userPermissions.includes(required);
}

export class AiToolRegistry {
  private static tools: Map<string, AiToolDefinition> = new Map();

  static register(tool: AiToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  static getTool(name: string): AiToolDefinition | undefined {
    return this.tools.get(name);
  }

  static getAvailableTools(ctx: AiToolContext): AiToolDefinition[] {
    const list: AiToolDefinition[] = [];
    for (const tool of this.tools.values()) {
      // Permission verification
      const hasPerm = toolPermits(ctx, tool.requiredPermission);

      if (hasPerm) {
        list.push(tool);
      }
    }
    return list;
  }

  static async executeTool(
    name: string,
    args: Record<string, any>,
    ctx: AiToolContext
  ): Promise<{ success: boolean; data?: any; error?: string; sourceCitation: string }> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' is not registered in the canonical AI registry.`,
        sourceCitation: 'Registry',
      };
    }

    const hasPerm = toolPermits(ctx, tool.requiredPermission);

    if (!hasPerm) {
      return {
        success: false,
        error: `Access Denied: User role does not possess the required permission '${tool.requiredPermission}' to query this business domain.`,
        sourceCitation: 'RBAC Security Guard',
      };
    }

    try {
      const data = await tool.execute(args, ctx);
      return {
        success: true,
        data,
        sourceCitation: `Canonical Jyotsvan ERP Database (Verified at ${new Date().toLocaleTimeString()})`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Execution failed',
        sourceCitation: 'Database Error',
      };
    }
  }
}

// -------------------------------------------------------------
// Register Standard Controlled Tools
// -------------------------------------------------------------


// All tools below answer ONLY from the tenant's real data. When there is nothing to report they say so
// (`dataAvailable: false`) instead of inventing figures. Every query is parameterised and tenant-scoped.

function periodDays(period?: string): number {
  const m = /^(\d{1,3})d$/.exec(period || '30d');
  const n = m ? Number(m[1]) : 30;
  return Math.min(Math.max(n, 1), 365);
}

const num = (v: unknown) => Number(v ?? 0);
const money = (v: unknown) => Math.round(num(v) * 100) / 100;

// 1. Sales Summary
AiToolRegistry.register({
  name: 'get_sales_summary',
  description: 'Retrieve sales revenue, order count, average order value and top-selling SKUs for a recent period.',
  requiredPermission: 'sales_orders.view',
  parameters: {
    period: { type: 'string', description: 'Period such as 7d, 30d, or 90d', required: false },
  },
  execute: async (args, ctx) => {
    const days = periodDays(args.period);
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS orders, COALESCE(SUM(grand_total), 0) AS revenue
         FROM sales_orders
        WHERE organization_id = $1 AND order_date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
          AND COALESCE(order_status, status) NOT IN ('cancelled', 'draft')`,
      [ctx.organizationId, days]
    );
    const orders = num(totals.rows[0].orders);
    if (orders === 0) return { period: `${days}d`, dataAvailable: false, message: 'No sales orders in this period.' };
    const top = await pool.query(
      `SELECT i.sku_code_snapshot AS sku, i.product_name_snapshot AS title,
              SUM(i.ordered_quantity)::float AS units, SUM(i.net_amount)::float AS revenue
         FROM sales_order_items i JOIN sales_orders o ON o.id = i.sales_order_id
        WHERE o.organization_id = $1 AND o.order_date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
          AND COALESCE(o.order_status, o.status) NOT IN ('cancelled', 'draft')
        GROUP BY i.sku_code_snapshot, i.product_name_snapshot ORDER BY revenue DESC LIMIT 5`,
      [ctx.organizationId, days]
    );
    const revenue = money(totals.rows[0].revenue);
    return {
      period: `${days}d`,
      dataAvailable: true,
      grossSalesRevenue: revenue,
      totalOrders: orders,
      averageOrderValue: Math.round(revenue / orders),
      topSellingSkus: top.rows,
    };
  },
});

// 2. Inventory Summary
AiToolRegistry.register({
  name: 'get_inventory_summary',
  description: 'Retrieve current stock quantities, valuation at cost, warehouse count and SKUs at or below reorder level.',
  requiredPermission: 'inventory.view',
  parameters: {
    warehouseId: { type: 'string', description: 'Optional warehouse ID', required: false },
  },
  execute: async (args, ctx) => {
    const wh: string | null = typeof args.warehouseId === 'string' && args.warehouseId ? args.warehouseId : null;
    const stock = await pool.query(
      `SELECT COALESCE(SUM(b.total_quantity), 0)::float AS units,
              COALESCE(SUM(b.total_quantity * COALESCE(s.cost_price, 0)), 0)::float AS valuation,
              COUNT(DISTINCT b.warehouse_id)::int AS warehouses
         FROM inventory_balances b JOIN skus s ON s.id = b.sku_id
        WHERE b.organization_id = $1 AND ($2::text IS NULL OR b.warehouse_id = $2)`,
      [ctx.organizationId, wh]
    );
    if (num(stock.rows[0].units) === 0) return { dataAvailable: false, message: 'No stock balances recorded.' };
    const low = await pool.query(
      `SELECT s.sku AS sku, s.variant_name AS title, SUM(b.available_quantity)::float AS available,
              s.reorder_level AS reorder_level
         FROM skus s JOIN inventory_balances b ON b.sku_id = s.id
        WHERE s.organization_id = $1 AND ($2::text IS NULL OR b.warehouse_id = $2)
        GROUP BY s.id, s.sku, s.variant_name, s.reorder_level
       HAVING SUM(b.available_quantity) <= COALESCE(s.reorder_level, 0)
        ORDER BY SUM(b.available_quantity) ASC LIMIT 10`,
      [ctx.organizationId, wh]
    );
    return {
      dataAvailable: true,
      totalStockUnits: stock.rows[0].units,
      totalValuationAtCost: money(stock.rows[0].valuation),
      activeWarehouses: stock.rows[0].warehouses,
      lowStockSkus: low.rows,
    };
  },
});

// 3. Outstanding AR Summary
AiToolRegistry.register({
  name: 'get_outstanding_summary',
  description: 'Retrieve receivables: total invoiced, collected, outstanding, and overdue amounts by ageing bucket.',
  requiredPermission: 'outstanding.view',
  parameters: {},
  execute: async (_args, ctx) => {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS invoices,
              COALESCE(SUM(grand_total), 0) AS invoiced,
              COALESCE(SUM(amount_paid), 0) AS collected,
              COALESCE(SUM(amount_outstanding), 0) AS outstanding,
              COALESCE(SUM(amount_outstanding) FILTER (WHERE due_date >= CURRENT_DATE), 0) AS not_due,
              COALESCE(SUM(amount_outstanding) FILTER (WHERE due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30), 0) AS overdue_1_30,
              COALESCE(SUM(amount_outstanding) FILTER (WHERE due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60), 0) AS overdue_31_60,
              COALESCE(SUM(amount_outstanding) FILTER (WHERE due_date < CURRENT_DATE - 60), 0) AS overdue_61_plus
         FROM invoices
        WHERE organization_id = $1 AND status NOT IN ('draft', 'cancelled')`,
      [ctx.organizationId]
    );
    const x = r.rows[0];
    if (num(x.invoices) === 0) return { dataAvailable: false, message: 'No posted invoices.' };
    return {
      dataAvailable: true,
      totalInvoiced: money(x.invoiced),
      totalCollected: money(x.collected),
      totalOutstandingAR: money(x.outstanding),
      agingBuckets: {
        not_due: money(x.not_due),
        overdue_1_30: money(x.overdue_1_30),
        overdue_31_60: money(x.overdue_31_60),
        overdue_61_plus: money(x.overdue_61_plus),
      },
    };
  },
});

// 4. Production & Manufacturing Summary
AiToolRegistry.register({
  name: 'get_production_summary',
  description: 'Retrieve production orders by status, recent completions, output versus plan and rejected quantity.',
  requiredPermission: 'manufacturing.view',
  parameters: {},
  execute: async (_args, ctx) => {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('in_progress', 'released', 'started'))::int AS active,
              COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= date_trunc('month', CURRENT_DATE))::int AS completed_this_month,
              COALESCE(SUM(planned_quantity) FILTER (WHERE status = 'completed'), 0)::float AS planned_completed,
              COALESCE(SUM(actual_output_quantity) FILTER (WHERE status = 'completed'), 0)::float AS actual_output,
              COALESCE(SUM(actual_rejected_quantity) FILTER (WHERE status = 'completed'), 0)::float AS rejected
         FROM production_orders WHERE organization_id = $1`,
      [ctx.organizationId]
    );
    const x = r.rows[0];
    if (num(x.total) === 0) return { dataAvailable: false, message: 'No production orders.' };
    const recent = await pool.query(
      `SELECT production_order_number AS order_no, formulation_name_snapshot AS product, status, qc_status,
              production_batch_number AS batch_no, actual_output_quantity::float AS output, planned_quantity::float AS planned
         FROM production_orders WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [ctx.organizationId]
    );
    return {
      dataAvailable: true,
      activeProductionOrders: x.active,
      completedThisMonth: x.completed_this_month,
      yieldVsPlanPct: num(x.planned_completed) > 0 ? Math.round((num(x.actual_output) / num(x.planned_completed)) * 1000) / 10 : null,
      rejectedQuantity: x.rejected,
      recentOrders: recent.rows,
    };
  },
});

// 5. Marketing Summary
AiToolRegistry.register({
  name: 'get_marketing_summary',
  description: 'Retrieve paid media spend, impressions, clicks, conversions and ROAS from synced ad accounts.',
  requiredPermission: 'marketing.view',
  parameters: {
    period: { type: 'string', description: 'Period such as 7d, 30d, or 90d', required: false },
  },
  execute: async (args, ctx) => {
    const days = periodDays(args.period);
    const r = await pool.query(
      `SELECT COALESCE(SUM(spend), 0) AS spend, COALESCE(SUM(impressions), 0)::float AS impressions,
              COALESCE(SUM(clicks), 0)::float AS clicks, COALESCE(SUM(conversions), 0)::float AS conversions,
              COALESCE(SUM(conversion_value), 0) AS conversion_value
         FROM marketing_daily_insights
        WHERE organization_id = $1 AND level = 'account' AND date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')`,
      [ctx.organizationId, days]
    );
    const x = r.rows[0];
    if (num(x.spend) === 0 && num(x.impressions) === 0) {
      return { period: `${days}d`, dataAvailable: false, message: 'No synced advertising data (connect an ad account and run a sync).' };
    }
    return {
      period: `${days}d`,
      dataAvailable: true,
      totalAdSpend: money(x.spend),
      impressions: x.impressions,
      clicks: x.clicks,
      conversions: x.conversions,
      attributedRevenue: money(x.conversion_value),
      roas: num(x.spend) > 0 ? Math.round((num(x.conversion_value) / num(x.spend)) * 100) / 100 : null,
    };
  },
});

// 6. Marketplace Summary
AiToolRegistry.register({
  name: 'get_marketplace_summary',
  description: 'Retrieve marketplace order counts and order value by channel (Amazon, Flipkart, Myntra).',
  requiredPermission: 'commerce.view',
  parameters: {
    period: { type: 'string', description: 'Period such as 7d, 30d, or 90d', required: false },
  },
  execute: async (args, ctx) => {
    const days = periodDays(args.period);
    const r = await pool.query(
      `SELECT provider_key, COUNT(*)::int AS orders, COALESCE(SUM(order_total), 0) AS gmv,
              COUNT(*) FILTER (WHERE LOWER(order_status) LIKE '%cancel%' OR LOWER(order_status) LIKE '%return%')::int AS cancelled_or_returned
         FROM marketplace_orders
        WHERE organization_id = $1 AND purchase_date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
        GROUP BY provider_key ORDER BY gmv DESC`,
      [ctx.organizationId, days]
    );
    if (r.rows.length === 0) return { period: `${days}d`, dataAvailable: false, message: 'No marketplace orders synced.' };
    const total = r.rows.reduce((a, row) => a + num(row.gmv), 0);
    return {
      period: `${days}d`,
      dataAvailable: true,
      grossMarketplaceOrderValue: money(total),
      totalOrders: r.rows.reduce((a, row) => a + num(row.orders), 0),
      channels: r.rows.map((row) => ({
        channel: row.provider_key,
        orders: row.orders,
        orderValue: money(row.gmv),
        cancelledOrReturned: row.cancelled_or_returned,
      })),
    };
  },
});

// 7. Field Sales Summary
AiToolRegistry.register({
  name: 'get_field_sales_summary',
  description: 'Retrieve field-sales visit activity, orders and collections booked on visits for a recent period.',
  requiredPermission: 'field_sales.view',
  parameters: {
    period: { type: 'string', description: 'Period such as 7d, 30d, or 90d', required: false },
  },
  execute: async (args, ctx) => {
    const days = periodDays(args.period);
    const r = await pool.query(
      `SELECT COUNT(*)::int AS visits,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(DISTINCT salesperson_id)::int AS active_reps,
              COUNT(*) FILTER (WHERE order_taken_id IS NOT NULL)::int AS visits_with_orders,
              COALESCE(SUM(order_amount), 0) AS order_amount,
              COALESCE(SUM(collection_amount), 0) AS collection_amount
         FROM field_sales_visits
        WHERE organization_id = $1 AND COALESCE(actual_date, planned_date) >= CURRENT_DATE - ($2::int * INTERVAL '1 day')`,
      [ctx.organizationId, days]
    );
    const x = r.rows[0];
    if (num(x.visits) === 0) return { period: `${days}d`, dataAvailable: false, message: 'No field visits recorded.' };
    return {
      period: `${days}d`,
      dataAvailable: true,
      activeReps: x.active_reps,
      visitsPlanned: x.visits,
      visitsCompleted: x.completed,
      strikeRatePct: num(x.completed) > 0 ? Math.round((num(x.visits_with_orders) / num(x.completed)) * 1000) / 10 : null,
      ordersBookedValue: money(x.order_amount),
      collectionsBookedValue: money(x.collection_amount),
    };
  },
});
