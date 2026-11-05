# Product Requirements Document (PRD)
## Jyotsvan Unified Business Platform (Multi-Tenant ERP + CRM + HRMS + Omnichannel + Partner Portals)

| Item | Detail |
|---|---|
| Version | 1.0 (Draft) |
| Primary client | Jyotsvan (sun-infused hair oils, manufacturer + D2C brand) |
| Product type | Multi-tenant SaaS-style ERP platform, India-first |
| Status | An incomplete prototype exists (built in Google AI Studio). Its real state is UNKNOWN and must be audited first. |

> **How to use this document:** This PRD is the target ("what should exist"). Claude Code must first audit the existing codebase (see `CLAUDE_CODE_ANALYSIS_PROMPT.md`) and compare it against this PRD to produce a gap analysis and build plan. Where this PRD says "benchmark", the build team should study the named reference products and make sure the feature set is at least comparable.

---

## 1. Vision and Goals

Build ONE connected platform that runs Jyotsvan end to end: production, procurement, stock, sales, distribution, billing, GST compliance, accounting, HR, marketing, customer conversations, and analytics. Every module shares one data model, so a sale automatically updates stock, accounts, CRM, rewards, and dashboards.

**Goals**
1. Replace multiple separate tools (Tally/Zoho/Odoo-type ERP, CRM, HRMS, WhatsApp tools, Chatwoot-like inbox, BI dashboards) with one system.
2. Give every external partner (distributor, C&F, retailer, franchise, dealer) a self-service portal.
3. Give field staff a mobile-friendly way to take orders on behalf of partners.
4. Be **multi-tenant from day one**, so new companies can be added later with fully isolated data and their own settings.
5. Be fully compliant with Indian accounting and tax rules (GST, e-invoice, e-way bill, TDS, etc.).
6. Be AI-ready (chatbot, insights, automation).

**Non-goals (for now):** Building a general-purpose public marketplace; supporting non-Indian tax regimes (design for extensibility, but do not build now).

---

## 2. Multi-Tenancy Requirements

- **Tenant = Company (legal entity).** One platform account can hold multiple companies (group structure).
- **Isolation:** Every table carries `tenant_id` (company id). Enforce isolation at the database layer (e.g., PostgreSQL Row-Level Security) AND in the API layer. No query may run without a tenant context.
- **Per-tenant configuration:** branding (logo, colors, domain), GSTIN(s), financial year, chart of accounts, number series (invoice/PO/SO), tax settings, currency, modules enabled, integrations (WhatsApp, Shopify, ads accounts, email), roles.
- **Branches / warehouses / plants** under each tenant, each possibly with its own GSTIN (state-wise registration).
- **Super Admin (platform owner)** console: create/suspend tenants, assign plans/modules, view usage, impersonate for support (audited).
- **Tenant onboarding wizard:** company profile, GST details, opening balances, import masters (items, parties), invite users.
- **Optional inter-company transactions** (sale from Company A to Company B with auto-mirrored purchase) and consolidated group reporting.
- **Data export / backup** per tenant.

---

## 3. User Types and Portals

| Persona | Access | Notes |
|---|---|---|
| Platform Super Admin | Tenant management | Not a Jyotsvan employee necessarily |
| Company Admin / Owner | Everything within tenant | |
| Finance / Accounts team | Finance, billing, reports | |
| Sales / Marketing / Support team | CRM, inbox, campaigns | |
| Production / Store / Procurement staff | Manufacturing, inventory, purchase | |
| HR | HRMS | |
| Field Sales Staff (territory-based) | Mobile-first app/PWA, only assigned territory and partners | Can place orders on behalf of partners |
| Distributor | Partner portal | Orders, past orders, bills, ledger, rewards, schemes |
| C&F Agent | Partner portal | Stock received, dispatches to distributors, ledger |
| Retailer | Partner portal | Order, history, bills, rewards |
| Dealer | Partner portal | Same as retailer, different pricing/schemes |
| Franchise | Extended portal | Above plus POS, own inventory, own accounting, reports |
| End customer (D2C) | Optional customer account | Orders, loyalty, support |

---

## 4. Roles, Permissions and Security (cross-cutting, mandatory)

