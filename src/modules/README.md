# Jyotsvan Domain Modules

This directory establishes the domain module boundaries for the modular monolith architecture.
Per Phase 1 architectural mandates, only the authentication foundation is active; subsequent business domains are scheduled for later development phases.

## Module Directory Structure & Planned Phase Mapping

| Module Directory | Planned Phase | Target Domain Responsibility |
| :--- | :--- | :--- |
| `/src/modules/auth/` | **Phase 1 (Active)** | InsForge Auth, session persistence, login flows, user profile modals. |
| `/src/modules/users/` | Phase 3 | User management, invitations, RBAC role assignment matrices. |
| `/src/modules/products/` | Phase 4 | Product master, SKU catalogs, variants, category taxonomies. |
| `/src/modules/inventory/` | Phase 4 | Stock registers, stock movements, bin tracking, valuation models. |
| `/src/modules/warehouse/` | Phase 4 | Depot facilities, storage zones, dock doors, transfer orders. |
| `/src/modules/procurement/` | Phase 5 | Purchase requisitions, RFQs, purchase orders (PO), Goods Receipt (GRN). |
| `/src/modules/manufacturing/`| Phase 6 | Bills of Materials (BOM), work orders, routings, batch blending. |
| `/src/modules/quality/` | Phase 6 | Inspection templates, quarantine holds, Certificate of Analysis (COA). |
| `/src/modules/distribution/` | Phase 7 | C&F agents, distributor networks, retailer registers, delivery beats. |
| `/src/modules/sales/` | Phase 7 & 8 | Sales orders, dispatch staging, field sales order booking. |
| `/src/modules/finance/` | Phase 8 & 11 | Invoicing, payments, accounts receivable (AR), general ledger (GL). |
| `/src/modules/staff/` | Phase 11 | Department master, employee rosters, plant shift scheduling, payroll. |
| `/src/modules/marketing/` | Phase 10 | Meta Ads & Google Ads API integrations, campaign ROAS analytics. |
| `/src/modules/commerce/` | Phase 9 | Shopify, Amazon, Flipkart, Myntra bidirectional stock & order bridges. |
| `/src/modules/analytics/` | Phase 10 & 11 | Enterprise telemetry, executive reports, custom pivot queries. |
| `/src/modules/integrations/` | Phase 8, 9, 10 | Secure server-side third-party platform API proxy handlers. |
| `/src/modules/notifications/`| Phase 2 | Real-time websocket & email/SMS alert dispatchers. |
| `/src/modules/ai/` | Phase 12 | Server-side Gemini AI copilot, demand prediction, anomaly algorithms. |
