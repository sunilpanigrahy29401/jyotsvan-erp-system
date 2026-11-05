// Database-level tenant isolation (PostgreSQL row-level security), tested with a REAL restricted role.
// Superusers bypass RLS, so the application side of this test connects as a dedicated non-superuser role.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const APP_ROLE = 'rls_test_app';
const APP_PW = 'rls_test_app_pw';
const ORG_A = 'org-rls-a';
const ORG_B = 'org-rls-b';
const PW = 'Rls-Test-Passw0rd-55';

describe.skipIf(!HAS_DB)('row-level security (restricted role, real Postgres)', () => {
  let admin: import('pg').Pool; // superuser pool, used only for setup/teardown
  let disableRls: () => Promise<void>;
  let app: import('express').Express;
  let appPool: import('pg').Pool;
  let ctx: typeof import('../../src/server/core/tenant-context.ts');

  beforeAll(async () => {
    const superUrl = process.env.TEST_DATABASE_URL!;
    // 1) Superuser: create the restricted role, fixtures, and enable RLS through the real CLI code.
    process.env.DATABASE_URL = superUrl;
    const db1 = await import('../../src/server/db.ts');
    admin = db1.pool;
    const rls = await import('../../src/server/cli/rls.ts');
    disableRls = rls.disableRls;

    await admin.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
      CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PW}' NOSUPERUSER NOBYPASSRLS; END IF; END $$;`);
    await admin.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
    await admin.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`);
    await admin.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);

    for (const [id, code] of [[ORG_A, 'RLS-A'], [ORG_B, 'RLS-B']]) {
      await admin.query(`INSERT INTO organizations (id, name, code) VALUES ($1, $1, $2) ON CONFLICT DO NOTHING`, [id, code]);
      await admin.query(`DELETE FROM categories WHERE id = $1`, [`cat-${id}`]);
      await admin.query(`INSERT INTO categories (id, organization_id, name, code) VALUES ($1, $2, $3, $4)`, [`cat-${id}`, id, `Cat ${id}`, `C-${id}`]);
    }
    const { hashPassword } = await import('../../src/server/core/passwords.ts');
    await admin.query(`DELETE FROM users WHERE id = 'usr-rls-a'`);
    await admin.query(
      `INSERT INTO users (id, organization_id, email, full_name, is_super_admin, status, password_hash)
       VALUES ('usr-rls-a', $1, 'rls-a@example.test', 'RLS A', TRUE, 'active', $2)`,
      [ORG_A, await hashPassword(PW)]
    );
    expect(await rls.enableRls()).toBeGreaterThan(100);

    // 2) Fresh module graph: the application now connects as the restricted role with RLS plumbing on.
    vi.resetModules();
    const u = new URL(superUrl);
    u.username = APP_ROLE;
    u.password = APP_PW;
    process.env.DATABASE_URL = u.toString();
    process.env.RLS_ENABLED = 'true';
    ({ pool: appPool } = await import('../../src/server/db.ts'));
    ctx = await import('../../src/server/core/tenant-context.ts');
    app = (await import('../../src/server/app.ts')).createApp();
  });

  afterAll(async () => {
    try {
      await appPool?.end();
    } catch {
      /* ignore */
    }
    await disableRls();
    await admin.query(`DELETE FROM users WHERE id = 'usr-rls-a'`);
    await admin.query(`DELETE FROM categories WHERE id IN ('cat-${ORG_A}', 'cat-${ORG_B}')`);
    await admin.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [ORG_A, ORG_B]);
    await admin.end();
    delete process.env.RLS_ENABLED;
  });

  it('the application role really is subject to RLS', async () => {
    const r = await admin.query(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, [APP_ROLE]);
    expect(r.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });

  it('a tenant sees only its own rows, even for a query with NO tenant filter', async () => {
    const rows = await ctx.runWithTenant(ORG_A, async () => (await appPool.query('SELECT id, organization_id FROM categories')).rows);
    expect(rows.map((r) => r.id)).toEqual([`cat-${ORG_A}`]);
    const rowsB = await ctx.runWithTenant(ORG_B, async () => (await appPool.query('SELECT id FROM categories')).rows);
    expect(rowsB.map((r) => r.id)).toEqual([`cat-${ORG_B}`]);
  });

  it('with no tenant context nothing is visible (fail closed), and tags never leak between requests', async () => {
    await ctx.runWithTenant(ORG_A, async () => appPool.query('SELECT 1 FROM categories'));
    const none = (await appPool.query('SELECT id FROM categories')).rows;
    expect(none).toEqual([]);
  });

  it('system context (login, verified webhooks) can see across tenants', async () => {
    const all = await ctx.runAsSystem(async () => (await appPool.query(`SELECT id FROM categories WHERE id LIKE 'cat-org-rls-%' ORDER BY id`)).rows);
    expect(all.map((r) => r.id)).toEqual([`cat-${ORG_A}`, `cat-${ORG_B}`]);
  });

  it('a tenant cannot write rows into another tenant (WITH CHECK)', async () => {
    await expect(
      ctx.runWithTenant(ORG_A, async () =>
        appPool.query(`INSERT INTO categories (id, organization_id, name, code) VALUES ('cat-evil', $1, 'x', 'x')`, [ORG_B])
      )
    ).rejects.toThrow(/row-level security/i);
    const upd = await ctx.runWithTenant(ORG_A, async () => appPool.query(`UPDATE categories SET name = 'hacked' WHERE id = $1`, [`cat-${ORG_B}`]));
    expect(upd.rowCount).toBe(0);
  });

  it('end to end: login, then API calls run inside the tenant context and only return that tenant', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'rls-a@example.test', password: PW });
    expect(login.status).toBe(200);
    const r = await request(app).get('/api/categories').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(r.status).toBe(200);
    const text = JSON.stringify(r.body);
    expect(text).toContain(`cat-${ORG_A}`);
    expect(text).not.toContain(`cat-${ORG_B}`);
  });
});
