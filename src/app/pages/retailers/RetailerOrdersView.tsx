import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Store,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerOrderRequest } from '../../../types/retailers.ts';

interface RetailerOrdersViewProps {
  onCreateOrder: () => void;
}

export const RetailerOrdersView: React.FC<RetailerOrdersViewProps> = ({ onCreateOrder }) => {
  const [orders, setOrders] = useState<RetailerOrderRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<RetailerOrderRequest | null>(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await retailerApi.listOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load retailer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    if (!confirm('Approve this retailer replenishment order request?')) return;
    try {
      await retailerApi.approveOrder(orderId, 'Approved for distributor dispatch');
      loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (orderId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await retailerApi.rejectOrder(orderId, reason);
      loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Filter and Create Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['all', 'submitted', 'approved', 'rejected', 'draft'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOrders}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Raise Order Request
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Retailer Outlet</th>
                <th className="py-3 px-4">Distributor Fulfiller</th>
                <th className="py-3 px-4">Total Qty & Valuation</th>
                <th className="py-3 px-4">Requested Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No orders found.</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {o.order_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {o.retailer_name}
                      <div className="text-[10px] text-slate-400 font-normal font-mono">{o.retailer_code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {o.distributor_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{formatCurrency(o.total_estimated_amount)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {o.total_quantity} units ({o.total_items_count} SKUs)
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(o.requested_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                          o.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : o.status === 'submitted'
                            ? 'bg-amber-50 text-amber-700'
                            : o.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {o.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleApprove(o.id)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title="Approve Order"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(o.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Reject Order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Order Details — {selectedOrder.order_number}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Retailer:</span>
                <p className="font-semibold text-slate-900">{selectedOrder.retailer_name}</p>
              </div>
              <div>
                <span className="text-slate-400">Fulfilling Distributor:</span>
                <p className="font-semibold text-slate-900">{selectedOrder.distributor_name}</p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <p className="font-semibold text-slate-900 capitalize">{selectedOrder.status}</p>
              </div>
              <div>
                <span className="text-slate-400">Total Valuation:</span>
                <p className="font-bold text-slate-900">{formatCurrency(selectedOrder.total_estimated_amount)}</p>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Line Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Est. Unit Price</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">{it.sku_name || it.sku_id}</td>
                        <td className="py-2 px-3">{it.requested_quantity} {it.uom}</td>
                        <td className="py-2 px-3">{formatCurrency(it.estimated_unit_price)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{formatCurrency(it.estimated_line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
