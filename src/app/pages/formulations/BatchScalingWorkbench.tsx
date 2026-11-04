import React, { useState, useEffect } from 'react';
import {
  Scale,
  Play,
  Download,
  Printer,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { Formulation, FormulationScalingResult } from '../../../types/formulations';
import { formulationApi } from '../../../services/formulationApi';

interface Props {
  formulationList: Formulation[];
  selectedFormulationId?: string;
  onSelectFormulationChange?: (id: string) => void;
}

export function BatchScalingWorkbench({
  formulationList,
  selectedFormulationId,
  onSelectFormulationChange,
}: Props) {
  const [currentId, setCurrentId] = useState<string>(
    selectedFormulationId || formulationList[0]?.id || ''
  );
  const [targetBatchSize, setTargetBatchSize] = useState<string>('2500');
  const [scalingResult, setScalingResult] = useState<FormulationScalingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFormulationId) {
      setCurrentId(selectedFormulationId);
    }
  }, [selectedFormulationId]);

  const activeFormulation = formulationList.find(f => f.id === currentId) || formulationList[0];

  useEffect(() => {
    if (activeFormulation) {
      handleCalculateScale(activeFormulation.id, parseFloat(targetBatchSize) || activeFormulation.batch_size);
    }
  }, [currentId]);

  const handleCalculateScale = async (id: string, size: number) => {
    if (!id || isNaN(size) || size <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await formulationApi.scaleBatch(id, size);
      setScalingResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate batch scale');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeFormulation) {
      handleCalculateScale(activeFormulation.id, parseFloat(targetBatchSize));
    }
  };

  const handlePresetClick = (multiplier: number) => {
    if (!activeFormulation) return;
    const newSize = (activeFormulation.batch_size * multiplier).toString();
    setTargetBatchSize(newSize);
    handleCalculateScale(activeFormulation.id, activeFormulation.batch_size * multiplier);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Live Batch Volume & Materials Scaling Simulator
              </h2>
              <p className="text-xs text-slate-500">
                Simulate component consumption, scrap requirements, and material costs for any custom production run volume.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!scalingResult}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Manifest
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Select Recipe / Formulation
            </label>
            <select
              value={currentId}
              onChange={e => {
                setCurrentId(e.target.value);
                if (onSelectFormulationChange) onSelectFormulationChange(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {formulationList.map(f => (
                <option key={f.id} value={f.id}>
                  {f.formulation_code} — {f.name} (v{f.version}) [Base: {f.batch_size} {f.batch_size_unit_code}]
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Target Run Batch Size ({activeFormulation?.batch_size_unit_code || 'units'})
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              required
              value={targetBatchSize}
              onChange={e => setTargetBatchSize(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? 'Calculating...' : 'Simulate'}
            </button>
          </div>
        </form>

        {/* Quick Multiplier Presets */}
        {activeFormulation && (
          <div className="flex items-center gap-2 pt-2 text-xs flex-wrap">
            <span className="text-slate-400 font-medium">Quick Presets:</span>
            {[0.5, 1.0, 2.0, 5.0, 10.0].map(mult => (
              <button
                key={mult}
                type="button"
                onClick={() => handlePresetClick(mult)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg transition-colors"
              >
                {mult}x ({(activeFormulation.batch_size * mult).toLocaleString()} {activeFormulation.batch_size_unit_code})
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Scaling Results */}
      {scalingResult && (
        <div className="space-y-6">
          {/* Executive Scale Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Scaling Ratio</span>
              <div className="text-2xl font-bold text-indigo-600 mt-1 font-mono">
                {scalingResult.scaling_ratio}x
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                From base {scalingResult.base_batch_size} {scalingResult.batch_unit}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Scaled Expected Yield</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {scalingResult.scaled_expected_yield.toLocaleString()} {scalingResult.batch_unit}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Efficiency: {scalingResult.yield_percentage}%
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Scaled Scrap Allowance</span>
              <div className="text-2xl font-bold text-slate-700 mt-1">
                {scalingResult.scaled_expected_wastage.toLocaleString()} {scalingResult.batch_unit}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Calculated process loss</p>
            </div>

            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 shadow-xs">
              <span className="text-xs font-medium text-indigo-700">Scaled Est. Material Cost</span>
              <div className="text-2xl font-bold text-indigo-950 mt-1">
                ₹{scalingResult.total_scaled_material_cost.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[11px] text-indigo-600 mt-0.5">
                ₹{(scalingResult.total_scaled_material_cost / scalingResult.scaled_expected_yield).toFixed(2)} / unit yield
              </p>
            </div>
          </div>

          {/* Scaled Component Bill of Materials Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Scaled Materials Requirement Manifest
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gross quantities include line-item scrap and wastage allowances ready for production staging.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {scalingResult.components.length} Line Items
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Component Item</th>
                    <th className="py-3 px-4 text-right">Base Recipe Qty</th>
                    <th className="py-3 px-4 text-right">Scaled Net Qty</th>
                    <th className="py-3 px-4 text-right">Scrap %</th>
                    <th className="py-3 px-4 text-right font-bold text-indigo-900">
                      Scaled Gross Required
                    </th>
                    <th className="py-3 px-4 text-right">Standard Unit Cost</th>
                    <th className="py-3 px-4 text-right">Scaled Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scalingResult.components.map(sc => (
                    <tr key={sc.component_sku_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{sc.component_sku_name}</div>
                        <div className="font-mono text-[11px] text-indigo-600">{sc.component_sku_code}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">
                        {sc.base_quantity.toLocaleString()} {sc.unit_code}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-mono">
                        {sc.scaled_quantity.toLocaleString()} {sc.unit_code}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {sc.wastage_allowance_percentage}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-700 font-mono bg-indigo-50/30">
                        {sc.scaled_gross_quantity.toLocaleString()} {sc.unit_code}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        ₹{sc.estimated_unit_cost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
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
        </div>
      )}
    </div>
  );
}
