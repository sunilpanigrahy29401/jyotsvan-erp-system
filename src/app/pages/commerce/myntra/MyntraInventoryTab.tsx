// src/app/pages/commerce/myntra/MyntraInventoryTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Archive,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';

export function MyntraInventoryTab() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSku, setSavingSku] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { available: number; buffer: number }>>({});

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await myntraApi.getInventory();
      setInventory(data);
      const initial: Record<string, { available: number; buffer: number }> = {};
      data.forEach((item) => {
        initial[item.seller_sku] = {
          available: item.quantity_available,
          buffer: item.safety_buffer,
        };
      });
      setEditValues(initial);
    } catch (err) {
      console.error('Failed to load Myntra inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleSave = async (sellerSku: string) => {
    const vals = editValues[sellerSku];
    if (!vals) return;
    try {
      setSavingSku(sellerSku);
      await myntraApi.updateInventoryBuffer(sellerSku, vals.available, vals.buffer);
      await loadInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to update buffer');
    } finally {
      setSavingSku(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Informational Banner */}
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-start space-x-3">
        <Shield className="w-5 h-5 text-pink-600 mt-0.5 shrink-0" />
        <div className="text-xs text-pink-900">
          <span className="font-bold">Myntra Safety Buffer Protection Active:</span> Safety buffer quantities are held in reserve to safeguard your seller score and prevent out-of-stock cancellation penalties during flash sales.
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading stock & buffers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Style / SKU</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Store Location</th>
                  <th className="py-3 px-4 font-semibold text-center">Available Stock</th>
                  <th className="py-3 px-4 font-semibold text-center">Safety Buffer Hold</th>
                  <th className="py-3 px-4 font-semibold text-center">Total Physical Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((row) => {
                  const vals = editValues[row.seller_sku] || {
                    available: row.quantity_available,
                    buffer: row.safety_buffer,
                  };
                  const isSaving = savingSku === row.seller_sku;
                  const total = vals.available + vals.buffer;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">{row.title}</div>
                        <div className="text-[11px] text-slate-400">SKU: {row.seller_sku}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{row.category}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]">
                          {row.location_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          value={vals.available}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              [row.seller_sku]: {
                                ...vals,
                                available: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="w-20 px-2 py-1 text-center font-bold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-pink-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          value={vals.buffer}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              [row.seller_sku]: {
                                ...vals,
                                buffer: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="w-20 px-2 py-1 text-center font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-200 rounded focus:ring-1 focus:ring-pink-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {total}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleSave(row.seller_sku)}
                          disabled={isSaving}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          {isSaving ? 'Updating...' : 'Save'}
                        </button>
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
