// src/app/pages/sales-orders/SalesOrderReservationsView.tsx
// Warehouse Inventory Reservation, Allocation & FEFO Staging Desk (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { SalesOrder } from '../../../types/sales-orders.ts';

interface SalesOrderReservationsViewProps {
  onSelectOrder: (orderId: string) => void;
  refreshKey: number;
}

export const SalesOrderReservationsView: React.FC<SalesOrderReservationsViewProps> = ({
  onSelectOrder,
  refreshKey,
}) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await salesOrderApi.listOrders({
        search,
        orderStatus: 'all',
        limit: 50,
      });

      // Filter orders needing allocation or currently holding reservations
      const relevant = res.data.filter(
        (o) =>
          ['approved', 'reserved', 'partially_dispatched'].includes(o.order_status || o.status) ||
          (o.reservations && o.reservations.length > 0)
      );
      setOrders(relevant);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, refreshKey]);

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 flex items-center justify-between text-xs text-indigo-950">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Inventory Reservation & FEFO Allocation Desk</h3>
            <p className="text-slate-600 text-[11px]">
              Manage hard physical inventory reservations, FIFO/FEFO batch staging, and order allocation gates.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="p-2 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Orders Staging Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs">Loading stock reservations...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50 text-xs">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-600" />
            <p className="font-bold">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Boxes className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No pending inventory allocations</p>
            <p className="text-xs text-slate-400">All approved sales orders are currently fully allocated or completed.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Warehouse Depot</th>
                <th className="py-3 px-4 text-center">Active Batches Reserved</th>
                <th className="py-3 px-4 text-center">Fulfillment Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => onSelectOrder(o.id)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{o.order_number}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{o.customer_name}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{o.customer_type}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{o.warehouse_name}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {o.reservations?.length || 0} batches locked
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border">
                      {o.fulfillment_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(o.id);
                      }}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors"
                    >
                      Manage Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
