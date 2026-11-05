# 01 — Tech Stack and Architecture (Steps 1 & 2)

Appendices (generated): `01a_API_ENDPOINTS.md` (709 URL rows), `01b_DATABASE_TABLES.md` (227 tables with columns and foreign keys).

## 1. Repository map
```
server.ts (426 lines)         Express app, 6 raw routes, 30 router mounts, runAllMigrations()
index.html, vite.config.ts, tsconfig.json, metadata.json, package.json, bun.lock, .env.example
src/App.tsx, main.tsx          SPA entry; routing is hand-made (window.history + string matching)
src/app/pages/                 317 files, 105k lines — one folder per module (finance, people, inventory…)
src/components/                58 files — layout, ui kit, auth, audit, notifications
src/services/                  29 files, 9.5k lines — fetch wrappers per module + auth/accessControl/database
src/server/                    121 files, 79k lines — routes, services, migrations, integrations/, ai-*
src/types/                     31 files — shared interfaces
src/database/schema.sql        stale Phase-1 DDL (13 tables) — not used at runtime
scripts/*.cjs                  4 DB seed/verify scripts (touch a real DB when run)
docs/                          legacy AI-written audit docs + engineering notes + this audit
public/assets/aistudio/        two pasted AI-Studio prompts (HRMS, Operations)
```
Git: 2 commits by the owner on 2026-11-05 ("Initial commit", "initialize Jyotsvan platform foundation"); everything since is documentation. **The whole prototype arrived as one commit — no history to learn from.**

## 2. Stack (verified from `package.json`, `vite.config.ts`, code)
| Layer | Technology |
|---|---|
| Language | TypeScript 5.8 (ESM), loose typing: **1,209 `any`** usages |
| Frontend | React 19, Vite 6, Tailwind 4 (via `@tailwindcss/vite`), lucide-react icons, recharts; no router library, no state library (local `useState` + services), no form/validation library |
| Backend | Node 22, Express 4 (single process, port 3000 hard-coded), `pg` driver with raw SQL |
| Database | PostgreSQL on **InsForge** (managed BaaS); browser also uses `@insforge/sdk` for login |
| AI | `@google/genai` (server only), model string `gemini-3.8-flash` (UNVERIFIED that this model id exists) |
| Package manager | bun (`bun.lock`); scripts use npm/tsx |
| Build | `vite build` (+ esbuild for server). Result: **one 4.2 MB JS file** (801 KB gzip) |
| Testing / lint | none / only `tsc --noEmit` (**4 errors**, all CRM: `CrmPage.tsx:86-88`, `LeadCaptureIntegrations.tsx:176`) |
| Deploy | no Dockerfile, no CI, no `.github`, no nginx/pm2 config |
| Logging | `console.log` ×355 on server; no logger, no monitoring |

### Dependencies — flags
| Package | Finding |
|---|---|
| `pg-mem`, `motion`, `dotenv`, `autoprefixer` | **Unused** (0 imports; no postcss config) — remove |
| `vite` listed twice (deps + devDeps) | tidy |
| `express` 4.x | works; Express 5 is current — low priority |
| `@insforge/sdk ^1.5.2`, `@google/genai ^2.4.0`, `react ^19.0.1`, `recharts ^3.10` | versions UNVERIFIED as current (no network check done) — run `npm outdated` / `npm audit` |
| Missing but needed | auth/JWT verification, validation (zod), helmet/rate-limit, logger (pino), test runner, job queue |
Package name is still `react-example` (AI Studio template).

### How to run (from files; server NOT started by me)
Install `bun install`; dev `npm run dev` (= `tsx server.ts`, boots Vite inside Express, **auto-runs all migrations on the configured DB**); build `npm run build`; start `node dist/server.cjs`; typecheck `npm run lint`.
Env var **names**: server — `INSFORGE_DATABASE_URL` / `DATABASE_URL`, `ENCRYPTION_SECRET`, `GEMINI_API_KEY`, `META_APP_ID`, `META_APP_SECRET`, `META_API_VERSION`, `META_OAUTH_REDIRECT_URI`, `NODE_ENV`, `DISABLE_HMR`; client — `VITE_INSFORGE_PROJECT_ID`, `VITE_INSFORGE_API_URL`, `VITE_INSFORGE_ANON_KEY`, `APP_URL`. `.env.example` omits `ENCRYPTION_SECRET`, `INSFORGE_SERVICE_ROLE_KEY` usage is not found in code (UNVERIFIED who uses it), and nothing for Shopify/Amazon/Flipkart/Google Ads/WhatsApp (they store credentials in DB tables).

