// /api/auth/* — login, refresh (httpOnly cookie), logout, me, change-password, sessions.
import express, { type Request, type Response } from 'express';
import { authConfig } from './config.ts';
import { hashPassword, validatePasswordPolicy, verifyPassword } from './passwords.ts';
import { hashRefreshToken, newId, newRefreshToken, signAccessToken } from './tokens.ts';
import { authenticate, invalidatePrincipalCache, rateLimit } from './middleware.ts';
import { writeAudit } from './audit.ts';
import { pool } from '../db.ts';
import {
  createSession, findSessionByRefreshHash, findUserByEmail, findUserById, listSessions, loadOrganizationAndBranch,
  recordLoginAttempt, registerFailedLogin, registerSuccessfulLogin, revokeAllSessions, revokeSession, rotateRefreshToken,
  setPasswordHash, type UserRow,
} from './auth-store.ts';

export const authRouter = express.Router();

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const CSRF_HEADER = 'x-requested-with';
const CSRF_VALUE = 'jyotsvan-web';

function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(authConfig.refreshCookieName, token, {
    httpOnly: true,
    secure: authConfig.secureCookies,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: authConfig.refreshTtlSeconds * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(authConfig.refreshCookieName, { httpOnly: true, secure: authConfig.secureCookies, sameSite: 'strict', path: '/api/auth' });
}

function requireCsrfHeader(req: Request, res: Response): boolean {
  if (req.headers[CSRF_HEADER] !== CSRF_VALUE) {
    res.status(403).json({ error: 'Missing request header.', code: 'CSRF' });
    return false;
  }
  return true;
}

async function buildAuthUser(user: UserRow, sessionId: string) {
  const { loadPrincipal } = await import('./auth-store.ts');
  const principal = await loadPrincipal(user.id, sessionId);
  const { organization, branch } = await loadOrganizationAndBranch(user.organization_id, user.default_branch_id);
  const roleRows = (
    await pool.query(
      `SELECT r.* FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.organization_id = $2`,
      [user.id, user.organization_id]
    )
  ).rows;
  const permissions = user.is_super_admin ? ['*:*'] : Array.from(principal?.permissions || []);
  return {
    id: user.id,
    organization_id: user.organization_id,
    email: user.email,
    full_name: user.full_name,
    phone_number: user.phone_number,
    avatar_url: user.avatar_url,
    is_super_admin: user.is_super_admin,
    default_branch_id: user.default_branch_id,
    status: user.status,
    must_change_password: user.must_change_password,
    roles: roleRows,
    permissions,
    organization,
    currentBranch: branch,
  };
}

async function issueSession(user: UserRow, req: Request, res: Response) {
  const sessionId = newId('ses');
  const refresh = newRefreshToken();
  await createSession({
    id: sessionId,
    userId: user.id,
    organizationId: user.organization_id,
    refreshHash: refresh.hash,
    ttlSeconds: authConfig.refreshTtlSeconds,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  const accessToken = await signAccessToken({ sub: user.id, org: user.organization_id, sid: sessionId });
  setRefreshCookie(res, refresh.token);
  return { accessToken, sessionId };
}

// ---- Login -----------------------------------------------------------------
authRouter.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 20), message: 'Too many login attempts. Try again later.' }),
  async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 255 || password.length > 200) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
      const user = await findUserByEmail(email);
      if (user?.locked_until && user.locked_until.getTime() > Date.now()) {
        await recordLoginAttempt(email, req.ip, false, 'locked');
        return res.status(429).json({ error: 'Too many failed attempts. Try again later.', code: 'ACCOUNT_LOCKED' });
      }
      const ok = await verifyPassword(password, user?.password_hash);
      if (!user || !ok || user.status !== 'active') {
        if (user && !ok) await registerFailedLogin(user.id, authConfig.maxFailedLogins, authConfig.lockMinutes);
        await recordLoginAttempt(email, req.ip, false, !user ? 'unknown_user' : user.status !== 'active' ? 'inactive' : 'bad_password');
        if (user) {
          await writeAudit({ organizationId: user.organization_id, actorId: user.id, actorEmail: user.email, action: 'auth.login_failed', targetResource: 'user', targetId: user.id, details: { ip: req.ip } });
        }
        return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
      }
      await registerSuccessfulLogin(user.id);
      const { accessToken, sessionId } = await issueSession(user, req, res);
      await recordLoginAttempt(email, req.ip, true, 'ok');
      await writeAudit({ organizationId: user.organization_id, actorId: user.id, actorEmail: user.email, action: 'auth.login', targetResource: 'user', targetId: user.id, details: { ip: req.ip, sessionId } });
      return res.json({
        accessToken,
        expiresIn: authConfig.accessTtlSeconds,
        user: await buildAuthUser(user, sessionId),
      });
    } catch (err) {
      console.error('[Auth] login error', err instanceof Error ? err.message : err);
      return res.status(500).json({ error: 'Login is temporarily unavailable.' });
    }
  }
);

