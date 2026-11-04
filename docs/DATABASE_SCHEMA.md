# Jyotsvan Enterprise Platform — Database Schema & Data Dictionary

## 1. Overview & InsForge Integration

All tables are deployed on **InsForge Managed PostgreSQL (v17.4)** with full ACID compliance and temporal auditing.

### Architectural Conventions
- **Identifiers**: Structured prefixed alphanumeric IDs or UUIDs (e.g., `org-jyotsvan-corp`, `br-plant-01`, `role-super-admin`).
- **Multi-Tenant Isolation**: Every enterprise entity contains `organization_id` referencing `organizations(id)` with cascade deletion or role filtering.
- **Audit Columns**: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- **Status Lifecycle**: `status VARCHAR(32) DEFAULT 'active' NOT NULL`.
- **Foreign Keys**: Enforced referential integrity across branches, departments, roles, permissions, and warehouses.

---

## 2. Verified Foundation Tables in `public` Schema

### 2.1. `organizations` (Enterprise Tenants)
Represents the top-level corporate or business tenant.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Unique organization ID (e.g. `org-jyotsvan-corp`) |
| `name` | `VARCHAR(255)` | NOT NULL | Display name |
| `legal_name` | `VARCHAR(255)` | NULLABLE | Legal entity registered title |
| `code` | `VARCHAR(64)` | UNIQUE, NOT NULL | Short code identifier (e.g. `JYOTSVAN-HQ`) |
| `tax_identifier` | `VARCHAR(64)` | NULLABLE | GSTIN / PAN / Corporate Tax ID |
| `currency` | `VARCHAR(8)` | DEFAULT 'INR' NOT NULL | Primary ISO currency |
| `timezone` | `VARCHAR(64)` | DEFAULT 'Asia/Kolkata' | Operating timezone |
| `email` | `VARCHAR(255)` | NULLABLE | Enterprise contact email |
| `phone` | `VARCHAR(64)` | NULLABLE | Enterprise primary telephone |
| `website` | `VARCHAR(255)` | NULLABLE | Corporate domain URL |
| `address` | `TEXT` | NULLABLE | Corporate headquarters address |
| `city` | `VARCHAR(128)` | NULLABLE | City |
| `state` | `VARCHAR(128)` | NULLABLE | State / Province |
| `country` | `VARCHAR(128)` | DEFAULT 'India' NOT NULL | Country |
| `postal_code` | `VARCHAR(32)` | NULLABLE | Postal / PIN code |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | Tenant status (`active`, `suspended`) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Last update timestamp |

---

