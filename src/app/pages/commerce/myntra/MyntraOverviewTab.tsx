// src/app/pages/commerce/myntra/MyntraOverviewTab.tsx
import React from 'react';
import {
  TrendingUp,
  Package,
  Layers,
  Archive,
  RotateCcw,
  Star,
  CheckCircle,
  XCircle,
  Truck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { MyntraOverviewResponse } from '../../../../types/myntra.ts';

interface MyntraOverviewTabProps {
  overview: MyntraOverviewResponse | null;
  onNavigateTab: (tabId: string) => void;
}

export function MyntraOverviewTab({ overview, onNavigateTab }: MyntraOverviewTabProps) {
  if (!overview) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading Myntra Partner Bridge overview...
      </div>
    );
  }

  const { kpis, capabilities, topListings, fulfillmentSummary } = overview;

  const capabilityList = [
    { key: 'orders', label: 'PPMP Order Pipeline', supported: capabilities.orders },
    { key: 'orderDispatch', label: 'Dispatch Manifest API', supported: capabilities.orderDispatch },
    { key: 'inventoryBuffer', label: 'Safety Buffer Controller', supported: capabilities.inventoryBuffer },
    { key: 'catalogTaxonomy', label: 'Fashion Taxonomy Mapper', supported: capabilities.catalogTaxonomy },
    { key: 'returnsRTO', label: 'RTO & Reverse Logistics', supported: capabilities.returnsRTO },
    { key: 'fashionAttributes', label: 'Color / Size Specifications', supported: capabilities.fashionAttributes },
    { key: 'settlements', label: 'Consolidated Settlements', supported: capabilities.settlements },
    { key: 'webhooks', label: 'Live Partner Webhooks', supported: capabilities.webhooks },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 1. Top KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">30-Day GMV</span>
            <div className="p-2 bg-pink-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-pink-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              ₹{(kpis.grossRevenue30Days || 482900).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold text-emerald-600">+14.2%</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {kpis.orders30Days} orders • {kpis.unitsSold30Days} units sold
          </div>
        </div>

        {/* Orders & Pending Dispatch */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Orders & Dispatch</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{kpis.orders30Days}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              {kpis.pendingDispatches} Pending Dispatch
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Average Order Value: ₹{Math.round(kpis.grossRevenue30Days / (kpis.orders30Days || 1))}
          </div>
        </div>

        {/* Inventory & Safety Buffer */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stock & Safety Buffer</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Archive className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.availableInventoryUnits} units
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {kpis.safetyBufferUnits} Buffer Hold
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {kpis.activeListings} active styles across Bangalore store
          </div>
        </div>

        {/* Brand Rating & SLA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Brand SLA & Rating</span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Star className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">4.82 ★</span>
            <span className="text-xs font-semibold text-emerald-600">
              {kpis.slaAdherenceRate}% On-Time
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {kpis.sellerTier}
          </div>
        </div>
      </div>

      {/* 2. Capability Detection & Fulfillment Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capability Detection Matrix */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Myntra Partner API Capability Manifest</h3>
              <p className="text-xs text-slate-500">
                Live feature availability verified against Myntra Partner Bridge PPMP endpoint scopes.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
              PPMP v2.4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {capabilityList.map((cap) => (
              <div
                key={cap.key}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50"
              >
                <span className="text-xs font-medium text-slate-700">{cap.label}</span>
                {cap.supported ? (
                  <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <XCircle className="w-3 h-3 mr-1 text-amber-500" />
                    Partner Tier Required
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fulfillment Pipeline Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Dispatch Channels
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">PPMP (Pure Play Marketplace)</span>
                <span className="font-bold text-slate-900">{fulfillmentSummary.ppmpFulfilledUnits} units (78%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{ width: '78%' }} />
              </div>
              <span className="text-[11px] text-slate-400">Direct dispatch from brand central warehouse</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Omnichannel Store Pickup</span>
                <span className="font-bold text-slate-900">{fulfillmentSummary.omniChannelUnits} units (22%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '22%' }} />
              </div>
              <span className="text-[11px] text-slate-400">Bangalore physical store hub dispatch</span>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>On-Time SLA:</span>
                <span className="font-bold text-emerald-600">99.4%</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>RTO Reversal Rate:</span>
                <span className="font-bold text-slate-700">4.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Selling Styles on Myntra */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Top Performing Myntra Style Articles</h3>
            <p className="text-xs text-slate-500">
              Ranked by 30-day sales volume and catalog conversion index.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('catalog')}
            className="text-xs font-semibold text-pink-600 hover:text-pink-700"
          >
            View All Styles →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50">
                <th className="py-2.5 px-3 font-semibold">Style ID & Title</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold">SKU</th>
                <th className="py-2.5 px-3 font-semibold text-right">Price</th>
                <th className="py-2.5 px-3 font-semibold text-right">Units Sold</th>
                <th className="py-2.5 px-3 font-semibold text-right">Stock</th>
                <th className="py-2.5 px-3 font-semibold text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topListings.map((item) => (
                <tr key={item.styleId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    <div className="text-[11px] font-mono text-slate-400">{item.styleId}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{item.category}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{item.sku}</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900">
                    ₹{item.price.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{item.unitsSold}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded font-medium ${item.stock <= 15 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {item.stock} left
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    ₹{item.revenue.toLocaleString('en-IN')}
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