// ---- Refresh (rotating refresh token in httpOnly cookie) ---------------------
authRouter.post('/refresh', rateLimit({ windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  if (!requireCsrfHeader(req, res)) return;
  const token = parseCookies(req)[authConfig.refreshCookieName];
  if (!token) return res.status(401).json({ error: 'No session.', code: 'UNAUTHENTICATED' });
  try {
    const oldHash = hashRefreshToken(token);
    const session = await findSessionByRefreshHash(oldHash);
    if (!session || session.revoked_at || session.expires_at.getTime() <= Date.now()) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Session expired.', code: 'SESSION_EXPIRED' });
    }
    const user = await findUserById(session.user_id);
    if (!user || user.status !== 'active') {
      await revokeSession(session.id);
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Session expired.', code: 'SESSION_EXPIRED' });
    }
    const next = newRefreshToken();
    const rotated = await rotateRefreshToken(session.id, oldHash, next.hash, authConfig.refreshTtlSeconds);
    if (!rotated) {
      // Token reuse / race: treat as theft and end the session.
      await revokeSession(session.id);
      invalidatePrincipalCache(user.id);
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Session expired.', code: 'SESSION_EXPIRED' });
    }
    setRefreshCookie(res, next.token);
    const accessToken = await signAccessToken({ sub: user.id, org: user.organization_id, sid: session.id });
    return res.json({ accessToken, expiresIn: authConfig.accessTtlSeconds, user: await buildAuthUser(user, session.id) });
  } catch (err) {
    console.error('[Auth] refresh error', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Session service unavailable.' });
  }
});

// ---- Logout ----------------------------------------------------------------
authRouter.post('/logout', async (req, res) => {
  if (!requireCsrfHeader(req, res)) return;
  const token = parseCookies(req)[authConfig.refreshCookieName];
  if (token) {
    const s = await findSessionByRefreshHash(hashRefreshToken(token));
    if (s) {
      await revokeSession(s.id);
      invalidatePrincipalCache(s.user_id);
      await writeAudit({ organizationId: s.organization_id, actorId: s.user_id, actorEmail: null, action: 'auth.logout', targetResource: 'session', targetId: s.id });
    }
  }
  clearRefreshCookie(res);
  res.json({ success: true });
});

// ---- Authenticated endpoints ---------------------------------------------------
authRouter.get('/me', authenticate, async (req, res) => {
  const a = req.auth!;
  const user = await findUserById(a.userId);
  if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
  res.json({ user: await buildAuthUser(user, a.sessionId) });
});

authRouter.post('/change-password', authenticate, rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  const a = req.auth!;
  const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  const user = await findUserById(a.userId);
  if (!user || !(await verifyPassword(current, user.password_hash))) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  const problem = validatePasswordPolicy(next, user.email);
  if (problem) return res.status(400).json({ error: problem });
  if (current === next) return res.status(400).json({ error: 'New password must differ from the current one.' });
  await setPasswordHash(user.id, await hashPassword(next), false);
  await revokeAllSessions(user.id, a.sessionId);
  invalidatePrincipalCache(user.id);
  await writeAudit({ organizationId: a.organizationId, actorId: a.userId, actorEmail: a.email, action: 'auth.password_changed', targetResource: 'user', targetId: a.userId });
  res.json({ success: true });
});

authRouter.get('/sessions', authenticate, async (req, res) => {
  res.json({ sessions: (await listSessions(req.auth!.userId)).map((s) => ({ ...s, current: s.id === req.auth!.sessionId })) });
});

authRouter.delete('/sessions/:id', authenticate, async (req, res) => {
  await revokeSession(String(req.params.id), req.auth!.userId);
  invalidatePrincipalCache(req.auth!.userId);
  res.json({ success: true });
});
