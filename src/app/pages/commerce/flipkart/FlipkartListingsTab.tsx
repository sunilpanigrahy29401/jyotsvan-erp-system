// src/app/pages/commerce/flipkart/FlipkartListingsTab.tsx
// Phase 32: Flipkart Listings & Catalog Management Tab

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Layers,
  Tag,
  CheckCircle2,
  ExternalLink,
  Award,
} from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';
import type { FlipkartListing } from '../../../../types/flipkart.ts';

export function FlipkartListingsTab() {
  const [listings, setListings] = useState<FlipkartListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await flipkartApi.getListings({
        status: statusFilter,
        search,
      });
      setListings(res.listings || []);
    } catch (err) {
      console.error('Error fetching Flipkart listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Flipkart SKU, FSN, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Listing Statuses</option>
            <option value="ACTIVE">Active (Live on Flipkart)</option>
            <option value="INACTIVE">Inactive / Paused</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <button
            onClick={fetchListings}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"
            title="Refresh catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            Loading catalog listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No Flipkart listings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Flipkart SKU / FSN</th>
                  <th className="py-3 px-4">Product Title & Category</th>
                  <th className="py-3 px-4">Fulfillment Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Listing Price</th>
                  <th className="py-3 px-4 text-right">MRP</th>
                  <th className="py-3 px-4 text-center">Flipkart Assured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{l.seller_sku}</div>
                      <div className="text-[11px] text-slate-400 font-mono">FSN: {l.asin}</div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-900 truncate">{l.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{l.category || 'Herbal Supplement'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          l.fulfillment_channel === 'FLIPKART_SMART'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {l.fulfillment_channel === 'FLIPKART_SMART' ? 'Flipkart Smart' : 'Seller Fulfilled'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{l.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      ₹{Number(l.listing_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 line-through">
                      ₹{Number(l.mrp).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Award className="w-3 h-3 text-amber-600 mr-1" />
                        F-Assured
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
