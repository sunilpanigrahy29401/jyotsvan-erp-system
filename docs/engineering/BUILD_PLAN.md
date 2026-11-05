# BUILD_PLAN (PRD-aligned)

Derived from PRD §9 phases, PRD_GAP_ANALYSIS.md, KNOWN_ISSUES.md. Nothing here is implemented yet. Effort sizes are rough T-shirt estimates for one small team, not commitments.

## Decisions needed before Phase 1 (recommendations in bold)
| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Keep/refactor/rewrite | (a) keep Express+`pg`+InsForge modular monolith and harden; (b) rewrite on NestJS+Prisma | **(a) Keep and refactor.** ~75k lines of server + 101k UI already cover operations/distribution/HRMS breadth; the missing pieces (auth, RLS, GL, jobs) are additive. Revisit only if InsForge limits RLS/session claims |
| D2 | Tenant model | keep `organization_id` as tenant key vs rename to `tenant_id` | **Keep `organization_id`**; document it as the PRD tenant. Add RLS keyed on `current_setting('app.tenant_id')` |
| D3 | ID type | keep text IDs vs UUID | **Keep text IDs** for existing tables; UUID/prefixed IDs for new ones; no mass rewrite |
| D4 | Inbox | integrate Chatwoot (PRD recommendation) vs build | **Integrate Chatwoot**, SSO + webhook link to CRM |
| D5 | Queue/events | BullMQ+Redis vs Postgres-based (pg-boss / outbox) | **Postgres outbox + pg-boss** first (no new infra); Redis later |
| D6 | GSP/IRP, WhatsApp BSP | per PRD §11 Q4/Q5 | **Needs client answer** — blocks e-invoice/e-way and WhatsApp |
| D7 | Migrations | keep boot-time vs runner | **Versioned runner, off boot path** (DATABASE_MIGRATIONS.md) |

## Phase map (PRD phase -> work, dependency, size)

### Phase 0 — Stabilise & decide (S)
Fix the 4 CRM type errors; remove or lock `/api/db/*` and health data endpoints; set `ENCRYPTION_SECRET` (fail-closed); enable DB TLS verification; verify live DB read-only and reconcile table inventory; add CI (`tsc`, build); add Vitest + supertest scaffolding; resolve doc contradictions (KI-13).

### Phase 1 — Foundation (L) — **hard dependency for all**
1. Server auth: validate InsForge JWT, build `req.auth {userId, tenantId, permissions, scopes}`; delete client-supplied tenant/actor inputs across all 30 routers.
2. `requirePermission` per route group using `navigation.ts`/PERMISSIONS mapping; data-scope (own/team/territory/branch/warehouse) and field-level hiding (cost, margin, salary).
3. PostgreSQL RLS on every `organization_id` table via a per-request tenant setting (transaction-scoped); isolation test suite.
4. Immutable audit service (single implementation replacing per-router copies): before/after, actor from session, append-only.
5. Migration runner + `schema_migrations`.
6. Generic approval/workflow engine (replace per-module ad-hoc), number-series service, notification service with channels (email/SMS/push/in-app), file/object storage service, outbox/event bus + job runner.
7. Platform/super-admin console and tenant onboarding wizard; per-tenant settings (branding, FY, number series, modules enabled).
8. Phone OTP, 2FA, session list, password policy.
Exit: cross-tenant read/write tests fail closed; unauthenticated calls 401; permission-denied 403 on all routers.

### Phase 2/3 — Core commerce & **Accounting core** (XL) — largest gap
1. Chart of accounts (Indian groups), cost/profit centres, vouchers (journal/contra/payment/receipt), **single posting engine** consuming domain events.
2. Auto-post sales invoices, purchase bills, payments, credit/debit notes, expenses, stock movements (valuation FIFO/WAC), payroll, expense claims, marketplace settlements.
3. Financial statements: TB, P&L, BS, cash flow, day book, ledgers, ageing; period lock; FY close; maker-checker.
4. GST: HSN/SAC master, place-of-supply, RCM, GSTR-1/3B data, 2A/2B recon, ITC; **e-invoice (IRN/QR) and e-way bill via GSP** (needs D6); TDS/TCS; bank accounts + statement import + reconciliation; UPI QR/payment links (Razorpay etc.).
5. Quotation→SO→challan→invoice completion, proforma, price lists/schemes engine, partial delivery/backorders, PDF/share; vendor bill + three-way match, RFQ, landed cost.
Depends on: Phase 1 (events, approvals, number series, auth).

