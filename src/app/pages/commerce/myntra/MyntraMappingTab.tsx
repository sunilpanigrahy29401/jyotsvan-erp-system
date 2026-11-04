// src/app/pages/commerce/myntra/MyntraMappingTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Link2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  Search,
} from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';
import type { MarketplaceEntityMapping } from '../../../../types/marketplace.ts';

export function MyntraMappingTab() {
  const [mappings, setMappings] = useState<MarketplaceEntityMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedMappings, setEditedMappings] = useState<Record<string, { sku: string; status: string }>>({});

  const loadMappings = async () => {
    try {
      setLoading(true);
      const data = await myntraApi.getMappings();
      setMappings(data);
      const initial: Record<string, { sku: string; status: string }> = {};
      data.forEach((m) => {
        initial[m.id] = {
          sku: m.jyotsvan_sku || '',
          status: m.mapping_status,
        };
      });
      setEditedMappings(initial);
    } catch (err) {
      console.error('Failed to load Myntra SKU mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const handleAutoMatch = async () => {
    try {
      setIsMatching(true);
      const res = await myntraApi.autoMatchSkus();
      alert(`Auto-match complete: matched ${res.matched} SKUs.`);
      await loadMappings();
    } catch (err: any) {
      alert(err.message || 'Auto-match failed');
    } finally {
      setIsMatching(false);
    }
  };

  const handleSave = async (id: string) => {
    const edit = editedMappings[id];
    if (!edit) return;
    try {
      await myntraApi.saveMapping(id, edit.sku, edit.status);
      await loadMappings();
    } catch (err: any) {
      alert(err.message || 'Failed to save mapping');
    }
  };

  const filtered = mappings.filter((m) =>
    m.marketplace_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.marketplace_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.jyotsvan_sku || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Myntra SKU Mapping Workbench</h2>
          <p className="text-xs text-slate-500">
            Map Myntra external style catalog items to canonical Jyotsvan ERP product SKUs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoMatch}
            disabled={isMatching}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-pink-700 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-pink-600" />
            {isMatching ? 'Matching...' : 'Auto-Match SKUs'}
          </button>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              placeholder="Search SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading SKU mappings...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Myntra Style & Title</th>
                  <th className="py-3 px-4 font-semibold">Myntra Partner SKU</th>
                  <th className="py-3 px-4 font-semibold">Canonical ERP SKU</th>
                  <th className="py-3 px-4 font-semibold">Mapping Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => {
                  const edit = editedMappings[m.id] || { sku: m.jyotsvan_sku || '', status: m.mapping_status };
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs">
                        <div>{m.marketplace_title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Style: {m.marketplace_asin}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {m.marketplace_sku}
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={edit.sku}
                          onChange={(e) =>
                            setEditedMappings({
                              ...editedMappings,
                              [m.id]: { ...edit, sku: e.target.value },
                            })
                          }
                          placeholder="e.g. JY-KUM-OIL-30ML"
                          className="px-2.5 py-1 text-xs font-mono font-semibold border border-slate-300 rounded-md focus:ring-1 focus:ring-pink-500 w-48"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={edit.status}
                          onChange={(e) =>
                            setEditedMappings({
                              ...editedMappings,
                              [m.id]: { ...edit, status: e.target.value },
                            })
                          }
                          className="px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-pink-500"
                        >
                          <option value="mapped">Mapped</option>
                          <option value="auto_matched">Auto-Matched</option>
                          <option value="unmapped">Unmapped</option>
                          <option value="ignored">Ignored</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleSave(m.id)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
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
