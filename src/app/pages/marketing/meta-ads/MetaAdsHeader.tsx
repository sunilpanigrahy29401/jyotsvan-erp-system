// src/app/pages/marketing/meta-ads/MetaAdsHeader.tsx
// Phase 27: Meta Ads Header Controls, Date Filters, Comparison & Sync State

import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  RefreshCw,
  Clock,
  AlertTriangle,
  Layers,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type {
  MetaAdAccount,
  MetaComparePeriod,
  MetaDateRangePreset,
} from '../../../../types/meta.ts';
import { getCurrencySymbol } from '../../../../utils/metaMetrics.ts';

export interface MetaAdsHeaderProps {
  adAccounts?: MetaAdAccount[];
  selectedAdAccount?: MetaAdAccount | null;
  selectedAccountId?: string;
  onAccountChange?: (accountId: string) => void;
  onSelectAccount?: (accountId: string) => void;
  datePreset?: MetaDateRangePreset | string;
  onPresetChange?: (preset: string) => void;
  onSelectDatePreset?: (preset: MetaDateRangePreset) => void;
  startDate: string;
  endDate: string;
  onCustomDateChange?: (start: string, end: string) => void;
  onChangeCustomDates?: (start: string, end: string) => void;
  comparisonEnabled?: boolean;
  onComparisonToggle?: (enabled: boolean) => void;
  comparisonType?: 'previous_period' | 'previous_year' | string;
  onComparisonTypeChange?: (type: 'previous_period' | 'previous_year') => void;
  comparePeriod?: MetaComparePeriod;
  onSelectComparePeriod?: (period: MetaComparePeriod) => void;
  compareStartDate?: string;
  compareEndDate?: string;
  lastSyncedAt?: string | null;
  lastSyncAt?: string | null;
  syncStatus?: string;
  onOpenSync?: () => void;
  onOpenConfig?: () => void;
  onOpenConfigModal?: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export function MetaAdsHeader({
  adAccounts = [],
  selectedAdAccount = null,
  selectedAccountId = 'ALL',
  onAccountChange,
  onSelectAccount,
  datePreset = 'last_7d',
  onPresetChange,
  onSelectDatePreset,
  startDate,
  endDate,
  onCustomDateChange,
  onChangeCustomDates,
  comparisonType = 'previous_period',
  onComparisonTypeChange,
  comparePeriod = 'previous_period',
  onSelectComparePeriod,
  lastSyncedAt,
  lastSyncAt,
  syncStatus = 'IDLE',
  onOpenSync,
  onOpenConfig,
  onOpenConfigModal,
  onRefresh,
  isRefreshing = false,
}: MetaAdsHeaderProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const datePresets: Array<{ key: string; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '14d', label: 'Last 14 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'this_quarter', label: 'This Quarter' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const compareOptions: Array<{ key: string; label: string }> = [
    { key: 'previous_period', label: 'Previous Period' },
    { key: 'previous_year', label: 'Previous Year' },
    { key: 'none', label: 'No Comparison' },
  ];

  const handleRefreshClick = async () => {
    setRefreshMessage('Sync started...');
    try {
      if (onRefresh) {
        await onRefresh();
      } else if (onOpenSync) {
        onOpenSync();
      }
      setRefreshMessage('Sync triggered successfully');
      setTimeout(() => setRefreshMessage(null), 4000);
    } catch {
      setRefreshMessage('Sync failed');
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  };

  const syncTimestamp = lastSyncedAt || lastSyncAt;
  const isSyncDelayed = React.useMemo(() => {
    if (!syncTimestamp) return false;
    const diffHours = (Date.now() - new Date(syncTimestamp).getTime()) / (1000 * 60 * 60);
    return diffHours > 6;
  }, [syncTimestamp]);

  const currencySymbol = getCurrencySymbol(selectedAdAccount?.currency || 'INR');

  const handleAccountSelect = (id: string) => {
    if (onAccountChange) onAccountChange(id);
    if (onSelectAccount) onSelectAccount(id);
    setIsAccountOpen(false);
  };

  const handlePresetSelect = (preset: string) => {
    if (onPresetChange) onPresetChange(preset);
    if (onSelectDatePreset) onSelectDatePreset(preset as MetaDateRangePreset);
    if (preset !== 'custom') setIsDateOpen(false);
  };

  const handleCompareSelect = (type: string) => {
    if (onComparisonTypeChange) onComparisonTypeChange(type as 'previous_period' | 'previous_year');
    if (onSelectComparePeriod) onSelectComparePeriod(type as MetaComparePeriod);
    setIsCompareOpen(false);
  };

  const handleApplyCustomDates = () => {
    if (onCustomDateChange) onCustomDateChange(customStart, customEnd);
    if (onChangeCustomDates) onChangeCustomDates(customStart, customEnd);
    setIsDateOpen(false);
  };

  const effectiveAccountLabel = selectedAdAccount
    ? selectedAdAccount.name
    : selectedAccountId === 'ALL'
    ? 'All Connected Accounts'
    : selectedAccountId;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-5 space-y-4 rounded-2xl shadow-xs">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-200">
              Phase 27
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">META ADS DASHBOARD</h1>
            {selectedAdAccount && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {selectedAdAccount.currency} ({currencySymbol.trim()})
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time synchronized Meta Ads performance, ROAS, conversions, placements, and audience demographics.
          </p>
        </div>

        {/* Header Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Ad Account Selector */}
          <div className="relative">
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span className="max-w-[160px] truncate">{effectiveAccountLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isAccountOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Select Ad Account
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  <button
                    onClick={() => handleAccountSelect('ALL')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                      selectedAccountId === 'ALL'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>All Accounts Combined</span>
                  </button>
                  {adAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleAccountSelect(acc.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        selectedAdAccount?.id === acc.id || selectedAccountId === acc.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate font-medium">{acc.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {acc.account_id || acc.id} • {acc.currency}
                        </div>
                      </div>
                      {acc.is_primary && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold ml-2">
                          PRIMARY
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>
                {datePresets.find((p) => p.key === datePreset)?.label || 'Range'}:{' '}
                <span className="font-mono text-slate-500 font-normal">
                  {startDate} to {endDate}
                </span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDateOpen && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2.5 space-y-3">
                <div className="grid grid-cols-2 gap-1">
                  {datePresets.map((dp) => (
                    <button
                      key={dp.key}
                      onClick={() => handlePresetSelect(dp.key)}
                      className={`px-2.5 py-1.5 rounded-md text-left text-xs font-medium transition ${
                        datePreset === dp.key
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {dp.label}
                    </button>
                  ))}
                </div>

                {datePreset === 'custom' && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500">Custom Dates</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400">Start</label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">End</label>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleApplyCustomDates}
                      className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                    >
                      Apply Dates
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparison Selector */}
          <div className="relative">
            <button
              onClick={() => setIsCompareOpen(!isCompareOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <span className="text-slate-400 font-normal">Compare:</span>
              <span>
                {compareOptions.find((c) => c.key === comparisonType || c.key === comparePeriod)?.label || 'Previous Period'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isCompareOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5">
                {compareOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleCompareSelect(opt.key)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      comparisonType === opt.key || comparePeriod === opt.key
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {/* Settings / Configuration Modal Trigger */}
          <button
            onClick={() => {
              if (onOpenConfig) onOpenConfig();
              else if (onOpenConfigModal) onOpenConfigModal();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="Configure Meta API Credentials"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Freshness & Status Strip */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Last synchronized:</span>
          <span className="font-semibold text-slate-700">
            {syncTimestamp ? new Date(syncTimestamp).toLocaleString('en-IN') : 'Never'}
          </span>
          {isSyncDelayed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3 h-3" /> Data may be delayed
            </span>
          )}
          {refreshMessage && (
            <span className="text-emerald-700 font-medium animate-pulse ml-2">
              {refreshMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">Sync Engine:</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 uppercase text-[11px]">
            <span className={`w-2 h-2 rounded-full ${syncStatus === 'RUNNING' ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`} />
            {syncStatus || 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}
