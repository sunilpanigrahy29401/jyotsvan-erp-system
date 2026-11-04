import React, { useState, useEffect } from 'react';
import {
  X,
  Factory,
  Layers,
  Sparkles,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { Formulation } from '../../../../types/formulations';
import { formulationApi } from '../../../../services/formulationApi';
import { productionApi } from '../../../../services/productionApi';

interface ProductionOrderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (orderId: string) => void;
  initialPlanId?: string;
}

export const ProductionOrderCreateModal: React.FC<ProductionOrderCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialPlanId,
}) => {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedFormulationId, setSelectedFormulationId] = useState<string>('');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(1000);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [planId, setPlanId] = useState<string>(initialPlanId || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [plannedStartDate, setPlannedStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [plannedEndDate, setPlannedEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [formRes, whRes, planRes] = await Promise.all([
        formulationApi.listFormulations({ status: 'approved', limit: 100 }),
        fetch('/api/warehouses', {
          headers: {
            'x-organization-id': 'org-jyotsvan-corp',
          },
        }).then(r => (r.ok ? r.json() : { data: [] })),
        productionApi.listPlans({ status: 'approved', limit: 50 }),
      ]);

      setFormulations(formRes.data || []);
      const whList = whRes.data || (Array.isArray(whRes) ? whRes : []);
      setWarehouses(whList);
      setPlans(planRes.data || []);

      if (formRes.data && formRes.data.length > 0 && !selectedFormulationId) {
        setSelectedFormulationId(formRes.data[0].id);
        setPlannedQuantity(formRes.data[0].base_quantity || 1000);
      }
      if (whList.length > 0 && !warehouseId) {
        setWarehouseId(whList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load formulations and warehouse data.');
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen) return null;

  const currentFormulation = formulations.find(f => f.id === selectedFormulationId);
  const baseQty = currentFormulation ? currentFormulation.base_quantity : 1;
  const scalingRatio = baseQty > 0 ? (plannedQuantity || 0) / baseQty : 1;
  const expectedYield = currentFormulation
    ? Math.round(plannedQuantity * ((currentFormulation.expected_yield_pct || 100) / 100) * 100) / 100
    : plannedQuantity;

  const handleFormulationChange = (fId: string) => {
    setSelectedFormulationId(fId);
    const f = formulations.find(item => item.id === fId);
    if (f) {
      setPlannedQuantity(f.base_quantity || 1000);
      setBatchNumber(`BATCH-${f.formulation_code}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormulationId) {
      setError('Please select an approved product formulation.');
      return;
    }
    if (!warehouseId) {
      setError('Please select a production / staging warehouse.');
      return;
    }
    if (!plannedQuantity || plannedQuantity <= 0) {
      setError('Planned quantity must be strictly greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await productionApi.createOrder({
        formulationId: selectedFormulationId,
        plannedQuantity: Number(plannedQuantity),
        warehouseId,
        planId: planId || undefined,
        plannedStartDate,
        plannedEndDate,
        priority,
        batchNumber: batchNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onCreated(order.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize production order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Create Production Order</h3>
              <p className="text-xs text-slate-500">
                Formula Explosion • Batch Scheduling • Material Requirement Generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-medium">Loading approved formulations and warehouses...</p>
            </div>
          ) : (
            <>
              {/* Row 1: Formulation & Planned Batch Size */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Product Formulation / Recipe *
                  </label>
                  <select
                    value={selectedFormulationId}
                    onChange={e => handleFormulationChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    required
                  >
                    {formulations.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.finished_sku_name} — [{f.formulation_code} v{f.version}] (Base: {f.base_quantity} {f.base_unit_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Target Batch Quantity *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={plannedQuantity || ''}
                      onChange={e => setPlannedQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="1000"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      required
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                      {currentFormulation?.base_unit_code || 'units'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulation Snapshot Metrics Banner */}
              {currentFormulation && (
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Base Recipe Size</span>
                    <span className="font-semibold text-slate-800">
                      {currentFormulation.base_quantity} {currentFormulation.base_unit_code}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scaling Factor</span>
                    <span className="font-mono font-semibold text-indigo-700">
                      {scalingRatio.toFixed(3)}x
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Expected Yield ({currentFormulation.expected_yield_pct}%)</span>
                    <span className="font-semibold text-emerald-700">
                      {expectedYield.toLocaleString()} {currentFormulation.base_unit_code}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Active Components</span>
                    <span className="font-semibold text-slate-800">
                      {currentFormulation.items?.length || 0} Ingredients & Packaging
                    </span>
                  </div>
                </div>
              )}

              {/* Row 2: Warehouse, Dates & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Manufacturing Warehouse *
                  </label>
                  <select
                    value={warehouseId}
                    onChange={e => setWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    required
                  >
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Planned Start Date *
                  </label>
                  <input
                    type="date"
                    value={plannedStartDate}
                    onChange={e => setPlannedStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                  </input>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Planned End Date
                  </label>
                  <input
                    type="date"
                    value={plannedEndDate}
                    onChange={e => setPlannedEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                  </input>
                </div>
              </div>

              {/* Row 3: Batch Number & Priority & Production Plan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Batch / Lot Number
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Order Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white capitalize"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Link Production Plan
                  </label>
                  <select
                    value={planId}
                    onChange={e => setPlanId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">Standalone Production Order</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.plan_number} — {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scaled Material Preview */}
              {currentFormulation && currentFormulation.items && currentFormulation.items.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Recipe Explosion & Material Requirements Preview
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">
                      {currentFormulation.items.length} Required Ingredients
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-3 py-2">Component</th>
                        <th className="px-3 py-2 text-right">Base Recipe</th>
                        <th className="px-3 py-2 text-right">Waste %</th>
                        <th className="px-3 py-2 text-right">Gross Scaled Requirement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentFormulation.items.map((item, idx) => {
                        const netQty = Number(item.quantity) * scalingRatio;
                        const scrap = Number(item.wastage_allowance_percentage || 0);
                        const grossQty = Math.round(netQty * (1 + scrap / 100) * 1000) / 1000;

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2">
                              <span className="font-medium text-slate-800">{item.component_sku_name}</span>
                              <span className="text-[11px] font-mono text-slate-400 block">{item.component_sku_code}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">
                              {item.quantity} {item.unit_code}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">
                              {item.wastage_allowance_percentage || 0}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-indigo-700">
                              {grossQty.toLocaleString()} {item.unit_code}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Production Instructions / Operator Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Follow sterile tank protocol, record temperature profile at Phase B mixing"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingData || !selectedFormulationId}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Production Order...
                </>
              ) : (
                <>
                  <Factory className="w-4 h-4" />
                  Create Production Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
