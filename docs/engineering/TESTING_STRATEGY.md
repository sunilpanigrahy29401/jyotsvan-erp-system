> **Update 2026-11-05.** Implemented: Vitest + supertest; unit tests (password policy, permission decisions, route-map coverage); integration tests on a real disposable PostgreSQL (auth, lockout, refresh rotation/replay, forged tokens, tenant forcing, RBAC, admin privilege rules, webhooks, XSS, AI tools, row-level security with a restricted role, and an endpoint smoke scan of every parameter-free GET). CI: `.github/workflows/ci.yml` (Postgres service). Still missing: service-level business-rule tests (inventory/pricing/finance/payroll), Playwright UI suite in the repo (a manual browser script was used), POST/PUT endpoint contract tests, coverage targets.

# TESTING_STRATEGY

## Current state (verified)
No test files, no runner, no CI config. Only gates: `tsc --noEmit` (4 CRM errors) and `vite build` (passes). Server bundle (`esbuild`) not run.

## Principles
- Never test against production InsForge. Use a disposable local Postgres 17 (docker/CI service) with a dedicated schema; run migrations there first.
- Fix security gates (auth middleware) before writing feature tests — otherwise tests lock in the unauthenticated behaviour.

## Layers & tooling (proposed)
1. **Static**: `tsc --noEmit` must be green (fix KI-07 first); add ESLint; fail CI on warnings in changed files.
2. **Migration tests**: run `runAllMigrations()` twice on empty DB (idempotency), assert expected table set, assert no failed `results[]`.
3. **Service tests (Vitest)**: pure/DB-backed tests for the hubs first — inventory ledger, reservation/FEFO, sales-order credit+pricing, finance invoice/payment math, payroll, batch genealogy.
4. **API contract tests (supertest)**: per router happy path + unauthenticated (401) + wrong tenant (403) + permission denied; start with the 6 hubs above.
5. **Integration adapters**: record/replay fixtures for Shopify/Meta/Amazon/Flipkart/Myntra; assert *simulated* mode is explicitly flagged and never reported as "connected".
6. **UI**: Vitest + Testing Library for permission-gated routes (`getRequiredPermissionForPath`) and forms; Playwright smoke per module after backend is stable (Chromium is pre-installed in the cloud sandbox).
7. **Security regression**: tests proving `/api/db/*` removed/locked, cross-tenant reads fail, audit actor comes from session.
8. **Existing manual assets**: `docs/QA_CHECKLIST.md`, `scripts/verify-crm-e2e.cjs`, `execute-*-db.cjs`, `seed-people-db.cjs` — review before reuse; they execute against a real DB (treat as destructive until read).

## Priority order
Security regression -> migration idempotency -> inventory/sales/finance services -> API contracts -> UI smoke -> integrations.

## Definition of "verified" for IMPLEMENTATION_STATUS
A module becomes "Working and verified" only when: migrations apply cleanly on a clean DB, API contract tests pass with auth, a UI smoke flow passes, and tenant-isolation test passes.
