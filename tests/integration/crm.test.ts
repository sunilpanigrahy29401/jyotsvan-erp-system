import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const PW = 'Str0ng-Test-Passw0rd';
const ORG = 'org-it-crm';
const OTHER = 'org-it-crm-other';
const INGEST_KEY = 'crm-ingest-key-for-tests-0123456789';

describe.skipIf(!HAS_DB)('CRM module (real Postgres)', () => {
  let app: import('express').Express;
  let pool: import('pg').Pool;
  let admin = '';
  let sales = '';
  let outsider = '';
  const emp: string[] = [];

  const api = (token: string) => ({
    get: (p: string) => request(app).get(`/api/crm${p}`).set('Authorization', `Bearer ${token}`),
    post: (p: string, b: object = {}) => request(app).post(`/api/crm${p}`).set('Authorization', `Bearer ${token}`).send(b),
    put: (p: string, b: object = {}) => request(app).put(`/api/crm${p}`).set('Authorization', `Bearer ${token}`).send(b),
    patch: (p: string, b: object = {}) => request(app).patch(`/api/crm${p}`).set('Authorization', `Bearer ${token}`).send(b),
    del: (p: string, b: object = {}) => request(app).delete(`/api/crm${p}`).set('Authorization', `Bearer ${token}`).send(b),
  });
  let A: ReturnType<typeof api>;
  const phone = (() => { let n = 9000000000; return () => String(n++); })();

  async function mkUser(id: string, org: string, email: string, superAdmin: boolean, role?: string) {
    const { hashPassword } = await import('../../src/server/core/passwords.ts');
    await pool.query(`INSERT INTO users (id, organization_id, email, full_name, is_super_admin, status, password_hash) VALUES ($1,$2,$3,$4,$5,'active',$6)`, [id, org, email, id, superAdmin, await hashPassword(PW)]);
    if (role) {
      const r = (await pool.query('SELECT id FROM roles WHERE slug = $1', [role])).rows[0];
      await pool.query('INSERT INTO user_roles (id, user_id, role_id, organization_id) VALUES ($1,$2,$3,$4)', [`ur-${id}`, id, r.id, org]);
    }
    const res = await request(app).post('/api/auth/login').send({ email, password: PW });
    expect(res.status, `login ${email}`).toBe(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    ({ pool } = await import('../../src/server/db.ts'));
    app = (await import('../../src/server/app.ts')).createApp();
    await cleanup();
    for (const o of [ORG, OTHER]) {
      await pool.query(`INSERT INTO organizations (id, name, code) VALUES ($1,$2,$3)`, [o, o, o.toUpperCase()]);
      await pool.query(`INSERT INTO departments (id, organization_id, name, code) VALUES ($1,$2,'Sales','SAL')`, [`dep-${o}`, o]);
      await pool.query(`INSERT INTO branches (id, organization_id, name, code) VALUES ($1,$2,'HQ','HQ')`, [`br-${o}`, o]);
    }
    for (let i = 1; i <= 3; i++) {
      const id = `emp-it-crm-${i}`;
      emp.push(id);
      await pool.query(
        `INSERT INTO employees (id, organization_id, employee_code, first_name, last_name, display_name, phone, email, joining_date, department_id, branch_id, status)
         VALUES ($1,$2,$3,'Rep',$4,$5,$6,$7,CURRENT_DATE,$8,$9,'active')`, [id, ORG, `ITC${i}`, String(i), `Rep ${i}`, `98000000${i}0`, `rep${i}@it-crm.test`, `dep-${ORG}`, `br-${ORG}`]);
    }
    admin = await mkUser('usr-it-crm-admin', ORG, 'crm-admin@it-crm.test', true);
    sales = await mkUser('usr-it-crm-sales', ORG, 'crm-sales@it-crm.test', false, 'sales_manager');
    outsider = await mkUser('usr-it-crm-out', OTHER, 'crm-out@it-crm.test', true);
    A = api(admin);
  });

  async function cleanup() {
    // Organizations first: their CRM rows cascade away, then the users that authored them can be removed.
    for (const o of [ORG, OTHER]) await pool.query(`DELETE FROM organizations WHERE id = $1`, [o]);
    await pool.query(`DELETE FROM users WHERE email LIKE '%@it-crm.test'`);
  }
  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  // ---------------------------------------------------------------------------------------------------------------------------
  it('creates tenant defaults on first use and denies unauthenticated access', async () => {
    expect((await request(app).get('/api/crm/leads')).status).toBe(401);
    const p = await A.get('/pipelines');
    expect(p.status).toBe(200);
    expect(p.body.data).toHaveLength(1);
    expect(p.body.data[0].stages.map((s: any) => s.code)).toEqual(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);
    expect((await A.get('/config/sources')).body.data.length).toBeGreaterThan(5);
    const ints = (await A.get('/integrations')).body.data;
    expect(ints.find((i: any) => i.provider === 'whatsapp').status).toBe('not_connected');
    expect(ints.every((i: any) => i.status !== 'connected')).toBe(true); // nothing is claimed connected without data
  });

  it('validates leads and detects duplicates across phone formats', async () => {
    const ph = phone();
    const ok = await A.post('/leads', { first_name: 'Asha', last_name: 'Rao', phone: `+91 ${ph.slice(0, 5)}-${ph.slice(5)}`, email: 'asha@acme.test', company_name: 'Acme' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.lead_number).toMatch(/^LEAD-\d{4}-\d{4}$/);
    expect(ok.body.data.sla_due_at).toBeTruthy();
    const dup = await A.post('/leads', { first_name: 'Asha2', phone: ph });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('DUPLICATE');
    const dupMail = await A.post('/leads', { first_name: 'X', phone: phone(), email: 'ASHA@acme.test' });
    expect(dupMail.status).toBe(409);
    expect((await A.post('/leads', { first_name: 'NoContact' })).status).toBe(400);
    expect((await A.post('/leads', { first_name: 'Bad', phone: phone(), email: 'not-an-email' })).status).toBe(400);
    expect((await A.post('/leads', { first_name: 'Bad', phone: phone(), priority: 'asap' })).status).toBe(400);
    expect((await A.post('/leads', { first_name: 'Forced', phone: ph, allow_duplicate: true })).status).toBe(201);
    // numbers never collide
    const nums = new Set<string>();
    await Promise.all(Array.from({ length: 8 }, () => A.post('/leads', { first_name: 'Par', phone: phone() }).then((r) => nums.add(r.body.data.lead_number))));
    expect(nums.size).toBe(8);
  });

  it('scores with rules and round-robin auto-assigns', async () => {
    const rule = await A.post('/config/scoring', { name: 'Has company', field: 'company_name', operator: 'present', points: 20 });
    expect(rule.status).toBe(201);
    expect((await A.post('/config/scoring', { name: 'bad', field: 'not_a_field', operator: 'present', points: 5 })).status).toBe(400);
    const withCo = (await A.post('/leads', { first_name: 'Score', phone: phone(), company_name: 'Co' })).body.data;
    const without = (await A.post('/leads', { first_name: 'Score', phone: phone() })).body.data;
    expect(withCo.lead_score - without.lead_score).toBe(20);
    await A.del(`/config/scoring/${rule.body.data.id}`); // back to default formula

    const ar = await A.post('/config/assignment', { name: 'Everyone', strategy: 'round_robin', employee_ids: [emp[0], emp[1]] });
    expect(ar.status).toBe(201);
    expect((await A.post('/config/assignment', { name: 'x', strategy: 'round_robin', employee_ids: ['emp-nope'] })).status).toBe(400);
    const owners: string[] = [];
    for (let i = 0; i < 4; i++) {
      const l = (await A.post('/leads', { first_name: `RR${i}`, phone: phone() })).body.data;
      expect(l.status).toBe('assigned');
      owners.push(l.assigned_employee_id);
    }
    expect(owners[0]).not.toBe(owners[1]);
    expect(owners[0]).toBe(owners[2]);
    expect(owners[1]).toBe(owners[3]);
    await A.del(`/config/assignment/${ar.body.data.id}`);
  });

  it('tracks first response / SLA and requires a reason to lose a lead', async () => {
    await A.put('/config/sla/lead/medium', { first_response_minutes: 30 });
    const l = (await A.post('/leads', { first_name: 'Sla', phone: phone(), assigned_employee_id: emp[2] })).body.data;
    expect(new Date(l.sla_due_at).getTime() - new Date(l.created_at).getTime()).toBeLessThan(31 * 60_000);
    await pool.query(`UPDATE crm_leads SET sla_due_at = NOW() - INTERVAL '5 minutes' WHERE id = $1`, [l.id]);
    expect((await A.get('/leads/sla-breaches')).body.data.some((x: any) => x.id === l.id)).toBe(true);
    const call = await A.post('/activities', { activity_type: 'call', subject: 'Intro call', lead_id: l.id, is_completed: true, direction: 'outbound' });
    expect(call.status).toBe(201);
    const after = (await A.get(`/leads/${l.id}`)).body.data;
    expect(after.first_response_at).toBeTruthy();
    expect(after.sla_breached_at).toBeTruthy();
    expect((await A.patch(`/leads/${l.id}`, { status: 'lost' })).status).toBe(400);
    const lost = await A.patch(`/leads/${l.id}`, { status: 'lost', disqualification_reason: 'No budget' });
    expect(lost.status).toBe(200);
    expect((await A.get(`/leads/${l.id}`)).body.data.status_history.length).toBeGreaterThanOrEqual(2);
    expect((await A.patch(`/leads/${l.id}`, { status: 'converted' })).status).toBe(400); // must use /convert
  });

  it('merges duplicates, archives/restores/purges, and bulk-updates', async () => {
    const mk = async (extra: object = {}) => (await A.post('/leads', { first_name: 'Dup', phone: phone(), ...extra })).body.data;
    const a = await mk({ city: 'Pune' });
    const b = await mk({ company_name: 'Beta Ltd', tags: ['vip'] });
    await A.post('/activities', { subject: 'note on b', lead_id: b.id, activity_type: 'task' });
    const merged = await A.post('/leads/merge', { survivor_id: a.id, merge_ids: [b.id] });
    expect(merged.status).toBe(200);
    expect(merged.body.data.company_name).toBe('Beta Ltd');
    expect(merged.body.data.tags).toContain('vip');
    expect((await A.get(`/activities?lead_id=${a.id}`)).body.data).toHaveLength(1);
    expect((await A.get(`/leads/${b.id}`)).body.data.merged_into_id).toBe(a.id);
    expect((await A.post(`/leads/${b.id}/restore`)).status).toBe(409);

    const c = await mk();
    expect((await A.del(`/leads/${c.id}/purge`)).status).toBe(409); // must archive first
    expect((await A.del(`/leads/${c.id}`)).status).toBe(200);
    expect((await A.get('/leads?search=Dup')).body.data.some((x: any) => x.id === c.id)).toBe(false);
    expect((await A.get('/leads?archived=only')).body.data.some((x: any) => x.id === c.id)).toBe(true);
    expect((await A.post(`/leads/${c.id}/restore`)).status).toBe(200);
    expect((await A.del(`/leads/${c.id}`)).status).toBe(200);
    expect((await A.del(`/leads/${c.id}/purge`)).status).toBe(200);
    expect((await A.get(`/leads/${c.id}`)).status).toBe(404);

    const d = await mk(), e = await mk();
    const bulk = await A.post('/leads/bulk', { action: 'assign', ids: [d.id, e.id, 'lead-missing'], employee_id: emp[0] });
    expect(bulk.body.data.done).toBe(2);
    expect(bulk.body.data.skipped).toHaveLength(1);
    expect((await A.post('/leads/bulk', { action: 'explode', ids: [d.id] })).status).toBe(400);
  });

  it('imports CSV with duplicate and error reporting, and exports safely', async () => {
    const p1 = phone(), p2 = phone();
    const csv = `Name,Mobile,Email,Company,Weird Column\r\n"Meera, Jr",${p1},meera@x.test,"Co ""Q""",1\r\nDupe,${p1},,,\r\nNoContact,,,,\r\n=cmd|' /C calc'!A0,${p2},,,`;
    const r = await A.post('/leads/import', { csv, filename: 'x.csv' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 4, created: 2, duplicates: 1, failed: 1 });
    expect(r.body.data.unknown_columns).toEqual(['Weird Column']);
    const exp = await request(app).get('/api/crm/leads/export').set('Authorization', `Bearer ${admin}`);
    expect(exp.status).toBe(200);
    expect(exp.headers['content-type']).toMatch(/text\/csv/);
    expect(exp.text).not.toMatch(/^=cmd/m);
    expect(exp.text).toContain("'=cmd");
    expect((await A.post('/leads/import', { rows: [] })).status).toBe(400);
  });

  it('captures inbound leads (IndiaMART/Meta), ignores repeats, and fails closed without the key', async () => {
    process.env.CRM_INGEST_KEY = INGEST_KEY;
    process.env.CRM_INGEST_ORG_ID = ORG;
    const post = (src: string, body: object, key = INGEST_KEY) => request(app).post(`/api/crm/webhooks/inbound?source=${src}`).set('x-ingest-key', key).send(body);
    expect((await post('indiamart', {}, 'wrong-key-wrong-key-wrong-key')).status).toBe(401);
    const im = { QUERY_ID: 'IM-1001', SENDER_NAME: 'Ravi Kumar', SENDER_MOBILE: `+91-${phone()}`, SENDER_COMPANY: 'Kumar Traders', SENDER_CITY: 'Surat', QUERY_PRODUCT_NAME: 'Neem oil', QUERY_MESSAGE: '50 litres' };
    const first = await post('indiamart', im);
    expect(first.status).toBe(201);
    expect(first.body.duplicate).toBe(false);
    const again = await post('indiamart', im);
    expect(again.status).toBe(200);
    expect(again.body.duplicate).toBe(true);
    expect(again.body.lead_id).toBe(first.body.lead_id);
    const lead = (await A.get(`/leads/${first.body.lead_id}`)).body.data;
    expect(lead).toMatchObject({ company_name: 'Kumar Traders', city: 'Surat', source_name: 'IndiaMART' });
    expect(lead.expected_requirement).toContain('Neem oil');
    const meta = await post('meta_ads', { leadgen_id: 'FB-7', field_data: [{ name: 'full_name', values: ['Sana Iyer'] }, { name: 'phone_number', values: [phone()] }, { name: 'email', values: ['sana@m.test'] }] });
    expect(meta.status).toBe(201);
    expect((await post('webform', { name: 'No contact info' })).status).toBe(400);
    expect((await A.get('/integrations')).body.data.find((i: any) => i.provider === 'indiamart').status).toBe('connected');
    await A.patch('/integrations/indiamart', { enabled: false });
    expect((await post('indiamart', { ...im, QUERY_ID: 'IM-2', SENDER_MOBILE: phone() })).status).toBe(403);
    await A.patch('/integrations/indiamart', { enabled: true });
    delete process.env.CRM_INGEST_KEY;
    delete process.env.CRM_INGEST_ORG_ID;
  });

  it('converts a lead into account + contact + deal, once', async () => {
    const lead = (await A.post('/leads', { first_name: 'Conv', last_name: 'Ert', phone: phone(), email: 'conv@c.test', company_name: 'Convert Co', estimated_deal_value: 250000, assigned_employee_id: emp[0] })).body.data;
    const bad = await A.post(`/leads/${lead.id}/convert`, { deal_title: 'Deal', owner_employee_id: 'emp-nope' });
    expect(bad.status).toBe(400);
    expect((await A.get(`/leads/${lead.id}`)).body.data.is_converted).toBe(false); // rolled back
    const r = await A.post(`/leads/${lead.id}/convert`, { deal_title: 'Convert Co first order', deal_value: 300000, gstin: '27ABCDE1234F1Z5' });
    expect(r.status).toBe(200);
    const { account, contact, deal } = r.body.data;
    expect(account.account_number).toMatch(/^ACC-/);
    expect(contact.is_primary).toBe(true);
    expect(deal.deal_number).toMatch(/^DEAL-/);
    expect(Number(deal.deal_value)).toBe(300000);
    expect(deal.owner_employee_id).toBe(emp[0]);
    const after = (await A.get(`/leads/${lead.id}`)).body.data;
    expect(after).toMatchObject({ status: 'converted', is_converted: true, converted_account_id: account.id, converted_deal_id: deal.id });
    expect((await A.post(`/leads/${lead.id}/convert`, {})).status).toBe(409);
    expect((await A.del(`/leads/${lead.id}`)).status).toBe(409);
    // a second lead with the same phone as the account is flagged instead of silently duplicating it
    const l2 = (await A.post('/leads', { first_name: 'Same', phone: phone(), email: 'conv@c.test', allow_duplicate: true })).body.data;
    expect((await A.post(`/leads/${l2.id}/convert`, {})).status).toBe(409);
    expect((await A.post(`/leads/${l2.id}/convert`, { existing_account_id: account.id })).status).toBe(200);
    expect((await A.get(`/contacts?account_id=${account.id}`)).body.data.filter((c: any) => c.is_primary)).toHaveLength(1);
  });

  it('manages accounts/contacts with validation, archive rules and Customer 360', async () => {
    expect((await A.post('/accounts', { name: 'Bad GST', gstin: 'NOTAGSTIN' })).status).toBe(400);
    expect((await A.post('/accounts', { name: 'Neg', credit_limit: -5 })).status).toBe(400);
    const acc = (await A.post('/accounts', { name: 'Shree Distributors', relationship_type: 'distributor', gstin: '29ABCDE1234F1Z5', pan: 'ABCDE1234F', phone: phone(), state: 'Karnataka' })).body.data;
    expect((await A.post('/accounts', { name: 'Shree Again', gstin: '29ABCDE1234F1Z5' })).status).toBe(409);
    const upd = await A.put(`/accounts/${acc.id}`, { tier: 'tier_1', credit_limit: 500000 });
    expect(upd.body.data).toMatchObject({ tier: 'tier_1', credit_limit: '500000.00' });
    expect((await A.put(`/accounts/${acc.id}`, { tier: 'gold' })).status).toBe(400);
    const c1 = (await A.post('/contacts', { account_id: acc.id, first_name: 'Owner', phone: phone() })).body.data;
    const c2 = (await A.post('/contacts', { account_id: acc.id, first_name: 'Accts', phone: phone(), is_primary: true })).body.data;
    const list = (await A.get(`/contacts?account_id=${acc.id}`)).body.data;
    expect(list.find((c: any) => c.id === c2.id).is_primary).toBe(true);
    expect(list.find((c: any) => c.id === c1.id).is_primary).toBe(false);
    expect((await A.post('/contacts', { account_id: 'acc-none', first_name: 'X', phone: phone() })).status).toBe(400);

    // KYC: needs verified GST + PAN documents
    expect((await A.post(`/accounts/${acc.id}/verify-kyc`)).status).toBe(409);
    const gst = (await A.post(`/accounts/${acc.id}/documents`, { doc_type: 'gst', doc_number: '29ABCDE1234F1Z5' })).body.data;
    const pan = (await A.post(`/accounts/${acc.id}/documents`, { doc_type: 'pan', doc_number: 'ABCDE1234F' })).body.data;
    expect((await A.patch(`/documents/${gst.id}`, { status: 'rejected' })).status).toBe(400);
    await A.patch(`/documents/${gst.id}`, { status: 'verified' });
    expect((await A.post(`/accounts/${acc.id}/verify-kyc`)).status).toBe(409);
    await A.patch(`/documents/${pan.id}`, { status: 'verified' });
    const kyc = await A.post(`/accounts/${acc.id}/verify-kyc`);
    expect(kyc.body.data).toMatchObject({ kyc_status: 'verified', onboarding_status: 'completed' });

    // visits with GPS
    const visit = (await A.post('/visits', { account_id: acc.id, employee_id: emp[0], visit_type: 'onboarding' })).body.data;
    expect((await A.post(`/visits/${visit.id}/check-in`, { lat: 120, lng: 10 })).status).toBe(400);
    expect((await A.post(`/visits/${visit.id}/check-in`, { lat: 12.97, lng: 77.59 })).status).toBe(200);
    expect((await A.post(`/visits/${visit.id}/check-in`, { lat: 12.97, lng: 77.59 })).status).toBe(409);
    expect((await A.post(`/visits/${visit.id}/check-out`, { summary: 'Done' })).body.data.check_out_at).toBeTruthy();

    // 360
    await A.post('/tickets', { subject: 'Late delivery', account_id: acc.id });
    await A.post('/notes', { account_id: acc.id, content: 'Prefers WhatsApp' });
    const v = (await A.get(`/accounts/${acc.id}/360`)).body.data;
    expect(v.account.id).toBe(acc.id);
    expect(v.contacts).toHaveLength(2);
    expect(v.tickets).toHaveLength(1);
    expect(v.notes).toHaveLength(1);
    expect(v.documents).toHaveLength(2);
    expect(v.visits).toHaveLength(1);
    expect(v.summary.open_tickets).toBe(1);
    expect(v.summary.orders_available).toBe(false); // not linked to an operational record yet
    expect((await A.get('/accounts/acc-nope/360')).status).toBe(404);

    // archive blocked by open deals
    const deal = (await A.post('/deals', { title: 'Open deal', account_id: acc.id, owner_employee_id: emp[1], expected_close_date: '2030-01-01', deal_value: 1000 })).body.data;
    expect((await A.del(`/accounts/${acc.id}`)).status).toBe(409);
    await A.del(`/deals/${deal.id}`);
    await A.patch(`/deals/${deal.id}/stage`, { stage_id: deal.stage_id }); // no-op on an archived deal is rejected below
  });

  it('runs deals through custom stages with win/loss capture, items and handoff', async () => {
    const acc = (await A.post('/accounts', { name: 'Deal Co', phone: phone() })).body.data;
    const pipe = (await A.get('/pipelines')).body.data[0];
    const stage = (code: string) => pipe.stages.find((s: any) => s.code === code).id;
    expect((await A.post('/deals', { account_id: acc.id, owner_employee_id: emp[0], expected_close_date: '2030-01-01' })).status).toBe(400); // no title
    expect((await A.post('/deals', { title: 'T', account_id: acc.id, owner_employee_id: 'emp-nope', expected_close_date: '2030-01-01' })).status).toBe(400);
    expect((await A.post('/deals', { title: 'T', account_id: acc.id, owner_employee_id: emp[0], expected_close_date: '2030-01-01', stage_id: stage('won') })).status).toBe(400);
    const d = (await A.post('/deals', { title: 'Pallet order', account_id: acc.id, owner_employee_id: emp[0], expected_close_date: '2030-01-01', deal_value: 1000 })).body.data;
    expect(d.stage_id).toBe(stage('new'));
    const items = await A.put(`/deals/${d.id}/items`, { items: [{ product_name: 'Neem soap', quantity: 100, unit_price: 45.5 }, { product_name: 'Aloe gel', quantity: 10, unit_price: 120 }] });
    expect(items.body.data.total).toBe(5750);
    expect(Number((await A.get(`/deals/${d.id}`)).body.data.deal_value)).toBe(5750);
    expect((await A.put(`/deals/${d.id}/items`, { items: [{ product_name: 'x', quantity: 0, unit_price: 1 }] })).status).toBe(400);
    expect((await A.post(`/deals/${d.id}/handoff`)).status).toBe(409); // not won yet
    expect((await A.patch(`/deals/${d.id}/stage`, { stage_id: 'stg-from-nowhere' })).status).toBe(400);
    expect((await A.patch(`/deals/${d.id}/stage`, { stage_id: stage('lost') })).status).toBe(400); // reason required
    const lost = await A.patch(`/deals/${d.id}/stage`, { stage_id: stage('lost'), win_loss_reason: 'Price', competitor_name: 'RivalCo' });
    expect(lost.body.data).toMatchObject({ status: 'lost', win_loss_reason: 'Price' });
    expect((await A.patch(`/deals/${d.id}`, { deal_value: 1 })).status).toBe(409); // closed
    const reopened = await A.patch(`/deals/${d.id}/stage`, { stage_id: stage('negotiation') });
    expect(reopened.body.data).toMatchObject({ status: 'open', actual_close_date: null });
    const won = await A.patch(`/deals/${d.id}/stage`, { stage_id: stage('won') });
    expect(won.body.data.status).toBe('won');
    const h1 = await A.post(`/deals/${d.id}/handoff`, { special_terms: '50% advance' });
    expect(h1.status).toBe(200);
    expect((await A.post(`/deals/${d.id}/handoff`)).body.data.id).toBe(h1.body.data.id); // idempotent
    expect(h1.body.data.line_items).toHaveLength(2);
    expect((await A.post(`/handoffs/${h1.body.data.id}/reject`, {})).status).toBe(400);
    expect((await A.post(`/handoffs/${h1.body.data.id}/approve`, { note: 'ok' })).body.data.status).toBe('approved');
    expect((await A.post(`/handoffs/${h1.body.data.id}/approve`, {})).status).toBe(409);
    const hist = (await A.get(`/deals/${d.id}`)).body.data.stage_history;
    expect(hist.length).toBe(4);
    const board = (await A.get(`/pipelines/${pipe.id}/board`)).body.data;
    expect(board.columns.map((c: any) => c.stage.code)).toEqual(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);

    // pipeline & stage administration
    const np = await A.post('/pipelines', { name: 'Distributor onboarding', stages: [{ name: 'Applied' }, { name: 'Docs' }, { name: 'Live', is_won_stage: true }] });
    expect(np.status).toBe(201);
    expect((await A.post('/pipelines', { name: 'Bad', stages: [{ name: 'x', is_won_stage: true, is_lost_stage: true }] })).status).toBe(400);
    const extra = (await A.post(`/pipelines/${np.body.data.id}/stages`, { name: 'KYC', probability: 40 })).body.data;
    const ids = (await A.get('/pipelines')).body.data.find((p: any) => p.id === np.body.data.id).stages.map((s: any) => s.id);
    const reordered = [extra.id, ...ids.filter((i: string) => i !== extra.id)];
    const ro = await A.put(`/pipelines/${np.body.data.id}/stages/order`, { stage_ids: reordered });
    expect(ro.body.data.stages.map((s: any) => s.id)).toEqual(reordered);
    expect((await A.put(`/pipelines/${np.body.data.id}/stages/order`, { stage_ids: [extra.id] })).status).toBe(400);
    expect((await A.del(`/stages/${stage('new')}`)).status).toBe(409); // deals exist in it historically? only if in use
    expect((await A.del(`/pipelines/${pipe.id}`)).status).toBe(409); // default
    expect((await A.del(`/pipelines/${np.body.data.id}`)).status).toBe(200);
  });

  it('builds quotations from the product master with correct totals and lifecycle', async () => {
    const acc = (await A.post('/accounts', { name: 'Quote Co', phone: phone() })).body.data;
    await pool.query(`INSERT INTO products (id, organization_id, name, sku, selling_price, tax_rate) VALUES ('prd-it-crm', $1, 'Hair Oil 100ml', 'HO-100', 200, 18)`, [ORG]);
    expect((await A.post('/quotes', { title: 'Empty', account_id: acc.id, items: [] })).status).toBe(400);
    expect((await A.post('/quotes', { title: 'Bad product', account_id: acc.id, items: [{ product_id: 'prd-none', quantity: 1 }] })).status).toBe(400);
    const q = await A.post('/quotes', { title: 'Q1', account_id: acc.id, items: [{ product_id: 'prd-it-crm', quantity: 10, discount_pct: 10 }, { description: 'Freight', quantity: 1, unit_price: 500 }] });
    expect(q.status).toBe(201);
    // 10 x 200 = 2000, -10% = 1800, +18% tax = 2124 ; freight 500 ; subtotal 2500, discount 200, tax 324 -> 2624
    expect(q.body.data).toMatchObject({ subtotal: '2500.00', discount_total: '200.00', tax_total: '324.00', grand_total: '2624.00', status: 'draft' });
    expect(q.body.data.items[0].description).toBe('Hair Oil 100ml');
    expect((await A.post(`/quotes/${q.body.data.id}/accept`)).status).toBe(409); // not sent
    expect((await A.post(`/quotes/${q.body.data.id}/send`)).body.data.status).toBe('sent');
    expect((await A.put(`/quotes/${q.body.data.id}`, { title: 'edit' })).status).toBe(409);
    const clone = await A.post(`/quotes/${q.body.data.id}/clone`);
    expect(clone.body.data.quote_number).not.toBe(q.body.data.quote_number);
    expect((await A.post(`/quotes/${q.body.data.id}/reject`, {})).status).toBe(400);
    expect((await A.post(`/quotes/${q.body.data.id}/accept`, {})).body.data.status).toBe('accepted');
    expect((await A.put(`/quotes/${clone.body.data.id}`, { items: [{ description: 'Only', quantity: 2, unit_price: 50 }] })).body.data.grand_total).toBe('100.00');
    expect((await A.del(`/quotes/${q.body.data.id}`)).status).toBe(409);
    expect((await A.del(`/quotes/${clone.body.data.id}`)).status).toBe(200);
    await pool.query(`DELETE FROM products WHERE id = 'prd-it-crm'`);
  });

  it('runs helpdesk SLAs, escalation, CSAT and the knowledge base', async () => {
    const t = (await A.post('/tickets', { subject: 'Damaged carton', priority: 'high', order_ref: 'SO-1' })).body.data;
    expect(t.ticket_number).toMatch(/^TKT-/);
    expect(new Date(t.resolution_due_at).getTime()).toBeGreaterThan(new Date(t.first_response_due_at).getTime());
    expect((await A.patch(`/tickets/${t.id}/status`, { status: 'closed' })).status).toBe(409);
    expect((await A.patch(`/tickets/${t.id}/status`, { status: 'resolved' })).status).toBe(400); // no resolution note
    expect((await A.post(`/tickets/${t.id}/csat`, { score: 5 })).status).toBe(409); // not resolved
    // public reply stamps first response; internal note does not
    await A.post(`/tickets/${t.id}/comments`, { body: 'internal', is_internal: true });
    expect((await A.get(`/tickets/${t.id}`)).body.data.first_response_at).toBeNull();
    await A.post(`/tickets/${t.id}/comments`, { body: 'We are on it' });
    expect((await A.get(`/tickets/${t.id}`)).body.data.first_response_at).toBeTruthy();

    // escalation of an overdue ticket
    await pool.query(`UPDATE crm_tickets SET resolution_due_at = NOW() - INTERVAL '1 hour' WHERE id = $1`, [t.id]);
    const esc = await A.post('/tickets/escalate');
    expect(esc.body.data.escalated).toBeGreaterThanOrEqual(1);
    const e1 = (await A.get(`/tickets/${t.id}`)).body.data;
    expect(e1).toMatchObject({ escalation_level: 1, priority: 'urgent' });
    expect(e1.sla_breached_at).toBeTruthy();
    expect((await A.post('/tickets/escalate')).body.data.escalated).toBe(0); // idempotent per level

    const done = await A.patch(`/tickets/${t.id}/status`, { status: 'resolved', note: 'Replaced the carton' });
    expect(done.body.data.status).toBe('resolved');
    expect((await A.post(`/tickets/${t.id}/csat`, { score: 9 })).status).toBe(400);
    expect((await A.post(`/tickets/${t.id}/csat`, { score: 4, comment: 'Quick' })).status).toBe(200);
    expect((await A.post(`/tickets/${t.id}/csat`, { score: 5 })).status).toBe(409);
    expect((await A.patch(`/tickets/${t.id}/status`, { status: 'closed' })).body.data.status).toBe('closed');
    expect((await A.post(`/tickets/${t.id}/comments`, { body: 'late' })).status).toBe(409);
    const stats = (await A.get('/tickets/stats')).body.data;
    expect(stats.avg_csat).toBe(4);
    expect(stats.sla_breached).toBeGreaterThanOrEqual(1);

    const kb = await A.post('/kb', { title: 'How to claim damaged goods', body: 'Photograph the carton...', status: 'published', tags: ['claims'] });
    expect(kb.status).toBe(201);
    expect(kb.body.data.slug).toBe('how-to-claim-damaged-goods');
    expect((await A.get(`/kb/${kb.body.data.slug}`)).body.data.id).toBe(kb.body.data.id);
    expect((await A.post(`/kb/${kb.body.data.id}/feedback`, { helpful: true })).body.data.helpful_yes).toBe(1);
    expect((await A.get('/kb?search=carton')).body.data).toHaveLength(1);
    expect((await A.post('/kb', { title: 'no body' })).status).toBe(400);
  });

  it('enforces consent and suppression for campaigns; unsubscribe is signed and idempotent', async () => {
    const ph = phone();
    const mk = async (name: string, email: string, consent?: boolean) => {
      const l = (await A.post('/leads', { first_name: name, phone: phone(), email, state: 'Gujarat' })).body.data;
      if (consent) expect((await A.post('/consent', { subject_type: 'lead', subject_id: l.id, channel: 'email', status: 'granted', source: 'verbal', evidence: 'on call' })).status).toBe(201);
      return l;
    };
    const yes = await mk('Yes', 'yes@mk.test', true);
    const no = await mk('No', 'no@mk.test');
    const withdrawn = await mk('Withdrawn', 'wd@mk.test', true);
    await A.post('/consent', { subject_type: 'lead', subject_id: withdrawn.id, channel: 'email', status: 'withdrawn', source: 'staff' });
    expect((await A.get('/suppressions?channel=email')).body.data.some((s: any) => s.address_norm === 'wd@mk.test')).toBe(true);
    const bounced = await mk('Bounced', 'bounce@mk.test', true);
    await A.post('/suppressions', { channel: 'email', address: 'BOUNCE@mk.test', reason: 'bounced' });

    const aud = (await A.post('/audiences', { name: 'Gujarat leads', entity: 'lead', filters: { state: 'Gujarat' } })).body.data;
    const prev = (await A.get(`/audiences/${aud.id}/preview?channel=email`)).body.data;
    expect(prev.eligible).toBe(1);
    expect(prev.skipped).toMatchObject({ suppressed: 2, no_consent: 1 });

    expect((await A.post('/templates', { name: 'Bad', channel: 'email', subject: 's', body: 'Hi {{secret}}' })).status).toBe(400);
    expect((await A.post('/templates', { name: 'NoSubject', channel: 'email', body: 'Hi' })).status).toBe(400);
    const tpl = (await A.post('/templates', { name: 'Welcome', channel: 'email', subject: 'Hello {{first_name}}', body: 'Namaste {{first_name}} from Jyotsvan' })).body.data;
    expect((await A.post(`/templates/${tpl.id}/preview`, { entity: 'lead', entity_id: yes.id })).body.data.body).toBe('Namaste Yes from Jyotsvan');
    const waTpl = (await A.post('/templates', { name: 'WA', channel: 'whatsapp', body: 'Hi' })).body.data;
    expect((await A.post('/campaigns', { name: 'Mismatch', channel: 'email', template_id: waTpl.id, audience_id: aud.id })).status).toBe(400);

    const camp = (await A.post('/campaigns', { name: 'Diwali', channel: 'email', template_id: tpl.id, audience_id: aud.id })).body.data;
    const launched = await A.post(`/campaigns/${camp.id}/launch`);
    expect(launched.status).toBe(200);
    expect(launched.body.data.status).toBe('queued'); // never "sent": no provider
    expect(launched.body.data.stats).toMatchObject({ queued: 1, delivery_provider: null });
    expect((await A.post(`/campaigns/${camp.id}/launch`)).status).toBe(409);
    const csv = await request(app).get(`/api/crm/campaigns/${camp.id}/recipients.csv`).set('Authorization', `Bearer ${admin}`);
    expect(csv.text).toContain('yes@mk.test');
    expect(csv.text).not.toContain('no@mk.test');
    const token = csv.text.split('\r\n')[1].split(',')[3];

    // unsubscribe: GET never mutates; POST with a valid token does; a tampered token is rejected
    const page = await request(app).get(`/api/crm/public/unsubscribe?t=${encodeURIComponent(token)}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain('<form');
    expect((await A.get('/suppressions?channel=email')).body.data.some((s: any) => s.address_norm === 'yes@mk.test')).toBe(false);
    expect((await request(app).post('/api/crm/public/unsubscribe').send({ t: token + 'x' })).status).toBe(400);
    expect((await request(app).post('/api/crm/public/unsubscribe').send({ t: token })).status).toBe(200);
    expect((await request(app).post('/api/crm/public/unsubscribe').send({ t: token })).status).toBe(200);
    expect((await A.get('/suppressions?channel=email')).body.data.filter((s: any) => s.address_norm === 'yes@mk.test')).toHaveLength(1);
    const state = (await A.get(`/consent/lead/${yes.id}`)).body.data;
    expect(state.current.find((c: any) => c.channel === 'email').status).toBe('withdrawn');
    expect(state.history.length).toBeGreaterThanOrEqual(2);
    // now nobody is eligible
    const camp2 = (await A.post('/campaigns', { name: 'Again', channel: 'email', template_id: tpl.id, audience_id: aud.id })).body.data;
    expect((await A.post(`/campaigns/${camp2.id}/launch`)).status).toBe(409);
    expect(no.id && bounced.id && ph).toBeTruthy();
  });

  it('runs drip sequences as owner tasks and stops them without consent', async () => {
    const tpl = (await A.post('/templates', { name: 'Seq mail', channel: 'email', subject: 'Hi', body: 'Hello' })).body.data;
    expect((await A.post('/sequences', { name: 'Bad', channel: 'email', steps: [] })).status).toBe(400);
    const seq = (await A.post('/sequences', { name: 'Nurture', channel: 'email', steps: [{ delay_hours: 0, template_id: tpl.id }, { delay_hours: 24, template_id: tpl.id }] })).body.data;
    const consented = (await A.post('/leads', { first_name: 'Seq', phone: phone(), email: 'seq@q.test', assigned_employee_id: emp[0] })).body.data;
    await A.post('/consent', { subject_type: 'lead', subject_id: consented.id, channel: 'email', status: 'granted' });
    const unconsented = (await A.post('/leads', { first_name: 'SeqNo', phone: phone(), email: 'seqno@q.test' })).body.data;
    expect((await A.post(`/sequences/${seq.id}/enroll`, { entity_type: 'lead', entity_id: consented.id })).status).toBe(201);
    expect((await A.post(`/sequences/${seq.id}/enroll`, { entity_type: 'lead', entity_id: consented.id })).status).toBe(409);
    await A.post(`/sequences/${seq.id}/enroll`, { entity_type: 'lead', entity_id: unconsented.id });
    await pool.query(`UPDATE crm_sequence_enrollments SET next_run_at = NOW() - INTERVAL '1 minute' WHERE sequence_id = $1`, [seq.id]);
    const run = (await A.post('/sequences/run-due')).body.data;
    expect(run).toMatchObject({ processed: 2, tasks_created: 1, stopped_no_consent: 1 });
    const tasks = (await A.get(`/activities?lead_id=${consented.id}`)).body.data;
    expect(tasks[0].subject).toContain('Nurture');
    expect(tasks[0].assigned_employee_id).toBe(emp[0]);
    const enr = (await A.get(`/sequences/${seq.id}/enrollments`)).body.data;
    expect(enr.find((e: any) => e.entity_id === consented.id)).toMatchObject({ current_step: 1, status: 'active' });
    expect(enr.find((e: any) => e.entity_id === unconsented.id).status).toBe('stopped');
  });

  it('fires automation rules and validates them', async () => {
    expect((await A.post('/automation', { name: 'x', trigger_event: 'nope', action_type: 'create_task', action_params: { subject: 's' } })).status).toBe(400);
    expect((await A.post('/automation', { name: 'x', trigger_event: 'lead.created', action_type: 'create_task', action_params: {} })).status).toBe(400);
    const rule = (await A.post('/automation', { name: 'Hot lead task', trigger_event: 'lead.created', conditions: { priority: 'urgent' }, action_type: 'create_task', action_params: { subject: 'Call within 15 minutes', due_in_hours: 1 } })).body.data;
    const hot = (await A.post('/leads', { first_name: 'Hot', phone: phone(), priority: 'urgent', assigned_employee_id: emp[1] })).body.data;
    const cold = (await A.post('/leads', { first_name: 'Cold', phone: phone(), priority: 'low' })).body.data;
    await new Promise((r) => setTimeout(r, 400)); // rules run after commit
    const hotTasks = (await A.get(`/activities?lead_id=${hot.id}`)).body.data;
    expect(hotTasks.map((t: any) => t.subject)).toContain('Call within 15 minutes');
    expect(hotTasks[0].assigned_employee_id).toBe(emp[1]);
    expect((await A.get(`/activities?lead_id=${cold.id}`)).body.data).toHaveLength(0);
    const logs = (await A.get(`/automation/logs?rule_id=${rule.id}`)).body.data;
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('success');
    expect((await A.patch(`/automation/${rule.id}`, { is_active: false })).body.data.is_active).toBe(false);
    expect((await A.del(`/automation/${rule.id}`)).status).toBe(200);
  });

  it('enforces custom field definitions', async () => {
    const f = await A.post('/config/custom-fields', { entity: 'lead', field_key: 'pack_size', label: 'Pack size', field_type: 'select', options: ['100ml', '500ml'], is_required: true });
    expect(f.status).toBe(201);
    expect((await A.post('/config/custom-fields', { entity: 'lead', field_key: 'Bad Key', label: 'x' })).status).toBe(400);
    expect((await A.post('/leads', { first_name: 'CF', phone: phone() })).status).toBe(400); // required
    expect((await A.post('/leads', { first_name: 'CF', phone: phone(), custom_fields: { pack_size: '1L' } })).status).toBe(400);
    expect((await A.post('/leads', { first_name: 'CF', phone: phone(), custom_fields: { pack_size: '100ml', other: 1 } })).status).toBe(400); // unknown
    const ok = await A.post('/leads', { first_name: 'CF', phone: phone(), custom_fields: { pack_size: '500ml' } });
    expect(ok.status).toBe(201);
    expect(ok.body.data.custom_fields).toEqual({ pack_size: '500ml' });
    await A.patch(`/config/custom-fields/${f.body.data.id}`, { is_required: false });
    await A.del(`/config/custom-fields/${f.body.data.id}`);
  });

  it('tracks activities, follow-ups, reminders and exports a calendar', async () => {
    const lead = (await A.post('/leads', { first_name: 'Act', phone: phone(), assigned_employee_id: emp[2] })).body.data;
    expect((await A.post('/activities', { subject: '', lead_id: lead.id })).status).toBe(400);
    expect((await A.post('/activities', { subject: 'x', activity_type: 'telepathy' })).status).toBe(400);
    expect((await A.post('/activities', { subject: 'x', lead_id: 'lead-none' })).status).toBe(400);
    const due = new Date(Date.now() - 3600_000).toISOString();
    const act = (await A.post('/activities', { subject: 'Demo meeting', activity_type: 'meeting', lead_id: lead.id, due_date: due, assigned_employee_id: emp[2], location: 'Plant', duration_minutes: 45 })).body.data;
    const rem = (await A.get(`/activities/reminders?employee_id=${emp[2]}`)).body.data;
    expect(rem.overdue.some((a: any) => a.id === act.id)).toBe(true);
    const ics = await request(app).get('/api/crm/activities/calendar.ics').set('Authorization', `Bearer ${admin}`);
    expect(ics.text).toContain('BEGIN:VCALENDAR');
    expect(ics.text).toContain('SUMMARY:[meeting] Demo meeting');
    const next = new Date(Date.now() + 86_400_000).toISOString();
    const done = await A.patch(`/activities/${act.id}/complete`, { outcome: 'positive', next_follow_up_at: next });
    expect(done.body.data.activity.is_completed).toBe(true);
    expect(done.body.data.next_follow_up.activity_type).toBe('follow_up');
    expect((await A.get(`/leads/${lead.id}`)).body.data.first_response_at).toBeTruthy();
    expect((await A.patch(`/activities/${act.id}/complete`, {})).status).toBe(409);
    const note = (await A.post('/notes', { lead_id: lead.id, content: 'Wants COD' })).body.data;
    expect((await A.patch(`/notes/${note.id}`, { is_pinned: true })).body.data.is_pinned).toBe(true);
    expect((await A.post('/notes', { content: 'orphan' })).status).toBe(400);
    const tl = (await A.get(`/leads/${lead.id}/timeline`)).body.data;
    expect(tl.map((x: any) => x.kind)).toEqual(expect.arrayContaining(['activity', 'note', 'status']));
    expect((await A.del(`/activities/${act.id}`)).status).toBe(200);
    expect((await A.del(`/notes/${note.id}`)).status).toBe(200);
  });

  it('reports a consistent dashboard, funnel, forecast and win/loss', async () => {
    const dash = (await A.get('/dashboard')).body.data;
    const total = (await A.get('/leads?limit=1')).body.total;
    expect(dash.total_leads).toBe(total);
    expect(dash.deals_by_stage.length).toBeGreaterThan(0);
    const fun = (await A.get('/reports/funnel')).body.data;
    expect(fun.total_leads).toBe(total + (await pool.query(`SELECT COUNT(*)::int n FROM crm_leads WHERE organization_id = $1 AND archived_at IS NOT NULL`, [ORG])).rows[0].n);
    for (let i = 1; i < fun.steps.length; i++) expect(fun.steps[i].count).toBeLessThanOrEqual(fun.steps[i - 1].count);
    const wl = (await A.get('/reports/win-loss')).body.data;
    expect(wl.won).toBeGreaterThanOrEqual(1);
    expect(wl.lost).toBe(0); // the lost deal was re-opened and then won
    expect(wl.win_rate_percent).toBe(100);
    const fc = (await A.get('/reports/forecast')).body.data;
    expect(fc.by_month).toBeInstanceOf(Array);
    expect((await A.get('/reports/sources')).body.data.length).toBeGreaterThan(0);
    expect((await A.get('/reports/reps')).status).toBe(200);
  });

  it('enforces permissions and tenant isolation', async () => {
    const S = api(sales);
    expect((await S.get('/leads')).status).toBe(200);
    const mine = (await S.post('/leads', { first_name: 'ByRep', phone: phone() })).body.data;
    expect(mine).toBeTruthy();
    expect((await S.del(`/leads/${mine.id}`)).status).toBe(403); // sales_manager has no crm.delete
    expect((await S.post(`/handoffs/hnd-x/approve`, {})).status).toBe(403); // no crm.approve
    const O = api(outsider);
    expect((await O.get(`/leads/${mine.id}`)).status).toBe(404);
    expect((await O.get('/leads')).body.total).toBe(0);
    expect((await O.patch(`/leads/${mine.id}`, { city: 'Hacked' })).status).toBe(404);
    expect((await O.get('/pipelines')).body.data[0].id).not.toBe((await A.get('/pipelines')).body.data[0].id);
    // a body-supplied tenant is ignored
    const l = await O.post('/leads', { first_name: 'Mine', phone: phone(), organization_id: ORG });
    expect(l.status).toBe(201);
    expect((await pool.query('SELECT organization_id FROM crm_leads WHERE id = $1', [l.body.data.id])).rows[0].organization_id).toBe(OTHER);
  });
});
