# CLAUDE.md — Jyotsvan Enterprise Platform (engineering entry point)

Read this first. It is the compact context for every task. Deep detail lives in `docs/engineering/`
(index at the bottom). Do not re-read source files already summarized there; query the graph instead.

Baseline audited: branch `claude/zen-mayer-n4nirx`, commit `bb842e8` (2 commits total), 2026-11-04.

## What this is
Multi-tenant ERP / MES / DMS / commerce hub for Jyotsvan Ayurvedic Enterprises.
Modular monolith: React 19 SPA (Vite 6, Tailwind 4) + one Express 4 server (`server.ts`) + PostgreSQL on
InsForge (managed BaaS). Gemini (optional) for AI. TypeScript throughout (ESM, `.ts` import extensions).

## Commands (verified 2026-11-05)
| Task | Command |
|---|---|
| Install | `bun install --frozen-lockfile` |
| Typecheck | `npx tsc --noEmit` (0 errors) |
| Tests | `TEST_DATABASE_URL=postgres://… npx vitest run` — integration tests need a **disposable** Postgres (URL must look like test/ci/local); without it only unit tests run |
| Build | `npm run build` (frontend + `dist/server.cjs`) |
| Dev | `npm run dev` (port 3000; in development it runs legacy+versioned migrations on boot unless `RUN_MIGRATIONS_ON_BOOT=false`) |
| Migrations | `npm run db:migrate [-- --legacy] [-- --status]` — the only way schema changes reach production |
| Users | `PASSWORD=… npm run user -- create|set-password <email> …` |
| RLS | `npm run db:rls -- --status|--sql|--enable|--disable` (off by default; see runbook) |

## Hard rules for agents
1. **Never point tests, the dev server or migrations at a shared/production database.** Use a local disposable Postgres (`initdb` is available in the cloud sandbox). Production migrations are a deliberate human-approved step.
2. Every `/api` route is authenticated and permission-checked by the middleware chain. New routers must be mounted in `src/server/app.ts` and mapped in `src/server/core/permission-map.ts` (a unit test fails otherwise). **Read the tenant/actor from `req.auth`**, never from headers/query/body; do not add `org-jyotsvan-corp` fallbacks.
3. No secrets in code or logs. `SESSION_SECRET`/`ENCRYPTION_SECRET` are required in production. Only `VITE_*` goes to the browser.
4. Schema changes = new numbered file in `src/server/migrations/` (additive, idempotent, never edit an applied one). Do not add DML demo data to migrations.
5. Webhooks must verify signatures and fail closed. No silent mock/simulated fallbacks in production paths.
6. Tests that create data must clean up only their own rows (use unique prefixes).
7. Never commit `.env*`, `dist/`, or `graphify-out/.graphify_python|.graphify_root`.
8. `docs/engineering/*` and `docs/audit/*` are the evidence-based record; update `KNOWN_ISSUES.md` and `OPERATIONS_RUNBOOK.md` with any behavioural change. Legacy `docs/JYOTSVAN_*.md` claims are unverified.

## Layout
```
server.ts                  Express app, health/db/auth-profile routes, router mounts, runAllMigrations()
src/server/app.ts          createApp(): security middleware chain + router mounts (testable; server.ts only listens)
src/server/core/           auth, sessions, permission map, tenant context, RLS pool, migrator, audit, admin (users/roles) routes
src/server/migrations/     versioned SQL (0001 auth, 0002 permissions, 0003 schema compat)
src/server/                *-routes.ts (30 routers), *-service.ts, migrate-*.ts (legacy, run by `db:migrate --legacy`), db.ts, integrations/, ai-*.ts
tests/                     unit + integration (real Postgres) tests
src/app/pages/<module>/    UI per module (~22 dirs); top-level *Page.tsx are shells/routers (state-based routing, no react-router)
src/services/*Api.ts       fetch wrappers per module (frontend -> /api/*)
src/context/               AuthContext (InsForge auth), ToastContext
src/config/navigation.ts   route table + required permission per path
src/services/accessControl.ts  CLIENT-SIDE RBAC for UX only (the server enforces)
src/lib/session.ts         in-memory access token + fetch wrapper + refresh
src/database/schema.sql    stale Phase-1 DDL — NOT the source of truth; migrations are
docs/                      legacy audit/spec docs (unverified claims); docs/engineering/ = canonical
public/assets/aistudio/    two pasted AI-Studio master prompts (HRMS, Operations); treat as intent, not status
```

## Conventions observed
- IDs are VARCHAR text (`'org-jyotsvan-corp'`, `'aud-<ts>-<rand>'`), not UUID. Default tenant fallback `org-jyotsvan-corp`.
- Routes use raw `pool.query` with parameters; 25 template-literal queries need review. Services are static classes.
- Audit trail via `INSERT INTO audit_logs` helpers duplicated per router.
- Frontend navigation is `window.history` + `currentPath` string matching in each *Page.tsx.

## Knowledge graph
`graphify-out/` (graph.json, GRAPH_REPORT.md, graph.html) — 3,739 nodes / 11,724 edges / 124 communities. Use
`graphify query "<question>"`, `graphify path A B`, `graphify explain X` instead of reading files. 9 distributor `.tsx`
files parsed partially (syntax-error regions) so distributor-UI dependency edges are thin. Rebuild: `/graphify . --update`.

## Engineering docs index (`docs/engineering/`)
SYSTEM_OVERVIEW · DATABASE_ARCHITECTURE · DATABASE_MIGRATIONS · API_ARCHITECTURE · SECURITY_ARCHITECTURE ·
MODULE_DEPENDENCIES · IMPLEMENTATION_STATUS · KNOWN_ISSUES · LIVE_DATABASE_FINDINGS · OPERATIONS_RUNBOOK · TESTING_STRATEGY · PRD_GAP_ANALYSIS · BUILD_PLAN · `modules/` (per-domain notes).
Target spec: `docs/PRD_Jyotsvan_ERP.md` (PRD is the source of truth for scope; BUILD_PLAN.md sequences it).
