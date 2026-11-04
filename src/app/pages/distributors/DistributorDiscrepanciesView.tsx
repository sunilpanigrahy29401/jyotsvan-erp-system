import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Clock,
} from 'lucide-react';
import type { DistributorDiscrepancy, DiscrepancyResolutionStatus } from '../../../types/distributors.ts';
import { distributorApi } from '../../../services/distributorApi.ts';

interface DistributorDiscrepanciesViewProps {
  discrepancies: DistributorDiscrepancy[];
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onRefresh: () => void;
}

export const DistributorDiscrepanciesView: React.FC<DistributorDiscrepanciesViewProps> = ({
  discrepancies,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<DiscrepancyResolutionStatus>('settled');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId) return;

    try {
      await distributorApi.resolveDiscrepancy(resolvingId, {
        resolution_status: resolutionStatus,
        resolution_notes: resolutionNotes,
      });
      setResolvingId(null);
      setResolutionNotes('');
      onRefresh();
    } catch (err: any) {
      alert(`Resolution failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status: DiscrepancyResolutionStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Pending Review</span>;
      case 'settled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Credit Settled</span>;
      case 'approved_write_off':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Written Off</span>;
      case 'investigating':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Investigating</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Claim Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by transfer #, SKU, distributor, reason..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="all">All Resolutions</option>
            <option value="pending">Pending</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="approved_credit_note">Credit Note Approved</option>
            <option value="approved_write_off">Write-Off Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Discrepancy Resolution Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Resolve Discrepancy Claim</h3>
            <p className="text-xs text-slate-500 mb-4">Select the commercial settlement decision for this discrepancy.</p>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Action</label>
                <select
                  value={resolutionStatus}
                  onChange={e => setResolutionStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                >
                  <option value="approved_credit_note">Approve & Issue Credit Note (C&F / Plant Absorbs)</option>
                  <option value="approved_write_off">Approve Transit Insurance Write-Off</option>
                  <option value="under_investigation">Mark Under Logistics Investigation</option>
                  <option value="rejected">Reject Claim (Distributor Accountable)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Investigation Notes & Justification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter resolution notes, insurance reference or reason for decision..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingId(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Submit Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discrepancies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transfer & SKU</th>
                <th className="py-3 px-4">Distributor Channel</th>
                <th className="py-3 px-4">Type & Reason</th>
                <th className="py-3 px-4 text-right">Expected</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Discrepancy</th>
                <th className="py-3 px-4">Resolution Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Loading receiving discrepancy audit register...</p>
                  </td>
                </tr>
              ) : discrepancies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">Zero open receiving discrepancies</p>
                    <p className="text-xs text-slate-400 mt-1">All C&F-to-distributor dispatches matched gate receipts.</p>
                  </td>
                </tr>
              ) : (
                discrepancies.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-blue-600 block">{d.transfer_number || 'TRF-TRANSFER'}</span>
                      <span className="text-xs font-semibold text-slate-900 block">{d.sku_name || d.sku_id}</span>
                      <span className="text-[11px] text-slate-500 block">Batch: {d.batch_number || 'N/A'}</span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {d.distributor_name}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-rose-600 capitalize block">{d.discrepancy_type.replace('_', ' ')}</span>
                      <span className="text-[11px] text-slate-500 block">{d.resolution_notes || 'Receipt variance reported at delivery dock.'}</span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      ₹{d.unit_cost?.toLocaleString('en-IN') || '0'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      ₹{d.total_loss_value?.toLocaleString('en-IN') || '0'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      -{d.quantity} Units
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(d.resolution_status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {d.resolution_status === 'pending' || d.resolution_status === 'investigating' ? (
                        <button
                          onClick={() => setResolvingId(d.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
