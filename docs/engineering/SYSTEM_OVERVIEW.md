# SYSTEM_OVERVIEW

Evidence date 2026-11-04, commit `bb842e8`. "Verified" = I ran it or read the code. Legacy `docs/JYOTSVAN_*.md` claims are marked *(legacy claim)* where not independently confirmed.

## Stack (verified from package.json / code)
- Frontend: React 19, Vite 6, Tailwind 4, lucide-react, recharts, motion. No router library; state-based paths in `src/App.tsx` + `*Page.tsx`.
- Backend: single Express 4 process (`server.ts`, 426 lines, port 3000 hard-coded), `pg` Pool, ~75k lines under `src/server`.
- Data: PostgreSQL on InsForge, accessed two ways: (a) server direct via `INSFORGE_DATABASE_URL`; (b) browser `@insforge/sdk` for auth (`src/services/insforge.ts`, `auth.ts`).
- AI: `@google/genai`, optional `GEMINI_API_KEY`; deterministic/sample fallback when absent.
- Unused dependency: `pg-mem` (no references).
- Production serving: `dist/` static + `dist/server.cjs` (esbuild bundle); dev uses Vite middleware inside Express.

## Architecture
```
Browser SPA ──(InsForge SDK)──> InsForge Auth (login only)
     │
     └─ fetch /api/* (src/services/*Api.ts)  ──>  Express (server.ts)
                                                   ├─ 30 routers (src/server/*-routes.ts)
                                                   ├─ static-class services (*-service.ts)
                                                   ├─ integrations/ provider clients (Shopify, Meta, Google Ads, Amazon, Flipkart, Myntra, generic webhook)
                                                   └─ pg Pool ──> InsForge PostgreSQL (SSL, rejectUnauthorized:false)
```
Tenant = `organization_id`; there is one seed org `org-jyotsvan-corp`.

## Domain map (UI dir -> router mount -> migration)
Operations: products, suppliers, inventory, warehouses, procurement, quality, formulations, production, batches.
Distribution: cf, distributors, retailers, sales-orders (+returns), field-sales. Finance: finance. People: people (HRMS).
Growth: crm, marketing (meta, google-ads), commerce (shopify, amazon, flipkart, myntra, marketplace hub).
Platform: settings (org/branch/users/roles/audit/integrations), notifications, audit, analytics/reports, ai, command center.
Details: MODULE_DEPENDENCIES.md, `modules/`.

## Size snapshot
581 code files; `src/app/pages` ≈ 101k lines of TSX across ~22 module dirs; `src/server` 75k lines; 30 route files with ≈ 580 handlers; 27 migration files; 108 server files.

## Build/verification state
- `tsc --noEmit`: 4 errors (CRM). `vite build`: passes. Server bundle, runtime, DB connectivity, migrations: **not verified** (no credentials in sandbox, deliberately not booted).
- No automated tests anywhere.

## Existing documentation (preserve, but treat as unverified)
`docs/ARCHITECTURE.md, DATABASE_SCHEMA.md, PERMISSIONS.md, BUSINESS_WORKFLOWS.md, DESIGN_SYSTEM.md, ...` are intent/spec and audit-by-self documents. Known contradictions are listed in KNOWN_ISSUES (KI-13): permission count 127 vs 333, phases A–G vs A–E, `audit_logs` column sets, "131 tables" vs 227 statically declared names.
`public/assets/aistudio/Paste_*` hold two master prompts (HRMS completion; Operations completion) — pending-work intent.
