# KNOWN_ISSUES

Severity: P0 blocker · P1 high · P2 medium · P3 low. "Verified" = reproduced via tooling or direct code read; "Static" = read from code, not executed.

| ID | Sev | Issue | Evidence | Status |
|---|---|---|---|---|
| KI-01 | P0 | Arbitrary SQL endpoint `POST /api/db/query`, no auth | server.ts:274 | Static |
| KI-02 | P0 | No authn/authz on any API route; tenant & actor taken from client | 29/30 routers have no auth refs; server.ts | Static |
| KI-03 | P0 | `/api/db/init` runs all migrations/seeds unauthenticated; migrations also run on every boot | server.ts:389, 415-420 | Static |
| KI-04 | P1 | Hard-coded fallback encryption key/salt for integration credentials | crypto-vault.ts:6,12 | Static |
| KI-05 | P1 | DB TLS verification disabled | db.ts `rejectUnauthorized:false` | Static |
| KI-06 | P1 | Unauthenticated recon: `/api/insforge/health`, `/api/db/status`, `/api/auth/profile?email=` | server.ts:98,188,220 | Static |
| KI-07 | P1 | CRM type errors (4): `CrmPage.tsx:86,87,88` (`onNavigate` prop mismatch); `LeadCaptureIntegrations.tsx:176` (`provider_key` vs `provider`) | `npx tsc --noEmit` | **Verified** |
| KI-08 | P1 | Zero automated tests, no CI | find *.test/spec = none | Verified |
| KI-09 | P1 | Integration clients fall back to simulated sessions/data (Amazon even after a *live* auth failure), risking false "connected" states | amazon-client.ts:71,101; flipkart-client.ts:60; meta-client.ts:55 | Static |
| KI-10 | P2 | No migration versioning; errors swallowed; `/api/db/init` always reports success:true | server.ts:337-397 | Static |
| KI-11 | P2 | 25 template-literal SQL strings need injection triage | grep in src/server | Static |
| KI-12 | P2 | Routers mounted twice (`/api/integrations/x` and `/api/x`) and several at bare `/api` → route collisions, double surface | server.ts:294-334 | Static |
| KI-13 | P2 | Doc contradictions: permissions 127 vs 333; roadmap phases A–G vs A–E; `audit_logs` columns differ between DATABASE_SCHEMA.md and JYOTSVAN_DATABASE_SCHEMA_REPORT.md; "131 tables" vs ~227 declared names; legacy docs say "zero TypeScript errors" (false: 4) | docs/*, tsc | Verified/Static |
| KI-14 | P2 | `src/database/schema.sql` stale (13 tables, UUID defaults) and conflicts with runtime schema (text IDs) | schema.sql vs db.ts | Static |
| KI-15 | P2 | Single 4.2 MB JS bundle (801 KB gzip); no code splitting | vite build | Verified |
| KI-16 | P2 | `/operations`, `/distribution` landing routes show "Phase N" placeholder; dead placeholder branches for quality/warehouse | OperationsPage.tsx:87-140, DistributionPage.tsx:31 | Static |
| KI-17 | P2 | Port hard-coded to 3000; package name `react-example`; unused dep `pg-mem` | server.ts:68, package.json | Verified |
| KI-18 | P2 | Health endpoints run `count(*)` on every table | server.ts:114-122,197-205 | Static |
| KI-19 | P3 | `ssl`/pool settings, no graceful shutdown, no global error handler; raw DB errors returned to clients | various | Static |
| KI-20 | P3 | Graphify parse errors in 9 `.tsx` files (5 named in distributors/); possibly parser limitation; `vite build` passes | graphify | Verified (tool), cause unconfirmed |
| KI-21 | P3 | `.env.example` lacks `ENCRYPTION_SECRET`, Google Ads, Shopify, Amazon, Flipkart, Myntra, port settings | .env.example | Verified |
| KI-22 | — | **Unverified**: DB connectivity, live table count, migration state, `npm run build` server bundle, real-time behaviour of every module | no credentials | Open |
