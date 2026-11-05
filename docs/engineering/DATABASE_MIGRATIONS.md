> **Update 2026-11-05.** Superseded in part: a versioned runner now exists (`src/server/core/migrator.ts`, `npm run db:migrate`) with `schema_migrations`, checksums and an advisory lock; migrations never run on boot in production. The 30 legacy migrations are kept (run by `--legacy`) and now build a **clean database**: a base-table step creates `categories`/`products`, demo seed statements run under savepoints (a colliding seed row is skipped, not fatal), and genuine bugs in the Meta, Myntra, warehouse and field-sales migrations were fixed. `0003_schema_compat.sql` adds read-only compatibility columns and tables the services needed. The live InsForge database was NOT inspected (see KNOWN_ISSUES KI-21). Procedures: `OPERATIONS_RUNBOOK.md`.

# DATABASE_MIGRATIONS

## Mechanism (verified)
There is no migration framework or version table. `runAllMigrations()` (`server.ts:337-387`) calls 28 functions **sequentially, in code order**, each wrapped in try/catch (failure is logged and execution continues, so later phases can run against missing earlier tables). It runs:
1. In the background on every server start (`app.listen` callback, `server.ts:415`).
2. On `ALL /api/db/init` (unauthenticated).
All DDL is `CREATE TABLE IF NOT EXISTS` / `ALTER ... IF NOT EXISTS` / seed upserts — idempotent in intent, not verified.

## Order
1 `initDatabaseSchema` (db.ts) -> 2 `syncFoundationData` (RBAC seed) -> 3 product master -> 4 supplier -> 5 inventory engine -> 6 warehouse -> 7 procurement -> 8 quality -> 9 formulation -> 10 production -> 11 batches -> 12 C&F -> 13 distributors -> 14 retailers -> 15 sales orders -> 16 finance -> 17 field sales -> 18 people -> 19 CRM -> 20 notifications -> 21 audit logs -> 22 integrations -> 23 Shopify -> 24 Meta -> 25 Google Ads -> 26 Amazon/marketplace -> 27 Flipkart -> 28 Myntra -> 29 AI tables.
(Phase numbering skips 27, 34–37, 43+; "Phase 21b" CRM is inserted after Phase 21.)

## Status
- Applied state of the live DB: **unknown/unverified**.
- Reported by legacy docs: 131 tables. Static code declares more (see DATABASE_ARCHITECTURE).
- `src/database/schema.sql` is a Phase-1 snapshot and must not be applied.

## Risks
- No version tracking/rollback; schema changes are applied by whichever server instance boots first; multiple instances race on startup.
- Errors swallowed; "success" in `/api/db/init` response is always `true` even when individual steps failed (check `results[]`).
- Seed functions run on every boot (could overwrite edited roles/permissions — verify `syncFoundationData` semantics before enabling in production).
- Production server booting automatically alters the production DB — contradicts change-control expectations.

## Safe-handling rules for future work
1. Add a `schema_migrations(version, name, checksum, applied_at)` table and a CLI runner (`npm run migrate`) separate from server start; remove boot-time migration in production (`NODE_ENV=production`).
2. New schema changes = new additive migration files; never edit existing ones.
3. Dry-run against a throw-away Postgres (local container) before InsForge.
4. Gate `/api/db/init` behind super-admin auth or delete it.
5. Verify live state read-only: list tables vs. expected set, compare column sets to services' queries.
