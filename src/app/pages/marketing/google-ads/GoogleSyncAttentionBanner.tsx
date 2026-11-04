// src/app/pages/marketing/google-ads/GoogleSyncAttentionBanner.tsx
// Phase 29: Google Ads Sync Attention & Exception Warning Banner

import React from 'react';
import { AlertTriangle, Info, XCircle, ArrowRight } from 'lucide-react';
import type { GoogleSyncAttentionItem } from '../../../../types/google-ads.ts';

interface GoogleSyncAttentionBannerProps {
  items: GoogleSyncAttentionItem[];
  onActionClick?: (item: GoogleSyncAttentionItem) => void;
}

export const GoogleSyncAttentionBanner: React.FC<GoogleSyncAttentionBannerProps> = ({
  items,
  onActionClick,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div id="google-ads-attention-banner" className="space-y-2">
      {items.map((item) => {
        let bgClass = 'bg-amber-50 border-amber-200 text-amber-900';
        let IconComponent = AlertTriangle;
        let iconColor = 'text-amber-600';

        if (item.severity === 'error') {
          bgClass = 'bg-rose-50 border-rose-200 text-rose-900';
          IconComponent = XCircle;
          iconColor = 'text-rose-600';
        } else if (item.severity === 'info') {
          bgClass = 'bg-blue-50 border-blue-200 text-blue-900';
          IconComponent = Info;
          iconColor = 'text-blue-600';
        }

        return (
          <div
            key={item.id}
            className={`border rounded-xl px-4 py-3 flex items-start justify-between gap-3 shadow-sm ${bgClass}`}
          >
            <div className="flex items-start gap-3">
              <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div>
                <h4 className="text-xs font-bold">{item.title}</h4>
                <p className="text-xs opacity-90 mt-0.5">{item.description}</p>
              </div>
            </div>

            {item.actionSuggestion && (
              <button
                type="button"
                onClick={() => onActionClick && onActionClick(item)}
                className="inline-flex items-center gap-1 text-xs font-semibold underline hover:opacity-80 flex-shrink-0 cursor-pointer"
              >
                <span>{item.actionSuggestion}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
