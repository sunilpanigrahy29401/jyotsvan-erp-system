# OPERATIONS_RUNBOOK

How to run, deploy and operate the platform safely. Everything here was exercised against a real PostgreSQL 16 on 2026-11-05 unless marked **NOT VERIFIED**.

## 1. Required configuration (production refuses to start without it)
| Variable | Purpose |
|---|---|
| `SESSION_SECRET` (>=32 chars) | signs login sessions |
| `ENCRYPTION_SECRET` (>=32 chars) | encrypts stored integration credentials. **Back it up**; losing it makes stored credentials unreadable |
| `DATABASE_URL` | PostgreSQL. TLS is verified by default (`DATABASE_SSL_CA` for a private CA) |
| `NODE_ENV=production` | enables production behaviour (no boot migrations, strict TLS, secure cookies, CSP report-only) |
| `TRUST_PROXY=<n>` | set when behind a reverse proxy so client IPs/rate limits are real |
See `.env.example` for the full list. Locally: `npm run setup:env` (git-ignored `.env`, secrets generated; scripts read it via `--env-file-if-exists`). In production set real values in the host's secret store; do not copy a development `.env`. `VITE_`-prefixed values are the only ones sent to the browser.

## 2. First deployment (clean database)
```bash
npm run db:migrate -- --legacy      # builds the schema (legacy migrations + versioned ones). Review the output.
PASSWORD='<strong password>' npm run user -- create you@company.com "Your Name" --super-admin
npm run build && npm start          # node dist/server.cjs
```
`--legacy` also inserts the demo/seed rows the original migrations contain (demo users, products, etc.). They can be deactivated from Settings > Users. Demo users have **no password**, so they cannot sign in.
Existing database (already built): run `npm run db:migrate` (versioned only) as a release step. Migrations never run on server boot in production; the server logs an error if any are pending.

## 2b. Upgrading the existing InsForge database
See `LIVE_DATABASE_FINDINGS.md`: part of the upgrade is already applied; the finishing command (`npm run db:migrate` as the `postgres` role) must be run from a machine that can reach the database port. Backup `pre-upgrade-2026-11-05` exists.

## 2c. Applying migrations to the live InsForge database (privileged step)
Status 2026-11-05: the CLI is logged in and linked (`npx -y @insforge/cli current`), `db query` works over HTTPS, but it runs as `project_admin`, which does not own the 172 original tables. Fix once, as the `postgres` role (InsForge dashboard SQL editor, or `psql` with the postgres connection string from the dashboard; `npx -y @insforge/cli db connection-string` prints the project URL):
```sql
-- review first: SELECT tablename FROM pg_tables WHERE schemaname='public' AND tableowner='postgres';
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tableowner='postgres' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO project_admin', r.tablename);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname='public' AND sequenceowner='postgres' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO project_admin', r.sequencename);
  END LOOP;
END $$;
```
Then, from a machine that can reach the database's Postgres port (your laptop or the VPS, with `DATABASE_URL` from `db connection-string`; this cloud sandbox cannot): back up (`db export -o file.json`; the project allows only 1 manual backup), `npm run db:migrate -- --status`, `npm run db:migrate`. Ownership transfer changes who may DDL these tables, not who can read them; RLS and grants are unchanged. Alternative that avoids the transfer: run `npm run db:migrate` directly as `postgres`.

## 2d. Embedded modules (HRMS, GST billing)
Set `HRMS_UPSTREAM_URL` and/or `GST_BILLING_UPSTREAM_URL` (http(s) URL of the running service; keep them on a private network). The app forwards `/api/ext/hrms/*` and `/api/ext/gst-billing/*` after login and permission checks (`employees` / `invoices`), strips the bearer token and cookies, and adds `x-jyotsvan-user` / `x-jyotsvan-org` from the verified session. `GET /api/ext/status` and the *Connected Modules* screen show real state. Third-party code is MIT-licensed (keep each LICENSE if vendored).

## 3. Creating and managing users
- Admin UI: Settings > Users (creates a user with a one-time temporary password; the user must choose their own at first sign-in).
- CLI: `PASSWORD=... npm run user -- set-password <email>` (e.g. to recover the last admin).
- Lockout: 5 failed sign-ins lock the account for 15 minutes. Password policy: 10+ chars, upper/lower/number.

