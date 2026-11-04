import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, AlertCircle } from 'lucide-react';
import { LocationType } from '../../../types/warehouse';

interface CreateLocationModalProps {
  isOpen: boolean;
  warehouseId: string;
  parentLocationId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const LOCATION_TYPES: { label: string; value: LocationType }[] = [
  { label: 'Standard Storage Rack/Bin', value: 'storage' },
  { label: 'Receiving Dock & Inspection', value: 'receiving' },
  { label: 'Picking & Wave Consolidation', value: 'picking' },
  { label: 'Packing & Crating Line', value: 'packing' },
  { label: 'Outbound Dispatch Dock', value: 'dispatch' },
  { label: 'Quality Quarantine Enclosure', value: 'quarantine' },
  { label: 'Damaged & Returns Hold', value: 'damaged' },
  { label: 'WIP Production Buffer', value: 'wip' },
  { label: 'Transit Staging Area', value: 'transit' },
];

export const CreateLocationModal: React.FC<CreateLocationModalProps> = ({
  isOpen,
  warehouseId,
  parentLocationId = null,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('storage');
  const [zoneCode, setZoneCode] = useState('');
  const [aisleCode, setAisleCode] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [shelfCode, setShelfCode] = useState('');
  const [binCode, setBinCode] = useState('');
  const [capacityQuantity, setCapacityQuantity] = useState('1000');
  const [capacityUnit, setCapacityUnit] = useState('pcs');
  const [capacityWeight, setCapacityWeight] = useState('');
  const [capacityVolume, setCapacityVolume] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setName('');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Location code is required (e.g. BIN-A1-01).');
      return;
    }
    if (!name.trim()) {
      setError('Location name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_location_id: parentLocationId || null,
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim(),
          location_type: locationType,
          zone_code: zoneCode.trim() || null,
          aisle_code: aisleCode.trim() || null,
          rack_code: rackCode.trim() || null,
          shelf_code: shelfCode.trim() || null,
          bin_code: binCode.trim() || null,
          capacity_quantity: capacityQuantity ? parseFloat(capacityQuantity) : null,
          capacity_unit: capacityUnit,
          capacity_weight: capacityWeight ? parseFloat(capacityWeight) : null,
          capacity_volume: capacityVolume ? parseFloat(capacityVolume) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create warehouse location.');
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
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Define Warehouse Location / Bin</h2>
              <p className="text-xs text-slate-500">
                {parentLocationId ? `Adding sub-location under parent node` : `Adding top-level Zone or Dock`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Location Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. RACK-A1 or BIN-01A"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-sm font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rack A1 (Ground Pallet Slot)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Location Functional Role</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as LocationType)}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Physical Coordinates (Optional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <span className="text-2xs text-slate-500">Zone</span>
                <input
                  type="text"
                  placeholder="ZONE-A"
                  value={zoneCode}
                  onChange={(e) => setZoneCode(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <span className="text-2xs text-slate-500">Aisle</span>
                <input
                  type="text"
                  placeholder="AISLE-01"
                  value={aisleCode}
                  onChange={(e) => setAisleCode(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <span className="text-2xs text-slate-500">Rack</span>
                <input
                  type="text"
                  placeholder="RACK-A"
                  value={rackCode}
                  onChange={(e) => setRackCode(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <span className="text-2xs text-slate-500">Bin</span>
                <input
                  type="text"
                  placeholder="BIN-01"
                  value={binCode}
                  onChange={(e) => setBinCode(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Capacity (Quantity)</label>
              <input
                type="number"
                placeholder="1000"
                value={capacityQuantity}
                onChange={(e) => setCapacityQuantity(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Weight Limit (kg)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={capacityWeight}
                onChange={(e) => setCapacityWeight(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-700 mb-1">Description / Handling Instructions</label>
            <textarea
              rows={2}
              placeholder="e.g. Ground level pallet slot for high-turnover hydraulic valves"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
