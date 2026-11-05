// User administration from the command line (the password is read from the PASSWORD env var, never from argv).
//   PASSWORD='...' npm run user -- set-password someone@example.com
//   PASSWORD='...' npm run user -- create someone@example.com "Full Name" [--super-admin] [--role <role-slug>] [--org <organization-id>]
import { pool } from '../db.ts';
import { hashPassword, validatePasswordPolicy } from '../core/passwords.ts';
import { findUserByEmail, setPasswordHash } from '../core/auth-store.ts';
import { newId } from '../core/tokens.ts';

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const [cmd, email, ...rest] = process.argv.slice(2);
  const password = process.env.PASSWORD || '';
  if (!cmd || !email) throw new Error('Usage: PASSWORD=... npm run user -- <set-password|create> <email> [name] [flags]');
  const problem = validatePasswordPolicy(password, email);
  if (problem) throw new Error(`PASSWORD env var rejected: ${problem}`);
  const hash = await hashPassword(password);

  if (cmd === 'set-password') {
    const u = await findUserByEmail(email);
    if (!u) throw new Error(`No user with email ${email}`);
    await setPasswordHash(u.id, hash, false);
    console.log(`Password updated for ${u.email}. Existing sessions remain valid until revoked.`);
    return;
  }

  if (cmd === 'create') {
    const name = rest.find((a) => !a.startsWith('--')) || email.split('@')[0];
    const superAdmin = rest.includes('--super-admin');
    const roleSlug = flag(rest, '--role');
    const orgId = flag(rest, '--org') || (await pool.query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1')).rows[0]?.id;
    if (!orgId) throw new Error('No organization exists yet. Run "npm run db:migrate -- --legacy" first.');
    if (await findUserByEmail(email)) throw new Error('A user with this email already exists.');
    const id = newId('usr');
    await pool.query(
      `INSERT INTO users (id, organization_id, email, full_name, is_super_admin, status, password_hash, password_changed_at)
       VALUES ($1, $2, LOWER($3), $4, $5, 'active', $6, NOW())`,
      [id, orgId, email, name, superAdmin, hash]
    );
    if (roleSlug) {
      const role = (await pool.query('SELECT id FROM roles WHERE slug = $1', [roleSlug])).rows[0];
      if (!role) throw new Error(`Unknown role slug: ${roleSlug}`);
      await pool.query(
        'INSERT INTO user_roles (id, user_id, role_id, organization_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [newId('ur'), id, role.id, orgId]
      );
    }
    console.log(`Created ${superAdmin ? 'super-admin ' : ''}user ${email} (${id}) in ${orgId}.`);
    return;
  }
  throw new Error(`Unknown command: ${cmd}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
