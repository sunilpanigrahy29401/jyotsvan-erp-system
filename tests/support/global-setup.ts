// Prepares the disposable test database once: applies legacy + versioned migrations if the schema is not there yet.
import { Pool } from 'pg';

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn('[tests] TEST_DATABASE_URL not set: database integration tests will be skipped.');
    return;
  }
  // Safety: refuse anything that does not look like a throwaway database.
  if (!/test|ci|local|localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error('Refusing to run tests: TEST_DATABASE_URL must clearly point at a disposable test database.');
  }
  process.env.DATABASE_URL = url;
  process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL || 'disable';
  process.env.NODE_ENV = 'test';
  process.env.ENCRYPTION_SECRET = 'test-encryption-secret-test-encryption-0123456789';
  process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-0123456789';

  const probe = new Pool({ connectionString: url, ssl: false });
  let needsMigrate = true;
  try {
    const r = await probe.query("SELECT to_regclass('public.schema_migrations') AS t, to_regclass('public.users') AS u");
    needsMigrate = !(r.rows[0].t && r.rows[0].u);
  } finally {
    await probe.end();
  }
  if (!needsMigrate) return;

  const { pool } = await import('../../src/server/db.ts');
  const { runLegacyMigrations } = await import('../../src/server/core/legacy-migrations.ts');
  const { runVersionedMigrations } = await import('../../src/server/core/migrator.ts');
  const results = await runLegacyMigrations();
  const failed = results.filter((r) => !r.success);
  if (failed.length) throw new Error(`Legacy migrations failed on the test database: ${failed.map((f) => f.name).join('; ')}`);
  await runVersionedMigrations(pool);
  await pool.end();
}
