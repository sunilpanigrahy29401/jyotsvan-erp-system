// Authenticated gateway to separately-run open-source modules (HRMS, GST billing).
//
// Those projects keep their own data stores and run as their own processes. They are NOT exposed to the internet:
// every request must first pass this server's authenticate -> tenant -> permission chain (mounted under /api/ext),
// and is then forwarded to an upstream URL that only the operator can set through the environment.
//
//   HRMS_UPSTREAM_URL         e.g. http://127.0.0.1:4100   (Euron Open HRMS API)
//   GST_BILLING_UPSTREAM_URL  e.g. http://127.0.0.1:4200   (Free GST Billing server)
//
// Nothing is faked: an unset upstream answers 409 "not connected", an unreachable one answers 502.
import http from 'http';
import https from 'https';
import { Router, type Request, type Response } from 'express';

export interface ExtService {
  id: string;
  label: string;
  env: string;
  description: string;
}

export const EXT_SERVICES: ExtService[] = [
  { id: 'hrms', label: 'Euron Open HRMS', env: 'HRMS_UPSTREAM_URL', description: 'Employees, attendance, leave, payroll, onboarding (separate service and database).' },
  { id: 'gst-billing', label: 'Free GST Billing', env: 'GST_BILLING_UPSTREAM_URL', description: 'GST invoices, GSTR-1/3B, TDS/TCS (separate service, file-based store).' },
];

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length']);
// Never forwarded upstream: our bearer/session, and anything that could impersonate a verified identity.
const NEVER_FORWARD = new Set(['authorization', 'cookie', 'x-jyotsvan-user', 'x-jyotsvan-org', 'x-jyotsvan-email', 'x-forwarded-host']);
const NEVER_RETURN = new Set(['set-cookie', 'set-cookie2']);
const TIMEOUT_MS = Number(process.env.EXT_PROXY_TIMEOUT_MS || 30_000);

/** The configured upstream base URL, or null if unset/invalid. Only http(s) without embedded credentials is accepted. */
export function upstreamOf(svc: ExtService, env: NodeJS.ProcessEnv = process.env): URL | null {
  const raw = (env[svc.env] || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.username || u.password) return null;
    return u;
  } catch {
    return null;
  }
}

/** Joins the client path onto the upstream base, refusing traversal. Returns null when the path is not acceptable. */
export function buildTarget(base: URL, subPath: string, search: string): URL | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(subPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.split(/[\\/]/).some((s) => s === '..')) return null;
  const basePath = base.pathname.replace(/\/+$/, '');
  const target = new URL(base.toString());
  target.pathname = `${basePath}/${subPath.replace(/^\/+/, '')}`;
  target.search = search;
  return target;
}

function request(target: URL, init: { method: string; headers: Record<string, string>; body?: Buffer | Request }, cb: (res: http.IncomingMessage) => void, onError: (e: Error) => void): http.ClientRequest {
  const lib = target.protocol === 'https:' ? https : http;
  const req = lib.request(target, { method: init.method, headers: init.headers, timeout: TIMEOUT_MS }, cb);
  req.on('timeout', () => req.destroy(new Error('Upstream timed out.')));
  req.on('error', onError);
  return req;
}

async function probe(base: URL): Promise<{ reachable: boolean; httpStatus?: number; error?: string }> {
  return new Promise((resolve) => {
    const r = request(base, { method: 'GET', headers: { accept: '*/*' } }, (res) => {
      res.resume();
      resolve({ reachable: true, httpStatus: res.statusCode });
    }, (e) => resolve({ reachable: false, error: e.message }));
    r.setTimeout(2500);
    r.end();
  });
}

export const extRouter = Router();

/** Which upstreams are configured and reachable. Reflects real state only. */
extRouter.get('/status', async (_req, res) => {
  const services = await Promise.all(
    EXT_SERVICES.map(async (s) => {
      const base = upstreamOf(s);
      if (!base) return { id: s.id, label: s.label, description: s.description, configured: false, reachable: false, hint: `Set ${s.env} to the URL of the running service.` };
      const p = await probe(base);
      return { id: s.id, label: s.label, description: s.description, configured: true, ...p };
    })
  );
  res.json({ success: true, data: services });
});

function forward(req: Request, res: Response, svc: ExtService, subPath: string) {
  const base = upstreamOf(svc);
  if (!base) {
    return res.status(409).json({ success: false, code: 'NOT_CONNECTED', error: `${svc.label} is not connected. Set ${svc.env} to its URL.` });
  }
  const target = buildTarget(base, subPath, req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  if (!target) return res.status(400).json({ success: false, code: 'BAD_PATH', error: 'Invalid path.' });

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase();
    if (HOP_BY_HOP.has(key) || NEVER_FORWARD.has(key) || v === undefined) continue;
    headers[key] = Array.isArray(v) ? v.join(', ') : v;
  }
  // Identity is derived from the verified session only; the client cannot supply it.
  if (req.auth) {
    headers['x-jyotsvan-user'] = req.auth.userId;
    headers['x-jyotsvan-org'] = req.auth.organizationId;
    if (req.auth.email) headers['x-jyotsvan-email'] = req.auth.email;
  }
  headers['x-forwarded-for'] = req.ip || '';
  headers['x-forwarded-proto'] = req.protocol;

  // express.json() may already have consumed a JSON body: replay the exact bytes. Otherwise stream the request through.
  const replay = typeof req.rawBody === 'string' ? Buffer.from(req.rawBody, 'utf8') : null;
  if (replay) headers['content-length'] = String(replay.length);

  const up = request(
    target,
    { method: req.method, headers },
    (ur) => {
      res.status(ur.statusCode || 502);
      for (const [k, v] of Object.entries(ur.headers)) {
        const key = k.toLowerCase();
        if (HOP_BY_HOP.has(key) || NEVER_RETURN.has(key) || v === undefined) continue;
        res.setHeader(k, v as string | string[]);
      }
      ur.pipe(res);
    },
    (e) => {
      if (!res.headersSent) res.status(502).json({ success: false, code: 'UPSTREAM_ERROR', error: `${svc.label} did not respond (${e.message}).` });
      else res.destroy();
    }
  );
  if (replay) up.end(replay);
  else if (req.method === 'GET' || req.method === 'HEAD') up.end();
  else req.pipe(up);
}

for (const svc of EXT_SERVICES) {
  extRouter.all(`/${svc.id}`, (req, res) => forward(req, res, svc, ''));
  extRouter.all(new RegExp(`^/${svc.id}/(.*)$`), (req, res) => forward(req, res, svc, req.params[0] || ''));
}
