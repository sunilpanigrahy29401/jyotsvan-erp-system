// src/app/pages/sales-orders/DispatchOrderModal.tsx
// Physical Warehouse Dispatch & Logistics Carrier Handover Modal (Phase 18)

import React, { useState } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Hash,
  Compass,
  Loader2,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { SalesOrder } from '../../../types/sales-orders.ts';

interface DispatchOrderModalProps {
  order: SalesOrder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DispatchOrderModal: React.FC<DispatchOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [transporterName, setTransporterName] = useState<string>('VRL Logistics / Dedicated Fleet');
  const [vehicleNumber, setVehicleNumber] = useState<string>('KA-01-MJ-8891');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [eWayBillNumber, setEWayBillNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Per-item dispatch quantities
  const [dispatchQuantities, setDispatchQuantities] = useState<{ [itemId: string]: number }>(() => {
    const initial: any = {};
    (order.items || []).forEach((item) => {
      const remaining = Math.max(0, item.ordered_quantity - item.fulfilled_quantity);
      const toDispatch = item.reserved_quantity > 0 ? Math.min(item.reserved_quantity, remaining) : remaining;
      initial[item.id] = toDispatch;
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const itemsToDispatch = (order.items || [])
      .map((it) => ({
        order_item_id: it.id,
        sku_id: it.sku_id,
        dispatched_quantity: dispatchQuantities[it.id] || 0,
      }))
      .filter((it) => it.dispatched_quantity > 0);

    if (itemsToDispatch.length === 0) {
      setError('Please specify at least one product line item with dispatch quantity greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await salesOrderApi.dispatchOrder(order.id, {
        transporterName,
        vehicleNumber,
        trackingNumber,
        eWayBillNumber,
        items: itemsToDispatch,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute order dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Execute Order Dispatch & Shipment</h2>
              <p className="text-xs text-slate-500">
                Record gate pass, logistics transporter, and decrement warehouse inventory for SO{' '}
                <span className="font-mono font-bold text-slate-800">{order.order_number}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Logistics Metadata */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Transporter & Carrier Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Transporter / Logistics Partner Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. BlueDart Express, Delhivery, VRL Logistics"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vehicle / Truck Plate Number</label>
                <input
                  type="text"
                  placeholder="e.g. DL-01-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Airway Bill / LR / Tracking #</label>
                <input
                  type="text"
                  placeholder="e.g. LR-998241092"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Statutory E-Way Bill Number</label>
                <input
                  type="text"
                  placeholder="e.g. 521098234812"
                  value={eWayBillNumber}
                  onChange={(e) => setEWayBillNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Dispatch Items Quantity Matrix */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Line Items in this Shipment
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3 text-right">Ordered</th>
                    <th className="py-2.5 px-3 text-right">Fulfilled So Far</th>
                    <th className="py-2.5 px-3 text-right">Reserved Stock</th>
                    <th className="py-2.5 px-3 text-right">Remaining Needed</th>
                    <th className="py-2.5 px-3 text-right w-32">Dispatch Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(order.items || []).map((item) => {
                    const remaining = Math.max(0, item.ordered_quantity - item.fulfilled_quantity);
                    const qtyToDispatch = dispatchQuantities[item.id] !== undefined ? dispatchQuantities[item.id] : remaining;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.product_name_snapshot}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.sku_code_snapshot} ({item.uom})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">{item.ordered_quantity}</td>
                        <td className="py-3 px-3 text-right font-medium text-emerald-700">{item.fulfilled_quantity}</td>
                        <td className="py-3 px-3 text-right font-medium text-indigo-700">{item.reserved_quantity}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">{remaining}</td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={qtyToDispatch}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(remaining, parseFloat(e.target.value) || 0));
                              setDispatchQuantities((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            className="w-24 px-2 py-1 text-right bg-white border border-slate-300 rounded-md font-bold text-blue-800 focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dispatch Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dispatch Remarks</label>
            <input
              type="text"
              placeholder="Dock bay number, seal numbers, or driver contact info..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Gate Pass & Decrementing Stock...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Physical Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
