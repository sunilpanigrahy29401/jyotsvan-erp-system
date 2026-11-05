# KNOWN_ISSUES

Status as of 2026-11-05 after the security/foundation work. Severity: P0 blocker · P1 high · P2 medium · P3 low.

## Resolved (with proof)
| Was | Fix | Evidence |
|---|---|---|
| KI-01 arbitrary SQL endpoint | removed | `tests/integration/auth-and-isolation.test.ts` |
| KI-02 no server auth; tenant/actor from client | session auth on every `/api` route; tenant/actor forced from session; deny-by-default RBAC | auth, isolation, RBAC tests; route coverage test |
| Login accepted any email/password; browser decided super-admin | server login (scrypt, JWT, rotating httpOnly refresh, lockout, audit); client fallback and quick-login/persona UI removed | tests + browser run |
| KI-03 unauthenticated migrations; boot migrations | route removed; migrations only via `npm run db:migrate`; never on boot in production | production start check |
| KI-04 hard-coded vault key | `ENCRYPTION_SECRET` required in production; legacy-key read fallback is opt-in | production start check |
| KI-05 TLS verification off | verified by default; explicit dev-only opt-out, refused in production | code |
| KI-06 unauthenticated recon endpoints | removed; admin-only `/api/admin/system-status` | tests |
| KI-07 CRM type errors | fixed (`tsc` clean) | CI |
| KI-08 no tests/CI | 38+ tests on real Postgres; GitHub Actions workflow | `npx vitest run`, `.github/workflows/ci.yml` |
| KI-10 migrations unversioned | versioned runner with checksums and advisory lock; legacy set now builds a clean DB | CLI, tests |
| KI-14 missing base tables / schema not reproducible | `categories`/`products` base DDL, savepoint-isolated demo seeds, 0003 adds compat columns and missing tables | clean-DB build |
| Schema drift: ~25 endpoints returned 500 on a migration-built DB | queries/columns fixed | `endpoint-smoke.test.ts` |
| Webhooks accepted unsigned payloads (Shopify header skip, others accepted anything) | fail closed | `webhooks-and-public.test.ts` |
| Meta OAuth callback reflected XSS | escaped, CSP, same-origin postMessage | test |
| AI: every caller was super admin; tools returned invented figures and product names | uses session permissions; tools query real data | `ai-tools.test.ts` |
| Vite exposed `INSFORGE_*` to the browser | only `VITE_*` | `vite.config.ts` |
| Notification live stream (SSE) unauthenticated/hard-coded user | fetch-based stream with session identity | browser run |

## Open
| ID | Sev | Issue |
|---|---|---|
| KI-20 | P1 | **Org/branch/department/unit/warehouse/business settings still live in browser storage** (`src/services/database.ts`) — edits do not reach the server. Users/roles/permissions are server-backed. |
| KI-21 | P1 | **Live database partially upgraded (2026-11-05, backup `pre-upgrade-2026-11-05`).** 65 missing tables and reference data are applied. **Still required:** run `npm run db:migrate` as the `postgres` owner role from a machine that can reach the DB (CLI role cannot ALTER the original tables). Until then login, audit writes and several legacy-named queries fail on live. See `LIVE_DATABASE_FINDINGS.md`. |
| KI-09 | P1 | Marketplace/ads clients still fall back to simulated sessions/data when credentials are absent (Amazon even after a failed live login). Must become explicit sandbox mode or be removed. |
| KI-22 | P1 | RLS is implemented but disabled; the live connecting role `project_admin` has BYPASSRLS, so a separate restricted role is required (runbook §6). |
| KI-23 | P2 | ~580 handlers still read tenant/actor from headers/query with hard-coded fallbacks; safe only because middleware overwrites them. Migrate routers to `req.auth` and delete the fallbacks (`grep -rn "org-jyotsvan-corp" src/server`). |
| KI-24 | P2 | Legacy migrations insert demo data (and ran with skipped seeds in tolerant mode); production seeding must be separated from schema. |
| KI-25 | P2 | `roles.slug` is globally unique (blocks per-tenant role names); `users.email` is globally unique. |
| KI-11 | P2 | ~25 template-literal SQL strings (dynamic WHERE builders) not individually reviewed. |
| KI-26 | P2 | Rate limiting in memory (single instance). No Redis/job queue. |
| KI-15 | P2 | Single 4.2 MB frontend bundle; no code splitting. |
| KI-12 | P2 | Routers mounted at two URL prefixes (`/api/x` and `/api/integrations/x`). |
| KI-27 | P3 | Resolved: "integration not connected" now returns 409 `NOT_CONNECTED` (core/not-connected.ts). |
| KI-28 | P2 | Sensitive HR/partner personal data (PAN, UAN, bank account) stored in plain columns. |
| KI-29 | P2 | Meta OAuth flow is half-built: callback does not exchange the code, `state` is not signed/verified. |
| KI-30 | P3 | Backups/PITR/monitoring not provisioned. |
| KI-31 | P3 | Reports/`ModulePlaceholder` landing pages (`/operations`, `/distribution`) still placeholders. |
| KI-40 | P1 | **CRM migrations 0006/0007 are not applied to the live database.** Until a human runs `npm run db:migrate`, `/api/crm` fails there. |
| KI-41 | P2 | CRM e-mail/SMS/WhatsApp campaigns are queued only; no delivery provider. Sequences create owner tasks instead of sending. Documented in the UI. |
| KI-42 | P2 | CRM Meta/Google lead callbacks are protected by the shared `x-ingest-key`, not by provider signatures; Meta's id-only webhook (needs a Graph API fetch) is not handled. |
| KI-43 | P3 | CRM ticket escalation and sequence steps run when triggered (page load / button / `POST /api/crm/sequences/run-due`); there is no background scheduler yet. |
| KI-44 | P3 | CRM accounts/contacts/deals can be archived but not merged; only leads have merge. Only leads have import/export. |
| KI-45 | P3 | CRM `crm_pipeline_stages` deletion removes that stage's history rows (new_stage_id is RESTRICT); only possible when no deal currently sits in the stage. |
| — | — | **Not done at all (PRD):** accounting core (by instruction), e-invoice/e-way bill, WhatsApp, inbox, partner portals, rewards, franchise POS, MRP, HRMS statutory files, payroll PT/TDS correctness. See `PRD_GAP_ANALYSIS.md`. |

## Correction to earlier audit notes
- `docs/audit/04_SECURITY_AND_RISKS.md` H5 said no webhook HMAC verification existed. That was wrong: the Shopify and generic adapters verify HMAC, but skipped it when the header/secret was absent, and the raw body was never captured. Both are fixed.
