# 06 — Keep / Refactor / Rewrite, and Target Architecture (Step 6)

## 1. Decision (plain language)
**Choose option (a′): extend this codebase, but rebuild its foundation first.** Not a restart, not "just keep going".

Why not restart (c)? There are ~105k lines of screens and ~79k lines of server logic for operations, distribution, sales and HR that already match the PRD shape (and have a consistent look). Re-creating them costs roughly 6–9 months of effort for work that is only unsafe at its edges (auth, tenancy), not in its core ideas.
Why not keep-as-is (a)? The base is unsafe (login bypass, no API auth, SQL endpoint), has no tests, and lacks the accounting core everything else must post into. Building more modules on top multiplies the rework.
Why not (b) "keep UI, new backend"? ~80% of the backend's domain logic (stock ledger, GRN posting, pricing/credit, batches, QC) is the valuable part; only the plumbing is wrong. A hybrid works: new secure core + migrate routers onto it module by module.

| Option | Time to PRD Phases 1–5 | Cost | Risk |
|---|---|---|---|
| (a) extend as-is | looks fast, then stalls | low now, high later | **very high** (security, correctness unknown) |
| **(a′) fix foundation, keep modules** | **9–14 months** (small team) | medium | **medium** (needs characterisation tests) |
| (b) new backend, keep UI | 12–16 months | high | medium-high (re-derive all logic) |
| (c) restart, reuse design only | 14–20 months | highest | medium (clean, but huge) |
(Rough ranges for a team of ~3–4 engineers; treat as order-of-magnitude, not quotes.)

## 2. Keep / refactor / rewrite
| Keep as is | Design system (`components/ui`, layout, tokens), page layouts, most module UIs (inventory, warehouse, procurement, QC, batches, formulations, production, C&F, distributors, retailers, sales orders, HR), stock-ledger service logic, pricing/credit services, BOM/batch/QC logic, provider-catalog idea |
|---|---|
| **Refactor** | All 30 routers → thin controllers on the new core (auth, validation, tenant context); services get explicit transactions + typed inputs; split 1,500–2,600-line services; consolidate `*Api.ts` into one typed client; replace hand-made routing with a router lib; code-split the bundle; one audit helper; org id constants; CRM wiring; finance invoice→GL posting hook; payroll statutory rules |
| **Rewrite** | Login/session (`services/auth.ts`), Settings persistence (`services/database.ts` → server), authorization, tenant/RLS layer, audit log, migration system (replace `runAllMigrations`), secrets handling, **accounting core (new)**, integration "sandbox" fallbacks (remove; real or explicit mock), AI tool fallbacks, event/outbox + job runner (new), demo seeding (move to a dev-only seed script) |
| **Do not touch yet** | integrations until the foundation + GL exist (they will post settlements/fees) |

## 3. Target architecture
**Principle:** one TypeScript codebase, modular monolith, strict module boundaries, everything tenant-scoped from the first line.

```mermaid
flowchart TB
  subgraph Clients
    WEB[Staff web app (React/Vite)]
    PWA[Partner portal + field-sales PWA]
    POS[Franchise POS PWA (offline)]
  end
  Clients --> GW[API gateway layer: HTTPS, rate limit, auth, tenant context, validation]
  subgraph MONO[Modular monolith (Node/TS)]
    CORE[core: auth, tenants, RBAC/ABAC, audit, approvals, number series, files, notifications]
    MDM[masters: parties, items, taxes, territories]
    INVm[inventory/warehouse]
    PUR[procurement]
    MFG[manufacturing/QC/batches]
    SAL[sales/distribution/partners/rewards]
    FINm[finance: GL posting engine, GST, TDS, bank]
    HR[hrms/payroll]
    CRMm[crm/helpdesk]
    COMM[comms: WhatsApp, email, inbox bridge]
    COM2[commerce + ads adapters]
    AIm[ai: permission-aware tools]
  end
  GW --> MONO
  MONO <--> PG[(PostgreSQL + RLS)]
  MONO --> OUTBOX[(Outbox events table)]
  OUTBOX --> JOBS[Job runner (pg-boss → BullMQ/Redis later)]
  JOBS --> FINm
  JOBS --> COMM
  JOBS --> COM2
  COMM <--> CW[Chatwoot (self-hosted)]
  MONO --> OBJ[(S3-compatible storage)]
  COM2 --> EXT[Shopify · Amazon · Flipkart · Meta · Google · GSP/IRP · WhatsApp · shipping · gateways]
```

