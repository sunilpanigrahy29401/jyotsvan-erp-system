// Express middleware: authentication, tenant context enforcement, rate limiting.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyAccessToken } from './tokens.ts';
import { loadPrincipal, type Principal } from './auth-store.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: Principal;
    }
  }
}

const PRINCIPAL_TTL_MS = 15_000;
const principalCache = new Map<string, Principal>();

export function invalidatePrincipalCache(userId?: string) {
  if (!userId) return principalCache.clear();
  for (const [k, v] of principalCache) if (v.userId === userId) principalCache.delete(k);
}

async function getPrincipal(userId: string, sessionId: string): Promise<Principal | null> {
  const key = `${userId}:${sessionId}`;
  const hit = principalCache.get(key);
  if (hit && Date.now() - hit.loadedAt < PRINCIPAL_TTL_MS) return hit;
  const fresh = await loadPrincipal(userId, sessionId);
  if (fresh) principalCache.set(key, fresh);
  else principalCache.delete(key);
  if (principalCache.size > 5000) principalCache.clear();
  return fresh;
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t || null;
}

/** Verifies the access token and loads the live principal. Responds 401 on any failure. */
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
    const claims = await verifyAccessToken(token);
    if (!claims) return res.status(401).json({ error: 'Invalid or expired session.', code: 'TOKEN_INVALID' });
    const principal = await getPrincipal(claims.sub, claims.sid);
    if (!principal || principal.organizationId !== claims.org) {
      return res.status(401).json({ error: 'Session is no longer valid.', code: 'SESSION_REVOKED' });
    }
    if (principal.mustChangePassword && !req.originalUrl.startsWith('/api/auth/')) {
      return res.status(403).json({ error: 'Password change required.', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    req.auth = principal;
    next();
  } catch (err) {
    console.error('[Auth] middleware failure', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Authentication service unavailable.' });
  }
};

/**
 * Forces tenant and actor identity to the verified principal, overriding anything the client sent.
 * Legacy routers read the tenant from query/body/headers (with hard-coded fallbacks); this makes all of
 * those inputs trustworthy until each router is migrated to read req.auth directly.
 */
export const enforceTenantContext: RequestHandler = (req, _res, next) => {
  const a = req.auth;
  if (!a) return next();
  req.headers['x-organization-id'] = a.organizationId;
  req.headers['x-user-id'] = a.userId;
  req.headers['x-user-email'] = a.email;
  req.headers['x-user-name'] = a.fullName;

  const q = req.query as Record<string, unknown>;
  q.organizationId = a.organizationId; // legacy routers fall back to a constant tenant when this is absent
  for (const k of ['orgId', 'organization_id', 'org_id']) if (k in q) q[k] = a.organizationId;
  if ('userId' in q && !a.isSuperAdmin) q.userId = a.userId;

  const b = req.body;
  if (b && typeof b === 'object' && !Array.isArray(b)) {
    for (const k of ['organizationId', 'organization_id', 'orgId', 'org_id']) if (k in b) b[k] = a.organizationId;
  }
  next();
};

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
  if (!req.auth.isSuperAdmin && !req.auth.permissions.has('*:*')) {
    return res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
  }
  next();
};

interface Bucket { count: number; resetAt: number }

/** In-memory fixed-window limiter. Per-process only: use a shared store (Redis) when running multiple instances. */
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string; message?: string }): RequestHandler {
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = opts.key ? opts.key(req) : req.ip || 'unknown';
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    res.setHeader('RateLimit-Limit', String(opts.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, opts.max - b.count)));
    if (b.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)));
      return res.status(429).json({ error: opts.message || 'Too many requests. Please slow down.', code: 'RATE_LIMITED' });
    }
    next();
  };
}
