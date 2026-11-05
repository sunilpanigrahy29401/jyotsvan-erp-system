# MODULE_DEPENDENCIES

Sources: static imports (`from './x-service'`), Graphify queries (`graphify path`, `graphify explain`), graph god nodes. Direct cross-table SQL joins between modules are **not** captured by imports; assume more coupling than listed.

## Shared platform dependencies (everything depends on these)
| Shared piece | Used by | Notes |
|---|---|---|
| `pool` (`src/server/db.ts`, 87 edges) | all services/routes | single pg pool, max 25; every module shares connection budget |
| Foundation tables (organizations, branches, users, roles, permissions, units, departments) | all | seeded by `db.ts` + `syncFoundationData` |
| `audit-service` / `audit_logs` | AI actions, integrations, Shopify, Meta, Amazon, Flipkart, Myntra (+ ad-hoc inserts in other routers) | helper duplicated per router |
| `notification-service` | AI actions, all marketplace/ads services | no push channel implemented |
| `crypto-vault` | integration-service, provider migrations | hard-coded key fallback |
| FE: `AuthContext/useAuth` (79 edges), `accessControl`, `navigation.ts`, `components/ui` (Button, Badge, `cn`), `useToast` | all UI | |

## Server service dependency graph (verified imports)
```
inventory-service  <- warehouse-service, cf-service, distributor-transfer-service, quality-service, fulfillment-service, sales-return-service
quality-service    <- production-service
fulfillment-service, pricing-service, credit-service <- sales-order-service <- field-sales-service
finance-service    <- field-sales-service
audit + notification <- ai-actions, amazon, flipkart, myntra, shopify, meta
audit <- integration-service
```
Graph confirms O2C chain: `SalesOrderService -> fulfillment-service -> InventoryService` (EXTRACTED).
Inventory is the central write hub; changes to its movement/reservation API ripple into warehouse, C&F, distribution, QC, fulfillment, returns.

## Cross-module workflows (intended; code paths partially evidenced)
- **P2P**: supplier -> procurement (PO) -> GRN -> QC inspection -> inventory receipt (procurement->inventory link is by SQL, not service import — verify).
- **Manufacturing**: formulation (BOM) -> production work order -> material issue (inventory) -> QC -> batch/genealogy -> finished stock.
- **O2C**: retailer/distributor -> sales order (pricing + credit check + reservation) -> fulfillment/dispatch -> invoice/payments (finance) -> returns (inventory).
- **Field sales**: beat visit/order capture -> sales-order + finance collections.
- **Commerce sync**: provider clients -> marketplace hub -> products/SKU mapping, orders, stock; audit + notifications.
- **AI**: tool registry reads analytics/domain datasets; actions go through audit/notification (human-in-the-loop table `ai_actions`).

## Ownership boundaries (proposed, derived from directory + router + migration alignment)
Platform (auth, settings, RBAC, audit, notifications, integrations core) · Operations (products…batches) · Distribution & Sales (cf…field-sales) · Finance · People · CRM · Commerce · Marketing · Analytics/AI. A change in one owner's shared tables (products/SKUs, inventory ledger, users/roles) is a cross-boundary change and needs impact review via `graphify query`.

## Frontend module independence
Page dirs import mostly from `components/`, `services/`, `context/`; only 2 cross-page imports (marketing/commerce). Modules are UI-independent; coupling is server/DB side.

## Graph caveats
9 distributor `.tsx` files parsed partially; `src/main.tsx`, `vite.config.ts`, barrels yielded no symbols; docs/SQL included. Unresolved dependency work: map procurement->inventory, finance->sales-orders, people->finance (payroll) by reading SQL, not imports.
