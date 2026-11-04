# Jyotsvan Enterprise Platform — Integration Specification

## 1. Overview & Security Guidelines

External platform integrations represent major subsystems of Jyotsvan. In **Phase 1**, all external integrations are strictly deferred.

### Core Security Mandates:
1. **Never Call Third-Party APIs from Browser**: Browser clients are strictly forbidden from directly calling external APIs.
2. **Server-Side Proxying**: All future integrations (Shopify, Amazon, Meta Ads, Google Ads) will execute through secure, server-side Node.js / Express or Edge API routes.
3. **Secret Isolation**: Integration API keys, OAuth client secrets, and webhooks secrets will be secured exclusively on the backend server environment.

---

## 2. Planned Integration Connectors

### 2.1. Meta Ads & Google Ads
*Planned for Phase 10*
- **Endpoints**: Graph API (Meta Marketing API) & Google Ads API v17+.
- **Data Ingest**: Daily ad spend, impressions, CTR, CPC, conversion events.
- **Security**: OAuth 2.0 refresh tokens stored encrypted at rest.

### 2.2. E-Commerce Platforms (Shopify)
*Planned for Phase 9*
- **Endpoints**: Shopify Admin GraphQL API & Webhooks.
- **Sync**: Catalog synchronization, inventory levels, order creation webhooks.

### 2.3. Marketplaces (Amazon SP-API, Flipkart, Myntra)
*Planned for Phase 9*
- **Endpoints**: Selling Partner API (Amazon), Flipkart Seller API, Myntra Partner Portal.
- **Sync**: Order ingestion, dispatch tracking, inventory reservations.

### 2.4. Tax & E-Way Bill Integration
*Planned for Phase 8*
- **Endpoints**: Government GST / E-Way bill API gateway.
- **Sync**: Automated IRN generation and signed QR code embedding.
