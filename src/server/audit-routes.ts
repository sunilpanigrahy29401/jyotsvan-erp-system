// src/server/audit-routes.ts
// Enterprise REST API Router for Audit Logs & Immutable Compliance (Phase 23)

import { Router } from 'express';
import { AuditService } from './audit-service.ts';
import type { CreateAuditLogParams } from '../types/audit.ts';

export const auditRouter = Router();

// ============================================================================
// 1. Query & List Audit Logs (Paginated, Multi-Tenant, Filtered)
// ============================================================================
auditRouter.get('/audit-logs', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      'org-jyotsvan-corp';

    const {
      actorId,
      actorEmail,
      action,
      eventType,
      module,
      entityType,
      entityId,
      status,
      source,
      search,
      startDate,
      endDate,
      correlationId,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await AuditService.getLogs({
      organizationId,
      actorId: actorId as string,
      actorEmail: actorEmail as string,
      action: action as string,
      eventType: eventType as string,
      module: module as string,
      entityType: entityType as string,
      entityId: entityId as string,
      status: status as string,
      source: source as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      correlationId: correlationId as string,
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 50,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query audit logs';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 2. Audit Metrics & Compliance Dashboard Data
// ============================================================================
auditRouter.get('/audit-logs/metrics', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      'org-jyotsvan-corp';

    const metrics = await AuditService.getMetrics(organizationId);
    res.json(metrics);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve audit metrics';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 3. Cryptographic Tamper-Evident Integrity Verification
// ============================================================================
auditRouter.get('/audit-logs/integrity/verify', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      'org-jyotsvan-corp';

    const actorUserId = (req.headers['x-user-id'] as string) || 'system';

    const report = await AuditService.verifyIntegrity(organizationId);

    // Record the integrity verification execution in the audit trail
    await AuditService.log({
      organizationId,
      actorUserId,
      action: 'SYSTEM_EVENT',
      eventType: 'AUDIT_INTEGRITY_VERIFIED',
      module: 'system',
      entityType: 'audit_integrity_scan',
      entityId: `scan-${Date.now()}`,
      entityName: 'Cryptographic Hash-Chain Integrity Audit',
      metadata: {
        totalRecordsScanned: report.totalRecordsScanned,
        validHashCount: report.validHashCount,
        brokenHashCount: report.brokenHashCount,
        verified: report.verified,
      },
      source: 'API',
    });

    res.json(report);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Integrity verification scan failed';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 4. Audit Retention Policy
// ============================================================================
auditRouter.get('/audit-logs/retention', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      'org-jyotsvan-corp';

    const policy = await AuditService.getRetentionPolicy(organizationId);
    res.json(policy);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve retention policy';
    res.status(500).json({ error: msg });
  }
});

auditRouter.put('/audit-logs/retention', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.body.organizationId as string) ||
      'org-jyotsvan-corp';
    const actorUserId = (req.headers['x-user-id'] as string) || req.body.actorUserId || 'system';

    const updated = await AuditService.updateRetentionPolicy(
      organizationId,
      req.body,
      actorUserId
    );

    res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update retention policy';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 5. Compliance Export (CSV or JSON with Export Audit Event)
// ============================================================================
auditRouter.get('/audit-logs/export', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      'org-jyotsvan-corp';
    const actorUserId = (req.headers['x-user-id'] as string) || 'system';
    const format = (req.query.format as string) || 'json';

    const { logs, total } = await AuditService.getLogs({
      organizationId,
      actorId: req.query.actorId as string,
      action: req.query.action as string,
      eventType: req.query.eventType as string,
      module: req.query.module as string,
      entityType: req.query.entityType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
      page: 1,
      limit: 1000,
    });

    // Record the export in the audit log itself
    await AuditService.logExport({
      organizationId,
      actorUserId,
      eventType: 'AUDIT_EXPORT_GENERATED',
      module: 'security',
      entityType: 'audit_export',
      entityId: `exp-${Date.now()}`,
      entityName: `Audit Log Export (${format.toUpperCase()})`,
      metadata: {
        exportedRows: logs.length,
        totalMatching: total,
        format,
        filtersApplied: {
          action: req.query.action,
          module: req.query.module,
          startDate: req.query.startDate,
          endDate: req.query.endDate,
        },
      },
      source: 'WEB',
    });

    if (format === 'csv') {
      const csvHeader = [
        'Timestamp (UTC)',
        'ID',
        'Actor Email',
        'Actor Name',
        'Actor Type',
        'Module',
        'Action',
        'Event Type',
        'Entity Type',
        'Entity ID',
        'Status',
        'IP Address',
        'Source',
        'Record Hash',
      ].join(',');

      const csvRows = logs.map((l) =>
        [
          `"${l.created_at}"`,
          `"${l.id}"`,
          `"${l.actor_email}"`,
          `"${l.actor_name || ''}"`,
          `"${l.actor_type}"`,
          `"${l.module}"`,
          `"${l.action}"`,
          `"${l.event_type || ''}"`,
          `"${l.entity_type || ''}"`,
          `"${l.entity_id || ''}"`,
          `"${l.status}"`,
          `"${l.ip_address || ''}"`,
          `"${l.source}"`,
          `"${l.record_hash || ''}"`,
        ].join(',')
      );

      const csvContent = [csvHeader, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-export-${Date.now()}.csv`);
      return res.send(csvContent);
    }

    res.json({
      exportedAt: new Date().toISOString(),
      organizationId,
      totalCount: logs.length,
      records: logs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Audit export failed';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 6. Entity-Specific Audit History Timeline
// ============================================================================
auditRouter.get('/audit-logs/entity/:entityType/:entityId', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      'org-jyotsvan-corp';
    const { entityType, entityId } = req.params;

    const timeline = await AuditService.getEntityHistory(
      organizationId,
      entityType,
      entityId
    );

    res.json({ entityType, entityId, timeline });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve entity audit history';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 7. Single Audit Log Record Inspection
// ============================================================================
auditRouter.get('/audit-logs/:id', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      'org-jyotsvan-corp';
    const { id } = req.params;

    const log = await AuditService.getLogById(id, organizationId);
    if (!log) {
      return res.status(404).json({ error: 'Audit log record not found' });
    }

    res.json(log);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve audit log details';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 8. Administrative / Test Simulator for QA Verification
// ============================================================================
auditRouter.post('/audit-logs/simulate', async (req, res) => {
  try {
    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.body.organizationId as string) ||
      'org-jyotsvan-corp';

    const {
      scenario = 'STOCK_ADJUSTED',
      actorUserId = 'usr-super-admin-01',
      actorName = 'Sovereign Administrator',
      actorEmail = 'admin@jyotsvan.com',
    } = req.body;

    let payload: CreateAuditLogParams;

    switch (scenario) {
      case 'INVOICE_POSTED':
        payload = {
          organizationId,
          actorUserId,
          actorName,
          actorEmail,
          action: 'POST',
          eventType: 'INVOICE_POSTED',
          module: 'finance',
          entityType: 'invoice',
          entityId: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
          entityName: 'Tax Invoice to Paramount Retailers',
          beforeState: { status: 'draft', total_amount: 320000.00, gl_posted: false },
          afterState: { status: 'posted', total_amount: 320000.00, gl_posted: true, receivable_code: 'AR-2091' },
          metadata: { irn: 'IRN-SIM-902184', gst_amount: 38400.00 },
          source: 'WEB',
        };
        break;

      case 'QC_APPROVED':
        payload = {
          organizationId,
          actorUserId,
          actorName,
          actorEmail,
          action: 'APPROVE',
          eventType: 'QC_APPROVED',
          module: 'quality',
          entityType: 'qc_inspection',
          entityId: `QC-INSP-${Math.floor(100 + Math.random() * 900)}`,
          entityName: 'Batch Finished Goods QC Inspection',
          beforeState: { status: 'in_review', test_params_passed: 10, total_params: 12 },
          afterState: { status: 'approved', test_params_passed: 12, total_params: 12, certificate_ready: true },
          metadata: { coa_reference: 'COA-2026-0928', lab_technician: 'Priya Sharma' },
          source: 'WEB',
        };
        break;

      case 'ROLE_CHANGED':
        payload = {
          organizationId,
          actorUserId,
          actorName,
          actorEmail,
          action: 'UPDATE',
          eventType: 'ROLE_PERMISSIONS_UPDATED',
          module: 'security',
          entityType: 'role',
          entityId: 'role-plant-manager',
          entityName: 'Plant Facility Operations Manager',
          beforeState: { permissions_count: 24, permissions: ['inventory.view', 'warehouse.manage'] },
          afterState: { permissions_count: 28, permissions: ['inventory.view', 'warehouse.manage', 'quality.inspect', 'audit_logs.view'] },
          metadata: { authorized_by: 'Super Admin', security_clearance: 'Level 4' },
          source: 'WEB',
        };
        break;

      case 'FAILED_PAYMENT':
        payload = {
          organizationId,
          actorUserId,
          actorName,
          actorEmail,
          action: 'POST',
          eventType: 'PAYMENT_ALLOCATED',
          module: 'finance',
          entityType: 'payment_allocation',
          entityId: `PAY-ERR-${Math.floor(100 + Math.random() * 900)}`,
          entityName: 'Payment Allocation ₹5,00,000 to Closed Invoice',
          beforeState: { invoice_status: 'paid', outstanding: 0.00 },
          afterState: { invoice_status: 'paid', outstanding: 0.00 },
          status: 'FAILED',
          failureReason: 'Transaction Aborted: Target invoice INV-2026-001 has zero outstanding balance.',
          metadata: { attempted_amount: 500000.00 },
          source: 'API',
        };
        break;

      case 'STOCK_ADJUSTED':
      default:
        payload = {
          organizationId,
          actorUserId,
          actorName,
          actorEmail,
          action: 'UPDATE',
          eventType: 'INVENTORY_STOCK_ADJUSTED',
          module: 'inventory',
          entityType: 'inventory_item',
          entityId: `SKU-HERB-${Math.floor(100 + Math.random() * 900)}`,
          entityName: 'Herbal Extract 500ml Stock Adjustment',
          beforeState: { on_hand_qty: 450, available_qty: 400 },
          afterState: { on_hand_qty: 520, available_qty: 470 },
          metadata: { adjustment_reason: 'Physical inventory cycle count reconciliation variance +70' },
          source: 'WEB',
        };
        break;
    }

    const createdLog = await AuditService.log(payload);
    res.json({ success: true, log: createdLog });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Simulation failed';
    res.status(500).json({ error: msg });
  }
});

// ============================================================================
// 9. STRICT APPEND-ONLY IMMUTABILITY REJECTION HANDLERS
// ============================================================================
// Normal users and API clients are strictly forbidden from modifying or deleting audit records.
auditRouter.delete('/audit-logs*', async (req, res) => {
  const organizationId = (req.headers['x-organization-id'] as string) || 'org-jyotsvan-corp';
  const actorUserId = (req.headers['x-user-id'] as string) || 'unauthorized-client';

  // Record the illegal deletion attempt as a critical security audit event!
  try {
    await AuditService.logSecurityEvent({
      organizationId,
      actorUserId,
      action: 'DELETE',
      eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      module: 'security',
      entityType: 'audit_logs',
      entityId: req.path,
      entityName: 'Illegal Audit Log Modification Attempt',
      status: 'FAILED',
      failureReason: `Security Violation: Attempted to DELETE audit log at ${req.path}. Audit logs are append-only.`,
      metadata: { requestedPath: req.path, ip: req.ip, headers: req.headers },
      source: 'API',
    });
  } catch {
    // Ignore error
  }

  res.status(403).json({
    error: 'Security Breach Prevention: Audit logs are legally immutable and append-only. Deletion is forbidden.',
    code: 'ERR_AUDIT_LOG_IMMUTABLE',
  });
});

auditRouter.put('/audit-logs/:id', async (req, res) => {
  if (req.params.id === 'retention') {
    // handled above by retention policy route
    return;
  }

  const organizationId = (req.headers['x-organization-id'] as string) || 'org-jyotsvan-corp';
  const actorUserId = (req.headers['x-user-id'] as string) || 'unauthorized-client';

  // Record the illegal update attempt
  try {
    await AuditService.logSecurityEvent({
      organizationId,
      actorUserId,
      action: 'UPDATE',
      eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      module: 'security',
      entityType: 'audit_logs',
      entityId: req.params.id,
      entityName: 'Illegal Audit Log Mutation Attempt',
      status: 'FAILED',
      failureReason: `Security Violation: Attempted to UPDATE audit record ${req.params.id}. Audit logs cannot be rewritten.`,
      metadata: { requestedId: req.params.id, ip: req.ip },
      source: 'API',
    });
  } catch {
    // Ignore error
  }

  res.status(403).json({
    error: 'Security Breach Prevention: Audit logs are legally immutable and cannot be altered or rewritten.',
    code: 'ERR_AUDIT_LOG_IMMUTABLE',
  });
});
