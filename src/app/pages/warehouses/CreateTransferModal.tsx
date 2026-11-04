import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  Plus,
  Trash2,
  Building2,
  Truck,
  Calendar,
  AlertCircle,
  Boxes,
  Layers,
} from 'lucide-react';
import { WarehouseMaster, StockTransferType } from '../../../types/warehouse';

interface CreateTransferModalProps {
  isOpen: boolean;
  warehouses: WarehouseMaster[];
  onClose: () => void;
  onSuccess: () => void;
}

interface TransferItemRow {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  available_qty: number;
  quantity: number;
  unit_of_measure: string;
  batch_number: string;
  source_location_id: string;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  warehouses,
  onClose,
  onSuccess,
}) => {
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [transferType, setTransferType] = useState<StockTransferType>('replenishment');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  // Available SKUs at source warehouse
  const [availableSkus, setAvailableSkus] = useState<any[]>([]);
  const [sourceLocations, setSourceLocations] = useState<any[]>([]);
  const [items, setItems] = useState<TransferItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && warehouses.length >= 2) {
      if (!sourceWarehouseId) setSourceWarehouseId(warehouses[0].id);
      if (!destinationWarehouseId) setDestinationWarehouseId(warehouses[1].id);
    }
  }, [isOpen, warehouses]);

  useEffect(() => {
    if (sourceWarehouseId) {
      loadSourceInventory(sourceWarehouseId);
    }
  }, [sourceWarehouseId]);

  const loadSourceInventory = async (whId: string) => {
    try {
      const [stockRes, locRes] = await Promise.all([
        fetch(`/api/inventory/balances?warehouse_id=${whId}&limit=200`),
        fetch(`/api/warehouses/${whId}/locations`),
      ]);
      const stockData = await stockRes.json();
      const locData = await locRes.json();

      if (stockData.success) {
        setAvailableSkus(stockData.balances || []);
      }
      if (locData.success) {
        setSourceLocations(locData.data || []);
      }
    } catch (err) {
      console.error('[Load Source Stock Error]', err);
    }
  };

  const addItemRow = () => {
    if (availableSkus.length === 0) {
      setError('No available stock items found at source warehouse to transfer.');
      return;
    }
    const firstSku = availableSkus[0];
    setItems([
      ...items,
      {
        sku_id: firstSku.sku_id,
        sku_code: firstSku.sku_code,
        sku_name: firstSku.product_name || firstSku.sku_name || '',
        available_qty: Number(firstSku.available_quantity) || 0,
        quantity: 1,
        unit_of_measure: firstSku.unit_of_measure || 'pcs',
        batch_number: '',
        source_location_id: firstSku.location_id || '',
      },
    ]);
  };

  const updateItemRow = (index: number, field: keyof TransferItemRow, value: any) => {
    const updated = [...items];
    if (field === 'sku_id') {
      const selected = availableSkus.find((s) => s.sku_id === value);
      if (selected) {
        updated[index] = {
          ...updated[index],
          sku_id: selected.sku_id,
          sku_code: selected.sku_code,
          sku_name: selected.product_name || selected.sku_name || '',
          available_qty: Number(selected.available_quantity) || 0,
          quantity: 1,
          unit_of_measure: selected.unit_of_measure || 'pcs',
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWarehouseId || !destinationWarehouseId) {
      setError('Source and destination warehouses are required.');
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      setError('Source and destination warehouses must be different.');
      return;
    }
    if (items.length === 0) {
      setError('At least one item line must be added to the transfer order.');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setError(`Please specify a valid quantity for SKU ${item.sku_code}.`);
        return;
      }
      if (item.available_qty > 0 && item.quantity > item.available_qty) {
        setError(`Quantity for ${item.sku_code} exceeds available stock (${item.available_qty}).`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/warehouse-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_warehouse_id: sourceWarehouseId,
          destination_warehouse_id: destinationWarehouseId,
          transfer_type: transferType,
          shipping_carrier: shippingCarrier.trim() || null,
          tracking_number: trackingNumber.trim() || null,
          vehicle_number: vehicleNumber.trim() || null,
          driver_name: driverName.trim() || null,
          expected_delivery_date: expectedDeliveryDate || null,
          notes: notes.trim() || null,
          items: items.map((it) => ({
            sku_id: it.sku_id,
            source_location_id: it.source_location_id || null,
            requested_quantity: it.quantity,
            batch_number: it.batch_number || null,
            notes: null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create Stock Transfer Order.');
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
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Stock Transfer Order (STO)</h2>
              <p className="text-xs text-slate-500">Atomic inter-warehouse movement with ledger verification</p>
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
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Warehouse Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Source Dispatch Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => {
                  setSourceWarehouseId(e.target.value);
                  setItems([]);
                }}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name} ({w.city || w.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Destination Receiving Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === sourceWarehouseId}>
                    {w.code} - {w.name} ({w.city || w.country}) {w.id === sourceWarehouseId ? '(Source)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer Line Items */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfer Line Items</h3>
                <p className="text-2xs text-slate-400">Specify SKUs, dispatch lots and quantities</p>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Click <strong>"Add Item Line"</strong> to select SKUs from source warehouse stock.
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((row, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="block text-2xs text-slate-500 mb-0.5">SKU Product</label>
                      <select
                        value={row.sku_id}
                        onChange={(e) => updateItemRow(idx, 'sku_id', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-medium"
                      >
                        {availableSkus.map((s) => (
                          <option key={s.sku_id} value={s.sku_id}>
                            {s.sku_code} - {s.product_name || s.sku_name} (Avail: {s.available_quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-2xs text-slate-500 mb-0.5">Avail Stock</label>
                      <span className="text-xs font-bold text-slate-700 block py-1.5">{row.available_qty}</span>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-2xs text-slate-500 mb-0.5">Transfer Qty *</label>
                      <input
                        type="number"
                        min="1"
                        max={row.available_qty || undefined}
                        value={row.quantity}
                        onChange={(e) => updateItemRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-emerald-700"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-2xs text-slate-500 mb-0.5">Batch #</label>
                      <input
                        type="text"
                        placeholder="LOT-2026-A"
                        value={row.batch_number}
                        onChange={(e) => updateItemRow(idx, 'batch_number', e.target.value)}
                        className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logistics & Transit Info */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Logistics & Carrier Details (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Shipping Carrier</label>
                <input
                  type="text"
                  placeholder="e.g. BlueDart / TCI Freight"
                  value={shippingCarrier}
                  onChange={(e) => setShippingCarrier(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Waybill / Tracking #</label>
                <input
                  type="text"
                  placeholder="e.g. TRK-98721345"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle / Truck Plate #</label>
                <input
                  type="text"
                  placeholder="e.g. MH-04-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Driver Name & Contact</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Kumar (+91 98765...)"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Estimated Arrival Date</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
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
              disabled={loading || items.length === 0}
              className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Creating Transfer Order...' : 'Generate Transfer Order (STO)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
