// /api/users, /api/roles, /api/permissions — user and role administration, enforced on the server.
// Route-level permissions (users.* / roles.*) come from the permission map; the rules below add the checks a
// permission string cannot express: no privilege escalation, no self-lockout, super-admin protection, audit trail.
import crypto from 'crypto';
import express, { type Request, type Response } from 'express';
import { pool } from '../db.ts';
import { hashPassword, validatePasswordPolicy } from './passwords.ts';
import { newId } from './tokens.ts';
import { writeAudit } from './audit.ts';
import { invalidatePrincipalCache } from './middleware.ts';
import { revokeAllSessions } from './auth-store.ts';

export const usersRouter = express.Router();
export const rolesRouter = express.Router();
export const permissionsRouter = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isSuper = (req: Request) => Boolean(req.auth?.isSuperAdmin || req.auth?.permissions.has('*:*'));

function fail(res: Response, status: number, error: string) {
  return res.status(status).json({ error });
}

function temporaryPassword(): string {
  return crypto.randomBytes(12).toString('base64url') + 'Aa1';
}

function audit(req: Request, action: string, resource: string, id: string, details?: Record<string, unknown>) {
  return writeAudit({
    organizationId: req.auth!.organizationId,
    actorId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action,
    targetResource: resource,
    targetId: id,
    details,
  });
}

const PUBLIC_USER = `u.id, u.organization_id, u.email, u.full_name, u.phone_number, u.avatar_url, u.is_super_admin,
  u.default_branch_id, u.status, u.last_login_at, u.must_change_password, u.created_at, u.updated_at`;

async function rolesOf(userIds: string[], orgId: string) {
  if (userIds.length === 0) return new Map<string, any[]>();
  const r = await pool.query(
    `SELECT ur.user_id, r.* FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ANY($1) AND ur.organization_id = $2`,
    [userIds, orgId]
  );
  const m = new Map<string, any[]>();
  for (const row of r.rows) {
    const { user_id, ...role } = row;
    m.set(user_id, [...(m.get(user_id) || []), role]);
  }
  return m;
}

async function permissionCountFor(userIds: string[], orgId: string) {
  const r = await pool.query(
    `SELECT ur.user_id, COUNT(DISTINCT rp.permission_id)::int AS n
       FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = ANY($1) AND ur.organization_id = $2 GROUP BY ur.user_id`,
    [userIds, orgId]
  );
  return new Map<string, number>(r.rows.map((x) => [x.user_id, x.n]));
}

async function roleBySlugOrId(roleId: string, orgId: string) {
  const r = await pool.query('SELECT * FROM roles WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)', [roleId, orgId]);
  return r.rows[0] || null;
}

// ---------------------------------------------------------------- permissions
permissionsRouter.get('/', async (_req, res) => {
  res.json({ permissions: (await pool.query('SELECT id, code, module, description FROM permissions ORDER BY module, code')).rows });
});

// ---------------------------------------------------------------- users
usersRouter.get('/', async (req, res) => {
  const org = req.auth!.organizationId;
  const rows = (await pool.query(`SELECT ${PUBLIC_USER} FROM users u WHERE u.organization_id = $1 ORDER BY u.full_name`, [org])).rows;
  const ids = rows.map((r) => r.id);
  const [roles, counts] = await Promise.all([rolesOf(ids, org), permissionCountFor(ids, org)]);
  const total = (await pool.query('SELECT COUNT(*)::int AS n FROM permissions')).rows[0].n;
  res.json({
    users: rows.map((u) => ({ ...u, roles: roles.get(u.id) || [], permissionsCount: u.is_super_admin ? total : counts.get(u.id) || 0 })),
  });
});

usersRouter.get('/:id', async (req, res) => {
  const org = req.auth!.organizationId;
  const u = (await pool.query(`SELECT ${PUBLIC_USER} FROM users u WHERE u.id = $1 AND u.organization_id = $2`, [req.params.id, org])).rows[0];
  if (!u) return fail(res, 404, 'User not found.');
  const roles = (await rolesOf([u.id], org)).get(u.id) || [];
  const perms = u.is_super_admin
    ? ['*:*']
    : (
        await pool.query(
          `SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id
             JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = $1 AND ur.organization_id = $2`,
          [u.id, org]
        )
      ).rows.map((r) => r.code);
  res.json({ user: { ...u, roles, permissions: perms } });
});

