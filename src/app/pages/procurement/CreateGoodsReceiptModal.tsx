import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  Building,
  Truck,
  AlertCircle,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { procurementApi } from '../../../services/procurementApi';
import type { PurchaseOrder } from '../../../types/procurement';

interface CreateGoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetOrder?: PurchaseOrder | null;
}

interface GrnItemInput {
  purchaseOrderItemId: string;
  skuId: string;
  skuCode: string;
  productName: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  pendingQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  quarantineQty: number;
  batchNumber: string;
  expiryDate: string;
  requiresQc: boolean;
  notes: string;
}

export const CreateGoodsReceiptModal: React.FC<CreateGoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetOrder,
}) => {
  const [openOrders, setOpenOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryChallanNumber, setDeliveryChallanNumber] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<GrnItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOpenOrders();
    }
  }, [isOpen, targetOrder]);

  const loadOpenOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      if (targetOrder) {
        // Fetch fresh details with line items
        const fullPo = await procurementApi.getPurchaseOrderById(targetOrder.id);
        setSelectedPo(fullPo);
        setSelectedOrderId(fullPo.id);
        populateItems(fullPo);
      } else {
        const data = await procurementApi.getPurchaseOrders({ limit: 50 });
        const eligible = data.orders.filter(
          (o) => o.status === 'sent' || o.status === 'acknowledged' || o.status === 'partially_received' || o.status === 'approved'
        );
        setOpenOrders(eligible);
        if (eligible.length > 0) {
          const first = await procurementApi.getPurchaseOrderById(eligible[0].id);
          setSelectedPo(first);
          setSelectedOrderId(first.id);
          populateItems(first);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase orders for goods receipt');
    } finally {
      setLoading(false);
    }
  };

  const populateItems = (po: PurchaseOrder) => {
    if (!po.items) return;
    const itemRows: GrnItemInput[] = po.items.map((it) => {
      const pending = Math.max(0, it.quantity - (it.received_quantity || 0) - (it.cancelled_quantity || 0));
      return {
        purchaseOrderItemId: it.id,
        skuId: it.sku_id,
        skuCode: it.sku_code || 'SKU',
        productName: it.product_name || it.variant_name || 'Material Item',
        orderedQty: it.quantity,
        previouslyReceivedQty: it.received_quantity || 0,
        pendingQty: pending,
        receivedQty: pending,
        acceptedQty: pending,
        rejectedQty: 0,
        quarantineQty: 0,
        batchNumber: `BATCH-${Date.now().toString(36).toUpperCase().slice(-4)}`,
        expiryDate: '',
        requiresQc: false,
        notes: '',
      };
    });
    setItems(itemRows);
  };

  const handleOrderSelect = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoading(true);
    try {
      const fullPo = await procurementApi.getPurchaseOrderById(orderId);
      setSelectedPo(fullPo);
      populateItems(fullPo);
    } catch (err: any) {
      setError(err.message || 'Failed to load PO details');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (idx: number, field: keyof GrnItemInput, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };

    // Auto balance acceptedQty when receivedQty changes
    if (field === 'receivedQty') {
      const rQty = Number(val) || 0;
      updated[idx].acceptedQty = Math.max(0, rQty - updated[idx].rejectedQty - updated[idx].quarantineQty);
    }

    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPo) {
      setError('Please select a purchase order.');
      return;
    }

    const validItems = items.filter((it) => it.receivedQty > 0);
    if (validItems.length === 0) {
      setError('Please specify a received quantity greater than 0 for at least one item.');
      return;
    }

    for (const it of validItems) {
      const totalAlloc = Number(it.acceptedQty || 0) + Number(it.rejectedQty || 0) + Number(it.quarantineQty || 0);
      if (totalAlloc !== Number(it.receivedQty)) {
        setError(`Item ${it.skuCode}: Sum of Accepted (${it.acceptedQty}) + Rejected (${it.rejectedQty}) + Quarantine (${it.quarantineQty}) must equal Received Qty (${it.receivedQty}).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await procurementApi.createGoodsReceipt({
        purchaseOrderId: selectedPo.id,
        warehouseId: selectedPo.warehouse_id,
        receivedDate,
        supplierReference: supplierReference.trim() || undefined,
        deliveryChallanNumber: deliveryChallanNumber.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: validItems.map((it) => ({
          purchaseOrderItemId: it.purchaseOrderItemId,
          skuId: it.skuId,
          orderedQuantity: it.orderedQty,
          receivedQuantity: Number(it.receivedQty),
          acceptedQuantity: Number(it.acceptedQty),
          rejectedQuantity: Number(it.rejectedQty),
          quarantineQuantity: Number(it.quarantineQty),
          batchNumber: it.batchNumber.trim() || undefined,
          expiryDate: it.expiryDate || undefined,
          requiresQc: Boolean(it.quarantineQty > 0 || it.requiresQc),
          notes: it.notes.trim() || undefined,
        })),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create goods receipt and post stock balances');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Inward Goods Receipt Note (GRN)</h3>
              <p className="text-xs text-slate-500">
                Receive materials at warehouse dock & post stock to inventory registers
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-500" />
              {error}
            </div>
          )}

          {/* Order Selection and Receiving Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Active Purchase Order <span className="text-rose-500">*</span>
              </label>
              {targetOrder ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
                  {targetOrder.po_number} — {targetOrder.supplier_name}
                </div>
              ) : (
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  {openOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.po_number} ({o.supplier_name}) — Status: {o.status}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inward Receiving Date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          {/* Logistics & Gate In Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor Challan / Invoice #
              </label>
              <input
                type="text"
                placeholder="e.g., DC-98412"
                value={deliveryChallanNumber}
                onChange={(e) => setDeliveryChallanNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle / Truck #
              </label>
              <input
                type="text"
                placeholder="e.g., MH-12-AB-3456"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Driver Name
              </label>
              <input
                type="text"
                placeholder="Driver name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Driver Phone
              </label>
              <input
                type="text"
                placeholder="Driver phone"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          </div>

          {/* Inward Items Quality & Quantity Verification */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Verify Inward Items & Quality Splits
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 w-3/12">Item / SKU</th>
                    <th className="px-2 py-2 w-1/12 text-right">Pending</th>
                    <th className="px-2 py-2 w-1.5/12 text-right font-bold">Received</th>
                    <th className="px-2 py-2 w-1.5/12 text-right text-emerald-700">Accepted</th>
                    <th className="px-2 py-2 w-1.5/12 text-right text-amber-700">Quarantine</th>
                    <th className="px-2 py-2 w-1.5/12 text-right text-rose-700">Rejected</th>
                    <th className="px-3 py-2 w-2/12">Batch #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={it.purchaseOrderItemId || idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">{it.productName}</div>
                        <div className="text-[11px] text-slate-400">SKU: {it.skuCode}</div>
                      </td>

                      <td className="px-2 py-2.5 text-right font-medium text-slate-500">
                        {it.pendingQty} / {it.orderedQty}
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          max={it.pendingQty}
                          value={it.receivedQty}
                          onChange={(e) => handleItemChange(idx, 'receivedQty', parseInt(e.target.value, 10) || 0)}
                          className="w-16 text-xs p-1 text-right bg-white border border-slate-300 rounded font-bold text-slate-900"
                        />
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={it.acceptedQty}
                          onChange={(e) => handleItemChange(idx, 'acceptedQty', parseInt(e.target.value, 10) || 0)}
                          className="w-16 text-xs p-1 text-right bg-white border border-emerald-300 text-emerald-800 rounded font-bold"
                        />
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={it.quarantineQty}
                          onChange={(e) => handleItemChange(idx, 'quarantineQty', parseInt(e.target.value, 10) || 0)}
                          className="w-14 text-xs p-1 text-right bg-white border border-amber-300 text-amber-800 rounded font-medium"
                        />
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={it.rejectedQty}
                          onChange={(e) => handleItemChange(idx, 'rejectedQty', parseInt(e.target.value, 10) || 0)}
                          className="w-14 text-xs p-1 text-right bg-white border border-rose-300 text-rose-800 rounded font-medium"
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={it.batchNumber}
                          onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                          placeholder="Batch / Lot #"
                          className="w-full text-xs p-1 bg-white border border-slate-200 rounded text-slate-800"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dock Notes & Inward Verification Summary
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Package conditions, seal numbers, damage notes if any..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Destination: <span className="font-semibold text-slate-800">{selectedPo?.warehouse_name || 'Warehouse'}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center"
            >
              <PackageCheck className="w-4 h-4 mr-1.5" />
              {submitting ? 'Posting Inward Stock...' : 'Confirm Goods Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
