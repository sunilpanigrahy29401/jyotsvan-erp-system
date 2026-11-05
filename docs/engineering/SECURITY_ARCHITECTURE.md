# SECURITY_ARCHITECTURE

Findings are from static review (2026-11-04). No exploit was attempted; nothing was run against a live DB.

## Intended design (docs + client code)
InsForge login -> `AuthContext` -> `/api/auth/profile` returns roles + permission codes -> `accessControl.hasPermission()` gates UI routes (`config/navigation.ts` maps path -> permission). Multi-tenant by `organization_id`.

## Actual enforcement
| Layer | State |
|---|---|
| Authentication on API | **None.** No middleware verifies a session/JWT on any route. `express.json` is the only `app.use` before routers. |
| Authorization (RBAC) | **Client-side only.** Zero `requirePermission`-style checks in 30 routers. |
| Tenant isolation | **Client-asserted.** `organizationId` query param, `x-organization-id` header, or fallback to first org / `'org-jyotsvan-corp'`. Any caller can pick any tenant. |
| Actor identity | Client-asserted (`x-user-email`, `x-user-id`; default `admin@jyotsvan.enterprise`), so audit logs are forgeable. |
| DB RLS | None declared anywhere (`grep ROW LEVEL SECURITY` empty). |

`batch-routes.ts` has a `resolveAuth` helper but it still trusts the header and picks an arbitrary user of the org — it is not authentication.

## Critical findings
- **S-1 Arbitrary SQL**: `POST /api/db/query` (server.ts:274) executes caller-supplied SQL with the server's DB credentials, unauthenticated. Full read/write/DDL on the production database.
- **S-2 Unauthenticated migrations**: `ALL /api/db/init` (server.ts:389) runs every migration/seed; GET-able.
- **S-3 Unauthenticated data dump**: `/api/insforge/health` and `/api/db/status` list every table with row counts, RLS flags, auth user count; `/api/auth/profile?email=` returns user + roles + permissions for any email (user enumeration).
- **S-4 No authz on ~580 handlers** (people/payroll, finance, integrations credentials management, AI actions "approve/execute").
- **S-5 Hard-coded encryption key fallback** (`crypto-vault.ts:6`) used to encrypt integration credentials; salt also constant. Without `ENCRYPTION_SECRET` all stored provider secrets are decryptable by anyone with the repo.
- **S-6 TLS verification off**: `db.ts` `ssl: { rejectUnauthorized:false }` (MITM risk).
- **S-7 Browser-exposed env**: only `VITE_`-prefixed vars reach the bundle (project id, API URL, anon key) which is acceptable; service-role key and DB URL are server-only. Re-check any new `VITE_` additions.

## Other risks
- 25 `pool.query` calls built with template literals (potential SQL injection where interpolating non-constant values); needs triage: `grep -rnE "query\(\`[^\`]*\\$\{" src/server`.
- No `helmet`, CORS policy, rate limiting, request-size policy beyond 10 MB JSON, or CSRF consideration; AI endpoints unthrottled (cost abuse).
- Outbound integration calls: `validateSafeUrl()` exists in `integrations/` (SSRF guard) — verify coverage on all webhook/base-URL inputs.
- Integration clients silently fall back to **simulated sessions** when credentials are dummy/absent (Amazon, Flipkart, Meta, Myntra) — risk of believing live sync works.
- Default seed users/passwords: not inspected in depth; `seed.ts`/`db.ts` insert users — confirm no default credentials in production.

## Required remediation order (not implemented here)
1. Remove or lock `/api/db/query`, `/api/db/init`, `/api/db/status`, `/api/insforge/health`.
2. Add auth middleware: validate InsForge JWT server-side, derive `req.auth = {userId, orgId, permissions}`; delete all client-supplied org/actor inputs.
3. Add `requirePermission(code)` per route group using `navigation.ts`/PERMISSIONS.md mapping.
4. Enforce `ENCRYPTION_SECRET` at boot (fail closed); rotate any credentials stored under the fallback key.
5. Turn on TLS verification; add helmet, CORS allowlist, rate limits.
6. Enable PostgreSQL RLS as defense in depth after (2).
