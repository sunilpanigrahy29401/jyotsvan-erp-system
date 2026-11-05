# PRD_GAP_ANALYSIS

Target: `docs/PRD_Jyotsvan_ERP.md` (v1.0 draft). Current: commit `bb842e8` as audited in IMPLEMENTATION_STATUS.md.
Method: keyword/code probes over `src/` + the earlier audit. **"Not found" = no matching code located, not proof of absence; confirm with `graphify query` before building.** Nothing was runtime-verified.

Legend: **HAVE** (code present, unverified at runtime) · **PART** partially present · **STUB** config/catalog entry or field only, no working logic · **GAP** not found · **CONFLICT** present but contradicts the PRD.

## Cross-cutting (PRD §2, §4, §8) — Phase 1 is a hard dependency for everything
| PRD requirement | State | Evidence / gap |
|---|---|---|
| Tenant isolation at DB (RLS) **and** API | **GAP** | No RLS anywhere; API tenant is client-supplied (SECURITY_ARCHITECTURE S-2/S-4). `organization_id` exists on tables (equivalent to PRD `tenant_id`) |
| Multi-company group, super-admin console, tenant onboarding wizard, per-tenant branding/number series/FY | **GAP/PART** | organizations + branches tables exist; no platform console, wizard, or per-tenant number-series engine found |
| Inter-company, consolidated reporting, tenant export/backup | **GAP** | not found |
| RBAC (module→resource→action) | **PART** | roles/permissions/role_permissions seeded (333 codes per legacy docs, unverified); **no server enforcement** |
| Data-scope rules, field-level permissions, permission templates | **GAP** | not found |
| Approval workflows (configurable) | **PART** | per-module approvals (PO, leave, AI actions…); no generic engine |
| Auth: email/password | **PART** | InsForge login; Phone OTP / Google / 2FA / session list: **GAP** (no OTP/2FA server code) |
| Audit trail, immutable, before/after | **PART/CONFLICT** | `audit_logs` exists; actor client-supplied, mutable, before/after not systematic |
| Maker-checker, period locking | **GAP/PART** | `financial_settings` table only; no lock enforcement found |
| Rate limiting, secrets vault, OWASP hygiene | **CONFLICT** | no rate limit, hard-coded key fallback, unauth SQL endpoint |
| Background jobs/queues, event bus, public REST API + API keys, webhooks | **GAP/PART** | no queue; `api_key` appears only in integration config; webhook receivers exist for providers; no domain-event bus |
| i18n (English+Hindi), IST | **GAP** | formatting helpers only |
| Automated tests (>80% on finance/tax), CI, observability, backups/PITR | **GAP** | none |
| Data migration tools (Tally/Excel) | **GAP** | not found (only ad-hoc `scripts/*.cjs` DB seeders) |

## 5.1 Finance & Accounting
| Item | State |
|---|---|
| Invoices, items, payments, allocations, credit/debit notes, expenses, collections | **HAVE** (sub-ledger style, 18 tables) |
| GST amounts/rates on orders & invoices | **PART** (cgst/sgst rate logic in `finance-service`; HSN fields partly) |
| **Chart of accounts, double-entry ledger, vouchers/journal/contra, posting engine, trial balance, P&L, balance sheet, day book, cost/profit centres** | **GAP** — `finance_transactions` is not a general ledger. PRD §6 "single posting engine" does not exist |
| E-invoice (IRN/QR via IRP) | **STUB** — `InvoicePreparationService` builds a handoff payload only; no GSP/IRP client |
| E-way bill | **STUB** — `eWayBillNumber` stored as a field at dispatch; no generation/cancel/update API |
| GSTR-1/3B data, 2A/2B reconciliation, ITC | **GAP** |
| TDS/TCS (sections, challans, 26Q/27Q) | **GAP** (only TDS-on-salary in payroll) |
| Bank accounts/recon, cheque, UPI QR/payment links | **GAP** (Razorpay = catalog entry) |
| Fixed assets & depreciation, budgeting, cash-flow, multi-currency/forex, FY close | **GAP** |
| Rewards liability, scheme/trade-promotion accounting | **GAP** |

## 5.2 Sales & Order Management
HAVE: sales orders, returns, pricing service, credit service, fulfillment/dispatch, transport fields, retailer/distributor orders, sales targets (field-sales).
PART: price lists/schemes (some scheme/discount code), partial delivery (verify), territory/beat (present in field-sales/CF; depth unverified).
GAP/unverified: Quotation stage (single mention), proforma, packing slip, recurring orders & reorder suggestions per partner, invoice PDF/WhatsApp sharing, RTO handling, incentive calculation.

## 5.3 CRM
HAVE: leads/contacts/accounts/deals tables (19), pipeline stages, lead ingestion webhook (webform/Meta/Google/IndiaMART as a *source value*), 3 pipeline UI tabs. **BROKEN typecheck (KI-07).**
STUB/GAP: IndiaMART connector logic beyond webhook source tag, dedup/scoring/auto-assignment (partial: verify), email 2-way sync, sequences, calendar sync, click-to-call, helpdesk/ticketing/CSAT/KB (no ticket code), customer 360, workflow automation, loyalty program, DPDP consent tracking.

