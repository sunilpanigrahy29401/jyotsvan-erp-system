// Single audit-log writer. The actor and tenant always come from the verified principal, never from the client.
import { pool } from '../db.ts';
import { newId } from './tokens.ts';

export interface AuditEntry {
  organizationId: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetResource: string;
  targetId: string;
  details?: Record<string, unknown>;
}

/** Never throws: auditing must not break the business operation, but failures are logged loudly. */
export async function writeAudit(e: AuditEntry): Promise<void> {
  try {
    await pool.query(
      // entity_type/entity_id mirror target_resource/target_id for databases that still carry the older audit shape.
      `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $6, $7, $8, NOW())`,
      [
        newId('aud'),
        e.organizationId,
        e.actorId,
        e.actorEmail || 'system',
        e.action,
        e.targetResource,
        e.targetId,
        JSON.stringify(e.details || {}),
      ]
    );
  } catch (err) {
    console.error('[Audit] FAILED to write audit entry', e.action, err instanceof Error ? err.message : err);
  }
}
