// Per-request tenant context, propagated through async calls (AsyncLocalStorage).
// The database layer reads this to tell PostgreSQL which tenant a query runs for (row-level security).
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  /** The verified tenant of the current request. */
  tenantId?: string;
  /** System work that legitimately spans tenants (login lookup, webhook routing, migrations). */
  system?: boolean;
}

const als = new AsyncLocalStorage<TenantStore>();

export function currentTenantStore(): TenantStore | undefined {
  return als.getStore();
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return als.run({ tenantId }, fn);
}

/** Use sparingly and only where the caller is already authenticated by other means (e.g. verified webhook). */
export function runAsSystem<T>(fn: () => T): T {
  return als.run({ system: true }, fn);
}
