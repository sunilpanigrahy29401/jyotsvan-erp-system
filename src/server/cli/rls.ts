// Row-level security administration (defense in depth behind the application's own tenant checks).
//   npm run db:rls -- --status     show which tenant tables have RLS
//   npm run db:rls -- --sql        print the SQL that --enable would run (review it first)
//   npm run db:rls -- --enable     enable + FORCE RLS with a tenant_isolation policy on every table that has organization_id
//   npm run db:rls -- --disable    remove the policies and turn RLS off again (instant rollback)
//
// IMPORTANT
//  * The application must connect as a NON-superuser role without BYPASSRLS, otherwise PostgreSQL ignores these policies.
//  * Set RLS_ENABLED=true on the server so every connection is tagged with the request's tenant (see core/rls-pool.ts).
//  * Roll out in staging first; code paths without a tenant context see no rows by design.
import { pool } from '../db.ts';

const POLICY = 'tenant_isolation';

interface Col { table_name: string; is_nullable: string }

async function tenantTables(): Promise<Col[]> {
  const r = await pool.query<Col>(
    `SELECT c.table_name, c.is_nullable
       FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'organization_id' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`
  );
  return r.rows;
}

const TENANT = "NULLIF(current_setting('app.tenant_id', true), '')";
const BYPASS = "current_setting('app.bypass_rls', true) = 'on'";

export function buildEnableSql(tables: Col[]): string[] {
  const stmts: string[] = [];
  for (const t of tables) {
    const q = `"${t.table_name}"`;
    const nullableRead = t.is_nullable === 'YES' ? ' OR organization_id IS NULL' : '';
    stmts.push(`ALTER TABLE ${q} ENABLE ROW LEVEL SECURITY`);
    stmts.push(`ALTER TABLE ${q} FORCE ROW LEVEL SECURITY`);
    stmts.push(`DROP POLICY IF EXISTS ${POLICY} ON ${q}`);
    stmts.push(
      `CREATE POLICY ${POLICY} ON ${q} USING (${BYPASS} OR organization_id = ${TENANT}${nullableRead}) ` +
        `WITH CHECK (${BYPASS} OR organization_id = ${TENANT})`
    );
  }
  // The tenants table itself is keyed by id.
  stmts.push('ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY');
  stmts.push('ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY');
  stmts.push(`DROP POLICY IF EXISTS ${POLICY} ON "organizations"`);
  stmts.push(`CREATE POLICY ${POLICY} ON "organizations" USING (${BYPASS} OR id = ${TENANT}) WITH CHECK (${BYPASS} OR id = ${TENANT})`);
  return stmts;
}

export function buildDisableSql(tables: Col[]): string[] {
  const names = [...tables.map((t) => t.table_name), 'organizations'];
  return names.flatMap((n) => [`DROP POLICY IF EXISTS ${POLICY} ON "${n}"`, `ALTER TABLE "${n}" NO FORCE ROW LEVEL SECURITY`, `ALTER TABLE "${n}" DISABLE ROW LEVEL SECURITY`]);
}

export async function enableRls(): Promise<number> {
  const tables = await tenantTables();
  const sql = buildEnableSql(tables);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of sql) await client.query(s);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return tables.length + 1;
}

export async function disableRls(): Promise<void> {
  const tables = await tenantTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of buildDisableSql(tables)) await client.query(s);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--sql') {
    console.log(buildEnableSql(await tenantTables()).join(';\n') + ';');
  } else if (arg === '--enable') {
    console.log(`RLS enabled on ${await enableRls()} tables.`);
    const role = (await pool.query('SELECT current_user AS u, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user')).rows[0];
    if (role?.rolsuper || role?.rolbypassrls) {
      console.warn(`WARNING: connected role "${role.u}" is a superuser/BYPASSRLS role: policies will NOT apply to it. Run the app as a restricted role.`);
    }
  } else if (arg === '--disable') {
    await disableRls();
    console.log('RLS disabled.');
  } else if (arg === '--status') {
    const r = await pool.query(
      `SELECT c.relname AS table, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND EXISTS (
          SELECT 1 FROM information_schema.columns k WHERE k.table_name = c.relname AND k.column_name = 'organization_id')
        ORDER BY 1`
    );
    const on = r.rows.filter((x) => x.rls).length;
    console.log(`${on}/${r.rows.length} tenant tables have RLS enabled.`);
  } else {
    console.error('Usage: npm run db:rls -- --status | --sql | --enable | --disable');
    process.exitCode = 1;
  }
}

if (process.argv[1] && /cli[\\/]rls\.ts$/.test(process.argv[1])) {
  main()
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
