import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  TrendingUp,
} from 'lucide-react';
import type { DistributorOrder, DistributorMaster } from '../../../types/distributors.ts';
import { distributorApi } from '../../../services/distributorApi.ts';

interface DistributorOrdersViewProps {
  orders: DistributorOrder[];
  distributors: DistributorMaster[];
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onRefresh: () => void;
}

export const DistributorOrdersView: React.FC<DistributorOrdersViewProps> = ({
  orders,
  distributors,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    distributor_id: distributors[0]?.id || '',
    preferred_cf_id: 'cf-mumbai-01',
    notes: '',
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleApprove = async (orderId: string) => {
    try {
      await distributorApi.approveOrder(orderId);
      onRefresh();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await distributorApi.createOrder({
        ...newOrder,
        items: [
          {
            sku_id: 'sku-chana-dal-1kg',
            ordered_quantity: 100,
            unit_price: 110,
          },
        ],
      });
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Create order failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order number, distributor, notes..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="all">All Order Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="allocated">Allocated to C&F</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Book Distributor Order
        </button>
      </div>

      {/* Quick Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Book New Distributor Order</h3>
            <p className="text-xs text-slate-500 mb-4">Create demand booking from an authorized channel partner.</p>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Distributor</label>
                <select
                  value={newOrder.distributor_id}
                  onChange={e => setNewOrder({ ...newOrder, distributor_id: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                >
                  {distributors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.distributor_code} — {d.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fulfillment C&F Depot</label>
                <select
                  value={newOrder.preferred_cf_id}
                  onChange={e => setNewOrder({ ...newOrder, preferred_cf_id: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                >
                  <option value="cf-mumbai-01">CF-MUM-01 — Apex Logistics C&F (Mumbai)</option>
                  <option value="cf-delhi-01">CF-DEL-01 — North Capital C&F (Delhi)</option>
                  <option value="cf-bengaluru-01">CF-BLR-01 — Deccan Supply Chain C&F (Bengaluru)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order Notes / Purchase Order #</label>
                <input
                  type="text"
                  placeholder="PO ref or delivery instructions..."
                  value={newOrder.notes}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Distributor Partner</th>
                <th className="py-3 px-4">Fulfillment C&F</th>
                <th className="py-3 px-4 text-right">Items & Qty</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Loading distributor orders...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No distributor orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {ord.order_number}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {ord.distributor_name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {ord.cf_name || 'Primary C&F Depot'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                      {ord.total_items_count || 1} SKUs ({ord.total_quantity || 100} Units)
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(ord.total_estimated_amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-blue-100 text-blue-800">
                        {ord.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {ord.status === 'submitted' && (
                        <button
                          onClick={() => handleApprove(ord.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
