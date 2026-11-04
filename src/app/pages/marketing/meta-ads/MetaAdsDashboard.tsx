// src/app/pages/marketing/meta-ads/MetaAdsDashboard.tsx
// Phase 27: Complete Enterprise Meta Ads Analytics & Performance Dashboard

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Layers,
  Target,
  Sparkles,
  Users,
  LayoutGrid,
  Smartphone,
  Globe,
  TrendingUp,
  Activity,
  ShoppingBag,
} from 'lucide-react';
import type {
  MetaExecutiveOverviewData,
  MetaComparisonMetric,
  MetaSyncAttentionItem,
} from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import { MetaAdsHeader } from './MetaAdsHeader.tsx';
import { MetaKPICardsGrid } from './MetaKPICardsGrid.tsx';
import { MetaSyncAttentionBanner } from './MetaSyncAttentionBanner.tsx';
import { MetaEmptyConnectionState } from './MetaEmptyConnectionState.tsx';
import { OverviewTab } from './OverviewTab.tsx';
import { CampaignsTab } from './CampaignsTab.tsx';
import { AdSetsTab } from './AdSetsTab.tsx';
import { AdsTab } from './AdsTab.tsx';
import { CreativesTab } from './CreativesTab.tsx';
import { AudienceTab } from './AudienceTab.tsx';
import { PlacementTab } from './PlacementTab.tsx';
import { DeviceTab } from './DeviceTab.tsx';
import { GeographyTab } from './GeographyTab.tsx';
import { TrendsTab } from './TrendsTab.tsx';
import { SyncHealthTab } from './SyncHealthTab.tsx';
import { CampaignDetailDrawer } from './CampaignDetailDrawer.tsx';
import { AdSetDetailDrawer } from './AdSetDetailDrawer.tsx';
import { AdDetailDrawer } from './AdDetailDrawer.tsx';
import { MetaConfigModal } from '../MetaConfigModal.tsx';
import { MetaSyncModal } from '../MetaSyncModal.tsx';
import { getDateRangeFromPreset } from '../../../../utils/metaMetrics.ts';

