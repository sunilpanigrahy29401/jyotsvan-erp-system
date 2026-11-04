// src/app/pages/settings/IntegrationsSettings.tsx
// Phase 24: Enterprise Integration Engine UI & Orchestrator

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Plug,
  Plus,
  RefreshCw,
  Sliders,
  Webhook,
  Layers,
  Activity,
  Terminal,
  Grid,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { IntegrationsOverview } from './integrations/IntegrationsOverview.tsx';
import { ConnectionsList } from './integrations/ConnectionsList.tsx';
import { ProviderCatalog } from './integrations/ProviderCatalog.tsx';
import { ConnectionConfigModal } from './integrations/ConnectionConfigModal.tsx';
import { WebhooksManager } from './integrations/WebhooksManager.tsx';
import { SyncJobsHistory } from './integrations/SyncJobsHistory.tsx';
import { IntegrationLogsConsole } from './integrations/IntegrationLogsConsole.tsx';
import { RestConsolePlayground } from './integrations/RestConsolePlayground.tsx';
import { ShopifyCommercePage } from '../commerce/ShopifyCommercePage.tsx';
import { MetaMarketingPage } from '../marketing/MetaMarketingPage.tsx';
import { ShoppingBag, Megaphone } from 'lucide-react';
import type {
  IntegrationProvider,
  IntegrationConnection,
  IntegrationWebhook,
  IntegrationLog,
  IntegrationSyncJob,
  IntegrationMetrics,
} from '../../../types/integrations.ts';
import { integrationApi } from '../../../services/integrationApi.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useToast } from '../../../context/ToastContext.tsx';

export function IntegrationsSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'connections' | 'shopify' | 'meta' | 'catalog' | 'webhooks' | 'sync' | 'logs' | 'rest_runner'>('connections');
  const [isLoading, setIsLoading] = useState(true);

  // Core Data Collections
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [webhooks, setWebhooks] = useState<IntegrationWebhook[]>([]);
  const [syncJobs, setSyncJobs] = useState<IntegrationSyncJob[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);

  // Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<IntegrationConnection | null>(null);
  const [runnerConnectionId, setRunnerConnectionId] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [provsData, connsData, metricsData, whData, jobsData, logsData] = await Promise.all([
        integrationApi.getProviders(undefined, undefined, user),
        integrationApi.getConnections(undefined, user),
        integrationApi.getMetrics(user),
        integrationApi.getWebhooks(undefined, user),
        integrationApi.getSyncJobs(undefined, user),
        integrationApi.getLogs({ limit: 100 }, user),
      ]);

      setProviders(provsData);
      setConnections(connsData);
      setMetrics(metricsData);
      setWebhooks(whData);
      setSyncJobs(jobsData);
      setLogs(logsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load integrations data';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleOpenConnect = (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
    setSelectedConnection(null);
    setIsConfigModalOpen(true);
  };

  const handleOpenEdit = (connection: IntegrationConnection) => {
    const prov = providers.find((p) => p.provider_key === connection.provider_key) || (connection.provider as IntegrationProvider) || null;
    setSelectedProvider(prov);
    setSelectedConnection(connection);
    setIsConfigModalOpen(true);
  };

  const handleOpenRestPlayground = (connection: IntegrationConnection) => {
    setRunnerConnectionId(connection.id);
    setActiveTab('rest_runner');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Integration Hub</h2>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold">
              Phase 24 Live
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally manage third-party commerce, payments, logistics, and webhook connectors with AES-256-GCM encrypted credential vault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={isLoading}
            className="text-xs h-9 text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setActiveTab('catalog');
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-3.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Connect Provider
          </Button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <IntegrationsOverview metrics={metrics} isLoading={isLoading} />

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('connections')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'connections'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Plug className="w-4 h-4" />
          <span>Active Connections</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {connections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('shopify')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'shopify'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <span>Shopify Storefront</span>
          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1 py-0 font-bold">Phase 25</Badge>
        </button>

        <button
          onClick={() => setActiveTab('meta')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'meta'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Megaphone className="w-4 h-4 text-blue-600" />
          <span>Meta Ads Hub</span>
          <Badge className="bg-blue-100 text-blue-800 text-[9px] px-1 py-0 font-bold">Phase 26</Badge>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Provider Catalog</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {providers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'webhooks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Inbound Webhooks</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {webhooks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'sync'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Data Sync History</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {syncJobs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Traffic Traces</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rest_runner')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'rest_runner'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Terminal className="w-4 h-4 text-teal-600" />
          <span>REST Proxy Runner</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'connections' && (
        <ConnectionsList
          connections={connections}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onOpenRestPlayground={handleOpenRestPlayground}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'shopify' && (
        <ShopifyCommercePage />
      )}

      {activeTab === 'meta' && (
        <MetaMarketingPage />
      )}

      {activeTab === 'catalog' && (
        <ProviderCatalog
          providers={providers}
          isLoading={isLoading}
          onSelectProvider={handleOpenConnect}
        />
      )}

      {activeTab === 'webhooks' && (
        <WebhooksManager
          webhooks={webhooks}
          isLoading={isLoading}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'sync' && (
        <SyncJobsHistory
          jobs={syncJobs}
          isLoading={isLoading}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'logs' && (
        <IntegrationLogsConsole
          logs={logs}
          isLoading={isLoading}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'rest_runner' && (
        <RestConsolePlayground
          connections={connections}
          initialConnectionId={runnerConnectionId}
          onRefreshLogs={loadAllData}
        />
      )}

      {/* Dynamic Connector Modal */}
      <ConnectionConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setSelectedProvider(null);
          setSelectedConnection(null);
        }}
        provider={selectedProvider}
        connection={selectedConnection}
        onSuccess={loadAllData}
      />
    </div>
  );
}
