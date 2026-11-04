import React from 'react';
import { Layers, CheckCircle2, Clock, DollarSign, Percent, Plus, RefreshCw, Scale, GitCompare } from 'lucide-react';
import type { FormulationSummaryMetrics } from '../../../types/formulations';

interface Props {
  metrics: FormulationSummaryMetrics | null;
  loading: boolean;
  onRefresh: () => void;
  onNewFormulation: () => void;
  onOpenScalingWorkbench: () => void;
  onOpenCompare: () => void;
}

export function FormulationMetricsHeader({
  metrics,
  loading,
  onRefresh,
  onNewFormulation,
  onOpenScalingWorkbench,
  onOpenCompare,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Top action & title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  BOM & Formulation Management
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Phase 12 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Master recipes, multi-level Bills of Materials, versioning, circular BOM protection, and batch scaling.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh formulations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={onOpenCompare}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <GitCompare className="w-3.5 h-3.5 text-slate-500" />
            Compare Versions
          </button>

          <button
            onClick={onOpenScalingWorkbench}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            Batch Scaling Simulator
          </button>

          <button
            onClick={onNewFormulation}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            New Formulation
          </button>
        </div>
      </div>

      {/* Metric telemetry cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total & Active */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Formulations</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics ? metrics.active_formulations : '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              of {metrics ? metrics.total_formulations : '—'} total
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Ready for production runs</p>
        </div>

        {/* In Review & Drafts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Drafts & In Review</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics ? metrics.in_review_formulations + metrics.draft_formulations : '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({metrics ? metrics.in_review_formulations : 0} review)
            </span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Pending engineering signoff</p>
        </div>

        {/* Finished SKUs Covered */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">SKUs Covered</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-slate-900">
              {metrics ? metrics.total_finished_skus_covered : '—'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Distinct finished catalog SKUs</p>
        </div>

        {/* Avg Yield Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Recipe Yield</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              {metrics ? metrics.average_yield_percentage : '—'}%
            </span>
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">Standard batch efficiency</p>
        </div>

        {/* Avg Material Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Material Cost</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              ₹{metrics ? metrics.average_material_cost.toLocaleString('en-IN') : '—'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Standard batch rollup estimate</p>
        </div>
      </div>
    </div>
  );
}
