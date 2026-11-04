import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  Edit3,
  Copy,
  Scale,
  CheckCircle,
  PlayCircle,
  Archive,
  Layers,
  ChevronRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import type { Formulation, FormulationStatus } from '../../../types/formulations';

interface Props {
  formulations: Formulation[];
  loading: boolean;
  onSelectFormulation: (f: Formulation) => void;
  onEditFormulation: (f: Formulation) => void;
  onNewVersion: (f: Formulation) => void;
  onScaleBatch: (f: Formulation) => void;
  onCompareVersions: (f: Formulation) => void;
  onSubmitForReview: (f: Formulation) => void;
  onApprove: (f: Formulation) => void;
  onActivate: (f: Formulation) => void;
  onArchive: (f: Formulation) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
}

export function FormulationListTable({
  formulations,
  loading,
  onSelectFormulation,
  onEditFormulation,
  onNewVersion,
  onScaleBatch,
  onCompareVersions,
  onSubmitForReview,
  onApprove,
  onActivate,
  onArchive,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getStatusBadge = (status: FormulationStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full">
            <CheckCircle className="w-3 h-3 text-blue-500" />
            Approved
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Under Review
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
            Draft
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 rounded-full">
            Inactive
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded-full">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, recipe name, SKU..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Status:
          </div>
          {(['all', 'active', 'approved', 'under_review', 'draft', 'inactive'] as const).map(st => (
            <button
              key={st}
              onClick={() => onStatusFilterChange(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {st === 'all'
                ? 'All Status'
                : st === 'under_review'
                ? 'Under Review'
                : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Formulation / Recipe</th>
              <th className="py-3 px-4">Target Finished SKU</th>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Batch Basis & Yield</th>
              <th className="py-3 px-4">Est. Material Cost</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Loading formulations...
                  </div>
                </td>
              </tr>
            ) : formulations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-medium text-slate-600">No formulations found</p>
                    <p className="text-[11px] text-slate-400">
                      Try adjusting your search criteria or create a new formulation recipe.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              formulations.map(f => {
                const yieldPct = f.yield_percentage || 0;
                return (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectFormulation(f)}
                  >
                    {/* Formulation Identity */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {f.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>{f.formulation_code}</span>
                      </div>
                    </td>

                    {/* Finished Product & SKU */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {f.finished_product_name || f.finished_sku_name || '—'}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600">
                        {f.finished_sku_code}
                      </div>
                    </td>

                    {/* Version Badge */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        v{f.version}
                      </span>
                    </td>

                    {/* Batch Basis & Yield */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">
                        {f.batch_size.toLocaleString()} {f.batch_size_unit_code}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          {f.expected_yield.toLocaleString()} {f.expected_yield_unit_code} ({yieldPct}%)
                        </span>
                      </div>
                    </td>

                    {/* Estimated Cost */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        ₹{(f.estimated_total_cost || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ₹{(f.cost_per_yield_unit || 0).toFixed(2)} / {f.expected_yield_unit_code}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">{getStatusBadge(f.status)}</td>

                    {/* Actions Menu */}
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectFormulation(f)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details & BOM"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onScaleBatch(f)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Batch Scaling Calculator"
                        >
                          <Scale className="w-4 h-4" />
                        </button>

                        {(f.status === 'draft' || f.status === 'under_review') && (
                          <button
                            onClick={() => onEditFormulation(f)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Recipe"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onNewVersion(f)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Create New Version"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