usersRouter.post('/', async (req, res) => {
  const org = req.auth!.organizationId;
  const b = req.body || {};
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const fullName = typeof b.full_name === 'string' ? b.full_name.trim() : '';
  if (!EMAIL_RE.test(email) || email.length > 255) return fail(res, 400, 'A valid email address is required.');
  if (fullName.length < 2 || fullName.length > 255) return fail(res, 400, 'Full name must be 2-255 characters.');
  const wantsSuper = Boolean(b.is_super_admin);
  if (wantsSuper && !isSuper(req)) return fail(res, 403, 'Only a super administrator can create a super administrator.');
  const role = b.role_id ? await roleBySlugOrId(String(b.role_id), org) : null;
  if (b.role_id && !role) return fail(res, 400, 'Unknown role.');
  if (role?.slug === 'super_admin' && !isSuper(req)) return fail(res, 403, 'Only a super administrator can assign the super administrator role.');
  if ((await pool.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [email])).rows.length) return fail(res, 409, 'A user with this email already exists.');

  let password: string = typeof b.password === 'string' && b.password ? b.password : '';
  let generated = false;
  if (password) {
    const problem = validatePasswordPolicy(password, email);
    if (problem) return fail(res, 400, problem);
  } else {
    password = temporaryPassword();
    generated = true;
  }
  const id = newId('usr');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, organization_id, email, full_name, phone_number, is_super_admin, default_branch_id, status, password_hash, password_changed_at, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW(), $9)`,
      [id, org, email, fullName, b.phone_number || null, wantsSuper, b.default_branch_id || null, await hashPassword(password), generated]
    );
    if (role) {
      await client.query('INSERT INTO user_roles (id, user_id, role_id, organization_id, assigned_by) VALUES ($1, $2, $3, $4, $5)', [newId('ur'), id, role.id, org, req.auth!.userId]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    return fail(res, 400, 'Could not create the user (check the branch and role).');
  } finally {
    client.release();
  }
  await audit(req, 'user.created', 'user', id, { email, role: role?.slug, superAdmin: wantsSuper });
  res.status(201).json({ user: { id, email, full_name: fullName, organization_id: org, status: 'active', is_super_admin: wantsSuper }, ...(generated ? { temporaryPassword: password } : {}) });
});

async function loadTarget(req: Request, res: Response) {
  const t = (await pool.query('SELECT id, email, is_super_admin, status FROM users WHERE id = $1 AND organization_id = $2', [req.params.id, req.auth!.organizationId])).rows[0];
  if (!t) {
    fail(res, 404, 'User not found.');
    return null;
  }
  if (t.is_super_admin && !isSuper(req)) {
    fail(res, 403, 'Only a super administrator can modify a super administrator.');
    return null;
  }
  return t as { id: string; email: string; is_super_admin: boolean; status: string };
}

usersRouter.patch('/:id', async (req, res) => {
  const t = await loadTarget(req, res);
  if (!t) return;
  const org = req.auth!.organizationId;
  const b = req.body || {};
  const self = t.id === req.auth!.userId;
  if (self && (b.role_id !== undefined || b.status !== undefined || b.is_super_admin !== undefined)) {
    return fail(res, 403, 'You cannot change your own role, status or administrator flag.');
  }
  if (b.is_super_admin !== undefined && !isSuper(req)) return fail(res, 403, 'Only a super administrator can change the administrator flag.');
  let role = null;
  if (b.role_id) {
    role = await roleBySlugOrId(String(b.role_id), org);
    if (!role) return fail(res, 400, 'Unknown role.');
    if (role.slug === 'super_admin' && !isSuper(req)) return fail(res, 403, 'Only a super administrator can assign the super administrator role.');
  }
  if (b.status !== undefined && !['active', 'inactive', 'suspended'].includes(b.status)) return fail(res, 400, 'Invalid status.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users SET full_name = COALESCE($2, full_name), phone_number = COALESCE($3, phone_number),
         default_branch_id = COALESCE($4, default_branch_id), status = COALESCE($5, status),
         is_super_admin = COALESCE($6, is_super_admin), updated_at = NOW()
       WHERE id = $1 AND organization_id = $7`,
      [t.id, b.full_name?.toString().trim() || null, b.phone_number ?? null, b.default_branch_id || null, b.status ?? null, b.is_super_admin ?? null, org]
    );
    if (role) {
      await client.query('DELETE FROM user_roles WHERE user_id = $1 AND organization_id = $2', [t.id, org]);
      await client.query('INSERT INTO user_roles (id, user_id, role_id, organization_id, assigned_by) VALUES ($1, $2, $3, $4, $5)', [newId('ur'), t.id, role.id, org, req.auth!.userId]);
    }
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    return fail(res, 400, 'Could not update the user.');
  } finally {
    client.release();
  }
  if (b.status !== undefined && b.status !== 'active') await revokeAllSessions(t.id);
  invalidatePrincipalCache(t.id);
  await audit(req, 'user.updated', 'user', t.id, { fields: Object.keys(b), role: role?.slug });
  res.json({ success: true });
});

