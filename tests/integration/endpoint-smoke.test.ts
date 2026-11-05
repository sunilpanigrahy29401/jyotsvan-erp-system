// Schema-drift guard. The database is built ONLY from the migrations (legacy + versioned); then every parameter-free
// GET endpoint is called as a super admin. Any 5xx means a service query no longer matches the schema.
// KNOWN_BROKEN lists endpoints that still fail; it must only ever shrink.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectRoutes } from '../support/routes.ts';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const PW = 'Smoke-Test-Passw0rd-91';
const SKIP = /\/stream$|oauth\/callback|\/export|\/download/;

/** path -> reason (keep empty if possible). */
const KNOWN_BROKEN: Record<string, string> = {};

describe.skipIf(!HAS_DB)('endpoint smoke on a migration-built database', () => {
  let app: import('express').Express;
  let pool: import('pg').Pool;
  let token = '';

  beforeAll(async () => {
    ({ pool } = await import('../../src/server/db.ts'));
    const { createApp } = await import('../../src/server/app.ts');
    const { hashPassword } = await import('../../src/server/core/passwords.ts');
    const { runAsSystem } = await import('../../src/server/core/tenant-context.ts');
    app = createApp();
    const hash = await hashPassword(PW);
    // Fixture setup is system work (works whether or not RLS is enabled for the connected role).
    await runAsSystem(async () => {
      const org = (await pool.query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1')).rows[0].id;
      await pool.query(`DELETE FROM users WHERE id = 'usr-smoke'`);
      await pool.query(
        `INSERT INTO users (id, organization_id, email, full_name, is_super_admin, status, password_hash)
         VALUES ('usr-smoke', $1, 'smoke@example.test', 'Smoke', TRUE, 'active', $2)`,
        [org, hash]
      );
    });
    token = (await request(app).post('/api/auth/login').send({ email: 'smoke@example.test', password: PW })).body.accessToken;
  });

  afterAll(async () => {
    const { runAsSystem } = await import('../../src/server/core/tenant-context.ts');
    await runAsSystem(async () => pool.query(`DELETE FROM users WHERE id = 'usr-smoke'`));
    await pool.end();
  });

  it('no parameter-free GET endpoint returns a server error', async () => {
    const routes = collectRoutes().filter((r) => r.method === 'GET' && !r.full.includes(':') && !r.full.includes('*') && !SKIP.test(r.full));
    const unique = [...new Set(routes.map((r) => r.full))];
    expect(unique.length).toBeGreaterThan(100);
    const failures: string[] = [];
    for (const p of unique) {
      const r = await request(app).get(`/api${p}`).set('Authorization', `Bearer ${token}`);
      if (r.status >= 500 && !(p in KNOWN_BROKEN)) {
        failures.push(`${r.status} GET ${p} :: ${String(r.body?.error || r.text).slice(0, 110)}`);
      }
    }
    expect(failures).toEqual([]);
  }, 180_000);
});