### Phase 4 — Manufacturing (M)
MRP engine (demand→requirements→PRs/work orders), production planning/capacity, BMR/batch-packing records, cosmetics licence & label compliance, sun-infusion process steps, costing (standard/actual, yield, overhead) posting to GL, job work (ITC-04), maintenance, recall workflows. Largely extends existing formulation/production/batch/QC.

### Phase 5 — Partner network & portals (L)
Partner identity model (portal users linked to distributor/C&F/retailer/dealer), portal app (orders, bills, ledger, claims, rewards) as PWA, scheme/claim settlement->credit notes, **rewards/loyalty engine** (rules, tiers, expiry, liability accounting), field-sales PWA with offline sync + GPS/photo, partner scoring.
Depends on: Phase 1 identity/RBAC, Phase 2 ledger.

### Phase 6 — CRM & communications (L)
Fix/finish CRM (dedup, scoring, auto-assignment, SLAs, helpdesk/tickets, customer 360, sequences, consent/DPDP); IndiaMART/Meta/Google lead connectors; **WhatsApp Cloud API client** (templates, webhooks, automations, campaigns, opt-in) ; Chatwoot integration (D4); email providers + templates + bounce/unsub.

### Phase 7 — HRMS completion (M)
Statutory files (PF ECR, ESI, Form 16, 24Q, bank advice), F&F, gratuity, loans/advances, recruitment/ATS, geo-fence/selfie/biometric, training, accounting posting, incentive->payroll. Pending prompt in `public/assets/aistudio` should be re-validated against this plan.

### Phase 8 — Franchise (M)
POS (offline-capable), franchise inventory/stock requests, accounting-lite, royalty statements, customer loyalty. Depends on Phases 2, 5; decision on franchise books (PRD §11 Q3).

### Phase 9 — Integrations & analytics (L)
Replace simulated modes with real credential-gated clients plus explicit "sandbox" flag; settlement/payout reconciliation; shipping aggregators (Shiprocket/Delhivery: AWB, NDR/RTO, COD remittance); payment-gateway reconciliation; GA4/Search Console; report builder, scheduled reports, saved views, materialized views.

### Phase 10 — AI (M)
Server-side permission-aware data access for copilot, RAG chatbot over catalog/FAQ, OCR for bills, forecasting/anomalies, provider abstraction, cost controls, guardrails.

### Phase 11 — Hardening (M)
Performance (code splitting; 4.2 MB bundle), security review, UAT, data migration tooling (Tally/Excel), i18n (English+Hindi), observability, backups/PITR + restore tests, runbooks.

## Recommended sequencing
Phase 0 -> Phase 1 (blocks everything) -> accounting core (Phase 2/3) in parallel with Phase 4 enhancements -> Phase 5 -> Phase 6 -> Phase 7/8 -> Phase 9/10 -> Phase 11. Ship tenant-isolation and auth before any new feature work; do not build new modules on the current unauthenticated API.

## Per-phase definition of done (PRD §12)
Schema migrated + RLS + seeded; API documented/tested; UI with loading/empty/error states; RBAC enforced on API and UI; audit logs working; integrations tested in sandbox; no hard-coded secrets or mock data in production paths; dashboards on real data.

## Open client questions (PRD §11) that gate work
Q4 WhatsApp provider/numbers · Q5 GSP/IRP provider+budget (gates e-invoice/e-way) · Q3 franchise books · Q6 reward rules · Q8 module priority and go-live · Q1 migration sources (Tally/Excel/Shopify) · Q7 hosting/data residency (affects InsForge vs self-host).
