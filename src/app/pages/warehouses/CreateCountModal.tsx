import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, Building2, Calendar, AlertCircle, Layers, Boxes } from 'lucide-react';
import { WarehouseMaster, StockCountType } from '../../../types/warehouse';

interface CreateCountModalProps {
  isOpen: boolean;
  warehouses: WarehouseMaster[];
  onClose: () => void;
  onSuccess: () => void;
}

const COUNT_TYPES: { label: string; value: StockCountType; desc: string }[] = [
  { label: 'Full Facility Wall-to-Wall Audit', value: 'full_warehouse', desc: 'All active SKUs across all facility bins' },
  { label: 'Location / Zone Specific Count', value: 'location_specific', desc: 'Count items within a designated rack or zone' },
  { label: 'SKU Specific Cycle Count', value: 'sku_specific', desc: 'Count selected product SKUs across all bins' },
  { label: 'High-Value ABC Class Audit', value: 'high_value_abc', desc: 'Audit top 20% highest valuation inventory' },
  { label: 'Random Sampling Audit', value: 'random_sample', desc: 'Statistically random 10% sample audit' },
];

export const CreateCountModal: React.FC<CreateCountModalProps> = ({ isOpen, warehouses, onClose, onSuccess }) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [name, setName] = useState('');
  const [countType, setCountType] = useState<StockCountType>('full_warehouse');
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [freezeMovements, setFreezeMovements] = useState(false);
  const [notes, setNotes] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [isOpen, warehouses]);

  useEffect(() => {
    if (warehouseId && countType === 'location_specific') {
      fetch(`/api/warehouses/${warehouseId}/locations`)
        .then((res) => res.json())
        .then((d) => {
          if (d.success) setLocations(d.data || []);
        });
    }
  }, [warehouseId, countType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      setError('Please select a target warehouse facility.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/warehouse-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          name: name.trim() || undefined,
          count_type: countType,
          count_date: countDate,
          freeze_movements: freezeMovements,
          notes: notes.trim() || undefined,
          location_ids: selectedLocationId ? [selectedLocationId] : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate stock count session.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Initiate Physical Stock Audit</h2>
              <p className="text-xs text-slate-500">Generate count worksheet with live snapshot baseline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target Facility <span className="text-rose-500">*</span>
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name} ({w.city || w.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Audit Session Title</label>
            <input
              type="text"
              placeholder="e.g. Q1 Perpetual Cycle Count - High Turnover SKUs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Audit Scope & Strategy</label>
            <div className="space-y-2">
              {COUNT_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    countType === t.value ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="countType"
                    checked={countType === t.value}
                    onChange={() => setCountType(t.value)}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{t.label}</div>
                    <div className="text-2xs text-slate-500">{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {countType === 'location_specific' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Specific Location / Zone</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              >
                <option value="">All Storage Bins</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name} ({loc.location_type})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Scheduled Audit Date</label>
              <input
                type="date"
                value={countDate}
                onChange={(e) => setCountDate(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={freezeMovements}
                  onChange={(e) => setFreezeMovements(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-medium text-slate-700">Freeze stock movements</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Instructions to Counting Operators</label>
            <textarea
              rows={2}
              placeholder="e.g. Scan serial barcodes twice for hydraulic valves; record unlabelled stock in salvage box."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Initializing...' : 'Generate Count Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
