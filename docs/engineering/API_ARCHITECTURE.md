# API_ARCHITECTURE

Single Express app (`server.ts`), JSON only (`express.json 10mb`), no versioning, no auth middleware, no global error handler, no validation library (hand-rolled per route). Frontend clients in `src/services/*Api.ts`.

## Core endpoints (server.ts)
`GET /api/health`, `GET /api/insforge/health`, `GET /api/db/status`, `GET /api/auth/profile`, `POST /api/db/query` (**arbitrary SQL**), `ALL /api/db/init` (**runs migrations**). See SECURITY_ARCHITECTURE.

## Router mounts (handler counts are `.get/.post/.put/.patch/.delete` occurrences)
| Mount | File | Handlers |
|---|---|---|
| `/api` (categories, products, SKUs…) | product-routes | 22 |
| `/api` | supplier-routes | 25 |
| `/api/inventory` | inventory-routes | 14 |
| `/api/warehouses`, `/api/warehouse-transfers`, `/api/warehouse-counts` | warehouse-routes (3 routers) | 27 |
| `/api/procurement` | procurement-routes | 23 |
| `/api/quality` | quality-routes | 20 |
| `/api/formulations` | formulation-routes | 14 |
| `/api/production` | production-routes | 20 |
| `/api/batches` | batch-routes | 15 |
| `/api/cfs` | cf-routes | 21 |
| `/api/distributors` | distributor-routes | 34 |
| `/api/retailers` | retailer-routes | 42 |
| `/api/sales-orders`, `/api/sales-returns` | sales-order-routes | 22 |
| `/api/finance` | finance-routes | 25 |
| `/api/field-sales` | field-sales-routes | 20 |
| `/api/people` | people-routes | 52 |
| `/api/crm` | crm-routes | 21 |
| `/api` | notification-routes / audit-routes | 13 / 11 |
| `/api/integrations` **and** `/api` | integration-routes | 21 (mounted twice) |
| `/api/integrations/shopify` + `/api/shopify` | shopify-routes | 16 (twice) |
| `/api/integrations/meta` + `/api/meta` | meta-routes | 29 (twice) |
| `/api/integrations/google-ads` + `/api/google-ads` | google-ads-routes | 13 (twice) |
| `/api/integrations/amazon` + `/api/amazon` | amazon-routes | 15 (twice) |
| `/api/integrations/flipkart` + `/api/flipkart` | flipkart-routes | 13 (twice) |
| `/api/integrations/myntra` + `/api/myntra` | myntra-routes | 15 (twice) |
| `/api/commerce/marketplaces` + `/api/marketplaces` | marketplace-hub-routes | 1 (twice) |
| `/api/analytics`, `/api/reports` | analytics-routes / reports-routes | 4 / 3 |
| `/api/ai` | ai-routes | 10 |
Total ≈ 580 handlers across 30 files.

## Patterns
- Routes -> static service classes (`XService.method(orgId, ...)`) -> `pool.query`. Thin controllers in some modules, inline SQL in others (product, supplier).
- Tenant & actor: from `organizationId` query / `x-organization-id` / `x-user-email|id` headers with silent fallbacks (SECURITY_ARCHITECTURE).
- Audit: each router re-implements `recordAudit()`.
- Errors: try/catch per handler, `res.status(500).json({error: message})` — leaks raw DB errors.
- Several routers mounted at bare `/api` (product, supplier, notification, audit, integration): path collisions are possible; mounting each integration router twice doubles surface and doubles any future middleware requirement.
- Third-party clients live in `src/server/integrations/` (adapter-registry, per-provider clients, generic webhook adapter); webhook handlers exist (Shopify `handleWebhook`) — signature verification not audited.
- AI: `ai-routes` -> foundation/insights/recommendations/actions services + `ai-tool-registry`; Gemini optional with fallbacks.

## Conventions to adopt for new endpoints
Mount under `/api/<module>`; require `authenticate` + `requirePermission`; take tenant from the session; validate input (zod or equivalent); never return raw `err.message`.
