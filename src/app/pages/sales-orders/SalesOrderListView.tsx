// src/app/pages/sales-orders/SalesOrderListView.tsx
// Comprehensive Sales Orders Master Grid & Lifecycle Management Workspace (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Boxes,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { SalesOrder, SalesOrderSummaryMetrics, OrderStatus, CustomerType } from '../../../types/sales-orders.ts';

interface SalesOrderListViewProps {
  onOpenCreateModal: () => void;
  onSelectOrder: (orderId: string) => void;
  refreshKey: number;
}

export const SalesOrderListView: React.FC<SalesOrderListViewProps> = ({
  onOpenCreateModal,
  onSelectOrder,
  refreshKey,
}) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [metrics, setMetrics] = useState<SalesOrderSummaryMetrics | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, ordersData] = await Promise.all([
        salesOrderApi.getStats(),
        salesOrderApi.listOrders({
          search,
          orderStatus: statusFilter,
          customerType: customerTypeFilter,
          page,
          limit,
        }),
      ]);

      setMetrics(statsData);
      setOrders(ordersData.data);
      setTotalCount(ordersData.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales orders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, customerTypeFilter, page, refreshKey]);

  // Status Badge Renderer
  const renderStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
      draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
      submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
      pending_approval: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
      approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
      reserved: { label: 'Stock Reserved', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
      partially_dispatched: { label: 'Partial Dispatch', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
      dispatched: { label: 'Dispatched', bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300' },
      completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
      cancelled: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
      rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
      on_hold: { label: 'On Hold', bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
    };

    const cfg = map[status] || map.draft;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Executive KPIs */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
              <span>Total Orders Booked</span>
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.totalOrders ?? metrics.total_orders ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Gross Value: <strong className="text-slate-800">₹{(metrics.totalOrderValue ?? metrics.total_order_value ?? 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
              <span>Pending Review & Hold</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono">
              {(metrics.pendingApproval ?? 0) + (metrics.draftOrders ?? 0)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium">
              Credit policy or commercial approval needed
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
              <span>Allocation & Dispatches</span>
              <Truck className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-900 font-mono">
              {(metrics.approvedOrders ?? 0) +
                (metrics.reservedOrders ?? 0) +
                (metrics.partiallyDispatched ?? 0)}
            </div>
            <div className="text-[11px] text-teal-700 font-medium">
              Active in warehouse fulfillment pipeline
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
              <span>Completed Deliveries</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-black text-green-900 font-mono">
              {metrics.completedOrders ?? 0}
            </div>
            <div className="text-[11px] text-green-700 font-medium">
              Fulfilled & invoiced downstream
            </div>
          </div>
        </div>
      )}

      {/* 2. Filter & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SO#, customer name, PO#..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Order Statuses</option>
            <option value="draft">Drafts</option>
            <option value="submitted">Submitted</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="reserved">Stock Reserved</option>
            <option value="partially_dispatched">Partially Dispatched</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Channel Filter */}
          <select
            value={customerTypeFilter}
            onChange={(e) => {
              setCustomerTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Customer Channels</option>
            <option value="distributor">Distributors</option>
            <option value="retailer">Retail Merchants</option>
            <option value="direct_customer">Direct B2B</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Create Order Button */}
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center space-x-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Order</span>
        </button>
      </div>

      {/* 3. Orders Master Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs">Loading commercial sales orders...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50 text-xs">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-600" />
            <p className="font-bold">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <div>
              <p className="font-bold text-slate-700 text-sm">No sales orders found</p>
              <p className="text-xs text-slate-400">
                {search || statusFilter !== 'all'
                  ? 'Try clearing your search filters.'
                  : 'Get started by creating your first sales order.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Book Sales Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 min-w-[150px]">Order Number</th>
                  <th className="py-3 px-4 min-w-[200px]">Customer / Channel</th>
                  <th className="py-3 px-4">Warehouse Depot</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-center">Fulfillment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Order Number & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-black text-slate-900 flex items-center space-x-1.5">
                        <span>{order.order_number}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                        {order.customer_reference && (
                          <span className="font-mono text-slate-400 ml-1.5">[{order.customer_reference}]</span>
                        )}
                      </div>
                    </td>

                    {/* Customer & Channel */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{order.customer_name}</div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {order.customer_type.replace('_', ' ')}
                        </span>
                        {order.credit_check_status === 'on_hold' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            Credit Hold
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{order.warehouse_name}</div>
                      <div className="text-[10px] text-slate-400">{order.is_interstate ? 'Inter-State' : 'Intra-State'}</div>
                    </td>

                    {/* Taxable */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      ₹{order.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      ₹{order.grand_total.toLocaleString('en-IN')}
                    </td>

                    {/* Fulfillment Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.fulfillment_status === 'completed' || order.fulfillment_status === 'dispatched'
                            ? 'bg-green-100 text-green-800'
                            : order.fulfillment_status === 'partially_dispatched'
                            ? 'bg-teal-100 text-teal-800'
                            : order.fulfillment_status === 'reserved'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.fulfillment_status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Order Status */}
                    <td className="py-3.5 px-4 text-center">{renderStatusBadge(order.order_status || order.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} orders
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-white border border-slate-300 disabled:opacity-50 font-medium"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page * limit >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-white border border-slate-300 disabled:opacity-50 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
