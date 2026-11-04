// src/app/pages/commerce/myntra/MyntraMarketplacePage.tsx
// Phase 33: Myntra Partner Bridge (PPMP/Omni) Main Operations Hub

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
import { myntraApi } from '../../../../services/myntraApi.ts';
import type { MyntraOverviewResponse } from '../../../../types/myntra.ts';

import { MyntraHeader } from './MyntraHeader.tsx';
import { MyntraOverviewTab } from './MyntraOverviewTab.tsx';
import { MyntraOrdersTab } from './MyntraOrdersTab.tsx';
import { MyntraCatalogTab } from './MyntraCatalogTab.tsx';
import { MyntraInventoryTab } from './MyntraInventoryTab.tsx';
import { MyntraReturnsTab } from './MyntraReturnsTab.tsx';
import { MyntraPerformanceTab } from './MyntraPerformanceTab.tsx';
import { MyntraMappingTab } from './MyntraMappingTab.tsx';
import { MyntraConfigModal } from './MyntraConfigModal.tsx';
import { MyntraSyncModal } from './MyntraSyncModal.tsx';

export function MyntraMarketplacePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<MyntraOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  const fetchOverview = async () => {
    try {
      setIsRefreshing(true);
      const data = await myntraApi.getOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load Myntra overview:', err);
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
      const res = await myntraApi.testConnection({
        clientId: 'myn-client-jyotsvan-9921',
        clientSecret: 'myn_sec_8849201948201934',
        sellerPartnerId: 'MYNTRA_PARTNER_JYOTSVAN',
        environment: 'production',
      });
      alert(res.message || 'Myntra Partner Bridge connectivity verified successfully.');
    } catch (err: any) {
      alert(err.message || 'Myntra connection test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders & Dispatches', icon: Package },
    { id: 'catalog', label: 'Style Articles', icon: Layers },
    { id: 'inventory', label: 'Stock & Buffers', icon: Archive },
    { id: 'returns', label: 'Returns & RTOs', icon: RotateCcw },
    { id: 'performance', label: 'Brand SLA Tier', icon: TrendingUp },
    { id: 'mapping', label: 'SKU Mapping Workbench', icon: Link2 },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* 1. Header & Quick Controls */}
      <MyntraHeader
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
                className={`flex items-center space-x-2 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-pink-600 text-pink-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-pink-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Contents */}
      <div className="flex-1">
        {activeTab === 'overview' && (
          <MyntraOverviewTab overview={overview} onNavigateTab={(t) => setActiveTab(t)} />
        )}
        {activeTab === 'orders' && <MyntraOrdersTab />}
        {activeTab === 'catalog' && <MyntraCatalogTab />}
        {activeTab === 'inventory' && <MyntraInventoryTab />}
        {activeTab === 'returns' && <MyntraReturnsTab />}
        {activeTab === 'performance' && <MyntraPerformanceTab />}
        {activeTab === 'mapping' && <MyntraMappingTab />}
      </div>

      {/* 4. Modals */}
      <MyntraConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaved={fetchOverview}
      />

      <MyntraSyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        onSynced={fetchOverview}
      />
    </div>
  );
}
