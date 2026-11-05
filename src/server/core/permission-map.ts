// Maps API routes to the permission module that guards them, and enforces it on the server.
// Default is DENY: an authenticated request to an unmapped /api path is rejected (see unmapped list in tests).
import type { RequestHandler } from 'express';

export type PermissionAction = 'view' | 'write' | 'delete' | 'approve';

interface Rule {
  /** Matches the path AFTER "/api" (e.g. "/people/payroll/runs"). First match wins. */
  test: RegExp;
  /** Permission module(s); holding the needed action on ANY of them is sufficient. */
  modules: string[];
}

/** Ordered rules: most specific first. */
export const PERMISSION_RULES: Rule[] = [
  // --- HR: payroll and salary are far more sensitive than the rest of HR
  { test: /^\/people\/(payroll|salary)(\/|$)/, modules: ['payroll'] },
  { test: /^\/people\/attendance(\/|$)/, modules: ['attendance', 'employees'] },
  { test: /^\/people\/(leave|holidays)(\/|$)/, modules: ['leave', 'employees'] },
  { test: /^\/people\/(tasks)(\/|$)/, modules: ['tasks', 'employees'] },
  { test: /^\/people\/(performance|targets)(\/|$)/, modules: ['performance', 'employees'] },
  { test: /^\/people(\/|$)/, modules: ['employees'] },

  // --- Finance
  { test: /^\/finance\/(invoices|credit-notes|debit-notes)(\/|$)/, modules: ['invoices'] },
  { test: /^\/finance\/(payments|payment-methods)(\/|$)/, modules: ['payments'] },
  { test: /^\/finance\/(collections|ageing)(\/|$)/, modules: ['collections', 'outstanding'] },
  { test: /^\/finance\/(expenses|expense-categories)(\/|$)/, modules: ['expenses'] },
  { test: /^\/finance(\/|$)/, modules: ['invoices', 'payments', 'collections', 'expenses', 'outstanding'] },

  // --- Operations
  { test: /^\/(products|skus|categories|external-mappings)(\/|$)/, modules: ['products', 'inventory'] },
  { test: /^\/(suppliers|api\/suppliers)(\/|$)/, modules: ['suppliers', 'procurement'] },
  { test: /^\/inventory(\/|$)/, modules: ['inventory'] },
  { test: /^\/(warehouses|warehouse-transfers|warehouse-counts)(\/|$)/, modules: ['warehouse', 'warehouses', 'inventory'] },
  { test: /^\/procurement(\/|$)/, modules: ['procurement'] },
  { test: /^\/quality(\/|$)/, modules: ['quality'] },
  { test: /^\/formulations(\/|$)/, modules: ['manufacturing'] },
  { test: /^\/production(\/|$)/, modules: ['production', 'manufacturing'] },
  { test: /^\/batches(\/|$)/, modules: ['production', 'quality', 'manufacturing'] },

  // --- Distribution & sales
  { test: /^\/cfs(\/|$)/, modules: ['cf'] },
  { test: /^\/distributors(\/|$)/, modules: ['distributor'] },
  { test: /^\/retailers(\/|$)/, modules: ['retailer'] },
  { test: /^\/(sales-orders|sales-returns)(\/|$)/, modules: ['sales_orders'] },
  { test: /^\/field-sales(\/|$)/, modules: ['field_sales'] },
  { test: /^\/crm(\/|$)/, modules: ['crm'] },

  // --- Embedded open-source modules (gateway in ext-proxy.ts)
  { test: /^\/ext\/hrms(\/|$)/, modules: ['employees'] },
  { test: /^\/ext\/gst-billing(\/|$)/, modules: ['invoices'] },
  { test: /^\/ext\/status$/, modules: ['employees', 'invoices'] },

  // --- Commerce & marketing integrations (both mount styles)
  { test: /^\/(integrations\/)?meta(\/|$)/, modules: ['meta_ads', 'marketing'] },
  { test: /^\/(integrations\/)?google-ads(\/|$)/, modules: ['google_ads', 'marketing'] },
  { test: /^\/(integrations\/)?shopify(\/|$)/, modules: ['shopify', 'commerce'] },
  { test: /^\/(integrations\/)?amazon(\/|$)/, modules: ['amazon', 'commerce'] },
  { test: /^\/(integrations\/)?flipkart(\/|$)/, modules: ['flipkart', 'commerce'] },
  { test: /^\/(integrations\/)?myntra(\/|$)/, modules: ['myntra', 'commerce'] },
  { test: /^\/(commerce\/marketplaces|marketplaces)(\/|$)/, modules: ['marketplace', 'commerce'] },

  // --- Platform
  { test: /^\/audit-logs/, modules: ['audit_logs'] },
  {
    test: /^\/(integrations|providers|connections|webhooks|sync-jobs|metrics|logs|events|test)(\/|$)/,
    modules: ['integrations'],
  },
  { test: /^\/analytics(\/|$)/, modules: ['analytics', 'reports'] },
  { test: /^\/reports(\/|$)/, modules: ['reports'] },
  { test: /^\/ai(\/|$)/, modules: ['ai'] },
  { test: /^\/(settings|organization|branches|departments|units|locations|business-settings)(\/|$)/, modules: ['organization', 'business_settings', 'branches', 'departments', 'units', 'locations'] },
  { test: /^\/(users)(\/|$)/, modules: ['users'] },
  { test: /^\/(roles|permissions)(\/|$)/, modules: ['roles'] },
];

