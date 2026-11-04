import { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Building2,
  Package,
  Layers,
  FileCheck2,
  Calendar,
} from 'lucide-react';
import type { QCInspection, QCInspectionStatus } from '../../../types/quality';

interface InspectionListTableProps {
  inspections: QCInspection[];
  loading?: boolean;
  onSelectInspection: (inspection: QCInspection) => void;
  onNewInspection?: () => void;
  onFilterChange?: (filters: any) => void;
}

export function InspectionListTable({
  inspections,
  loading = false,
  onSelectInspection,
  onNewInspection,
}: InspectionListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = inspections.filter((insp) => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = insp.inspection_number?.toLowerCase().includes(term);
      const matchSource = insp.source_id?.toLowerCase().includes(term);
      const matchSku = (insp.sku_code || '').toLowerCase().includes(term) || (insp.product_name || '').toLowerCase().includes(term);
      const matchBatch = (insp.batch_number || '').toLowerCase().includes(term);
      const matchSup = (insp.supplier_name || '').toLowerCase().includes(term);
      if (!matchNum && !matchSource && !matchSku && !matchBatch && !matchSup) return false;
    }

    // Status
    if (statusFilter !== 'all' && insp.status !== statusFilter) {
      return false;
    }

    // Type
    if (typeFilter !== 'all' && insp.inspection_type !== typeFilter) {
      return false;
    }

    return true;
  });

  const getStatusBadge = (status: QCInspectionStatus) => {
    switch (status) {
      case 'approved':
      case 'released':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved & Released</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected (OOS)</span>
          </span>
        );
      case 'quarantine':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Quarantine Hold</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Under Review</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Testing In Progress</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Sample</span>
          </span>
        );
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
            PASS
          </span>
        );
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
            FAIL
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
            CONDITIONAL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Control Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by QC #, GRN #, SKU, Batch #, Supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved & Released</option>
              <option value="rejected">Rejected (OOS)</option>
              <option value="quarantine">Quarantine Hold</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="incoming">Incoming Material (GRN)</option>
              <option value="in_process">In-Process Blend</option>
              <option value="finished_good">Finished Goods (FG)</option>
              <option value="re_inspection">Re-Inspection</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Inspection #</th>
              <th className="py-3 px-4">Material / SKU</th>
              <th className="py-3 px-4">Source & Batch</th>
              <th className="py-3 px-4">Quantity</th>
              <th className="py-3 px-4">QC Specification</th>
              <th className="py-3 px-4">Result</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Inspected Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clock className="w-6 h-6 animate-spin text-emerald-600" />
                    <span>Loading Quality Control registers...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileCheck2 className="w-8 h-8 text-slate-300" />
                    <span className="font-medium text-slate-700">No QC inspections found</span>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchTerm || statusFilter !== 'all'
                        ? 'No inspections match your active search filters.'
                        : 'Log a new quality inspection or receive raw material to trigger inward QC.'}
                    </p>
                    {onNewInspection && (
                      <button
                        onClick={onNewInspection}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Log First Inspection
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((insp) => (
                <tr
                  key={insp.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectInspection(insp)}
                >
                  {/* Inspection # */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{insp.inspection_number}</span>
                      {insp.is_reinspection && (
                        <span
                          className="p-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold"
                          title={`Re-inspection of ${insp.parent_inspection_number || 'previous batch'}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">
                      {insp.inspection_type.replace('_', ' ')}
                    </div>
                  </td>

                  {/* SKU & Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{insp.sku_code || 'SKU'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {insp.product_name || insp.sku_name || 'Standard Material'}
                    </div>
                  </td>

                  {/* Source & Batch */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800 flex items-center gap-1">
                      <span>{insp.source_id || 'Manual Inward'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Batch: <span className="font-mono text-slate-700">{insp.batch_number || 'N/A'}</span>
                    </div>
                    {insp.supplier_name && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-2.5 h-2.5" />
                        <span>{insp.supplier_name}</span>
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">
                      {insp.received_quantity.toLocaleString()} {insp.unit_code || 'units'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sample: {insp.sample_quantity} {insp.unit_code || 'units'}
                    </div>
                  </td>

                  {/* Template */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-slate-800 font-medium">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{insp.template_name || 'Standard Raw Material Spec'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      v{insp.template_version_snapshot || 1} Specification
                    </div>
                  </td>

                  {/* Auto Result */}
                  <td className="py-3.5 px-4">
                    {getResultBadge(insp.overall_result)}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(insp.status)}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{new Date(insp.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {insp.inspected_by_email ? `By: ${insp.inspected_by_email.split('@')[0]}` : 'Unassigned'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectInspection(insp);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Workbench</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {filtered.length} of {inspections.length} total inspections</span>
        <span className="text-[11px]">Strict ISO 9001:2015 QC Governance Enforced</span>
      </div>
    </div>
  );
}
