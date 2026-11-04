// src/app/pages/marketing/google-ads/GoogleAdsHeader.tsx
// Phase 29: Google Ads Dashboard Header Component

import React from 'react';
import {
  Search,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { GoogleAdsAccount } from '../../../../types/google-ads.ts';

interface GoogleAdsHeaderProps {
  accounts: GoogleAdsAccount[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  datePreset: string;
  onChangeDatePreset: (preset: string) => void;
  customStartDate: string;
  customEndDate: string;
  onChangeCustomDates: (start: string, end: string) => void;
  comparisonType: 'previous_period' | 'previous_year' | 'none';
  onChangeComparisonType: (type: 'previous_period' | 'previous_year' | 'none') => void;
  lastSyncedAt: string | null;
  syncStatus: string;
  onRefresh: () => void;
  onOpenSyncModal: () => void;
  onOpenConfigModal: () => void;
  isRefreshing: boolean;
}

export const GoogleAdsHeader: React.FC<GoogleAdsHeaderProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  datePreset,
  onChangeDatePreset,
  customStartDate,
  customEndDate,
  onChangeCustomDates,
  comparisonType,
  onChangeComparisonType,
  lastSyncedAt,
  syncStatus,
  onRefresh,
  onOpenSyncModal,
  onOpenConfigModal,
  isRefreshing,
}) => {
  const selectedAcc = accounts.find((a) => a.id === selectedAccountId || a.customer_id === selectedAccountId);

  return (
    <div id="google-ads-header" className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* Title & Account Identification */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Google Ads Dashboard</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Search, PMax, Shopping & Video
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Account:</span>
              {accounts.length > 0 ? (
                <div className="relative inline-block">
                  <select
                    id="gads-account-selector"
                    value={selectedAccountId}
                    onChange={(e) => onSelectAccount(e.target.value)}
                    className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md pl-2 pr-7 py-0.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">All Connected Accounts ({accounts.length})</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.descriptive_name} ({acc.customer_id}) — {acc.currency_code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1.5 pointer-events-none" />
                </div>
              ) : (
                <span className="font-medium text-slate-700">No account connected</span>
              )}

              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                {syncStatus === 'healthy' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>
                  Synced {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Date Filter, Comparison & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Date Range */}
          <div className="relative">
            <select
              id="gads-date-preset-selector"
              value={datePreset}
              onChange={(e) => onChangeDatePreset(e.target.value)}
              className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="last_14d">Last 14 Days</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Custom Date Inputs if 'custom' is selected */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onChangeCustomDates(e.target.value, customEndDate)}
                className="bg-transparent border-0 p-0 text-xs font-medium text-slate-700 focus:ring-0"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onChangeCustomDates(customStartDate, e.target.value)}
                className="bg-transparent border-0 p-0 text-xs font-medium text-slate-700 focus:ring-0"
              />
            </div>
          )}

          {/* Comparison Selector */}
          <div className="relative">
            <select
              id="gads-comparison-selector"
              value={comparisonType}
              onChange={(e) => onChangeComparisonType(e.target.value as any)}
              className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="previous_period">vs. Previous Period</option>
              <option value="previous_year">vs. Previous Year</option>
              <option value="none">No Comparison</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            id="btn-refresh-gads"
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm transition disabled:opacity-50"
            title="Refresh synchronized data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Trigger Sync Modal */}
          <button
            id="btn-trigger-gads-sync"
            type="button"
            onClick={onOpenSyncModal}
            className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Sync Now</span>
          </button>

          {/* Integration Config */}
          <button
            id="btn-gads-config"
            type="button"
            onClick={onOpenConfigModal}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Connection Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
