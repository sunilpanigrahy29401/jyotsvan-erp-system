# 05 — Gap Analysis vs PRD

Everything in `docs/PRD_Jyotsvan_ERP.md` that is missing or incomplete, by PRD section. Row detail and evidence: `02_FEATURE_COMPLETENESS_MATRIX.md`. "Fix" = what must be built; size S/M/L/XL.
Legend: **MISSING** (not found) · **STUB** (settings/field only) · **PARTIAL** · **WRONG** (exists but incorrect/unsafe).

## §2 Multi-tenancy
| Gap | State | Size |
|---|---|---|
| Database-level isolation (RLS) | MISSING | L |
| Tenant context derived from session (not client) | MISSING / WRONG | L (touches all routers) |
| Company = tenant with group structure, multiple GSTINs per branch | PARTIAL (branches; GSTIN per branch UNVERIFIED) | M |
| Platform super-admin console, plans/modules, impersonation (audited) | MISSING | L |
| Tenant onboarding wizard (profile, GST, opening balances, import masters, invite users) | MISSING | L |
| Per-tenant branding/domain, number series, FY, enabled modules | PARTIAL (settings in browser) | M |
| Inter-company, consolidated reporting, tenant export/backup | MISSING | L |

## §3–4 Users, security
| Gap | State | Size |
|---|---|---|
| Server-side authentication; phone OTP; Google login; 2FA; session list; password policy | MISSING / WRONG (login bypass) | L |
| Server-enforced RBAC; data-scope (own/team/territory/branch/warehouse); field-level permissions; permission templates | MISSING | XL |
| Configurable multi-level approval engine | PARTIAL (per-module) | L |
| Immutable audit with before/after | PARTIAL / WRONG | M |
| Maker-checker, period locking | MISSING | M (needs GL) |
| Encrypted secrets / vault per tenant | PARTIAL (AES vault, hard-coded key fallback) | S |
| Rate limiting, OWASP hygiene, DPDP consent/deletion | MISSING | M |

## §5.1 Finance & accounting
| Gap | State | Size |
|---|---|---|
| Chart of accounts, vouchers, double-entry ledger, **posting engine** | MISSING | XL |
| Auto-posting from sales, purchase, stock, payroll, expenses, marketplaces, rewards | MISSING | XL |
| TB, P&L, BS, cash-flow, day book, ledger, ratios, stock valuation reports, FY close | MISSING | L |
| E-invoice (IRN+QR) via GSP/IRP | STUB | L (provider-dependent) |
| E-way bill generate/cancel/update | STUB | L |
| GSTR-1/3B data, 2A/2B recon, ITC, RCM, composition, SEZ/export | MISSING | XL |
| HSN/SAC master + validation | WRONG/PARTIAL (fallback `HSN-8413`) | M |
| TDS/TCS (sections, deduct on payment, challans, 26Q/27Q, 26AS) | MISSING | L |
| Bank accounts, statement import, reconciliation, cheques, UPI/payment links | MISSING | L |
| Fixed assets & depreciation; budgeting; cash-flow projection | MISSING | L |
| Multi-currency & forex | MISSING | M |
| Tally export/import | MISSING | M |
| Scheme/trade-promotion & rewards-liability accounting | MISSING | L |

## §5.2 Sales
Quotation/proforma MISSING (M); automatic SO→invoice PARTIAL (M); scheme engine (BxGy, slabs, free goods) PARTIAL/UNVERIFIED (L); backorder/split PARTIAL (M); invoice PDF + WhatsApp/email share MISSING (M); recurring orders & reorder suggestions MISSING (M); beat/route depth PARTIAL (M); incentives MISSING (M); D2C RTO handling MISSING (M).

## §5.3 CRM
Fix 4 type errors (S). MISSING: IndiaMART/TradeIndia/JustDial connectors (M), dedup/scoring/auto-assign/SLA (M), email 2-way/sequences/tracking (L), calendar & click-to-call (M), quotation builder/e-sign (M), customer 360 (M), workflow automation (L), helpdesk/tickets/CSAT/KB (L), loyalty program (L), DPDP consent (S).

## §5.4 Manufacturing
MISSING: MRP/forecast planning (L), capacity & work centres (M), BMR/packing records + cosmetics licence/label compliance (M), sun-infusion step tracking (M), GS1/serialisation (M), job work + ITC-04 (L), preventive maintenance (M), OEE dashboards (S). PARTIAL: costing (no GL), QC deviation/CAPA depth (M).

## §5.5–5.6 Inventory, procurement
MISSING: barcode/mobile scanning (L), valuation method switch FIFO/WAC (M), franchise stock (M), RFQ + comparison (M), three-way match (M), **vendor bill & supplier payment** (L, needs GL), landed cost (M), blanket orders (S), vendor portal (L), import purchases/customs (M). Marketplace stock sync is simulated (M to make real).

## §5.7 HRMS
WRONG: professional tax flat ₹200 (state slabs needed, S–M); TDS manual (slab/old-new regime calc, M). MISSING: LWF, arrears, bonus, gratuity, F&F, Form 16/24Q, PF ECR & ESI files, bank transfer file (L); loans/advances & claims→accounting (M); recruitment/ATS (L); geo-fence/selfie/biometric attendance (M); training/assets/helpdesk (M); incentive→payroll (M).

## §5.8–5.10 Partners, portals, field
MISSING: **partner identity and portals** (L–XL), rewards engine (L), partner scoring/tiers (M), claim settlement→credit note (M), franchise POS (offline-capable) (XL), franchise accounting-lite and inventory (L), dealer type (S), field PWA with offline/GPS/photo/new-retailer KYC/TA claims (XL), territory-scoped access (needs RBAC data-scope).

## §5.11–5.13 Communications
WhatsApp Cloud API/BSP: templates, webhooks, automations, campaigns, bot builder, opt-in/out (XL). Omnichannel inbox via Chatwoot integration (L). Email/SMS/push channels, templates, bounce/unsub (L). Real-time notifications (websocket) (M).

## §5.14–5.18
AI: permission-aware data access (needs RBAC), RAG chatbot, OCR, forecasting, anomaly, provider abstraction, cost controls, **remove invented fallback data** (L total). Marketing: real connector verification (M), lead→revenue attribution via accounting (L), GA4/Search Console/LinkedIn etc. (M). Commerce: Amazon/Flipkart/Myntra order→sales-order conversion (M), settlement/payout posting (L), shipping aggregators + COD remittance (L), payment-gateway reconciliation (L), WooCommerce/Nykaa/JioMart/Meesho (M each). Dashboards: report builder, scheduled reports, saved views, role-based dashboards, materialised views (L). Platform: background jobs/queue, event bus, public REST API + keys + webhooks (M–L), custom fields/forms, workflow engine, import/export validator, number-series, print/PDF template engine, file storage, global search backend, i18n (English+Hindi) (XL combined).

## §8 Non-functional
Tests (>80% on tax/finance) MISSING (XL, ongoing) · CI/CD MISSING (S) · observability MISSING (M) · backups/PITR/restore tests UNVERIFIED (S–M) · performance: single 4.2 MB bundle, no server-side pagination audit (M) · data-migration tooling MISSING (L).