## 3. Code size, duplication, dead code
- Largest files: `finance-service.ts` 2,661 · `warehouse-service.ts` 2,070 · `people-service.ts` 1,952 · `production-service.ts` 1,940 · `quality-service.ts` 1,888 · `procurement-service.ts` 1,848 · `services/database.ts` 1,719. Files this big = hard to test/change.
- Duplication: audit-log insert helper re-implemented per router; `fetchWithAuth` copy-pasted in several `src/services/*Api.ts` (batch, production, formulation, quality) with a **hard-coded fallback bearer token**; marketplace clients (Amazon/Flipkart/Myntra) share the same structure copy-pasted.
- Dead/placeholder: `ModulePlaceholder` landing pages (`/operations`, `/distribution`), dead placeholder branches for quality/warehouse (`OperationsPage.tsx:87-140`), `src/database/schema.sql`, unused deps above, `/api/auth/profile` is never called by the client. (Whole-repo unused-file analysis: UNVERIFIED — use the Graphify graph "isolated nodes" list.)

## 4. Architecture questions (Step 2)
**4.1 Real backend?** Yes. Express, 30 routers, 709 URL rows (`01a`). **Auth required on any of them: none** (95 have no tenant input at all; 614 read `x-organization-id` / `organizationId` from the client). Plus 6 raw routes in `server.ts` incl. `POST /api/db/query` (arbitrary SQL) and `ALL /api/db/init`.

**4.2 Real database?** Yes — PostgreSQL via raw `pg` (`src/server/db.ts`), **no ORM**, no migration tool: 28 functions run in order on every boot. 227 tables (`01b`); 202 carry `organization_id`. Seeding: migrations contain ~293 `INSERT` statements incl. demo invoices (`migrate-finance.ts:630-780`) and demo marketplace orders. **Separate from this, the Settings area keeps org/branches/departments/warehouses/units/roles/users/business-settings/audit-logs in browser localStorage** (`src/services/database.ts`, 0 `fetch` calls, seeds from `INITIAL_*` constants). The server has its own `users/roles/...` tables — two unsynchronised sources of truth.

**4.3 Authentication & authorization**
- Login: `src/services/auth.ts` tries InsForge `signInWithPassword`; on any failure it **falls through to a "direct database" path with no password check** that finds-or-creates a user from the browser-side store. `isSuper = email includes 'admin' | 'architect' | founder email` (`auth.ts:~88, ~123`). Session = random string saved in localStorage (`jyotsvan_user`).
- API calls send `Authorization: Bearer <that string or a hard-coded default>` plus `x-user-email`; **the server never validates them**.
- RBAC: permissions are computed in the browser (`accessControl.ts`) and only hide screens. **UI-only.**

**4.4 Multi-tenancy:** concept exists (`organizations`, `organization_id` on 202/227 tables, queries filter by it). Not enforced: tenant comes from the client; no RLS; fallback `LIMIT 1` org; two spellings of the seed tenant (`org-jyotsvan-corp` ×154, `org-jyotsvan-core` in `meta-routes.ts`, `metaAnalyticsApi.ts`). Tables without `organization_id` are mostly child/line tables (OK) plus `permissions`, `role_permissions`, `integration_providers` (global catalogues). Effort to make real: moderate (add auth context + RLS policies + tests; no schema rewrite) — see `06`.

**4.5 Data flow:** pages → `src/services/*Api.ts` → `/api/*` → service classes → SQL. Modules are **connected at the database/service level in the operations & sales chain** (stock ledger ← GRN, production, transfers, fulfillment, returns), **but not through a shared accounting layer or event bus** (see `03`). Shared party model: **none** (separate tables for suppliers, distributors, retailers, employees, CRM accounts, customers-in-invoices). Single stock ledger: yes (`inventory_movements`/`inventory_balances`). Accounting postings: no.

**4.6 AI:** key read on server only (`ai-foundation-service.ts:27`, `process.env.GEMINI_API_KEY`) — good, not in client bundle. Features: copilot Q&A, insights, recommendations, "controlled actions" with approval table. Tool registry (`ai-tool-registry.ts:112-125`) **returns hard-coded revenue 4,850,000 and 1,420 orders when the query fails or is empty**. Endpoints unauthenticated, so anyone can burn the Gemini quota.

**4.7 Integrations** — see `02` table: all external providers are **stubs or simulated**; only settings cards for WhatsApp/SMTP/Razorpay/Shiprocket (`migrate-integrations.ts`).

**4.8 Code quality:** consistent folder naming and design system (good); weak: 1,209 `any`, no validation lib (hand-rolled checks), 22 empty `catch` blocks, raw DB errors returned to clients, 355 console logs, giant files, zero tests, accessibility/performance not measured (UNVERIFIED), single 4.2 MB bundle, responsiveness UNVERIFIED (run the app on a phone-sized viewport).
