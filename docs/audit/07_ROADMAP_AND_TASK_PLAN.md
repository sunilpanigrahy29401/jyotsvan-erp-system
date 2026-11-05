# 07 — Roadmap and Task Plan (Step 7)

Sizes: S ≤ 2 days · M ≤ 1–2 weeks · L ≤ 1 month · XL > 1 month (one engineer). Effort assumes ~3–4 engineers; calendar estimates are rough. Each phase has **exit criteria** that must be demonstrated, not claimed.

## Phase 0 — Stop the bleeding & decide (1–2 weeks)
Goal: nothing dangerous is reachable; repo builds clean; decisions made.
Exit: `/api/db/*` gone; login fallback gone; `tsc` 0 errors; CI green; test DB reproducible.
| Epic | Tasks | Size | Risk |
|---|---|---|---|
| Lock-down | remove `POST /api/db/query`, `ALL /api/db/init`, public health dumps | S | none |
| | remove login fallback + email-based super-admin (`auth.ts`) — temporarily require InsForge session; | M | breaks dev logins; provide seeded dev users |
| | `envPrefix`/`define` fix in `vite.config.ts`; require `ENCRYPTION_SECRET`; enable TLS verify | S | config on host |
| Hygiene | fix 4 CRM type errors; remove unused deps; rename package; fix `org-jyotsvan-core` vs `corp` | S | tenant data cleanup needed |
| | stop boot-time migrations in production; add `SEED_DEMO` flag | S | |
| Tooling | GitHub Actions: install, `tsc`, build; add Vitest, Playwright skeleton; Dockerfile + compose (api, web, postgres) | M | |
| Verify | on a **copy** of the database: list tables vs `01b`, row counts, find demo rows; written decision on InsForge vs plain Postgres | M | real data unknown |

## Phase 1 — Foundation (6–8 weeks) — hard dependency for everything
Exit: unauthenticated call → 401; wrong tenant → empty/403; permission denied → 403 on every router; RLS tests pass for all tenant tables; audit entries show real actor.
| Epic | Tasks | Size | Risk |
|---|---|---|---|
| Identity & session | server JWT verification middleware; `req.auth`; refresh/expiry; phone OTP + 2FA (later in phase); session list | L | InsForge API limits |
| Tenancy | tenant context (AsyncLocalStorage), `SET LOCAL` per transaction, RLS policies for 202 tables (script-generated), non-owner app role, generated cross-tenant tests | XL | legacy queries without org filter; performance |
| RBAC | permission catalogue reconcile (127 vs 333 codes), `requirePermission` on all routers by module, data-scope helper, field masks (cost, salary, PAN) | XL | touches ~700 endpoints; do module by module |
| Settings to server | org/branch/dept/user/role/unit/business-settings APIs + UI wiring; delete `DatabaseService` localStorage | L | UI regressions |
| Audit | single append-only service with before/after; replace ~30 helpers; DB grants prevent update/delete | M | |
| Platform services | migration runner + `schema_migrations`; number-series service; approval engine; file storage; notification channels (email first); outbox + pg-boss | XL | |
| Platform admin | super-admin console, tenant create/suspend, onboarding wizard v1 | L | |
| Validation & errors | zod at API boundary (start with write endpoints), error handler, request IDs, pino logging, helmet, rate-limit | L | |
| Characterisation tests | snapshot key service behaviours (stock posting, pricing, credit) before refactor | L | prevents silent regressions |

## Phase 2 — Core commerce + accounting core (8–12 weeks)
Exit: every invoice/payment/credit note/stock receipt posts a **balanced** voucher; TB balances; a day-book for any date matches sub-ledgers.
| Epic | Tasks | Size | Risk |
|---|---|---|---|
| Chart of accounts | Indian standard groups, per-tenant COA, cost/profit centres, fiscal years, periods | L | accountant sign-off needed |
| Posting engine | vouchers + journal_lines with Σdr=Σcr constraint; event subscribers; idempotency; period lock; maker-checker | XL | correctness critical |
| Wire sources | sales invoice, payment/receipt, credit/debit note, GRN/vendor bill, stock adjustments, expenses | XL | |
| Sales completion | quotation, proforma, SO→delivery→invoice conversion, PDF + share, recurring orders | L | |
| Purchase completion | vendor bill, supplier payment, three-way match, RFQ, landed cost | L | |
| Statements | TB, P&L, BS, day book, party ledgers, ageing | L | |
| HSN/tax master | HSN/SAC master, tax rate rules, rounding rules, tests with GST scenarios (intra/inter-state, RCM, discounts) | M | |
| Bank | accounts, statement import (CSV), reconciliation | L | |
| Data | opening-balance import, Tally/Excel masters import | L | messy source data |

## Phase 3 — Compliance (6–8 weeks, needs GSP decision)
Exit: e-invoice IRN+QR on test GSTIN in sandbox; e-way bill generated; GSTR-1/3B data matches books for a sample month.
Tasks: GSP adapter (e-invoice, e-way) L · GSTR-1/3B data XL · 2A/2B recon + ITC L · TDS/TCS module L · e-invoice cancel/credit-note flows M · compliance dashboards M. Risk: provider onboarding time/fees.

