# Jyotsvan Enterprise Platform — InsForge Backend Infrastructure Audit

**Audit Date**: October 30, 2026  
**Auditor**: Senior Software Architect & Database Infrastructure Auditor  
**Backend Infrastructure**: InsForge Managed Cloud / Self-Hostable BaaS Engine  
**PostgreSQL Version**: PostgreSQL 17.4 (Debian 17.4-1.pgdg120+2)  

---

## 1. Executive Infrastructure Overview

The Jyotsvan Enterprise Platform utilizes **InsForge** as its primary cloud backend and database infrastructure:
- **Project Reference ID**: `858f4w8c`
- **Region**: `us-east`
- **InsForge API Gateway URL**: `https://858f4w8c.us-east.insforge.app`
- **Database Engine**: Managed PostgreSQL 17.4
- **Database Connection Host**: `858f4w8c.us-east.database.insforge.app:5432`
- **Database Name**: `insforge`
- **Default Database User**: `postgres`
- **Active Schemas**: `public`, `auth`, `storage`, `system`
- **Total Tables in `public` Schema**: **131 enterprise tables**

---

## 2. Database Audit & Schema Verification

### 2.1 Database Connectivity & Architecture
The backend application establishes connectivity via `pg.Pool` defined in `src/server/db.ts`:
```typescript
export const pool = new Pool({
  connectionString: process.env.INSFORGE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 25,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});
```

### 2.2 Live Table Inventory & Record Counts
Direct runtime query (`/api/db/status` and `/api/insforge/health`) verifies all 131 public tables with actual row counts:

