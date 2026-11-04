import React, { useState, useEffect } from 'react';
import {
  Search,
  GitBranch,
  Layers,
  ShieldAlert,
  AlertTriangle,
  Download,
  Building2,
  Cpu,
  Warehouse,
  CheckCircle2,
  Lock,
  RotateCw,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { batchApi } from '../../../services/batchApi';
import { GenealogyTreeGraph } from './GenealogyTreeGraph';
import type { TraceabilitySearchResult, Batch } from '../../../types/batches';

interface TraceabilityWorkbenchProps {
  initialSearchQuery?: string;
  onInspectBatch: (batchId: string) => void;
  onPlaceHold: (batch: Batch) => void;
}

export function TraceabilityWorkbench({
  initialSearchQuery = '',
  onInspectBatch,
  onPlaceHold,
}: TraceabilityWorkbenchProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || 'BAT-2026-00891');
  const [report, setReport] = useState<TraceabilitySearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await batchApi.getTraceabilityReport(q);
      setReport(data);
    } catch (err: any) {
      setError(err.message || `No traceability records found for "${q}".`);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      handleSearch(initialSearchQuery);
    } else {
      handleSearch('BAT-2026-00891');
    }
  }, [initialSearchQuery]);

  const handleExportDossier = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Traceability-Dossier-${report.root_batch.batch_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-indigo-600" />
              <span>Traceability Investigation & Blast Radius Engine</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bidirectional genealogy audit: Forward (Where used / Sold) & Backward (Ingredients / Suppliers / QA)
            </p>
          </div>

          {report && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportDossier}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit Dossier</span>
              </button>
            </div>
          )}
        </div>

        {/* Input & Quick Presets */}
        <div className="space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchQuery);
            }}
            className="flex items-center space-x-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Batch Number (e.g. BAT-2026-00891, RM-2026-00101), SKU, or Work Order..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Trace Lineage</span>
            </button>
          </form>

          {/* Quick presets */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 pt-1">
            <span className="font-semibold">Quick Trace Presets:</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('BAT-2026-00891');
                handleSearch('BAT-2026-00891');
              }}
              className="px-2 py-0.5 rounded-sm bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono transition-colors border border-slate-200"
            >
              BAT-2026-00891 (Finished Good)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('RM-2026-00101');
                handleSearch('RM-2026-00101');
              }}
              className="px-2 py-0.5 rounded-sm bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono transition-colors border border-slate-200"
            >
              RM-2026-00101 (Raw Material)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('RM-2026-00103');
                handleSearch('RM-2026-00103');
              }}
              className="px-2 py-0.5 rounded-sm bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono transition-colors border border-slate-200"
            >
              RM-2026-00103 (On QC Hold)
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-sm font-medium">Reconstructing multi-tier supply chain genealogy tree...</p>
        </div>
      )}

      {/* Results Dashboard */}
      {!isLoading && report && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Executive Blast Radius Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Raw Batches</span>
              <span className="text-lg font-bold text-slate-900">{report.summary.total_raw_batches}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Work Orders</span>
              <span className="text-lg font-bold text-slate-900">{report.summary.total_production_orders}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Finished Lots</span>
              <span className="text-lg font-bold text-slate-900">{report.summary.total_finished_batches}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Suppliers</span>
              <span className="text-lg font-bold text-slate-900">{report.summary.total_suppliers_involved}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Warehouses</span>
              <span className="text-lg font-bold text-slate-900">{report.summary.total_warehouses_affected}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Released Stock</span>
              <span className="text-lg font-bold text-emerald-600">{report.summary.total_released_qty.toLocaleString()}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Active Holds</span>
              <span className={`text-lg font-bold ${report.summary.active_holds_found > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {report.summary.active_holds_found}
              </span>
            </div>
          </div>

          {/* Interactive Visual Lineage Graph */}
          <GenealogyTreeGraph
            rootBatch={report.root_batch}
            backwardTree={report.backward_tree}
            forwardTree={report.forward_tree}
            onSelectBatch={(bNum) => {
              setSearchQuery(bNum);
              handleSearch(bNum);
            }}
          />

          {/* Root Batch Quick Dossier & Controls */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-slate-900 text-base">{report.root_batch.batch_number}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 capitalize">
                  {report.root_batch.batch_type.replace('_', ' ')}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  {report.root_batch.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {report.root_batch.product_name} ({report.root_batch.sku_code}) • In Stock: {report.root_batch.current_quantity} {report.root_batch.unit_short_code} • Facility: {report.root_batch.warehouse_name || 'Main Warehouse'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onInspectBatch(report.root_batch.id)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                Inspect 360 Profile
              </button>
              <button
                onClick={() => onPlaceHold(report.root_batch)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors flex items-center space-x-1"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Contain / Place Hold</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