- **RBAC with granular permissions:** module → resource → action (view / create / edit / delete / approve / export / print).
- **Custom roles** creatable per tenant; **permission templates** per persona.
- **Data-scope rules:** own records only, team, territory, branch, warehouse, all.
- **Field-level permissions** (e.g., hide cost price, margin, salary).
- **Approval workflows** (configurable multi-level): discounts, credit limit override, PO, expense, leave, journal entry, price change.
- **Authentication:** email/password, phone OTP, optional Google login, 2FA, session management, password policy, device/session list.
- **Audit trail:** who changed what and when (before/after values) for all financial and master data; immutable logs.
- **Security:** encrypted secrets, no API keys in frontend code, rate limiting, input validation, OWASP Top 10 hygiene, backups, GDPR/India DPDP-style consent and data-deletion support.
- **Maker-checker** on sensitive financial actions; **period locking** for closed accounting periods.

---

## 5. Core Modules and Required Features

> Each module below lists the minimum feature set. "Benchmarks" are products whose feature lists the team should study and match (selectively, in priority order).

### 5.1 Finance and Accounting (India-specific)
*Benchmarks: Tally Prime, Zoho Books, ERPNext Accounts, Busy, Odoo Accounting.*

- Chart of accounts (Indian standard groups), multi-company, multi-branch, cost centers, profit centers.
- Double-entry ledger, journal, contra, payment and receipt vouchers, debit/credit notes, opening balances.
- Sales and purchase accounting auto-posted from transactions; party ledgers; outstanding receivables and payables; ageing reports; credit limits and credit days.
- Bank accounts, cheque management, bank reconciliation (statement import CSV/PDF/API), payment links and UPI QR on invoices.
- **GST:** GST-compliant tax invoices, bill of supply, HSN/SAC, CGST/SGST/IGST/Cess, reverse charge, composition handling, place-of-supply logic, GSTR-1, GSTR-3B data, GSTR-2A/2B reconciliation, ITC tracking, **e-invoicing (IRN + QR via IRP)**, **e-way bill generation/cancel/update** (via GSP API), credit/debit notes under GST.
- **TDS/TCS:** sections, rates, deduction on payments, challan tracking, Form 26Q/27Q data, 26AS reconciliation.
- Fixed assets with depreciation (Companies Act and IT Act), asset register.
- Expense management and claims; petty cash.
- Budgeting and forecasting; cash flow projections.
- Financial statements: Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book, Ledger, Group summary, Stock valuation, Ratio analysis. Financial-year closing and carry-forward.
- Multi-currency support (for exports), forex gain/loss.
- Audit trail, period lock, auditor access role, Tally data export/import.
- Rewards/loyalty liability accounting (points issued/redeemed).
- Scheme/discount and trade-promotion accounting (claims, settlement, credit notes to partners).

### 5.2 Sales, Billing and Order Management
*Benchmarks: Zoho Inventory/Books, Odoo Sales, ERPNext Selling, Vyapar, Marg.*

- Lead → Quotation → Sales Order → Delivery/Dispatch → Invoice → Payment → Return flow, fully linked.
- Price lists (by partner type, region, quantity), tiered discounts, schemes (buy X get Y, slab, free goods, cash discount), MRP vs. PTR/PTS/PTD handling.
- Credit limit checks and blocks, order approval flow.
- Partial delivery, backorders, order splitting across warehouses.
- Sales returns, replacement, damage/expiry returns with credit note.
- Invoice templates (customizable), PDF generation, share via WhatsApp/email, bulk invoicing.
- Proforma invoice, delivery challan, packing slip, transport details, LR number, courier tracking.
- Recurring orders; reorder suggestions per partner from history.
- Territory and route management; beat plans.
- Sales targets and achievements by person/territory/product; incentive calculation.
- Returns and RTO handling for D2C orders.

### 5.3 CRM
*Benchmarks: Zoho CRM, HubSpot, LeadSquared, Freshsales, Pipedrive, Odoo CRM.*

