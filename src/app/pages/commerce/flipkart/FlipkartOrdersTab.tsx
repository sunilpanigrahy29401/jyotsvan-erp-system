// src/app/pages/commerce/flipkart/FlipkartOrdersTab.tsx
// Phase 32: Flipkart Orders & Line Items Management Tab

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Package,
  Calendar,
  ChevronDown,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';
import type { FlipkartOrder } from '../../../../types/flipkart.ts';

export function FlipkartOrdersTab() {
  const [orders, setOrders] = useState<FlipkartOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await flipkartApi.getOrders({
        status: statusFilter,
        fulfillmentChannel: channelFilter,
        search,
      });
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Error fetching Flipkart orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, channelFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  return (
    <div className="space-y-4">
      {/* Controls & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Flipkart Order ID, Ekart tracking, or buyer city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="APPROVED">Approved / Unshipped</option>
            <option value="SHIPPED">Shipped (In Transit)</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Fulfillment Channel */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Fulfillment Types</option>
            <option value="FLIPKART_SMART">Flipkart Smart (FBF)</option>
            <option value="SELLER_FULFILLED">Seller Fulfilled (Direct)</option>
          </select>

          <button
            onClick={fetchOrders}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            Loading Flipkart orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No Flipkart orders found</p>
            <p className="text-xs text-slate-400 mt-1">Try broadening your search or filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-8"></th>
                  <th className="py-3 px-4">Order ID / Date</th>
                  <th className="py-3 px-4">Fulfillment Mode</th>
                  <th className="py-3 px-4">Buyer Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Order Total</th>
                  <th className="py-3 px-4 text-center">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {orders.map((ord) => {
                  const isExpanded = expandedOrder === ord.id;
                  const isSmart = ord.fulfillment_channel === 'FLIPKART_SMART';

                  return (
                    <React.Fragment key={ord.id}>
                      <tr
                        className={`hover:bg-slate-50/70 transition cursor-pointer ${
                          isExpanded ? 'bg-blue-50/20' : ''
                        }`}
                        onClick={() => setExpandedOrder(isExpanded ? null : ord.id)}
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{ord.order_number}</div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(ord.purchase_date).toLocaleString('en-IN')}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isSmart
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <Truck className="w-3 h-3" />
                            <span>{isSmart ? 'Flipkart Smart' : 'Seller Fulfilled'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {ord.buyer_city}, {ord.buyer_state}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">PIN: {ord.buyer_postal_code}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              ord.order_status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ord.order_status === 'SHIPPED'
                                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                : ord.order_status === 'APPROVED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {ord.order_status === 'DELIVERED' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>{ord.order_status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            {ord.payment_method || 'PREPAID'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-slate-900 font-mono">
                            ₹{Number(ord.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          {Number(ord.tax_amount) > 0 && (
                            <div className="text-[11px] text-slate-400">
                              GST: ₹{Number(ord.tax_amount).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold">
                            {ord.item_count}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Order Items View */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50/80 p-4 border-y border-slate-200">
                            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                                  <Package className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Order Line Items ({ord.items?.length || 0})</span>
                                </h4>
                                <div className="text-xs text-slate-500 font-mono">
                                  Tracking ID: {String((ord.raw_metadata as any)?.tracking_id || 'EKART_EXP_99210')}
                                </div>
                              </div>

                              <div className="divide-y divide-slate-100">
                                {ord.items?.map((it: any) => (
                                  <div
                                    key={it.id || it.external_order_item_id}
                                    className="py-2.5 flex items-center justify-between text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="font-semibold text-slate-900">{it.title}</div>
                                      <div className="text-[11px] text-slate-500 flex items-center space-x-3 font-mono">
                                        <span>SKU: {it.seller_sku}</span>
                                        <span>•</span>
                                        <span>FSN: {it.asin}</span>
                                        <span>•</span>
                                        <span>Qty: {it.quantity_ordered}</span>
                                      </div>
                                    </div>
                                    <div className="text-right font-mono">
                                      <div className="font-bold text-slate-900">
                                        ₹{Number(it.item_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </div>
                                      <div className="text-[11px] text-slate-400">
                                        (₹{it.item_price} ea + ₹{it.item_tax} GST)
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
