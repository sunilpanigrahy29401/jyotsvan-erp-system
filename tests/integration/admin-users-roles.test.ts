import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const PW = 'Admin-Test-Passw0rd-31';

describe.skipIf(!HAS_DB)('user & role administration enforces privilege rules on the server', () => {
  let app: import('express').Express;
  let pool: import('pg').Pool;
  let orgId: string;
  let superTok = '';
  let delegateTok = '';
  const created: string[] = [];

  const login = async (email: string, password = PW) => (await request(app).post('/api/auth/login').send({ email, password })).body;

  beforeAll(async () => {
    ({ pool } = await import('../../src/server/db.ts'));
    app = (await import('../../src/server/app.ts')).createApp();
    const { hashPassword } = await import('../../src/server/core/passwords.ts');
    orgId = (await pool.query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1')).rows[0].id;
    const hash = await hashPassword(PW);
    await pool.query(`DELETE FROM users WHERE email LIKE 'adm-%@example.test'`);
    await pool.query(`DELETE FROM roles WHERE id = 'role-it-delegate'`);
    // A delegated administrator: may manage users/roles but is NOT a super admin and lacks e.g. payroll.
    await pool.query(`INSERT INTO roles (id, organization_id, name, slug, is_system, status) VALUES ('role-it-delegate', $1, 'IT Delegate', 'it_delegate', FALSE, 'active')`, [orgId]);
    await pool.query(
      `INSERT INTO role_permissions (id, role_id, permission_id)
       SELECT 'rp-it-' || p.id, 'role-it-delegate', p.id FROM permissions p
        WHERE p.code IN ('users.view','users.create','users.edit','users.delete','roles.view','roles.create','roles.edit','inventory.view')`
    );
    for (const [id, email, sup] of [['usr-adm-super', 'adm-super@example.test', true], ['usr-adm-delegate', 'adm-delegate@example.test', false]] as const) {
      await pool.query(`INSERT INTO users (id, organization_id, email, full_name, is_super_admin, status, password_hash) VALUES ($1,$2,$3,$4,$5,'active',$6)`, [id, orgId, email, id, sup, hash]);
    }
    await pool.query(`INSERT INTO user_roles (id, user_id, role_id, organization_id) VALUES ('ur-adm-del', 'usr-adm-delegate', 'role-it-delegate', $1)`, [orgId]);
    superTok = (await login('adm-super@example.test')).accessToken;
    delegateTok = (await login('adm-delegate@example.test')).accessToken;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE email LIKE 'adm-%@example.test'`);
    await pool.query(`DELETE FROM roles WHERE id = 'role-it-delegate' OR slug LIKE 'it_role_%'`);
    await pool.end();
  });

  const as = (tok: string) => ({ Authorization: `Bearer ${tok}` });

  it('lists users without ever exposing password hashes', async () => {
    const r = await request(app).get('/api/users').set(as(delegateTok));
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toMatch(/password_hash|scrypt\$/);
    expect(r.body.users.length).toBeGreaterThan(0);
  });

  it('a user without users.* permission is refused', async () => {
    const sales = await pool.query(`SELECT id FROM roles WHERE slug = 'field_sales'`);
    await pool.query(`INSERT INTO users (id, organization_id, email, full_name, status, password_hash) VALUES ('usr-adm-sales', $1, 'adm-sales@example.test', 'S', 'active', (SELECT password_hash FROM users WHERE id='usr-adm-super'))`, [orgId]);
    await pool.query(`INSERT INTO user_roles (id, user_id, role_id, organization_id) VALUES ('ur-adm-sales', 'usr-adm-sales', $1, $2)`, [sales.rows[0].id, orgId]);
    const t = (await login('adm-sales@example.test')).accessToken;
    expect((await request(app).get('/api/users').set(as(t))).status).toBe(403);
    expect((await request(app).post('/api/users').set(as(t)).send({ email: 'adm-x@example.test', full_name: 'X' })).status).toBe(403);
  });

  it('creates a user with a one-time temporary password that must be changed before any other access', async () => {
    const r = await request(app).post('/api/users').set(as(delegateTok)).send({ email: 'adm-new@example.test', full_name: 'New Person' });
    expect(r.status).toBe(201);
    const temp: string = r.body.temporaryPassword;
    expect(temp.length).toBeGreaterThanOrEqual(12);
    created.push(r.body.user.id);
    const l = await login('adm-new@example.test', temp);
    expect(l.user.must_change_password).toBe(true);
    const blocked = await request(app).get('/api/categories').set(as(l.accessToken));
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    const change = await request(app).post('/api/auth/change-password').set(as(l.accessToken)).send({ currentPassword: temp, newPassword: 'Brand-New-Passw0rd-77' });
    expect(change.status).toBe(200);
    const l2 = await login('adm-new@example.test', 'Brand-New-Passw0rd-77');
    expect(l2.user.must_change_password).toBe(false);
  });

  it('blocks privilege escalation by a delegated administrator', async () => {
    const superRole = (await pool.query(`SELECT id FROM roles WHERE slug = 'super_admin'`)).rows[0].id;
    const d = as(delegateTok);
    expect((await request(app).post('/api/users').set(d).send({ email: 'adm-e1@example.test', full_name: 'E1', is_super_admin: true })).status).toBe(403);
    expect((await request(app).post('/api/users').set(d).send({ email: 'adm-e2@example.test', full_name: 'E2', role_id: superRole })).status).toBe(403);
    // cannot create a role granting permissions they do not hold (payroll) or full access
    expect((await request(app).post('/api/roles').set(d).send({ name: 'Sneaky', slug: 'it_role_sneaky', permission_codes: ['payroll.view'] })).status).toBe(403);
    expect((await request(app).post('/api/roles').set(d).send({ name: 'God', slug: 'it_role_god', permission_codes: ['*:*'] })).status).toBe(403);
    // but may create a role within their own authority
    const ok = await request(app).post('/api/roles').set(d).send({ name: 'Viewer', slug: 'it_role_viewer', permission_codes: ['inventory.view'] });
    expect(ok.status).toBe(201);
    // cannot touch a super admin, nor the super admin role, nor themselves
    expect((await request(app).patch('/api/users/usr-adm-super').set(d).send({ full_name: 'pwned' })).status).toBe(403);
    expect((await request(app).post('/api/users/usr-adm-super/reset-password').set(d)).status).toBe(403);
    expect((await request(app).patch(`/api/roles/${superRole}`).set(d).send({ name: 'x' })).status).toBe(403);
    expect((await request(app).patch('/api/users/usr-adm-delegate').set(d).send({ is_super_admin: true })).status).toBe(403);
    expect((await request(app).post('/api/users/usr-adm-delegate/toggle-status').set(d)).status).toBe(403);
    expect((await request(app).delete('/api/users/usr-adm-delegate').set(d)).status).toBe(403);
  });

  it('a super administrator can perform those actions', async () => {
    const s = as(superTok);
    const r = await request(app).post('/api/users').set(s).send({ email: 'adm-promoted@example.test', full_name: 'Promoted', is_super_admin: true, password: 'Valid-Passw0rd-xx-99' });
    expect(r.status).toBe(201);
    expect(r.body.temporaryPassword).toBeUndefined();
    const weak = await request(app).post('/api/users').set(s).send({ email: 'adm-weak@example.test', full_name: 'Weak', password: 'weak' });
    expect(weak.status).toBe(400);
  });

  it('deactivating a user ends their sessions immediately', async () => {
    const hash = (await pool.query(`SELECT password_hash FROM users WHERE id='usr-adm-super'`)).rows[0].password_hash;
    await pool.query(`INSERT INTO users (id, organization_id, email, full_name, status, password_hash) VALUES ('usr-adm-victim', $1, 'adm-victim@example.test', 'V', 'active', $2)`, [orgId, hash]);
    const v = await login('adm-victim@example.test');
    expect((await request(app).get('/api/auth/me').set(as(v.accessToken))).status).toBe(200);
    const t = await request(app).post('/api/users/usr-adm-victim/toggle-status').set(as(delegateTok));
    expect(t.body.status).toBe('inactive');
    expect((await request(app).get('/api/auth/me').set(as(v.accessToken))).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'adm-victim@example.test', password: PW })).status).toBe(401);
  });

  it('records administrative actions in the audit log with the real actor', async () => {
    const r = await pool.query(`SELECT actor_email, action FROM audit_logs WHERE action = 'user.created' AND actor_email = 'adm-delegate@example.test' LIMIT 1`);
    expect(r.rows.length).toBe(1);
  });
});
