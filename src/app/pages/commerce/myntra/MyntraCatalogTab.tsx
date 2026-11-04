// src/app/pages/commerce/myntra/MyntraCatalogTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Tag,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';
import type { MyntraListing } from '../../../../types/myntra.ts';

export function MyntraCatalogTab() {
  const [listings, setListings] = useState<MyntraListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await myntraApi.getListings();
      setListings(data);
    } catch (err) {
      console.error('Failed to load Myntra listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const filtered = listings.filter((l) =>
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.seller_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.style_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Myntra Fashion & Wellness Catalog</h2>
          <p className="text-xs text-slate-500">
            Active Style IDs mapped to Myntra's taxonomy with size curves, colors, and pricing.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Style ID, SKU, or Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
          />
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading catalog styles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No catalog styles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Style ID / Article</th>
                  <th className="py-3 px-4 font-semibold">Product Title</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Attributes (Size / Color)</th>
                  <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                  <th className="py-3 px-4 font-semibold text-right">MRP</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900">{item.style_id}</div>
                      <div className="text-[11px] text-slate-400">SKU: {item.seller_sku}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 max-w-xs">{item.title}</div>
                      <div className="text-[11px] text-pink-600 font-medium mt-0.5">{item.brand}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                          {item.size || 'Std'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-pink-50 text-pink-700 rounded text-[11px] font-medium border border-pink-100">
                          {item.color || 'Natural'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-medium">
                          {item.gender || 'Unisex'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{item.listing_price.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 line-through">
                      ₹{item.mrp.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
