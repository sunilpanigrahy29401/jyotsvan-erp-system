import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus, Trash2, Building2, Store } from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerMaster } from '../../../types/retailers.ts';

interface CreateRetailerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  retailers: RetailerMaster[];
  preselectedRetailer?: RetailerMaster | null;
}

export const CreateRetailerOrderModal: React.FC<CreateRetailerOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  retailers,
  preselectedRetailer,
}) => {
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [distributorId, setDistributorId] = useState('');
  const [distributorName, setDistributorName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line items
  const [items, setItems] = useState<
    Array<{
      sku_id: string;
      sku_code: string;
      sku_name: string;
      requested_quantity: number;
      uom: string;
      estimated_unit_price: number;
    }>
  >([
    {
      sku_id: 'sku-jyot-bio-npk-1l',
      sku_code: 'SKU-NPK-1L',
      sku_name: 'Jyot Organic Bio-NPK Liquid 1L',
      requested_quantity: 24,
      uom: 'bottles',
      estimated_unit_price: 360,
    },
  ]);

  useEffect(() => {
    if (preselectedRetailer) {
      setSelectedRetailerId(preselectedRetailer.id);
      if (preselectedRetailer.primary_distributor_id) {
        setDistributorId(preselectedRetailer.primary_distributor_id);
        setDistributorName(preselectedRetailer.primary_distributor_name || 'Primary Distributor');
      }
    } else if (retailers.length > 0 && !selectedRetailerId) {
      setSelectedRetailerId(retailers[0].id);
      if (retailers[0].primary_distributor_id) {
        setDistributorId(retailers[0].primary_distributor_id);
        setDistributorName(retailers[0].primary_distributor_name || 'Primary Distributor');
      }
    }
  }, [preselectedRetailer, retailers]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        sku_id: `sku-${Date.now().toString(36)}`,
        sku_code: 'SKU-ZINC-500ML',
        sku_name: 'Jyot Chelated Micronutrient Zinc 500ml',
        requested_quantity: 12,
        uom: 'bottles',
        estimated_unit_price: 240,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const next = [...items];
    (next[index] as any)[field] = val;
    setItems(next);
  };

  const calculateTotal = () => {
    return items.reduce((acc, it) => acc + (it.requested_quantity || 0) * (it.estimated_unit_price || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailerId) {
      setError('Please select a retailer');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one SKU line item');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const selected = retailers.find((r) => r.id === selectedRetailerId);
      await retailerApi.createOrder({
        retailer_id: selectedRetailerId,
        distributor_id: distributorId || selected?.primary_distributor_id || 'dist-mumbai-agro-01',
        distributor_name: distributorName || selected?.primary_distributor_name || 'Apex Agro Distributors',
        notes,
        items,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create order request');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Raise Secondary Replenishment Order</h2>
              <p className="text-xs text-slate-500">Book order request from retailer to authorized distributor.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-600 font-medium">Retailer Counter *</label>
              <select
                value={selectedRetailerId}
                onChange={(e) => {
                  setSelectedRetailerId(e.target.value);
                  const sel = retailers.find((r) => r.id === e.target.value);
                  if (sel?.primary_distributor_id) {
                    setDistributorId(sel.primary_distributor_id);
                    setDistributorName(sel.primary_distributor_name || '');
                  }
                }}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name} ({r.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-medium">Fulfilling Distributor *</label>
              <input
                type="text"
                value={distributorName || 'Apex Agro Distributors'}
                onChange={(e) => setDistributorName(e.target.value)}
                placeholder="Distributor Name"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                Order Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add SKU Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 bg-slate-50/50 flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="SKU Name"
                      value={it.sku_name}
                      onChange={(e) => handleItemChange(idx, 'sku_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={it.requested_quantity}
                      onChange={(e) => handleItemChange(idx, 'requested_quantity', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-center font-bold"
                      min={1}
                      required
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={it.estimated_unit_price}
                      onChange={(e) => handleItemChange(idx, 'estimated_unit_price', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      min={0}
                      required
                    />
                  </div>
                  <div className="w-24 text-right font-bold text-slate-800">
                    {formatCurrency(it.requested_quantity * it.estimated_unit_price)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary & Notes */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-slate-600 font-medium">Booking Remarks</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Urgent seasonal replenishment for kharif sowing"
                rows={2}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center text-right">
              <span className="text-slate-500 font-medium">Estimated Order Valuation</span>
              <span className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(calculateTotal())}</span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {items.reduce((a, b) => a + (b.requested_quantity || 0), 0)} total units
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Order Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
