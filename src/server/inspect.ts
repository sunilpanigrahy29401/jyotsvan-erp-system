import { pool } from './db.ts';

async function main() {
  try {
    const schemas = await pool.query(`
      SELECT nspname AS schema_name 
      FROM pg_namespace 
      WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema' 
      ORDER BY nspname
    `);
    
    console.log('=== INSFORGE POSTGRESQL SCHEMAS & TABLES ===');
    for (const s of schemas.rows) {
      const tables = await pool.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
        [s.schema_name]
      );
      console.log(`[${s.schema_name}] (${tables.rows.length} tables): ${tables.rows.map(r => r.tablename).join(', ')}`);
    }

    // Inspect public tables columns
    console.log('\n=== PUBLIC SCHEMA TABLES DETAIL ===');
    const pubTables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    for (const t of pubTables.rows) {
      const cols = await pool.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 
         ORDER BY ordinal_position`,
        [t.tablename]
      );
      const countRes = await pool.query(`SELECT count(*) FROM public."${t.tablename}"`);
      console.log(`\nTable: public.${t.tablename} (${countRes.rows[0].count} rows)`);
      cols.rows.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${c.column_default ? `DEFAULT ${c.column_default}` : ''}`);
      });
    }

    // Check auth schema
    console.log('\n=== AUTH SCHEMA DETAIL ===');
    const authTables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'auth' ORDER BY tablename`
    );
    for (const t of authTables.rows) {
      const countRes = await pool.query(`SELECT count(*) FROM auth."${t.tablename}"`);
      console.log(`Auth Table: auth.${t.tablename} (${countRes.rows[0].count} rows)`);
    }

    // Check storage schema
    console.log('\n=== STORAGE SCHEMA DETAIL ===');
    const storageTables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'storage' ORDER BY tablename`
    );
    for (const t of storageTables.rows) {
      const countRes = await pool.query(`SELECT count(*) FROM storage."${t.tablename}"`);
      console.log(`Storage Table: storage.${t.tablename} (${countRes.rows[0].count} rows)`);
    }

    // Check RLS status on public tables
    console.log('\n=== ROW LEVEL SECURITY (RLS) STATUS ===');
    const rlsRes = await pool.query(`
      SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
      FROM pg_class
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public' AND pg_class.relkind = 'r'
      ORDER BY relname;
    `);
    rlsRes.rows.forEach(r => {
      console.log(`  ${r.table_name}: RLS ${r.rls_enabled ? 'ENABLED' : 'DISABLED'} (Forced: ${r.rls_forced})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Inspection error:', err);
    process.exit(1);
  }
}

main();
