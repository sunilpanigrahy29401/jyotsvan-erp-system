import React, { useState } from 'react';
import {
  X,
  Layers,
  CheckCircle2,
  Clock,
  PlayCircle,
  Archive,
  Copy,
  Edit3,
  Scale,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  ShieldCheck,
  Percent,
  GitCompare,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { Formulation, FormulationScalingResult } from '../../../types/formulations';
import { formulationApi } from '../../../services/formulationApi';

interface Props {
  formulation: Formulation | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (f: Formulation) => void;
  onNewVersion: (f: Formulation) => void;
  onCompareWith: (f: Formulation, otherVersionId: string) => void;
  onSubmitForReview: (f: Formulation) => Promise<void>;
  onApprove: (f: Formulation) => Promise<void>;
  onActivate: (f: Formulation) => Promise<void>;
  onDeactivate: (f: Formulation) => Promise<void>;
  onArchive: (f: Formulation) => Promise<void>;
}

export function FormulationDetailDrawer({
  formulation,
  isOpen,
  onClose,
  onEdit,
  onNewVersion,
  onCompareWith,
  onSubmitForReview,
  onApprove,
  onActivate,
  onDeactivate,
  onArchive,
}: Props) {
  const [activeTab, setActiveTab] = useState<'bom' | 'substitutions' | 'scaling' | 'history'>('bom');
  const [targetBatchSize, setTargetBatchSize] = useState<string>('');
  const [scalingResult, setScalingResult] = useState<FormulationScalingResult | null>(null);
  const [scalingLoading, setScalingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !formulation) return null;

  const yieldPct = formulation.yield_percentage || 0;

  const handleScaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const size = parseFloat(targetBatchSize);
    if (isNaN(size) || size <= 0) return;

    setScalingLoading(true);
    setActionError(null);
    try {
      const res = await formulationApi.scaleBatch(formulation.id, size);
      setScalingResult(res);
    } catch (err: any) {
      setActionError(err.message || 'Failed to calculate batch scale');
    } finally {
      setScalingLoading(false);
    }
  };

  const handleAction = async (actionFn: () => Promise<void>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await actionFn();
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                {formulation.formulation_code}
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                v{formulation.version}
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  formulation.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : formulation.status === 'approved'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : formulation.status === 'under_review'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {formulation.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{formulation.name}</h2>
            <p className="text-xs text-slate-500">
              Finished Item:{' '}
              <span className="font-semibold text-slate-700">
                {formulation.finished_product_name || formulation.finished_sku_name} ({formulation.finished_sku_code})
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {formulation.status === 'draft' && (
              <>
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction(() => onSubmitForReview(formulation))}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Submit for Review
                </button>
                <button
                  onClick={() => onEdit(formulation)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Recipe
                </button>
              </>
            )}

            {formulation.status === 'under_review' && (
              <>
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction(() => onApprove(formulation))}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Formulation
                </button>
                <button
                  onClick={() => onEdit(formulation)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Recipe
                </button>
              </>
            )}

            {formulation.status === 'approved' && (
              <button
                disabled={actionLoading}
                onClick={() => handleAction(() => onActivate(formulation))}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Activate for Production
              </button>
            )}

            {formulation.status === 'active' && (
              <button
                disabled={actionLoading}
                onClick={() => handleAction(() => onDeactivate(formulation))}
                className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                Deactivate
              </button>
            )}

            {formulation.status !== 'archived' && (
              <button
                onClick={() => onNewVersion(formulation)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                New Version (Clone)
              </button>
            )}

            {(formulation.status === 'inactive' || formulation.status === 'draft') && (
              <button
                disabled={actionLoading}
                onClick={() => handleAction(() => onArchive(formulation))}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Updated {new Date(formulation.updated_at).toLocaleDateString()}
          </div>
        </div>

        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Drawer Tabs */}
        <div className="flex border-b border-slate-200 px-6 gap-6 text-xs font-semibold bg-slate-50/50">
          <button
            onClick={() => setActiveTab('bom')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'bom'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Components & BOM ({formulation.components?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('substitutions')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'substitutions'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Approved Substitutions
          </button>

          <button
            onClick={() => setActiveTab('scaling')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'scaling'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            Batch Scaling Tool
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Version History & Audit
          </button>
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Batch Basis & Economics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500">Base Batch Size</span>
              <div className="text-base font-bold text-slate-900 mt-1">
                {formulation.batch_size.toLocaleString()} {formulation.batch_size_unit_code}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500">Expected Yield</span>
              <div className="text-base font-bold text-emerald-700 mt-1 flex items-center gap-1">
                {formulation.expected_yield.toLocaleString()} {formulation.expected_yield_unit_code}
                <span className="text-xs font-normal text-emerald-600">({yieldPct}%)</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500">Est. Wastage Allowance</span>
              <div className="text-base font-bold text-slate-700 mt-1">
                {formulation.expected_wastage_quantity.toLocaleString()} {formulation.expected_wastage_unit_code || formulation.batch_size_unit_code}
              </div>
            </div>

            <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
              <span className="text-[11px] font-medium text-indigo-700">Est. Batch Material Cost</span>
              <div className="text-base font-bold text-indigo-950 mt-1">
                ₹{(formulation.estimated_total_cost || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[10px] text-indigo-600 mt-0.5">
                ₹{(formulation.cost_per_yield_unit || 0).toFixed(2)} / {formulation.expected_yield_unit_code} yield
              </p>
            </div>
          </div>

          {/* TAB 1: Components & BOM */}
          {activeTab === 'bom' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Recipe Component Structure
                </h3>
                <span className="text-xs text-slate-500">
                  Total Items: {formulation.components?.length || 0}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Component / SKU</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Net Qty</th>
                      <th className="py-2.5 px-3 text-right">Scrap %</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Est. Cost</th>
                      <th className="py-2.5 px-3 text-center">Subst.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(formulation.components || []).map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {c.sequence_order || idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">
                            {c.component_sku_name || c.component_product_name || 'Component'}
                          </div>
                          <div className="font-mono text-[11px] text-indigo-600">
                            {c.component_sku_code}
                          </div>
                          {c.notes && <div className="text-[11px] text-slate-400 mt-0.5">{c.notes}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-slate-100 text-slate-700">
                            {c.component_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {c.quantity.toLocaleString()} {c.unit_code}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
                          {c.wastage_allowance_percentage ? `${c.wastage_allowance_percentage}%` : '0%'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 font-mono text-[11px]">
                          ₹{(c.estimated_unit_cost || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900 font-mono">
                          ₹{(c.estimated_component_cost || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {c.is_substitutable ? (
                            <span
                              className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded"
                              title={`${c.substitutions?.length || 0} alternate SKUs`}
                            >
                              Yes ({c.substitutions?.length || 0})
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {formulation.description && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <span className="font-semibold text-slate-700">Description & Formulation Notes:</span>
                  <p>{formulation.description}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Substitutions */}
          {activeTab === 'substitutions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Approved Component Substitution Matrix
                </h3>
              </div>

              {(!formulation.components || formulation.components.every(c => !c.substitutions || c.substitutions.length === 0)) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium">No component substitutions configured</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Substitutions allow pre-approved raw material alternatives with conversion factors.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Primary Component</th>
                        <th className="py-2.5 px-3">Alternate SKU</th>
                        <th className="py-2.5 px-3 text-right">Conversion Ratio</th>
                        <th className="py-2.5 px-3 text-center">Priority</th>
                        <th className="py-2.5 px-3">Group</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(formulation.components || []).flatMap(c =>
                        (c.substitutions || []).map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{c.component_sku_name}</div>
                              <div className="font-mono text-[11px] text-slate-400">{c.component_sku_code}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-indigo-700">{sub.alternate_sku_name || sub.alternate_sku_code}</div>
                              <div className="font-mono text-[11px] text-indigo-500">{sub.alternate_sku_code}</div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-800">
                              {sub.conversion_factor}x
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              #{sub.preference_priority}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {sub.substitution_group || 'Standard'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                                {sub.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Batch Scaling */}
          {activeTab === 'scaling' && (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">
                    Linear Proportional Batch Scaling Calculator
                  </h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Calculate exact material requirements, scrap allowances, and yield estimates for custom run sizes.
                  </p>
                </div>

                <form onSubmit={handleScaleSubmit} className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder={`Target ${formulation.batch_size_unit_code}`}
                      value={targetBatchSize}
                      onChange={e => setTargetBatchSize(e.target.value)}
                      className="w-44 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={scalingLoading}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    {scalingLoading ? 'Calculating...' : 'Scale'}
                  </button>
                </form>
              </div>

              {scalingResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Target Run Size</span>
                      <div className="text-base font-bold text-slate-900 mt-0.5">
                        {scalingResult.target_batch_size.toLocaleString()} {scalingResult.batch_unit}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-mono mt-0.5">
                        Ratio: {scalingResult.scaling_ratio}x
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Scaled Expected Yield</span>
                      <div className="text-base font-bold text-emerald-700 mt-0.5">
                        {scalingResult.scaled_expected_yield.toLocaleString()} {scalingResult.batch_unit}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Scaled Wastage</span>
                      <div className="text-base font-bold text-slate-700 mt-0.5">
                        {scalingResult.scaled_expected_wastage.toLocaleString()} {scalingResult.batch_unit}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Scaled Est. Material Cost</span>
                      <div className="text-base font-bold text-indigo-950 mt-0.5">
                        ₹{scalingResult.total_scaled_material_cost.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Component / SKU</th>
                          <th className="py-2.5 px-3 text-right">Base Qty</th>
                          <th className="py-2.5 px-3 text-right">Scaled Net Qty</th>
                          <th className="py-2.5 px-3 text-right">Scrap %</th>
                          <th className="py-2.5 px-3 text-right font-bold text-indigo-900">Scaled Gross Qty</th>
                          <th className="py-2.5 px-3 text-right">Scaled Est. Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scalingResult.components.map(sc => (
                          <tr key={sc.component_sku_id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{sc.component_sku_name}</div>
                              <div className="font-mono text-[11px] text-indigo-600">{sc.component_sku_code}</div>
                            </td>
                            <td className="py-3 px-3 text-right text-slate-500 font-mono">
                              {sc.base_quantity.toLocaleString()} {sc.unit_code}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-700 font-mono">
                              {sc.scaled_quantity.toLocaleString()} {sc.unit_code}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
                              {sc.wastage_allowance_percentage}%
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-indigo-700 font-mono bg-indigo-50/30">
                              {sc.scaled_gross_quantity.toLocaleString()} {sc.unit_code}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-900 font-mono">
                              ₹{sc.scaled_estimated_cost.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: History & Compare */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Revisions for {formulation.finished_sku_code}
              </h3>

              <div className="space-y-2.5">
                {(formulation.version_history || []).map(vh => (
                  <div
                    key={vh.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                      vh.id === formulation.id
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md">
                        v{vh.version}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                          <span>Status: {vh.status.toUpperCase()}</span>
                          {vh.is_active && (
                            <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 rounded font-semibold">
                              Current Active
                            </span>
                          )}
                          {vh.id === formulation.id && (
                            <span className="text-[11px] text-indigo-600 font-medium">(Viewing)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Created {new Date(vh.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {vh.id !== formulation.id && (
                      <button
                        onClick={() => onCompareWith(formulation, vh.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        Compare with v{vh.version}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