| Table Category | Tables Included | Total Tables | Sample Verified Row Counts |
| :--- | :--- | :--- | :--- |
| **Foundation & Master Data** | `organizations`, `branches`, `departments`, `roles`, `permissions`, `role_permissions`, `users`, `user_roles`, `business_settings`, `units`, `audit_logs` | 11 | `organizations` (1), `branches` (3), `departments` (11), `roles` (11), `permissions` (333), `role_permissions` (567), `users` (8), `user_roles` (8), `audit_logs` (3) |
| **Products & Catalog** | `products`, `skus`, `categories`, `product_images`, `product_documents`, `external_sku_mappings` | 6 | `products` (5), `skus` (5), `categories` (3), `product_images` (5), `product_documents` (5), `external_sku_mappings` (10) |
| **Suppliers & Sourcing** | `suppliers`, `supplier_contacts`, `supplier_addresses`, `supplier_prices`, `supplier_skus`, `supplier_documents` | 6 | `suppliers` (4), `supplier_contacts` (4), `supplier_addresses` (3), `supplier_prices` (5), `supplier_skus` (4), `supplier_documents` (3) |
| **Inventory & Warehouses** | `warehouses`, `warehouse_locations`, `warehouse_transfers`, `warehouse_transfer_items`, `warehouse_assignments`, `inventory_balances`, `inventory_movements`, `inventory_stock`, `stock_reservations`, `stock_adjustments`, `stock_count_sessions`, `stock_count_items` | 12 | `warehouses` (3), `warehouse_locations` (25), `warehouse_transfers` (3), `warehouse_transfer_items` (3), `inventory_balances` (10), `inventory_movements` (10), `stock_reservations` (5) |
| **Procurement** | `purchase_requests`, `purchase_request_items`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `procurement_documents` | 7 | `purchase_requests` (2), `purchase_request_items` (3), `purchase_orders` (2), `purchase_order_items` (2), `goods_receipts` (1), `goods_receipt_items` (1) |
| **Quality Control (QC)** | `qc_templates`, `qc_parameters`, `qc_template_parameters`, `qc_inspections`, `qc_inspection_items`, `qc_decisions`, `qc_documents` | 7 | `qc_templates` (3), `qc_parameters` (8), `qc_template_parameters` (14), `qc_inspections` (1), `qc_inspection_items` (7), `qc_decisions` (1) |
| **Batches & Genealogy** | `batches`, `batch_genealogy`, `batch_holds`, `batch_status_logs`, `batch_numbering_rules` | 5 | `batches` (5), `batch_genealogy` (2), `batch_holds` (1), `batch_status_logs` (2), `batch_numbering_rules` (3) |
| **C&F Network** | `cfs`, `cf_addresses`, `cf_contacts`, `cf_documents`, `cf_territories`, `cf_warehouses`, `cf_transfers`, `cf_transfer_items`, `cf_transfer_discrepancies`, `cf_dispatches`, `cf_dispatch_items` | 11 | `cfs` (4), `cf_addresses` (8), `cf_contacts` (8), `cf_documents` (8), `cf_territories` (4), `cf_warehouses` (3), `cf_transfers` (2), `cf_dispatches` (1) |
| **Distributor Network** | `distributors`, `distributor_addresses`, `distributor_contacts`, `distributor_documents`, `distributor_commercial_terms`, `distributor_cf_mappings`, `distributor_assortments`, `distributor_stock`, `distributor_orders`, `distributor_order_items`, `distributor_transfers`, `distributor_transfer_items`, `distributor_discrepancies`, `distributor_returns` | 14 | `distributors` (5), `distributor_addresses` (10), `distributor_contacts` (10), `distributor_commercial_terms` (5), `distributor_assortments` (20), `distributor_stock` (5), `distributor_orders` (2) |
| **Retailer Network** | `retailers`, `retailer_addresses`, `retailer_contacts`, `retailer_documents`, `retailer_commercial_terms`, `retailer_distributor_mappings`, `retailer_assortments`, `retailer_stock`, `retailer_order_requests`, `retailer_order_request_items`, `retailer_receiving_records`, `retailer_salesperson_assignments`, `retailer_visits`, `retailer_follow_ups`, `retailer_returns` | 15 | `retailers` (6), `retailer_addresses` (6), `retailer_contacts` (6), `retailer_commercial_terms` (6), `retailer_assortments` (18), `retailer_stock` (18), `retailer_order_requests` (6), `retailer_visits` (6) |
| **Sales Orders & Returns** | `sales_orders`, `sales_order_items`, `sales_order_reservations`, `sales_order_dispatches`, `sales_order_dispatch_items`, `sales_order_status_history`, `sales_returns`, `sales_return_items` | 8 | `sales_orders` (2), `sales_order_items` (3), `sales_order_reservations` (2), `sales_order_dispatches` (1), `sales_returns` (1) |
| **Finance & Invoicing** | `invoices`, `invoice_items`, `invoice_status_history`, `payments`, `payment_allocations`, `payment_methods`, `payment_status_history`, `credit_notes`, `credit_note_items`, `debit_notes`, `debit_note_items`, `expenses`, `expense_categories`, `expense_status_history`, `collections`, `collection_activity_logs`, `finance_transactions`, `financial_settings`, `customers` | 19 | `invoices` (3), `invoice_items` (4), `payments` (2), `payment_allocations` (2), `payment_methods` (5), `expenses` (4), `expense_categories` (9), `collections` (1), `finance_transactions` (5), `customers` (3) |
| **Notifications** | `notifications` | 1 | `notifications` (0 seeded, dynamic) |
| **AI Intelligence** | `ai_insights`, `ai_recommendations`, `ai_actions`, `ai_query_logs` | 4 | `ai_insights` (0 seeded in DB; populated dynamically with fallback), `ai_recommendations` (0), `ai_actions` (0), `ai_query_logs` (0) |
| **Core Base Orders** | `orders`, `order_items`, `territories` | 3 | `orders` (1), `order_items` (1), `territories` (6) |
| **Total** | | **131 Tables** | |

---

## 3. Authentication & Session Architecture

### 3.1 Authentication Workflow
InsForge provides two complementary authentication tiers in the codebase:
1. **Tier 1: InsForge Client SDK Authentication** (`@insforge/sdk`):
   - Implemented in `src/services/auth.ts` lines 70–108 via `insforgeService.client.auth.signInWithPassword({ email, password })`.
   - Returns JWT Access Token (`accessToken`), user identity metadata, and expires in 24 hours.
