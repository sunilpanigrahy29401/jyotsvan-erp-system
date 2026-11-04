// src/app/pages/commerce/flipkart/FlipkartMappingTab.tsx
// Phase 32: Flipkart SKU & Listing Entity Mapping Workbench Tab

import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Edit2,
  Check,
  X,
  Link2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';
import type { FlipkartEntityMapping } from '../../../../types/flipkart.ts';

export function FlipkartMappingTab() {
  const [mappings, setMappings] = useState<FlipkartEntityMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editStatus, setEditStatus] = useState<'MAPPED' | 'UNMAPPED' | 'IGNORE'>('MAPPED');
  const [saving, setSaving] = useState(false);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await flipkartApi.getMappings();
      setMappings(res.mappings || []);
    } catch (err) {
      console.error('Error fetching Flipkart mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleStartEdit = (m: FlipkartEntityMapping) => {
    setEditingId(m.id);
    setEditSku(m.jyotsvan_sku || '');
    setEditStatus((m.mapping_status as any) || 'MAPPED');
  };

  const handleSave = async (m: FlipkartEntityMapping) => {
    setSaving(true);
    try {
      await flipkartApi.saveMapping(m.id, editSku, editStatus);
      setEditingId(null);
      await fetchMappings();
    } catch (err) {
      alert('Failed to update mapping.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = mappings.filter(
    (m) =>
      (m.marketplace_sku && m.marketplace_sku.toLowerCase().includes(search.toLowerCase())) ||
      (m.jyotsvan_sku && m.jyotsvan_sku.toLowerCase().includes(search.toLowerCase())) ||
      (m.marketplace_asin && m.marketplace_asin.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Flipkart SKU, FSN, or Jyotsvan internal SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMappings}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"
            title="Refresh mappings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            Loading SKU mappings...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Link2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No SKU mappings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Flipkart SKU</th>
                  <th className="py-3 px-4">Flipkart FSN</th>
                  <th className="py-3 px-4">Mapped Jyotsvan ERP SKU</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((m) => {
                  const isEditing = editingId === m.id;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {m.marketplace_sku}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-700">
                        {m.marketplace_asin || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSku}
                            onChange={(e) => setEditSku(e.target.value)}
                            className="w-full px-2 py-1 border border-blue-500 rounded text-xs font-mono focus:outline-none"
                            placeholder="Enter Jyotsvan ERP SKU..."
                          />
                        ) : (
                          <span className="font-mono font-semibold text-slate-800">
                            {m.jyotsvan_sku || <span className="text-slate-400 italic">Unmapped</span>}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          >
                            <option value="MAPPED">MAPPED</option>
                            <option value="UNMAPPED">UNMAPPED</option>
                            <option value="IGNORE">IGNORE</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              m.mapping_status === 'MAPPED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{m.mapping_status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-emerald-600">
                          {Math.round((m.confidence_score || 1.0) * 100)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleSave(m)}
                              disabled={saving}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(m)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
                          >
                            <Edit2 className="w-3 h-3 text-slate-400" />
                            <span>Map SKU</span>
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
