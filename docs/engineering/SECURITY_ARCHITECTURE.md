# SECURITY_ARCHITECTURE

Current state after the 2026-11-05 hardening. History of what was wrong: `docs/audit/04_SECURITY_AND_RISKS.md` and `KNOWN_ISSUES.md`.

## Request pipeline (every `/api` request)
```
helmet (HSTS, nosniff, frame-ancestors, CSP report-only in prod)
 -> JSON body (raw bytes kept for webhook signatures)
 -> PUBLIC: GET /api/health, POST /api/auth/{login,refresh,logout}, signed webhooks, CRM ingest (key), Meta OAuth return
 -> authenticate        verify JWT (HS256, issuer/audience, expiry) + live session + live user status
 -> enforceTenantContext overwrite tenant/actor headers, query and body with the verified session; run the rest inside the tenant's DB context
 -> enforcePermissions  deny by default: route -> permission module (src/server/core/permission-map.ts), GET=view, write=create|edit, DELETE=delete, approve verbs=approve
 -> router/service
```
`tests/unit/permission-map.test.ts` fails if any mounted route is neither public, authenticated-only, nor mapped.

## Identity
- Passwords: scrypt (N=16384), policy (10+ chars, mixed, not common, not containing the email name), constant-time verify, same error for unknown user and wrong password.
- Sessions: 15-minute access token (memory only in the browser) + 30-day rotating refresh token in an `httpOnly; SameSite=Strict; Path=/api/auth` cookie (`Secure` in production). Refresh requires a custom header (CSRF). Reuse of an old refresh token revokes the session. Logout, deactivation, role change and password change invalidate sessions/caches immediately.
- Lockout: 5 failures -> 15 minutes; per-IP rate limit on login/refresh/change-password.
- Admin-issued passwords are temporary (`must_change_password`): the API blocks everything except `/api/auth/*` until changed.

## Authorization
- Permission codes `module.action` (view/create/edit/delete/approve/manage); super admin (`is_super_admin` or `*:*`) bypasses. Payroll is its own module.
- Admin API rules (`core/admin-routes.ts`): no privilege escalation (cannot grant permissions you lack, cannot create/modify super admins or assign the super-admin role unless super admin), no self-lockout/self-delete, system roles protected, every change audited.
- AI tools: permissions come only from the session; role *names* grant nothing.

## Tenant isolation
1. Application layer: tenant is forced from the session (above).
2. Database layer (opt-in, tested): PostgreSQL RLS on every table with `organization_id`, driven by `app.tenant_id` set per connection and cleared on release; no context = no rows. Requires a restricted DB role (runbook §6). **Disabled by default.**

## Secrets and transport
- `SESSION_SECRET`, `ENCRYPTION_SECRET` mandatory in production (process exits otherwise). Only `VITE_*` reaches the browser.
- DB TLS verified; dev opt-out refused in production.
- Integration credentials AES-256-GCM encrypted at rest; webhook secrets used as HMAC keys; webhooks fail closed.
- Public HTML endpoint (Meta OAuth return) escapes all input, sets its own CSP, posts to same origin only.

## Audit
Single writer `core/audit.ts` (actor/tenant from the session). Login, failed login, logout, password change/reset, user and role administration are logged. Other routers still use their own per-router audit helpers reading the (now trustworthy) forced identity headers.

## Not yet done
Field-level encryption/masking of PAN/UAN/bank data; per-tenant webhook secrets for CRM intake; SSRF guard on all outbound URLs (only the custom REST adapter has it); 2FA/OTP; shared-store rate limiting; append-only audit table with DB-level denial of UPDATE/DELETE; Meta OAuth state signing; penetration test.
