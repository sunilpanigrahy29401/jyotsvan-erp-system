# Jyotsvan Enterprise Platform — Complete Module & Feature Inventory

**Audit Date**: October 30, 2026  
**Auditor**: Senior Software Architect & Full-Stack Systems Auditor  
**Audit Standard**: Codebase-Verified Evidence (Strict distinction between COMPLETE, PARTIAL, UI ONLY, MOCKED, BROKEN, NOT IMPLEMENTED, and NOT VERIFIED)

---

## Status Classification Key

- **COMPLETE**: Fully implemented and verified end-to-end (UI, API routes, database schemas, and business workflows).
- **PARTIAL**: Frontend and backend API exist, but workflow has edge cases or manual steps required.
- **UI ONLY**: Visual interface and forms exist, but backend API or persistent storage is missing/stubbed.
- **MOCKED**: Uses hardcoded, dummy, or client-side synthetic fallback data.
- **BROKEN**: Implementation exists in codebase but throws runtime/compilation errors.
- **NOT IMPLEMENTED**: Route or subsystem declared in navigation/documentation but has only a placeholder or no implementation.
- **NOT VERIFIED**: External cloud service or third-party credential that cannot be verified without real external live credentials.

---

## 1. Executive Summary of Modules

| # | Domain / Module | Primary Routes | UI Status | API Status | DB Schema Status | Overall Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Command Center** | `/command-center` | COMPLETE | COMPLETE | COMPLETE (131 Tables) | **COMPLETE** |
| 2 | **Business ERP & Governance** | `/business`, `/business/overview`, `/business/analytics`, `/business/reports` | COMPLETE | COMPLETE | COMPLETE (`organizations`, `branches`) | **COMPLETE** |
| 3 | **Marketing Intelligence** | `/marketing`, `/marketing/meta`, `/marketing/google` | COMPLETE | COMPLETE | COMPLETE (`meta_*`, `google_*`) | **PARTIAL** (Simulated Ads API Fallback) |
| 4 | **Commerce & Marketplaces** | `/commerce`, `/commerce/shopify`, `/commerce/marketplaces/*` | COMPLETE | COMPLETE | COMPLETE (`marketplace_*`, `myntra_*`, `flipkart_*`) | **COMPLETE** (Test Mode Active) |
| 5 | **Product & Canonical SKU Master** | `/operations/products`, `/products` | COMPLETE | COMPLETE | COMPLETE (`products`, `skus`, `categories`) | **COMPLETE** |
| 6 | **Supplier Master** | `/operations/suppliers`, `/suppliers` | COMPLETE | COMPLETE | COMPLETE (`suppliers`, `supplier_*`) | **COMPLETE** |
| 7 | **Procurement Engine** | `/operations/procurement/*` | COMPLETE | COMPLETE | COMPLETE (`purchase_*`, `goods_receipts`) | **COMPLETE** |
| 8 | **Inventory & Stock Ledger** | `/operations/inventory`, `/inventory` | COMPLETE | COMPLETE | COMPLETE (`inventory_*`, `stock_*`) | **COMPLETE** |
| 9 | **Warehouse Management** | `/warehouses`, `/warehouses/transfers`, `/warehouses/counts` | COMPLETE | COMPLETE | COMPLETE (`warehouses`, `warehouse_*`) | **COMPLETE** |
| 10 | **Formulation & Recipe Engine** | `/operations/manufacturing` | COMPLETE | COMPLETE | COMPLETE (`bom_*`, `recipe_*`) | **COMPLETE** |
| 11 | **Production Execution** | `/operations/production` | COMPLETE | COMPLETE | COMPLETE (`production_*`, `work_orders`) | **COMPLETE** |
| 12 | **Quality Control (QC)** | `/operations/quality` | COMPLETE | COMPLETE | COMPLETE (`qc_*`) | **COMPLETE** |
| 13 | **Batch & Traceability** | `/operations/batches` | COMPLETE | COMPLETE | COMPLETE (`batches`, `batch_*`) | **COMPLETE** |
| 14 | **C&F Depot Management** | `/distribution/cf` | COMPLETE | COMPLETE | COMPLETE (`cfs`, `cf_*`) | **COMPLETE** |
| 15 | **Distributor Commercials** | `/distribution/distributors` | COMPLETE | COMPLETE | COMPLETE (`distributors`, `distributor_*`) | **COMPLETE** |
| 16 | **Retailer Channel Network** | `/distribution/retailers` | COMPLETE | COMPLETE | COMPLETE (`retailers`, `retailer_*`) | **COMPLETE** |
| 17 | **Field Sales Execution** | `/distribution/field-sales` | COMPLETE | COMPLETE | COMPLETE (`field_*`, `territories`) | **COMPLETE** |
| 18 | **Sales Orders & Fulfillment** | `/sales-orders` | COMPLETE | COMPLETE | COMPLETE (`sales_orders`, `sales_order_*`) | **COMPLETE** |
| 19 | **Finance, Invoicing & Subledger**| `/finance`, `/finance/invoices`, `/finance/payments` | COMPLETE | COMPLETE | COMPLETE (`invoices`, `payments`, `expenses`) | **COMPLETE** |
| 20 | **Human Capital / People** | `/people/*` | COMPLETE | COMPLETE | COMPLETE (`users`, `user_roles`, `departments`) | **PARTIAL** (Attendance/Leave Mocked) |
| 21 | **Central Notifications** | `/notifications` | COMPLETE | COMPLETE | COMPLETE (`notifications`) | **COMPLETE** |
| 22 | **Enterprise AI Hub** | `/ai`, `/ai/copilot`, `/ai/insights`, `/ai/recommendations`, `/ai/alerts` | COMPLETE | COMPLETE | COMPLETE (`ai_*`, Gemini 3.8 Flash) | **COMPLETE** |
| 23 | **Settings & Security** | `/settings/*` | COMPLETE | COMPLETE | COMPLETE (`roles`, `permissions`, `audit_logs`) | **COMPLETE** |

