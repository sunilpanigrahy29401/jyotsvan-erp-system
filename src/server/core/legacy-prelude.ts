// Base tables that later legacy migrations ALTER / reference but that no migration in this repository ever created.
// They were evidently created out-of-band in the original InsForge database. These statements are idempotent:
// where the tables already exist (the real database) they do nothing; on a clean database they make the schema buildable.
// Columns here are the minimum the original code inserted/selected; later migrations add the rest via ALTER ... IF NOT EXISTS.
import { pool } from '../db.ts';

export async function ensureBaseCatalogueTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        description TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
        sku VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        unit VARCHAR(32),
        cost_price NUMERIC(14,2) DEFAULT 0,
        selling_price NUMERIC(14,2) DEFAULT 0,
        mrp NUMERIC(14,2) DEFAULT 0,
        reorder_level INTEGER DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
