> **Status update 2026-11-05.** C1-C5, H1-H3, H5 (corrected: verification existed but could be skipped), H6, H7, H9 (identity) and the Meta callback XSS are fixed and tested; see `docs/engineering/KNOWN_ISSUES.md` for the resolved/open table and `docs/engineering/SECURITY_ARCHITECTURE.md` for the current design. Still open: PII encryption (H8), SSRF guard coverage (M4), simulated integration fallbacks, rate limiting across instances, live-database verification.

# 04 — Security and Risk Review (Step 5)

Static review only; no exploit attempted, nothing run against live systems. Secret values are masked (first 4 chars). **No real production secrets were found committed** — the "secret-like" strings found are demo/seed values (listed below). Severity: Critical = can lead to full data compromise or fake identity; High; Medium; Low.

## Critical
| # | Finding | Evidence | Why it matters (plain) | Fix |
|---|---|---|---|---|
| C1 | **Login bypass.** If InsForge sign-in errors out or is not configured, the "direct database" path accepts any email/any password, **auto-creates the user**, and any email containing `admin`/`architect` becomes super-admin with all permissions. | `src/services/auth.ts:62-190` (`isSuper = email.includes('admin') …`, no password check in the fallback; `createUser` with temp super-admin actor) | Anyone can become admin of your ERP from the login screen | Delete the fallback; only accept a verified InsForge/JWT session; derive roles server-side; remove email-string rules |
| C2 | **No server authentication/authorization.** ~700 URLs trust browser-supplied `x-organization-id` / `organizationId` / `x-user-email`; the Bearer token sent by the app (random string or hard-coded default) is never checked. | `01a_API_ENDPOINTS.md` (0 of 709 rows verify identity); `batch-routes.ts:8-25 resolveAuth` just reads headers; `meta-routes.ts:14-26` defaults user to `usr-owner-sunil`; clients `batchApi.ts:19-32`, `productionApi.ts:14`, `qualityApi.ts:16` | Any person who can reach the server can read/modify all companies, payroll, invoices | Auth middleware validating the InsForge JWT → `req.auth {userId, tenantId, permissions}`; remove all client-supplied tenant/actor inputs; deny by default |
| C3 | **Arbitrary SQL endpoint.** `POST /api/db/query` executes the SQL in the request body with the server's DB rights. | `server.ts:274-291` | Full database read/write/drop for anyone | Delete the route |
| C4 | **Unauthenticated migrations.** `ALL /api/db/init` re-runs every migration + seed; migrations also run on every server start. | `server.ts:337-397, 415-420` | Schema changes/data seeding triggered by anyone; demo data lands in real DB | Delete route; separate migration CLI; no auto-migrate in prod |
| C5 | **Identity and roles live in the browser.** Organization, branches, departments, users, roles, role-permissions and audit logs are held in localStorage (`DatabaseService`, 0 server calls). Super-admin is computed client-side. | `src/services/database.ts:56-97` | Any user can edit their own permissions in dev-tools; "who exists" differs from the server's `users` table | Move Settings to server APIs backed by Postgres; enforce on server |

## High
| # | Finding | Evidence | Fix |
|---|---|---|---|
| H1 | **Vite exposes every `INSFORGE_*` variable to the browser** (`envPrefix: ['VITE_','INSFORGE_']`), which would include `INSFORGE_DATABASE_URL` and a service-role key if set in `.env`; `define` also injects `process.env.INSFORGE_DATABASE_URL` at build time. In dev the whole `import.meta.env` is served to the browser. (Currently no client file reads those two; UNVERIFIED in a live build — verify by opening devtools → `import.meta.env`.) | `vite.config.ts:8-14` | Remove `INSFORGE_` from `envPrefix`; delete the DB-URL `define`; only `VITE_` public values |
| H2 | **Hard-coded fallback encryption key + salt** for stored provider credentials. | `crypto-vault.ts:6,12` | Require `ENCRYPTION_SECRET` at boot (exit if missing); rotate all stored credentials; plan key rotation / KMS |
| H3 | **TLS certificate checks off** for the database. | `db.ts` `ssl:{rejectUnauthorized:false}` | Provide CA, set `rejectUnauthorized:true` |
| H4 | **Fake data presented as real**: AI tools return fixed revenue ₹48,50,000 / 1,420 orders when the query errors or is empty (`ai-tool-registry.ts:112-125`); integrations simulate sessions (Amazon even after real login failure `amazon-client.ts:101`); ~293 seed INSERTs incl. demo invoices/orders in migrations (`migrate-finance.ts:630-780`, `migrate-amazon.ts:783`). | cited | Remove fallbacks (fail loudly); label sandbox mode in UI; gate demo seeding behind an explicit `SEED_DEMO=true` dev flag |
| H5 | **No webhook signature verification** found for inbound provider webhooks (Shopify `handleWebhook`, CRM public lead webhook `crm-routes.ts:255`, generic webhook adapter). Only a settings description mentions HMAC. A demo "inbound HMAC secret" is seeded (`migrate-integrations.ts:976`, `whse****`). | search for `hmac|timingSafeEqual` → no code | Verify HMAC/timestamps per provider; per-tenant secrets; replay protection |
| H6 | **AI endpoints are public** and uncapped → anyone can burn Gemini quota or query tenant data through the copilot. Model id `gemini-3.8-flash` UNVERIFIED. | `ai-routes.ts`, `ai-foundation-service.ts:103-104` | Auth + per-tenant rate limits + permission-aware tool access |
| H7 | **No tenant isolation enforcement**; two spellings of the seed tenant (`org-jyotsvan-corp` ×154 vs `org-jyotsvan-core` in Meta code) → Meta data may attach to a non-existent org (FK errors or orphan rows). | `meta-routes.ts:16`, `metaAnalyticsApi.ts:20` | RLS + single tenant source from session; migrate/clean data |
| H8 | **Sensitive personal data in plain columns**: PAN (26 refs), UAN, DOB, bank account numbers in HR/retailer/distributor tables; exposed through unauthenticated APIs. | `migrate-people.ts` (`pan`, `uan`, `bank_account_number`, `date_of_birth`) | Field-level encryption/masking + field permissions; DPDP consent & deletion workflow |
| H9 | **Audit log is forgeable and mutable**: actor/email supplied by client, inserted by ~30 copies of a helper. | e.g. `product-routes.ts:5-24` | Single append-only audit service, actor from session, hash-chained or DB-level append-only |

