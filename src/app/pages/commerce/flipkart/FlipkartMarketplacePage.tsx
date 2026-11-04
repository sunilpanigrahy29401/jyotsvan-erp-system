// src/app/pages/commerce/flipkart/FlipkartMarketplacePage.tsx
// Phase 32: Flipkart Seller API & Marketplace Operations Main Dashboard

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Archive,
  RotateCcw,
  TrendingUp,
  Link2,
} from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';
import type { FlipkartOverviewResponse } from '../../../../types/flipkart.ts';

import { FlipkartHeader } from './FlipkartHeader.tsx';
import { FlipkartOverviewTab } from './FlipkartOverviewTab.tsx';
import { FlipkartOrdersTab } from './FlipkartOrdersTab.tsx';
import { FlipkartListingsTab } from './FlipkartListingsTab.tsx';
import { FlipkartInventoryTab } from './FlipkartInventoryTab.tsx';
import { FlipkartReturnsTab } from './FlipkartReturnsTab.tsx';
import { FlipkartPerformanceTab } from './FlipkartPerformanceTab.tsx';
import { FlipkartMappingTab } from './FlipkartMappingTab.tsx';
import { FlipkartConfigModal } from './FlipkartConfigModal.tsx';
import { FlipkartSyncModal } from './FlipkartSyncModal.tsx';

export function FlipkartMarketplacePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<FlipkartOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  const fetchOverview = async () => {
    try {
      setIsRefreshing(true);
      const data = await flipkartApi.getOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load Flipkart overview:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await flipkartApi.testConnection({
        appId: 'app-prod-jyotsvan-8821',
        appSecret: 'fk_sec_9948271049284102948102948',
        sellerId: 'FK_SELLER_JYOTSVAN_ORG',
      });
      alert(res.message || 'Flipkart Seller API connectivity verified successfully.');
    } catch (err: any) {
      alert(err.message || 'Flipkart connection test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders & Dispatches', icon: Package },
    { id: 'listings', label: 'Catalog Listings (FSN)', icon: Layers },
    { id: 'inventory', label: 'Multi-Location Stock', icon: Archive },
    { id: 'returns', label: 'Returns & RTOs', icon: RotateCcw },
    { id: 'performance', label: 'Service Quality (Tier)', icon: TrendingUp },
    { id: 'mapping', label: 'SKU Mapping Workbench', icon: Link2 },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* 1. Header & Controls */}
      <FlipkartHeader
        overview={overview}
        onOpenSyncModal={() => setIsSyncOpen(true)}
        onOpenConfigModal={() => setIsConfigOpen(true)}
        onTestConnection={handleTestConnection}
        isTesting={isTesting}
        isRefreshing={isRefreshing}
        onRefresh={fetchOverview}
      />

      {/* 2. Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex space-x-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'overview' && (
          <FlipkartOverviewTab overview={overview} onNavigateTab={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'orders' && <FlipkartOrdersTab />}
        {activeTab === 'listings' && <FlipkartListingsTab />}
        {activeTab === 'inventory' && <FlipkartInventoryTab />}
        {activeTab === 'returns' && <FlipkartReturnsTab />}
        {activeTab === 'performance' && <FlipkartPerformanceTab />}
        {activeTab === 'mapping' && <FlipkartMappingTab />}
      </div>

      {/* 4. Modals */}
      <FlipkartConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSuccess={fetchOverview}
      />
      <FlipkartSyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        onSuccess={fetchOverview}
      />
    </div>
  );
}
