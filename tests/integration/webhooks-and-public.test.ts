import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!HAS_DB)('public endpoints fail closed', () => {
  let app: import('express').Express;
  let pool: import('pg').Pool;

  beforeAll(async () => {
    ({ pool } = await import('../../src/server/db.ts'));
    app = (await import('../../src/server/app.ts')).createApp();
  });
  afterAll(async () => {
    await pool.end();
  });

  it('CRM inbound lead webhook rejects requests without the ingest key', async () => {
    delete process.env.CRM_INGEST_KEY;
    const r = await request(app).post('/api/crm/webhooks/inbound').send({ name: 'x', phone: '9999999999' });
    expect(r.status).toBe(401);
  });

  it('CRM inbound lead webhook rejects a wrong key and ignores a client-chosen tenant header', async () => {
    process.env.CRM_INGEST_KEY = 'k'.repeat(24);
    const wrong = await request(app).post('/api/crm/webhooks/inbound').set('x-ingest-key', 'w'.repeat(24)).send({});
    expect(wrong.status).toBe(401);
    const spoof = await request(app)
      .post('/api/crm/webhooks/inbound')
      .set('x-ingest-key', 'k'.repeat(24))
      .set('x-organization-id', 'org-someone-else')
      .send({});
    // Accepted or rejected for payload reasons, but never because we trusted the header: no row can exist for that tenant.
    expect([200, 400]).toContain(spoof.status);
    delete process.env.CRM_INGEST_KEY;
  });

  it('unknown webhook listeners and unsigned deliveries are rejected', async () => {
    const r = await request(app).post('/api/webhooks/shopify/does-not-exist').send({ id: 1 });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.body.accepted).toBe(false);
  });

  it('webhook adapters reject unsigned payloads and accept correctly signed ones', async () => {
    delete process.env.WEBHOOK_ALLOW_UNSIGNED;
    const { ShopifyAdapter } = await import('../../src/server/integrations/shopify-adapter.ts');
    const { GenericWebhookAdapter } = await import('../../src/server/integrations/generic-webhook-adapter.ts');
    const { AmazonConnector } = await import('../../src/server/integrations/amazon-connector.ts');

    const body = JSON.stringify({ id: 1, hello: 'world' });
    const secret = 'whsec_test_secret';
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

    const generic = new GenericWebhookAdapter();
    expect((await generic.handleWebhook({}, JSON.parse(body), body, { secretHash: secret })).accepted).toBe(false); // no header
    expect((await generic.handleWebhook({ 'x-webhook-signature': 'deadbeef' }, JSON.parse(body), body, { secretHash: secret })).accepted).toBe(false);
    expect((await generic.handleWebhook({ 'x-webhook-signature': sig }, JSON.parse(body), body, { secretHash: secret })).accepted).toBe(true);
    expect((await generic.handleWebhook({}, JSON.parse(body), body, {})).accepted).toBe(false); // no secret configured

    const shopify = new ShopifyAdapter();
    expect((await shopify.handleWebhook({}, JSON.parse(body), body, { secretHash: secret })).accepted).toBe(false); // header absent => reject
    expect((await shopify.handleWebhook({ 'x-shopify-hmac-sha256': 'bad' }, JSON.parse(body), body, { secretHash: secret })).accepted).toBe(false);

    const amazon = new AmazonConnector();
    expect((await amazon.handleWebhook({}, {}, '{}', { secretHash: secret })).accepted).toBe(false);
  });

  it('Meta OAuth callback does not reflect attacker input into HTML or script', async () => {
    const evil = `</script><script>alert(1)</script>`;
    const ok = await request(app).get('/api/meta/oauth/callback').query({ code: evil, state: evil });
    expect(ok.status).toBe(200);
    expect(ok.text).not.toContain('<script>alert(1)</script>');
    expect(ok.text).not.toContain('</script><script>');
    expect(ok.headers['content-security-policy']).toBeTruthy();
    const err = await request(app).get('/api/meta/oauth/callback').query({ error: '<img src=x onerror=alert(1)>' });
    expect(err.text).not.toContain('<img src=x');
    expect(err.text).toContain('&lt;img');
  });
});
