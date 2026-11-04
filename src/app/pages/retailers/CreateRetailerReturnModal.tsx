import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerMaster, RetailerReturnReason } from '../../../types/retailers.ts';

interface CreateRetailerReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  retailers: RetailerMaster[];
}

export const CreateRetailerReturnModal: React.FC<CreateRetailerReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  retailers,
}) => {
  const [retailerId, setRetailerId] = useState('');
  const [skuName, setSkuName] = useState('Jyot Organic Bio-NPK Liquid 1L');
  const [batchNumber, setBatchNumber] = useState('BATCH-2025-NPK-001');
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState<RetailerReturnReason>('damaged');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selRetailer = retailers.find((r) => r.id === retailerId) || retailers[0];
    if (!selRetailer) {
      setError('Please select a retailer');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await retailerApi.createReturn({
        retailer_id: selRetailer.id,
        distributor_id: selRetailer.primary_distributor_id || 'dist-mumbai-agro-01',
        distributor_name: selRetailer.primary_distributor_name || 'Apex Agro Distributors',
        sku_id: 'sku-jyot-bio-npk-1l',
        sku_name: skuName,
        batch_number: batchNumber,
        quantity: Number(quantity),
        reason,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit return request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Log Retailer Return Claim</h2>
              <p className="text-xs text-slate-500">Initiate return request for damaged, expired, or non-moving stock.</p>
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
          <div>
            <label className="text-slate-600 font-medium">Retailer Counter *</label>
            <select
              value={retailerId}
              onChange={(e) => setRetailerId(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">Select retailer</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name} ({r.city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-medium">Product SKU Name *</label>
              <input
                type="text"
                value={skuName}
                onChange={(e) => setSkuName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium">Batch Number</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-medium">Return Quantity *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                min={1}
                required
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium">Return Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as RetailerReturnReason)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="damaged">Damaged in Transit / Storage</option>
                <option value="expired">Expired / Past Shelf-Life</option>
                <option value="quality_issue">Quality / Packaging Defect</option>
                <option value="wrong_product">Wrong SKU Delivered</option>
                <option value="excess">Excess Inventory Recall</option>
                <option value="short_shipment">Short Shipment Adjustment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-600 font-medium">Claim Remarks</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cap seal leaking on 10 bottles observed during inspection"
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Log Return Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
