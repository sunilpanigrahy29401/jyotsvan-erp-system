import http from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXT_SERVICES, buildTarget, upstreamOf } from '../../src/server/ext-proxy.ts';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const PW = 'Str0ng-Test-Passw0rd';
const ORG = 'org-it-ext';

describe('ext-proxy URL rules (no database)', () => {
  const hrms = EXT_SERVICES.find((s) => s.id === 'hrms')!;
  it('accepts only plain http(s) upstream URLs without credentials', () => {
    expect(upstreamOf(hrms, {})).toBeNull();
    expect(upstreamOf(hrms, { HRMS_UPSTREAM_URL: 'ftp://x' })).toBeNull();
    expect(upstreamOf(hrms, { HRMS_UPSTREAM_URL: 'http://user:pw@127.0.0.1:4100' })).toBeNull();
    expect(upstreamOf(hrms, { HRMS_UPSTREAM_URL: 'not a url' })).toBeNull();
    expect(upstreamOf(hrms, { HRMS_UPSTREAM_URL: 'http://127.0.0.1:4100' })?.port).toBe('4100');
  });
  it('joins paths under the base and refuses traversal', () => {
    const base = new URL('http://127.0.0.1:4100/hr');
    expect(buildTarget(base, 'api/v1/employees', '?page=2')?.toString()).toBe('http://127.0.0.1:4100/hr/api/v1/employees?page=2');
    expect(buildTarget(base, '../secret', '')).toBeNull();
    expect(buildTarget(base, 'a/%2e%2e/b', '')).toBeNull();
    expect(buildTarget(base, 'a%5C..%5Cb', '')).toBeNull();
    expect(buildTarget(base, 'a%00b', '')).toBeNull();
    expect(buildTarget(base, '%E0%A4%A', '')).toBeNull();
  });
});

describe.skipIf(!HAS_DB)('ext gateway (real Postgres, fake upstream)', () => {
  let app: import('express').Express;
  let pool: import('pg').Pool;
  let upstream: http.Server;
  let admin = '';
  let nobody = '';
  const seen: Array<{ method: string; url: string; headers: http.IncomingHttpHeaders; body: string }> = [];

  async function mkUser(id: string, email: string, superAdmin: boolean) {
    const { hashPassword } = await import('../../src/server/core/passwords.ts');
    await pool.query(`INSERT INTO users (id, organization_id, email, full_name, is_super_admin, status, password_hash) VALUES ($1,$2,$3,$4,$5,'active',$6)`, [id, ORG, email, id, superAdmin, await hashPassword(PW)]);
    const res = await request(app).post('/api/auth/login').send({ email, password: PW });
    expect(res.status, `login ${email}`).toBe(200);
    return res.body.accessToken as string;
  }
  async function cleanup() {
    await pool.query(`DELETE FROM organizations WHERE id = $1`, [ORG]);
    await pool.query(`DELETE FROM users WHERE email LIKE '%@it-ext.test'`);
  }

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seen.push({ method: req.method || '', url: req.url || '', headers: req.headers, body });
        res.setHeader('set-cookie', 'upstream=1');
        res.setHeader('content-type', 'application/json');
        res.statusCode = req.url?.startsWith('/hr/boom') ? 503 : 200;
        res.end(JSON.stringify({ upstream: true, echoedBody: body }));
      });
    });
    await new Promise<void>((r) => upstream.listen(0, '127.0.0.1', r));
    process.env.HRMS_UPSTREAM_URL = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/hr`;
    delete process.env.GST_BILLING_UPSTREAM_URL;

    ({ pool } = await import('../../src/server/db.ts'));
    app = (await import('../../src/server/app.ts')).createApp();
    await cleanup();
    await pool.query(`INSERT INTO organizations (id, name, code) VALUES ($1,$1,'ITEXT')`, [ORG]);
    admin = await mkUser('usr-it-ext-admin', 'admin@it-ext.test', true);
    nobody = await mkUser('usr-it-ext-nobody', 'nobody@it-ext.test', false);
  });
  afterAll(async () => {
    await cleanup();
    await pool.end();
    await new Promise((r) => upstream.close(r));
  });

  it('requires a session and the matching permission', async () => {
    expect((await request(app).get('/api/ext/status')).status).toBe(401);
    expect((await request(app).get('/api/ext/hrms/employees')).status).toBe(401);
    expect((await request(app).get('/api/ext/hrms/employees').set('Authorization', `Bearer ${nobody}`)).status).toBe(403);
    expect((await request(app).get('/api/ext/gst-billing/api/bills').set('Authorization', `Bearer ${nobody}`)).status).toBe(403);
  });

  it('reports real state: configured+reachable HRMS, unconfigured GST billing', async () => {
    const r = await request(app).get('/api/ext/status').set('Authorization', `Bearer ${admin}`);
    expect(r.status).toBe(200);
    const by = Object.fromEntries(r.body.data.map((s: any) => [s.id, s]));
    expect(by.hrms).toMatchObject({ configured: true, reachable: true });
    expect(by['gst-billing']).toMatchObject({ configured: false, reachable: false });
  });

  it('answers 409 not-connected for an unset upstream instead of faking data', async () => {
    const r = await request(app).get('/api/ext/gst-billing/api/bills').set('Authorization', `Bearer ${admin}`);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('NOT_CONNECTED');
  });

  it('forwards under the base path, strips the bearer and client-asserted identity, and adds the verified identity', async () => {
    seen.length = 0;
    const r = await request(app)
      .post('/api/ext/hrms/api/v1/leave?x=1')
      .set('Authorization', `Bearer ${admin}`)
      .set('x-jyotsvan-org', 'org-attacker')
      .set('x-jyotsvan-user', 'someone-else')
      .set('Cookie', 'sid=secret')
      .send({ days: 2 });
    expect(r.status).toBe(200);
    expect(r.body.upstream).toBe(true);
    expect(JSON.parse(r.body.echoedBody)).toEqual({ days: 2 });
    expect(r.headers['set-cookie']).toBeUndefined();
    const got = seen[0];
    expect(got.method).toBe('POST');
    expect(got.url).toBe('/hr/api/v1/leave?x=1');
    expect(got.headers.authorization).toBeUndefined();
    expect(got.headers.cookie).toBeUndefined();
    expect(got.headers['x-jyotsvan-org']).toBe(ORG);
    expect(got.headers['x-jyotsvan-user']).toBe('usr-it-ext-admin');
  });

  it('passes upstream error statuses through and refuses traversal', async () => {
    expect((await request(app).get('/api/ext/hrms/boom').set('Authorization', `Bearer ${admin}`)).status).toBe(503);
    seen.length = 0;
    const r = await request(app).get('/api/ext/hrms/a/%2e%2e/%2e%2e/etc').set('Authorization', `Bearer ${admin}`);
    expect(r.status).toBe(400);
    expect(seen.length).toBe(0);
  });

  it('returns 502 when the upstream is down', async () => {
    const saved = process.env.HRMS_UPSTREAM_URL;
    process.env.HRMS_UPSTREAM_URL = 'http://127.0.0.1:1';
    const r = await request(app).get('/api/ext/hrms/employees').set('Authorization', `Bearer ${admin}`);
    process.env.HRMS_UPSTREAM_URL = saved;
    expect(r.status).toBe(502);
    expect(r.body.code).toBe('UPSTREAM_ERROR');
  });
});
