// src/app/pages/settings/integrations/IntegrationLogsConsole.tsx
// Operational API Traffic Logs & Inspector Console

import React, { useState } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Dialog } from '../../../../components/ui/dialog';
import {
  Activity,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
} from 'lucide-react';
import type { IntegrationLog } from '../../../../types/integrations.ts';
import { useToast } from '../../../../context/ToastContext.tsx';

interface IntegrationLogsConsoleProps {
  logs: IntegrationLog[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function IntegrationLogsConsole({ logs, isLoading, onRefresh }: IntegrationLogsConsoleProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);

  const filtered = logs.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const endpointStr = l.endpoint || (l.request_metadata?.url as string) || l.operation || '';
    const methodStr = l.method || (l.request_metadata?.method as string) || '';
    return (
      endpointStr.toLowerCase().includes(term) ||
      l.provider_key.toLowerCase().includes(term) ||
      l.status_code?.toString().includes(term) ||
      methodStr.toLowerCase().includes(term) ||
      (l.error_message && l.error_message.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (code?: number | null) => {
    if (!code) return <Badge variant="outline" className="text-[10px]">N/A</Badge>;
    if (code >= 200 && code < 300) {
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono">{code}</Badge>;
    }
    if (code >= 300 && code < 400) {
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-mono">{code}</Badge>;
    }
    if (code >= 400 && code < 500) {
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-mono">{code}</Badge>;
    }
    return <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono">{code}</Badge>;
  };

  const getMethodBadge = (log: IntegrationLog) => {
    const m = (log.method || (log.request_metadata?.method as string) || 'GET').toUpperCase();
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-emerald-100 text-emerald-800',
      PUT: 'bg-amber-100 text-amber-800',
      PATCH: 'bg-purple-100 text-purple-800',
      DELETE: 'bg-rose-100 text-rose-800',
    };
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${colors[m] || 'bg-slate-100 text-slate-800'}`}>{m}</span>;
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const copyJson = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showToast('Payload copied to clipboard', 'info');
  };

  const getEndpoint = (log: IntegrationLog) => {
    return log.endpoint || (log.request_metadata?.url as string) || (log.request_metadata?.path as string) || log.operation || '/';
  };

  const getRequestPayload = (log: IntegrationLog) => {
    return log.request_payload || log.request_metadata;
  };

  const getResponsePayload = (log: IntegrationLog) => {
    return log.response_payload || log.response_metadata;
  };

  return (
    <div className="space-y-4">
      {/* Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search API logs by path, status, provider..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stream
        </Button>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading operational traffic logs...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No integration traffic logs found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Perform a connection test or send a REST request from the runner to view traces.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans font-semibold">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Endpoint</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp || log.created_at)}
                    </td>
                    <td className="py-2 px-3">
                      {log.direction === 'inbound' ? (
                        <span className="flex items-center gap-1 text-indigo-600 text-[11px] font-sans font-medium">
                          <ArrowDownLeft className="w-3 h-3" /> Inbound
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-teal-600 text-[11px] font-sans font-medium">
                          <ArrowUpRight className="w-3 h-3" /> Outbound
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">
                      {log.provider_key}
                    </td>
                    <td className="py-2 px-3">
                      {getMethodBadge(log)}
                    </td>
                    <td className="py-2 px-3 text-slate-700 max-w-xs truncate" title={getEndpoint(log)}>
                      {getEndpoint(log)}
                    </td>
                    <td className="py-2 px-3">
                      {getStatusBadge(log.status_code)}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-6 text-[11px] px-2 text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Detail Inspector Dialog */}
      <Dialog
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="HTTP Trace Detail"
        description={selectedLog ? getEndpoint(selectedLog) : undefined}
        maxWidth="xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-sans font-semibold">Provider</span>
                <div className="font-semibold text-slate-800">{selectedLog.provider_key}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-sans font-semibold">Direction</span>
                <div className="capitalize text-slate-800">{selectedLog.direction}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-sans font-semibold">Latency</span>
                <div className="text-slate-800">{selectedLog.duration_ms || 0} ms</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-sans font-semibold">Timestamp</span>
                <div className="text-slate-800">{new Date(selectedLog.created_at).toLocaleString()}</div>
              </div>
            </div>

            {/* Error Alert if any */}
            {selectedLog.error_message && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Error Diagnostic
                </div>
                <div className="font-mono text-[11px] whitespace-pre-wrap">{selectedLog.error_message}</div>
              </div>
            )}

            {/* Request Headers & Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 font-sans">Request Payload / Metadata</span>
                {getRequestPayload(selectedLog) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyJson(getRequestPayload(selectedLog))}
                    className="h-6 text-[10px] text-slate-500"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy JSON
                  </Button>
                )}
              </div>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px] max-h-48 leading-relaxed font-mono">
                {getRequestPayload(selectedLog)
                  ? JSON.stringify(getRequestPayload(selectedLog), null, 2)
                  : '// No request metadata'}
              </pre>
            </div>

            {/* Response Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 font-sans">Response Payload / Metadata</span>
                {getResponsePayload(selectedLog) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyJson(getResponsePayload(selectedLog))}
                    className="h-6 text-[10px] text-slate-500"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy JSON
                  </Button>
                )}
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto text-[11px] max-h-56 leading-relaxed font-mono">
                {getResponsePayload(selectedLog)
                  ? JSON.stringify(getResponsePayload(selectedLog), null, 2)
                  : '// No response payload'}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
