# Jyotsvan Enterprise Platform — Permissions & RBAC Matrix

## 1. Role-Based Access Control Architecture (Phase 1)

Jyotsvan enforces enterprise multi-tenant RBAC with three core tiers:
1. **User Identity**: Managed via InsForge Authentication (`users` table).
2. **Security Roles**: Assigned to users (`roles` and `user_roles` junction).
3. **Granular Permissions**: System-wide capability tokens adhering to `<subsystem>:<action>`.

---

## 2. Standard Baseline Roles (Phase 1 Initial Structure)

| Role Name | Slug | Purpose & Scope |
| :--- | :--- | :--- |
| **Super Admin** | `super_admin` | Unrestricted platform access, tenant configuration, and master data management. |
| **Organization Admin** | `org_admin` | Enterprise-wide administrative control, branch configuration, user provisioning. |
| **Operations Manager** | `operations_manager` | Control over manufacturing, warehouse, and inventory flows. |
| **Sales Director** | `sales_director` | Access to distribution, orders, invoices, and commercial sales teams. |
| **Finance Controller** | `finance_controller` | Authority over general ledgers, payment approvals, and invoices. |
| **Standard Operator** | `operator` | Limited execution access within designated branch or warehouse. |

---

## 3. Permission Code Standards

Permission strings follow the schema:
`[module]:[resource]:[action]`

Examples:
- `org:branch:create`
- `inventory:stock:adjust`
- `manufacturing:workorder:approve`
- `distribution:distributor:create`
- `finance:invoice:settle`
- `settings:security:update`

---

## 4. Planned Permissions by Subsystem
*Planned for implementation in future phases as respective functional modules are developed:*

- **Phase 3 (Org & Master Data)**: `org:manage`, `branch:create`, `branch:edit`, `user:invite`, `role:assign`
- **Phase 4 (Inventory)**: `inventory:read`, `inventory:adjust`, `inventory:transfer`, `inventory:count`
- **Phase 5 (Procurement)**: `procurement:pr:create`, `procurement:po:approve`, `procurement:grn:receive`
- **Phase 6 (Manufacturing)**: `manufacturing:bom:edit`, `manufacturing:batch:release`, `quality:inspect`
- **Phase 7 (Distribution)**: `distribution:distributor:manage`, `sales:beat:assign`, `sales:order:create`
- **Phase 8 (Finance & Invoices)**: `finance:invoice:issue`, `finance:payment:record`, `finance:report:export`
- **Phase 10 (Marketing)**: `marketing:ads:view`, `marketing:campaign:sync`
- **Phase 12 (AI & Copilot)**: `ai:copilot:query`, `ai:recommendation:execute`
