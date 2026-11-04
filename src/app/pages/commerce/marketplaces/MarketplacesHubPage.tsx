// src/app/pages/commerce/marketplaces/MarketplacesHubPage.tsx
// Phase 34: Centralized Multi-Marketplace Hub Operations Dashboard

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Layers,
  Archive,
  RotateCcw,
  Percent,
  Landmark,
  ArrowRight,
  ExternalLink,
  Filter,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { MarketplaceHubOverview } from '../../../../server/marketplace-hub-service.ts';

interface MarketplacesHubPageProps {
  onNavigate?: (path: string) => void;
}

export function MarketplacesHubPage({ onNavigate }: MarketplacesHubPageProps) {
  const [data, setData] = useState<MarketplaceHubOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<'ALL' | 'amazon' | 'flipkart' | 'myntra'>('ALL');
  const [timeRange, setTimeRange] = useState('30D');

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/commerce/marketplaces/overview');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load marketplace hub overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [timeRange]);

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (loading || !data) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-slate-50">
        <div className="text-center text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
          Aggregating multi-channel marketplace telemetry (Amazon, Flipkart, Myntra)...
        </div>
      </div>
    );
  }

  const { kpis, channels, financialWaterfall, topProducts, salesTrend, inventoryDistribution } = data;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* 1. Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Marketplaces Command Hub</h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  3 Channels Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated sales volume, commission audits, returns, and inventory across Amazon SP-API, Flipkart, and Myntra PPMP.
              </p>
            </div>
          </div>

          {/* Time & Channel Filters */}
          <div className="flex items-center space-x-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
              {['7D', '30D', '90D', 'YTD'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timeRange === t ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={loadOverview}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Refresh All
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 2. Primary KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Marketplace Sales */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Sales (GMV)</span>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{kpis.grossSales.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {kpis.orders.toLocaleString()} orders • {kpis.unitsSold.toLocaleString()} units sold
            </div>
          </div>

          {/* Net Marketplace Value */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net Realized Yield</span>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Landmark className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{kpis.netSales.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              After ₹{kpis.marketplaceFees.toLocaleString('en-IN')} commissions & returns
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Blended AOV</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{kpis.averageOrderValue.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Cancellations: {kpis.cancellationRate}% ({kpis.cancellations} orders)
            </div>
          </div>

          {/* Returns & RTO Rate */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Returns & RTO</span>
              <div className="p-2 bg-rose-50 rounded-lg">
                <RotateCcw className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {kpis.returnRate}%
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {kpis.returns} total returns • Outstanding Payout: ₹{kpis.settlementsOutstanding.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* 3. Marketplace Portals Drill-Through Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Active Marketplace Channels</h2>
            <span className="text-xs text-slate-500">Select any portal to drill into orders, FSN/ASIN listings, and returns.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Amazon Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center font-bold text-amber-700 font-mono text-sm">
                      AMZ
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Amazon India</h3>
                      <span className="text-[11px] text-slate-400">Amazon SP-API Connected</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Prime FBA
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs py-3 border-y border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px]">30-Day GMV:</span>
                    <div className="font-bold text-slate-900 text-sm">₹{channels.amazon.grossSales.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Orders:</span>
                    <div className="font-bold text-slate-900 text-sm">{channels.amazon.orders} orders</div>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-[11px]">Return Rate:</span>
                    <div className="font-semibold text-slate-700">{channels.amazon.returnRate}%</div>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-[11px]">Stock (FBA+FBM):</span>
                    <div className="font-semibold text-slate-700">{channels.amazon.inventoryUnits} units</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2">
                <button
                  onClick={() => handleNavigate('/commerce/marketplaces/amazon')}
                  className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <span>Open Amazon Operations</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            </div>

            {/* Flipkart Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center font-bold text-blue-700 font-mono text-sm">
                      FK
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Flipkart Seller Hub</h3>
                      <span className="text-[11px] text-slate-400">Seller API v3 Connected</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    F-Assured
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs py-3 border-y border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px]">30-Day GMV:</span>
                    <div className="font-bold text-slate-900 text-sm">₹{channels.flipkart.grossSales.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Orders:</span>
                    <div className="font-bold text-slate-900 text-sm">{channels.flipkart.orders} orders</div>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-[11px]">Return Rate:</span>
                    <div className="font-semibold text-slate-700">{channels.flipkart.returnRate}%</div>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-[11px]">Stock (Smart+Dir):</span>
                    <div className="font-semibold text-slate-700">{channels.flipkart.inventoryUnits} units</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2">
                <button
                  onClick={() => handleNavigate('/commerce/marketplaces/flipkart')}
                  className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <span>Open Flipkart Operations</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            </div>

            {/* Myntra Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-pink-400 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center font-bold text-pink-700 font-mono text-sm">
                      MYN
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Myntra Partner Bridge</h3>
                      <span className="text-[11px] text-slate-400">PPMP v2.4 Connected</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                    Tier 1 Brand
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs py-3 border-y border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px]">30-Day GMV:</span>
                    <div className="font-bold text-slate-900 text-sm">₹{channels.myntra.grossSales.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Orders:</span>
                    <div className="font-bold text-slate-900 text-sm">{channels.myntra.orders} orders</div>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-[11px]">Return Rate:</span>
                    <div className="font-semibold text-slate-700">{channels.myntra.returnRate}%</div>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-[11px]">Stock (PPMP+Store):</span>
                    <div className="font-semibold text-slate-700">{channels.myntra.inventoryUnits} units</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2">
                <button
                  onClick={() => handleNavigate('/commerce/marketplaces/myntra')}
                  className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <span>Open Myntra Operations</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Financial Waterfall & Stock Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Reconciliation Waterfall */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Marketplace Settlement & Yield Waterfall
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-700">Gross Marketplace Sales (GMV)</span>
                <span className="font-bold text-slate-900">₹{financialWaterfall.grossSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 text-rose-600">
                <span>(-) Promotional Discounts & Vouchers</span>
                <span>-₹{financialWaterfall.discounts.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 text-rose-600">
                <span>(-) Customer Returns & RTO Refunds</span>
                <span>-₹{financialWaterfall.returnsValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 text-rose-600">
                <span>(-) Marketplace Commissions & Fulfillment Fees</span>
                <span>-₹{financialWaterfall.marketplaceFees.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t-2 border-slate-200 bg-slate-50 px-2 rounded-lg">
                <span className="font-bold text-slate-900">Net Realized Settlement Value</span>
                <span className="text-sm font-bold text-emerald-600">₹{financialWaterfall.netYieldValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Yield Ratio: {Math.round((financialWaterfall.netYieldValue / financialWaterfall.grossSales) * 100)}% of gross merchandise volume recovered after all platform commissions and returns.
              </div>
            </div>
          </div>

          {/* Cross-Marketplace Fulfillment Stock Allocation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Fulfillment Model Inventory Allocations
            </h3>
            <div className="space-y-3">
              {inventoryDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div>
                    <div className="font-semibold text-slate-900">{item.channel} — {item.model}</div>
                    <div className="text-[11px] text-slate-400">Reserved safety hold: {item.reserved} units</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{item.available} units</span>
                    <div className="text-[11px] text-emerald-600 font-medium">In Stock</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Top Cross-Marketplace Products Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Cross-Marketplace SKUs</h3>
              <p className="text-xs text-slate-500">
                Consolidated volume and presence across Amazon, Flipkart, and Myntra.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                  <th className="py-3 px-4 font-semibold">SKU & Product Name</th>
                  <th className="py-3 px-4 font-semibold text-center">Channels Present</th>
                  <th className="py-3 px-4 font-semibold text-right">Units Sold</th>
                  <th className="py-3 px-4 font-semibold text-right">Gross Sales</th>
                  <th className="py-3 px-4 font-semibold text-right">Stock Across All FCs</th>
                  <th className="py-3 px-4 font-semibold text-right">Returns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p) => (
                  <tr key={p.sku} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{p.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">SKU: {p.sku}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {p.channels.map((ch) => (
                          <span
                            key={ch}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ch === 'Amazon'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : ch === 'Flipkart'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-pink-50 text-pink-700 border border-pink-200'
                            }`}
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">{p.unitsSold}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{p.grossSales.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                      {p.inventoryAvailable} units
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                      {p.returns}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
