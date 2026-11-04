// src/app/pages/sales-orders/SalesOrderDetailDrawer.tsx
// Comprehensive 360° Order Inspection, Lifecycle Transitions & Fulfillment Workspace (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Boxes,
  Truck,
  RotateCcw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building,
  Store,
  Warehouse,
  Receipt,
  Printer,
  ChevronRight,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  Send,
  Ban,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { SalesOrder, OrderStatus } from '../../../types/sales-orders.ts';
import { ReserveInventoryModal } from './ReserveInventoryModal.tsx';
import { DispatchOrderModal } from './DispatchOrderModal.tsx';
import { CreateReturnModal } from './CreateReturnModal.tsx';
import { InvoiceHandoffModal } from './InvoiceHandoffModal.tsx';

interface SalesOrderDetailDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const SalesOrderDetailDrawer: React.FC<SalesOrderDetailDrawerProps> = ({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'taxes' | 'credit' | 'fulfillment' | 'dispatches' | 'returns' | 'audit'>('items');
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isReserveModalOpen, setIsReserveModalOpen] = useState<boolean>(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);

  // Rejection/Cancellation Prompt state
  const [promptAction, setPromptAction] = useState<'reject' | 'cancel' | 'override_approve' | null>(null);
  const [promptReason, setPromptReason] = useState<string>('');

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await salesOrderApi.getOrder(orderId);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sales order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  if (!isOpen || !orderId) return null;

  // Status Chip Renderer
  const renderStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
      draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
      submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
      pending_approval: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
      approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
      reserved: { label: 'Stock Reserved', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
      partially_dispatched: { label: 'Partially Dispatched', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
      dispatched: { label: 'Dispatched', bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300' },
      completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
      cancelled: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
      rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
      on_hold: { label: 'On Hold', bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
    };

    const cfg = map[status] || map.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    );
  };

  // Actions Handlers
  const handleSubmitOrder = async () => {
    setActionLoading(true);
    try {
      await salesOrderApi.submitOrder(orderId);
      await loadOrder();
      onOrderUpdated();
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveOrder = async (overrideReason?: string) => {
    setActionLoading(true);
    try {
      await salesOrderApi.approveOrder(orderId, overrideReason);
      await loadOrder();
      setPromptAction(null);
      setPromptReason('');
      onOrderUpdated();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecutePromptAction = async () => {
    if (!promptReason) {
      alert('Please enter a reason');
      return;
    }
    setActionLoading(true);
    try {
      if (promptAction === 'reject') {
        await salesOrderApi.rejectOrder(orderId, promptReason);
      } else if (promptAction === 'cancel') {
        await salesOrderApi.cancelOrder(orderId, promptReason);
      } else if (promptAction === 'override_approve') {
        await salesOrderApi.approveOrder(orderId, promptReason);
      }
      await loadOrder();
      setPromptAction(null);
      setPromptReason('');
      onOrderUpdated();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                  {order?.order_number || 'Loading Order...'}
                </h2>
                {order && renderStatusBadge(order.order_status || order.status)}
                {order?.customer_type && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                    {order.customer_type.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-2">
                <span>Customer: <strong className="text-slate-800">{order?.customer_name}</strong></span>
                <span>•</span>
                <span>Depot: <strong className="text-slate-800">{order?.warehouse_name}</strong></span>
                <span>•</span>
                <span>
                  Date: {order?.order_date ? new Date(order.order_date).toLocaleDateString('en-IN') : '—'}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Toolbar */}
          {order && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2">
              {(order.order_status || order.status) === 'draft' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSubmitOrder}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Order</span>
                </button>
              )}

              {((order.order_status || order.status) === 'submitted' || (order.order_status || order.status) === 'pending_approval') && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      const cStatus = order.credit_check_status || order.credit_status;
                      if (cStatus === 'on_hold' || cStatus === 'exceeds_limit') {
                        setPromptAction('override_approve');
                      } else {
                        handleApproveOrder();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {(order.credit_check_status || order.credit_status) === 'on_hold' || (order.credit_check_status || order.credit_status) === 'exceeds_limit'
                        ? 'Override & Approve'
                        : 'Approve Order'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setPromptAction('reject');
                      setPromptReason('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center space-x-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {((order.order_status || order.status) === 'approved' || (order.order_status || order.status) === 'reserved' || (order.order_status || order.status) === 'partially_dispatched') && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsReserveModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Allocate Stock (FEFO)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDispatchModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Shipment</span>
                  </button>
                </>
              )}

              {((order.order_status || order.status) === 'partially_dispatched' || (order.order_status || order.status) === 'completed') && (
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Initiate Return (RMA)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-colors flex items-center space-x-1.5 ml-auto shadow-2xs"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tax Invoice Handoff</span>
              </button>

              {['draft', 'submitted', 'pending_approval', 'approved'].includes(order.order_status || order.status) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setPromptAction('cancel');
                    setPromptReason('');
                  }}
                  className="px-3 py-1.5 rounded-lg hover:bg-slate-200 text-slate-500 text-xs font-semibold transition-colors"
                >
                  Cancel Order
                </button>
              )}
            </div>
          )}
        </div>

        {/* Prompt Input Banner (for Reject / Cancel / Override) */}
        {promptAction && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-900">
                {promptAction === 'reject'
                  ? 'Reject Order Authorization'
                  : promptAction === 'cancel'
                  ? 'Cancel Sales Order'
                  : 'Management Credit Override & Approval'}
              </span>
              <button
                type="button"
                onClick={() => setPromptAction(null)}
                className="text-amber-700 hover:text-amber-900 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder={
                  promptAction === 'override_approve'
                    ? 'State managerial override rationale (e.g. advance cheque received)...'
                    : 'Enter audit rationale for rejection / cancellation...'
                }
                value={promptReason}
                onChange={(e) => setPromptReason(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecutePromptAction}
                className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs"
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex px-6 border-b border-slate-200 bg-white space-x-6 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'items' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Line Items ({order?.items?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('taxes')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'taxes' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Commercial & Taxes
          </button>
          <button
            onClick={() => setActiveTab('credit')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'credit' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Credit Exposure
          </button>
          <button
            onClick={() => setActiveTab('fulfillment')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'fulfillment' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Stock Reservations ({order?.reservations?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'dispatches' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Dispatches ({order?.dispatches?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'returns' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Returns & RMAs ({order?.returns?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'audit' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Audit Trail
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
              <p>Loading sales order records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">{error}</div>
          ) : order ? (
            <>
              {/* TAB 1: Line Items */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Product / SKU</th>
                          <th className="py-2.5 px-3 text-right">Ordered</th>
                          <th className="py-2.5 px-3 text-right">Reserved</th>
                          <th className="py-2.5 px-3 text-right">Fulfilled</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                          <th className="py-2.5 px-3 text-right">Disc %</th>
                          <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                          <th className="py-2.5 px-3 text-right">Net Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {(order.items || []).map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{item.product_name_snapshot}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                SKU: {item.sku_code_snapshot} ({item.uom})
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-800">{item.ordered_quantity}</td>
                            <td className="py-3 px-3 text-right font-medium text-indigo-700">{item.reserved_quantity}</td>
                            <td className="py-3 px-3 text-right font-bold text-teal-700">{item.fulfilled_quantity}</td>
                            <td className="py-3 px-3 text-right font-mono">₹{item.unit_price.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">{item.discount_pct}%</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              ₹{item.tax_amount.toFixed(2)} ({item.tax_rate}%)
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                              ₹{item.net_amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-slate-600">
                      Total Line Items: <strong>{order.items?.length || 0}</strong> • Total Units:{' '}
                      <strong>{order.items?.reduce((acc, i) => acc + i.ordered_quantity, 0)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[11px] mr-2">Grand Total:</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        ₹{order.grand_total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Commercial & Taxes */}
              {activeTab === 'taxes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Tax Compliance Matrix</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Supply Type:</span>
                        <span className="font-bold text-slate-800">
                          {order.is_interstate ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST + SGST)'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Gross Subtotal:</span>
                        <span className="font-mono">₹{order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total Discounts:</span>
                        <span className="font-mono text-amber-700">-₹{order.discount_total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1.5">
                        <span>Taxable Value:</span>
                        <span className="font-mono">₹{order.taxable_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST:</span>
                        <span className="font-mono">₹{(order.cgst_total ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST:</span>
                        <span className="font-mono">₹{(order.sgst_total ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>IGST:</span>
                        <span className="font-mono">₹{(order.igst_total ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Rounding Adj:</span>
                        <span className="font-mono">{order.rounding_adjustment.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-300 pt-2">
                        <span>Payable Grand Total:</span>
                        <span className="font-mono">₹{order.grand_total.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Customer PO & Remarks</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-500">Customer Reference / PO:</span>
                        <div className="font-mono font-bold text-slate-800">{order.customer_reference || 'None specified'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Requested Delivery Date:</span>
                        <div className="font-bold text-slate-800">
                          {order.requested_delivery_date ? new Date(order.requested_delivery_date).toLocaleDateString('en-IN') : 'Standard SLA'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Customer Notes:</span>
                        <div className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-1">
                          {order.notes || 'No customer notes recorded.'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Internal Audit Notes:</span>
                        <div className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-1">
                          {order.internal_notes || 'No internal remarks.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Credit Exposure */}
              {activeTab === 'credit' && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border flex items-start space-x-3 ${
                      (order.credit_check_status || order.credit_status) === 'on_hold'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : (order.credit_check_status || order.credit_status) === 'exceeds_limit'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    {(order.credit_check_status || order.credit_status) === 'on_hold' ? (
                      <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider">
                        Credit Policy Evaluation: {(order.credit_check_status || order.credit_status).replace('_', ' ')}
                      </h4>
                      <p className="text-[11px] opacity-80 mt-1">
                        Assessed against customer credit master, overdue aging brackets, and open sales orders.
                      </p>
                    </div>
                  </div>

                  {order.credit_override_by && (
                    <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
                      <div className="font-bold">Managerial Credit Override Applied</div>
                      <div className="mt-1">
                        Override Rationale: <em>"{order.credit_override_reason}"</em>
                      </div>
                      <div className="text-[10px] opacity-75 mt-1 font-mono">
                        Authorized by {order.credit_override_by} at {order.credit_override_at}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Stock Reservations */}
              {activeTab === 'fulfillment' && (
                <div className="space-y-4">
                  {order.reservations && order.reservations.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3 text-right">Reserved Qty</th>
                            <th className="py-2.5 px-3">Batch Number</th>
                            <th className="py-2.5 px-3">Location / Bin</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {order.reservations.map((res) => (
                            <tr key={res.id}>
                              <td className="py-3 px-3 font-mono font-medium text-slate-800">{res.sku_code || res.sku_id}</td>
                              <td className="py-3 px-3 text-right font-bold text-indigo-700">{res.quantity ?? res.reserved_quantity}</td>
                              <td className="py-3 px-3 font-mono text-slate-600">{res.batch_number || res.batch_id || 'Auto Stock'}</td>
                              <td className="py-3 px-3 font-mono text-slate-600">{res.location_name || res.location_id || 'General Bay'}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">
                                  {res.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="font-medium">No inventory reservations currently active for this order.</p>
                      {['approved', 'submitted'].includes(order.order_status || order.status) && (
                        <button
                          type="button"
                          onClick={() => setIsReserveModalOpen(true)}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs"
                        >
                          Allocate Stock Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Dispatches */}
              {activeTab === 'dispatches' && (
                <div className="space-y-4">
                  {order.dispatches && order.dispatches.length > 0 ? (
                    order.dispatches.map((dsp) => (
                      <div key={dsp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Truck className="w-4 h-4 text-teal-600" />
                            <span className="font-bold font-mono text-slate-900">{dsp.dispatch_number}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                            {dsp.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                          <div>
                            Transporter: <strong>{dsp.transporter_name || 'N/A'}</strong>
                          </div>
                          <div>
                            Vehicle: <strong className="font-mono">{dsp.vehicle_number || 'N/A'}</strong>
                          </div>
                          <div>
                            Tracking / LR: <strong className="font-mono">{dsp.tracking_number || 'N/A'}</strong>
                          </div>
                          <div>
                            E-Way Bill: <strong className="font-mono text-teal-700">{dsp.e_way_bill_number || 'N/A'}</strong>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      <Truck className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="font-medium">No physical dispatches recorded yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Returns */}
              {activeTab === 'returns' && (
                <div className="space-y-4">
                  {order.returns && order.returns.length > 0 ? (
                    order.returns.map((ret) => (
                      <div key={ret.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                            <span className="font-bold font-mono text-amber-900">{ret.return_number}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-200 text-amber-900">
                            {ret.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          Reason: <strong>{ret.reason.replace('_', ' ')}</strong> • Condition:{' '}
                          <strong>{ret.condition.replace('_', ' ')}</strong> • Value:{' '}
                          <strong className="font-mono">₹{(ret.total_refund_amount ?? ret.grand_total ?? 0).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      <RotateCcw className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="font-medium">No sales return requests logged for this order.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: Audit Trail */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  {(order.audit_logs && order.audit_logs.length > 0) || (order.history && order.history.length > 0) ? (
                    (order.audit_logs || order.history || []).map((log: any, idx: number) => (
                      <div key={log.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-3 text-xs">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                              {(log.action || log.new_status || 'Status Change').replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.created_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            {log.notes || log.reason || `Transitioned order state to ${log.new_status || ''}.`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">Actor: {log.user_email || log.changed_by_email || 'System'}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl">
                      <p>No audit trail logs recorded yet.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modals Mounting */}
        {order && (
          <>
            <ReserveInventoryModal
              orderId={order.id}
              orderNumber={order.order_number}
              isOpen={isReserveModalOpen}
              onClose={() => setIsReserveModalOpen(false)}
              onSuccess={() => {
                loadOrder();
                onOrderUpdated();
              }}
            />

            <DispatchOrderModal
              order={order}
              isOpen={isDispatchModalOpen}
              onClose={() => setIsDispatchModalOpen(false)}
              onSuccess={() => {
                loadOrder();
                onOrderUpdated();
              }}
            />

            <CreateReturnModal
              order={order}
              isOpen={isReturnModalOpen}
              onClose={() => setIsReturnModalOpen(false)}
              onSuccess={() => {
                loadOrder();
                onOrderUpdated();
              }}
            />

            <InvoiceHandoffModal
              orderId={order.id}
              isOpen={isInvoiceModalOpen}
              onClose={() => setIsInvoiceModalOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  );
};
