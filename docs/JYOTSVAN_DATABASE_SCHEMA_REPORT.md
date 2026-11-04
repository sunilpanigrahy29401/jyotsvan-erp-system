# Jyotsvan Enterprise Platform — Database Schema & Data Dictionary Report

**Audit Date**: October 30, 2026  
**Auditor**: Senior Database Architect & Engineering Auditor  
**Database**: PostgreSQL 17.4 (InsForge Managed Cloud)  
**Schema Scope**: 131 Enterprise Tables across `public` Schema  

---

## 1. Relational Architecture & Multi-Tenant Model

The Jyotsvan Enterprise Platform implements a **Shared Database, Shared Schema Multi-Tenant Architecture**:
- **Root Tenant Entity**: `organizations` (`id VARCHAR(64) PRIMARY KEY`).
- **Tenant Scope Enforcement**: Every transactional, operational, and configuration table carries an `organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
- **Temporal Tracking**: Every table standardizes on `created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL` and `updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`.
- **Status Conventions**: Lifecycle states are standardized via `status VARCHAR(32) DEFAULT 'active' NOT NULL`.

```
                    ┌───────────────────────────┐
                    │       organizations       │
                    └─────────────┬─────────────┘
                                  │ 1:N
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│     branches     │    │   departments    │    │    warehouses    │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │ 1:N                   │                       │ 1:N
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│      users       │    │      roles       │    │warehouse_locatns │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────┬───────────┘                       │
                     ▼                                   ▼
          ┌─────────────────────┐             ┌─────────────────────┐
          │     user_roles      │             │ inventory_balances  │
          └─────────────────────┘             └─────────────────────┘
