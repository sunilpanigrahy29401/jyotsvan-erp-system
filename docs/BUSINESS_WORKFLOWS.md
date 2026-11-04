# Jyotsvan Enterprise Platform — Business Workflows Specification

## 1. Overview

This document outlines the core end-to-end business workflows planned for the Jyotsvan platform. In **Phase 1 (Project Foundation)**, these workflows are documented as the architectural target, but their execution logic is **planned for future phases**.

---

## 2. Planned Enterprise Workflows

### 2.1. Procure-to-Pay (P2P)
*Planned for Phase 5 (Procurement & Vendor Management)*
- Requisition Generation -> Multi-level Approval -> Purchase Order Issuance -> Goods Receipt Note (GRN) -> Inspection -> 3-Way Invoice Matching -> Payment Release.

### 2.2. Plan-to-Produce (Manufacturing & QC)
*Planned for Phase 6 (Manufacturing & Quality Control)*
- BOM Formulation -> Production Planning -> Material Issue -> Batch Blending/Processing -> In-Process QC -> Finished Goods Packaging -> QC Quarantine & Certificate of Analysis (COA) -> Release to Warehouse.

### 2.3. Order-to-Cash (O2C - Distribution & Commercial)
*Planned for Phase 7 & 8 (Distribution, Sales & Invoicing)*
- Retailer/Distributor Order Capture -> Credit Limit Validation -> Stock Allocation -> Dispatch & E-Way Bill -> E-Invoicing -> Payment Collection & Reconciliation.

### 2.4. Omni-Channel Marketplace Sync
*Planned for Phase 9 (Marketplaces & Commerce)*
- Centralized Inventory Reservation -> Amazon / Flipkart / Myntra / Shopify Order Ingestion -> Unified Fulfillment -> Real-time Stock Sync across all channels.

### 2.5. Marketing Attribution & Ad Spend Optimization
*Planned for Phase 10 (Marketing Intelligence)*
- Meta Ads & Google Ads Spend Ingestion -> Order Attribution -> ROAS & Blended Customer Acquisition Cost (CAC) Analysis.

---

## 3. Phase 1 Active Workflow: Authentication & Session Access

The only active workflow in Phase 1 is:
1. Operator navigates to `/login` (or unauthenticated route redirects to `/login`).
2. Authentication credentials submitted to InsForge Auth service.
3. Upon validation, session token persisted locally and user identity hydrated in `AuthContext`.
4. Router transitions operator into the protected Jyotsvan Application Shell.
5. Operator navigates across planned module routes, inspects system documentation and future phase roadmaps.
6. Logout command revokes session, clears credentials, and returns user to login portal.

---

## 4. Phase 23 Active Workflow: Enterprise Audit Logging & Cryptographic Compliance

```
[Operational Event Initiated]
        │ (e.g. Invoice Posted, QC Inspection Approved, Role Modified)
        ▼
[Transactional Database Operation]
        │
        ▼
[AuditService.log()]
        ├── 1. Multi-Tenant Scoping: Binds strict organization_id
        ├── 2. Actor Resolution: Infers user_id, full_name, email, actor_type
        ├── 3. Sensitive Data Redaction: Strips passwords, secrets, tokens
        ├── 4. Field Diff Extraction: Computes before_state vs after_state diffs
        ├── 5. Hash Chaining: SHA-256(prev_record_hash | payload)
        └── 6. Immutable Storage: Appends into PostgreSQL audit_logs table
        │
        ▼
[Compliance & Verification Workflows]
        ├── Live Audit UI: Real-time search, filters, visual diff inspector
        ├── Entity Audit Timeline: Embedded chronological history inside entity pages
        ├── Hash-Chain Integrity Audit: Instant mathematical validation of all records
        └── Compliance Export: Signed CSV / JSON export with logged audit trail record
```

### Key Compliance Rules:
1. **Append-Only Immutability**: No operator, admin, or API endpoint may delete or modify audit records. Deletion requests fail with `403 Forbidden` and trigger security alerts.
2. **Deterministic Hash Chaining**: Every record cryptographically seals the previous record's hash, preventing retroactive insertion or alteration.
3. **Legal Hold Enforcement**: When `legal_hold_enabled` is active, automated retention purging is suspended.