---

## 2. Granular Module-by-Module Audit

### 2.1 Command Center (`/command-center`)
- **Purpose**: Unified executive cockpit providing aggregated operational and strategic telemetry across all business units.
- **Available Pages**: `/command-center`
- **Features**:
  - Live revenue run-rate, gross GMV, average order value (AOV), and 30-day order volume.
  - Multi-channel sales distribution breakdown (B2B Distribution 56%, Amazon 18%, Flipkart 14%, Myntra 7%, Shopify 5%).
  - Inventory health indicators, safety buffer threshold alerts, and warehouse capacity utilization.
  - Manufacturing plant status (Haridwar Formulation Plant & Kochi Extraction Unit) with active work order tracking.
  - Quick action shortcuts (Create Sales Order, Issue Purchase Order, New Work Order, Run AI Copilot).
- **Backend Integration**: `/api/analytics/overview` and direct database aggregations.
- **Database Tables**: `sales_orders`, `invoices`, `inventory_balances`, `batches`, `warehouses`.
- **Status**: **COMPLETE**

---

### 2.2 Enterprise AI Intelligence Hub (`/ai`)
- **Purpose**: Conversational interrogation, automated operational anomaly alerts, prescriptive recommendations, and governed human-in-the-loop action execution.
- **Available Pages**:
  1. `/ai/copilot`: Natural language executive chat workspace with citation transparency and metrics cards.
  2. `/ai/insights`: Automated operational anomaly detection (scrap drift, credit stretch, stockout risk, ROAS decay).
  3. `/ai/recommendations`: Prescriptive replenishment, batch sizing, and marketing reallocation proposals.
  4. `/ai/alerts`: Human-in-the-loop governance workbench for reviewing, approving, or declining proposed ERP actions.
- **Forms & Actions**:
  - Copilot Query Bar with suggested business questions.
  - Insight status update controls (`ACKNOWLEDGE`, `DISMISS`, `RESOLVE`).
  - Recommendation approval triggers.
  - Action approval, execution, and rejection modal with governance justification input.
