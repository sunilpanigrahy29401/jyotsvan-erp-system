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
See `.env.example` for the full list. `VITE_`-prefixed values are the only ones sent to the browser.

## 2. First deployment (clean database)
```bash
npm run db:migrate -- --legacy      # builds the schema (legacy migrations + versioned ones). Review the output.
PASSWORD='<strong password>' npm run user -- create you@company.com "Your Name" --super-admin
npm run build && npm start          # node dist/server.cjs
```
`--legacy` also inserts the demo/seed rows the original migrations contain (demo users, products, etc.). They can be deactivated from Settings > Users. Demo users have **no password**, so they cannot sign in.
Existing database (already built): run `npm run db:migrate` (versioned only) as a release step. Migrations never run on server boot in production; the server logs an error if any are pending.

## 2b. Upgrading the existing InsForge database
See `LIVE_DATABASE_FINDINGS.md` (what is missing, rehearsal results, backup/verify/rollback steps). The live database is PostgreSQL 15 with ~50 demo-sized rows; take a backup first (`backups create --wait`).

## 3. Creating and managing users
- Admin UI: Settings > Users (creates a user with a one-time temporary password; the user must choose their own at first sign-in).
- CLI: `PASSWORD=... npm run user -- set-password <email>` (e.g. to recover the last admin).
- Lockout: 5 failed sign-ins lock the account for 15 minutes. Password policy: 10+ chars, upper/lower/number.

## 4. Existing integration credentials (IMPORTANT if you ran the old version)
The old code encrypted credentials with a built-in key. To migrate: set `ENCRYPTION_SECRET` to a new value **and** `LEGACY_VAULT_KEY_FALLBACK=true`; open each connection and re-save its credentials (re-encrypts with the new key); then remove the fallback variable. Treat any credential that ever lived in the old database as exposed and rotate it at the provider.

## 5. Inbound webhooks
- Provider webhooks (`/api/webhooks/:provider/:id`) are **rejected unless signed** with the connection's secret. Shopify and the generic adapter verify HMAC; Amazon/Flipkart/Myntra reject all webhooks until a verification scheme is implemented (they use polling today).
- CRM lead intake (`POST /api/crm/webhooks/inbound`) needs header `x-ingest-key: $CRM_INGEST_KEY`; the tenant is `CRM_INGEST_ORG_ID` (or the first organization).

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

## 9. Known operational limits
- Rate limiting is per-process memory: with more than one instance, use a shared store (Redis) or an edge limiter.
- The access-token principal cache lasts 15 s; role/permission edits made through the admin API invalidate it immediately on the same instance only.
- Settings for organization/branches/departments/units/warehouses/business are still stored in the browser (see KNOWN_ISSUES).
