// src/app/pages/commerce/flipkart/FlipkartCapabilitiesCard.tsx
// Phase 32: Flipkart Capabilities Status Component

import React from 'react';
import {
  CheckCircle2,
  Package,
  Layers,
  Archive,
  Truck,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';

export function FlipkartCapabilitiesCard() {
  const capabilities = [
    {
      title: 'Orders & Line Items',
      desc: 'Real-time order fetching, items breakdown, pricing, taxes & dispatch SLAs',
      icon: Package,
      status: 'Active',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      title: 'Catalog & Listings',
      desc: 'FSN, Seller SKU mapping, MRP & selling prices, Assured badge status',
      icon: Layers,
      status: 'Active',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Smart & Non-Smart Inventory',
      desc: 'Flipkart Smart (FBF) FCs and seller warehouse multi-location stock',
      icon: Archive,
      status: 'Active',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      title: 'Ekart & Dispatch Tracking',
      desc: 'Manifest tracking IDs, courier SLA compliance, and dispatch deadlines',
      icon: Truck,
      status: 'Active',
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    },
    {
      title: 'Returns & RTO Management',
      desc: 'Customer returns, courier RTOs in transit, inspection condition & refunds',
      icon: RotateCcw,
      status: 'Active',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      title: 'Seller Performance Metrics',
      desc: 'Gold Tier status, RTD SLA breach rate, cancellation rate, rating (4.74★)',
      icon: TrendingUp,
      status: 'Active',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Authorized Flipkart Capabilities</h3>
          <p className="text-xs text-slate-500">Live features accessible through Jyotsvan Integration & Marketplace Engines</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          6 of 6 Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {capabilities.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
            >
              <div className={`p-2 rounded-lg border ${c.color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{c.title}</h4>
                  <div className="flex items-center text-[10px] font-semibold text-emerald-600 space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{c.status}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{c.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
