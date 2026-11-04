import React, { useState, useEffect } from 'react';
import {
  X,
  Factory,
  Layers,
  Sparkles,
  Package,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Lock,
  PauseCircle,
  PlayCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  History,
  Scale,
  RefreshCw,
} from 'lucide-react';
import type { ProductionOrder } from '../../../../types/production';
import { productionApi } from '../../../../services/productionApi';

interface ProductionOrderDetailDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenAvailability: (orderId: string, orderNumber: string) => void;
  onOpenIssue: (order: ProductionOrder) => void;
  onOpenReturn: (order: ProductionOrder) => void;
  onOpenOutput: (order: ProductionOrder) => void;
  onOpenWastage: (order: ProductionOrder) => void;
}

export const ProductionOrderDetailDrawer: React.FC<ProductionOrderDetailDrawerProps> = ({
  orderId,
  isOpen,
  onClose,
  onRefresh,
  onOpenAvailability,
  onOpenIssue,
  onOpenReturn,
  onOpenOutput,
  onOpenWastage,
}) => {
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'outputs' | 'movements' | 'yield' | 'audit'>('materials');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    setActionError(null);
    try {
      const data = await productionApi.getOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch order details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await productionApi.approveOrder(order.id);
      setOrder(updated);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!order) return;
    if (order.actual_output_quantity <= 0) {
      if (!confirm('No finished goods output has been logged yet for this order. Complete order anyway?')) {
        return;
      }
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await productionApi.completeOrder(order.id);
      setOrder(updated);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHoldToggle = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const reason = prompt(
        order.is_on_hold ? 'Enter reason for resuming batch execution:' : 'Enter reason for putting batch on operational hold:'
      );
      if (reason === null) {
        setActionLoading(false);
        return;
      }
      const updated = order.is_on_hold
        ? await productionApi.resumeOrder(order.id, reason)
        : await productionApi.holdOrder(order.id, reason);
      setOrder(updated);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update hold status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    const reason = prompt('Please specify the reason for cancelling this production order:');
    if (!reason) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await productionApi.cancelOrder(order.id, reason);
      setOrder(updated);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel order.');
    } finally {
      setActionLoading(false);
    }
  };

  const yieldPct = order && order.planned_quantity > 0
    ? Math.round(((order.actual_output_quantity || 0) / order.planned_quantity) * 1000) / 10
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                  {order?.production_order_number || 'Loading Order...'}
                </h2>
                {order && (
                  <>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'in_production'
                          ? 'bg-indigo-100 text-indigo-800'
                          : order.status === 'reserved'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'approved'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'cancelled'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                    {order.is_on_hold && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        ON HOLD
                      </span>
                    )}
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-600 font-medium capitalize">
                      Priority: {order.priority}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{order?.finished_sku_name}</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-600">{order?.finished_sku_code}</span>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-600 font-medium">
                  Formula: {order?.formulation_code} (v{order?.formulation_version})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadOrder}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh Order"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Action Toolbar */}
        {order && (
          <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {order.status === 'draft' && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Order
                </button>
              )}

              <button
                onClick={() => onOpenAvailability(order.id, order.production_order_number)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                Check Stock & Reserve
              </button>

              {order.status !== 'completed' && order.status !== 'cancelled' && (
                <>
                  <button
                    onClick={() => onOpenIssue(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-xs"
                  >
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    Issue Materials
                  </button>

                  <button
                    onClick={() => onOpenReturn(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    Return Unused
                  </button>

                  <button
                    onClick={() => onOpenOutput(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Record Output
                  </button>

                  <button
                    onClick={() => onOpenWastage(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-rose-700 text-xs font-medium rounded-lg transition-colors shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    Log Loss / Scrap
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {order.status === 'in_production' && (
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete Batch
                </button>
              )}

              {order.status !== 'completed' && order.status !== 'cancelled' && (
                <>
                  <button
                    onClick={handleHoldToggle}
                    disabled={actionLoading}
                    className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    title={order.is_on_hold ? 'Resume Batch' : 'Put on Hold'}
                  >
                    {order.is_on_hold ? <PlayCircle className="w-4 h-4 text-emerald-600" /> : <PauseCircle className="w-4 h-4 text-amber-600" />}
                  </button>

                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Cancel Order"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {actionError && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Key Metrics Strip */}
        {order && (
          <div className="px-6 py-3 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs shrink-0">
            <div>
              <span className="text-slate-500 block">Planned Batch Size</span>
              <span className="font-semibold text-slate-800 text-sm font-mono">
                {order.planned_quantity.toLocaleString()} {order.unit_code}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Expected Yield</span>
              <span className="font-semibold text-slate-800 text-sm font-mono">
                {order.expected_yield_quantity.toLocaleString()} {order.unit_code}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Actual Output</span>
              <span className="font-semibold text-emerald-700 text-sm font-mono">
                {order.actual_output_quantity.toLocaleString()} {order.unit_code} ({yieldPct}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Material Status</span>
              <span className="font-semibold capitalize text-slate-700 text-xs mt-0.5 block">
                {order.material_status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Facility / Warehouse</span>
              <span className="font-semibold text-slate-800 truncate block mt-0.5">
                {order.warehouse_name || 'Plant Warehouse'}
              </span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex gap-6 shrink-0">
          <button
            onClick={() => setActiveTab('materials')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'materials'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Material Requirements & Reconciliation ({order?.components?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('outputs')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'outputs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Outputs & Finished Goods ({order?.outputs?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            Issues & Returns Log ({(order?.material_issues?.length || 0) + (order?.material_returns?.length || 0)})
          </button>
          <button
            onClick={() => setActiveTab('yield')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'yield'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Yield & Scrap Analysis ({order?.wastages?.length || 0} Losses)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Audit & Governance
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading production order specifications...</p>
            </div>
          ) : !order ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              Production order record not found.
            </div>
          ) : (
            <>
              {/* TAB 1: Material Requirements */}
              {activeTab === 'materials' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-3.5 py-3">Component / SKU</th>
                          <th className="px-3 py-3 text-right">Planned Gross</th>
                          <th className="px-3 py-3 text-right">Reserved</th>
                          <th className="px-3 py-3 text-right">Issued</th>
                          <th className="px-3 py-3 text-right">Consumed</th>
                          <th className="px-3 py-3 text-right">Returned</th>
                          <th className="px-3 py-3 text-right">Variance</th>
                          <th className="px-3 py-3 text-right">Cost (Planned / Act)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(order.components || []).map(comp => {
                          const varQty = (comp.consumed_quantity || 0) - comp.planned_quantity;
                          return (
                            <tr key={comp.id} className="hover:bg-slate-50/50">
                              <td className="px-3.5 py-3">
                                <div className="font-semibold text-slate-800">{comp.component_sku_name}</div>
                                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{comp.component_sku_code}</span>
                                  <span>•</span>
                                  <span className="capitalize">{comp.component_type.replace('_', ' ')}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-medium text-slate-800">
                                {comp.planned_quantity.toLocaleString()} {comp.required_unit_code}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-indigo-600">
                                {comp.reserved_quantity.toLocaleString()} {comp.required_unit_code}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-blue-600">
                                {comp.issued_quantity.toLocaleString()} {comp.required_unit_code}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {comp.consumed_quantity.toLocaleString()} {comp.required_unit_code}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-amber-600">
                                {comp.returned_quantity.toLocaleString()} {comp.required_unit_code}
                              </td>
                              <td className="px-3 py-3 text-right font-mono">
                                {varQty > 0 ? (
                                  <span className="text-rose-600 font-semibold">+{varQty.toFixed(2)}</span>
                                ) : varQty < 0 ? (
                                  <span className="text-emerald-600 font-semibold">{varQty.toFixed(2)}</span>
                                ) : (
                                  <span className="text-slate-400">0.00</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                <div>₹{comp.planned_cost.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400">Act: ₹{comp.actual_cost.toLocaleString()}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Outputs */}
              {activeTab === 'outputs' && (
                <div className="space-y-4">
                  {(!order.outputs || order.outputs.length === 0) ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                      <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">No output has been recorded for this order yet.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Use the "Record Output" button above to log manufactured finished goods.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-4 py-3">Output Ref</th>
                            <th className="px-4 py-3">Batch / Lot</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3">Mfg / Expiry</th>
                            <th className="px-4 py-3">QC Status / Stock</th>
                            <th className="px-4 py-3">Operator</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.outputs.map(out => (
                            <tr key={out.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-mono font-medium text-slate-800">
                                {out.output_number}
                              </td>
                              <td className="px-4 py-3 font-mono text-indigo-700 font-semibold">
                                {out.batch_number}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                                {out.quantity.toLocaleString()} {order.unit_code}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                <div>Mfg: {new Date(out.manufacturing_date).toLocaleDateString()}</div>
                                {out.expiry_date && (
                                  <div className="text-[10px] text-slate-400">Exp: {new Date(out.expiry_date).toLocaleDateString()}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {out.qc_status === 'passed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" /> QC Passed (Available)
                                  </span>
                                ) : out.qc_status === 'failed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3" /> QC Rejected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    <ShieldCheck className="w-3 h-3" /> In Quarantine (QC Pending)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {out.recorded_by_email || 'Operator'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Issues & Returns Log */}
              {activeTab === 'movements' && (
                <div className="space-y-6">
                  {/* Issues */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Material Dispensing / Issues to Shop Floor ({order.material_issues?.length || 0})
                    </h4>
                    {(!order.material_issues || order.material_issues.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No materials have been issued yet.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-3.5 py-2.5">Issue Ref</th>
                              <th className="px-3 py-2.5">Component</th>
                              <th className="px-3 py-2.5 text-right">Quantity</th>
                              <th className="px-3 py-2.5">Lot / Batch</th>
                              <th className="px-3 py-2.5">Dispensed By</th>
                              <th className="px-3 py-2.5">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.material_issues.map(iss => (
                              <tr key={iss.id}>
                                <td className="px-3.5 py-2.5 font-mono text-slate-800">{iss.issue_number}</td>
                                <td className="px-3 py-2.5 font-medium text-slate-800">{iss.sku_name || iss.component_sku_name}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">
                                  {iss.quantity} {iss.unit_code}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-slate-600">{iss.batch_number || '—'}</td>
                                <td className="px-3 py-2.5 text-slate-500">{iss.issued_by_email}</td>
                                <td className="px-3 py-2.5 text-slate-500">{new Date(iss.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Returns */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      Material Returns to Warehouse ({order.material_returns?.length || 0})
                    </h4>
                    {(!order.material_returns || order.material_returns.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No returns recorded.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-3.5 py-2.5">Return Ref</th>
                              <th className="px-3 py-2.5">Component</th>
                              <th className="px-3 py-2.5 text-right">Quantity</th>
                              <th className="px-3 py-2.5">Reason</th>
                              <th className="px-3 py-2.5">Returned By</th>
                              <th className="px-3 py-2.5">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.material_returns.map(ret => (
                              <tr key={ret.id}>
                                <td className="px-3.5 py-2.5 font-mono text-slate-800">{ret.return_number}</td>
                                <td className="px-3 py-2.5 font-medium text-slate-800">{ret.sku_name || ret.component_sku_name}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">
                                  {ret.quantity} {ret.unit_code}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{ret.reason}</td>
                                <td className="px-3 py-2.5 text-slate-500">{ret.returned_by_email}</td>
                                <td className="px-3 py-2.5 text-slate-500">{new Date(ret.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Yield & Scrap Analysis */}
              {activeTab === 'yield' && (
                <div className="space-y-6">
                  {/* Yield Gauge Card */}
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-xs">
                      <span className="text-xs text-slate-500 block">Target Planned Batch</span>
                      <span className="text-lg font-bold text-slate-900 font-mono">
                        {order.planned_quantity.toLocaleString()} {order.unit_code}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-xs">
                      <span className="text-xs text-slate-500 block">Actual Finished Output</span>
                      <span className="text-lg font-bold text-emerald-700 font-mono">
                        {order.actual_output_quantity.toLocaleString()} {order.unit_code}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-xs">
                      <span className="text-xs text-slate-500 block">Yield Realization %</span>
                      <span className="text-lg font-bold text-indigo-700 font-mono">
                        {yieldPct}%
                      </span>
                    </div>
                  </div>

                  {/* Wastages Table */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      Recorded Process Losses & Scrap Logs ({order.wastages?.length || 0})
                    </h4>
                    {(!order.wastages || order.wastages.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No scrap or process loss recorded for this order.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-3.5 py-2.5">Category</th>
                              <th className="px-3 py-2.5">Affected Item</th>
                              <th className="px-3 py-2.5 text-right">Quantity</th>
                              <th className="px-3 py-2.5">Reason / Cause</th>
                              <th className="px-3 py-2.5">Logged By</th>
                              <th className="px-3 py-2.5">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.wastages.map(w => (
                              <tr key={w.id}>
                                <td className="px-3.5 py-2.5 capitalize font-medium text-rose-700">
                                  {w.category.replace('_', ' ')}
                                </td>
                                <td className="px-3 py-2.5 text-slate-700">
                                  {w.sku_name || order.finished_sku_name}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">
                                  {w.quantity} {w.unit_code}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{w.reason}</td>
                                <td className="px-3 py-2.5 text-slate-500">{w.recorded_by_email}</td>
                                <td className="px-3 py-2.5 text-slate-500">{new Date(w.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: Audit & Governance */}
              {activeTab === 'audit' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="font-semibold text-slate-800 uppercase tracking-wider">
                      Batch Traceability & Governance Stamps
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 block">Created By</span>
                        <span className="font-medium text-slate-800">{order.created_by_email || 'System'}</span>
                        <span className="text-[11px] text-slate-400 block">{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Approved By</span>
                        <span className="font-medium text-slate-800">{order.approved_by_email || 'Pending Approval'}</span>
                        {order.approved_at && (
                          <span className="text-[11px] text-slate-400 block">{new Date(order.approved_at).toLocaleString()}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block">Completed By</span>
                        <span className="font-medium text-slate-800">{order.completed_by_email || 'In Progress'}</span>
                        {order.completed_at && (
                          <span className="text-[11px] text-slate-400 block">{new Date(order.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block">Production Plan</span>
                        <span className="font-medium text-slate-800">{order.plan_number || 'Standalone Order'}</span>
                      </div>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl">
                      <span className="text-slate-500 font-semibold block mb-1">Operator Notes</span>
                      <p className="text-slate-700">{order.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
