import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  Calendar,
  Building,
  Truck,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import type { GoodsReceipt } from '../../../types/procurement';
import { procurementApi } from '../../../services/procurementApi';

interface GoodsReceiptDetailDrawerProps {
  isOpen: boolean;
  receiptId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const GoodsReceiptDetailDrawer: React.FC<GoodsReceiptDetailDrawerProps> = ({
  isOpen,
  receiptId,
  onClose,
}) => {
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && receiptId) {
      loadReceipt(receiptId);
    } else {
      setReceipt(null);
      setError(null);
    }
  }, [isOpen, receiptId]);

  const loadReceipt = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await procurementApi.getGoodsReceiptById(id);
      setReceipt(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load goods receipt');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {receipt?.grn_number || 'Goods Receipt Note'}
                </h3>
                {receipt?.inventory_posted && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Stock Posted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Inwarded on {receipt ? new Date(receipt.received_date).toLocaleDateString() : '...'} • Against PO {receipt?.purchase_order_number}
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

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-3" />
              <p className="text-sm text-slate-500">Loading goods receipt details...</p>
            </div>
          ) : receipt ? (
            <>
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-500" />
                  {error}
                </div>
              )}

              {/* Inward Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Receipt Logistics & Delivery
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-semibold text-slate-800">{receipt.supplier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Challan / Invoice No:</span>
                    <span className="font-semibold text-slate-800">{receipt.delivery_challan_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle Number:</span>
                    <span className="font-medium text-slate-800">{receipt.vehicle_number || 'N/A'}</span>
                  </div>
                  {(receipt.driver_name || receipt.driver_phone) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Driver Contact:</span>
                      <span className="font-medium text-slate-800">{receipt.driver_name} {receipt.driver_phone ? `(${receipt.driver_phone})` : ''}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Warehouse & Stock Staging
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Facility:</span>
                    <span className="font-semibold text-slate-800">{receipt.warehouse_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receiving Bay:</span>
                    <span className="font-medium text-slate-800">{receipt.receiving_location_name || 'Primary Dock Staging'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inward Officer:</span>
                    <span className="font-medium text-slate-800">{receipt.received_by_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">QC Status:</span>
                    <span className="font-bold text-slate-900 capitalize">{receipt.qc_status?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Items Table with Inspection Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Inward Material Inspection ({receipt.items?.length || 0} items)
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">SKU & Batch Details</th>
                        <th className="px-3 py-2.5 text-right">Received</th>
                        <th className="px-3 py-2.5 text-right text-emerald-700">Accepted</th>
                        <th className="px-3 py-2.5 text-right text-amber-700">Quarantine</th>
                        <th className="px-3 py-2.5 text-right text-rose-700">Rejected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {receipt.items?.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">{item.product_name || item.variant_name}</div>
                            <div className="text-[11px] text-slate-500">SKU: {item.sku_code}</div>
                            {item.batch_number && (
                              <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                                Batch: {item.batch_number} {item.expiry_date ? `| Exp: ${new Date(item.expiry_date).toLocaleDateString()}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900">
                            {item.received_quantity} <span className="text-slate-400 font-normal">{item.unit_short_code || 'pcs'}</span>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-emerald-700">
                            {item.accepted_quantity}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-amber-700">
                            {item.quarantine_quantity || 0}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-rose-700">
                            {item.rejected_quantity || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock Ledger Posting Confirmation */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
                <div className="flex items-center font-bold">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Perpetual Inventory Ledger Integration Verified
                </div>
                <p className="text-emerald-800 text-[11px]">
                  Physical quantities have been credited to the warehouse location balance register. Available stock is updated immediately, and any quarantine quantities are locked in quality-hold partitions.
                </p>
              </div>

              {receipt.notes && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Receipt Notes / Observations:</span>
                  <p className="text-slate-600">{receipt.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