usersRouter.post('/:id/toggle-status', async (req, res) => {
  const t = await loadTarget(req, res);
  if (!t) return;
  if (t.id === req.auth!.userId) return fail(res, 403, 'You cannot deactivate your own account.');
  const next = t.status === 'active' ? 'inactive' : 'active';
  await pool.query('UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1', [t.id, next]);
  if (next !== 'active') await revokeAllSessions(t.id);
  invalidatePrincipalCache(t.id);
  await audit(req, 'user.status_changed', 'user', t.id, { status: next });
  res.json({ success: true, status: next });
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const t = await loadTarget(req, res);
  if (!t) return;
  const pw = temporaryPassword();
  await pool.query(
    `UPDATE users SET password_hash = $2, password_changed_at = NOW(), must_change_password = TRUE, failed_login_count = 0, locked_until = NULL WHERE id = $1`,
    [t.id, await hashPassword(pw)]
  );
  await revokeAllSessions(t.id);
  invalidatePrincipalCache(t.id);
  await audit(req, 'user.password_reset', 'user', t.id);
  res.json({ success: true, temporaryPassword: pw });
});

usersRouter.delete('/:id', async (req, res) => {
  const t = await loadTarget(req, res);
  if (!t) return;
  if (t.id === req.auth!.userId) return fail(res, 403, 'You cannot delete your own account.');
  try {
    await pool.query('DELETE FROM users WHERE id = $1 AND organization_id = $2', [t.id, req.auth!.organizationId]);
  } catch {
    return fail(res, 409, 'This user has activity history and cannot be deleted. Deactivate the account instead.');
  }
  invalidatePrincipalCache(t.id);
  await audit(req, 'user.deleted', 'user', t.id, { email: t.email });
  res.json({ success: true });
});

// ---------------------------------------------------------------- roles
async function roleList(orgId: string) {
  const roles = (
    await pool.query(
      `SELECT r.*, (SELECT COUNT(*)::int FROM user_roles ur WHERE ur.role_id = r.id AND ur.organization_id = $1) AS "usersCount"
         FROM roles r WHERE r.organization_id = $1 OR r.organization_id IS NULL ORDER BY r.name`,
      [orgId]
    )
  ).rows;
  const perms = (await pool.query('SELECT rp.role_id, p.code FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ANY($1)', [roles.map((r) => r.id)])).rows;
  const total = (await pool.query('SELECT COUNT(*)::int AS n FROM permissions')).rows[0].n;
  const byRole = new Map<string, string[]>();
  for (const p of perms) byRole.set(p.role_id, [...(byRole.get(p.role_id) || []), p.code]);
  return roles.map((r) => ({ ...r, permission_codes: byRole.get(r.id) || [], permissionsCount: r.slug === 'super_admin' ? total : (byRole.get(r.id) || []).length }));
}

rolesRouter.get('/', async (req, res) => res.json({ roles: await roleList(req.auth!.organizationId) }));

rolesRouter.get('/:id', async (req, res) => {
  const org = req.auth!.organizationId;
  const role = await roleBySlugOrId(req.params.id, org);
  if (!role) return fail(res, 404, 'Role not found.');
  const permissions =
    role.slug === 'super_admin'
      ? (await pool.query('SELECT id, code, module, description FROM permissions ORDER BY module, code')).rows
      : (await pool.query('SELECT p.id, p.code, p.module, p.description FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = $1 ORDER BY p.module, p.code', [role.id])).rows;
  const assignedUsers = (await pool.query(`SELECT ${PUBLIC_USER} FROM users u JOIN user_roles ur ON ur.user_id = u.id WHERE ur.role_id = $1 AND ur.organization_id = $2`, [role.id, org])).rows;
  res.json({ role, permissions, assignedUsers });
});

