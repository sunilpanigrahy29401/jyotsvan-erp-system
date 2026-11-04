// src/server/migrate-ai-tables.ts
// Phase 38-42: Database Schema Migration for AI Foundation, Insights, Recommendations, and Controlled Actions

import { pool } from './db.ts';

export async function runAiTablesMigration(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Phase 38-42] Starting Enterprise AI Foundation Schema Migration...');
    await client.query('BEGIN');

    // 1. AI Insights Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        insight_type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        severity VARCHAR(32) NOT NULL DEFAULT 'INFO',
        entity_type VARCHAR(64) NOT NULL,
        entity_id VARCHAR(128) NOT NULL,
        description TEXT NOT NULL,
        evidence_data JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'NEW',
        detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by VARCHAR(128)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_insights_org_status ON ai_insights (organization_id, status);
    `);

    // 2. AI Recommendations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        category VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        problem_statement TEXT NOT NULL,
        evidence_json JSONB DEFAULT '{}'::jsonb,
        recommendation_text TEXT NOT NULL,
        expected_impact TEXT NOT NULL,
        confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.90,
        action_type VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_rec_org_status ON ai_recommendations (organization_id, status);
    `);

    // 3. AI Controlled Actions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_actions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        action_type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        risk_level VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
        proposed_by VARCHAR(64) NOT NULL DEFAULT 'AI_COPILOT',
        payload JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
        approved_by VARCHAR(128),
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        executed_at TIMESTAMPTZ,
        execution_result JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_actions_org_status ON ai_actions (organization_id, status);
    `);

    // 4. AI Query Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_query_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(128) NOT NULL,
        user_role VARCHAR(64) NOT NULL,
        query_text TEXT NOT NULL,
        tool_used VARCHAR(64),
        latency_ms INTEGER DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_logs_org_created ON ai_query_logs (organization_id, created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('[Phase 38-42] ✓ Enterprise AI Foundation Schema Migration Completed successfully.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Phase 38-42] ✗ Error running AI migration:', err.message || err);
    throw err;
  } finally {
    client.release();
  }
}
