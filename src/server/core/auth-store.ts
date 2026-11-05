// Database access for authentication: credentials, sessions, principals, permissions.
import { pool } from '../db.ts';

export interface UserRow {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  default_branch_id: string | null;
  status: string;
  password_hash: string | null;
  failed_login_count: number;
  locked_until: Date | null;
  must_change_password: boolean;
}

export interface Principal {
  userId: string;
  organizationId: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  status: string;
  permissions: Set<string>;
  roles: Array<{ id: string; name: string; slug: string }>;
  sessionId: string;
  mustChangePassword: boolean;
  loadedAt: number;
}

const USER_COLS = `id, organization_id, email, full_name, phone_number, avatar_url, is_super_admin, default_branch_id, status,
  password_hash, failed_login_count, locked_until, must_change_password`;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const r = await pool.query(`SELECT ${USER_COLS} FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  return r.rows[0] || null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const r = await pool.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

export async function recordLoginAttempt(email: string, ip: string | undefined, success: boolean, reason: string) {
  try {
    await pool.query('INSERT INTO auth_login_attempts (email, ip, success, reason) VALUES ($1, $2, $3, $4)', [
      email.slice(0, 255),
      ip?.slice(0, 64) || null,
      success,
      reason,
    ]);
  } catch {
    /* logging must never break login */
  }
}

export async function registerFailedLogin(userId: string, maxFailed: number, lockMinutes: number) {
  await pool.query(
    `UPDATE users SET failed_login_count = failed_login_count + 1,
       locked_until = CASE WHEN failed_login_count + 1 >= $2 THEN NOW() + ($3 || ' minutes')::interval ELSE locked_until END
     WHERE id = $1`,
    [userId, maxFailed, String(lockMinutes)]
  );
}

export async function registerSuccessfulLogin(userId: string) {
  await pool.query('UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [userId]);
}

export async function setPasswordHash(userId: string, hash: string, mustChange = false) {
  await pool.query(
    `UPDATE users SET password_hash = $2, password_changed_at = NOW(), must_change_password = $3,
       failed_login_count = 0, locked_until = NULL WHERE id = $1`,
    [userId, hash, mustChange]
  );
}

export async function createSession(p: {
  id: string; userId: string; organizationId: string; refreshHash: string; ttlSeconds: number; userAgent?: string; ip?: string;
}) {
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, organization_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' seconds')::interval)`,
    [p.id, p.userId, p.organizationId, p.refreshHash, p.userAgent?.slice(0, 400) || null, p.ip?.slice(0, 64) || null, String(p.ttlSeconds)]
  );
}

export interface SessionRow {
  id: string; user_id: string; organization_id: string; revoked_at: Date | null; expires_at: Date;
}

export async function findSessionByRefreshHash(hash: string): Promise<SessionRow | null> {
  const r = await pool.query(
    'SELECT id, user_id, organization_id, revoked_at, expires_at FROM auth_sessions WHERE refresh_token_hash = $1',
    [hash]
  );
  return r.rows[0] || null;
}

/** Rotate the refresh token atomically; returns false if the old hash no longer matches (reuse/replay). */
export async function rotateRefreshToken(sessionId: string, oldHash: string, newHash: string, ttlSeconds: number): Promise<boolean> {
  const r = await pool.query(
    `UPDATE auth_sessions SET refresh_token_hash = $3, last_used_at = NOW(), expires_at = NOW() + ($4 || ' seconds')::interval
     WHERE id = $1 AND refresh_token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
    [sessionId, oldHash, newHash, String(ttlSeconds)]
  );
  return (r.rowCount ?? 0) === 1;
}

export async function revokeSession(sessionId: string, userId?: string) {
  await pool.query(
    'UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL AND ($2::text IS NULL OR user_id = $2)',
    [sessionId, userId || null]
  );
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await pool.query(
    'UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL AND ($2::text IS NULL OR id <> $2)',
    [userId, exceptSessionId || null]
  );
}

export async function listSessions(userId: string) {
  const r = await pool.query(
    `SELECT id, user_agent, ip, created_at, last_used_at, expires_at FROM auth_sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW() ORDER BY last_used_at DESC`,
    [userId]
  );
  return r.rows;
}

/** Loads the live principal for a verified access token. Returns null when the session or user is no longer valid. */
export async function loadPrincipal(userId: string, sessionId: string): Promise<Principal | null> {
  const s = await pool.query(
    `SELECT s.id FROM auth_sessions s WHERE s.id = $1 AND s.user_id = $2 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    [sessionId, userId]
  );
  if (s.rows.length === 0) return null;
  const user = await findUserById(userId);
  if (!user || user.status !== 'active') return null;

  const roles = await pool.query(
    `SELECT r.id, r.name, r.slug FROM roles r JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND ur.organization_id = $2 AND r.status = 'active'`,
    [user.id, user.organization_id]
  );
  const perms = await pool.query(
    `SELECT DISTINCT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       JOIN roles r ON r.id = ur.role_id AND r.status = 'active'
     WHERE ur.user_id = $1 AND ur.organization_id = $2`,
    [user.id, user.organization_id]
  );
  return {
    userId: user.id,
    organizationId: user.organization_id,
    email: user.email,
    fullName: user.full_name,
    isSuperAdmin: user.is_super_admin,
    status: user.status,
    permissions: new Set(perms.rows.map((p) => p.code as string)),
    roles: roles.rows,
    sessionId,
    mustChangePassword: user.must_change_password,
    loadedAt: Date.now(),
  };
}

export async function loadOrganizationAndBranch(organizationId: string, branchId: string | null) {
  const org = await pool.query('SELECT * FROM organizations WHERE id = $1', [organizationId]);
  let branch = null;
  if (branchId) {
    const b = await pool.query('SELECT * FROM branches WHERE id = $1 AND organization_id = $2', [branchId, organizationId]);
    branch = b.rows[0] || null;
  }
  if (!branch) {
    const b = await pool.query('SELECT * FROM branches WHERE organization_id = $1 ORDER BY created_at ASC LIMIT 1', [organizationId]);
    branch = b.rows[0] || null;
  }
  return { organization: org.rows[0] || null, branch };
}
