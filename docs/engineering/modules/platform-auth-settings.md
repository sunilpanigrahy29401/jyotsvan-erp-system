# Platform: Auth, RBAC, Settings, Audit, Notifications

Generated from repository structure on 2026-11-04 (file map, tables, sizes) + audit notes. Status/classification: see ../IMPLEMENTATION_STATUS.md. Risks: ../KNOWN_ISSUES.md, ../SECURITY_ARCHITECTURE.md.

## Foundation/Auth/RBAC
- Migration: `src/server/db.ts`
- Tables (13): `audit_logs`, `branches`, `business_settings`, `departments`, `organizations`, `permissions`, `role_permissions`, `roles`, `units`, `user_roles`, `users`, `warehouse_locations`, `warehouses`
- UI/client: `src/modules/auth/*`, `src/context/AuthContext.tsx`, `src/services/auth.ts`, `src/services/accessControl.ts`, `src/services/insforge.ts`, `src/config/*` (~2039 lines)
- Notes: Client-side RBAC only; /api/auth/profile unauthenticated. Seed in db.ts + seed.ts (syncFoundationData).

## Settings
- UI/client: `src/app/pages/settings/*`, `src/app/pages/SettingsPage.tsx` (~10528 lines)
- Notes: Org/branch/users/roles/units/departments/warehouses/audit/integrations UIs; backend spread over platform routers.

## Audit
- Migration: `src/server/migrate-audit-logs.ts`
- Tables (2): `audit_logs`, `audit_retention_policies`
- Server: `src/server/audit-routes.ts`, `src/server/audit-service.ts`
- UI/client: `src/app/pages/settings/AuditLogsSettings.tsx`, `src/services/auditApi.ts` (~1628 lines)
- Notes: Actor/org are client-supplied -> forgeable.

## Notifications
- Migration: `src/server/migrate-notifications.ts`
- Tables (4): `notification_category_preferences`, `notification_outbox`, `notification_preferences`, `notifications`
- Server: `src/server/notification-routes.ts`, `src/server/notification-service.ts`
- UI/client: `src/app/pages/NotificationCenterPage.tsx`, `src/services/notifications-api.ts` (~1018 lines)
- Notes: In-app only; no websocket/email/SMS code.
