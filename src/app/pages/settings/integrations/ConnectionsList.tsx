// src/app/pages/settings/integrations/ConnectionsList.tsx
// Active Integration Connections Grid and Lifecycle Controls

import React, { useState } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Play,
  Trash2,
  Power,
  ExternalLink,
  Search,
  Filter,
  Terminal,
  Clock,
  Zap,
} from 'lucide-react';
import { ProviderIcon } from './ProviderIcon.tsx';
import type { IntegrationConnection } from '../../../../types/integrations.ts';
import { integrationApi } from '../../../../services/integrationApi.ts';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { useToast } from '../../../../context/ToastContext.tsx';

interface ConnectionsListProps {
  connections: IntegrationConnection[];
  isLoading: boolean;
  onEdit: (connection: IntegrationConnection) => void;
  onOpenRestPlayground: (connection: IntegrationConnection) => void;
  onRefresh: () => void;
}

export function ConnectionsList({
  connections,
  isLoading,
  onEdit,
  onOpenRestPlayground,
  onRefresh,
}: ConnectionsListProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'Commerce', value: 'commerce' },
    { label: 'Payments', value: 'payments' },
    { label: 'Shipping', value: 'shipping' },
    { label: 'Communication', value: 'communication' },
    { label: 'Productivity', value: 'productivity' },
    { label: 'Custom & Webhooks', value: 'custom' },
  ];

  const filtered = connections.filter((c) => {
    const matchesCat = selectedCategory === 'all' || c.provider?.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.provider_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.external_account_name && c.external_account_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleTest = async (conn: IntegrationConnection) => {
    setTestingId(conn.id);
    try {
      const res = await integrationApi.testConnection(conn.id, undefined, user);
      if (res.success) {
        showToast(`Connection to "${conn.name}" is healthy (${res.latency_ms}ms)`, 'success');
      } else {
        showToast(`Connection test failed: ${res.message}`, 'error');
      }
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      showToast(msg, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (conn: IntegrationConnection) => {
    setSyncingId(conn.id);
    try {
      const res = await integrationApi.triggerSync(conn.id, 'manual', user);
      showToast(`Sync completed for "${conn.name}". Processed ${res.records_processed} records.`, 'success');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      showToast(msg, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleDisconnect = async (conn: IntegrationConnection) => {
    setActionId(conn.id);
    try {
      if (conn.status === 'connected') {
        await integrationApi.disconnectConnection(conn.id, user);
        showToast(`Disconnected "${conn.name}".`, 'info');
      } else {
        await integrationApi.reconnectConnection(conn.id, user);
        showToast(`Reconnected "${conn.name}".`, 'success');
      }
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (conn: IntegrationConnection) => {
    if (!window.confirm(`Are you sure you want to permanently remove the integration connection "${conn.name}"? Encrypted credentials and webhook listeners will be revoked.`)) {
      return;
    }
    setActionId(conn.id);
    try {
      await integrationApi.deleteConnection(conn.id, user);
      showToast(`Deleted connection "${conn.name}".`, 'success');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    } finally {
      setActionId(null);
    }
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search active connections..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Connections List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
          Loading active integration connections...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <ProviderIcon providerKey="generic_webhook" className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No active connections found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? 'No connections match your current search and category filters.'
              : 'You have not configured any external integration connections yet. Browse the Provider Catalog to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((conn) => {
            const isConnTesting = testingId === conn.id;
            const isConnSyncing = syncingId === conn.id;
            const isConnActing = actionId === conn.id;
            const isHealthy = conn.health_status === 'healthy' && conn.status === 'connected';

            return (
              <Card
                key={conn.id}
                className={`border transition-all duration-200 bg-white hover:shadow-md ${
                  conn.status === 'disconnected'
                    ? 'border-slate-200 opacity-75'
                    : isHealthy
                    ? 'border-slate-200 hover:border-indigo-200'
                    : 'border-rose-200'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                        <ProviderIcon
                          iconName={conn.provider?.icon_name}
                          providerKey={conn.provider_key}
                          className="w-5 h-5 text-indigo-600"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{conn.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium uppercase px-1.5 py-0.5 ${
                              conn.status === 'connected'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {conn.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {conn.provider?.name} &bull; {conn.external_account_name || conn.external_account_id || 'Primary Account'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          conn.status === 'disconnected'
                            ? 'bg-slate-400'
                            : isHealthy
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                        }`}
                        title={conn.health_message || conn.health_status}
                      />
                    </div>
                  </div>

                  {/* Health or Error Notification */}
                  {conn.health_message && (
                    <div
                      className={`mt-3 text-[11px] p-2 rounded-md flex items-start gap-1.5 ${
                        isHealthy
                          ? 'bg-slate-50 text-slate-600 border border-slate-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isHealthy ? (
                        <Zap className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 flex-shrink-0" />
                      )}
                      <span className="truncate">{conn.health_message}</span>
                    </div>
                  )}

                  {/* Telemetry Footnote */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Last sync: {formatTimestamp(conn.last_sync_at)}</span>
                    </div>
                    <div className="font-mono text-slate-400 text-[10px]">
                      Auth: {conn.auth_type}
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="mt-3 flex items-center justify-between gap-1 flex-wrap pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(conn)}
                        disabled={isConnTesting || isConnActing}
                        className="h-7 text-[11px] px-2.5 text-slate-700"
                        title="Run connection connectivity probe"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isConnTesting ? 'animate-spin' : ''}`} />
                        Test
                      </Button>

                      {conn.provider?.capabilities?.sync && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(conn)}
                          disabled={isConnSyncing || conn.status !== 'connected'}
                          className="h-7 text-[11px] px-2.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          title="Trigger synchronization job"
                        >
                          <Play className={`w-3 h-3 mr-1 ${isConnSyncing ? 'animate-spin' : ''}`} />
                          Sync Now
                        </Button>
                      )}

                      {conn.provider_key === 'custom_api' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenRestPlayground(conn)}
                          className="h-7 text-[11px] px-2.5 text-teal-700 border-teal-200 hover:bg-teal-50"
                          title="Open Interactive REST API Runner"
                        >
                          <Terminal className="w-3 h-3 mr-1" />
                          REST Runner
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(conn)}
                        className="h-7 text-[11px] px-2 text-slate-600 hover:text-slate-900"
                      >
                        <Sliders className="w-3 h-3 mr-1" />
                        Configure
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleDisconnect(conn)}
                        disabled={isConnActing}
                        className={`h-7 text-[11px] px-2 ${
                          conn.status === 'connected' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                        title={conn.status === 'connected' ? 'Disconnect this integration' : 'Reconnect this integration'}
                      >
                        <Power className="w-3 h-3 mr-1" />
                        {conn.status === 'connected' ? 'Pause' : 'Resume'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(conn)}
                        disabled={isConnActing}
                        className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700"
                        title="Permanently remove connection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