## Phase 4 — Manufacturing depth (4–6 weeks)
MRP/planning L · BMR/packing records + licence/label compliance M · sun-infusion process steps M · costing → GL M · job work/ITC-04 L · maintenance M · barcode/GS1 labels M. Exit: plan→work order→batch with cost posted and BMR printable.

## Phase 5 — Partner network & portals (8–10 weeks)
Partner identity (`partner_accounts`) M · portal PWA (orders, bills, ledger, claims) XL · schemes engine L · claim settlement → credit note M · rewards engine L (needs rules) · field-sales PWA with offline, GPS/photo, retailer KYC XL · territory-scoped access M. Exit: a distributor places an order in the portal that flows to invoice and ledger with scoped data only.

## Phase 6 — CRM & communications (8–10 weeks)
CRM cleanup + dedup/scoring/assignment M · IndiaMART/Meta/Google connectors M · helpdesk/tickets L · WhatsApp Cloud API/BSP adapter + templates + automations XL · Chatwoot deployment + SSO + CRM link L · email provider + templates + bounce handling L · DPDP consent M.

## Phase 7 — HRMS completion (6–8 weeks)
Statutory fixes (PT slabs, TDS calc old/new regime, LWF, arrears, bonus, gratuity, F&F) L · PF ECR/ESI/Form 16/24Q/bank files L · loans/claims → GL M · recruitment L · geo/selfie/biometric M · incentive → payroll M. Exit: parallel payroll run matches your current payroll for 2 months.

## Phase 8 — Franchise (6–8 weeks): POS (offline) XL · franchise inventory/stock requests L · accounting-lite L · royalty statements M.

## Phase 9 — Integrations & analytics (8–10 weeks)
Make integrations real or remove: Shopify L · Amazon L · Flipkart L · marketplace→SO conversion M · settlements → GL L · shipping aggregators + COD L · payment-gateway recon L · Meta/Google token verification M · report builder + schedules L · materialised views M.

## Phase 10 — AI (4–6 weeks): permission-aware tools M · remove invented data S · RAG chatbot L · OCR L · forecasting M · provider abstraction + cost caps M.

## Phase 11 — Hardening (4–6 weeks): performance & code-split M · security review (external pen-test) M · UAT L · data migration rehearsal L · i18n Hindi M · backups/PITR drill S · runbooks S.

## Database schema plan → see `06_RECOMMENDED_ARCHITECTURE.md §4`. Folder structure → `§5`.

## Quick wins — first week (no design decisions needed)
1. Delete `/api/db/query`, `/api/db/init`; protect/remove health dumps. 2. Remove `INSFORGE_` from Vite `envPrefix`, delete DB-URL `define`. 3. Require `ENCRYPTION_SECRET`; stop using the built-in key. 4. Turn on DB TLS verification. 5. Fix 4 CRM type errors. 6. Remove login fallback & email→super-admin rule. 7. Remove unused deps; rename package; add `.nvmrc`. 8. Disable auto-migrate in production; add `SEED_DEMO`. 9. Add CI (typecheck+build). 10. Replace AI/tool hard-coded revenue with "no data". 11. Unify `org-jyotsvan-core/corp`. 12. Add this audit's `CLAUDE.proposed.md` as `CLAUDE.md` rules.

## Testing strategy
- **Unit (Vitest):** tax engine (intra/inter-state, rounding, discounts, RCM), pricing/credit, stock valuation (FIFO/WAC), payroll (PF cap, ESI threshold, PT per state, TDS slabs), voucher balancing (property tests: Σdr=Σcr). Target >80% on tax/finance/payroll.
- **Integration (Vitest + Postgres container):** every migration on empty DB twice; repository + RLS tests (cross-tenant matrix generated from table list); outbox → posting idempotency.
- **API contract (supertest):** per route 401/403/200, tenant scoping, validation errors.
- **E2E (Playwright):** the 6 flows in `03` (lead→cash, PO→pay, production→stock, partner order→invoice→WhatsApp, attendance→payroll→GL, e-commerce→settlement). Run on every PR for smoke subset, nightly for full.
- **Security:** dependency audit in CI, secret scanning, SAST, DAST against staging; periodic pen-test.
- **Data quality:** nightly reconciliation checks (sub-ledger = GL control account; stock ledger = balances).

## CI/CD & environments
GitHub Actions: lint+`tsc` → unit → integration (service Postgres) → build → Docker image → deploy. Environments: `dev` (local compose), `staging` (own DB, sandbox provider keys, anonymised data), `prod` (India region, backups + PITR, restore drill monthly). Secrets in a vault/host secret store, never in repo. Feature flags for unfinished modules. Migrations run as a separate release step with approval. Observability: structured logs, error tracking (Sentry), uptime + queue-failure alerts.

## Working with Claude Code in later phases
See `CLAUDE.proposed.md`. Habits: one module/epic per branch; plan → small PRs (<400 lines) → each with tests; always `graphify query` before editing shared code; update `docs/adr/` for decisions; never let an agent touch prod DB; read-only audit mode for investigations; commit docs with the code that changes them.
