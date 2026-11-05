# Commerce, Marketing & Integrations

Generated from repository structure on 2026-11-04 (file map, tables, sizes) + audit notes. Status/classification: see ../IMPLEMENTATION_STATUS.md. Risks: ../KNOWN_ISSUES.md, ../SECURITY_ARCHITECTURE.md.

## Integration engine
- Migration: `src/server/migrate-integrations.ts`
- Tables (7): `integration_connections`, `integration_credentials`, `integration_events`, `integration_logs`, `integration_providers`, `integration_sync_jobs`, `integration_webhooks`
- Server: `src/server/integration-routes.ts`, `src/server/integration-service.ts`, `src/server/crypto-vault.ts`
- UI/client: `src/app/pages/settings/integrations/*`, `src/services/integrationApi.ts` (~2322 lines)
- Notes: Provider catalog + encrypted credentials; adapter-registry has simulated sandbox.

## Shopify
- Migration: `src/server/migrate-shopify.ts`
- Tables (3): `integration_entity_mappings`, `shopify_sync_checkpoints`, `shopify_sync_exceptions`
- Server: `src/server/shopify-routes.ts`, `src/server/shopify-service.ts`
- UI/client: `src/app/pages/commerce/ShopifyCommercePage.tsx`, `src/services/shopifyApi.ts` (~1546 lines)

## Meta Ads
- Migration: `src/server/migrate-meta-ads.ts`
- Tables (8): `marketing_ad_accounts`, `marketing_ad_sets`, `marketing_ads`, `marketing_breakdown_insights`, `marketing_campaigns`, `marketing_creatives`, `marketing_daily_insights`, `marketing_sync_exceptions`
- Server: `src/server/meta-routes.ts`, `src/server/meta-service.ts`
- UI/client: `src/app/pages/marketing/*`, `src/services/metaApi.ts`, `src/services/metaAnalyticsApi.ts` (~10174 lines)
- Notes: Sandbox simulation when placeholder token.

## Google Ads
- Migration: `src/server/migrate-google-ads.ts`
- Tables (9): `google_ads_accounts`, `google_ads_ad_groups`, `google_ads_campaigns`, `google_ads_conversion_actions`, `google_ads_daily_insights`, `google_ads_devices`, `google_ads_keywords`, `google_ads_locations`, `google_ads_search_terms`
- Server: `src/server/google-ads-routes.ts`, `src/server/google-ads-analytics-service.ts`
- UI/client: `src/services/googleAdsAnalyticsApi.ts` (~247 lines)

## Amazon
- Migration: `src/server/migrate-amazon.ts`
- Tables (11): `marketplace_entity_mappings`, `marketplace_fees`, `marketplace_inventory`, `marketplace_marketplaces`, `marketplace_order_items`, `marketplace_orders`, `marketplace_products`, `marketplace_reports`, `marketplace_returns`, `marketplace_settlements`, `marketplace_sync_checkpoints`
- Server: `src/server/amazon-routes.ts`, `src/server/amazon-service.ts`
- UI/client: `src/app/pages/commerce/amazon/*`, `src/services/amazonApi.ts` (~3209 lines)
- Notes: Simulated token even on live failure.

## Flipkart
- Migration: `src/server/migrate-flipkart.ts`
- Tables (1): `marketplace_performance`
- Server: `src/server/flipkart-routes.ts`, `src/server/flipkart-service.ts`
- UI/client: `src/app/pages/commerce/flipkart/*`, `src/services/flipkartApi.ts` (~2307 lines)

## Myntra
- Migration: `src/server/migrate-myntra.ts`
- Server: `src/server/myntra-routes.ts`, `src/server/myntra-service.ts`
- UI/client: `src/services/myntraApi.ts` (~159 lines)
- Notes: Migration seeds provider only.

## Marketplace hub
- Server: `src/server/marketplace-hub-routes.ts`, `src/server/marketplace-hub-service.ts`
- UI/client: `src/app/pages/commerce/*` (~9000 lines)
- Notes: 1 route handler.
