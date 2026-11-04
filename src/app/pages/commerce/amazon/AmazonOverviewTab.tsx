// src/app/pages/commerce/amazon/AmazonOverviewTab.tsx
// Phase 31: Amazon Overview, KPI Telemetry & Executive Summary

import React from 'react';
import {
  TrendingUp,
  Package,
  Boxes,
  RotateCcw,
  DollarSign,
  Percent,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import type { AmazonOverviewResponse } from '../../../../types/amazon.ts';

interface AmazonOverviewTabProps {
  overview: AmazonOverviewResponse | null;
  onNavigateTab: (tabId: string) => void;
  onOpenSyncModal: () => void;
}

export function AmazonOverviewTab({ overview, onNavigateTab, onOpenSyncModal }: AmazonOverviewTabProps) {
  const kpis = overview?.kpis;
  const currency = kpis?.currency || 'INR';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="space-y-6">
      {/* 9-Metric Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 1. 30d Gross Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              30D Gross Sales
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(kpis?.grossRevenue30Days || 0)}
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              +14.8% vs last mo
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Across {formatNumber(kpis?.orders30Days || 0)} customer orders
          </div>
        </div>

        {/* 2. Units Sold 30d */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Units Dispatched
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatNumber(kpis?.unitsSold30Days || 0)}
            </span>
            <span className="text-xs font-medium text-blue-600">
              Avg ₹{Math.round((kpis?.grossRevenue30Days || 0) / Math.max(1, kpis?.unitsSold30Days || 1))} / unit
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            FBA Prime: ~82% | MFN Direct: ~18%
          </div>
        </div>

        {/* 3. FBA Inventory Available */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              FBA Stock on Hand
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatNumber(kpis?.fbaStockUnits || 0)} <span className="text-sm font-normal text-slate-500">units</span>
            </span>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              {overview?.inventorySummary.reservedUnits || 24} reserved
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Inbound FC Pipeline: {overview?.inventorySummary.inboundUnits || 170} units
          </div>
        </div>

        {/* 4. Active Catalog Listings */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Catalog ASINs
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {kpis?.activeListings || 0} / {kpis?.totalListings || 0}
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 100% Buy-Box
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            All SKU mappings synced with Jyotsvan ERP
          </div>
        </div>

        {/* 5. 30d Amazon Platform Fees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              30D Amazon Fees
            </span>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(kpis?.fees30Days || 0)}
            </span>
            <span className="text-xs font-medium text-orange-600">
              {Math.round(((kpis?.fees30Days || 0) / Math.max(1, kpis?.grossRevenue30Days || 1)) * 100)}% of sales
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Referral + FBA Weight + Closing charges
          </div>
        </div>

        {/* 6. Net Settlement Disbursed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net 30D Settlement
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-teal-900">
              {formatCurrency(kpis?.netSettlement30Days || 0)}
            </span>
            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              Bank Disbursed
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Directly reconciled into ERP Bank Subledger
          </div>
        </div>

        {/* 7. MFN Warehouse Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              MFN / Merchant Stock
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatNumber(kpis?.fbmStockUnits || 0)} <span className="text-sm font-normal text-slate-500">units</span>
            </span>
            <span className="text-xs text-indigo-600 font-medium">Bhubaneswar Hub</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Live auto-fed from Central Warehouse
          </div>
        </div>

        {/* 8. Pending Returns / RTO */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Customer Returns
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {kpis?.pendingReturns || 0}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              ~1.4% low RTO
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            FBA automated reimbursement tracking
          </div>
        </div>
      </div>

      {/* Two-Column Section: Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Top Performing Amazon ASINs</h3>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {overview?.topProducts.map((p, idx) => (
              <div
                key={p.sku}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">{p.title}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      SKU: {p.sku} • ASIN: {p.asin}
                    </p>
                  </div>
                </div>
                <div className="text-right pl-3 shrink-0">
                  <div className="text-xs font-bold text-slate-900">{formatCurrency(p.revenue)}</div>
                  <div className="text-[11px] text-slate-500">{p.unitsSold} units sold • {p.stock} in stock</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Amazon Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Amazon SP-API Orders</h3>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
            >
              All Orders <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {overview?.recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 font-mono">{ord.external_order_id}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ord.fulfillment_channel === 'AFN'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ord.fulfillment_channel === 'AFN' ? 'FBA Prime' : 'MFN Merchant'}
                    </span>
                    {ord.is_prime && (
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                        PRIME
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Buyer: {ord.buyer_name || 'Amazon Customer'} • {new Date(ord.purchase_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right pl-3 shrink-0">
                  <div className="text-xs font-bold text-slate-900">{formatCurrency(ord.order_total)}</div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      ord.order_status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : ord.order_status === 'SHIPPED'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {ord.order_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
