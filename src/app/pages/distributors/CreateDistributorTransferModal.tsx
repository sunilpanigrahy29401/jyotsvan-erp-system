import React, { useState } from 'react';
import {
  X,
  Send,
  Truck,
  Building2,
  Boxes,
  Plus,
  Trash2,
} from 'lucide-react';
import { distributorApi } from '../../../services/distributorApi.ts';
import type { DistributorMaster, TransferPriority } from '../../../types/distributors.ts';

interface CreateDistributorTransferModalProps {
  distributors: DistributorMaster[];
  initialDistributorId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateDistributorTransferModal: React.FC<CreateDistributorTransferModalProps> = ({
  distributors,
  initialDistributorId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    distributor_id: initialDistributorId || distributors[0]?.id || '',
    cf_id: 'cf-mumbai-01',
    priority: 'medium' as TransferPriority,
    notes: '',
    shipping_carrier: 'VRL Logistics Express',
    tracking_number: `LR-${Math.floor(100000 + Math.random() * 900000)}`,
    vehicle_number: 'MH-04-AB-9876',
  });

  const [items, setItems] = useState([
    {
      sku_id: 'sku-chana-dal-1kg',
      batch_id: 'batch-001',
      requested_quantity: 150,
      unit_price: 110,
    },
    {
      sku_id: 'sku-toor-dal-1kg',
      batch_id: 'batch-002',
      requested_quantity: 200,
      unit_price: 145,
    },
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        sku_id: 'sku-moong-dal-1kg',
        batch_id: 'batch-003',
        requested_quantity: 100,
        unit_price: 125,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    setLoading(true);
    try {
      await distributorApi.createTransfer({
        ...formData,
        items,
      });
      onSuccess();
    } catch (err: any) {
      alert(`Transfer creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create C&F-to-Distributor Dispatch</h2>
              <p className="text-xs text-slate-500">Initiate inventory consignment dispatch from C&F depot to channel partner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Source and Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Source C&F Logistics Hub *</label>
              <select
                value={formData.cf_id}
                onChange={e => setFormData({ ...formData, cf_id: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              >
                <option value="cf-mumbai-01">CF-MUM-01 — Apex Logistics C&F (Bhiwandi, Mumbai)</option>
                <option value="cf-delhi-01">CF-DEL-01 — North Capital C&F (Kundli, Delhi)</option>
                <option value="cf-bengaluru-01">CF-BLR-01 — Deccan Supply Chain C&F (Bengaluru)</option>
                <option value="cf-odisha-01">CF-OD-01 — Utkal Forwarding Agency (Bhubaneswar)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Recipient Distributor *</label>
              <select
                value={formData.distributor_id}
                onChange={e => setFormData({ ...formData, distributor_id: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              >
                {distributors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.distributor_code} — {d.display_name} ({d.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Logistics Carrier</label>
              <input
                type="text"
                value={formData.shipping_carrier}
                onChange={e => setFormData({ ...formData, shipping_carrier: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Vehicle / Lorry Number</label>
              <input
                type="text"
                value={formData.vehicle_number}
                onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg uppercase"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">SKU Line Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add SKU
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-xs">
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-500 mb-0.5">SKU ID</label>
                    <input
                      type="text"
                      value={item.sku_id}
                      onChange={e => handleItemChange(idx, 'sku_id', e.target.value)}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[11px] text-slate-500 mb-0.5">Batch #</label>
                    <input
                      type="text"
                      value={item.batch_id}
                      onChange={e => handleItemChange(idx, 'batch_id', e.target.value)}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    />
                  </div>

                  <div className="w-24">
                    <label className="block text-[11px] text-slate-500 mb-0.5">Dispatch Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.requested_quantity}
                      onChange={e => handleItemChange(idx, 'requested_quantity', parseInt(e.target.value, 10) || 0)}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white font-semibold"
                    />
                  </div>

                  <div className="w-24">
                    <label className="block text-[11px] text-slate-500 mb-0.5">Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 mt-4 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-transfer-dispatch"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Initiating Dispatch...' : 'Confirm Dispatch'}
          </button>
        </div>
      </div>
    </div>
  );
};