- Leads, contacts, accounts, deals/opportunities, with custom fields and custom pipelines/stages.
- **Lead capture & import:** web forms, Meta Lead Ads, Google Ads leads, **IndiaMART lead import (API/CRM-push, email parsing, CSV)**, TradeIndia/JustDial (optional), WhatsApp, manual, CSV/Excel.
- Lead deduplication, scoring, auto-assignment (round-robin, territory, load-based), SLA timers, reassignments.
- Activities: tasks, calls (click-to-call, call logging), meetings, notes, reminders, calendar sync (Google/Outlook).
- Email integration (2-way sync), templates, tracking (open/click), sequences/drip campaigns.
- WhatsApp and SMS campaigns from CRM; segmentation; audience lists.
- Quotation builder tied to product master and price lists; e-signature (optional).
- Customer 360 view: orders, invoices, payments, tickets, conversations, rewards, activities in one place.
- Pipeline kanban, forecasting, win/loss analysis, funnel reports.
- Workflow automation (if X then Y), assignment rules, webhooks.
- Helpdesk/ticketing: SLA, categories, escalation, CSAT, knowledge base.
- Partner (B2B) CRM: onboarding of distributors/retailers with KYC, documents, visit logs.
- Field visit tracking: check-in/out with GPS and photo, visit reports, route adherence.
- Loyalty/rewards program management (points rules, tiers, redemption, expiry).
- Duplicate merge, import/export, GDPR/DPDP consent tracking, unsubscribe handling.

### 5.4 Manufacturing / Production
*Benchmarks: ERPNext Manufacturing, Odoo MRP, Katana, Fishbowl, cosmetics-specific batch systems.*

- Bill of Materials (multi-level), formulations/recipes with versioning (hair-oil formulas: base oils, herbs, fragrance, sun-infusion process), co-products and by-products, scrap.
- Production planning: MRP (material requirement planning), demand forecast-based planning, production schedule, capacity planning, work centers/machines.
- Work orders / production orders, job cards, shop-floor entry, material issue and consumption (backflush option), finished goods receipt.
- **Batch/lot tracking with full traceability** (raw material lot → batch → finished goods → customer), manufacturing date, expiry date, shelf life, FEFO dispatch, near-expiry alerts, recall management.
- **Quality control:** incoming QC (RM/packaging), in-process QC, final QC, test parameters, COA, hold/release/reject, deviation and CAPA logs.
- **Regulatory records for cosmetics (India):** cosmetics license details, batch manufacturing record (BMR), batch packing record, label compliance fields (MRP, net qty, batch no., mfg/expiry, ingredient list), documents repository.
- Sun-infusion process tracking (e.g., start/end dates, duration, location/tank, conditions) as configurable process steps.
- Packaging: primary/secondary/tertiary, barcode/QR/GS1 label generation, serialization.
- Costing: standard vs actual cost, yield and wastage tracking, cost per batch/unit, overhead allocation.
- Subcontracting / job work (with GST challan flow, Form ITC-04 data).
- Maintenance management (preventive schedules, downtime).
- Production dashboards: output, yield, wastage, OEE-lite, pending orders.

### 5.5 Inventory and Warehouse
*Benchmarks: Zoho Inventory, Odoo Inventory, ERPNext Stock, Unicommerce (for marketplace flows).*

- Item master (RM, packaging, WIP, FG, services), variants (size/fragrance), UoM conversions, HSN, MRP, barcodes, images.
- Multi-warehouse, bins/locations, transfers, stock adjustments, physical stock count, cycle count.
- Real-time stock, reserved stock, in-transit stock, stock by batch/expiry, reorder levels and auto-suggested purchase requests.
- GRN, QC at receipt, putaway, picklist, packing, dispatch; barcode scanning (mobile).
- Valuation methods (FIFO / weighted average), stock ledger, ageing, dead stock, ABC analysis.
- Stock at distributors/C&F/franchise visible (secondary stock tracking) and secondary-sales reporting.
- Marketplace inventory sync (Amazon, Flipkart, Shopify) with channel-wise allocation.

### 5.6 Procurement / Purchase
- Vendor master with KYC, GSTIN validation, ratings, payment terms.
- Purchase requisition → RFQ → vendor quotation comparison → Purchase Order → GRN → Purchase Invoice/Bill → Payment, with three-way match.
- Approval workflows, blanket orders, price agreements, landed cost, purchase returns and debit notes.
- Vendor portal (optional, phase 3), vendor performance reports, import purchases (customs, forex).
- Auto-generated PRs from MRP and reorder levels.