export function MetaAdsDashboard() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'campaigns'
    | 'adsets'
    | 'ads'
    | 'creatives'
    | 'audience'
    | 'placement'
    | 'device'
    | 'geography'
    | 'trends'
    | 'sync'
  >('overview');

  // Filter & Date State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('7d');
  const [startDate, setStartDate] = useState<string>(() => getDateRangeFromPreset('7d').startDate);
  const [endDate, setEndDate] = useState<string>(() => getDateRangeFromPreset('7d').endDate);

  const [comparisonEnabled, setComparisonEnabled] = useState<boolean>(true);
  const [comparisonType, setComparisonType] = useState<'previous_period' | 'previous_year'>('previous_period');
  const [compareStartDate, setCompareStartDate] = useState<string>(() => getDateRangeFromPreset('7d').compareStartDate || '');
  const [compareEndDate, setCompareEndDate] = useState<string>(() => getDateRangeFromPreset('7d').compareEndDate || '');

  // Loading & Data State
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<MetaExecutiveOverviewData | null>(null);
  const [comparisonMetrics, setComparisonMetrics] = useState<Record<string, MetaComparisonMetric>>({});
  const [attentionItems, setAttentionItems] = useState<MetaSyncAttentionItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Modals & Drawers
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  // Fetch Core Dashboard Overview & Health
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, attentionRes] = await Promise.all([
        metaAnalyticsApi.getOverview({
          accountId: selectedAccountId !== 'ALL' ? selectedAccountId : undefined,
          startDate,
          endDate,
          compareStartDate: comparisonEnabled ? compareStartDate : undefined,
          compareEndDate: comparisonEnabled ? compareEndDate : undefined,
          comparisonType,
        }),
        metaAnalyticsApi.getSyncAttention(),
      ]);

      setIsConnected(overviewRes.isConnected !== undefined ? overviewRes.isConnected : overviewRes.connection !== null);
      setOverview(overviewRes);
      setComparisonMetrics(overviewRes.comparison || {});
      setAttentionItems(attentionRes.items || []);
      setLastSyncedAt(overviewRes.lastSyncAt || overviewRes.lastSyncedAt || null);
    } catch (err) {
      console.error('Failed to load Meta Analytics overview:', err);
      // In case of error, assume disconnected or error state
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, startDate, endDate, comparisonEnabled, compareStartDate, compareEndDate, comparisonType]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Preset Change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const range = getDateRangeFromPreset(preset, comparisonType);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    if (range.compareStartDate && range.compareEndDate) {
      setCompareStartDate(range.compareStartDate);
      setCompareEndDate(range.compareEndDate);
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setDatePreset('custom');
    setStartDate(start);
    setEndDate(end);
  };

  const handleComparisonToggle = (enabled: boolean) => {
    setComparisonEnabled(enabled);
  };

  const handleComparisonTypeChange = (type: 'previous_period' | 'previous_year') => {
    setComparisonType(type);
    const range = getDateRangeFromPreset(datePreset, type);
    if (range.compareStartDate && range.compareEndDate) {
      setCompareStartDate(range.compareStartDate);
      setCompareEndDate(range.compareEndDate);
    }
  };

  // If Meta account is not connected, show the empty connection state
  if (isConnected === false && !isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <MetaEmptyConnectionState
          onConnect={() => setIsConfigOpen(true)}
          onTriggerSampleSync={() => setIsSyncOpen(true)}
        />
        <MetaConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onSuccess={loadDashboardData}
        />
        <MetaSyncModal
          isOpen={isSyncOpen}
          onClose={() => setIsSyncOpen(false)}
          onSuccess={loadDashboardData}
        />
      </div>
    );
  }

  const currency = overview?.currency || 'USD';

  const tabs: Array<{
    id: typeof activeTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campaigns', icon: Layers },
    { id: 'adsets', label: 'Ad Sets', icon: Target },
    { id: 'ads', label: 'Ads', icon: Sparkles },
    { id: 'creatives', label: 'Creatives', icon: ShoppingBag },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'placement', label: 'Placement', icon: LayoutGrid },
    { id: 'device', label: 'Device', icon: Smartphone },
    { id: 'geography', label: 'Geography', icon: Globe },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    {
      id: 'sync',
      label: 'Sync & Health',
      icon: Activity,
      badge: attentionItems.length > 0 ? attentionItems.length : undefined,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Toolbar with Filters */}
      <MetaAdsHeader
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        datePreset={datePreset}
        onPresetChange={handlePresetChange}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={handleCustomDateChange}
        comparisonEnabled={comparisonEnabled}
        onComparisonToggle={handleComparisonToggle}
        comparisonType={comparisonType}
        onComparisonTypeChange={handleComparisonTypeChange}
        compareStartDate={compareStartDate}
        compareEndDate={compareEndDate}
        lastSyncedAt={lastSyncedAt}
        onOpenSync={() => setIsSyncOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* 2. Attention / Sync Warning Banner */}
      <MetaSyncAttentionBanner
        items={attentionItems}
        onTriggerSync={() => setIsSyncOpen(true)}
      />

      {/* 3. Navigation Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Active Tab Content Rendering */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            data={overview}
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            comparisonEnabled={comparisonEnabled}
            compareStartDate={compareStartDate}
            compareEndDate={compareEndDate}
            comparisonType={comparisonType}
            currency={currency}
            onSelectCampaign={setSelectedCampaignId}
            onSelectAd={setSelectedAdId}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
            onSelectCampaign={setSelectedCampaignId}
          />
        )}

        {activeTab === 'adsets' && (
          <AdSetsTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
            onSelectAdSet={setSelectedAdSetId}
          />
        )}

        {activeTab === 'ads' && (
          <AdsTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
            onSelectAd={setSelectedAdId}
          />
        )}

        {activeTab === 'creatives' && (
          <CreativesTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
          />
        )}

        {activeTab === 'audience' && (
          <AudienceTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
          />
        )}

        {activeTab === 'placement' && (
          <PlacementTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
          />
        )}

        {activeTab === 'device' && (
          <DeviceTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
          />
        )}

        {activeTab === 'geography' && (
          <GeographyTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsTab
            accountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
          />
        )}

        {activeTab === 'sync' && (
          <SyncHealthTab
            onOpenSync={() => setIsSyncOpen(true)}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        )}
      </div>

      {/* 5. Drawers for Drilldown Hierarchy */}
      <CampaignDetailDrawer
        campaignId={selectedCampaignId}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setSelectedCampaignId(null)}
        onSelectAdSet={(adSetId) => {
          setSelectedCampaignId(null);
          setSelectedAdSetId(adSetId);
        }}
        onSelectAd={(adId) => {
          setSelectedCampaignId(null);
          setSelectedAdId(adId);
        }}
      />

      <AdSetDetailDrawer
        adSetId={selectedAdSetId}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setSelectedAdSetId(null)}
        onSelectAd={(adId) => {
          setSelectedAdSetId(null);
          setSelectedAdId(adId);
        }}
      />

      <AdDetailDrawer
        adId={selectedAdId}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setSelectedAdId(null)}
      />

      {/* 6. Modals for Sync and API Configuration */}
      <MetaConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSuccess={loadDashboardData}
      />

      <MetaSyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}
