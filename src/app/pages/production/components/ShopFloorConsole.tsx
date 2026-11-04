import React, { useState, useEffect } from 'react';
import {
  Factory,
  Package,
  Layers,
  Sparkles,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldCheck,
  Lock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  ChevronRight,
} from 'lucide-react';
import type { ProductionOrder } from '../../../../types/production';
import { productionApi } from '../../../../services/productionApi';

interface ShopFloorConsoleProps {
  onOpenIssue: (order: ProductionOrder) => void;
  onOpenReturn: (order: ProductionOrder) => void;
  onOpenOutput: (order: ProductionOrder) => void;
  onOpenWastage: (order: ProductionOrder) => void;
  onOpenAvailability: (orderId: string, orderNumber: string) => void;
  onOpenOrderDetail: (orderId: string) => void;
}

export const ShopFloorConsole: React.FC<ShopFloorConsoleProps> = ({
  onOpenIssue,
  onOpenReturn,
  onOpenOutput,
  onOpenWastage,
  onOpenAvailability,
  onOpenOrderDetail,
}) => {
  const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveOrders = async () => {
    setLoading(true);
    try {
      const res = await productionApi.listOrders({
        limit: 50,
      });
      // Prioritize in_production, reserved, approved orders
      const list = (res.data || []).filter(
        o => o.status === 'in_production' || o.status === 'reserved' || o.status === 'approved'
      );
      setActiveOrders(list);

      if (list.length > 0) {
        if (!selectedOrderId || !list.some(o => o.id === selectedOrderId)) {
          setSelectedOrderId(list[0].id);
          loadOrderDetails(list[0].id);
        } else {
          loadOrderDetails(selectedOrderId);
        }
      } else {
        setSelectedOrder(null);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (id: string) => {
    setRefreshing(true);
    try {
      const order = await productionApi.getOrderById(id);
      setSelectedOrder(order);
    } catch {
      // Ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
    loadOrderDetails(id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Initializing Shop Floor Execution Environment...</p>
      </div>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-8">
        <Factory className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Active Batches on the Floor</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
          All production orders are either completed, draft, or cancelled. Create or approve a production order to launch operator execution.
        </p>
      </div>
    );
  }

  const yieldPct = selectedOrder && selectedOrder.planned_quantity > 0
    ? Math.round(((selectedOrder.actual_output_quantity || 0) / selectedOrder.planned_quantity) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Batch Selector Bar */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Shop Floor Operator Workbench</h2>
            <p className="text-xs text-slate-400">
              Live Batch Dispensing • Quality Control Handoff • Output Recording
            </p>
          </div>
        </div>

        {/* Batch Dropdown Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Active Batch:</span>
          <select
            value={selectedOrderId}
            onChange={e => handleSelectOrder(e.target.value)}
            className="w-full md:w-80 px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {activeOrders.map(o => (
              <option key={o.id} value={o.id}>
                {o.production_order_number} — {o.finished_sku_name} ({o.status.replace('_', ' ')})
              </option>
            ))}
          </select>
          <button
            onClick={() => loadOrderDetails(selectedOrderId)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {selectedOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Execution Flow (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Material Staging & Dispensing */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold font-mono">
                    01
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Material Dispensing & Component Staging</h3>
                    <p className="text-[11px] text-slate-500">
                      Status: <span className="font-semibold text-slate-700 capitalize">{selectedOrder.material_status.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenAvailability(selectedOrder.id, selectedOrder.production_order_number)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    Check Stock
                  </button>
                  <button
                    onClick={() => onOpenIssue(selectedOrder)}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Dispense / Issue
                  </button>
                </div>
              </div>

              {/* Components Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Raw Material</th>
                      <th className="px-4 py-2.5 text-right">Required</th>
                      <th className="px-4 py-2.5 text-right">Issued</th>
                      <th className="px-4 py-2.5 text-right">Remaining</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.components || []).map(comp => {
                      const rem = Math.max(0, comp.planned_quantity - comp.issued_quantity);
                      const isComplete = rem === 0;

                      return (
                        <tr key={comp.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-slate-800">{comp.component_sku_name}</span>
                            <span className="font-mono text-[10px] text-slate-400 block">{comp.component_sku_code}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-700">
                            {comp.planned_quantity} {comp.required_unit_code}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-blue-600 font-semibold">
                            {comp.issued_quantity} {comp.required_unit_code}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {rem > 0 ? (
                              <span className="text-amber-600 font-semibold">{rem} {comp.required_unit_code}</span>
                            ) : (
                              <span className="text-emerald-600 font-medium">Complete</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Staged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 2: Output Recording & QC Handoff */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold font-mono">
                    02
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Finished Goods Output & QC Handoff</h3>
                    <p className="text-[11px] text-slate-500">
                      Logged Output: <span className="font-semibold text-emerald-700">{selectedOrder.actual_output_quantity} / {selectedOrder.planned_quantity} {selectedOrder.unit_code}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenWastage(selectedOrder)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    Log Loss / Scrap
                  </button>
                  <button
                    onClick={() => onOpenOutput(selectedOrder)}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Record Output
                  </button>
                </div>
              </div>

              {/* Outputs List */}
              <div className="p-4">
                {(!selectedOrder.outputs || selectedOrder.outputs.length === 0) ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg">
                    <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-600 font-medium">No finished goods output logged for this active batch yet.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Record Output" to register completed production and initiate QC inspection.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrder.outputs.map(out => (
                      <div key={out.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{out.output_number}</span>
                            <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              Lot: {out.batch_number}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            Mfg: {new Date(out.manufacturing_date).toLocaleDateString()} • Logged by: {out.recorded_by_email}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            +{out.quantity.toLocaleString()} {selectedOrder.unit_code}
                          </span>
                          {out.qc_status === 'passed' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                              QC Passed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Quarantine
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Active Batch Specs & Quick Navigator */}
          <div className="space-y-6">
            {/* Batch Overview Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600 block">
                    Active Formulation
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedOrder.finished_sku_name}
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    {selectedOrder.finished_sku_code}
                  </span>
                </div>
                <button
                  onClick={() => onOpenOrderDetail(selectedOrder.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5"
                >
                  Full 360° <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Recipe Formula Tag */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Formulation Code:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedOrder.formulation_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Version:</span>
                  <span className="font-semibold text-slate-800">v{selectedOrder.formulation_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Warehouse:</span>
                  <span className="font-semibold text-slate-800">{selectedOrder.warehouse_name}</span>
                </div>
              </div>

              {/* Live Yield Realization Meter */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 border border-indigo-100/70 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Yield Realization</span>
                  <span className="font-mono font-bold text-indigo-700">{yieldPct}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, yieldPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
                  <span>Act: {selectedOrder.actual_output_quantity} {selectedOrder.unit_code}</span>
                  <span>Target: {selectedOrder.planned_quantity} {selectedOrder.unit_code}</span>
                </div>
              </div>

              {/* Excess Material Return Action */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Excess materials on floor?</span>
                <button
                  onClick={() => onOpenReturn(selectedOrder)}
                  className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Return to Warehouse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