### 5.7 HRMS (full)
*Benchmarks: Keka, greytHR, Zoho People/Payroll, Darwinbox, ERPNext HR.*

- Employee master, org chart, documents, onboarding/offboarding checklists, probation, confirmation.
- **Attendance:** web/mobile check-in, GPS/geo-fence, selfie, biometric device integration, shifts, rosters, overtime, regularization.
- **Leave:** policies, accrual, carry forward, holidays calendar, approvals.
- **Payroll (India):** salary structures, CTC breakup, PF, ESI, Professional Tax (state-wise), LWF, TDS on salary (old/new regime), arrears, bonus, gratuity, F&F settlement, payslips, bank transfer files, Form 16, Form 24Q data, PF ECR/ESI files.
- Loans and advances, reimbursements and expense claims (linked to accounting).
- Recruitment/ATS: job openings, candidates, interview scheduling, offers, offer letters.
- Performance: goals/OKRs, KPIs, appraisal cycles, 360 feedback.
- Field staff features: territory assignment, daily visit plan, travel allowance (km-based), incentives tied to sales targets.
- Training and learning, asset allocation (laptops, phones), helpdesk, announcements, policies with acknowledgment.
- Employee self-service (ESS) and manager self-service (MSS) portals/mobile.
- HR analytics: headcount, attrition, attendance, payroll cost.

### 5.8 Partner Network Management (Distributors, C&F, Retailers, Dealers, Franchises)
- Partner hierarchy: Company → C&F → Distributor → Retailer (and Dealer, Franchise as parallel types). Territory/region/state/district/pin mapping.
- Onboarding with KYC, agreements, security deposit, credit terms, bank and GST details, approval workflow.
- Partner-specific price lists, schemes, margins, credit limits, and payment terms.
- Claims and settlements (scheme claims, damage claims, expiry claims), ledger and statement.
- Primary sales (company → distributor), secondary sales (distributor → retailer), tertiary (retailer → consumer, if captured). Secondary stock/sale reporting.
- Partner performance scoring, target vs achievement, tier classification, rewards.
- Territory assignment of field staff to partners; visit scheduling.

### 5.9 Partner Self-Service Portals (own dashboards)
**Common to all partner types:**
- Login (own credentials, OTP), profile and documents, dashboard with KPIs.
- Place orders (catalog, cart, reorder from history, scheme visibility, credit limit display), order tracking.
- Past orders, invoices/bills (download PDF), payments, ledger/statement, outstanding, credit notes, returns/claims requests.
- **Reward points:** balance, earn/redeem history, tiers, catalog of rewards.
- Relationship view: agreement, schemes, targets, communications, support tickets.
- Notifications (WhatsApp/email/in-app), announcements, marketing collateral download.

**Franchise-specific (extended):**
- **POS** (counter billing, barcode scan, GST invoice, returns, multiple payment modes, hold/resume, offline-capable), daily cash closing.
- Own inventory and stock requests to company, expiry tracking.
- **Accounting lite:** sales, purchases, expenses, ledger, P&L, GST reports for the franchise unit.
- Customer database and loyalty at franchise level, staff management and attendance (optional), reports and royalty/commission statements.

### 5.10 Field Sales (mobile-first PWA / app)
- View only assigned territory, distributors and retailers; beat/route plans and visit schedule.
- Check-in/out with GPS and photo; visit notes; competitor info; stock and merchandising audit at outlet.
- **Place orders on behalf of distributors/retailers** (with credit check, schemes), collect payments (record/UPI link), capture return requests.
- New retailer onboarding with KYC from the field; lead capture.
- Offline mode with sync; targets/achievement; incentive view; expense/TA claims; leave and attendance.

