// src/app/pages/business/BusinessOverviewPage.tsx
// Phase 3 & 35: Enterprise Business Governance & Executive Corporate Cockpit

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Building2,
  TrendingUp,
  FileText,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Landmark,
  Scale,
  RefreshCw,
  Users,
  Layers,
} from 'lucide-react';

interface BusinessOverviewPageProps {
  onNavigate?: (path: string) => void;
}

export function BusinessOverviewPage({ onNavigate }: BusinessOverviewPageProps) {
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
      console.error('Failed to load business overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <Briefcase className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Business Governance & Corporate ERP</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Multi-Entity Active
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Jyotsvan Ayurvedic Enterprises Pvt. Ltd. — Master enterprise governance, corporate legal entities, multi-state tax registrations, manufacturing plant allocations, and consolidated commercial reporting.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate?.('/business/analytics')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Open Analytics</span>
            </button>
            <button
              onClick={() => onNavigate?.('/business/reports')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Financial Reports</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <div className="text-xs text-slate-400 font-medium">Consolidated Invoiced</div>
            <div className="text-2xl font-bold text-white mt-1">
              {formatCurrency(analytics?.finance?.invoicedValue || 45200000)}
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">+18.4% QoQ Growth</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">B2B Distribution Orders</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">
              {analytics?.sales?.orderCount || 1284}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Across 42 C&F depots</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active SKU Formulations</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {analytics?.manufacturing?.activeFormulations || 48}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Ayush GMP Certified</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Operational Status</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">100%</div>
            <div className="text-xs text-slate-500 mt-0.5">All 3 plants operational</div>
          </div>
        </div>
      </div>

      {/* Corporate Entities & Facilities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Legal Entity Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <Landmark className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Principal Legal Entity</h3>
              <p className="text-xs text-slate-400">Corporate Governance Master</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Corporate Name</span>
              <span className="text-white font-medium text-right">Jyotsvan Ayurvedic Enterprises Pvt. Ltd.</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">CIN</span>
              <span className="text-white font-mono">U24233DL2018PTC334902</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Primary GSTIN</span>
              <span className="text-white font-mono">07AAACJ2940M1Z8</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">AYUSH License</span>
              <span className="text-white font-mono">AYU-DL-2021-0498</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">FSSAI Central Reg</span>
              <span className="text-white font-mono">10021011000492</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate?.('/settings/organization')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Manage Entity Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Manufacturing Plants */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <Building2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Manufacturing Units & Plants</h3>
              <p className="text-xs text-slate-400">Production and Extraction Hubs</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Haridwar Formulation Plant (PLT-01)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GMP Live</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">SIIDCUL Industrial Area, Haridwar, Uttarakhand</p>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-3">
                <span>Capacity: 50,000 units/day</span>
                <span>Active Batches: 14</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Kochi Herbal Extraction Unit (PLT-02)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GMP Live</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">KINFRA Herbal Park, Kakkanad, Kochi, Kerala</p>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-3">
                <span>Capacity: 8,000 kg extract/mo</span>
                <span>Active Batches: 6</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate?.('/settings/branches')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>View All Branches & Facilities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Omnichannel Architecture */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Commercial Channel Matrix</h3>
              <p className="text-xs text-slate-400">Unified Multi-Marketplace & Direct</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300 font-medium">B2B Traditional Distribution</span>
              </div>
              <span className="text-slate-400 text-xs">56% Turnover</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-slate-300 font-medium">Amazon SP-API (FBA/FBM)</span>
              </div>
              <span className="text-slate-400 text-xs">18% Turnover</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-300 font-medium">Flipkart Seller Hub</span>
              </div>
              <span className="text-slate-400 text-xs">14% Turnover</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="text-slate-300 font-medium">Myntra Partner PPMP</span>
              </div>
              <span className="text-slate-400 text-xs">7% Turnover</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-300 font-medium">Shopify D2C Storefront</span>
              </div>
              <span className="text-slate-400 text-xs">5% Turnover</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate?.('/commerce')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Explore Commerce Channels</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
