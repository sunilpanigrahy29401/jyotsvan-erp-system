// src/app/pages/commerce/amazon/AmazonMappingTab.tsx
// Phase 31: Amazon SKU & Entity Mapping Workbench

import React, { useState, useEffect } from 'react';
import {
  Link2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Edit2,
  Save,
  X,
  Search,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';
import type { AmazonEntityMapping } from '../../../../types/amazon.ts';

export function AmazonMappingTab() {
  const [mappings, setMappings] = useState<AmazonEntityMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await amazonApi.getMappings();
      setMappings(res.mappings);
    } catch (err) {
      console.error('Failed to load mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleAutoMatch = async () => {
    setMatching(true);
    try {
      const res = await amazonApi.autoMatchMappings();
      setStatusMessage(`Auto-matched ${res.matchedCount} SKUs successfully with Jyotsvan ERP master.`);
      await fetchMappings();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error('Auto match failed:', err);
    } finally {
      setMatching(false);
    }
  };

  const startEdit = (m: AmazonEntityMapping) => {
    setEditingId(m.id);
    setEditSku(m.jyotsvan_sku || '');
    setEditName(m.jyotsvan_product_name || '');
  };

  const saveEdit = async (m: AmazonEntityMapping) => {
    try {
      await amazonApi.updateMapping(m.id, {
        jyotsvan_sku: editSku,
        jyotsvan_product_name: editName,
        mapping_status: editSku.trim() ? 'mapped' : 'unmapped',
      });
      setEditingId(null);
      await fetchMappings();
    } catch (err) {
      console.error('Failed to update mapping:', err);
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
      {/* Top Banner & Auto Match Action */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">SKU Master Reconciliation Workbench</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Map Amazon Seller SKUs and ASINs to internal Jyotsvan Ayurvedic Master Product IDs to synchronize inventory and sales orders.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAutoMatch}
            disabled={matching}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${matching ? 'animate-bounce' : ''}`} />
            <span>{matching ? 'Auto-Matching...' : 'Auto-Match SKUs'}</span>
          </button>

          <button
            onClick={fetchMappings}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Mappings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Amazon or ERP SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {mappings.filter((m) => m.mapping_status === 'mapped' || m.mapping_status === 'auto_matched').length} / {mappings.length} Mapped
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Amazon Seller SKU</th>
                <th className="py-3 px-4">Amazon ASIN</th>
                <th className="py-3 px-4">Jyotsvan ERP SKU</th>
                <th className="py-3 px-4">Mapped ERP Name</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-500" />
                    Loading mapping records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No mapping records found.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isEditing = editingId === m.id;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {m.marketplace_sku}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-700">
                        {m.marketplace_asin || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSku}
                            onChange={(e) => setEditSku(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-amber-400 rounded focus:outline-none font-mono"
                          />
                        ) : (
                          <span className="font-mono font-semibold text-slate-800">
                            {m.jyotsvan_sku || <span className="text-slate-400 italic">Not set</span>}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-amber-400 rounded focus:outline-none"
                          />
                        ) : (
                          m.jyotsvan_product_name || '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.mapping_status === 'mapped' || m.mapping_status === 'auto_matched'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.mapping_status === 'mapped' || m.mapping_status === 'auto_matched' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {m.mapping_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => saveEdit(m)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(m)}
                            className="p-1 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                            title="Edit Mapping"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
