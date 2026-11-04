// src/app/pages/marketing/google-ads/GoogleAdsDashboard.tsx
// Phase 29: Google Ads Analytics & Enterprise Campaign Management Master Dashboard

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Layers,
  Target,
  KeyRound,
  Search,
  MapPin,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type {
  GoogleAdsAccount,
  GoogleAnalyticsFilter,
  GoogleAdsExecutiveOverviewData,
  GoogleAdsTab,
} from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import { GoogleAdsHeader } from './GoogleAdsHeader.tsx';
import { GoogleSyncAttentionBanner } from './GoogleSyncAttentionBanner.tsx';
import { GoogleEmptyConnectionState } from './GoogleEmptyConnectionState.tsx';
import { OverviewTab } from './OverviewTab.tsx';
import { CampaignsTab } from './CampaignsTab.tsx';
import { AdGroupsTab } from './AdGroupsTab.tsx';
import { KeywordsTab } from './KeywordsTab.tsx';
import { SearchTermsTab } from './SearchTermsTab.tsx';
import { LocationsTab } from './LocationsTab.tsx';
import { DevicesTab } from './DevicesTab.tsx';
import { ConversionsTab } from './ConversionsTab.tsx';
import { TrendsTab } from './TrendsTab.tsx';
import { SyncHealthTab } from './SyncHealthTab.tsx';
import { GoogleAdsConfigModal } from './GoogleAdsConfigModal.tsx';
import { GoogleAdsSyncModal } from './GoogleAdsSyncModal.tsx';

export const GoogleAdsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GoogleAdsTab>('overview');
  const [overviewData, setOverviewData] = useState<GoogleAdsExecutiveOverviewData | null>(null);
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('last_30_days');
  const [comparisonType, setComparisonType] = useState<'previous_period' | 'previous_year' | 'none'>('previous_period');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Date range filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const filter: GoogleAnalyticsFilter = {
    accountId: selectedAccountId !== 'ALL' ? selectedAccountId : undefined,
    startDate,
    endDate,
    comparisonType,
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await googleAdsAnalyticsApi.getOverview(filter);
      setOverviewData(data);
      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error('Failed to load Google Ads overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAccountId, startDate, endDate, comparisonType]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
  };

  const handleChangeDatePreset = (preset: string) => {
    setDatePreset(preset);
    const end = new Date();
    const start = new Date();

    if (preset === 'today') {
      // today
    } else if (preset === 'yesterday') {
      start.setDate(end.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (preset === 'last_7_days') {
      start.setDate(end.getDate() - 7);
    } else if (preset === 'last_30_days') {
      start.setDate(end.getDate() - 30);
    } else if (preset === 'last_90_days') {
      start.setDate(end.getDate() - 90);
    } else if (preset === 'this_month') {
      start.setDate(1);
    } else if (preset === 'last_month') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleChangeCustomDates = (start: string, end: string) => {
    setDatePreset('custom');
    setStartDate(start);
    setEndDate(end);
  };

  const tabs: { id: GoogleAdsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Layers className="w-4 h-4" /> },
    { id: 'adgroups', label: 'Ad Groups', icon: <Target className="w-4 h-4" /> },
    { id: 'keywords', label: 'Keywords & QS', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'searchterms', label: 'Search Terms', icon: <Search className="w-4 h-4" /> },
    { id: 'locations', label: 'Locations', icon: <MapPin className="w-4 h-4" /> },
    { id: 'devices', label: 'Devices', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'conversions', label: 'Conversions', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'sync', label: 'Sync & Audit', icon: <Activity className="w-4 h-4" /> },
  ];

  if (!loading && overviewData && !overviewData.isConnected) {
    return (
      <div className="space-y-6">
        <GoogleAdsHeader
          accounts={[]}
          selectedAccountId="ALL"
          onSelectAccount={() => {}}
          datePreset={datePreset}
          onChangeDatePreset={handleChangeDatePreset}
          customStartDate={startDate}
          customEndDate={endDate}
          onChangeCustomDates={handleChangeCustomDates}
          comparisonType={comparisonType}
          onChangeComparisonType={setComparisonType}
          lastSyncedAt={null}
          syncStatus="DISCONNECTED"
          onRefresh={handleRefresh}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          isRefreshing={refreshing}
        />
        <GoogleEmptyConnectionState onOpenConfigModal={() => setIsConfigModalOpen(true)} />
        <GoogleAdsConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSaved={loadDashboardData}
        />
      </div>
    );
  }

  const currency = overviewData?.currency || 'INR';

  return (
    <div id="jyotsvan-google-ads-dashboard" className="space-y-6">
      {/* Header with Account selector, Date Picker, and Action Buttons */}
      <GoogleAdsHeader
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={handleSelectAccount}
        datePreset={datePreset}
        onChangeDatePreset={handleChangeDatePreset}
        customStartDate={startDate}
        customEndDate={endDate}
        onChangeCustomDates={handleChangeCustomDates}
        comparisonType={comparisonType}
        onChangeComparisonType={setComparisonType}
        lastSyncedAt={overviewData?.lastSyncedAt || overviewData?.lastSyncAt || null}
        syncStatus={overviewData?.syncStatus || 'IDLE'}
        onRefresh={handleRefresh}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
        isRefreshing={refreshing}
      />

      {/* Sync Attention Banner if warnings/exceptions */}
      {overviewData?.attentionItems && overviewData.attentionItems.length > 0 && (
        <GoogleSyncAttentionBanner
          items={overviewData.attentionItems}
          onActionClick={() => setIsSyncModalOpen(true)}
        />
      )}

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-xs px-2 pt-2 flex items-center overflow-x-auto scrollbar-none gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-bold border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && overviewData && (
          <OverviewTab
            overviewData={overviewData}
            onNavigateTab={(t) => setActiveTab(t)}
            onSelectCampaign={(cId) => {
              setSelectedCampaignId(cId);
              setActiveTab('campaigns');
            }}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTab
            filter={filter}
            currency={currency}
            selectedCampaignId={selectedCampaignId}
            onSelectCampaign={(cId) => setSelectedCampaignId(cId)}
          />
        )}

        {activeTab === 'adgroups' && <AdGroupsTab filter={filter} currency={currency} />}

        {activeTab === 'keywords' && <KeywordsTab filter={filter} currency={currency} />}

        {activeTab === 'searchterms' && <SearchTermsTab filter={filter} currency={currency} />}

        {activeTab === 'locations' && <LocationsTab filter={filter} currency={currency} />}

        {activeTab === 'devices' && <DevicesTab filter={filter} currency={currency} />}

        {activeTab === 'conversions' && <ConversionsTab filter={filter} currency={currency} />}

        {activeTab === 'trends' && <TrendsTab filter={filter} currency={currency} />}

        {activeTab === 'sync' && (
          <SyncHealthTab
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <GoogleAdsConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaved={loadDashboardData}
      />

      <GoogleAdsSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncCompleted={() => {
          loadDashboardData();
          setIsSyncModalOpen(false);
        }}
      />
    </div>
  );
};
export default GoogleAdsDashboard;