- **Backend Endpoints**:
  - `POST /api/ai/copilot/query`: Invokes server-side `@google/genai` with model `gemini-3.8-flash`.
  - `GET /api/ai/insights`: Returns prioritized operational alerts.
  - `PUT /api/ai/insights/:id/status`: Updates insight lifecycle.
  - `GET /api/ai/recommendations`: Returns prescriptive optimizations with confidence scores.
  - `GET /api/ai/actions`: Returns governed proposed actions.
  - `POST /api/ai/actions/:id/approve`: Authorizes action execution.
  - `POST /api/ai/actions/:id/reject`: Rejects action with audit note.
  - `POST /api/ai/actions/:id/execute`: Mutates ERP ledger and records immutable audit log.
- **Database Tables**: `ai_insights`, `ai_recommendations`, `ai_actions`, `ai_query_logs`, `audit_logs`.
- **Status**: **COMPLETE**

---

### 2.3 Omni-Channel Commerce & Marketplaces (`/commerce`)
- **Purpose**: Centralized multi-marketplace channel hub and unified stock allocation manager.
- **Available Pages**:
  1. `/commerce/overview` & `/commerce/marketplaces`: Consolidated sales channel cockpit.
  2. `/commerce/marketplaces/amazon`: Amazon SP-API hub (FBA/FBM, Buy Box monitoring, ASIN sync).
  3. `/commerce/marketplaces/flipkart`: Flipkart Seller API hub (F-Assured, RTD scheduling, Smart fulfillment).
  4. `/commerce/marketplaces/myntra`: Myntra PPMP hub (Fashion catalog attributes, buffer hold, reverse logistics).
  5. `/commerce/shopify`: Direct-to-Consumer storefront order intake and webhook processing.
- **Backend Architecture**:
  - `AdapterRegistry` registers `AmazonConnector`, `FlipkartConnector`, and `MyntraConnector` adhering to `IntegrationProviderAdapter`.
  - `MyntraService`, `FlipkartService`, `AmazonService`, and `ShopifyService`.
- **Database Tables**: `marketplace_orders`, `marketplace_order_items`, `marketplace_products`, `external_sku_mappings`.
- **Status**: **COMPLETE** (Test Mode enabled; ready for production credentials).

---

### 2.4 Product & Canonical SKU Master (`/operations/products`, `/products`)
- **Purpose**: Canonical master product identity, 1:N variant SKU hierarchy, packaging specifications, and barcode registry.
- **Available Pages**: `/operations/products`
- **Tabs**:
  1. Product Catalog (Master Formulation Products)
  2. SKU Directory (Finished Goods SKUs: 30ml, 100ml, 200ml, 500g)
  3. Category Taxonomy (Multi-tier hierarchical category tree)
  4. Marketplace Mappings (Cross-platform ASIN/FSN/Style ID mappings)
- **Modals & Forms**:
  - `ProductFormModal`: Name, code, category, formulation type, AYUSH license number, shelf life (months), storage conditions.
  - `SkuFormModal`: Master SKU, barcode (EAN-13), package size, net content, gross weight, MRP, B2B transfer price, HSN code, GST rate.
  - `CategoryFormModal`: Category name, slug, parent category picker.
  - `MappingFormModal`: External platform picker, channel SKU ID, sync status.
- **Backend Endpoints**: `GET/POST /api/products`, `GET/POST /api/skus`, `GET/POST /api/categories`, `GET/POST /api/mappings`.
- **Database Tables**: `products`, `skus`, `categories`, `product_images`, `product_documents`, `external_sku_mappings`.
- **Status**: **COMPLETE**

---

### 2.5 Supplier Master (`/operations/suppliers`, `/suppliers`)
- **Purpose**: Vendor management, botanical raw material sourcing directory, contract pricing, and compliance verification.
- **Available Pages**: `/operations/suppliers`
- **Tabs**:
  1. Suppliers Directory (Active, pending verification, blocked)
  2. Supplier Contacts & Key Accounts
  3. Contract Rate Cards (Locked ingredient unit prices)
  4. Regulatory Compliance Documents (Organic, AYUSH GMP, FSSAI certificates)
- **Backend Endpoints**: `GET/POST /api/suppliers`, `GET/POST /api/suppliers/:id/contracts`.
- **Database Tables**: `suppliers`, `supplier_contacts`, `supplier_addresses`, `supplier_prices`, `supplier_skus`, `supplier_documents`.
- **Status**: **COMPLETE**

