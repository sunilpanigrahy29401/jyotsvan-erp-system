import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Plus, Trash2, AlertCircle, Package, Truck, Layers } from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFMaster, CFTransfer } from '../../../types/cfs';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transfer: CFTransfer) => void;
  cfs: CFMaster[];
  defaultCfId?: string;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cfs,
  defaultCfId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableSkus, setAvailableSkus] = useState<any[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [availableWarehouses, setAvailableWarehouses] = useState<any[]>([]);

  const [cfId, setCfId] = useState(defaultCfId || (cfs[0]?.id || ''));
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [transferType, setTransferType] = useState('primary_allocation');
  const [priority, setPriority] = useState('medium');
  const [shippingCarrier, setShippingCarrier] = useState('VRL Logistics Express');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Array<{
    sku_id: string;
    batch_id?: string;
    batch_number?: string;
    requested_quantity: number;
    unit_cost: number;
  }>>([
    { sku_id: '', batch_id: '', batch_number: '', requested_quantity: 100, unit_cost: 0 },
  ]);

  useEffect(() => {
    if (defaultCfId) setCfId(defaultCfId);
    else if (cfs.length > 0 && !cfId) setCfId(cfs[0].id);
  }, [defaultCfId, cfs]);

  // Load SKUs, Batches & Warehouses
  useEffect(() => {
    async function loadPrerequisites() {
      try {
        const [skusRes, batchesRes, whRes] = await Promise.all([
          fetch('/api/skus', { headers: { 'x-organization-id': 'org-jyotsvan-corp' } }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/api/batches', { headers: { 'x-organization-id': 'org-jyotsvan-corp' } }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/api/warehouses', { headers: { 'x-organization-id': 'org-jyotsvan-corp' } }).then(r => r.json()).catch(() => ({ data: [] })),
        ]);

        const skusList = skusRes.data || skusRes.rows || [];
        const batchesList = batchesRes.data || batchesRes.rows || [];
        const whList = whRes.data || whRes.rows || [];

        setAvailableSkus(skusList);
        setAvailableBatches(batchesList);
        setAvailableWarehouses(whList);

        if (whList.length > 0) {
          setSourceWarehouseId(whList[0].id);
          setDestinationWarehouseId(whList[1]?.id || whList[0].id);
        }

        if (skusList.length > 0 && items[0]?.sku_id === '') {
          setItems([{
            sku_id: skusList[0].id,
            batch_id: batchesList[0]?.id || '',
            batch_number: batchesList[0]?.batch_number || '',
            requested_quantity: 100,
            unit_cost: Number(skusList[0].standard_cost || 500),
          }]);
        }
      } catch (e) {
        console.warn('Failed to load prerequisites:', e);
      }
    }

    if (isOpen) {
      loadPrerequisites();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultSku = availableSkus[0];
    setItems([
      ...items,
      {
        sku_id: defaultSku?.id || '',
        batch_id: '',
        batch_number: '',
        requested_quantity: 50,
        unit_cost: Number(defaultSku?.standard_cost || 0),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemSkuChange = (index: number, skuId: string) => {
    const sku = availableSkus.find(s => s.id === skuId);
    const relatedBatch = availableBatches.find(b => b.sku_id === skuId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      sku_id: skuId,
      batch_id: relatedBatch?.id || '',
      batch_number: relatedBatch?.batch_number || '',
      unit_cost: Number(sku?.standard_cost || 0),
    };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfId || !sourceWarehouseId || !destinationWarehouseId) {
      setError('Please select C&F Partner, Source Plant Warehouse, and Destination Depot Warehouse');
      return;
    }

    if (items.some(i => !i.sku_id || i.requested_quantity <= 0)) {
      setError('Please ensure each line item has a valid SKU and positive requested quantity');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        cf_id: cfId,
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destinationWarehouseId,
        transfer_type: transferType,
        priority: priority,
        shipping_carrier: shippingCarrier,
        vehicle_number: vehicleNumber,
        expected_delivery_date: expectedDeliveryDate || undefined,
        notes: notes,
        items: items.map(i => ({
          sku_id: i.sku_id,
          batch_id: i.batch_id || undefined,
          batch_number: i.batch_number || undefined,
          requested_quantity: Number(i.requested_quantity),
          unit_cost: Number(i.unit_cost || 0),
        })),
      };

      const transfer = await cfApi.createTransfer(payload);
      onSuccess(transfer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize C&F stock transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 border border-neutral-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Create Stock Transfer to C&F Depot</h3>
              <p className="text-xs text-neutral-500">Initiate primary plant-to-depot replenishment with batch traceability</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Header Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Target C&F Agency <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={cfId}
                onChange={(e) => setCfId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {cfs.map(cf => (
                  <option key={cf.id} value={cf.id}>
                    {cf.legal_name} ({cf.cf_code} - {cf.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Source Plant Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {availableWarehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Destination C&F Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {availableWarehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Transfer Type
              </label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="primary_allocation">Primary Stock Allocation</option>
                <option value="replenishment">Regional Replenishment</option>
                <option value="consignment">Consignment Stock</option>
                <option value="inter_depot">Inter-Depot Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Dispatch Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="low">Standard / Low</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent / Critical Stockout</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Expected Inward Arrival Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Logistics Carrier
              </label>
              <input
                type="text"
                placeholder="e.g. VRL Logistics / Safexpress"
                value={shippingCarrier}
                onChange={(e) => setShippingCarrier(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Assigned Truck / Trailer Number
              </label>
              <input
                type="text"
                placeholder="e.g. MH-04-GP-9912"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Operational Dispatch Notes
              </label>
              <input
                type="text"
                placeholder="Transit temperature / handling notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="pt-4 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-neutral-900">Transfer SKU & Batch Line Items</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add SKU Line</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const filteredBatches = availableBatches.filter(b => b.sku_id === item.sku_id);
                return (
                  <div key={idx} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Product SKU</label>
                      <select
                        required
                        value={item.sku_id}
                        onChange={(e) => handleItemSkuChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {availableSkus.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.sku_code} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Assigned Batch Lot</label>
                      <select
                        value={item.batch_id || ''}
                        onChange={(e) => {
                          const bId = e.target.value;
                          const bObj = availableBatches.find(b => b.id === bId);
                          const updated = [...items];
                          updated[idx] = {
                            ...updated[idx],
                            batch_id: bId,
                            batch_number: bObj?.batch_number || '',
                          };
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="">-- Auto-Allocate Batch --</option>
                        {filteredBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batch_number} (Qty: {b.current_quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Requested Qty</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.requested_quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].requested_quantity = Number(e.target.value);
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-1 flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                        title="Remove Line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span>Initiating Order...</span>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>Submit Transfer Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