2. **Tier 2: Enterprise Direct Database Authentication Fallback**:
   - If InsForge Auth SDK is unreachable or credentials fail, the application falls back to querying the `users` table via `databaseService.getUsers()` in `src/services/auth.ts`.
   - Validates user account status (`active` vs. `suspended`).
   - Dynamically resolves user roles from `user_roles` and granular permissions from `role_permissions` and `permissions`.
   - Automatically grants global wildcard permission `*:*` to super administrators (`sunilpanigrahy29401@gmail.com` or users with `is_super_admin: true`).

### 3.2 Critical Security Finding in Authentication
> ⚠️ **SECURITY WARNING: Password Bypass in Fallback Authentication**  
> In `src/services/auth.ts` lines 112–195, the fallback authentication mechanism accepts **ANY** registered email address without verifying a password hash against the database. If an unrecognized email is entered, it auto-provisions a new user record.  
> **Remediation Required Before VPS Production**: Enforce mandatory bcrypt/argon2 password hashing or strict InsForge Auth JWT validation before issuing sessions.

---

## 4. Authorization & Row Level Security (RLS) Audit

### 4.1 Row Level Security (RLS) Inspection
A database catalog query was executed against `pg_class` and `pg_namespace`:
```sql
SELECT relname as table_name, relrowsecurity as rls_enabled
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public' AND pg_class.relkind = 'r'
ORDER BY relname;
```

### 4.2 RLS Audit Findings
- **Total Public Tables Inspected**: 131
- **Tables with RLS Enabled**: **0 (0%)**
- **Tables with RLS Disabled**: **131 (100%)**

> ⚠️ **CRITICAL FINDING: Row Level Security is Completely Disabled**  
> Every single public table in the database currently has `relrowsecurity = false`.  
> While the Node.js Express server enforces organization isolation via application-level queries (`WHERE organization_id = $1`), **any client connecting directly via `@insforge/sdk` or InsForge PostgREST API can query or modify all tenant data across the entire database without restriction**.  
> **Action Required**: Before opening the InsForge API to client-side SDK requests, `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` must be executed across all 131 tables along with tenant isolation policies (`USING (organization_id = auth.jwt() ->> 'organization_id')`).

---

## 5. Storage Buckets Audit

### 5.1 Storage Inventory
A query against `storage.buckets` in the InsForge PostgreSQL database discovered **6 pre-configured storage buckets**:

| Bucket Name | Visibility | Intended Purpose | Audit Status |
| :--- | :--- | :--- | :--- |
| `product-images` | **Public** | Finished goods SKU images, packaging bottle renders, catalog photos. | Verified in `storage.buckets` |
| `attachments` | **Private** | Purchase requisition quotes, vendor RFQ files, sales order PO scans. | Verified in `storage.buckets` |
| `documents` | **Private** | Master corporate registration certificates, legal filings, tax returns. | Verified in `storage.buckets` |
| `employee-documents` | **Private** | Staff identification, identity proofs, employment contracts, payroll docs. | Verified in `storage.buckets` |
| `qc-documents` | **Private** | Certificates of Analysis (CoA), laboratory testing reports, stability logs. | Verified in `storage.buckets` |
| `reports` | **Private** | Exported PDF executive briefings, GST returns, financial balance sheets. | Verified in `storage.buckets` |

---

## 6. Server APIs & Query Proxy Architecture

### 6.1 Generic Query Proxy (`POST /api/db/query`)
- **Implementation**: `server.ts` lines 272–289.
- **Payload**: `{ sql: string, params?: any[] }`.
- **Purpose**: Enables backend service modules and admin tools to execute parameterized SQL statements via `pg.Pool`.
- **Risk Assessment**: If exposed without strict JWT authentication, this endpoint represents an Arbitrary SQL Execution vector. Currently, it is accessible on the internal server port.

### 6.2 Health & Diagnostic Endpoints
- `GET /api/health`: Basic server responsiveness check and database ping.
- `GET /api/insforge/health`: Comprehensive system inspection detailing database name, connected user, latency, table counts, RLS status, storage buckets, and auth user counts.
- `GET /api/db/status`: Public table names and row count map.
- `GET /api/auth/profile`: Resolves user profile, assigned roles, and distinct permissions for a given email or user ID.
