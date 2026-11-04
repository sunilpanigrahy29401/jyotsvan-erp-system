// src/app/pages/CommandCenterPage.tsx
// Phase 37: Hero / Executive Command Center

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Megaphone,
  ShoppingBag,
  Factory,
  Landmark,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Layers,
  Archive,
  Truck,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export interface CommandCenterPageProps {
  onNavigate?: (path: string) => void;
}

export function CommandCenterPage({ onNavigate }: CommandCenterPageProps) {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/overview');
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (err) {
      console.error('Failed to load command center telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const d = analytics?.domains;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* 1. Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Command Center</h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Live Operational Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Unified corporate cockpit synthesizing business health, production yields, sales networks, working capital, and AI intelligence.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Refresh Pulse
            </button>
            <button
              onClick={() => navigateTo('/ai/copilot')}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
              Ask AI Copilot
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 2. Top Executive Run-Rate KPI Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross Sales</span>
            <div className="text-xl font-bold text-slate-900 mt-1">₹48.5L</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">+14.8% vs last month</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Invoiced Total</span>
            <div className="text-xl font-bold text-slate-900 mt-1">₹46.2L</div>
            <div className="text-[11px] text-slate-500 mt-0.5">₹38.9L collected (84%)</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding AR</span>
            <div className="text-xl font-bold text-slate-900 mt-1">₹7.3L</div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">₹58K overdue &gt;60d</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stock Valuation</span>
            <div className="text-xl font-bold text-slate-900 mt-1">₹1.24 Cr</div>
            <div className="text-[11px] text-slate-500 mt-0.5">68,400 units on hand</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plant Yield</span>
            <div className="text-xl font-bold text-slate-900 mt-1">98.4%</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Scrap variance 1.6%</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Blended ROAS</span>
            <div className="text-xl font-bold text-slate-900 mt-1">4.38x</div>
            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Meta 4.6x • Google 4.1x</div>
          </div>
        </div>

        {/* 3. AI Insights Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-5 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-amber-300 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 uppercase tracking-wider">
                  AI Operational Synthesis
                </span>
                <span className="text-xs text-slate-400">Updated 10m ago</span>
              </div>
              <h3 className="text-sm font-bold mt-1 text-white">
                Manufacturing yield stable at 98.4%; Kumkumadi 30ml demand outpacing safety buffers across Amazon & Myntra.
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Recommended action: Schedule batch replenishment for Kumkumadi extract in Plant 1 and review distributor Vaidya Health's overdue AR.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => navigateTo('/ai/insights')}
              className="px-3 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10"
            >
              View All Insights
            </button>
            <button
              onClick={() => navigateTo('/ai/recommendations')}
              className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors shadow-xs"
            >
              Review Actions →
            </button>
          </div>
        </div>

        {/* 4. Core Business Domain Navigation Grid */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Enterprise Operational Sectors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sector 1: Commerce & Marketplaces */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-pink-300 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-pink-50 rounded-lg">
                      <ShoppingBag className="w-4 h-4 text-pink-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Commerce & Marketplaces</h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Active</span>
                </div>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Marketplace GMV:</span>
                    <span className="font-bold text-slate-900">₹16.36L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shopify D2C GMV:</span>
                    <span className="font-bold text-slate-900">₹6.80L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Portals:</span>
                    <span className="font-medium text-slate-700">Amazon, Flipkart, Myntra</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => navigateTo('/commerce/marketplaces')}
                  className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center"
                >
                  <span>Marketplaces Hub</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
                <button
                  onClick={() => navigateTo('/commerce/shopify')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Shopify
                </button>
              </div>
            </div>

            {/* Sector 2: Operations & Manufacturing */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Factory className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Operations & Plant</h3>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600">98.4% Yield</span>
                </div>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Active Work Orders:</span>
                    <span className="font-bold text-slate-900">6 in progress</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed Batches:</span>
                    <span className="font-bold text-slate-900">48 batches</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scrap Variance:</span>
                    <span className="font-medium text-emerald-600">1.6% (within SLA)</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => navigateTo('/operations')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <span>Operations Floor</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
                <button
                  onClick={() => navigateTo('/inventory')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Inventory
                </button>
              </div>
            </div>

            {/* Sector 3: Distribution & Logistics */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-400 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Truck className="w-4 h-4 text-slate-700" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Distribution & Depots</h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">8 Depots</span>
                </div>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Distributors Reached:</span>
                    <span className="font-bold text-slate-900">42 entities</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retailers Active:</span>
                    <span className="font-bold text-slate-900">384 stores</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Throughput:</span>
                    <span className="font-medium text-slate-700">42,100 units</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => navigateTo('/distribution')}
                  className="text-xs font-semibold text-slate-800 hover:text-slate-950 flex items-center"
                >
                  <span>Distribution Hub</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
                <button
                  onClick={() => navigateTo('/distribution/field-sales')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Field Sales
                </button>
              </div>
            </div>

            {/* Sector 4: Finance & Working Capital */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Landmark className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Finance & Subledgers</h3>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600">Balanced</span>
                </div>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Invoiced Run-Rate:</span>
                    <span className="font-bold text-slate-900">₹46.2L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collected Receipts:</span>
                    <span className="font-bold text-slate-900">₹38.9L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current AR Balance:</span>
                    <span className="font-medium text-slate-700">₹7.3L</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => navigateTo('/finance')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center"
                >
                  <span>Finance Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
                <button
                  onClick={() => navigateTo('/business/reports')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Reports
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Live Operational Alerts Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Active Operational Alerts & Action Triggers</h3>
            </div>
            <span className="text-xs text-slate-400">Integrated with Central Notification Engine</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between text-xs">
              <div className="flex items-start space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900">Inventory Buffer Warning:</span>
                  <span className="text-amber-800 ml-1">
                    SKU JY-KUM-OIL-30ML buffer holds in Bangalore store reached 80 units due to flash sale surge on Myntra.
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigateTo('/commerce/marketplaces/myntra')}
                className="font-bold text-pink-600 hover:text-pink-700 ml-4 shrink-0"
              >
                Inspect Buffer →
              </button>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start justify-between text-xs">
              <div className="flex items-start space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">QC Inspection Release:</span>
                  <span className="text-slate-600 ml-1">
                    Batch #JY-BHR-2026-09A (Bhringraj 200ml) passed chemical assay purity standards (99.8%) and released to Finished Goods.
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigateTo('/operations')}
                className="font-bold text-blue-600 hover:text-blue-700 ml-4 shrink-0"
              >
                View Batch →
              </button>
            </div>

            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 flex items-start justify-between text-xs">
              <div className="flex items-start space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900">Subledger Reconciliation Complete:</span>
                  <span className="text-emerald-800 ml-1">
                    All subledgers, invoices, payments, and stock movements are perfectly balanced with zero variance.
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigateTo('/business/analytics')}
                className="font-bold text-emerald-700 hover:text-emerald-800 ml-4 shrink-0"
              >
                Audit Log →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
