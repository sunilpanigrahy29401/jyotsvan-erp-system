// "This tenant has not connected that integration" is a normal state, not a server fault.
// The integration services throw plain Errors that the routers turn into HTTP 500. This middleware rewrites those
// specific, recognisable messages to 409 with a stable code so the UI (and monitoring) can tell them apart from real failures.
import type { RequestHandler } from 'express';

const NOT_CONNECTED = /(connection '[^']+' not found|no [a-z\- ]+ connection found|integration is not configured|not configured for this organization)/i;

export const mapNotConnected: RequestHandler = (_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 500 && body && typeof body === 'object') {
      const message = String((body as { error?: unknown; message?: unknown }).error ?? (body as { message?: unknown }).message ?? '');
      if (NOT_CONNECTED.test(message)) {
        res.status(409);
        return originalJson({ ...(body as object), code: 'NOT_CONNECTED' });
      }
    }
    return originalJson(body);
  }) as typeof res.json;
  next();
};