## 5.4 Manufacturing
HAVE: multi-level BOM/formulations with versions, production orders, batches/genealogy/expiry/FEFO, QC (inspections, parameters, templates, holds, COA wording present), scaling, material issue/return, recall UI hits.
GAP/unverified: MRP run (material requirement planning — no engine found), capacity/work centres/routing (minimal), BMR/batch packing record, cosmetics licence & label compliance, sun-infusion process steps, GS1/serialization, costing (some), subcontracting/job work (ITC-04), maintenance (minimal), OEE dashboards.

## 5.5 Inventory & Warehouse — **HAVE** (strong)
Ledger, reservations, multi-warehouse, bins, transfers, counts, reorder (hits), batch/expiry. GAP: barcode scanning mobile, valuation method selection (FIFO/WAC unverified), secondary-stock visibility partial (distributor-inventory-service exists), marketplace stock sync is simulated (see 5.16).

## 5.6 Procurement — **PART**
HAVE: suppliers, PO, GRN, QC-on-receipt, returns/approvals. GAP: RFQ/quotation comparison (0 hits), three-way match, blanket orders, landed cost, vendor portal.

## 5.7 HRMS — **PART** (best-covered non-core domain)
HAVE: employees, attendance, leave, holidays, shifts, payroll (EPF/ESI/PT/TDS monthly), payslips, performance, announcements, ESS UI, 24 tables. GAP: Form 16/24Q, PF ECR/ESI files, bank transfer files, F&F, gratuity, recruitment/ATS (minimal), loans/advances (verify), biometric, selfie/geo-fence attendance (verify), training, asset allocation, accounting integration (no GL).

## 5.8–5.10 Partners, Portals, Field Sales
HAVE: C&F, distributors, retailers (KYC/onboarding, hierarchy, credit, claims/transfers), field-sales module (beats, visits, collections, orders).
**GAP: partner self-service portals (no partner/portal login model at all), rewards/loyalty (0 hits), franchise POS/accounting-lite/inventory, dealer type, scheme-claim settlement to credit notes, mobile/PWA/offline field app (UI is desktop web; offline GAP).**

## 5.11–5.13 Communications
WhatsApp: **STUB** (provider catalog entry only; no Cloud API client, templates, webhooks, automations).
Omnichannel inbox / Chatwoot: **GAP** (no conversation model; AI chat history only).
Email/notification automation: **STUB/PART** (SMTP catalog entry; in-app notifications only; no email/SMS/push channels).

## 5.14 AI — **PART**
HAVE: Gemini copilot/insights/recommendations/human-in-the-loop actions, tool registry. GAP: customer chatbot (WhatsApp/web) with RAG, permission-aware data access (no server authz), OCR, forecasting/anomaly (basic insights only), model-provider abstraction, cost controls.

## 5.15–5.16 Marketing & Commerce
HAVE (code) / MOCK (behaviour): Meta Ads, Google Ads, Shopify, Amazon, Flipkart, Myntra clients + UIs + sync tables; ROAS/attribution analytics (11 server hits). Simulated fallbacks when credentials absent (KI-09). GAP: settlement/payout reconciliation to accounts (no GL), shipping aggregators (Shiprocket = catalog entry), payment-gateway reconciliation, GA4/Search Console/LinkedIn, lead-to-revenue attribution through accounting, Nykaa/JioMart/Meesho/WooCommerce.

## 5.17–5.18 Dashboards & Platform
PART: Command Center + analytics/reports (7 handlers), per-module dashboards in most UIs. GAP: report builder, scheduled report delivery, saved views, role-based dashboard visibility, materialized views; custom fields/forms, workflow engine, import/export validator, number series, template/print-format engine, global search (UI GlobalSearchModal exists; backend unverified), file storage service.

## §6 Interconnection (8 flows)
| Flow | State |
|---|---|
| 1 Lead→…→e-invoice→ledger→payment→rewards→360 | breaks at quotation(?), e-invoice, ledger, rewards, customer-360 |
| 2 Reorder/MRP→PR→PO→GRN→QC→stock→bill→payment | PART: no MRP engine, no vendor-bill/payment→GL |
| 3 Forecast→production plan→work order→batch→dispatch | PART: no forecast/MRP→plan |
| 4 Portal/field order→SO→WhatsApp confirm | field order HAVE; portal & WhatsApp GAP |
| 5 Marketplace order→SO→invoice→settlement | PART (simulated), settlement GAP |
| 6 Attendance→payroll→accounting; sales achievement→incentive→payroll | payroll HAVE; accounting/incentive GAP |
| 7 Inbox→CRM→order lookup→AI reply | GAP |
| 8 Ad spend+revenue→ROAS | PART |
No domain-event bus or posting engine exists, so cross-module flows are direct service/SQL calls.

## Strategic conflicts with the PRD
1. **No security foundation** — PRD Phase 1 (tenancy, auth, RBAC, audit) is only nominally built; everything else inherits the gap.
2. **No accounting core** — PRD §6 and §10 ("100% of sales/purchases/stock/payroll post to accounts") require a GL/posting engine that is absent; Phase 2/3 work depends on it.
3. **Prototype provenance** — AI-Studio origin: per-module placeholders, simulated integrations, text-ID schema, boot-time migrations.
4. **Stack**: PRD suggests NestJS/Next + Prisma + Redis + queues; current is Express + raw `pg` + InsForge. See BUILD_PLAN decision D1.
