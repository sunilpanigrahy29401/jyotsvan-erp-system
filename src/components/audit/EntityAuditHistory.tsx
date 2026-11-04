// src/components/audit/EntityAuditHistory.tsx
// Reusable Entity Audit History Timeline & Visual Diff Component (Phase 23)

import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowRight,
  Code2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { auditApi } from '../../services/auditApi';
import type { CanonicalAuditRecord, ChangedField } from '../../types/audit';

interface EntityAuditHistoryProps {
  entityType: string;
  entityId: string;
  organizationId?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function EntityAuditHistory({
  entityType,
  entityId,
  organizationId,
  title = 'Entity Lifecycle Audit Trail',
  description = 'Immutable chronological record of modifications, status changes, and approvals.',
  className = '',
}: EntityAuditHistoryProps) {
  const [logs, setLogs] = useState<CanonicalAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.getEntityAuditHistory(entityType, entityId, organizationId);
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load entity audit history';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [entityType, entityId, organizationId]);

  const getActionBadgeColor = (action: string, status: string) => {
    if (status === 'FAILED') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('APPROVE') || action.includes('POST')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('REJECT'))
      return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('UPDATE')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadHistory}
          disabled={loading}
          className="text-xs gap-1 h-7 text-slate-600"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading immutable audit trail...</span>
        </div>
      ) : error ? (
        <div className="py-4 px-3 bg-rose-50 rounded-lg text-xs text-rose-700 border border-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={loadHistory} className="h-6 text-[11px]">
            Retry
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No audit entries recorded for this entity yet. Future updates will be tracked automatically.
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6 my-2">
          {logs.map((log, index) => {
            const isExpanded = expandedLogId === log.id;
            const changedFields: ChangedField[] = Array.isArray(log.changed_fields)
              ? log.changed_fields
              : [];

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white shadow-2xs ${
                    log.status === 'FAILED'
                      ? 'border-rose-500 text-rose-600'
                      : 'border-indigo-500 text-indigo-600'
                  }`}
                >
                  {log.status === 'FAILED' ? (
                    <XCircle className="w-3 h-3 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                  )}
                </div>

                {/* Timeline Card */}
                <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors border border-slate-200/80 rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase tracking-wide py-0 ${getActionBadgeColor(
                          log.action,
                          log.status
                        )}`}
                      >
                        {log.action}
                      </Badge>
                      <span className="text-xs font-bold text-slate-900">
                        {log.event_type || log.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actor & Source Info */}
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {log.actor_name || log.actor_email}
                      </span>
                      <span className="text-[10px] text-slate-400">({log.actor_type})</span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      Source: <span className="uppercase text-slate-600">{log.source}</span>
                    </div>

                    {log.ip_address && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>

                  {/* Failure reason if failed */}
                  {log.status === 'FAILED' && log.failure_reason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 font-medium">
                      ⚠️ Failure: {log.failure_reason}
                    </div>
                  )}

                  {/* Changed Fields Summary (Diff Table) */}
                  {changedFields.length > 0 && (
                    <div className="mt-2 bg-white rounded border border-slate-200/90 overflow-hidden">
                      <div className="px-2.5 py-1 bg-slate-100/70 border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-600 tracking-wider">
                        Field-Level Modifications ({changedFields.length})
                      </div>
                      <table className="w-full text-left text-xs font-sans">
                        <tbody className="divide-y divide-slate-100">
                          {changedFields.map((f, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="py-1 px-2.5 font-medium text-slate-700 w-1/3">
                                {f.label || f.key}
                              </td>
                              <td className="py-1 px-2.5 text-slate-400 line-through text-[11px]">
                                {f.old_value !== null && f.old_value !== undefined
                                  ? String(f.old_value)
                                  : '—'}
                              </td>
                              <td className="py-1 px-1 text-slate-400 text-center w-4">
                                <ArrowRight className="w-3 h-3 text-slate-400 inline" />
                              </td>
                              <td className="py-1 px-2.5 font-semibold text-emerald-700 text-[11px]">
                                {f.new_value !== null && f.new_value !== undefined
                                  ? String(f.new_value)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Toggle Detailed JSON Payload */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                    >
                      <Code2 className="w-3 h-3" />
                      {isExpanded ? 'Hide Raw Metadata' : 'Inspect Raw Metadata'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {log.record_hash && (
                      <span className="text-[9px] text-slate-400 font-mono" title={`SHA256: ${log.record_hash}`}>
                        SHA-256: {log.record_hash.substring(0, 10)}...
                      </span>
                    )}
                  </div>

                  {/* Expanded JSON */}
                  {isExpanded && (
                    <div className="mt-2 space-y-2 text-xs">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">
                            Metadata Payload
                          </span>
                          <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded text-[11px] font-mono overflow-x-auto max-h-40">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
