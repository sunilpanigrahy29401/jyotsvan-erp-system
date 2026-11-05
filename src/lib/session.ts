// Browser-side session handling.
// - The short-lived ACCESS token lives only in memory (never localStorage, so XSS cannot steal a long-lived credential).
// - The REFRESH token is an httpOnly, SameSite=Strict cookie managed by the server; JavaScript cannot read it.
// - A global fetch wrapper attaches the access token to same-origin /api calls and transparently refreshes once on 401.
import type { AuthUser } from '../types/auth';

export interface SessionPayload {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

const CSRF_HEADERS = { 'X-Requested-With': 'jyotsvan-web' };
let accessToken: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<SessionPayload | null> | null = null;

type Listener = (user: AuthUser | null) => void;
const listeners = new Set<Listener>();

export function onSessionChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function notify(user: AuthUser | null) {
  listeners.forEach((l) => l(user));
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function applySession(p: SessionPayload) {
  accessToken = p.accessToken;
  if (refreshTimer) clearTimeout(refreshTimer);
  // Refresh a little before the access token expires.
  const delayMs = Math.max(30, p.expiresIn - 60) * 1000;
  refreshTimer = setTimeout(() => void refreshSession(), delayMs);
  notify(p.user);
}

export function clearSession() {
  accessToken = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  notify(null);
}

/** Single-flight refresh using the httpOnly cookie. Resolves null when there is no valid session. */
export function refreshSession(): Promise<SessionPayload | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await rawFetch('/api/auth/refresh', { method: 'POST', headers: CSRF_HEADERS, credentials: 'same-origin' });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const body = (await res.json()) as SessionPayload;
      applySession(body);
      return body;
    } catch {
      return null; // network error: keep the in-memory session, caller may retry
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function loginRequest(email: string, password: string): Promise<SessionPayload> {
  const res = await rawFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
    body: JSON.stringify({ email, password }),
    credentials: 'same-origin',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Login failed.');
  applySession(body as SessionPayload);
  return body as SessionPayload;
}

export async function logoutRequest(): Promise<void> {
  try {
    await rawFetch('/api/auth/logout', { method: 'POST', headers: CSRF_HEADERS, credentials: 'same-origin' });
  } finally {
    clearSession();
  }
}

// ---- global fetch wrapper ------------------------------------------------------------------
const nativeFetch: typeof fetch | null = typeof window !== 'undefined' ? window.fetch.bind(window) : null;

function rawFetch(input: RequestInfo | URL, init?: RequestInit) {
  return (nativeFetch ?? fetch)(input, init);
}

function toUrl(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return null; // Request objects pass through untouched
}

function isApiCall(url: string): boolean {
  if (url.startsWith('/api/')) return true;
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin && u.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

const AUTH_PATH = /\/api\/auth\/(login|refresh|logout)(\?|$)/;

export function installAuthFetch() {
  if (typeof window === 'undefined' || !nativeFetch || (window as unknown as { __authFetch?: boolean }).__authFetch) return;
  (window as unknown as { __authFetch?: boolean }).__authFetch = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = toUrl(input);
    if (!url || !isApiCall(url) || AUTH_PATH.test(url)) return nativeFetch(input, init);

    const send = (token: string | null) => {
      const headers = new Headers(init?.headers);
      // Never let a caller (or legacy code) choose the identity: drop client-asserted tenant/actor headers.
      for (const h of ['x-organization-id', 'x-user-id', 'x-user-email', 'x-user-name']) headers.delete(h);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return nativeFetch(input, { ...init, headers, credentials: init?.credentials ?? 'same-origin' });
    };

    if (!accessToken) await refreshSession();
    let res = await send(accessToken);
    if (res.status === 401) {
      const refreshed = await refreshSession();
      if (refreshed) res = await send(refreshed.accessToken);
    }
    return res;
  };
}
