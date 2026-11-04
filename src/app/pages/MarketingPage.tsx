// src/app/pages/MarketingPage.tsx
// Phase 28/29: Omni-Channel Marketing & Ads Intelligence Hub (Meta + Google Ads)

import React from 'react';
import { MetaMarketingPage } from './marketing/MetaMarketingPage.tsx';
import { GoogleAdsDashboard } from './marketing/google-ads/GoogleAdsDashboard.tsx';

export interface MarketingPageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function MarketingPage({ currentPath = '/marketing', onNavigate }: MarketingPageProps) {
  const isGoogle = currentPath.includes('/google');

  return (
    <div className="space-y-6">
      {/* Omni-Channel Sub-Navigation Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('/marketing/meta')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              !isGoogle
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Meta Ads (Facebook & Instagram)
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('/marketing/google')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              isGoogle
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Google Ads (Search, PMax, Shopping)
          </button>
        </div>
      </div>

      {isGoogle ? <GoogleAdsDashboard /> : <MetaMarketingPage />}
    </div>
  );
}