### Stack — compare with PRD §7
| Concern | PRD suggestion | My recommendation | Reason |
|---|---|---|---|
| Frontend | Next.js/React + shadcn | **keep Vite + React**, add `react-router`, TanStack Query, code-splitting; PWA for portals via same codebase | existing 105k lines; Next adds migration cost without need (no SEO need for ERP) |
| Backend | NestJS or Django/FastAPI | **keep Node/TypeScript**; introduce NestJS-style module boundaries by folders; **Fastify or Express 5** with zod validation | avoids rewrite; same language end-to-end; NestJS is acceptable if you want enforced structure for new modules |
| DB access | Prisma/TypeORM | **Kysely or Drizzle** for new code (SQL-first, RLS-friendly), keep `pg` for legacy | Prisma + RLS needs extra work; existing code is raw SQL |
| Database | PostgreSQL + RLS | **same**; confirm whether InsForge allows custom RLS/roles and session settings, else move to plain managed Postgres | RLS is non-negotiable |
| Queue/events | BullMQ + Redis | **Postgres outbox + pg-boss first** (no new infra), BullMQ later | simplicity at current scale; transactional events |
| Auth | JWT/session + RBAC/ABAC | **keep InsForge Auth for identity only** (if it supports JWT verification server-side) **or** Auth.js/Keycloak/Supabase-style; permissions in your DB | identity ≠ authorisation |
| Search/analytics | PG FTS; ClickHouse later | same; materialised views for dashboards | |
| Files | S3-compatible | same | |
| DevOps | Docker, CI/CD, IaC | Docker, GitHub Actions, staging+prod, Sentry, pino logs, daily backups + restore drill | |

