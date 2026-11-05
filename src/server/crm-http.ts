// Shared HTTP plumbing for the CRM routers: verified context from req.auth, uniform envelope, safe error mapping.
import type { Request, RequestHandler, Response } from 'express';
import { CrmError, type Actor } from './crm-core.ts';

export function ctx(req: Request): { orgId: string; actor: Actor } {
  const a = req.auth;
  if (!a) throw new CrmError('Authentication required.', 401, 'UNAUTHENTICATED');
  return { orgId: a.organizationId, actor: { id: a.userId, email: a.email, name: a.fullName } };
}

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;

/** Wraps a handler: returns {success:true,data} (or the handler's {data,total,...} object), maps CrmError, hides internals. */
export function route(fn: Handler, status = 200): RequestHandler {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      if (res.headersSent) return;
      if (out && typeof out === 'object' && '__envelope' in (out as object)) {
        const { __envelope, ...rest } = out as Record<string, unknown>;
        return res.status(status).json({ success: true, ...rest });
      }
      res.status(status).json({ success: true, data: out });
    } catch (e: any) {
      if (e instanceof CrmError) {
        return res.status(e.status).json({ success: false, error: e.message, code: e.code, ...(e.extra || {}) });
      }
      // Postgres integrity errors that a client can act on.
      if (e?.code === '23505') return res.status(409).json({ success: false, error: 'A record with the same unique value already exists.', code: 'CONFLICT' });
      if (e?.code === '23503') return res.status(409).json({ success: false, error: 'The record is referenced by, or references, another record that does not exist.', code: 'REFERENCE' });
      if (e?.code === '22P02' || e?.code === '22007' || e?.code === '22008') return res.status(400).json({ success: false, error: 'A value has an invalid format.', code: 'INVALID_FORMAT' });
      console.error('[CRM] unhandled error', req.method, req.path, e?.message || e);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  };
}

/** Marks a result as a list envelope with extra top-level keys (e.g. total). */
export function list<T>(data: T[], extra: Record<string, unknown> = {}) {
  return { __envelope: true, data, ...extra };
}