### 5.11 WhatsApp Business Platform Integration
- Official WhatsApp Business Cloud API (or via BSP such as Gupshup/Twilio/360dialog/Interakt); multi-number per tenant.
- Template management (create, submit, approval status), session and template messages, media, interactive messages (buttons, lists), catalog messages.
- **Automations:** order confirmation, invoice/e-way bill share, payment reminders, dispatch/tracking updates, abandoned cart, reward-point updates, birthday/festival offers, lead follow-ups.
- Broadcast/campaigns with segmentation, scheduling, throttling, opt-in/opt-out compliance, delivery/read analytics.
- Chatbot flows (visual flow builder) and AI-assisted replies; human handoff.
- Conversation linked to CRM contact, order, ticket.

### 5.12 Unified Omnichannel Inbox (Chatwoot-like)
*Benchmark: Chatwoot (open source). Decision to make: **integrate Chatwoot as-is (self-hosted, embedded/SSO)** vs. **rebuild**. Recommended: integrate Chatwoot first for speed, with deep CRM linking via its APIs/webhooks, then evaluate native rebuild.*

- Channels: WhatsApp, Instagram DMs and comments, Facebook Messenger and comments, Meta ad (click-to-message) conversations, website live chat, email, SMS, Telegram (optional), Google Business Messages (if available), X/Twitter (optional).
- Shared team inbox, assignment, teams, labels, canned responses, internal notes, @mentions, snooze, priorities, SLAs, CSAT, working hours, auto-assignment, macros.
- Contact profiles merged with CRM, conversation history, custom attributes, automation rules, bots, webhooks.
- Reports: response time, resolution time, agent performance, channel volume.
- Ad-conversation attribution (which campaign/ad started the chat).

### 5.13 Email and Notification Automation
- SMTP/API providers (SES, SendGrid, Mailgun, Zoho), per-tenant domains (SPF/DKIM), templates with variables, scheduling.
- Event-triggered emails (invoice, order status, payment due, welcome, low stock alerts internal), drip sequences, newsletters.
- Notification center: email, WhatsApp, SMS, push, in-app, with user preferences.
- Bounce/unsubscribe handling, delivery logs.

### 5.14 AI Features
- **AI chatbot** for customers (WhatsApp/website): product Q&A (RAG over catalog, FAQ, policies), order status lookup, lead qualification, handoff to human.
- **Internal AI assistant:** natural-language questions over business data ("sales of South zone last month vs. before"), with strict permission-aware data access.
- AI helpers: reply suggestions in inbox, conversation summaries, lead scoring, sentiment, auto-tagging, invoice/bill OCR and data extraction, demand forecasting, reorder suggestions, anomaly detection (fraud, unusual discounts), churn prediction for partners.
- Guardrails: tenant isolation in prompts/retrieval, PII handling, logging, cost controls, model-provider abstraction (Gemini/Claude/OpenAI swappable), human-in-the-loop for actions.

### 5.15 Marketing and Ads Analytics
- Connectors: Meta Ads, Google Ads, (optional: YouTube, LinkedIn, Snapchat, Pinterest, Google Analytics 4, Search Console, influencer/affiliate sources).
- Unified dashboard: spend, impressions, clicks, CTR, CPC, CPL, conversions, ROAS, by campaign/adset/ad/channel/date; blended CAC and ROAS combining ads cost with real revenue from the ERP/ecommerce data.
- Lead-to-revenue attribution (ad → lead → order), UTM tracking, creative performance, budget pacing, alerts.
- Campaign calendar and budget vs. actual (linked to finance).

### 5.16 E-commerce and Marketplace Integration
- Connectors: **Shopify** (orders, products, customers, inventory, fulfillment, returns), **Amazon Seller Central (SP-API)**, **Flipkart Seller API**, optionally Myntra, Nykaa, JioMart, Meesho, own website (WooCommerce).
- Order sync → ERP sales orders → invoicing and stock deduction; inventory push to channels; settlement/payout reconciliation with accounting (fees, commissions, TCS, returns).
- Shipping aggregators (Shiprocket, Delhivery, etc.): rate, label, AWB, tracking, NDR/RTO, COD remittance reconciliation.
- Unified ecommerce dashboard: GMV, orders, AOV, returns/RTO %, channel-wise and SKU-wise performance, geography, cohort/LTV, repeat rate.
- Payment gateway reconciliation (Razorpay, PayU, Cashfree).

