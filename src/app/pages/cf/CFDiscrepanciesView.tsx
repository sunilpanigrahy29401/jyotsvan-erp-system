import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Building2,
  Package,
} from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFTransferDiscrepancy, CFMaster } from '../../../types/cfs';

interface CFDiscrepanciesViewProps {
  discrepancies: CFTransferDiscrepancy[];
  cfs: CFMaster[];
  loading: boolean;
  onRefresh: () => void;
}

export const CFDiscrepanciesView: React.FC<CFDiscrepanciesViewProps> = ({
  discrepancies,
  cfs,
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCf, setSelectedCf] = useState<string>('all');

  // Resolution Modal State
  const [resolvingItem, setResolvingItem] = useState<CFTransferDiscrepancy | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState('reconciled');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDiscrepancies = discrepancies.filter((d) => {
    const matchesSearch =
      (d.transfer_number && d.transfer_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.sku_name && d.sku_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.sku_code && d.sku_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.batch_number && d.batch_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || d.resolution_status === selectedStatus;
    const matchesCf = selectedCf === 'all' || d.transfer_id === selectedCf;

    return matchesSearch && matchesStatus && matchesCf;
  });

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;
    try {
      setIsSubmitting(true);
      await cfApi.resolveDiscrepancy(resolvingItem.id, resolutionStatus, resolutionNotes);
      setResolvingItem(null);
      onRefresh();
    } catch (err: any) {
      alert(`Resolution error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDiscrepancyTypeBadge = (type: string) => {
    switch (type) {
      case 'shortage':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Transit Shortage</span>;
      case 'damaged':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800">Physical Damage</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">QC Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-800">{type}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search variance #, transfer #, SKU, or C&F..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All Resolution States</option>
            <option value="pending">Pending Investigation</option>
            <option value="investigating">Under Carrier Inquiry</option>
            <option value="reconciled">Reconciled / Settled</option>
            <option value="claimed">Insurance Claimed</option>
            <option value="written_off">Written Off</option>
          </select>

          <select
            value={selectedCf}
            onChange={(e) => setSelectedCf(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All C&F Agencies</option>
            {cfs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name} ({c.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Discrepancy # & Transfer</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Product SKU & Batch</th>
                <th className="py-3 px-4">C&F Agency</th>
                <th className="py-3 px-4 text-right">Dispatched / Received / Variance</th>
                <th className="py-3 px-4">Resolution Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Loading Inward Discrepancy Log...
                  </td>
                </tr>
              ) : filteredDiscrepancies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Zero transit variances or damages recorded across all C&F depots.
                  </td>
                </tr>
              ) : (
                filteredDiscrepancies.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-neutral-900 text-sm">
                        DISC-{d.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        Transfer: <strong className="text-blue-600">{d.transfer_number || 'TRF-RECEIPT'}</strong>
                      </div>
                    </td>

                    <td className="py-3 px-4">{getDiscrepancyTypeBadge(d.discrepancy_type)}</td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{d.sku_name || 'SKU Item'}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {d.sku_code || d.sku_id} {d.batch_number ? `• Batch: ${d.batch_number}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900">{d.reported_by_email || 'Depot Receiver'}</div>
                      <div className="text-[11px] text-neutral-500">{new Date(d.reported_at).toLocaleDateString()}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="text-xs font-bold text-red-600">
                        Variance: {d.quantity} Units
                      </div>
                      {d.unit_cost && (
                        <div className="text-[11px] text-neutral-500">
                          ₹{(d.quantity * d.unit_cost).toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        d.resolution_status === 'settled' || d.resolution_status === 'approved_write_off'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.resolution_status}
                      </span>
                      {d.resolution_notes && (
                        <div className="text-[10px] text-neutral-400 truncate max-w-xs mt-0.5">
                          {d.resolution_notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {d.resolution_status === 'pending' || d.resolution_status === 'investigating' ? (
                        <button
                          onClick={() => {
                            setResolvingItem(d);
                            setResolutionStatus('settled');
                            setResolutionNotes('');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          Resolve / Settle
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Discrepancy Modal */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-neutral-200">
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              Resolve Variance ({resolvingItem.id.slice(0, 8).toUpperCase()})
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Variance of <strong>{resolvingItem.quantity} units</strong> on SKU <strong>{resolvingItem.sku_name || resolvingItem.sku_id}</strong>.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Resolution Outcome</label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="reconciled">Reconciled (Found in secondary physical recount)</option>
                  <option value="claimed">Insurance / Carrier Transit Claim Filed</option>
                  <option value="written_off">Written Off (Approved Loss / Shrinkage)</option>
                  <option value="investigating">Mark as Under Active Investigation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Investigation & Settlement Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter investigation details, debit note reference, or carrier acknowledgement..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setResolvingItem(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs"
                >
                  Save Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
