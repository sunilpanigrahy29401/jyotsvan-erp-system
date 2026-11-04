import React, { useState, useEffect } from 'react';
import {
  X,
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import type { Formulation, FormulationComparisonResult } from '../../../types/formulations';
import { formulationApi } from '../../../services/formulationApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  formulationList: Formulation[];
  initialV1Id?: string;
  initialV2Id?: string;
}

export function FormulationVersionCompareModal({
  isOpen,
  onClose,
  formulationList,
  initialV1Id,
  initialV2Id,
}: Props) {
  const [v1Id, setV1Id] = useState<string>('');
  const [v2Id, setV2Id] = useState<string>('');
  const [comparison, setComparison] = useState<FormulationComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const firstId = initialV1Id || formulationList[0]?.id || '';
      const secondId =
        initialV2Id ||
        formulationList.find(f => f.id !== firstId)?.id ||
        formulationList[0]?.id ||
        '';

      setV1Id(firstId);
      setV2Id(secondId);

      if (firstId && secondId && firstId !== secondId) {
        fetchComparison(firstId, secondId);
      }
    }
  }, [isOpen, initialV1Id, initialV2Id, formulationList]);

  const fetchComparison = async (id1: string, id2: string) => {
    if (!id1 || !id2 || id1 === id2) {
      setComparison(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await formulationApi.compareVersions(id1, id2);
      setComparison(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compare versions');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (v1Id && v2Id && v1Id !== v2Id) {
      fetchComparison(v1Id, v2Id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Formulation Version Comparison Workbench
              </h2>
              <p className="text-xs text-slate-500">
                Compare recipes side-by-side: component adjustments, yield deltas, and estimated material cost changes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Pickers Bar */}
        <form
          onSubmit={handleRunCompare}
          className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="w-full">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Baseline Version (V1)
              </label>
              <select
                value={v1Id}
                onChange={e => {
                  setV1Id(e.target.value);
                  if (e.target.value && v2Id && e.target.value !== v2Id) {
                    fetchComparison(e.target.value, v2Id);
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
              >
                <option value="">Select Formulation V1...</option>
                {formulationList.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} (v{f.version} - {f.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-5 text-slate-400">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="w-full">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Target Version (V2)
              </label>
              <select
                value={v2Id}
                onChange={e => {
                  setV2Id(e.target.value);
                  if (v1Id && e.target.value && v1Id !== e.target.value) {
                    fetchComparison(v1Id, e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
              >
                <option value="">Select Formulation V2...</option>
                {formulationList.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} (v{f.version} - {f.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !v1Id || !v2Id || v1Id === v2Id}
            className="w-full md:w-auto px-5 py-2 mt-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-40"
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </form>

        {error && (
          <div className="m-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Comparison Details Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Computing structural diff...
            </div>
          ) : !comparison ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-600">
                Select two distinct formulation versions above to compare differences.
              </p>
            </div>
          ) : (
            <>
              {/* Header Metrics Delta Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500">Base Batch Size</span>
                  <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                    <span>{comparison.v1.batch_size} {comparison.v1.batch_size_unit_code}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>{comparison.v2.batch_size} {comparison.v2.batch_size_unit_code}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {comparison.batch_size_changed ? (
                      <span className="text-amber-600 font-semibold">Modified</span>
                    ) : (
                      <span className="text-slate-400">Unchanged</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500">Expected Yield</span>
                  <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-2">
                    <span>{comparison.v1.expected_yield} {comparison.v1.expected_yield_unit_code}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>{comparison.v2.expected_yield} {comparison.v2.expected_yield_unit_code}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {comparison.yield_changed ? (
                      <span className="text-emerald-600 font-semibold">Yield Adjusted</span>
                    ) : (
                      <span className="text-slate-400">Identical Yield</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500">Expected Scrap</span>
                  <div className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-2">
                    <span>{comparison.v1.expected_wastage_quantity} {comparison.v1.expected_wastage_unit_code || 'u'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>{comparison.v2.expected_wastage_quantity} {comparison.v2.expected_wastage_unit_code || 'u'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {comparison.wastage_changed ? (
                      <span className="text-amber-600 font-semibold">Wastage Delta</span>
                    ) : (
                      <span className="text-slate-400">Equal Wastage</span>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                  <span className="text-[11px] font-medium text-indigo-700">Est. Material Cost Delta</span>
                  <div className="text-sm font-bold text-indigo-950 mt-1 flex items-center gap-1.5">
                    {comparison.cost_diff >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-rose-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      {comparison.cost_diff >= 0 ? '+' : ''}₹{comparison.cost_diff.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs font-normal text-slate-500">
                      ({comparison.cost_diff_percentage >= 0 ? '+' : ''}{comparison.cost_diff_percentage}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-1">
                    v1: ₹{(comparison.v1.estimated_total_cost || 0).toFixed(2)} → v2: ₹{(comparison.v2.estimated_total_cost || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Component Diffs Table */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Component & Ingredient Adjustments ({comparison.component_diffs.length})
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Component SKU</th>
                        <th className="py-2.5 px-3">Change Type</th>
                        <th className="py-2.5 px-3 text-right">V1 Net Qty</th>
                        <th className="py-2.5 px-3 text-right">V2 Net Qty</th>
                        <th className="py-2.5 px-3 text-right">V1 Scrap %</th>
                        <th className="py-2.5 px-3 text-right">V2 Scrap %</th>
                        <th className="py-2.5 px-3 text-right">Est. Cost Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparison.component_diffs.map(diff => {
                        const costDelta = (diff.v2_cost || 0) - (diff.v1_cost || 0);

                        return (
                          <tr key={diff.sku_id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{diff.sku_name}</div>
                              <div className="font-mono text-[11px] text-indigo-600">{diff.sku_code}</div>
                            </td>

                            <td className="py-3 px-3">
                              {diff.change_type === 'added' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                                  <Plus className="w-3 h-3" /> Added
                                </span>
                              )}
                              {diff.change_type === 'removed' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                                  <Minus className="w-3 h-3" /> Removed
                                </span>
                              )}
                              {diff.change_type === 'modified' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                                  Modified
                                </span>
                              )}
                              {diff.change_type === 'unchanged' && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded-md">
                                  Unchanged
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {diff.v1_quantity !== null && diff.v1_quantity !== undefined
                                ? `${diff.v1_quantity} ${diff.v1_unit || ''}`
                                : '—'}
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                              {diff.v2_quantity !== null && diff.v2_quantity !== undefined
                                ? `${diff.v2_quantity} ${diff.v2_unit || ''}`
                                : '—'}
                            </td>

                            <td className="py-3 px-3 text-right font-mono text-slate-500 text-[11px]">
                              {diff.v1_wastage_pct !== null && diff.v1_wastage_pct !== undefined
                                ? `${diff.v1_wastage_pct}%`
                                : '—'}
                            </td>

                            <td className="py-3 px-3 text-right font-mono text-slate-700 text-[11px]">
                              {diff.v2_wastage_pct !== null && diff.v2_wastage_pct !== undefined
                                ? `${diff.v2_wastage_pct}%`
                                : '—'}
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-semibold">
                              <span
                                className={
                                  costDelta > 0
                                    ? 'text-rose-600'
                                    : costDelta < 0
                                    ? 'text-emerald-600'
                                    : 'text-slate-400'
                                }
                              >
                                {costDelta > 0 ? '+' : ''}₹{costDelta.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
