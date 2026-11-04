// src/app/pages/marketing/meta-ads/CreativesTab.tsx
// Phase 27: Creatives Gallery & Performance Analytics

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Eye,
  MousePointer,
  Award,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import type { MetaCreative } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';

export interface CreativesTabProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  currency: string;
}

export function CreativesTab({
  accountId,
  startDate,
  endDate,
  currency,
}: CreativesTabProps) {
  const [creatives, setCreatives] = useState<MetaCreative[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'spend' | 'conversions' | 'roas' | 'ctr'>('spend');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getCreatives({
        accountId,
        startDate,
        endDate,
      })
      .then((res) => {
        if (isMounted) setCreatives(res.creatives);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, startDate, endDate]);

  const filteredCreatives = creatives
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.title && c.title.toLowerCase().includes(search.toLowerCase())) ||
        (c.body && c.body.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return bVal - aVal;
    });

  return (
    <div className="space-y-4">
      {/* Search & Sort Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search creative copy or titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {[
              { key: 'spend', label: 'Spend' },
              { key: 'conversions', label: 'Conversions' },
              { key: 'roas', label: 'ROAS' },
              { key: 'ctr', label: 'CTR' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key as any)}
                className={`px-2.5 py-1 rounded-md transition ${
                  sortBy === s.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Creatives Visual Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
          Loading creatives gallery...
        </div>
      ) : filteredCreatives.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
          No ad creatives found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCreatives.map((cr) => (
            <div
              key={cr.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                {/* Visual Media Header */}
                <div className="relative h-48 bg-slate-100 border-b border-slate-100 overflow-hidden group">
                  {cr.image_url || cr.thumbnail_url ? (
                    <img
                      src={cr.image_url || cr.thumbnail_url}
                      alt={cr.title || cr.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Sparkles className="w-8 h-8 mb-1 text-slate-300" />
                      <span>No media preview</span>
                    </div>
                  )}

                  {cr.call_to_action_type && (
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="px-2 py-1 rounded bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                        {cr.call_to_action_type.replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 text-[10px] font-bold shadow-xs">
                      {cr.ads_count ?? 1} Linked Ad{cr.ads_count === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {cr.title || cr.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {cr.body || 'No primary copy configured.'}
                  </p>
                </div>
              </div>

              {/* Performance Metrics Footer Strip */}
              <div className="bg-slate-50 border-t border-slate-100 p-3 grid grid-cols-4 gap-1 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Spend</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {formatCurrency(cr.spend, currency, true)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Conv</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {formatCount(cr.conversions)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">ROAS</div>
                  <div className="font-bold text-emerald-600 mt-0.5">
                    {formatROAS(cr.roas)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">CTR</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {formatPercentage(cr.ctr)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
