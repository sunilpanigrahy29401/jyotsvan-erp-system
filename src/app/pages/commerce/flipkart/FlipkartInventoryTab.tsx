// src/app/pages/commerce/flipkart/FlipkartInventoryTab.tsx
// Phase 32: Flipkart Multi-Location Inventory Management Tab

import React, { useState, useEffect } from 'react';
import {
  Archive,
  RefreshCw,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Building,
  Truck,
} from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';
import type { FlipkartInventory } from '../../../../types/flipkart.ts';

export function FlipkartInventoryTab() {
  const [inventory, setInventory] = useState<FlipkartInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await flipkartApi.getInventory();
      setInventory(res.inventory || []);
    } catch (err) {
      console.error('Error fetching Flipkart inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStartEdit = (inv: FlipkartInventory) => {
    setEditingSku(`${inv.seller_sku}_${inv.fulfillment_channel}`);
    setEditQty(inv.quantity_available);
  };

  const handleSaveStock = async (inv: FlipkartInventory) => {
    setUpdating(true);
    try {
      await flipkartApi.updateInventoryStock(inv.seller_sku, inv.fulfillment_channel, editQty);
      setEditingSku(null);
      await fetchInventory();
    } catch (err) {
      alert('Failed to update inventory level');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Multi-Location Flipkart Stock Balances</h3>
          <p className="text-xs text-slate-500">
            Real-time stock synchronization between Jyotsvan Central Hub, Flipkart Smart (FBF), and Direct Dispatch
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"
          title="Refresh stock"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            Loading stock records...
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No inventory records</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Flipkart SKU / FSN</th>
                  <th className="py-3 px-4">Fulfillment Mode</th>
                  <th className="py-3 px-4">Warehouse Location</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4 text-right">Reserved (Orders)</th>
                  <th className="py-3 px-4 text-right">Inbound Transit</th>
                  <th className="py-3 px-4 text-right">Total Units</th>
                  <th className="py-3 px-4 text-center">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {inventory.map((inv) => {
                  const isEditing = editingSku === `${inv.seller_sku}_${inv.fulfillment_channel}`;
                  const isSmart = inv.fulfillment_channel === 'FLIPKART_SMART';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900">{inv.seller_sku}</div>
                        <div className="text-[11px] text-slate-400">FSN: {inv.asin}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isSmart
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Truck className="w-3 h-3" />
                          <span>{isSmart ? 'Flipkart Smart (FBF)' : 'Seller Fulfilled'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{inv.location_id || 'LOC_BLR_01'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-20 px-2 py-1 border border-blue-500 rounded text-right text-xs font-mono focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`font-mono font-bold text-sm ${
                              inv.quantity_available <= 20 ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {inv.quantity_available}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {inv.quantity_reserved}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-600 font-semibold">
                        +{inv.quantity_inbound}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {inv.quantity_total}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleSaveStock(inv)}
                              disabled={updating}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSku(null)}
                              className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(inv)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
                          >
                            <Edit2 className="w-3 h-3 text-slate-400" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
