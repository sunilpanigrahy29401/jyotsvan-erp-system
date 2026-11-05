# DATABASE_ARCHITECTURE

**Live DB not verified**: no `INSFORGE_DATABASE_URL`/`.env` in this environment, and the server was deliberately not booted (boot runs migrations). Everything below is derived statically from code. To verify safely, use a read-only role and query `information_schema` / `pg_class` — never `/api/db/init`.

## Engine & access
PostgreSQL 17.4 *(legacy claim)* on InsForge. `src/server/db.ts`: `pg.Pool` (max 25, SSL with `rejectUnauthorized:false`, 30 s connect timeout). Schemas referenced: `public`, `auth`, `storage` (health endpoint reads `auth.users`, `storage.buckets`).

## Tenancy & keys
- Every domain table carries `organization_id VARCHAR(64)` (verified in foundation + sampled migrations); seed tenant `org-jyotsvan-corp`; branches under organizations.
- Primary keys are text IDs generated in code (prefix + timestamp/random), not UUID defaults. `src/database/schema.sql` (13 tables, UUID defaults) **disagrees** and is stale.
- No RLS, no DB-level tenancy enforcement; no FK to `auth.users` seen.

## Table inventory (static: `CREATE TABLE IF NOT EXISTS` names)
~227 distinct table names declared across code (legacy docs say 131; unreconciled — KI-13). Declarations per file:

| Domain (migration file) | CREATE TABLE count |
|---|---|
| Foundation: orgs, branches, users, roles, permissions, role_permissions, user_roles, units, departments... (`db.ts`) | 13 |
| Product & SKU (`migrate-product-master`) | 4 |
| Supplier (`migrate-supplier-master`) | 6 |
| Inventory engine / stock ledger | 4 |
| Warehouse mgmt | 5 |
| Procurement | 7 |
| Quality control | 8 |
| Formulation / BOM | 4 |
| Production | 7 |
| Batches / genealogy | 5 |
| C&F | 11 |
| Distributors | 15 |
| Retailers | 15 |
| Sales orders | 8 |
| Finance | 18 |
| Field sales | 7 |
| People / HRMS | 24 |
| CRM | 19 |
| Notifications | 4 |
| Audit logs | 2 |
| Integrations (generic) | 7 |
| Shopify | 3 |
| Meta Ads | 8 |
| Google Ads | 9 |
| Amazon / marketplace hub | 11 |
| Flipkart | 1 (+ others via `migrateFlipkartIntegration` helpers) |
| Myntra | 0 direct (provider seed only; tables presumably shared with marketplace hub — verify) |
| AI foundation/insights/actions | 4 |

(Sum of the table above ≈ 233 incl. duplicates/re-declarations across files; treat 227 as an upper-bound distinct count.)

## Notable design points
- `audit_logs` is created in foundation, again in `migrate-audit-logs`, and inserted ad hoc by routers (columns: id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at). Docs disagree on columns (KI-13).
- Stock is a ledger model (`inventory_*`/`stock_*` movements) with reservations; batches have genealogy; FEFO expiry — logic in services, no DB constraints verified.
- Integration credentials stored encrypted (AES-256-GCM, `crypto-vault.ts`) in integration tables.
- Money: types not audited; INR default currency.

## Gaps / risks
No RLS; no verified FK coverage across modules; no indexes audited; `SELECT count(*)` over every table in health endpoints is O(tables); schema drift risk because `ALTER ... IF NOT EXISTS` patches live inside migrations (see DATABASE_MIGRATIONS.md).
