import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Calendar,
  Building,
  Truck,
  CheckCircle2,
  Send,
  PackageCheck,
  AlertTriangle,
  FileText,
  Clock,
  Printer,
  Ban,
  CheckCircle,
} from 'lucide-react';
import type { PurchaseOrder } from '../../../types/procurement';
import { procurementApi } from '../../../services/procurementApi';

interface PurchaseOrderDetailDrawerProps {
  isOpen: boolean;
  orderId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onCreateGrn: (order: PurchaseOrder) => void;
}

export const PurchaseOrderDetailDrawer: React.FC<PurchaseOrderDetailDrawerProps> = ({
  isOpen,
  orderId,
  onClose,
  onRefresh,
  onCreateGrn,
}) => {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder(orderId);
    } else {
      setOrder(null);
      setError(null);
    }
  }, [isOpen, orderId]);

  const loadOrder = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await procurementApi.getPurchaseOrderById(id);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'submit' | 'approve' | 'send' | 'acknowledge' | 'close' | 'cancel') => {
    if (!order) return;
    setActionLoading(true);
    setError(null);
    try {
      if (action === 'submit') {
        await procurementApi.submitPurchaseOrder(order.id);
      } else if (action === 'approve') {
        await procurementApi.approvePurchaseOrder(order.id);
      } else if (action === 'send') {
        await procurementApi.sendPurchaseOrder(order.id);
      } else if (action === 'acknowledge') {
        await procurementApi.acknowledgePurchaseOrder(order.id);
      } else if (action === 'close') {
        await procurementApi.closePurchaseOrder(order.id, 'Procurement fulfilled');
      } else if (action === 'cancel') {
        await procurementApi.cancelPurchaseOrder(order.id, 'Cancelled by user');
      }
      onRefresh();
      loadOrder(order.id);
    } catch (err: any) {
      setError(err.message || `Failed to perform ${action} action`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {order?.po_number || 'Purchase Order'}
                </h3>
                {order && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-slate-100 text-slate-700">
                    {order.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Created {order ? new Date(order.created_at).toLocaleDateString() : '...'}
                {order?.purchase_request_number && ` • From PR ${order.purchase_request_number}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
              <p className="text-sm text-slate-500">Loading order details...</p>
            </div>
          ) : order ? (
            <>
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-500" />
                  {error}
                </div>
              )}

              {/* Header Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier Info */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Vendor / Supplier
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{order.supplier_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Code: {order.supplier_code}</div>
                  {order.supplier_email && (
                    <div className="text-xs text-slate-500 mt-0.5">Email: {order.supplier_email}</div>
                  )}
                  {order.supplier_phone && (
                    <div className="text-xs text-slate-500 mt-0.5">Phone: {order.supplier_phone}</div>
                  )}
                </div>

                {/* Delivery & Destination Info */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Shipment & Destination
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{order.warehouse_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Exp. Delivery: <span className="font-semibold text-slate-800">{new Date(order.expected_delivery_date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Payment Terms: <span className="font-semibold text-slate-800">{order.payment_terms}</span>
                  </div>
                  {order.shipping_address && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">Address: {order.shipping_address}</div>
                  )}
                </div>
              </div>

              {/* Line Items Table with Inward Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Order Items ({order.items?.length || 0})
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">Item / SKU</th>
                        <th className="px-3 py-2.5 text-right">Ordered</th>
                        <th className="px-3 py-2.5 text-right">Received</th>
                        <th className="px-3 py-2.5 text-right">Rate</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {order.items?.map((item, idx) => {
                        const recvPercent = item.quantity > 0 ? Math.min(100, Math.round((item.received_quantity / item.quantity) * 100)) : 0;
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-3">
                              <div className="font-semibold text-slate-900">{item.product_name || item.variant_name}</div>
                              <div className="text-[11px] text-slate-500">SKU: {item.sku_code}</div>
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-slate-900">
                              {item.quantity} <span className="text-slate-400 font-normal">{item.unit_short_code || 'pcs'}</span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="font-semibold text-emerald-700">
                                {item.received_quantity} / {item.quantity}
                              </div>
                              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden ml-auto mt-1">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${recvPercent}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-slate-700">
                              {formatCurrency(item.unit_price)}
                              {item.tax_rate > 0 && <span className="text-[10px] text-slate-400 block">+{item.tax_rate}% GST</span>}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(item.line_total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex justify-end">
                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal (Net):</span>
                    <span className="font-medium text-slate-800">{formatCurrency(order.subtotal)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (GST / Duties):</span>
                    <span className="font-medium text-slate-800">{formatCurrency(order.tax_amount)}</span>
                  </div>
                  {order.shipping_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Freight & Shipping:</span>
                      <span className="font-medium text-slate-800">{formatCurrency(order.shipping_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
                    <span>Total PO Value:</span>
                    <span className="text-indigo-700">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              {(order.notes || order.terms_and_conditions) && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                  {order.notes && (
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Order Notes:</span>
                      <p className="text-slate-600">{order.notes}</p>
                    </div>
                  )}
                  {order.terms_and_conditions && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-700 block mb-0.5">Commercial Terms:</span>
                      <p className="text-slate-500 text-[11px]">{order.terms_and_conditions}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Drawer Action Footer */}
        {order && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              {order.status !== 'closed' && order.status !== 'cancelled' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('cancel')}
                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Cancel Order
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {order.status === 'draft' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('submit')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center"
                >
                  Submit for Approval
                </button>
              )}

              {order.status === 'pending_approval' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('approve')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Approve Purchase Order
                </button>
              )}

              {order.status === 'approved' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('send')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Dispatch PO to Supplier
                </button>
              )}

              {order.status === 'sent' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('acknowledge')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center"
                >
                  Record Supplier Acknowledged
                </button>
              )}

              {(order.status === 'sent' || order.status === 'acknowledged' || order.status === 'partially_received') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateGrn(order);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center"
                >
                  <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                  Receive Goods (GRN)
                </button>
              )}

              {order.status === 'fully_received' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('close')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-colors flex items-center"
                >
                  Formally Close Order
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
