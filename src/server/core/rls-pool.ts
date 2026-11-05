// Makes the pg Pool tenant-aware for PostgreSQL row-level security (opt-in: RLS_ENABLED=true).
//
// Every connection handed out inside a request is tagged with `app.tenant_id` (or `app.bypass_rls` for system work)
// and the tag is cleared when the connection is released, so a pooled connection can never carry one tenant's
// identity into another request. With no context at all, nothing is set and RLS policies return no rows (fail closed).
import type { Pool, PoolClient } from 'pg';
import { currentTenantStore } from './tenant-context.ts';

const RESET_SQL = "SELECT set_config('app.tenant_id', '', false), set_config('app.bypass_rls', '', false)";

async function applyContext(client: PoolClient): Promise<boolean> {
  const store = currentTenantStore();
  if (!store || (!store.system && !store.tenantId)) return false;
  await client.query("SELECT set_config('app.tenant_id', $1, false), set_config('app.bypass_rls', $2, false)", [
    store.tenantId || '',
    store.system ? 'on' : '',
  ]);
  return true;
}

export function installTenantAwarePool(pool: Pool): void {
  const originalConnect = pool.connect.bind(pool) as () => Promise<PoolClient>;

  const tenantConnect = async (): Promise<PoolClient> => {
    const client = await originalConnect();
    let tagged = false;
    try {
      tagged = await applyContext(client);
    } catch (err) {
      client.release(err as Error);
      throw err;
    }
    if (tagged) {
      const originalRelease = client.release.bind(client);
      client.release = ((err?: Error | boolean) => {
        // Clear the tag first; pg queues it ahead of any later checkout's own tag.
        client.query(RESET_SQL).catch(() => undefined).finally(() => originalRelease(err as never));
      }) as PoolClient['release'];
    }
    return client;
  };

  (pool as unknown as { connect: unknown }).connect = tenantConnect;

  // pool.query() would otherwise check a connection out internally, bypassing the wrapper above.
  (pool as unknown as { query: unknown }).query = async (...args: unknown[]) => {
    const client = await tenantConnect();
    try {
      return await (client.query as (...a: unknown[]) => Promise<unknown>).apply(client, args);
    } finally {
      client.release();
    }
  };
}
