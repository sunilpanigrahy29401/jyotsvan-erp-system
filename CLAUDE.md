# CLAUDE.md — Jyotsvan Enterprise Platform (engineering entry point)

Read this first. It is the compact context for every task. Deep detail lives in `docs/engineering/`
(index at the bottom). Do not re-read source files already summarized there; query the graph instead.

Baseline audited: branch `claude/zen-mayer-n4nirx`, commit `bb842e8` (2 commits total), 2026-11-04.

## What this is
Multi-tenant ERP / MES / DMS / commerce hub for Jyotsvan Ayurvedic Enterprises.
Modular monolith: React 19 SPA (Vite 6, Tailwind 4) + one Express 4 server (`server.ts`) + PostgreSQL on
InsForge (managed BaaS). Gemini (optional) for AI. TypeScript throughout (ESM, `.ts` import extensions).

## Commands (verified 2026-11-04)
| Task | Command | Result |
|---|---|---|
| Install | `bun install --frozen-lockfile` (bun.lock is the lockfile) | OK, 308 pkgs |
| Typecheck ("lint") | `npx tsc --noEmit` | **4 errors**, all CRM (see KNOWN_ISSUES KI-07) |
| Frontend build | `npx vite build` | OK; single 4.2 MB JS chunk (801 KB gzip) |
| Full build | `npm run build` (vite + esbuild server -> `dist/server.cjs`) | server bundle step NOT run |
| Dev | `npm run dev` (`tsx server.ts`, port 3000 hard-coded) | **Starts DB migrations on boot — do not run against production** |
| Tests | none exist | no test runner configured |

## Hard rules for agents
1. **Never start the server or call `/api/db/init` against a real database** without explicit approval: boot runs all 28 migrations (`CREATE TABLE IF NOT EXISTS`, `ALTER`, seed/upsert). No `.env` exists in this sandbox; DB connectivity is unverified.
2. Do not trust the status claims in `docs/JYOTSVAN_*.md` (they say "COMPLETE"/"zero errors"). `docs/engineering/IMPLEMENTATION_STATUS.md` is the evidence-based replacement.
3. Server-side auth is effectively absent (SECURITY_ARCHITECTURE.md). Any new endpoint must NOT copy the existing pattern of taking `organizationId`/`x-organization-id` from the client; derive tenant from a verified session.
4. Don't modify migrations in place; add new idempotent ones and register in `runAllMigrations()` (`server.ts:337`). See DATABASE_MIGRATIONS.md.
5. Never commit `.env*`, `dist/`, or the machine-local `graphify-out/.graphify_python` and `graphify-out/.graphify_root`. The rest of `graphify-out/` (graph, report, html, manifest, cache) is committed; refresh it with `/graphify . --update` and commit it with the code change that caused the drift.
6. Secrets: `src/server/crypto-vault.ts` falls back to a hard-coded key if `ENCRYPTION_SECRET` is unset — set it before storing real credentials.

## Layout
```
server.ts                  Express app, health/db/auth-profile routes, router mounts, runAllMigrations()
src/server/                108 files: *-routes.ts (30 routers), *-service.ts, migrate-*.ts (27), db.ts (pg Pool + foundation schema), integrations/ (provider clients), ai-*.ts
src/app/pages/<module>/    UI per module (~22 dirs); top-level *Page.tsx are shells/routers (state-based routing, no react-router)
src/services/*Api.ts       fetch wrappers per module (frontend -> /api/*)
src/context/               AuthContext (InsForge auth), ToastContext
src/config/navigation.ts   route table + required permission per path
src/services/accessControl.ts  CLIENT-SIDE RBAC only
src/database/schema.sql    stale Phase-1 DDL (13 tables) — NOT the source of truth; migrations in src/server are
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
MODULE_DEPENDENCIES · IMPLEMENTATION_STATUS · KNOWN_ISSUES · TESTING_STRATEGY · PRD_GAP_ANALYSIS · BUILD_PLAN · `modules/` (per-domain notes).
Target spec: `docs/PRD_Jyotsvan_ERP.md` (PRD is the source of truth for scope; BUILD_PLAN.md sequences it).
