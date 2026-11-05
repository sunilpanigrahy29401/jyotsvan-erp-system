# CLAUDE.md (PROPOSED) — Jyotsvan platform conventions

Proposed replacement/merge for the root `CLAUDE.md` (not applied). Keep it short; link to docs instead of copying them.

## Project in one paragraph
Multi-tenant ERP for an Indian ayurvedic hair-oil manufacturer/D2C brand. TypeScript monorepo: React (Vite) staff app + portal PWA, Node modular-monolith API, PostgreSQL with Row-Level Security. Target spec: `docs/PRD_Jyotsvan_ERP.md`. Truth about current state: `docs/audit/00_EXECUTIVE_SUMMARY.md`, `docs/audit/02_FEATURE_COMPLETENESS_MATRIX.md`. Code graph: `graphify-out/` (`graphify query "<q>"`).

## Non-negotiables (security & data)
1. **Tenant and actor come only from the verified session** (`req.auth`). Never from headers, query, or body. Every new table has `tenant_id` + RLS policy + a cross-tenant test.
2. **Every route** = `authenticate` → `requirePermission('module.resource.action')` → zod-validated input → service. No exceptions, no "temporary" open routes.
3. **Never** add endpoints that run caller-supplied SQL, trigger migrations, or dump metadata.
4. **No secrets in code/logs/chat.** Use env/secret store. Mask to 4 chars when reporting. `ENCRYPTION_SECRET` must be set; never add fallback keys.
5. **No fake data in production paths.** No silent mock/simulated fallbacks; sandbox mode must be explicit (`mode: sandbox`) and visible in the UI. Demo data only in `apps/api/seeds/dev-only/` behind `SEED_DEMO=true`.
6. **Never run migrations, the server, or scripts against a shared/production database** without explicit approval in the current conversation. Use local Docker Postgres.
7. Personal data (PAN, UAN, bank, DOB) is encrypted/masked and protected by field permissions.

## Money & compliance rules
- Money = `numeric(18,2)` (or integer paise); never JS floats for stored values. Rounding rule in one shared helper with tests.
- All financial effects go through the **posting engine**; a voucher must satisfy Σdebit = Σcredit; respect period locks. Never write to ledger tables directly.
- GST logic lives in one tax module (intra/inter-state, place of supply, HSN, RCM, rounding). Changes require new test cases from a CA-approved sheet.
- Statutory rules (PF/ESI/PT/TDS) are data-driven tables with effective dates, not constants.

## Code conventions
- Module layout: `apps/api/src/modules/<module>/{routes,service,repo,schema,events,tests}`. Modules interact via exported service interfaces or domain events (outbox), **never cross-module SQL**.
- Files < 400 lines; split services; no `any` in new code (`unknown` + zod); no `console.log` (use logger); errors are typed, never leak raw DB messages.
- New migrations: additive, idempotent, versioned (`NNNN_name.sql`), reversible notes; never edit an applied migration.
- Frontend: feature folders, one typed API client from `packages/contracts`, TanStack Query for server state, lazy-loaded routes, shared `ui` package; loading/empty/error states required.
- IDs: UUID (new tables); keep legacy text IDs only in legacy tables.
- Naming: DB `snake_case`, TS `camelCase`/`PascalCase`, permissions `module.resource.action`, events `domain.entity.verb` (past tense).

## Workflow
1. Start by reading this file and the relevant `docs/audit/*` section; query the graph before reading code (`graphify path/explain/query`).
2. Plan in the PR description first (what, why, tests, rollout). One epic per branch, PRs < 400 changed lines where possible.
3. Write/adjust tests **before or with** code. Required: unit tests for tax/accounting/payroll logic, RLS tests for new tables, API 401/403 tests, E2E for changed flows.
4. Before commit: `pnpm typecheck && pnpm lint && pnpm test`. CI must be green to merge. Don't skip, quarantine, or weaken tests to get green.
5. Commit messages: `type(scope): summary` (feat, fix, refactor, test, docs, chore); reference the roadmap task id.
6. Update docs in the same PR (module doc, ADR for decisions, `IMPLEMENTATION_STATUS`). Re-run `/graphify . --update` when structure changes.
7. Read-only investigations are labelled "audit mode": no edits, no installs, no network side effects; report evidence with file paths and mark `UNVERIFIED` when unsure.
8. Ask before: changing the database schema in shared environments, adding dependencies, touching integrations credentials, deleting features.

## Definition of done (per module)
PRD feature set covered or deviation documented · migrated + seeded + RLS-tested · API documented (OpenAPI) and tested · RBAC on API and UI · audit entries written · integrations verified in sandbox and flagged · no hard-coded secrets or mock data · dashboards on real data · docs updated.

## Commands (target)
`pnpm i` · `pnpm dev` (local compose: api+web+postgres) · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:e2e` · `pnpm db:migrate` · `pnpm db:seed:dev`.