## 4. Existing integration credentials (IMPORTANT if you ran the old version)
The old code encrypted credentials with a built-in key. To migrate: set `ENCRYPTION_SECRET` to a new value **and** `LEGACY_VAULT_KEY_FALLBACK=true`; open each connection and re-save its credentials (re-encrypts with the new key); then remove the fallback variable. Treat any credential that ever lived in the old database as exposed and rotate it at the provider.

## 5. Inbound webhooks
- Provider webhooks (`/api/webhooks/:provider/:id`) are **rejected unless signed** with the connection's secret. Shopify and the generic adapter verify HMAC; Amazon/Flipkart/Myntra reject all webhooks until a verification scheme is implemented (they use polling today).
- CRM lead intake (`POST /api/crm/webhooks/inbound?source=webform|indiamart|meta_ads|google_ads`) needs header `x-ingest-key: $CRM_INGEST_KEY` (≥16 chars); the tenant is `CRM_INGEST_ORG_ID` (or the first organization). Without the key the CRM Integrations screen shows each channel as "awaiting credentials". Repeated deliveries (same external id) are ignored; rejected/failed payloads are logged in `crm_webhook_logs`.
- CRM unsubscribe links are signed with `ENCRYPTION_SECRET` (rotating it invalidates links already sent). Campaign recipient CSVs include a per-recipient token: `https://<host>/api/crm/public/unsubscribe?t=<token>`.
- CRM has no background scheduler: ticket escalation runs on ticket list/stats views and via `POST /api/crm/tickets/escalate`; drip steps via `POST /api/crm/sequences/run-due`. Call these from a cron if you need them unattended.

## 6. Row-level security (database-level tenant isolation) — OFF by default
Implemented and tested (`tests/integration/rls.test.ts`), but only effective when the app connects as a **non-superuser role without BYPASSRLS**. Rollout:
1. In staging, create an app role: `CREATE ROLE jyotsvan_app LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;` grant it table/sequence privileges.
2. `npm run db:rls -- --sql` (review) then `npm run db:rls -- --enable` (as the owner).
3. Run the app as `jyotsvan_app` with `RLS_ENABLED=true`. Check the application (the automated endpoint scan passed under RLS on 2026-11-05).
4. Rollback at any time: `npm run db:rls -- --disable`, and unset `RLS_ENABLED`.
**NOT VERIFIED:** whether the managed provider (InsForge) lets you use such a role; do not enable RLS in production until step 3 has passed in staging.
Tables that have no `organization_id` column (child line-item tables) are not covered; they are reached through their tenant-scoped parents.

## 7. Verifying a deployment
- `GET /api/health` returns `{"status":"ok"}` (no database details are public).
- As a super admin, `GET /api/admin/system-status` shows database connectivity, latency and pending migrations.
- Unauthenticated `GET /api/categories` must return 401.

## 8. Backups and recovery — NOT VERIFIED
Not provisioned by this repository. Required before go-live: automated daily backups with point-in-time recovery, and a documented, tested restore.

## 8b. CRM release checklist
1. Back up, then `npm run db:migrate` (applies `0006_crm_core`, `0007_crm_full`; check with `-- --status`).
2. Set `CRM_INGEST_KEY` (and `CRM_INGEST_ORG_ID` on multi-tenant installs) before pointing IndiaMART/Meta/Google/web forms at the endpoint.
3. Open `/crm/settings`: confirm the pipeline, SLAs, assignment rules and scoring rules for the tenant (defaults are created on first use).
4. Make sure users who need it hold `crm.view/create/edit` (`crm.delete` for archive/purge, `crm.approve` for handoff approval).

## 9. Known operational limits
- Rate limiting is per-process memory: with more than one instance, use a shared store (Redis) or an edge limiter.
- The access-token principal cache lasts 15 s; role/permission edits made through the admin API invalidate it immediately on the same instance only.
- Settings for organization/branches/departments/units/warehouses/business are still stored in the browser (see KNOWN_ISSUES).
