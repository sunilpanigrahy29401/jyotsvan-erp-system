// src/app/pages/commerce/amazon/AmazonCapabilitiesCard.tsx
// Phase 31: Amazon SP-API Live Capability Badges Grid

import React from 'react';
import {
  ShoppingBag,
  Package,
  Boxes,
  RotateCcw,
  FileText,
  DollarSign,
  Percent,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

interface CapabilityItem {
  key: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  status: 'ACTIVE' | 'READY';
  version: string;
}

export function AmazonCapabilitiesCard() {
  const capabilities: CapabilityItem[] = [
    {
      key: 'spapi',
      name: 'Amazon SP-API Core',
      desc: 'LWA OAuth token exchange, STS Role assumption & rate limits',
      icon: <ShoppingBag className="w-4 h-4 text-amber-600" />,
      status: 'ACTIVE',
      version: 'v2026',
    },
    {
      key: 'orders',
      name: 'Orders & Line Items',
      desc: 'Orders API v0 polling, MFN/AFN channels & line item pricing',
      icon: <Package className="w-4 h-4 text-blue-600" />,
      status: 'ACTIVE',
      version: 'v0',
    },
    {
      key: 'products',
      name: 'Products & ASINs',
      desc: 'Catalog listings, ASINs, FNSKUs & product attributes',
      icon: <Package className="w-4 h-4 text-emerald-600" />,
      status: 'ACTIVE',
      version: '2022-04-01',
    },
    {
      key: 'inventory',
      name: 'FBA & FBM Inventory',
      desc: 'FBA summaries, reserved units, inbound pipeline & MFN balances',
      icon: <Boxes className="w-4 h-4 text-purple-600" />,
      status: 'ACTIVE',
      version: 'v1',
    },
    {
      key: 'returns',
      name: 'Returns & RTO',
      desc: 'Customer return tracking, carrier condition & refund status',
      icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
      status: 'ACTIVE',
      version: 'v1',
    },
    {
      key: 'reports',
      name: 'Scheduled Reports',
      desc: 'Asynchronous report creation, polling & document parsing',
      icon: <FileText className="w-4 h-4 text-indigo-600" />,
      status: 'ACTIVE',
      version: '2021-06-30',
    },
    {
      key: 'settlements',
      name: 'Settlements & Payouts',
      desc: 'V2 settlement statements, net disbursements & deposit tracking',
      icon: <DollarSign className="w-4 h-4 text-teal-600" />,
      status: 'ACTIVE',
      version: 'v2',
    },
    {
      key: 'fees',
      name: 'Fees & Deductions',
      desc: 'Referral fee, FBA weight handling, closing fee & subledger sync',
      icon: <Percent className="w-4 h-4 text-orange-600" />,
      status: 'ACTIVE',
      version: 'v0',
    },
    {
      key: 'sync',
      name: 'Bi-Directional Sync',
      desc: 'Stateful sync checkpoints, idempotency & cron worker integration',
      icon: <RefreshCw className="w-4 h-4 text-cyan-600" />,
      status: 'ACTIVE',
      version: 'SyncEngine',
    },
  ];

  return (
    <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Phase 31 Architectural Scope
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-300 font-medium">9 / 9 Subsystems Operational</span>
          </div>
          <h2 className="text-base font-bold text-white mt-0.5">
            Amazon SP-API Multi-Channel Synchronization Suite
          </h2>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
          <span>Tenant: <strong className="text-slate-200">Jyotsvan Ayurvedic Enterprises</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {capabilities.map((c) => (
          <div
            key={c.key}
            className="flex items-start space-x-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 transition"
          >
            <div className="p-2 rounded-md bg-slate-900/80 border border-slate-700 shrink-0">
              {c.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-200 truncate">{c.name}</h4>
                <div className="flex items-center space-x-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                  <CheckCircle className="w-2.5 h-2.5" />
                  <span>{c.status}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
