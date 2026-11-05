import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!HAS_DB)('AI tools use real data and real permissions', () => {
  let pool: import('pg').Pool;
  let Registry: typeof import('../../src/server/ai-tool-registry.ts').AiToolRegistry;
  let orgId: string;

  beforeAll(async () => {
    ({ pool } = await import('../../src/server/db.ts'));
    ({ AiToolRegistry: Registry } = await import('../../src/server/ai-tool-registry.ts'));
    orgId = (await pool.query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1')).rows[0].id;
  });
  afterAll(async () => {
    await pool.end();
  });

  const ctx = (perms: string[]) => ({ organizationId: orgId, userId: 'u', userRole: 'user', userPermissions: perms });

  it('exposes only the tools the user is permitted to use; role names grant nothing', () => {
    expect(Registry.getAvailableTools({ ...ctx([]), userRole: 'super_admin' })).toHaveLength(0);
    expect(Registry.getAvailableTools({ ...ctx([]), userRole: 'admin' })).toHaveLength(0);
    expect(Registry.getAvailableTools(ctx(['inventory.view'])).map((t) => t.name)).toEqual(['get_inventory_summary']);
    expect(Registry.getAvailableTools(ctx(['*:*'])).length).toBe(7);
  });

  it('every tool runs against the database and never returns the old fabricated figures', async () => {
    for (const tool of Registry.getAvailableTools(ctx(['*:*']))) {
      const out = await Registry.executeTool(tool.name, {}, ctx(['*:*']));
      const text = JSON.stringify(out);
      expect(text, tool.name).not.toMatch(/4850000|Kumkumadi|JY-KUM|1636900|Bangalore Metro/);
      expect(text, tool.name).not.toMatch(/"error"/);
    }
  });

  it('denies a tool the caller lacks permission for', async () => {
    const out = await Registry.executeTool('get_outstanding_summary', {}, ctx(['inventory.view']));
    expect(JSON.stringify(out)).toMatch(/Access Denied/);
  });
});
