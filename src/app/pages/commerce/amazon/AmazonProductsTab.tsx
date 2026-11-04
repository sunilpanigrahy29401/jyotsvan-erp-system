// src/app/pages/commerce/amazon/AmazonProductsTab.tsx
// Phase 31: Amazon Catalog, Listings & ASIN Explorer

import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Tag,
  Boxes,
  RefreshCw,
  Link2,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';
import type { AmazonProduct } from '../../../../types/amazon.ts';

interface AmazonProductsTabProps {
  selectedMarketplace: string;
  onNavigateToMapping: () => void;
}

export function AmazonProductsTab({ selectedMarketplace, onNavigateToMapping }: AmazonProductsTabProps) {
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await amazonApi.getProducts({
        marketplaceId: selectedMarketplace,
        status: statusFilter,
        fulfillmentChannel: channelFilter,
        search,
      });
      setProducts(res.products);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load Amazon products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedMarketplace, statusFilter, channelFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search ASIN, SKU, or product title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Live on Amazon)</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUPPRESSED">Suppressed</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Channels</option>
            <option value="FBA">FBA (Fulfillment by Amazon)</option>
            <option value="MFN">MFN (Merchant Fulfilled)</option>
          </select>

          <button
            onClick={onNavigateToMapping}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>SKU Mappings</span>
          </button>

          <button
            onClick={fetchProducts}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / Title</th>
                <th className="py-3 px-4">ASIN & FNSKU</th>
                <th className="py-3 px-4">Channel & Status</th>
                <th className="py-3 px-4 text-right">Listing Price</th>
                <th className="py-3 px-4">Jyotsvan ERP Mapping</th>
                <th className="py-3 px-4 text-center">Amazon Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Fetching Amazon catalog listings...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No catalog listings found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-bold text-slate-900 line-clamp-2">{p.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Seller SKU: <strong className="text-slate-700">{p.seller_sku}</strong>
                        {p.brand ? ` • ${p.brand}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-amber-700">{p.asin || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        FNSKU: {p.fnsku || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            p.fulfillment_channel === 'FBA'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {p.fulfillment_channel === 'FBA' ? 'FBA' : 'MFN'}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700">
                          {p.product_status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatCurrency(p.listing_price, p.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400">Inclusive of GST</div>
                    </td>
                    <td className="py-3 px-4">
                      {p.mapping ? (
                        <div className="flex items-center space-x-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-mono font-semibold text-slate-800">
                              {p.mapping.jyotsvan_sku || p.seller_sku}
                            </span>
                            <div className="text-[10px] text-emerald-600 font-medium">Mapped & Synced</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] font-medium">Unmapped</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.asin ? (
                        <a
                          href={`https://www.amazon.in/dp/${p.asin}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] text-slate-600 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 rounded border border-slate-200 hover:border-amber-300 transition"
                        >
                          <span>Store</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
