# Analytics, Reports, Command Center & AI

Generated from repository structure on 2026-11-04 (file map, tables, sizes) + audit notes. Status/classification: see ../IMPLEMENTATION_STATUS.md. Risks: ../KNOWN_ISSUES.md, ../SECURITY_ARCHITECTURE.md.

## Analytics/Reports
- Server: `src/server/analytics-routes.ts`, `src/server/reports-routes.ts`, `src/server/analytics-engine-service.ts`
- UI/client: `src/app/pages/CommandCenterPage.tsx`, `src/app/pages/BusinessPage.tsx`, `src/app/pages/business/*` (~1465 lines)

## AI
- Migration: `src/server/migrate-ai-tables.ts`
- Tables (4): `ai_actions`, `ai_insights`, `ai_query_logs`, `ai_recommendations`
- Server: `src/server/ai-routes.ts`, `src/server/ai-foundation-service.ts`, `src/server/ai-insights-service.ts`, `src/server/ai-recommendations-service.ts`, `src/server/ai-actions-service.ts`, `src/server/ai-tool-registry.ts`
- UI/client: `src/app/pages/ai/*`, `src/app/pages/AiPage.tsx` (~1149 lines)
- Notes: Gemini optional; sample fallbacks; actions need authz + audit before enabling execution.
