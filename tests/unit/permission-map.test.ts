import { describe, expect, it } from 'vitest';
import { collectRoutes } from '../support/routes.ts';
import { actionForRequest, findRule, isAllowed, isAuthenticatedOnly, isPublic } from '../../src/server/core/permission-map.ts';

const perms = (...c: string[]) => new Set(c);

describe('permission decisions', () => {
  it('super admin and wildcard bypass', () => {
    expect(isAllowed(perms(), true, 'DELETE', '/people/payroll/runs/1').allowed).toBe(true);
    expect(isAllowed(perms('*:*'), false, 'POST', '/finance/invoices').allowed).toBe(true);
  });
  it('view permission allows reads but not writes', () => {
    const p = perms('inventory.view');
    expect(isAllowed(p, false, 'GET', '/inventory/balances').allowed).toBe(true);
    expect(isAllowed(p, false, 'POST', '/inventory/adjustments').allowed).toBe(false);
    expect(isAllowed(p, false, 'DELETE', '/inventory/anything').allowed).toBe(false);
  });
  it('payroll is guarded separately from general HR', () => {
    const hr = perms('employees.view', 'employees.edit');
    expect(isAllowed(hr, false, 'GET', '/people/employees').allowed).toBe(true);
    expect(isAllowed(hr, false, 'GET', '/people/payroll/runs').allowed).toBe(false);
    expect(isAllowed(perms('payroll.view'), false, 'GET', '/people/payroll/runs').allowed).toBe(true);
  });
  it('approve actions need the approve permission', () => {
    expect(actionForRequest('POST', '/procurement/purchase-orders/1/approve')).toBe('approve');
    expect(isAllowed(perms('procurement.edit'), false, 'POST', '/procurement/purchase-orders/1/approve').allowed).toBe(false);
    expect(isAllowed(perms('procurement.approve'), false, 'POST', '/procurement/purchase-orders/1/approve').allowed).toBe(true);
  });
  it('unmapped paths are denied by default', () => {
    expect(isAllowed(perms('inventory.view'), false, 'GET', '/definitely-not-a-module').allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Coverage: every route mounted by app.ts must be public, authenticated-only, or mapped to a rule.
// A new router that nobody mapped fails here instead of silently becoming a 403 (or worse, open) in production.
// ---------------------------------------------------------------------------------------------
describe('route map coverage', () => {
  const routes = collectRoutes();
  it('finds the mounted routes', () => {
    expect(routes.length).toBeGreaterThan(400);
  });
  it('every mounted route is public, authenticated-only, or covered by a permission rule', () => {
    const unmapped = routes.filter((r) => !isPublic(r.method, r.full) && !isAuthenticatedOnly(r.full) && !findRule(r.full));
    expect(unmapped.map((r) => `${r.method} ${r.full} (${r.file})`)).toEqual([]);
  });
  it('only the intended routes are public', () => {
    const publicRoutes = routes.filter((r) => isPublic(r.method, r.full)).map((r) => `${r.method} ${r.full}`);
    for (const p of publicRoutes) {
      expect(p).toMatch(/webhooks|oauth\/callback/);
    }
  });
});