### 5.17 Dashboards and Analytics Module
- Separate dashboards per domain: Executive/CEO, Sales, Finance, Inventory, Manufacturing, Procurement, HR, CRM and Leads, Partner/Distribution, Field Force, Marketing/Ads, Ecommerce, Support/Inbox, Franchise.
- Features: configurable widgets, filters (date, region, product, partner, channel), drill-down, comparisons, scheduled report emails/WhatsApp, export (PDF/Excel), saved views, role-based dashboard visibility, user-built custom dashboards and report builder.
- Real-time or near-real-time data; pre-aggregated tables/materialized views for performance.

### 5.18 Platform and Settings
- Master data (items, categories, brands, UoM, taxes, price lists, territories, parties).
- Number series, templates (invoice/PO/quotation/email/WhatsApp), print formats.
- Import/export (CSV/Excel) with validation and error reports; bulk operations.
- Custom fields and forms; workflow engine; webhooks and public REST API with API keys; global search; notifications; file storage; localization (English + Hindi minimum; add others later); timezone and date formats (IST default).
- Background jobs/queues, scheduled tasks, activity feed, in-app help.

---

## 6. Module Interconnection (critical requirement)

All modules must share data and trigger each other. Minimum flows:

1. Lead (CRM/IndiaMART/Meta) → Customer → Quotation → Sales Order → Stock reservation → Dispatch → E-invoice and e-way bill → Ledger posting → Payment → Reward points → Customer 360 and dashboards.
2. Reorder level or MRP → Purchase Requisition → PO → GRN → QC → Stock → Vendor bill → Payment.
3. Sales forecast/orders → Production plan → Work order → Material issue → FG batch → Stock → Dispatch.
4. Partner portal or field-staff order → Sales order (same pipeline as above) → WhatsApp confirmation.
5. Marketplace/Shopify order → Sales order → Stock → Invoice → Settlement reconciliation in Accounts.
6. Attendance/leave → Payroll → Accounting entries; Sales achievement → Incentive → Payroll.
7. Inbox conversation → CRM contact/lead/ticket → Order lookup → AI reply.
8. Ad spend + revenue → Marketing ROAS dashboard.

Implementation guidance: shared Party/Contact model, a single Item/Stock ledger, event bus (domain events) for cross-module triggers, and a single posting engine for accounting.

---

## 7. Recommended Technical Direction

> The existing prototype's actual stack is unknown. The audit must record it. If the prototype is a frontend-only AI Studio export (often React + Vite with mock data, localStorage, and API keys in client code), treat it as a **UI prototype** and plan a proper backend.

Suggested target architecture (adjust after audit):
- **Frontend:** React/Next.js + TypeScript, component library (shadcn/ui or similar), PWA for field staff and partner portals; React Native/Flutter later if needed.
- **Backend:** Modular monolith first (NestJS/Node + TypeScript, or Django/FastAPI), clear module boundaries, REST (plus WebSockets for real-time), OpenAPI docs.
- **Database:** PostgreSQL with Row-Level Security for multi-tenancy; migrations (Prisma/TypeORM/Alembic); Redis for cache and queues; object storage (S3-compatible) for files.
- **Jobs and events:** BullMQ/Celery for background jobs, webhooks, sync, scheduled tasks.
- **Search and analytics:** PostgreSQL full text first; consider ClickHouse/materialized views for heavy analytics later.
- **Integrations layer:** isolated adapters per external system (GSP/IRP, WhatsApp, Meta, Google, Shopify, Amazon, Flipkart, IndiaMART, shipping, payment gateways), with retry, rate limiting, credential vault per tenant.
- **Auth:** JWT/session with refresh, RBAC/ABAC policy layer, optional SSO.
- **DevOps:** Docker, CI/CD, environments (dev/staging/prod), automated tests, monitoring (logs, metrics, error tracking), backups, infrastructure as code.
- **Open-source references to learn from (not necessarily to fork):** ERPNext/Frappe (accounting, stock, manufacturing, HR, India GST localization), Odoo Community (modules and data model), Chatwoot (inbox), Twenty CRM / SuiteCRM (CRM), Medusa/Saleor (commerce), Metabase/Superset (BI). Check licenses (GPL/AGPL implications) before copying code.