/** Authenticated-but-not-permission-gated paths (each user only touches their own data or non-sensitive shell data). */
export const AUTHENTICATED_ONLY: RegExp[] = [
  /^\/auth(\/|$)/,
  /^\/notifications(\/|$)/, // per-user inbox; the service scopes to the caller
];

/** Public (no bearer token) paths. Everything here must have its own verification (HMAC / state / unguessable id). */
export const PUBLIC_PATHS: Array<{ method: string; test: RegExp }> = [
  { method: 'GET', test: /^\/health$/ },
  { method: 'POST', test: /^\/auth\/(login|refresh|logout)$/ },
  { method: 'POST', test: /^\/(integrations\/)?webhooks\/[^/]+\/[^/]+$/ },
  { method: 'POST', test: /^\/crm\/webhooks\/inbound$/ },
  // Marketing unsubscribe links: authenticated by an HMAC-signed, expiring token; GET only renders a confirmation form.
  { method: 'GET', test: /^\/crm\/public\/unsubscribe$/ },
  { method: 'POST', test: /^\/crm\/public\/unsubscribe$/ },
  { method: 'GET', test: /^\/(integrations\/)?meta\/oauth\/callback$/ },
];

export function actionForRequest(method: string, path: string): PermissionAction {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return 'view';
  if (m === 'DELETE') return 'delete';
  if (/\/(approve|reject|release|post|lock|publish|execute)(\/|$)/.test(path)) return 'approve';
  return 'write';
}

export function isPublic(method: string, path: string): boolean {
  return PUBLIC_PATHS.some((p) => p.method === method.toUpperCase() && p.test.test(path));
}

export function findRule(path: string): Rule | undefined {
  return PERMISSION_RULES.find((r) => r.test.test(path));
}

export function isAuthenticatedOnly(path: string): boolean {
  return AUTHENTICATED_ONLY.some((r) => r.test(path));
}

/** Pure decision function (unit-testable). */
export function isAllowed(
  perms: ReadonlySet<string>,
  isSuperAdmin: boolean,
  method: string,
  path: string
): { allowed: boolean; reason?: string; required?: string[] } {
  if (isSuperAdmin || perms.has('*:*')) return { allowed: true };
  if (isAuthenticatedOnly(path)) return { allowed: true };
  const rule = findRule(path);
  if (!rule) return { allowed: false, reason: 'unmapped' };
  const action = actionForRequest(method, path);
  const acceptable = (m: string): string[] => {
    switch (action) {
      case 'view': return [`${m}.view`, `${m}.manage`];
      case 'write': return [`${m}.create`, `${m}.edit`, `${m}.manage`];
      case 'delete': return [`${m}.delete`, `${m}.manage`];
      case 'approve': return [`${m}.approve`, `${m}.manage`];
    }
  };
  const required = rule.modules.flatMap(acceptable);
  return { allowed: required.some((c) => perms.has(c)), required };
}

/** Express middleware: must run after authenticate. Mounted at "/api" so req.path excludes the prefix. */
export const enforcePermissions: RequestHandler = (req, res, next) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
  const result = isAllowed(req.auth.permissions, req.auth.isSuperAdmin, req.method, req.path);
  if (result.allowed) return next();
  const status = result.reason === 'unmapped' ? 403 : 403;
  console.warn(`[RBAC] denied ${req.method} ${req.path} user=${req.auth.userId} ${result.reason || ''}`);
  return res.status(status).json({ error: 'You do not have permission to perform this action.', code: 'FORBIDDEN' });
};
