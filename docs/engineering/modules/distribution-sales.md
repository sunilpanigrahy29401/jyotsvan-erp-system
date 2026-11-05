# Distribution & Sales: C&F, Distributors, Retailers, Sales Orders, Field Sales

Generated from repository structure on 2026-11-04 (file map, tables, sizes) + audit notes. Status/classification: see ../IMPLEMENTATION_STATUS.md. Risks: ../KNOWN_ISSUES.md, ../SECURITY_ARCHITECTURE.md.

## C&F
- Migration: `src/server/migrate-cfs.ts`
- Tables (11): `cf_addresses`, `cf_contacts`, `cf_dispatch_items`, `cf_dispatches`, `cf_documents`, `cf_territories`, `cf_transfer_discrepancies`, `cf_transfer_items`, `cf_transfers`, `cf_warehouses`, `cfs`
- Server: `src/server/cf-routes.ts`, `src/server/cf-service.ts`
- UI/client: `src/app/pages/cf/*`, `src/services/cfApi.ts` (~4377 lines)
- Notes: Uses inventory-service.

## Distributors
- Migration: `src/server/migrate-distributors.ts`
- Tables (15): `distributor_addresses`, `distributor_assortments`, `distributor_cf_mappings`, `distributor_commercial_terms`, `distributor_contacts`, `distributor_discrepancies`, `distributor_documents`, `distributor_order_items`, `distributor_orders`, `distributor_returns`, `distributor_stock`, `distributor_transfer_items`, `distributor_transfers`, `distributors`, `territories`
- Server: `src/server/distributor-routes.ts`, `src/server/distributor-service.ts`, `src/server/distributor-inventory-service.ts`, `src/server/distributor-transfer-service.ts`
- UI/client: `src/app/pages/distributors/*`, `src/services/distributorApi.ts` (~4146 lines)
- Notes: Graphify parse errors in 5+ UI files (build passes).

## Retailers
- Migration: `src/server/migrate-retailers.ts`
- Tables (15): `retailer_addresses`, `retailer_assortments`, `retailer_commercial_terms`, `retailer_contacts`, `retailer_distributor_mappings`, `retailer_documents`, `retailer_follow_ups`, `retailer_order_request_items`, `retailer_order_requests`, `retailer_receiving_records`, `retailer_returns`, `retailer_salesperson_assignments`, `retailer_stock`, `retailer_visits`, `retailers`
- Server: `src/server/retailer-routes.ts`, `src/server/retailer-service.ts`
- UI/client: `src/app/pages/retailers/*`, `src/services/retailerApi.ts` (~4884 lines)

## Sales orders & returns
- Migration: `src/server/migrate-sales-orders.ts`
- Tables (8): `sales_order_dispatch_items`, `sales_order_dispatches`, `sales_order_items`, `sales_order_reservations`, `sales_order_status_history`, `sales_orders`, `sales_return_items`, `sales_returns`
- Server: `src/server/sales-order-routes.ts`, `src/server/sales-order-service.ts`, `src/server/sales-return-service.ts`, `src/server/pricing-service.ts`, `src/server/credit-service.ts`, `src/server/fulfillment-service.ts`
- UI/client: `src/app/pages/sales-orders/*`, `src/services/salesOrderApi.ts` (~4616 lines)
- Notes: O2C core: pricing + credit + fulfillment -> inventory.

## Field sales
- Migration: `src/server/migrate-field-sales.ts`
- Tables (7): `field_sales_order_drafts`, `field_sales_route_stops`, `field_sales_routes`, `field_sales_targets`, `field_sales_tasks`, `field_sales_visits`, `sales_territory_assignments`
- Server: `src/server/field-sales-routes.ts`, `src/server/field-sales-service.ts`
- UI/client: `src/app/pages/field-sales/*` (~4343 lines)
- Notes: Uses finance-service and sales-order-service.