```

---

## 2. Core Subsystem Schema Specifications

### 2.1 Multi-Tenant Organization & Access Control (RBAC)

#### `organizations` (Enterprise Tenants)
- `id` (`VARCHAR(64)` PK): e.g. `org-jyotsvan-corp`
- `name`, `legal_name` (`VARCHAR(255)`): e.g. "Jyotsvan Ayurvedic Enterprises Pvt. Ltd."
- `code` (`VARCHAR(64)` UNIQUE): e.g. `JYOTSVAN-HQ`
- `tax_identifier` (`VARCHAR(64)`): GSTIN `07AAACJ2940M1Z8`
- `currency` (`VARCHAR(8)`): `INR`
- `timezone` (`VARCHAR(64)`): `Asia/Kolkata`
- `address`, `city`, `state`, `country`, `postal_code`: Physical corporate headquarters

#### `branches` (Manufacturing Plants, Depots, Offices)
- `id` (`VARCHAR(64)` PK): e.g. `br-plant-01`, `br-plant-02`, `br-hq-01`
- `organization_id` (`VARCHAR(64)` FK -> `organizations.id`)
- `name` (`VARCHAR(255)`): e.g. "Haridwar Formulation Plant", "Kochi Herbal Extraction Unit"
- `code` (`VARCHAR(64)`): Unique per org (`uk_org_branch_code`)
- `branch_type` (`VARCHAR(64)`): `factory`, `headquarters`, `depot`, `sales_office`

#### `roles`, `permissions`, and `role_permissions`
- `roles` (11 Seeded Roles): `super_admin`, `admin`, `plant_manager`, `production_supervisor`, `qc_chemist`, `inventory_manager`, `procurement_officer`, `dispatch_officer`, `finance_controller`, `marketing_lead`, `field_sales`.
- `permissions` (333 Granular Permission Tokens): Format `<module>.<action>` (e.g. `products.view`, `formulations.approve`, `finance.issue_invoice`, `ai.view`).
- `role_permissions` (567 Active Mappings): Binds granular permission tokens to system roles.

---

### 2.2 Canonical Product & SKU Master

#### `categories`
- `id` (`VARCHAR(64)` PK), `organization_id` (`VARCHAR(64)` FK)
- `name`, `code`, `description`
- `parent_category_id` (Self-referencing FK for unlimited hierarchy)

#### `products` (Master Ayurvedic Formulations)
- `id` (`VARCHAR(64)` PK): e.g. `prd-kumkumadi-oil`
- `organization_id` (`VARCHAR(64)` FK)
- `name`, `code`, `description`
- `category_id` (`VARCHAR(64)` FK -> `categories.id`)
- `product_type`: `finished_good`, `raw_material`, `intermediate`, `packaging`
- `ayush_license_number`: Regulatory Ayush GMP manufacturing license
- `shelf_life_months`: Expiry validity window
- `storage_conditions`: e.g. "Store in cool dry place below 25°C away from direct sunlight"

#### `skus` (Finished Goods Saleable Variant SKUs)
- `id` (`VARCHAR(64)` PK): e.g. `JY-KUM-OIL-30ML`, `JY-KUM-OIL-100ML`
- `product_id` (`VARCHAR(64)` FK -> `products.id`)
- `sku_code`, `barcode` (EAN-13 barcode standard)
- `package_size`, `net_content`, `net_uom` (ml, g, kg)
- `gross_weight_grams`: Shipping dead-weight calculation
- `mrp`, `base_price`, `cost_price`: Commercial pricing tiers
- `hsn_code`: Indian GST Harmonized System of Nomenclature (e.g. `30049011`)
- `tax_rate`: GST percentage rate (e.g. `12.00` or `18.00`)

---

### 2.3 Manufacturing, Formulations & Quality Control

#### `batches` (Manufacturing Batch Register)
- `id` (`VARCHAR(64)` PK): e.g. `JY-KUM-2026-10A`
- `organization_id` (`VARCHAR(64)` FK)
- `sku_id` (`VARCHAR(64)` FK -> `skus.id`)
- `product_id` (`VARCHAR(64)` FK -> `products.id`)
- `manufacturing_date`, `expiry_date`
- `planned_quantity`, `actual_quantity`: Yield tracking
- `status`: `SCHEDULED`, `IN_PRODUCTION`, `QC_QUARANTINE`, `RELEASED`, `RECALLED`

#### `batch_genealogy` (End-to-End Traceability Tree)
- `id` (`VARCHAR(64)` PK)
- `parent_batch_id` (`VARCHAR(64)`): Bulk decoction or raw herb extraction lot
- `child_batch_id` (`VARCHAR(64)`): Finished bottled packaging batch
- `ingredient_sku_id`, `quantity_used`, `uom`

#### `qc_inspections` & `qc_inspection_items`
- `qc_inspections`: Inward GRN or finished batch quality inspection records
- `qc_parameters`: Analytical testing specifications (pH, Viscosity, Heavy Metals, Microbial Limit)
- `qc_inspection_items`: Actual laboratory observed values vs. minimum/maximum pharmacopoeial thresholds
- `qc_decisions`: Release authorization or quarantine hold tagging

---

### 2.4 Multi-Tier Distribution & Field Sales

#### `cfs` (Carrying & Forwarding Agents)
- State-level distribution hubs holding buffer inventory for regional dispatch.
- Tables: `cfs`, `cf_addresses`, `cf_contacts`, `cf_warehouses`, `cf_territories`, `cf_transfers`, `cf_dispatches`.

#### `distributors` (B2B Regional Distributors)
- Wholesale stockists purchasing under commercial trade terms.
- Tables: `distributors`, `distributor_commercial_terms` (Credit limits, credit period days, cash discount %), `distributor_orders`, `distributor_stock`.

#### `retailers` (Ayurvedic Pharmacies & Stores)
- Retail counters served by field sales representatives.
- Tables: `retailers`, `retailer_beats` (Sales beat routes), `retailer_visits` (Check-ins with GPS coordinates), `retailer_orders`.

---

### 2.5 Commercial Sales Orders, Invoicing & Financial Subledger

#### `sales_orders` & `sales_order_items`
- `id` (`VARCHAR(64)` PK), `order_number`: Commercial reference (e.g. `SO-2026-1001`)
- `customer_type`: `distributor`, `cf`, `institution`, `retailer`
- `pricing_tier`: Applicable discount tier
- `subtotal`, `discount_amount`, `tax_amount`, `grand_total`
- `credit_status`: `APPROVED`, `HOLD`, `EXCEEDED`
- `order_status`: `DRAFT`, `SUBMITTED`, `CONFIRMED`, `ALLOCATED`, `DISPATCHED`, `DELIVERED`, `CANCELLED`

#### `sales_order_reservations`
- Binds order line items to specific warehouse inventory balances to guarantee allocation before physical dispatch.

#### `invoices` & `invoice_items`
- Generated upon physical dispatch. Carries sequential tax invoice numbers, HSN-wise tax breakdown (CGST, SGST, IGST), and payment due dates.

#### `payments` & `payment_allocations`
- Customer payments received via RTGS, NEFT, Cheque, or UPI allocated against specific outstanding invoices.

---

### 2.6 Enterprise AI Intelligence & Governance

#### `ai_insights`
- Stores proactive alerts detected by background analysis:
- `insight_type`: `INVENTORY_STOCKOUT_RISK`, `RECEIVABLES_OVERDUE_STRETCH`, `MARKETING_ROAS_DECAY`, `OPPORTUNITY_GROWTH`
- `severity`: `CRITICAL`, `WARNING`, `INFO`, `OPPORTUNITY`
- `evidence_data`: JSON payload containing supporting metrics
- `status`: `NEW`, `VIEWED`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`

#### `ai_recommendations`
- Prescriptive recommendations generated by AI reasoning:
- `category`: `INVENTORY`, `PROCUREMENT`, `MARKETING`, `MANUFACTURING`, `COLLECTIONS`
- `problem_statement`, `recommendation_text`, `expected_impact`
- `confidence_score`: e.g. `94.5`
- `action_type`: `CREATE_WORK_ORDER`, `CREATE_PURCHASE_ORDER`, `UPDATE_MARKETING_BUDGET`

#### `ai_actions`
- Governed execution queue enforcing human-in-the-loop review:
- `risk_level`: `LOW`, `MEDIUM`, `HIGH`
- `requires_approval`: Boolean
- `status`: `PROPOSED`, `VALIDATED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `EXECUTED`, `FAILED`
- `execution_result`: Audit details upon ledger mutation

#### `audit_logs` (Immutable Compliance Trail)
- `id`, `organization_id`, `actor_id`, `actor_email`, `action` (`POST`, `PUT`, `DELETE`), `target_resource`, `target_id`, `details` (JSON before/after state), `created_at`.
