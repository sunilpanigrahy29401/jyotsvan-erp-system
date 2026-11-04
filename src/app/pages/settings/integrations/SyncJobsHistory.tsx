// src/app/pages/settings/integrations/SyncJobsHistory.tsx
// Data Synchronization Run History & Audit Ledger

import React from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database, Layers } from 'lucide-react';
import type { IntegrationSyncJob } from '../../../../types/integrations.ts';

interface SyncJobsHistoryProps {
  jobs: IntegrationSyncJob[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function SyncJobsHistory({ jobs, isLoading, onRefresh }: SyncJobsHistoryProps) {
  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] animate-pulse">Running</Badge>;
      case 'failed':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Data Synchronization Runs</h3>
          <p className="text-xs text-slate-500">History of catalog pulls, order syncs, and stock reconciliation batches.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading synchronization records...</div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <RefreshCw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No sync executions yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Trigger a sync from the Active Connections tab or wait for scheduled background runs.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Job ID & Provider</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Records Processed</th>
                  <th className="py-2.5 px-3">Details (New/Mod/Fail)</th>
                  <th className="py-2.5 px-3">Started At</th>
                  <th className="py-2.5 px-3 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const duration = job.completed_at && job.started_at
                    ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                    : '-';

                  return (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-slate-900 font-medium">{job.id.slice(0, 16)}...</div>
                        <div className="text-[11px] text-slate-500">{job.provider_key}</div>
                      </td>
                      <td className="py-2.5 px-3 capitalize font-medium text-slate-700">
                        {job.job_type}
                      </td>
                      <td className="py-2.5 px-3">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {job.records_processed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className="text-emerald-600">+{job.records_created}</span> /{' '}
                        <span className="text-blue-600">~{job.records_updated}</span> /{' '}
                        <span className="text-rose-600">!{job.records_failed}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {formatTimestamp(job.started_at)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {duration}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