### Multi-tenancy design
1. Every business table has `tenant_id` (rename from `organization_id` in new tables; keep alias view for legacy during migration).
2. Request pipeline: verify JWT → load membership → `AsyncLocalStorage` context → each DB transaction runs `SET LOCAL app.tenant_id = $1` (+ `app.user_id`).
3. RLS on every tenant table: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`; app DB role is not table owner (so RLS cannot be bypassed); separate role for migrations/admin.
4. Automated test: for every table with `tenant_id`, prove tenant A cannot read/write tenant B (generated test).
5. Platform-admin operations use a distinct role + audited impersonation.

### RBAC / ABAC
Permission code = `module.resource.action` (e.g., `sales.order.approve`). Roles per tenant → permissions; **scopes** per assignment (`own|team|territory|branch|warehouse|all`) enforced in a shared query helper; **field-level** rules (cost price, margin, salary) via column masks in the serializer layer. Server middleware `requirePermission(code, scope?)`; UI hides, never decides.

### Event-driven connections
Domain events written to `outbox_events` in the same transaction as the business change (`invoice.posted`, `grn.received`, `payroll.approved`, `marketplace.settlement.imported`). Subscribers (accounting posting, notifications, WhatsApp, rewards, dashboards) run as idempotent jobs. **One posting engine** converts events to balanced journals (rejects debit≠credit; honours period lock).

### Background jobs & integrations
`pg-boss` queues: sync-shopify, poll-amazon, send-whatsapp, e-invoice-submit, bank-import, scheduled-reports, payroll-run. Each integration is an **adapter** (`connect/health/sync/webhook`) with retries, backoff, rate-limits, per-tenant encrypted credentials, explicit `mode: live|sandbox` shown in UI, signature-verified webhooks, and a delivery log. No silent simulation.

### Open-source acceleration (verify licences at adoption time)
| Project | Use | Licence implication (as I understand; **verify**) |
|---|---|---|
| **Chatwoot** | Omnichannel inbox (WhatsApp/IG/FB/email/web chat) | MIT for community edition; enterprise features under separate commercial licence. Self-host, integrate via API/webhooks/SSO — recommended |
| **ERPNext/Frappe** | **Reference only** for Indian GST, accounting, stock, HR/payroll logic | GPLv3: copying code into a proprietary product would force GPL obligations; study behaviour, re-implement, validate with test cases |
| **Odoo Community** | Reference for data models | LGPLv3 community; Enterprise is proprietary; same caution |
| **Twenty CRM** / SuiteCRM | CRM reference | AGPL / AGPL-style: network-use copyleft — avoid embedding |
| **Medusa / Saleor** | Headless commerce (if own D2C store needed) | MIT-style / BSD — check each |
| **Metabase / Superset** | BI | Metabase AGPL (embedding needs commercial licence); Superset Apache-2.0 |
| **pg-boss**, **zod**, **Kysely/Drizzle**, **Vitest**, **Playwright** | tooling | permissive (MIT/Apache) |
| GST/e-invoice | Use a **GSP** (ClearTax, Masters India, Cygnet etc.) rather than building IRP integration directly | commercial API fees |

## 4. Schema outline for the foundation (core entities and relations)
All tables: `id uuid pk`, `tenant_id` (where tenant-scoped), `created_at/by`, `updated_at/by`, `deleted_at` (soft delete where needed).
```
tenants(id, name, legal_name, status, plan, settings jsonb)
legal_entities(id, tenant_id, name, pan, cin, ...)            -- group structure
gst_registrations(id, tenant_id, legal_entity_id, gstin, state_code, ...)
branches(id, tenant_id, legal_entity_id, gst_registration_id, name, type)
users(id, identity_sub, email, phone, status)                  -- global identity
memberships(id, tenant_id, user_id, status, default_branch_id) -- user ↔ tenant
roles(id, tenant_id, name, is_system); permissions(code pk, module, resource, action)
role_permissions(role_id, permission_code, scope default 'all', field_rules jsonb)
membership_roles(membership_id, role_id, scope_type, scope_ref)
territories(id, tenant_id, parent_id, kind, name); territory_assignments(...)
parties(id, tenant_id, kind[customer|vendor|distributor|c_and_f|retailer|dealer|franchise|employee|lead], legal_name, gstin, pan, credit_limit, credit_days, status)
party_addresses(...), party_contacts(...), party_bank_accounts(...) -- encrypted fields
partner_accounts(id, tenant_id, party_id, user_id)             -- portal login link
items(id, tenant_id, type[rm|pm|wip|fg|service], sku, name, hsn_sac, tax_category, uom_id, shelf_life_days, ...)
item_variants(...), uoms(...), uom_conversions(...), tax_rates(...), hsn_master(...)
price_lists(...), price_list_items(...), schemes(...), scheme_rules(...)
warehouses(id, tenant_id, branch_id, ...), locations(...)
batches(id, tenant_id, item_id, batch_no, mfg_date, expiry_date, qc_status)
stock_ledger_entries(id, tenant_id, item_id, warehouse_id, location_id, batch_id, qty_in, qty_out, rate, value, voucher_type, voucher_id, posted_at)  -- append-only
stock_balances(materialised from ledger) ; stock_reservations(...)
accounts(id, tenant_id, code, name, type, group_id, is_control, party_kind)
account_groups(...) ; cost_centers(...) ; fiscal_years(...) ; accounting_periods(id, tenant_id, fiscal_year_id, status[open|closed])
vouchers(id, tenant_id, type, number, date, status, source_doc_type, source_doc_id, period_id, posted_by)
journal_lines(id, voucher_id, account_id, party_id, cost_center_id, debit, credit, currency, narration)  -- CHECK per voucher: Σdebit = Σcredit
documents(id, tenant_id, doc_type[quote|sales_order|delivery|invoice|purchase_order|grn|vendor_bill|credit_note|…], number, party_id, date, status, totals jsonb, tax_breakup jsonb, ...)
document_lines(id, document_id, item_id, qty, uom, rate, discount, tax_rate, hsn, amount ...)
document_links(from_doc, to_doc)                               -- quote→order→invoice trace
number_series(id, tenant_id, doc_type, prefix, fiscal_year, next_no)
approvals(id, tenant_id, doc_type, doc_id, step, approver, status); approval_policies(...)
audit_logs(id, tenant_id, actor_id, action, entity, entity_id, before jsonb, after jsonb, ip, at)  -- append-only, no UPDATE/DELETE grant
outbox_events(id, tenant_id, type, payload, created_at, processed_at); jobs (pg-boss schema)
files(id, tenant_id, key, mime, size, owner_ref)
integration_connections(id, tenant_id, provider, mode, credentials_encrypted, status) ; webhook_deliveries(...)
```
Migration path from today: keep legacy tables running; add `tenants` + mapping `organization_id → tenant_id`; introduce `parties` as a view/ETL over suppliers/distributors/retailers/customers; introduce GL and post new invoices/payments first; back-fill history only if accountants require it.

## 5. Recommended folder / module structure
```
/apps
  /api            src/{core,modules/<module>/{routes,service,repo,schema,events,tests}}, migrations/, seeds/dev-only/
  /web            staff app (feature folders mirror modules)
  /portal         partner + franchise PWA (can start inside /web with route guards)
/packages
  /ui             design system (from components/ui)
  /contracts      zod schemas + OpenAPI types shared by api/web
  /config         eslint, tsconfig, prettier
/docs/{adr,audit,engineering}   /infra (Docker, CI)   /scripts
```
Rule: modules talk through exported service interfaces and events only; no cross-module SQL.
