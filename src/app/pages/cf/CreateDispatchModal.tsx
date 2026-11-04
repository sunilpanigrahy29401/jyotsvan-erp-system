import React, { useState, useEffect } from 'react';
import { X, Send, Plus, Trash2, AlertCircle, Sparkles, Truck } from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFMaster, CFDispatch, CFStockItem } from '../../../types/cfs';

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dispatch: CFDispatch) => void;
  cfs: CFMaster[];
  defaultCfId?: string;
}

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cfs,
  defaultCfId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cfId, setCfId] = useState(defaultCfId || (cfs[0]?.id || ''));
  const [warehouseId, setWarehouseId] = useState('');
  const [availableDepotStock, setAvailableDepotStock] = useState<CFStockItem[]>([]);
  const [destinationType, setDestinationType] = useState('distributor');
  const [destinationName, setDestinationName] = useState('');
  const [destinationReference, setDestinationReference] = useState('');
  const [priority, setPriority] = useState('medium');
  const [shippingCarrier, setShippingCarrier] = useState('Local Express Transport');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Array<{
    sku_id: string;
    batch_id?: string;
    batch_number?: string;
    requested_quantity: number;
    unit_cost: number;
  }>>([
    { sku_id: '', batch_id: '', batch_number: '', requested_quantity: 50, unit_cost: 0 },
  ]);

  useEffect(() => {
    if (defaultCfId) setCfId(defaultCfId);
    else if (cfs.length > 0 && !cfId) setCfId(cfs[0].id);
  }, [defaultCfId, cfs]);

  // Load depot stock whenever selected C&F changes
  useEffect(() => {
    async function loadStock() {
      if (!cfId) return;
      try {
        const stock = await cfApi.getDepotInventory({ cfId });
        setAvailableDepotStock(stock);
        if (stock.length > 0) {
          setWarehouseId(stock[0].warehouse_id);
          if (items[0]?.sku_id === '') {
            setItems([{
              sku_id: stock[0].sku_id,
              batch_id: stock[0].batch_id || '',
              batch_number: stock[0].batch_number || '',
              requested_quantity: Math.min(50, stock[0].available_quantity || 50),
              unit_cost: stock[0].unit_cost,
            }]);
          }
        }
      } catch (e) {
        console.warn('Failed to load depot stock:', e);
      }
    }

    if (isOpen) {
      loadStock();
    }
  }, [isOpen, cfId]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultStock = availableDepotStock[0];
    setItems([
      ...items,
      {
        sku_id: defaultStock?.sku_id || '',
        batch_id: defaultStock?.batch_id || '',
        batch_number: defaultStock?.batch_number || '',
        requested_quantity: 25,
        unit_cost: defaultStock?.unit_cost || 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleStockSelection = (index: number, stockItemSkuId: string) => {
    const stockItem = availableDepotStock.find(s => s.sku_id === stockItemSkuId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      sku_id: stockItemSkuId,
      batch_id: stockItem?.batch_id || '',
      batch_number: stockItem?.batch_number || '',
      unit_cost: stockItem?.unit_cost || 0,
      requested_quantity: Math.min(updated[index].requested_quantity || 25, stockItem?.available_quantity || 100),
    };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfId || !destinationName) {
      setError('Please provide destination entity name and verify C&F selection');
      return;
    }

    if (items.some(i => !i.sku_id || i.requested_quantity <= 0)) {
      setError('Please ensure each line item has a valid SKU and positive dispatch quantity');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        cf_id: cfId,
        warehouse_id: warehouseId || (availableDepotStock[0]?.warehouse_id || 'wh-central-01'),
        destination_type: destinationType,
        destination_name: destinationName,
        destination_reference: destinationReference || undefined,
        priority: priority,
        shipping_carrier: shippingCarrier,
        vehicle_number: vehicleNumber,
        driver_name: driverName,
        driver_phone: driverPhone,
        notes: notes,
        items: items.map(i => ({
          sku_id: i.sku_id,
          batch_id: i.batch_id || undefined,
          batch_number: i.batch_number || undefined,
          requested_quantity: Number(i.requested_quantity),
          unit_cost: Number(i.unit_cost || 0),
        })),
      };

      const dispatch = await cfApi.createDispatch(payload);
      onSuccess(dispatch);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create C&F dispatch order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 border border-neutral-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Create C&F Outbound Dispatch Order</h3>
              <p className="text-xs text-neutral-500">Pick depot stock and dispatch to authorized distributor/retailer channels</p>
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
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Fulfilling C&F Depot <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={cfId}
                onChange={(e) => setCfId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              >
                {cfs.map(cf => (
                  <option key={cf.id} value={cf.id}>
                    {cf.legal_name} ({cf.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Channel Destination Type
              </label>
              <select
                value={destinationType}
                onChange={(e) => setDestinationType(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              >
                <option value="distributor">Primary Stockist / Distributor</option>
                <option value="retailer">Direct Key Account / Retailer</option>
                <option value="inter_depot">Inter-Depot Redistribution</option>
                <option value="return_to_plant">Factory Return / RMA</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Destination Entity Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mahavir Distributors (Pune)"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Destination PO / Order Reference
              </label>
              <input
                type="text"
                placeholder="e.g. DIST-PO-88192"
                value={destinationReference}
                onChange={(e) => setDestinationReference(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Carrier & Truck Number
              </label>
              <input
                type="text"
                placeholder="e.g. MH-12-AB-3341"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Driver Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98221 00291"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="pt-4 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-neutral-900">
                  Pick Batches (FEFO Recommended)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8">
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">Depot Batch Lot & Expiry Status</label>
                    <select
                      required
                      value={item.sku_id}
                      onChange={(e) => handleStockSelection(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                    >
                      {availableDepotStock.map(s => (
                        <option key={`${s.sku_id}-${s.batch_id}`} value={s.sku_id}>
                          {s.sku_code} - {s.sku_name} (Batch: {s.batch_number || 'Default'} &bull; Available: {s.available_quantity} {s.unit_short_code || 'units'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">Dispatch Units</label>
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
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-semibold focus:ring-1 focus:ring-amber-500 outline-none"
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
              ))}
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
            className="px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span>Creating Order...</span>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>Submit Dispatch Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
