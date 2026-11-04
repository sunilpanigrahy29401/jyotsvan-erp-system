import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle,
  Plus,
  RotateCw,
  CheckCircle2,
  X,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { batchApi } from '../../../services/batchApi';
import type { BatchHold, BatchStatus } from '../../../types/batches';

interface BatchHoldsTabProps {
  onInspectBatch: (batchId: string) => void;
  onRefreshBatchData: () => void;
}

export function BatchHoldsTab({ onInspectBatch, onRefreshBatchData }: BatchHoldsTabProps) {
  const [holds, setHolds] = useState<BatchHold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Release Hold Modal State
  const [selectedHold, setSelectedHold] = useState<BatchHold | null>(null);
  const [releaseJustification, setReleaseJustification] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState<BatchStatus>('released');
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const fetchHolds = async () => {
    setIsLoading(true);
    try {
      const data = await batchApi.getHolds({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setHolds(data.holds);
    } catch (err) {
      console.error('Failed to load batch holds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolds();
  }, [statusFilter]);

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHold) return;
    if (!releaseJustification.trim() || releaseJustification.trim().length < 5) {
      setReleaseError('Please enter a formal justification (min 5 characters) to authorize lifting this hold.');
      return;
    }

    setIsReleasing(true);
    setReleaseError(null);
    try {
      await batchApi.releaseHold(selectedHold.id, {
        releaseJustification,
        resolutionNotes,
        targetStatus,
      });
      setSelectedHold(null);
      setReleaseJustification('');
      setResolutionNotes('');
      fetchHolds();
      onRefreshBatchData();
    } catch (err: any) {
      setReleaseError(err.message || 'Failed to release hold.');
    } finally {
      setIsReleasing(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical_class_1':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900 border border-rose-300">Critical Class 1</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">High Risk</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Low</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Lock className="w-4 h-4 text-rose-600" />
            <span>Active Batch Holds, Quarantines & Regulatory Recalls</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quarantine inventory locks placed by Quality Control, Non-Conformance Reports, or Supplier Deviations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Records</option>
            <option value="active">Active Holds Only</option>
            <option value="released">Released / Cleared</option>
          </select>
        </div>
      </div>

      {/* Holds Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Hold Reference</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Hold Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Affected Qty</th>
                <th className="py-3 px-4">Initiated By / Reason</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading hold registers...</span>
                  </td>
                </tr>
              ) : holds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No active or historical holds match the selected criteria.
                  </td>
                </tr>
              ) : (
                holds.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{h.hold_number}</td>
                    <td className="py-3 px-4">
                      <span
                        onClick={() => onInspectBatch(h.batch_id)}
                        className="font-mono font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {h.batch_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-semibold text-slate-800 block truncate">{h.product_name}</span>
                      <span className="text-[10px] text-slate-400">{h.sku_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-700">{h.hold_type.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4">{getSeverityBadge(h.severity)}</td>
                    <td className="py-3 px-4">
                      {h.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Active Lock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Released
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {h.affected_quantity.toLocaleString()} {h.unit_code}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-slate-800 block truncate">{h.reason}</span>
                      <span className="text-[10px] text-slate-400">{h.placed_by_email || 'QA Officer'}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {h.status === 'active' ? (
                        <button
                          onClick={() => setSelectedHold(h)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center space-x-1 ml-auto"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Release Hold</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Cleared on {new Date(h.released_at!).toLocaleDateString()}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Hold Dialog Modal */}
      {selectedHold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Authorize Hold Release</h3>
                  <p className="text-xs text-slate-500">Hold #{selectedHold.hold_number} • Batch #{selectedHold.batch_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHold(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReleaseSubmit} className="p-6 space-y-4">
              {releaseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{releaseError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Batch State After Release <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as BatchStatus)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="released">Released (Available for Production / Sale)</option>
                  <option value="quarantine">Quarantine (Pending Secondary Testing)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Release Justification & Investigation Finding <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={releaseJustification}
                  onChange={(e) => setReleaseJustification(e.target.value)}
                  placeholder="e.g. Laboratory re-test passed with 99.85% purity assay; drum seals verified intact by QA Lead."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Corrective / Preventive Action (CAPA) Notes
                </label>
                <input
                  type="text"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Supplier audited; CAPA-2026-004 logged."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedHold(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReleasing}
                  className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isReleasing ? 'Authorizing...' : 'Lift Hold & Release'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
