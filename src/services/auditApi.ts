// src/services/auditApi.ts
// Frontend API Client for Enterprise Audit Logs (Phase 23)

import type {
  CanonicalAuditRecord,
  AuditLogFilter,
  AuditLogMetrics,
  AuditIntegrityReport,
  AuditRetentionPolicy,
} from '../types/audit';
import type { AuthUser } from '../types/auth';

const BASE_URL = '/api/audit-logs';

export const auditApi = {
  /**
   * Fetch paginated and filtered audit logs with tenant header.
   */
  async getAuditLogs(
    filter: AuditLogFilter = {},
    user?: AuthUser | null
  ): Promise<{
    logs: CanonicalAuditRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const orgId = filter.organizationId || user?.organization_id || 'org-jyotsvan-corp';
    const params = new URLSearchParams();

    params.append('organizationId', orgId);
    if (filter.actorId) params.append('actorId', filter.actorId);
    if (filter.actorEmail) params.append('actorEmail', filter.actorEmail);
    if (filter.action && filter.action !== 'all') params.append('action', filter.action);
    if (filter.eventType && filter.eventType !== 'all') params.append('eventType', filter.eventType);
    if (filter.module && filter.module !== 'all') params.append('module', filter.module);
    if (filter.entityType && filter.entityType !== 'all') params.append('entityType', filter.entityType);
    if (filter.entityId) params.append('entityId', filter.entityId);
    if (filter.status && filter.status !== 'all') params.append('status', filter.status);
    if (filter.source && filter.source !== 'all') params.append('source', filter.source);
    if (filter.search) params.append('search', filter.search);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.correlationId) params.append('correlationId', filter.correlationId);
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));

    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: {
        'x-organization-id': orgId,
        'x-user-id': user?.id || 'anonymous',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch audit logs (${res.status})`);
    }

    return res.json();
  },

  /**
   * Fetch audit activity and compliance metrics.
   */
  async getMetrics(organizationId = 'org-jyotsvan-corp'): Promise<AuditLogMetrics> {
    const res = await fetch(`${BASE_URL}/metrics?organizationId=${organizationId}`, {
      headers: { 'x-organization-id': organizationId },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch audit metrics');
    }

    return res.json();
  },

  /**
   * Fetch single audit log record by ID.
   */
  async getAuditLogById(id: string, organizationId = 'org-jyotsvan-corp'): Promise<CanonicalAuditRecord> {
    const res = await fetch(`${BASE_URL}/${id}?organizationId=${organizationId}`, {
      headers: { 'x-organization-id': organizationId },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retrieve audit log');
    }

    return res.json();
  },

  /**
   * Fetch complete chronological audit trail for a specific business entity.
   */
  async getEntityAuditHistory(
    entityType: string,
    entityId: string,
    organizationId = 'org-jyotsvan-corp'
  ): Promise<CanonicalAuditRecord[]> {
    const res = await fetch(
      `${BASE_URL}/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}?organizationId=${organizationId}`,
      {
        headers: { 'x-organization-id': organizationId },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retrieve entity audit history');
    }

    const data = await res.json();
    return data.timeline || [];
  },

  /**
   * Execute cryptographic SHA-256 hash-chain integrity verification scan.
   */
  async verifyIntegrity(
    organizationId = 'org-jyotsvan-corp',
    userId?: string
  ): Promise<AuditIntegrityReport> {
    const res = await fetch(`${BASE_URL}/integrity/verify?organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
        'x-user-id': userId || 'system',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to verify audit log integrity');
    }

    return res.json();
  },

  /**
   * Get organization audit retention policy.
   */
  async getRetentionPolicy(organizationId = 'org-jyotsvan-corp'): Promise<AuditRetentionPolicy> {
    const res = await fetch(`${BASE_URL}/retention?organizationId=${organizationId}`, {
      headers: { 'x-organization-id': organizationId },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retrieve retention policy');
    }

    return res.json();
  },

  /**
   * Update organization audit retention policy.
   */
  async updateRetentionPolicy(
    policy: Partial<AuditRetentionPolicy>,
    organizationId = 'org-jyotsvan-corp',
    userId?: string
  ): Promise<AuditRetentionPolicy> {
    const res = await fetch(`${BASE_URL}/retention`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
        'x-user-id': userId || 'system',
      },
      body: JSON.stringify({ ...policy, organizationId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update retention policy');
    }

    return res.json();
  },

  /**
   * Simulate sample enterprise event to test live audit trail.
   */
  async simulateEvent(
    scenario: string,
    organizationId = 'org-jyotsvan-corp',
    user?: AuthUser | null
  ): Promise<{ success: boolean; log: CanonicalAuditRecord }> {
    const res = await fetch(`${BASE_URL}/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
        'x-user-id': user?.id || 'usr-super-admin-01',
      },
      body: JSON.stringify({
        scenario,
        organizationId,
        actorUserId: user?.id || 'usr-super-admin-01',
        actorName: user?.full_name || 'Sovereign Administrator',
        actorEmail: user?.email || 'admin@jyotsvan.com',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Simulation failed');
    }

    return res.json();
  },

  /**
   * Export audit records as CSV or JSON file.
   */
  async exportLogs(
    filter: AuditLogFilter = {},
    format: 'json' | 'csv' = 'json',
    user?: AuthUser | null
  ): Promise<void> {
    const orgId = filter.organizationId || user?.organization_id || 'org-jyotsvan-corp';
    const params = new URLSearchParams();

    params.append('organizationId', orgId);
    params.append('format', format);
    if (filter.actorId) params.append('actorId', filter.actorId);
    if (filter.action && filter.action !== 'all') params.append('action', filter.action);
    if (filter.eventType && filter.eventType !== 'all') params.append('eventType', filter.eventType);
    if (filter.module && filter.module !== 'all') params.append('module', filter.module);
    if (filter.entityType && filter.entityType !== 'all') params.append('entityType', filter.entityType);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.search) params.append('search', filter.search);

    const res = await fetch(`${BASE_URL}/export?${params.toString()}`, {
      headers: {
        'x-organization-id': orgId,
        'x-user-id': user?.id || 'anonymous',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }

    if (format === 'csv') {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jyotsvan-audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      const json = await res.json();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `jyotsvan-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  },
};
