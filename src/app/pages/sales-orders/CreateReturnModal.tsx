// src/app/pages/sales-orders/CreateReturnModal.tsx
// Sales Return (RMA), QC Quarantine & Reverse Logistics Modal (Phase 18)

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type {
  SalesOrder,
  ReturnReason,
  ReturnCondition,
} from '../../../types/sales-orders.ts';

interface CreateReturnModalProps {
  order: SalesOrder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<ReturnReason>('damaged');
  const [condition, setCondition] = useState<ReturnCondition>('opened_intact');
  const [qcRequired, setQcRequired] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  const [returnItems, setReturnItems] = useState<{
    [itemId: string]: {
      selected: boolean;
      quantity: number;
    };
  }>(() => {
    const initial: any = {};
    (order.items || []).forEach((item) => {
      initial[item.id] = {
        selected: false,
        quantity: Math.min(1, item.fulfilled_quantity || item.ordered_quantity),
      };
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const selectedItems = (order.items || [])
      .filter((it) => returnItems[it.id]?.selected && returnItems[it.id].quantity > 0)
      .map((it) => ({
        sales_order_item_id: it.id,
        sku_id: it.sku_id,
        returned_quantity: returnItems[it.id].quantity,
        unit_price: it.unit_price,
        disposition: (qcRequired ? 'quarantine' : 'restock_available') as any,
      }));

    if (selectedItems.length === 0) {
      setError('Please select at least one item from the order to return.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await salesOrderApi.createReturn({
        salesOrderId: order.id,
        reason,
        condition,
        qcRequired,
        notes,
        items: selectedItems,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit sales return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-semibold shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Initiate Sales Return (RMA)</h2>
              <p className="text-xs text-slate-500">
                Log customer return authorization for SO{' '}
                <span className="font-mono font-bold text-slate-800">{order.order_number}</span> ({order.customer_name}).
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

          {/* Reason & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
              >
                <option value="damaged">Damaged in Transit / Crushed Box</option>
                <option value="wrong_product">Wrong SKU / Product Shipped</option>
                <option value="quality_issue">Quality Parameter Failure / Off-Spec</option>
                <option value="expired">Near Expiry / Expired Batch</option>
                <option value="excess">Excess Delivery / Merchant Refusal</option>
                <option value="other">Other Commercial Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Package Condition *</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ReturnCondition)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
              >
                <option value="unopened_sealed">Factory Sealed (Unopened)</option>
                <option value="opened_intact">Outer Opened, Inner Intact</option>
                <option value="damaged_outer_box">Outer Packaging Damaged</option>
                <option value="defective_product">Damaged / Defective Goods</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="qcRequiredCheckbox"
                checked={qcRequired}
                onChange={(e) => setQcRequired(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <label htmlFor="qcRequiredCheckbox" className="font-semibold text-slate-800 text-xs cursor-pointer">
                Route into Warehouse Quarantine for Quality Control (QC) Inspection before restock
              </label>
            </div>
          </div>

          {/* Items Selector */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Select Items & Units to Return
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10"></th>
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3 text-right">Dispatched</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right w-28">Return Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(order.items || []).map((item) => {
                    const rowState = returnItems[item.id] || { selected: false, quantity: 1 };
                    const maxReturn = item.fulfilled_quantity > 0 ? item.fulfilled_quantity : item.ordered_quantity;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={rowState.selected}
                            onChange={(e) =>
                              setReturnItems((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], selected: e.target.checked },
                              }))
                            }
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.product_name_snapshot}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.sku_code_snapshot} ({item.uom})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">{maxReturn}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">₹{item.unit_price}</td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="1"
                            max={maxReturn}
                            disabled={!rowState.selected}
                            value={rowState.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(maxReturn, parseFloat(e.target.value) || 1));
                              setReturnItems((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], quantity: val },
                              }));
                            }}
                            className="w-20 px-2 py-1 text-right bg-white border border-slate-300 rounded-md font-bold text-amber-900 focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Return Description & Notes</label>
            <textarea
              rows={2}
              placeholder="Detailed description of defect, customer feedback, or transport incident..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
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
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting RMA...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Sales Return Request</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