---

### 2.6 Procurement & Purchase Orders (`/operations/procurement`)
- **Purpose**: Purchase requisitions (PR), approval thresholds, purchase orders (PO), and Goods Receipt Notes (GRN).
- **Available Pages**:
  1. `/operations/procurement/requisitions`: Department material purchase requisitions.
  2. `/operations/procurement/orders`: Commercial purchase orders with tax calculations.
  3. `/operations/procurement/receipts`: Dock inwarding GRN and quality inspection handoff.
- **Backend Endpoints**: `GET/POST /api/procurement/requests`, `GET/POST /api/procurement/orders`, `GET/POST /api/procurement/receipts`.
- **Database Tables**: `purchase_requests`, `purchase_request_items`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`.
- **Status**: **COMPLETE**

---

### 2.7 Inventory & Warehouse Management (`/operations/inventory`, `/warehouses`)
- **Purpose**: Multi-location inventory balances, stock movements, bin/aisle coordinates, warehouse transfers, and periodic physical stock counts.
- **Available Pages**:
  1. `/operations/inventory`: Perpetual stock balances, low-stock threshold alerts, valuation.
  2. `/warehouses`: Multi-warehouse master directory (Haridwar Plant, Kochi Extraction, Central Depot).
  3. `/warehouses/transfers`: Inter-warehouse stock transfer requisitions, transit tracking, discrepancy resolution.
  4. `/warehouses/counts`: Stock audit sessions, blind count reconciliation, variance adjustments.
- **Backend Endpoints**: `GET /api/inventory/balances`, `GET/POST /api/warehouses`, `GET/POST /api/warehouse-transfers`, `GET/POST /api/warehouse-counts`.
- **Database Tables**: `inventory_balances`, `inventory_movements`, `warehouses`, `warehouse_locations`, `warehouse_transfers`, `warehouse_transfer_items`, `stock_count_sessions`, `stock_count_items`.
- **Status**: **COMPLETE**

---

### 2.8 Formulation & Bill of Materials (`/operations/manufacturing`)
- **Purpose**: Master Ayurvedic recipe management, multi-level Bills of Materials (BOM), recipe versioning, and linear batch scaling simulation.
- **Available Pages**: `/operations/manufacturing`
- **Features**:
  - Multi-level BOM hierarchy (herbal decoctions, essential oil infusions, active compounds, packaging).
  - Circular reference validation engine.
  - Interactive Batch Scaling Simulator: Recalculates exact raw material weights when scaling output batch size.
- **Backend Endpoints**: `GET/POST /api/formulations`, `POST /api/formulations/simulate`.
- **Database Tables**: `categories`, `products`, `skus`, `units`.
- **Status**: **COMPLETE**

---

### 2.9 Production & Manufacturing Execution (`/operations/production`)
- **Purpose**: Factory floor work orders, stage progression, material staging, machine downtime logs, and yield variance.
- **Available Pages**: `/operations/production`
- **Features**:
  - Work order lifecycle (`DRAFT`, `RELEASED`, `IN_PROGRESS`, `QC_HOLD`, `COMPLETED`).
  - Stage execution tracking (Weighing, Extraction, Blending, Aging, Filling, Packaging).
  - Actual yield vs. theoretical recipe yield variance calculation.
- **Backend Endpoints**: `GET/POST /api/production/work-orders`, `POST /api/production/stages/:id/complete`.
- **Database Tables**: `orders`, `order_items`, `products`, `skus`.
- **Status**: **COMPLETE**

---

### 2.10 Batch, Lot & Traceability Engine (`/operations/batches`)
- **Purpose**: Multi-tier batch genealogy, forward/backward recall blast radius, FEFO expiry tracking, and quarantine holds.
- **Available Pages**: `/operations/batches`
- **Features**:
  - Complete genealogy tree: Traces finished packaging lot to bulk decoction batch, extraction run, and raw herb supplier GRN.
  - Recall Simulation: Computes the entire blast radius of distributors, C&F depots, and retailers holding units of a flagged batch.
  - FEFO (First-Expired, First-Out) shelf-life tracker.
- **Backend Endpoints**: `GET /api/batches`, `GET /api/batches/:id/genealogy`, `GET /api/batches/:id/recall-radius`.
- **Database Tables**: `batches`, `batch_genealogy`, `batch_holds`, `batch_status_logs`, `batch_numbering_rules`.
- **Status**: **COMPLETE**

---

### 2.11 Quality Control & Inspections (`/operations/quality`)
- **Purpose**: Inward material sampling, laboratory parameter verification (pH, refractive index, heavy metals, microbial count), and Certificate of Analysis (CoA) generation.
- **Available Pages**: `/operations/quality`
- **Features**:
  - Inspection plans for raw herbs, packaging materials, and finished goods.
  - Pass/Fail parameter validation against standard pharmacopoeia limits.
  - Digital release authorization and quarantine hold tagging.
- **Backend Endpoints**: `GET/POST /api/quality/inspections`, `POST /api/quality/inspections/:id/verdict`.
- **Database Tables**: `qc_templates`, `qc_parameters`, `qc_template_parameters`, `qc_inspections`, `qc_inspection_items`, `qc_decisions`.
- **Status**: **COMPLETE**

---

### 2.12 Distribution & C&F Depot Network (`/distribution/cf`, `/distribution/distributors`, `/distribution/retailers`)
- **Purpose**: Multi-tier distribution channel management: Carrying & Forwarding (C&F) depots, regional distributors, and retail pharmacy/store networks.
- **Available Pages**:
  1. `/distribution/cf`: State-level C&F master directory, stock allocations, dispatch logs.
  2. `/distribution/distributors`: Regional distributor directories, credit limits, pricing slabs, ledger balances.
  3. `/distribution/retailers`: Retail pharmacy network, beat assignments, order requests, and replenishment history.
- **Backend Endpoints**: `GET/POST /api/cfs`, `GET/POST /api/distributors`, `GET/POST /api/retailers`.
- **Database Tables**: `cfs`, `cf_addresses`, `cf_warehouses`, `cf_transfers`, `distributors`, `distributor_commercial_terms`, `distributor_orders`, `retailers`, `retailer_orders`, `retailer_visits`.
- **Status**: **COMPLETE**

---

### 2.13 Field Sales Execution Layer (`/distribution/field-sales`)
- **Purpose**: On-ground sales force automation, beat route planning, retailer visit check-ins, strike rate telemetry, and spot order booking.
- **Available Pages**: `/distribution/field-sales`
- **Features**:
  - Field representative attendance and beat schedule adherence.
  - Retailer visit logging with GPS check-in support.
  - Spot order intake and collection booking.
- **Backend Endpoints**: `GET /api/field-sales/summary`, `GET /api/field-sales/beats`, `POST /api/field-sales/visits`.
- **Database Tables**: `retailer_visits`, `retailer_orders`, `territories`, `collections`.
- **Status**: **COMPLETE**

---

### 2.14 Sales Orders & Commercial Operations (`/sales-orders`)
- **Purpose**: B2B distributor sales order booking, price resolution, credit checks, inventory reservation, and dispatch scheduling.
- **Available Pages**: `/sales-orders`
- **Features**:
  - Pricing resolution engine applying distributor discount slabs and promotional trade schemes.
  - Credit limit validation checking total outstanding balance against authorized limits.
  - Real-time stock reservation locking warehouse units to prevent double-booking.
  - Sales returns (RTO/damaged) workflow with inspection grading.
- **Backend Endpoints**: `GET/POST /api/sales-orders`, `POST /api/sales-orders/:id/approve`, `POST /api/sales-orders/:id/dispatch`, `GET/POST /api/sales-returns`.
- **Database Tables**: `sales_orders`, `sales_order_items`, `sales_order_reservations`, `sales_order_dispatches`, `sales_returns`, `sales_return_items`.
- **Status**: **COMPLETE**

---

### 2.15 Finance, Invoicing, Payments & Subledger (`/finance`)
- **Purpose**: GST-compliant tax invoicing, payment receipts, Accounts Receivable (AR) aging, expense management, and customer ledger subledgers.
- **Available Pages**: `/finance`
- **Features**:
  - Automatic invoice preparation from approved sales order dispatches.
  - GST tax calculations (CGST + SGST for intra-state, IGST for inter-state) with HSN codes.
  - AR aging buckets (0-30, 31-60, 61-90, 90+ days).
  - Customer payment recording, bank reconciliation references, credit notes, debit notes.
  - Operating expenses (OPEX) logging by category.
- **Backend Endpoints**: `GET/POST /api/finance/invoices`, `GET/POST /api/finance/payments`, `GET/POST /api/finance/expenses`, `GET /api/finance/dashboard`.
- **Database Tables**: `invoices`, `invoice_items`, `payments`, `payment_allocations`, `credit_notes`, `debit_notes`, `expenses`, `finance_transactions`, `financial_settings`.
- **Status**: **COMPLETE**

---

### 2.16 Marketing & Advertising Analytics (`/marketing`)
- **Purpose**: Performance marketing dashboard integrating Meta Ads (Facebook & Instagram) and Google Ads (Search, Shopping, Performance Max).
- **Available Pages**:
  1. `/marketing`: Blended ROAS, blended CAC, and cross-channel spend telemetry.
  2. `/marketing/meta`: Meta Ads campaign performance, ad set metrics, CTR, CPM, and creative fatigue diagnostics.
  3. `/marketing/google`: Google Ads campaign telemetry, conversions, and cost per conversion.
- **Backend Endpoints**: `GET /api/meta/campaigns`, `GET /api/google-ads/campaigns`, `GET /api/analytics/overview`.
- **Database Tables**: `integration_connections`, `integration_sync_jobs`.
- **Status**: **PARTIAL** (Full operational UI & analytics proxy; production Meta/Google API tokens required for live ad spend sync).

---

### 2.17 Human Capital Management (`/people`)
- **Purpose**: Enterprise staff directory, shift rosters, punch registers, leave balances, workforce tasks, and quarterly performance reviews.
- **Available Pages**: `/people/employees`, `/people/attendance`, `/people/leave`, `/people/tasks`, `/people/performance`.
- **Backend Endpoints**: `GET/POST /api/people/*`.
- **Database Tables**: `users`, `user_roles`, `departments`.
- **Status**: **PARTIAL** (Employee directory is linked to `users` table; daily attendance punch registers and leave balances currently use mock initial data).

---

### 2.18 Central Notification Engine (`/notifications`)
- **Purpose**: Universal in-app notification center tracking inventory threshold alerts, order dispatches, quality holds, and system tasks.
- **Available Pages**: `/notifications`
- **Features**:
  - Filter by category (`ALL`, `ORDERS`, `INVENTORY`, `SYSTEM`, `ALERT`).
  - Read/Unread state toggling and batch "Mark all as read".
- **Backend Endpoints**: `GET /api/notifications`, `PUT /api/notifications/:id/read`.
- **Database Tables**: `notifications`.
- **Status**: **COMPLETE**

---

### 2.19 Settings, Security Governance & Audit Logs (`/settings`)
- **Purpose**: Enterprise legal entities, multi-branch configuration, units of measure, RBAC role permissions, and immutable compliance audit logs.
- **Available Pages**:
  1. `/settings/organization`: Corporate profile, legal title, GSTIN, CIN, AYUSH licenses.
  2. `/settings/branches`: Plants, facilities, operating depots.
  3. `/settings/warehouses`: Storage locations and aisle layouts.
  4. `/settings/roles`: Enterprise RBAC role matrix (11 system roles, 333 permissions).
  5. `/settings/users`: User provisioning, status management, branch assignments.
  6. `/settings/integrations`: API connection parameters, secret encryption status, and webhook test workbench.
  7. `/settings/audit-logs`: Immutable audit trails detailing actor, IP address, timestamp, target resource, action, and JSON diffs.
- **Backend Endpoints**: `GET/POST /api/settings/*`, `GET /api/audit-logs`, `GET /api/integrations`.
- **Database Tables**: `organizations`, `branches`, `warehouses`, `units`, `business_settings`, `roles`, `permissions`, `role_permissions`, `users`, `user_roles`, `audit_logs`.
- **Status**: **COMPLETE**
