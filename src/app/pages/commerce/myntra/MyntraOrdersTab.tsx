// src/app/pages/commerce/myntra/MyntraOrdersTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Calendar,
  MapPin,
  CreditCard,
  Truck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';
import type { MyntraOrder } from '../../../../types/myntra.ts';

export function MyntraOrdersTab() {
  const [orders, setOrders] = useState<MyntraOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await myntraApi.getOrders({
        status: statusFilter,
        search: searchTerm,
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load Myntra orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'APPROVED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Order ID or Release Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
          />
        </form>

        <div className="flex items-center space-x-2 overflow-x-auto">
          {['ALL', 'APPROVED', 'SHIPPED', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading Myntra orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Myntra orders found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or run a sync cycle.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((ord) => {
              const isExpanded = expandedOrderId === ord.id;
              return (
                <div key={ord.id} className="transition-colors hover:bg-slate-50/40">
                  <div
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-pink-50 rounded-lg mt-0.5">
                        <Package className="w-4 h-4 text-pink-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900 font-mono">
                            {ord.external_order_id}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getStatusBadge(ord.order_status)}`}>
                            {ord.order_status}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {ord.fulfillment_channel}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            {new Date(ord.purchase_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                            {ord.buyer_city}, {ord.buyer_state} ({ord.buyer_postal_code})
                          </span>
                          <span className="flex items-center">
                            <CreditCard className="w-3 h-3 mr-1 text-slate-400" />
                            {ord.payment_method}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          ₹{ord.grand_total.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {ord.item_count} {ord.item_count === 1 ? 'item' : 'items'} • Tax ₹{ord.tax_amount || 0}
                        </div>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Line Items & Manifest Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-700 mb-2">Order Line Items</div>
                      <div className="space-y-2">
                        {ord.items && ord.items.length > 0 ? (
                          ord.items.map((itm, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-900">{itm.title}</span>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  SKU: {itm.seller_sku} • Qty: {itm.quantity_ordered}
                                </div>
                              </div>
                              <div className="text-right font-bold text-slate-900">
                                ₹{itm.item_price.toLocaleString('en-IN')}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400">No item details available.</div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Manifest: {String((ord.raw_metadata as any)?.pickup_manifest || 'MANIFEST_PPMP_BLR')}</span>
                        <span>Release ID: {String((ord.raw_metadata as any)?.myntra_release_id || 'REL_MYN_DEFAULT')}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
