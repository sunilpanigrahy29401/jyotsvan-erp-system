// src/app/pages/sales-orders/ReserveInventoryModal.tsx
// Intelligent Stock Allocation & FEFO Batch Reservation Modal (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  X,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { SkuAvailabilityResult } from '../../../types/sales-orders.ts';

interface ReserveInventoryModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReserveInventoryModal: React.FC<ReserveInventoryModalProps> = ({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{
    order_id: string;
    warehouse_id: string;
    warehouse_name: string;
    all_available: boolean;
    has_partial: boolean;
    items: SkuAvailabilityResult[];
  } | null>(null);

  const [allocations, setAllocations] = useState<{
    [orderItemId: string]: {
      sku_id: string;
      quantity: number;
      batch_id?: string;
      location_id?: string;
    };
  }>({});
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadAvailability() {
      setLoading(true);
      setError(null);
      try {
        const data = await salesOrderApi.checkInventoryAvailability(orderId);
        if (!isMounted) return;
        setAvailability(data);

        // Populate default auto-allocation quantities
        const initialAlloc: any = {};
        data.items.forEach((it, idx) => {
          const needed = Math.max(0, it.ordered_quantity - it.already_reserved_quantity);
          const allocQty = Math.min(it.warehouse_available_quantity, needed);
          const defaultBatch = it.available_batches && it.available_batches.length > 0 ? it.available_batches[0] : undefined;

          initialAlloc[`item_${idx}`] = {
            sku_id: it.sku_id,
            quantity: allocQty,
            batch_id: defaultBatch?.batch_id,
            location_id: defaultBatch?.location_id,
          };
        });
        setAllocations(initialAlloc);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load stock availability');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAvailability();
    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId]);

  const handleAutoAllocateFEFO = () => {
    if (!availability) return;
    const autoAlloc: any = {};
    availability.items.forEach((it, idx) => {
      const needed = Math.max(0, it.ordered_quantity - it.already_reserved_quantity);
      const allocQty = Math.min(it.warehouse_available_quantity, needed);
      const topFefoBatch = it.available_batches && it.available_batches.length > 0 ? it.available_batches[0] : undefined;

      autoAlloc[`item_${idx}`] = {
        sku_id: it.sku_id,
        quantity: allocQty,
        batch_id: topFefoBatch?.batch_id,
        location_id: topFefoBatch?.location_id,
      };
    });
    setAllocations(autoAlloc);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Convert map to array
      const allocList: any[] = [];
      Object.keys(allocations).forEach((key) => {
        const item = allocations[key];
        if (item.quantity > 0) {
          allocList.push({
            order_item_id: key, // Service will match by SKU or row
            sku_id: item.sku_id,
            quantity: item.quantity,
            batch_id: item.batch_id || null,
            location_id: item.location_id || null,
          });
        }
      });

      await salesOrderApi.reserveInventory(orderId, allocList.length > 0 ? allocList : undefined, notes);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reserve inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-semibold shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inventory Allocation & Stock Reservation</h2>
              <p className="text-xs text-slate-500">
                Lock physical warehouse stock & allocate FEFO batches for Order <span className="font-mono font-bold text-slate-700">{orderNumber}</span>.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              <p>Evaluating warehouse balances and FEFO batches...</p>
            </div>
          ) : availability ? (
            <>
              {/* Availability Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  availability.all_available
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : availability.has_partial
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {availability.all_available ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs">
                      Warehouse: {availability.warehouse_name}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {availability.all_available
                        ? '100% of line items are available in stock for immediate allocation.'
                        : availability.has_partial
                        ? 'Partial inventory available. Stock reservation will allocate available units and flag shortages.'
                        : 'Stockout alert: Warehouse does not currently hold sufficient available balance.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoAllocateFEFO}
                  className="px-3.5 py-1.5 rounded-lg bg-white shadow-2xs border border-current text-xs font-bold flex items-center space-x-1.5 hover:bg-slate-50 transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto FEFO Allocation</span>
                </button>
              </div>

              {/* Items Allocation Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3 text-right">Ordered</th>
                      <th className="py-2.5 px-3 text-right">Already Res.</th>
                      <th className="py-2.5 px-3 text-right">Whse Avail</th>
                      <th className="py-2.5 px-3">FEFO Batch Candidate</th>
                      <th className="py-2.5 px-3 text-right w-28">To Reserve</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {availability.items.map((it, idx) => {
                      const allocState = allocations[`item_${idx}`] || {
                        sku_id: it.sku_id,
                        quantity: 0,
                        batch_id: undefined,
                        location_id: undefined,
                      };
                      const needed = Math.max(0, it.ordered_quantity - it.already_reserved_quantity);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{it.product_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              SKU: {it.sku_code} ({it.uom})
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">
                            {it.ordered_quantity}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-indigo-700">
                            {it.already_reserved_quantity}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-900">
                            {it.warehouse_available_quantity}
                          </td>
                          <td className="py-3 px-3">
                            {it.available_batches && it.available_batches.length > 0 ? (
                              <select
                                value={allocState.batch_id || ''}
                                onChange={(e) => {
                                  const selBatch = it.available_batches?.find((b) => b.batch_id === e.target.value);
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [`item_${idx}`]: {
                                      ...prev[`item_${idx}`],
                                      batch_id: e.target.value,
                                      location_id: selBatch?.location_id,
                                    },
                                  }));
                                }}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-[11px] font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500"
                              >
                                {it.available_batches.map((b) => (
                                  <option key={b.batch_id} value={b.batch_id}>
                                    {b.batch_number} (Exp: {b.expiry_date || 'N/A'}, Avail: {b.available_quantity})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-amber-600 font-medium text-[11px]">No active QC batch</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={it.warehouse_available_quantity}
                              value={allocState.quantity}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                setAllocations((prev) => ({
                                  ...prev,
                                  [`item_${idx}`]: {
                                    ...prev[`item_${idx}`],
                                    sku_id: it.sku_id,
                                    quantity: val,
                                  },
                                }));
                              }}
                              className="w-20 px-2 py-1 text-right bg-white border border-slate-300 rounded-md font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 text-xs"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            {allocState.quantity >= needed ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                Full
                              </span>
                            ) : allocState.quantity > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                Unallocated
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reservation Audit Notes</label>
                <input
                  type="text"
                  placeholder="Optional staging instructions or warehouse priority tags..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          ) : null}
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
            disabled={isSubmitting || loading}
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Locking Inventory...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Stock Allocation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