function assertCanGrant(req: Request, res: Response, codes: string[]): boolean {
  if (isSuper(req)) return true;
  if (codes.includes('*:*')) {
    fail(res, 403, 'Only a super administrator can grant full access.');
    return false;
  }
  const missing = codes.filter((c) => !req.auth!.permissions.has(c));
  if (missing.length) {
    fail(res, 403, `You cannot grant permissions you do not hold: ${missing.slice(0, 5).join(', ')}.`);
    return false;
  }
  return true;
}

async function setRolePermissions(client: any, roleId: string, codes: string[]) {
  await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  if (codes.length) {
    await client.query(
      `INSERT INTO role_permissions (id, role_id, permission_id)
       SELECT 'rp-' || $1 || '-' || p.id, $1, p.id FROM permissions p WHERE p.code = ANY($2) ON CONFLICT DO NOTHING`,
      [roleId, codes]
    );
  }
}

rolesRouter.post('/', async (req, res) => {
  const org = req.auth!.organizationId;
  const b = req.body || {};
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const slug = typeof b.slug === 'string' ? b.slug.trim().toLowerCase() : '';
  const codes: string[] = Array.isArray(b.permission_codes) ? b.permission_codes.map(String) : [];
  if (name.length < 2) return fail(res, 400, 'Role name must be at least 2 characters.');
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(slug)) return fail(res, 400, 'Role slug must be lower-case letters, digits and underscores.');
  if (!assertCanGrant(req, res, codes)) return;
  if ((await pool.query('SELECT 1 FROM roles WHERE slug = $1', [slug])).rows.length) return fail(res, 409, 'A role with this slug already exists.');
  const id = newId('role');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO roles (id, organization_id, name, slug, description, is_system, status) VALUES ($1, $2, $3, $4, $5, FALSE, \'active\')', [id, org, name, slug, b.description || null]);
    await setRolePermissions(client, id, codes);
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    return fail(res, 400, 'Could not create the role.');
  } finally {
    client.release();
  }
  await audit(req, 'role.created', 'role', id, { slug, permissions: codes.length });
  res.status(201).json({ role: { id, name, slug, organization_id: org, is_system: false, status: 'active' } });
});

rolesRouter.patch('/:id', async (req, res) => {
  const org = req.auth!.organizationId;
  const role = await roleBySlugOrId(req.params.id, org);
  if (!role) return fail(res, 404, 'Role not found.');
  if (role.slug === 'super_admin') return fail(res, 403, 'The super administrator role cannot be modified.');
  if (role.organization_id === null && !isSuper(req)) return fail(res, 403, 'Only a super administrator can modify a global role.');
  const b = req.body || {};
  const codes: string[] | null = Array.isArray(b.permission_codes) ? b.permission_codes.map(String) : null;
  if (codes && !assertCanGrant(req, res, codes)) return;
  if (b.status !== undefined && !['active', 'inactive'].includes(b.status)) return fail(res, 400, 'Invalid status.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE roles SET name = COALESCE($2, name), description = COALESCE($3, description), status = COALESCE($4, status), updated_at = NOW() WHERE id = $1', [role.id, b.name?.toString().trim() || null, b.description ?? null, b.status ?? null]);
    if (codes) await setRolePermissions(client, role.id, codes);
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    return fail(res, 400, 'Could not update the role.');
  } finally {
    client.release();
  }
  invalidatePrincipalCache();
  await audit(req, 'role.updated', 'role', role.id, { fields: Object.keys(b), permissions: codes?.length });
  res.json({ success: true });
});

rolesRouter.delete('/:id', async (req, res) => {
  const org = req.auth!.organizationId;
  const role = await roleBySlugOrId(req.params.id, org);
  if (!role) return fail(res, 404, 'Role not found.');
  if (role.is_system || role.slug === 'super_admin') return fail(res, 403, 'System roles cannot be deleted.');
  if (role.organization_id === null && !isSuper(req)) return fail(res, 403, 'Only a super administrator can delete a global role.');
  const used = (await pool.query('SELECT COUNT(*)::int AS n FROM user_roles WHERE role_id = $1', [role.id])).rows[0].n;
  if (used > 0) return fail(res, 409, `This role is assigned to ${used} user(s). Reassign them first.`);
  await pool.query('DELETE FROM roles WHERE id = $1', [role.id]);
  invalidatePrincipalCache();
  await audit(req, 'role.deleted', 'role', role.id, { slug: role.slug });
  res.json({ success: true });
});