## Medium
| # | Finding | Evidence | Fix |
|---|---|---|---|
| M1 | No input-validation library; 1,209 `any`; hand-rolled checks. | grep | zod schemas at API boundary |
| M2 | SQL built with template strings in 25 places; sampled ones append server-built `WHERE` fragments to parameterised values (`amazon-service.ts:338…`, `procurement-service.ts:622`) — **probably safe, UNVERIFIED**; `ALTER TABLE … ${col}` uses constants. | grep | review each; use query builder for dynamic filters |
| M3 | No rate limiting, helmet/security headers, request IDs; raw DB error messages returned to the client. | `server.ts`; handlers return `err.message` | add helmet, rate-limit, error handler that hides internals |
| M4 | SSRF guard `validateSafeUrl` is used only by the custom REST adapter (`custom-rest-adapter.ts:46,150`); other outbound URLs (webhooks/base URLs) unchecked. | grep | apply to every outbound fetch to user-supplied hosts |
| M5 | Hard-coded default identity in clients: `admin@jyotsvan.enterprise`, token `ente****` (`batchApi.ts:19-20`). | cited | remove |
| M6 | CORS not configured (default same-origin) — fine today, but a separate portal/mobile app will need an allow-list; no HTTPS/HSTS assumptions documented. | `server.ts` | explicit CORS allow-list; HTTPS at proxy |
| M7 | Dependencies not audited (`npm audit` needs network; run locally). 4 unused packages. | `package.json` | run `npm audit`, remove unused, pin |
| M8 | Port 3000 hard-coded; no graceful shutdown; migrations on boot race with multiple instances. | `server.ts:68,415` | env port; migration lock |
| M9 | `pg` pool max 25 shared by everything; health endpoints run `count(*)` on every table (slow, info leak). | `server.ts:98-217` | remove or protect |

## Low / hygiene
XSS: no `dangerouslySetInnerHTML`/`eval` found (0 hits) — good. File upload: no upload endpoints found (documents are metadata); when added, scan/limit types. Secrets in git: none real found; demo values: `shpa****` (Shopify), `rzp_****` (Razorpay), `fk_s****`, `amzn****`, `Atzr****`, `myn_****`, `wms_****` seeded in `migrate-integrations.ts:935-997`, `migrate-flipkart.ts:185`, `migrate-amazon.ts:494-495`, `migrate-myntra.ts:124`, and UI placeholders — confirm these are fake and not real test keys. `.env.example` has no real values. Logging: 355 `console.log`, no PII scrubbing. Backups/PITR/monitoring: UNVERIFIED (depends on InsForge plan).

## Correction to earlier note
`docs/engineering/SECURITY_ARCHITECTURE.md` (S-7) said only `VITE_` variables reach the browser. That is **wrong for this repo** because of `envPrefix` (H1). This audit supersedes it.

## Fix order (security only)
1) Remove C3/C4 routes + lock health endpoints (hours). 2) Server auth + tenant context (C2) and remove login fallback (C1) + move Settings to server (C5) (weeks). 3) H1–H3 config fixes (hours). 4) RLS + audit service (H7, H9). 5) Webhook signatures, AI limits, PII protection, validation, rate limits.
