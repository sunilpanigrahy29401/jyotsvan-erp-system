// src/app/pages/marketing/meta-ads/MetaSyncAttentionBanner.tsx
// Phase 27: Sync Attention Alert Banner

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import type { MetaSyncAttentionItem, MetaSyncException } from '../../../../types/meta.ts';

export interface MetaSyncAttentionBannerProps {
  items?: MetaSyncAttentionItem[];
  exceptions?: MetaSyncException[];
  onTriggerSync?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function MetaSyncAttentionBanner({
  items = [],
  exceptions = [],
  onTriggerSync,
  onRetry,
  isRetrying = false,
}: MetaSyncAttentionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const allItemsCount = items.length + exceptions.length;
  if (dismissed || allItemsCount === 0) return null;

  const firstItem = items[0] || (exceptions[0] ? {
    id: exceptions[0].id,
    title: `Sync Exception on ${exceptions[0].entity_type} (${exceptions[0].error_code || 'ERROR'})`,
    description: exceptions[0].error_message,
  } : null);

  if (!firstItem) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
            <span>Synchronization Notice: {firstItem.title}</span>
            <span className="text-[10px] font-normal text-amber-700">
              ({allItemsCount} unresolved issue{allItemsCount > 1 ? 's' : ''})
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed max-w-3xl">
            {firstItem.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            if (onTriggerSync) onTriggerSync();
            else if (onRetry) onRetry();
          }}
          disabled={isRetrying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>Resolve & Sync</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-amber-700 hover:text-amber-900 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
