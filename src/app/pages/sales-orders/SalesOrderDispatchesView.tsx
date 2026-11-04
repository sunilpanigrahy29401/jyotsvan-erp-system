// src/app/pages/sales-orders/SalesOrderDispatchesView.tsx
// Outbound Logistics, Transporter Handover & E-Way Bill Shipment Desk (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Calendar,
  FileCheck,
  Hash,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { SalesOrder } from '../../../types/sales-orders.ts';

interface SalesOrderDispatchesViewProps {
  onSelectOrder: (orderId: string) => void;
  refreshKey: number;
}

export const SalesOrderDispatchesView: React.FC<SalesOrderDispatchesViewProps> = ({
  onSelectOrder,
  refreshKey,
}) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await salesOrderApi.listOrders({ limit: 50 });
      // Filter orders with dispatches or ready for dispatch
      const relevant = res.data.filter(
        (o) => (o.dispatches && o.dispatches.length > 0) || ['reserved', 'partially_dispatched'].includes(o.order_status || o.status)
      );
      setOrders(relevant);
    } catch (err: any) {
      setError(err.message || 'Failed to load dispatches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/60 flex items-center justify-between text-xs text-teal-950">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Fulfillment & Outbound Logistics Desk</h3>
            <p className="text-slate-600 text-[11px]">
              Gate pass generation, transporter LR tracking, statutory E-Way Bills, and dispatch decrements.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="p-2 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Dispatches List */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-teal-600" />
            <p className="text-xs">Loading outbound shipments...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50 text-xs">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-600" />
            <p className="font-bold">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Truck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No active shipments in progress</p>
            <p className="text-xs text-slate-400">All outbound sales dispatches have completed or are awaiting stock.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SO #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Depot</th>
                <th className="py-3 px-4">Latest Dispatch & Carrier</th>
                <th className="py-3 px-4">E-Way Bill #</th>
                <th className="py-3 px-4 text-center">Fulfillment</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const latestDsp = o.dispatches && o.dispatches.length > 0 ? o.dispatches[0] : null;

                return (
                  <tr
                    key={o.id}
                    onClick={() => onSelectOrder(o.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{o.order_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{o.customer_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{o.warehouse_name}</td>
                    <td className="py-3.5 px-4">
                      {latestDsp ? (
                        <div>
                          <div className="font-mono font-bold text-teal-800">{latestDsp.dispatch_number}</div>
                          <div className="text-[11px] text-slate-500">
                            {latestDsp.transporter_name} • {latestDsp.vehicle_number}
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-700 font-medium">Ready for Dispatch</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {latestDsp?.e_way_bill_number || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
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
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-lg border border-teal-200 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
