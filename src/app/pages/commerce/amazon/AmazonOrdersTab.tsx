// src/app/pages/commerce/amazon/AmazonOrdersTab.tsx
// Phase 31: Amazon Orders & Line Item Inspection

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Package,
  Calendar,
  Eye,
  X,
  Truck,
  User,
  MapPin,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';
import type { AmazonOrder } from '../../../../types/amazon.ts';

interface AmazonOrdersTabProps {
  selectedMarketplace: string;
}

export function AmazonOrdersTab({ selectedMarketplace }: AmazonOrdersTabProps) {
  const [orders, setOrders] = useState<AmazonOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<AmazonOrder | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await amazonApi.getOrders({
        marketplaceId: selectedMarketplace,
        status: statusFilter,
        fulfillmentChannel: channelFilter,
        search,
      });
      setOrders(res.orders);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load Amazon orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedMarketplace, statusFilter, channelFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Amazon Order ID, Buyer name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="UNSHIPPED">Unshipped (Pending Dispatch)</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Fulfillment Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Channels (FBA + MFN)</option>
            <option value="AFN">FBA (Amazon Fulfilled Network)</option>
            <option value="MFN">MFN (Merchant Fulfilled Network)</option>
          </select>

          <button
            onClick={fetchOrders}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Channel & Status</th>
                <th className="py-3 px-4">Buyer Details</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4 text-right">Order Total</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Fetching Amazon SP-API orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No Amazon orders found matching your filters.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                        {ord.external_order_id}
                        {ord.is_prime && (
                          <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded">
                            PRIME
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ord.purchase_date).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            ord.fulfillment_channel === 'AFN'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {ord.fulfillment_channel === 'AFN' ? 'FBA' : 'MFN'}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                            ord.order_status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ord.order_status === 'SHIPPED'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {ord.order_status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{ord.sales_channel || 'Amazon.in'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{ord.buyer_name || 'Amazon Customer'}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px] font-mono">
                        {ord.buyer_email || 'Protected via SP-API'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">
                        {ord.items?.length || 1} SKU ({(ord.items || []).reduce((acc, i) => acc + i.quantity_ordered, 0) || 1} units)
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {ord.items?.[0]?.title || 'Ayurvedic Botanical Formula'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-900">{formatCurrency(ord.order_total, ord.currency)}</div>
                      <div className="text-[10px] text-slate-400">
                        Tax: {formatCurrency(ord.tax_total, ord.currency)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal / Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900 font-mono">
                    {selectedOrder.external_order_id}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedOrder.fulfillment_channel === 'AFN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedOrder.fulfillment_channel === 'AFN' ? 'FBA Prime' : 'MFN Merchant'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered on {new Date(selectedOrder.purchase_date).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Buyer & Fulfillment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-2">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer & Buyer</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">{selectedOrder.buyer_name || 'Amazon Customer'}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedOrder.buyer_email || 'Protected via SP-API'}</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    Prime Status: {selectedOrder.is_prime ? 'Amazon Prime Member' : 'Standard'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-2">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dispatch & Logistics</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {selectedOrder.fulfillment_channel === 'AFN' ? 'FBA FC Dispatch (Amazon Logistics)' : 'Direct MFN Warehouse Delivery'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Status: {selectedOrder.order_status}</div>
                  <div className="text-[11px] text-slate-400 mt-2">Channel: {selectedOrder.sales_channel || 'Amazon India'}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Ordered Line Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Item / SKU</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Tax</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              SKU: {item.seller_sku} {item.asin ? `• ASIN: ${item.asin}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800">
                            {item.quantity_ordered}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {formatCurrency(item.item_price, selectedOrder.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            {formatCurrency(item.item_tax, selectedOrder.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(item.item_price * item.quantity_ordered, selectedOrder.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(selectedOrder.items_subtotal, selectedOrder.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping Charges:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(selectedOrder.shipping_price, selectedOrder.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax Total:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(selectedOrder.tax_total, selectedOrder.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Promotional Discounts:</span>
                  <span className="font-medium text-slate-800">-{formatCurrency(selectedOrder.discount_total, selectedOrder.currency)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Paid by Customer:</span>
                  <span className="text-amber-700">{formatCurrency(selectedOrder.order_total, selectedOrder.currency)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">ID: {selectedOrder.id}</span>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
