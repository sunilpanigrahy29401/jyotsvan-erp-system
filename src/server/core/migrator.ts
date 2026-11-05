// Minimal versioned SQL migration runner.
// - Files: src/server/migrations/NNNN_name.sql, applied in order, each in its own transaction.
// - Tracked in schema_migrations (version, name, checksum). A changed checksum of an applied file is an error.
// - A Postgres advisory lock prevents two instances migrating at once.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';

const LOCK_KEY = 727_004_001;

export interface MigrationFile {
  version: string;
  name: string;
  sql: string;
  checksum: string;
}

export function migrationsDir(): string {
  return process.env.MIGRATIONS_DIR || path.join(process.cwd(), 'src', 'server', 'migrations');
}

export function loadMigrationFiles(dir = migrationsDir()): MigrationFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((f) => {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      return {
        version: f.slice(0, 4),
        name: f.replace(/\.sql$/, ''),
        sql,
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
      };
    });
}

export async function runVersionedMigrations(pool: Pool, dir = migrationsDir()): Promise<{ applied: string[]; skipped: string[] }> {
  const files = loadMigrationFiles(dir);
  const client = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(16) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    const done = new Map<string, string>();
    for (const r of (await client.query('SELECT version, checksum FROM schema_migrations')).rows) {
      done.set(r.version, r.checksum);
    }
    for (const f of files) {
      const existing = done.get(f.version);
      if (existing) {
        if (existing !== f.checksum) {
          throw new Error(`Migration ${f.name} was modified after it was applied (checksum mismatch). Add a new migration instead.`);
        }
        skipped.push(f.name);
        continue;
      }
      try {
        await client.query('BEGIN');
        await client.query(f.sql);
        await client.query('INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)', [f.version, f.name, f.checksum]);
        await client.query('COMMIT');
        applied.push(f.name);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${f.name} failed and was rolled back: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { applied, skipped };
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } finally {
      client.release();
    }
  }
}

export async function pendingMigrations(pool: Pool, dir = migrationsDir()): Promise<string[]> {
  const files = loadMigrationFiles(dir);
  try {
    const rows = (await pool.query('SELECT version FROM schema_migrations')).rows;
    const done = new Set(rows.map((r) => r.version));
    return files.filter((f) => !done.has(f.version)).map((f) => f.name);
  } catch {
    return files.map((f) => f.name);
  }
}
