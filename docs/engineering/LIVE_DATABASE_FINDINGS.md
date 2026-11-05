# LIVE_DATABASE_FINDINGS (InsForge project "Jyotsvan", read-only inspection, 2026-11-05)

Method: InsForge CLI, linked project `858f4w8c` (us-east). Only metadata and row **counts** were read (information_schema, pg_constraint, pg_roles, counts). No row data was exported (a data export was blocked and was not needed). **Nothing was written to the live database.** The upgrade was rehearsed on a local scratch copy rebuilt from the live schema and constraint definitions.

## What the live database actually is
| Fact | Value | Impact |
|---|---|---|
| Engine | PostgreSQL **15.18** | docs claimed 17.4; nothing used here needs 16+ |
| Tables | **172** (code needs 234) | see below |
| Data | 1 organization, 8 users (seeded demo personas, no passwords), 11 roles, 333 permissions, 567 role-permission links, 5 products/SKUs, 2 sales orders, 3 invoices, 8 employees, 3 audit rows | **no real business data**: low-risk to migrate |
| Connecting role | `project_admin` (not superuser, **BYPASSRLS = true**) | row-level security would be ignored for this role; the app needs a separate restricted role to benefit from RLS |
| RLS | 0 of 172 tables | as expected |
| Other schemas | auth, storage, realtime, schedules, functions, email, payments, memory, deployments, compute, system | InsForge-managed; the app does not use `auth.users` |

## Live is missing whole modules
**66 tables the code uses do not exist in live**, so those features return errors there today: production orders/plans/outputs/material issues, formulations, field sales (visits, routes, targets, tasks), all `integration_*` tables, all `marketplace_*` tables (Amazon/Flipkart/Myntra), Google Ads, Meta/marketing insights, notification outbox/preferences, `sales_territory_assignments`, pick items, shopify checkpoints. (Cause: the boot-time migrations failed on live and the errors were swallowed — the same defects fixed in the legacy migrations.) The legacy "COMPLETE" claims in `docs/JYOTSVAN_*.md` are therefore false for these modules in the deployed database.
Also present in live but unknown to the code: `customers`, `orders`, `order_items`, `inventory_stock` (original AI-Studio sample tables; harmless, safe to drop after confirmation).

## Live differs from the migrations in ways that matter
- Live is a **strict subset**: no live table has a column the migrations lack.
- 13 tables lack columns the code reads/writes: `audit_logs` (actor_id, actor_email, target_resource, target_id, plus many extended columns), `notifications` (priority, delivery_status, idempotency_key, …), `users` (auth columns, expected), `skus`/`suppliers`/`territories`/`retailers`/`cfs` (legacy-named read columns), `distributor_commercial_terms.credit_hold*`, warehouse transfer and stock-count columns.
- `audit_logs` in live has a **required** `entity_type`/`entity_id` that no writer in the code sets, so every audit write fails there today (found by the rehearsal).
- Live has **no unique constraint** on `role_permissions(role_id, permission_id)` or `user_roles(user_id, role_id, organization_id)` (only primary keys), unlike the migration files. Anything using `ON CONFLICT (role_id, permission_id)` fails there (this broke the first draft of migration 0002; fixed to `NOT EXISTS`).

## Rehearsed upgrade path (on a scratch copy shaped like live)
1. `npm run db:migrate -- --legacy` — 30/30 legacy migrations apply; creates the 66 missing tables and extended columns; demo seed statements that collide are skipped (logged).
2. Versioned: `0001_auth` (password/session columns and tables), `0002_permissions` (payroll/crm/products/suppliers permission codes and grants), `0003_schema_compat` (compat columns, missing tables), `0004_live_catchup` (columns the older shape never received; relaxes legacy `audit_logs` NOT NULLs).
3. Result: column-for-column identical to the migration-built schema; full test suite (51 tests incl. endpoint scan, RBAC, audit) passes on it.
Not exercised: collisions between the demo seeds and the **actual 50-odd live rows** (the copy had no data); the tolerant seed mode skips colliding rows rather than failing.

## Before applying to live (needs an explicit decision)
1. Take a backup: `npx -y @insforge/cli backups create --name pre-upgrade --wait`.
2. Apply `--legacy` + versioned migrations from a trusted machine, with `SESSION_SECRET`/`ENCRYPTION_SECRET` set (production refuses to start without them) — **adds demo seed rows for the new modules** (providers catalogue, demo marketplace/ads data); decide whether to keep or purge them.
3. Create the first real admin: `PASSWORD=… npm run user -- create you@company.com "Name" --super-admin` (demo users have no password and cannot sign in).
4. Verify: `GET /api/admin/system-status`, then run the app's smoke checks.
5. Rollback: `backups restore <id>` (overwrites DB and storage; data created since is lost).
