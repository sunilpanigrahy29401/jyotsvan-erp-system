import request from 'supertest';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const PW = 'Str0ng-Test-Passw0rd';
const NEW_PW = 'An0ther-Str0ng-Passw0rd';
const OTHER_ORG = 'org-it-other';
const web = { 'X-Requested-With': 'jyotsvan-web' };

describe.skipIf(!HAS_DB)('server auth, tenant isolation and RBAC (real Postgres)', () => {
  let app: import('express').Express;
  let pool: import('pg').Pool;
  let orgId: string;
  const emails = {
    admin: 'it-admin@example.test',
    sales: 'it-sales@example.test',
    lock: 'it-lock@example.test',
    pw: 'it-pw@example.test',
  };

  async function login(email: string, password = PW) {
    return request(app).post('/api/auth/login').send({ email, password });
  }

  beforeAll(async () => {
    ({ pool } = await import('../../src/server/db.ts'));
    const { createApp } = await import('../../src/server/app.ts');
    const { hashPassword } = await import('../../src/server/core/passwords.ts');
    app = createApp();
    orgId = (await pool.query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1')).rows[0].id;
    const hash = await hashPassword(PW);
    await pool.query(`INSERT INTO organizations (id, name, code) VALUES ($1, 'Other Org', 'IT-OTHER') ON CONFLICT DO NOTHING`, [OTHER_ORG]);
    const mk = async (key: keyof typeof emails, superAdmin: boolean, roleSlug?: string) => {
      const id = `usr-it-${key}`;
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      await pool.query(
        `INSERT INTO users (id, organization_id, email, full_name, is_super_admin, status, password_hash)
         VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
        [id, orgId, emails[key], `IT ${key}`, superAdmin, hash]
      );
      if (roleSlug) {
        const role = (await pool.query('SELECT id FROM roles WHERE slug = $1', [roleSlug])).rows[0];
        await pool.query('INSERT INTO user_roles (id, user_id, role_id, organization_id) VALUES ($1, $2, $3, $4)', [`ur-it-${key}`, id, role.id, orgId]);
      }
    };
    await mk('admin', true);
    await mk('sales', false, 'field_sales');
    await mk('lock', false, 'field_sales');
    await mk('pw', false, 'field_sales');
    // One category per tenant to prove isolation
    for (const [oid, cid] of [[orgId, 'cat-it-mine'], [OTHER_ORG, 'cat-it-theirs']]) {
      await pool.query(`DELETE FROM categories WHERE id = $1`, [cid]);
      await pool.query(`INSERT INTO categories (id, organization_id, name, code) VALUES ($1, $2, $3, $4)`, [cid, oid, `Cat ${cid}`, `IT-${cid}`]);
    }
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM categories WHERE id IN ('cat-it-mine','cat-it-theirs')`);
    await pool.query(`DELETE FROM users WHERE email LIKE '%@example.test'`);
    await pool.query(`DELETE FROM organizations WHERE id = $1`, [OTHER_ORG]);
    await pool.end();
  });

  // ---- unauthenticated access -----------------------------------------------
  it('rejects unauthenticated API calls', async () => {
    for (const [m, p] of [['get', '/api/categories'], ['get', '/api/people/payroll/runs'], ['post', '/api/finance/invoices'], ['get', '/api/ai/insights']] as const) {
      const r = await request(app)[m](p);
      expect(r.status, `${m} ${p}`).toBe(401);
    }
  });

  it('no longer exposes the arbitrary-SQL, migration or metadata endpoints', async () => {
    const q = await request(app).post('/api/db/query').send({ sql: 'select 1' });
    expect([401, 404]).toContain(q.status);
    const init = await request(app).get('/api/db/init');
    expect([401, 404]).toContain(init.status);
    const { body } = await request(app).get('/api/health');
    expect(body).toEqual({ status: 'ok' });
    const admin = await login(emails.admin);
    for (const p of ['/api/db/status', '/api/insforge/health']) {
      const r = await request(app).get(p).set('Authorization', `Bearer ${admin.body.accessToken}`);
      expect(r.status, p).toBe(404);
    }
    const q2 = await request(app).post('/api/db/query').set('Authorization', `Bearer ${admin.body.accessToken}`).send({ sql: 'select 1' });
    expect(q2.status).toBe(404);
  });

  // ---- login ---------------------------------------------------------------
  it('login fails identically for unknown users and wrong passwords', async () => {
    const a = await login('nobody@example.test', 'Wrong-Passw0rd-1');
    const b = await login(emails.sales, 'Wrong-Passw0rd-1');
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it('does NOT accept any email/password (the old client-side fallback is gone)', async () => {
    const r = await login('anything-admin@example.test', 'whatever-Passw0rd1');
    expect(r.status).toBe(401);
  });

  it('login succeeds, sets an httpOnly refresh cookie, and /me returns the server-computed user', async () => {
    const r = await login(emails.sales);
    expect(r.status).toBe(200);
    expect(typeof r.body.accessToken).toBe('string');
    const cookie = (r.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('jy_refresh='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    expect(Object.keys(r.body.user)).not.toContain('password_hash');
    expect(JSON.stringify(r.body)).not.toMatch(/scrypt\$|password_hash|failed_login_count|locked_until/);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${r.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(emails.sales);
    expect(me.body.user.is_super_admin).toBe(false);
    expect(me.body.user.permissions).toContain('crm.view');
    expect(me.body.user.permissions).not.toContain('payroll.view');
  });

  it('rejects forged, tampered and wrong-secret tokens', async () => {
    const real = (await login(emails.sales)).body.accessToken as string;
    const [h, p, s] = real.split('.');
    const tampered = `${h}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), sub: 'usr-it-admin' })).toString('base64url')}.${s}`;
    const forged = await new SignJWT({ org: orgId, sid: 'ses-fake' })
      .setProtectedHeader({ alg: 'HS256' }).setSubject('usr-it-admin').setIssuer('jyotsvan-erp').setAudience('jyotsvan-erp-api')
      .setIssuedAt().setExpirationTime('10m').sign(new TextEncoder().encode('attacker-secret-attacker-secret-attacker-secret'));
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${p}.`;
    for (const t of [tampered, forged, none, 'garbage']) {
      const r = await request(app).get('/api/categories').set('Authorization', `Bearer ${t}`);
      expect(r.status).toBe(401);
    }
  });

  // ---- tenant isolation --------------------------------------------------------
  it('forces the tenant to the session: a client-supplied organizationId cannot reach another tenant', async () => {
    const admin = (await login(emails.admin)).body.accessToken;
    const mine = await request(app).get(`/api/categories?organizationId=${OTHER_ORG}`).set('Authorization', `Bearer ${admin}`).set('x-organization-id', OTHER_ORG);
    expect(mine.status).toBe(200);
    const names = JSON.stringify(mine.body);
    expect(names).toContain('cat-it-mine');
    expect(names).not.toContain('cat-it-theirs');
  });

  // ---- RBAC -----------------------------------------------------------------------
  it('enforces permissions on the server (field_sales cannot read payroll or delete CRM records)', async () => {
    const t = (await login(emails.sales)).body.accessToken;
    const auth = { Authorization: `Bearer ${t}` };
    expect((await request(app).get('/api/people/payroll/runs').set(auth)).status).toBe(403);
    expect((await request(app).get('/api/finance/invoices').set(auth)).status).toBe(403);
    expect((await request(app).delete('/api/crm/leads/some-lead').set(auth)).status).toBe(403);
    const ok = await request(app).get('/api/crm/leads').set(auth);
    expect([401, 403]).not.toContain(ok.status);
    expect((await request(app).get('/api/admin/system-status').set(auth)).status).toBe(403);
  });

  it('super admin passes the permission gate and reaches the admin status endpoint', async () => {
    const t = (await login(emails.admin)).body.accessToken;
    const r = await request(app).get('/api/admin/system-status').set('Authorization', `Bearer ${t}`);
    expect(r.status).toBe(200);
    expect(r.body.database).toBe('connected');
  });

  // ---- sessions -------------------------------------------------------------------
  it('rotates refresh tokens, and detects reuse of an old token', async () => {
    const agent = request.agent(app);
    const l = await agent.post('/api/auth/login').send({ email: emails.sales, password: PW });
    const oldCookie = (l.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('jy_refresh='))!.split(';')[0];
    const r1 = await request(app).post('/api/auth/refresh').set(web).set('Cookie', oldCookie);
    expect(r1.status).toBe(200);
    expect(r1.body.accessToken).toBeTruthy();
    const newCookie = (r1.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('jy_refresh='))!.split(';')[0];
    expect(newCookie).not.toBe(oldCookie);
    // Replaying the OLD token must fail ...
    const replay = await request(app).post('/api/auth/refresh').set(web).set('Cookie', oldCookie);
    expect(replay.status).toBe(401);
    // ... and a token from the rotated chain still works only if the session was not killed by the replay detection.
    const after = await request(app).post('/api/auth/refresh').set(web).set('Cookie', newCookie);
    expect([200, 401]).toContain(after.status);
  });

  it('requires the CSRF header on refresh and logout', async () => {
    const l = await login(emails.sales);
    const cookie = (l.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('jy_refresh='))!.split(';')[0];
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(403);
    expect((await request(app).post('/api/auth/logout').set('Cookie', cookie)).status).toBe(403);
  });

  it('logout revokes the session immediately (access token and refresh token both stop working)', async () => {
    const l = await login(emails.sales);
    const cookie = (l.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('jy_refresh='))!.split(';')[0];
    const out = await request(app).post('/api/auth/logout').set(web).set('Cookie', cookie);
    expect(out.status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').set(web).set('Cookie', cookie)).status).toBe(401);
    const { invalidatePrincipalCache } = await import('../../src/server/core/middleware.ts');
    invalidatePrincipalCache();
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${l.body.accessToken}`)).status).toBe(401);
  });

  it('locks the account after repeated failures, even for the right password', async () => {
    for (let i = 0; i < 5; i++) await login(emails.lock, 'Wrong-Passw0rd-1');
    const r = await login(emails.lock, PW);
    expect(r.status).toBe(429);
    expect(r.body.code).toBe('ACCOUNT_LOCKED');
  });

  it('change-password enforces policy, needs the current password, and ends other sessions', async () => {
    const a = (await login(emails.pw)).body;
    const b = (await login(emails.pw)).body;
    const auth = { Authorization: `Bearer ${a.accessToken}` };
    expect((await request(app).post('/api/auth/change-password').set(auth).send({ currentPassword: 'nope', newPassword: NEW_PW })).status).toBe(400);
    expect((await request(app).post('/api/auth/change-password').set(auth).send({ currentPassword: PW, newPassword: 'weak' })).status).toBe(400);
    expect((await request(app).post('/api/auth/change-password').set(auth).send({ currentPassword: PW, newPassword: NEW_PW })).status).toBe(200);
    const { invalidatePrincipalCache } = await import('../../src/server/core/middleware.ts');
    invalidatePrincipalCache();
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${b.accessToken}`)).status).toBe(401);
    expect((await login(emails.pw, PW)).status).toBe(401);
    expect((await login(emails.pw, NEW_PW)).status).toBe(200);
  });

  it('writes audit entries for login events with a server-side actor', async () => {
    await login(emails.admin);
    const r = await pool.query(`SELECT actor_email, action FROM audit_logs WHERE action = 'auth.login' AND actor_email = $1 ORDER BY created_at DESC LIMIT 1`, [emails.admin]);
    expect(r.rows[0]?.actor_email).toBe(emails.admin);
  });
});
