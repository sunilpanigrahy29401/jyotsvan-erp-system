import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Plus, FileText, Settings, Layers } from 'lucide-react';
import type { QCSummaryMetrics } from '../../../types/quality';

interface QualityMetricsHeaderProps {
  metrics?: QCSummaryMetrics | null;
  loading?: boolean;
  onRefresh?: () => void;
  onNewInspection?: () => void;
  onNewTemplate?: () => void;
  onNewParameter?: () => void;
}

export function QualityMetricsHeader({
  metrics,
  loading = false,
  onRefresh,
  onNewInspection,
  onNewTemplate,
  onNewParameter,
}: QualityMetricsHeaderProps) {
  const m = metrics || {
    total_inspections: 0,
    pending_inspections: 0,
    in_progress_inspections: 0,
    under_review_inspections: 0,
    approved_inspections: 0,
    rejected_inspections: 0,
    quarantine_inspections: 0,
    re_inspections_count: 0,
    pass_rate_percentage: 100,
    avg_inspection_time_hours: 1.8,
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quality Assurance & QC Control</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Inward raw material sampling, parameter test verification, quarantine management & release authorization
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh</span>
            </button>
          )}

          {onNewParameter && (
            <button
              onClick={onNewParameter}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>New Parameter</span>
            </button>
          )}

          {onNewTemplate && (
            <button
              onClick={onNewTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>New Specification</span>
            </button>
          )}

          {onNewInspection && (
            <button
              onClick={onNewInspection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log Inspection</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Inspections */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Logged</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{m.total_inspections}</span>
            <span className="text-[11px] text-slate-400">batches</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {m.re_inspections_count} re-inspected
          </div>
        </div>

        {/* Pending & Under Review */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-900">
              {m.pending_inspections + m.under_review_inspections + m.in_progress_inspections}
            </span>
            <span className="text-[11px] text-amber-700">active</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700">
            {m.under_review_inspections} ready for decision
          </div>
        </div>

        {/* Approved & Released */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800">Approved & Released</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-900">{m.approved_inspections}</span>
            <span className="text-[11px] text-emerald-700">lots</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">
            Credited to inventory
          </div>
        </div>

        {/* Rejected Out-of-Spec */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-900">{m.rejected_inspections}</span>
            <span className="text-[11px] text-rose-700">lots</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700">
            Non-conformance logged
          </div>
        </div>

        {/* Quarantine Hold */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-800">Quarantine Hold</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-purple-900">{m.quarantine_inspections}</span>
            <span className="text-[11px] text-purple-700">lots</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-700">
            Isolated in staging
          </div>
        </div>

        {/* Quality Pass Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Quality Pass Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{m.pass_rate_percentage}%</span>
          </div>
          <div className="mt-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, m.pass_rate_percentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
