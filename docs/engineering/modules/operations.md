# Operations: Products, Suppliers, Inventory, Warehouse, Procurement, QC, Formulation, Production, Batches

Generated from repository structure on 2026-11-04 (file map, tables, sizes) + audit notes. Status/classification: see ../IMPLEMENTATION_STATUS.md. Risks: ../KNOWN_ISSUES.md, ../SECURITY_ARCHITECTURE.md.

## Products & SKU
- Migration: `src/server/migrate-product-master.ts`
- Tables (4): `external_sku_mappings`, `product_documents`, `product_images`, `skus`
- Server: `src/server/product-routes.ts`
- UI/client: `src/app/pages/products/*`, `src/services/productService.ts` (~4335 lines)
- Notes: Inline SQL in routes; bare /api mount.

## Suppliers
- Migration: `src/server/migrate-supplier-master.ts`
- Tables (6): `supplier_addresses`, `supplier_contacts`, `supplier_documents`, `supplier_prices`, `supplier_skus`, `suppliers`
- Server: `src/server/supplier-routes.ts` (not found: supplier-service)
- UI/client: `src/app/pages/suppliers/*`, `src/services/supplierService.ts` (~4385 lines)

## Inventory
- Migration: `src/server/migrate-inventory-engine.ts`
- Tables (4): `inventory_balances`, `inventory_movements`, `stock_adjustments`, `stock_reservations`
- Server: `src/server/inventory-routes.ts`, `src/server/inventory-service.ts`
- UI/client: `src/app/pages/inventory/*`, `src/services/inventoryApi.ts` (~3961 lines)
- Notes: Central hub: warehouse, C&F, distributor transfer, QC, fulfillment, returns call it.

## Warehouse
- Migration: `src/server/migrate-warehouse-management.ts`
- Tables (5): `stock_count_items`, `stock_count_sessions`, `warehouse_assignments`, `warehouse_transfer_items`, `warehouse_transfers`
- Server: `src/server/warehouse-routes.ts`, `src/server/warehouse-service.ts`
- UI/client: `src/app/pages/warehouses/*` (~4818 lines)
- Notes: Three routers (warehouses, transfers, counts).

## Procurement
- Migration: `src/server/migrate-procurement.ts`
- Tables (7): `goods_receipt_items`, `goods_receipts`, `procurement_documents`, `purchase_order_items`, `purchase_orders`, `purchase_request_items`, `purchase_requests`
- Server: `src/server/procurement-routes.ts`, `src/server/procurement-service.ts`
- UI/client: `src/app/pages/procurement/*`, `src/services/procurementApi.ts` (~4353 lines)
- Notes: GRN->inventory link by SQL; verify.

## Quality
- Migration: `src/server/migrate-quality-control.ts`
- Tables (8): `notifications`, `qc_decisions`, `qc_documents`, `qc_inspection_items`, `qc_inspections`, `qc_parameters`, `qc_template_parameters`, `qc_templates`
- Server: `src/server/quality-routes.ts`, `src/server/quality-service.ts`
- UI/client: `src/app/pages/quality/*`, `src/services/qualityApi.ts` (~3362 lines)

## Formulation/BOM
- Migration: `src/server/migrate-formulations.ts`
- Tables (4): `formulation_components`, `formulation_costings`, `formulation_substitutions`, `formulations`
- Server: `src/server/formulation-routes.ts`, `src/server/formulation-service.ts`
- UI/client: `src/app/pages/formulations/*`, `src/services/formulationApi.ts` (~3371 lines)

## Production
- Migration: `src/server/migrate-production.ts`
- Tables (7): `production_material_issues`, `production_material_returns`, `production_order_components`, `production_orders`, `production_outputs`, `production_plans`, `production_wastages`
- Server: `src/server/production-routes.ts`, `src/server/production-service.ts`
- UI/client: `src/app/pages/production/*`, `src/services/productionApi.ts` (~4193 lines)
- Notes: Depends on quality-service.

## Batches
- Migration: `src/server/migrate-batches.ts`
- Tables (5): `batch_genealogy`, `batch_holds`, `batch_numbering_rules`, `batch_status_logs`, `batches`
- Server: `src/server/batch-routes.ts`, `src/server/batch-service.ts`
- UI/client: `src/app/pages/batches/*`, `src/services/batchApi.ts` (~3714 lines)
- Notes: Has resolveAuth helper (still trusts headers).