---

## 8. Non-Functional Requirements

- **Performance:** typical page under 2s; lists paginated server-side; handle at least 100 concurrent users per tenant initially with a path to scale.
- **Reliability:** daily automated backups, point-in-time recovery, documented restore tests.
- **Security:** see Section 4. Secrets in environment/vault only.
- **Compliance:** GST, e-invoice rules, Companies Act books, DPDP Act, data retention policy.
- **Auditability:** every financial posting traceable to a source document.
- **Usability:** responsive, mobile-friendly, keyboard shortcuts for accounting/POS, bilingual-ready.
- **Maintainability:** typed code, linting, test coverage targets (critical financial and tax logic above 80%), documentation, ADRs.
- **Observability:** structured logs, tracing, alerting on failed integrations and jobs.
- **Data migration:** import tools for existing Jyotsvan data (Tally/Excel masters, opening balances, open invoices, stock).

---

## 9. Suggested Delivery Phases

| Phase | Scope |
|---|---|
| 0 | Audit existing code, decide keep/refactor/rewrite, finalize stack, set up repo, CI/CD, environments |
| 1 – Foundation | Multi-tenancy, auth, RBAC, audit log, masters (items, parties, territories, taxes), settings, notification and file services |
| 2 – Core commerce | Inventory, purchase, sales (quote → order → invoice), GST invoice, payments, basic accounting posting |
| 3 – Accounting and compliance | Full accounting, reports, e-invoice, e-way bill, GST returns data, TDS, bank reconciliation |
| 4 – Manufacturing | BOM, production orders, batch/expiry, QC, costing |
| 5 – Partner network | Partner hierarchy, price lists, schemes, partner portals, rewards, field-staff ordering |
| 6 – CRM and communications | CRM, IndiaMART/Meta lead import, WhatsApp API, inbox (Chatwoot integration), email automation |
| 7 – HRMS | Employees, attendance, leave, payroll, statutory compliance, ESS |
| 8 – Franchise | POS, franchise accounting, franchise inventory |
| 9 – Integrations and analytics | Shopify/Amazon/Flipkart, ads connectors, unified dashboards, report builder |
| 10 – AI | Chatbot, assistant, OCR, forecasting, insights |
| 11 – Hardening | Performance, security review, UAT, data migration, training, go-live |

(Phases can overlap; Phase 1 is a hard dependency for everything.)

---

## 10. Success Metrics (examples)
- 100% of sales, purchases, stock moves and payroll post to accounts automatically with zero orphan entries.
- Invoice to e-invoice/e-way bill success rate above 99%.
- Partner portal adoption: share of orders placed via portal/field app vs. manual.
- Reduction in month-end closing time; stock accuracy above 98%.
- Average first-response time in inbox; lead response time.
- Dashboard load time under 3s.

---

## 11. Open Questions for the Client (Jyotsvan)
1. Current systems in use (Tally? Excel? Shopify?) and data to migrate.
2. Number of users per role, number of plants/warehouses/GSTINs now and expected in 2 years.
3. Do franchises need their own separate legal-entity books or lite books under the parent tenant?
4. WhatsApp provider preference (direct Cloud API or a BSP) and existing numbers.
5. GSP/IRP provider for e-invoice and e-way bill (e.g., ClearTax, Masters India, Cygnet) and API budget.
6. Reward-point rules (earn per rupee, per SKU, tiers, expiry, redemption catalog).
7. Hosting preference (cloud region in India, budget) and data residency needs.
8. Priority order of modules and the target go-live date for first release.
9. Biometric or POS hardware in use (devices, printers, scanners).
10. Whether future tenants will be internal group companies only or external customers (affects billing/plan features).

---

## 12. Definition of Done (per module)
- Feature set covers this PRD's list (or documented deviations).
- Database schema migrated, seeded, and tenant-isolated.
- API documented and tested; UI complete with loading, empty, and error states.
- RBAC enforced on API and UI; audit logs working.
- Integrations tested against sandbox and production-like credentials.
- Automated tests passing; no hard-coded secrets or mock data in production paths.
- Dashboards reflect real data; seed/demo data available for testing.