### 2.2. `branches` (Plants, Distribution Hubs, Operating Divisions)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Branch ID (e.g. `br-plant-01`) |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Parent tenant |
| `name` | `VARCHAR(255)` | NOT NULL | Facility name |
| `code` | `VARCHAR(64)` | NOT NULL | Branch code (Unique per org) |
| `branch_type` | `VARCHAR(64)` | DEFAULT 'factory' NOT NULL | `headquarters`, `factory`, `depot`, `sales_office` |
| `address` | `TEXT` | NULLABLE | Physical location address |
| `city` | `VARCHAR(128)` | NULLABLE | City |
| `state` | `VARCHAR(128)` | NULLABLE | State |
| `country` | `VARCHAR(128)` | DEFAULT 'India' NOT NULL | Country |
| `postal_code` | `VARCHAR(32)` | NULLABLE | Postal code |
| `phone` | `VARCHAR(64)` | NULLABLE | Facility telephone |
| `phone_number` | `VARCHAR(64)` | NULLABLE | Alternative contact number |
| `email` | `VARCHAR(255)` | NULLABLE | Branch operational email |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | `active`, `inactive` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.3. `departments` (Organizational Units)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Department ID (e.g. `dep-mfg-01`) |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Parent tenant |
| `name` | `VARCHAR(255)` | NOT NULL | Department title |
| `code` | `VARCHAR(64)` | NOT NULL | Department code (Unique per org) |
| `description` | `TEXT` | NULLABLE | Department operational scope |
| `head_user_id` | `VARCHAR(64)` | NULLABLE | Department head user ID |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | `active`, `inactive` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.4. `roles` (Enterprise RBAC Roles)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Role ID (e.g. `role-super-admin`) |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Tenant scope |
| `name` | `VARCHAR(255)` | NOT NULL | Role display name |
| `slug` | `VARCHAR(64)` | UNIQUE, NOT NULL | Role slug (e.g. `super_admin`, `plant_manager`) |
| `description` | `TEXT` | NULLABLE | Role description |
| `is_system` | `BOOLEAN` | DEFAULT FALSE NOT NULL | Protected system role flag |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | `active`, `inactive` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.5. `permissions` (Granular Capability Tokens)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Permission ID (e.g. `perm-inv-read`) |
| `code` | `VARCHAR(128)` | UNIQUE, NOT NULL | Format: `domain:action` (e.g. `inventory:read`, `*`) |
| `module` | `VARCHAR(64)` | NOT NULL | Target system module |
| `description` | `TEXT` | NOT NULL | Human-readable explanation of permission |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.6. `role_permissions` (Role-to-Permission Mapping Junction)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Junction record ID |
| `role_id` | `VARCHAR(64)` | FK -> `roles(id)` | Role reference |
| `permission_id` | `VARCHAR(64)` | FK -> `permissions(id)` | Permission reference |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.7. `users` (Operator Profiles mapped to InsForge Auth)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | User ID / InsForge Auth UID |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Tenant scope |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Operator email |
| `full_name` | `VARCHAR(255)` | NOT NULL | Full name |
| `phone_number` | `VARCHAR(64)` | NULLABLE | Telephone number |
| `avatar_url` | `TEXT` | NULLABLE | Profile image URL |
| `is_super_admin` | `BOOLEAN` | DEFAULT FALSE NOT NULL | Super admin override flag |
| `default_branch_id` | `VARCHAR(64)` | FK -> `branches(id)` | Primary assigned facility |
| `last_login_at` | `TIMESTAMPTZ` | NULLABLE | Last session timestamp |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | `active`, `inactive`, `suspended` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.8. `user_roles` (User-to-Role Assignment Junction)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Junction record ID |
| `user_id` | `VARCHAR(64)` | FK -> `users(id)` | User reference |
| `role_id` | `VARCHAR(64)` | FK -> `roles(id)` | Role reference |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Tenant scope |
| `assigned_by` | `VARCHAR(64)` | NULLABLE | Assigning admin |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.9. `warehouses` (Fulfillment & Inventory Depots)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Warehouse ID (e.g. `wh-central-01`) |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Tenant scope |
| `branch_id` | `VARCHAR(64)` | FK -> `branches(id)` | Associated branch facility |
| `name` | `VARCHAR(255)` | NOT NULL | Warehouse designation |
| `code` | `VARCHAR(64)` | NOT NULL | Operational code (Unique per org) |
| `warehouse_type` | `VARCHAR(64)` | NOT NULL | `central_hub`, `plant_warehouse`, `regional_depot` |
| `address` | `TEXT` | NULLABLE | Physical location address |
| `city` | `VARCHAR(128)` | NULLABLE | City |
| `state` | `VARCHAR(128)` | NULLABLE | State |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | `active`, `inactive` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.10. `warehouse_locations` (Storage Bins, Silos, Staging Bays)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Location ID (e.g. `loc-c-01`) |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Tenant scope |
| `warehouse_id` | `VARCHAR(64)` | FK -> `warehouses(id)` | Owning warehouse |
| `code` | `VARCHAR(64)` | NOT NULL | Bay / Rack / Bin code |
| `name` | `VARCHAR(255)` | NOT NULL | Location designation |
| `description` | `TEXT` | NULLABLE | Environmental / storage notes |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | `active`, `inactive` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.11. `units` (Units of Measurement Master)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Unit ID (e.g. `u-kg`, `u-pcs`, `u-box`) |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Tenant scope |
| `name` | `VARCHAR(64)` | NOT NULL | Unit name |
| `short_code` | `VARCHAR(32)` | NOT NULL | Symbol (e.g. `kg`, `pcs`, `ctn`, `L`) |
| `category` | `VARCHAR(32)` | NOT NULL | `weight`, `volume`, `count`, `packaging`, `length` |
| `description` | `TEXT` | NULLABLE | Unit description |
| `is_system` | `BOOLEAN` | DEFAULT FALSE NOT NULL | System standard unit |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | `active`, `inactive` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.12. `business_settings` (Enterprise Tenant Preferences)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Settings ID |
| `organization_id` | `VARCHAR(64)` | UNIQUE, FK -> `organizations(id)` | Tenant scope |
| `default_currency` | `VARCHAR(8)` | DEFAULT 'INR' NOT NULL | Base currency |
| `timezone` | `VARCHAR(64)` | DEFAULT 'Asia/Kolkata' NOT NULL | Primary timezone |
| `date_format` | `VARCHAR(32)` | DEFAULT 'DD/MM/YYYY' NOT NULL | Date format string |
| `number_format` | `VARCHAR(32)` | DEFAULT 'indian_lakhs' NOT NULL | `indian_lakhs`, `international_millions` |
| `default_weight_unit`| `VARCHAR(32)` | DEFAULT 'kg' | Default weight unit |
| `default_volume_unit`| `VARCHAR(32)` | DEFAULT 'L' | Default volume unit |
| `default_count_unit` | `VARCHAR(32)` | DEFAULT 'pcs' | Default count unit |
| `fiscal_year_start_month` | `INTEGER` | DEFAULT 4 NOT NULL | Fiscal year start (April = 4) |
| `business_days_per_week` | `INTEGER` | DEFAULT 6 NOT NULL | Operating days per week |
| `status` | `VARCHAR(32)` | DEFAULT 'active' NOT NULL | Status |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp |

---

### 2.13. `audit_logs` (Enterprise Activity & Cryptographic Audit Trail — Phase 23)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Unique log entry ID |
| `organization_id` | `VARCHAR(64)` | FK -> `organizations(id)` | Strict tenant scope |
| `actor_user_id` | `VARCHAR(64)` | NULLABLE | Operator user ID |
| `actor_name` | `VARCHAR(255)` | NULLABLE | Operator full name |
| `actor_email` | `VARCHAR(255)` | NULLABLE | Operator email address |
| `actor_type` | `VARCHAR(32)` | DEFAULT 'USER' NOT NULL | `USER`, `SYSTEM`, `WORKER`, `AI`, `INTEGRATION` |
| `action` | `VARCHAR(128)` | NOT NULL | Action category (`CREATE`, `UPDATE`, `APPROVE`, `POST`, etc.) |
| `event_type` | `VARCHAR(128)` | NULLABLE | Specific domain event (e.g. `INVOICE_POSTED`, `QC_APPROVED`) |
| `module` | `VARCHAR(64)` | DEFAULT 'system' NOT NULL | System module (e.g. `finance`, `quality`, `security`) |
| `entity_type` | `VARCHAR(128)` | NULLABLE | Target resource type (e.g. `invoice`, `qc_inspection`) |
| `entity_id` | `VARCHAR(128)` | NULLABLE | Target primary key / identifier |
| `entity_name` | `VARCHAR(255)` | NULLABLE | Human-readable entity description |
| `before_state` | `JSONB` | NULLABLE | State before modification (sensitive fields redacted) |
| `after_state` | `JSONB` | NULLABLE | State after modification (sensitive fields redacted) |
| `changed_fields` | `JSONB` | NULLABLE | Array of changed fields with old/new values |
| `metadata` | `JSONB` | NULLABLE | Structured context metadata payload |
| `request_id` | `VARCHAR(128)` | NULLABLE | HTTP request tracing ID |
| `correlation_id`| `VARCHAR(128)` | NULLABLE | Distributed transaction correlation ID |
| `source` | `VARCHAR(32)` | DEFAULT 'WEB' NOT NULL | `WEB`, `MOBILE`, `API`, `WORKER`, `AI`, `SYSTEM` |
| `ip_address` | `VARCHAR(64)` | NULLABLE | Client origin IP address |
| `user_agent` | `TEXT` | NULLABLE | Client browser / device user agent |
| `status` | `VARCHAR(32)` | DEFAULT 'SUCCESS' NOT NULL | `SUCCESS`, `FAILED` |
| `failure_reason`| `TEXT` | NULLABLE | Failure explanation or error code |
| `previous_hash` | `VARCHAR(128)` | NULLABLE | SHA-256 hash of prior chronological audit record |
| `record_hash` | `VARCHAR(128)` | NULLABLE | Cryptographic SHA-256 tamper-evident record hash |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Timestamp of audit entry |

---

### 2.14. `audit_retention_policies` (Compliance & Retention Configuration — Phase 23)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Policy ID (e.g. `retention-org-01`) |
| `organization_id` | `VARCHAR(64)` | UNIQUE, FK -> `organizations(id)` | Tenant scope |
| `retention_period_days` | `INTEGER` | DEFAULT 730 NOT NULL | Retention lifecycle in days (0 = indefinite) |
| `auto_archive_enabled` | `BOOLEAN` | DEFAULT TRUE NOT NULL | Automated archiving flag |
| `legal_hold_enabled` | `BOOLEAN` | DEFAULT FALSE NOT NULL | Immutable legal hold (prevents purges) |
| `tamper_detection_enabled` | `BOOLEAN` | DEFAULT TRUE NOT NULL | Cryptographic chain generation |
| `notify_on_security_event` | `BOOLEAN` | DEFAULT TRUE NOT NULL | Alert security admins on unauthorized attempts |
| `notify_on_integrity_breach`| `BOOLEAN` | DEFAULT TRUE NOT NULL | Alert on cryptographic chain anomalies |
| `updated_by` | `VARCHAR(64)` | NULLABLE | Admin user who updated policy |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() NOT NULL | Update timestamp |

---

---

## 3. Storage Buckets in `storage.buckets`

| Bucket Name | Visibility | Purpose |
| :--- | :--- | :--- |
| `documents` | Private | Invoices, compliance certificates, contracts |
| `product-images` | Public | High-resolution SKU imagery & packaging renders |
| `attachments` | Private | Communication files, purchase order specs |
| `qc-documents` | Private | Quality assurance certificates of analysis |
| `employee-documents` | Private | Onboarding verification records |
| `reports` | Private | Exported financial & analytical PDF/Excel sheets |
