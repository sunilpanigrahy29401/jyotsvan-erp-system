// src/app/pages/commerce/flipkart/FlipkartOverviewTab.tsx
// Phase 32: Flipkart Overview & Telemetry Dashboard Tab

import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Layers,
  Archive,
  RotateCcw,
  Truck,
  TrendingUp,
  Star,
  Award,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import type { FlipkartOverviewResponse } from '../../../../types/flipkart.ts';
import { FlipkartCapabilitiesCard } from './FlipkartCapabilitiesCard.tsx';

interface FlipkartOverviewTabProps {
  overview: FlipkartOverviewResponse | null;
  onNavigateTab: (tabId: string) => void;
}

export function FlipkartOverviewTab({ overview, onNavigateTab }: FlipkartOverviewTabProps) {
  if (!overview) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
        Loading Flipkart telemetry...
      </div>
    );
  }

  const { kpis, topListings, fulfillmentSummary, inventorySummary, performanceMetrics } = overview;

  return (
    <div className="space-y-6">
      {/* 1. Executive Telemetry KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">30D Flipkart GMV</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            ₹{kpis.grossRevenue30Days.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            +18.4% vs last period
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">30D Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">{kpis.orders30Days}</div>
          <div className="text-[11px] text-slate-500 mt-1">{kpis.unitsSold30Days} units delivered</div>
        </div>

        {/* Active Catalog */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Catalog</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {kpis.activeListings} / {kpis.totalListings}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">100% SKU Mapped</div>
        </div>

        {/* Inventory Stock */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Available Units</span>
            <Archive className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">{kpis.availableInventoryUnits}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across 2 Fulfillment Hubs</div>
        </div>

        {/* Pending Dispatches */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Ready to Dispatch</span>
            <Truck className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">{kpis.pendingDispatches}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Within SLA Window</div>
        </div>

        {/* Seller Tier & Rating */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Seller Tier</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-700">{kpis.sellerTier}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1 flex items-center">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500 mr-1" />
            {kpis.sellerRating} / 5.0 Rating
          </div>
        </div>
      </div>

      {/* 2. Capabilities Section */}
      <FlipkartCapabilitiesCard />

      {/* 3. Performance & Fulfillment Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fulfillment Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Fulfillment Breakdown</span>
            </h3>
            <span className="text-xs text-slate-500">Live Channels</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Flipkart Smart (FBF Hubs)</span>
                <span className="font-bold text-blue-700">{fulfillmentSummary.flipkartFulfilledUnits} units</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${
                      (fulfillmentSummary.flipkartFulfilledUnits /
                        (fulfillmentSummary.flipkartFulfilledUnits + fulfillmentSummary.sellerFulfilledUnits || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Seller Fulfilled (Direct Dispatch)</span>
                <span className="font-bold text-slate-700">{fulfillmentSummary.sellerFulfilledUnits} units</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${
                      (fulfillmentSummary.sellerFulfilledUnits /
                        (fulfillmentSummary.flipkartFulfilledUnits + fulfillmentSummary.sellerFulfilledUnits || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">On-Time Dispatch SLA:</span>
              <span className="font-bold text-emerald-600">{fulfillmentSummary.onTimeDispatchRate}%</span>
            </div>
          </div>
        </div>

        {/* Seller Performance Highlights */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Flipkart Service Quality Benchmarks</span>
            </h3>
            <button
              onClick={() => onNavigateTab('performance')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View All Metrics →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {performanceMetrics.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700 truncate">{m.metric_name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      m.status === 'EXCELLENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'GOOD'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-base font-bold text-slate-900">
                    {m.current_value}
                    {m.unit}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    (Target &lt; {m.benchmark_target}
                    {m.unit})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Top Selling Listings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span>Top Performing Flipkart Listings</span>
          </h3>
          <button
            onClick={() => onNavigateTab('listings')}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Catalog Explorer →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Flipkart FSN / SKU</th>
                <th className="py-2.5 px-3">Product Title</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Units Sold (30D)</th>
                <th className="py-2.5 px-3 text-right">Gross GMV</th>
                <th className="py-2.5 px-3 text-right">Available Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {topListings.map((p) => (
                <tr key={p.fsn} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-3">
                    <div className="font-mono font-bold text-slate-900">{p.sku}</div>
                    <div className="text-[11px] text-slate-400 font-mono">FSN: {p.fsn}</div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs truncate">{p.title}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900">₹{p.price}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-600">{p.unitsSold}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                    ₹{p.revenue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.stock > 30 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {p.stock} units
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
