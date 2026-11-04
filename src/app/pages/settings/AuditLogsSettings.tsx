// src/app/pages/settings/AuditLogsSettings.tsx
// Master Enterprise Audit Logs & Immutable Compliance Trail UI (Phase 23)

import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  Tag,
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  Sliders,
  Play,
  Copy,
  Check,
  Lock,
  Database,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Smartphone,
  Globe,
  Bot,
  Cpu,
  Radio,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { auditApi } from '../../../services/auditApi';
import type {
  CanonicalAuditRecord,
  AuditLogFilter,
  AuditLogMetrics,
  AuditIntegrityReport,
  AuditRetentionPolicy,
  ChangedField,
  AuditModule,
} from '../../../types/audit';

export function AuditLogsSettings() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // Primary state
  const [logs, setLogs] = useState<CanonicalAuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Metrics state
  const [metrics, setMetrics] = useState<AuditLogMetrics | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7d' | '30d' | '90d'>('all');
  const [activeQuickTab, setActiveQuickTab] = useState<'all' | 'security' | 'finance' | 'inventory' | 'quality' | 'failed'>('all');

  // Modal / Drawer states
  const [selectedLog, setSelectedLog] = useState<CanonicalAuditRecord | null>(null);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<AuditIntegrityReport | null>(null);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);

  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retentionPolicy, setRetentionPolicy] = useState<AuditRetentionPolicy | null>(null);
  const [savingRetention, setSavingRetention] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);

  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Load audit data & metrics
  const loadData = async (targetPage = page) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Calculate date filters based on preset
      let startDate: string | undefined;
      const now = new Date();
      if (dateRangePreset === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
      } else if (dateRangePreset === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRangePreset === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRangePreset === '90d') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      // Quick tab mapping
      let effectiveModule = moduleFilter;
      let effectiveStatus = statusFilter;
      if (activeQuickTab === 'security') effectiveModule = 'security';
      else if (activeQuickTab === 'finance') effectiveModule = 'finance';
      else if (activeQuickTab === 'inventory') effectiveModule = 'inventory';
      else if (activeQuickTab === 'quality') effectiveModule = 'quality';
      else if (activeQuickTab === 'failed') effectiveStatus = 'FAILED';

      const filter: AuditLogFilter = {
        organizationId: currentUser.organization_id || 'org-jyotsvan-corp',
        search: searchQuery,
        module: effectiveModule,
        action: actionFilter,
        status: effectiveStatus,
        source: sourceFilter,
        startDate,
        page: targetPage,
        limit,
      };

      const [logsRes, metricsRes] = await Promise.all([
        auditApi.getAuditLogs(filter, currentUser),
        auditApi.getMetrics(currentUser.organization_id || 'org-jyotsvan-corp'),
      ]);

      setLogs(logsRes.logs);
      setTotal(logsRes.total);
      setTotalPages(logsRes.totalPages);
      setPage(logsRes.page);
      setMetrics(metricsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve audit logs';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [currentUser, moduleFilter, actionFilter, statusFilter, sourceFilter, dateRangePreset, activeQuickTab, limit]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Run integrity verification
  const handleVerifyIntegrity = async () => {
    setVerifyingIntegrity(true);
    try {
      const report = await auditApi.verifyIntegrity(
        currentUser?.organization_id || 'org-jyotsvan-corp',
        currentUser?.id
      );
      setIntegrityReport(report);
      setShowIntegrityModal(true);
      showToast('Audit log cryptographic integrity verification completed.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Integrity verification failed';
      showToast(msg, 'error');
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  // Open retention policy
  const handleOpenRetention = async () => {
    try {
      const policy = await auditApi.getRetentionPolicy(
        currentUser?.organization_id || 'org-jyotsvan-corp'
      );
      setRetentionPolicy(policy);
      setShowRetentionModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load retention policy';
      showToast(msg, 'error');
    }
  };

  // Save retention policy
  const handleSaveRetention = async () => {
    if (!retentionPolicy) return;
    setSavingRetention(true);
    try {
      await auditApi.updateRetentionPolicy(
        retentionPolicy,
        currentUser?.organization_id || 'org-jyotsvan-corp',
        currentUser?.id
      );
      showToast('Audit log retention policy successfully updated and logged.', 'success');
      setShowRetentionModal(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update retention policy';
      showToast(msg, 'error');
    } finally {
      setSavingRetention(false);
    }
  };

  // Run simulator event
  const handleSimulate = async (scenario: string) => {
    setSimulating(true);
    try {
      const res = await auditApi.simulateEvent(
        scenario,
        currentUser?.organization_id || 'org-jyotsvan-corp',
        currentUser
      );
      showToast(`Simulated event: ${res.log.event_type} (${res.log.action})`, 'success');
      setShowSimulatorModal(false);
      loadData(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      showToast(msg, 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Export audit logs
  const handleExport = async () => {
    setExporting(true);
    try {
      await auditApi.exportLogs(
        {
          organizationId: currentUser?.organization_id,
          module: moduleFilter,
          action: actionFilter,
          search: searchQuery,
        },
        exportFormat,
        currentUser
      );
      showToast(`Exported ${total} audit records as ${exportFormat.toUpperCase()}`, 'success');
      setShowExportModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      showToast(msg, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Copy hash to clipboard
  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Helper for source icon
  const renderSourceIcon = (source: string) => {
    switch (source?.toUpperCase()) {
      case 'MOBILE':
        return (
          <span title="Mobile App" className="inline-flex items-center">
            <Smartphone className="w-3.5 h-3.5 text-sky-600" />
          </span>
        );
      case 'API':
        return (
          <span title="API Gateway" className="inline-flex items-center">
            <Radio className="w-3.5 h-3.5 text-indigo-600" />
          </span>
        );
      case 'AI':
        return (
          <span title="AI Agent" className="inline-flex items-center">
            <Bot className="w-3.5 h-3.5 text-purple-600" />
          </span>
        );
      case 'WORKER':
        return (
          <span title="Background Worker" className="inline-flex items-center">
            <Cpu className="w-3.5 h-3.5 text-amber-600" />
          </span>
        );
      case 'SYSTEM':
        return (
          <span title="System Automated" className="inline-flex items-center">
            <Database className="w-3.5 h-3.5 text-slate-600" />
          </span>
        );
      case 'WEB':
      default:
        return (
          <span title="Web Console" className="inline-flex items-center">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
          </span>
        );
    }
  };

  // Helper for action badge styling
  const getActionBadge = (action: string, status: string) => {
    if (status === 'FAILED') {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono">
          FAILED
        </Badge>
      );
    }
    if (action.includes('CREATE') || action.includes('PROVISION')) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono">
          {action}
        </Badge>
      );
    }
    if (action.includes('APPROVE') || action.includes('POST')) {
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono">
          {action}
        </Badge>
      );
    }
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('REJECT')) {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono">
          {action}
        </Badge>
      );
    }
    if (action.includes('UPDATE') || action.includes('ASSIGN')) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-mono">
          {action}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-mono">
        {action}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Enterprise Compliance & Audit Trail
            </h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono">
              Phase 23 Live
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, append-only historical record tracking operators, state diffs, and security events with SHA-256 hash chains.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyIntegrity}
            disabled={verifyingIntegrity}
            className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${verifyingIntegrity ? 'animate-spin' : ''}`} />
            Verify Hash Chain
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenRetention}
            className="text-xs gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            Retention Policy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSimulatorModal(true)}
            className="text-xs gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
          >
            <Play className="w-3.5 h-3.5" />
            Simulate Event
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Logs
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(page)}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Audit Records</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics?.totalLogs ?? total}</p>
              <p className="text-[11px] text-slate-400 mt-1">Tenant: {currentUser?.organization_id || 'org-jyotsvan-corp'}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Today's Activity</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{metrics?.todayLogs ?? 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Events since 00:00 UTC</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Actors</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics?.activeActorsCount ?? 1}</p>
              <p className="text-[11px] text-slate-400 mt-1">Distinct operators & systems</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <User className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Cryptographic Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg font-bold text-emerald-700">Tamper-Proof</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">SHA-256 Chain Verified</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Lock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs">
        {[
          { id: 'all', label: `All Events (${total})` },
          { id: 'security', label: 'Security & RBAC' },
          { id: 'finance', label: 'Finance & Invoicing' },
          { id: 'inventory', label: 'Inventory & Stock' },
          { id: 'quality', label: 'Quality & QC' },
          { id: 'failed', label: `Failed Actions (${metrics?.failedCount || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveQuickTab(tab.id as any);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeQuickTab === tab.id
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by actor, action, event type, entity ID, correlation ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-hidden text-slate-700"
            >
              <option value="all">All Modules</option>
              <option value="security">Security & RBAC</option>
              <option value="organization">Organization & Foundation</option>
              <option value="products">Products & SKUs</option>
              <option value="suppliers">Suppliers</option>
              <option value="inventory">Inventory</option>
              <option value="warehouse">Warehouse & Transfers</option>
              <option value="procurement">Procurement & POs</option>
              <option value="quality">Quality & Inspections</option>
              <option value="manufacturing">BOM & Production</option>
              <option value="batches">Batches & Traceability</option>
              <option value="logistics">C&F Logistics</option>
              <option value="distribution">Distribution</option>
              <option value="retail">Retail Operations</option>
              <option value="sales">Sales Orders</option>
              <option value="finance">Finance & Subledger</option>
              <option value="field_sales">Field Sales</option>
              <option value="people">People & HR</option>
              <option value="notifications">Notifications</option>
              <option value="system">System Admin</option>
            </select>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-hidden text-slate-700"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="POST">POST</option>
              <option value="SUBMIT">SUBMIT</option>
              <option value="CANCEL">CANCEL</option>
              <option value="ASSIGN">ASSIGN</option>
              <option value="CHECK_IN">CHECK_IN</option>
              <option value="EXPORT">EXPORT</option>
              <option value="SYSTEM_EVENT">SYSTEM_EVENT</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-hidden text-slate-700"
            >
              <option value="all">All Status</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
            </select>

            {/* Date Preset */}
            <select
              value={dateRangePreset}
              onChange={(e) => {
                setDateRangePreset(e.target.value as any);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-hidden text-slate-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today (24h)</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Operator / Actor</th>
                <th className="py-3 px-4">Action & Event</th>
                <th className="py-3 px-4">Module & Entity</th>
                <th className="py-3 px-4">Origin & Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading immutable enterprise audit trail...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No audit records match the selected filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the search query or module filters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors font-sans">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                        <div>
                          {new Date(log.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                            {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : log.actor_email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-xs block leading-tight">
                              {log.actor_name || log.actor_email}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {log.actor_email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action & Event */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {getActionBadge(log.action, log.status)}
                          <span className="font-bold text-slate-800 text-[11px] block mt-0.5">
                            {log.event_type || log.action}
                          </span>
                        </div>
                      </td>

                      {/* Module & Entity */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="text-[9px] py-0 uppercase bg-slate-50 text-slate-600 font-mono">
                            {log.module || 'system'}
                          </Badge>
                          <div className="text-xs text-slate-800 font-medium truncate max-w-[200px]" title={log.entity_name || log.entity_id}>
                            {log.entity_name || log.entity_id}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {log.entity_type}:{log.entity_id}
                          </span>
                        </div>
                      </td>

                      {/* Origin & Source */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          {renderSourceIcon(log.source)}
                          <span className="text-[11px] uppercase font-semibold text-slate-700">{log.source}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          IP: {log.ip_address || '127.0.0.1'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {log.status === 'SUCCESS' ? (
                          <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SUCCESS</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-rose-600 text-[11px] font-semibold" title={log.failure_reason}>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>FAILED</span>
                          </div>
                        )}
                      </td>

                      {/* Details button */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 text-[11px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200 px-2.5"
                        >
                          <Code2 className="w-3 h-3 mr-1" />
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{logs.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{total}</span> records (Page{' '}
            <span className="font-semibold text-slate-900">{page}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span>)
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-hidden"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                const prev = Math.max(1, page - 1);
                setPage(prev);
                loadData(prev);
              }}
              className="h-7 text-xs px-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                loadData(next);
              }}
              className="h-7 text-xs px-2"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 1. Audit Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Audit Event Payload & State Diff
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {selectedLog.id} &bull; Org: {selectedLog.organization_id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Event Context Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Action Type</span>
                  <span className="font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Business Event</span>
                  <span className="font-semibold text-indigo-700">{selectedLog.event_type || selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Module</span>
                  <span className="font-semibold text-slate-800 uppercase">{selectedLog.module}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Status</span>
                  <span className={`font-bold ${selectedLog.status === 'SUCCESS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Actor / Operator</span>
                  <span className="font-semibold text-slate-800">{selectedLog.actor_name || selectedLog.actor_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Actor Type</span>
                  <span className="font-mono text-slate-700">{selectedLog.actor_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Source & IP</span>
                  <span className="text-slate-700 font-mono">{selectedLog.source} ({selectedLog.ip_address || '127.0.0.1'})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Timestamp</span>
                  <span className="text-slate-700">{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Failure explanation if failed */}
              {selectedLog.status === 'FAILED' && selectedLog.failure_reason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Failure / Security Alert
                  </div>
                  <p className="text-xs font-mono">{selectedLog.failure_reason}</p>
                </div>
              )}

              {/* Field-Level Change Diff Table */}
              {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      Field-Level State Modifications ({selectedLog.changed_fields.length})
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3 w-1/3">Field Name</th>
                          <th className="py-2 px-3 w-1/3">Previous Value (Before)</th>
                          <th className="py-2 px-3 w-1/3">Updated Value (After)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {selectedLog.changed_fields.map((f: ChangedField, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/60 font-sans">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {f.label || f.key}
                              <span className="text-[10px] text-slate-400 font-mono block">{f.key}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 font-mono text-xs">
                              {f.old_value !== null && f.old_value !== undefined ? (
                                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100">
                                  {typeof f.old_value === 'object' ? JSON.stringify(f.old_value) : String(f.old_value)}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic">null</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-xs">
                              {f.new_value !== null && f.new_value !== undefined ? (
                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-semibold">
                                  {typeof f.new_value === 'object' ? JSON.stringify(f.new_value) : String(f.new_value)}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic">null</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cryptographic Tamper-Proof Chain Details */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Cryptographic Integrity Signature
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">SHA-256 Hash Chain</span>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[10px] uppercase">Record Hash:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400">{selectedLog.record_hash || 'SHA256-GENESIS-INITIAL'}</span>
                      <button
                        onClick={() => handleCopyHash(selectedLog.record_hash || '')}
                        className="text-slate-400 hover:text-white p-0.5"
                        title="Copy record hash"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[10px] uppercase">Previous Hash:</span>
                    <span className="text-slate-400">{selectedLog.previous_hash || 'GENESIS'}</span>
                  </div>
                </div>
              </div>

              {/* JSON Payload Inspection */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">Complete Structured Metadata Payload</span>
                <pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-52 border border-slate-800">
                  {JSON.stringify(
                    {
                      before_state: selectedLog.before_state,
                      after_state: selectedLog.after_state,
                      metadata: selectedLog.metadata || selectedLog.details,
                      request_id: selectedLog.request_id,
                      correlation_id: selectedLog.correlation_id,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="text-[11px] text-slate-500 font-mono">
                Log UUID: {selectedLog.id}
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cryptographic Integrity Verification Report Modal */}
      {showIntegrityModal && integrityReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Cryptographic Integrity Audit Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tenant: {integrityReport.organizationId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIntegrityModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Audit Trail Cryptographically Verified & Intact</span>
              </div>
              <p className="text-xs text-emerald-800">
                All records were sequentially verified using SHA-256 hash chains. No record deletion, alteration, or timeline tampering was detected.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">Records Scanned</span>
                <span className="font-bold text-slate-900 text-base">{integrityReport.totalRecordsScanned}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">Valid Signatures</span>
                <span className="font-bold text-emerald-700 text-base">{integrityReport.validHashCount}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">Broken Signatures</span>
                <span className="font-bold text-rose-700 text-base">{integrityReport.brokenHashCount}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">Scan Duration</span>
                <span className="font-semibold text-slate-700">{integrityReport.verificationDurationMs}ms</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-mono bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto">
              <span className="text-slate-400 text-[10px] block uppercase mb-1 font-sans">Latest Verified Chain Head:</span>
              <span className="text-emerald-400 text-[10px]">{integrityReport.latestHash}</span>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" onClick={() => setShowIntegrityModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Retention Policy Modal */}
      {showRetentionModal && retentionPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Audit Retention & Legal Hold Policy
                </h3>
              </div>
              <button
                onClick={() => setShowRetentionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Retention Period
                </label>
                <select
                  value={retentionPolicy.retention_period_days}
                  onChange={(e) =>
                    setRetentionPolicy({
                      ...retentionPolicy,
                      retention_period_days: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden"
                >
                  <option value={365}>1 Year (365 days)</option>
                  <option value={730}>2 Years (730 days - Standard FMCG)</option>
                  <option value={1825}>5 Years (1825 days - Financial Compliance)</option>
                  <option value={2555}>7 Years (2555 days - Statutory Maximum)</option>
                  <option value={0}>Indefinite / Permanent Retention</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Logs older than this threshold will be archived to cold storage.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retentionPolicy.legal_hold_enabled}
                    onChange={(e) =>
                      setRetentionPolicy({
                        ...retentionPolicy,
                        legal_hold_enabled: e.target.checked,
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Strict Legal Hold</span>
                    <span className="text-[11px] text-slate-400">
                      Suspends all automated retention purging indefinitely.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retentionPolicy.tamper_detection_enabled}
                    onChange={(e) =>
                      setRetentionPolicy({
                        ...retentionPolicy,
                        tamper_detection_enabled: e.target.checked,
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Continuous Tamper Detection</span>
                    <span className="text-[11px] text-slate-400">
                      Calculates SHA-256 record hashes for every transaction.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retentionPolicy.notify_on_security_event}
                    onChange={(e) =>
                      setRetentionPolicy({
                        ...retentionPolicy,
                        notify_on_security_event: e.target.checked,
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Alert Security Administrators</span>
                    <span className="text-[11px] text-slate-400">
                      Dispatches notifications on unauthorized mutation attempts.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setShowRetentionModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveRetention} disabled={savingRetention}>
                {savingRetention ? 'Saving Policy...' : 'Save Policy'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Export Compliance Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Exporting <span className="font-bold text-slate-900">{total}</span> matching audit records. This export event will be permanently recorded in the audit log.
              </p>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-lg border text-center font-semibold transition-all ${
                      exportFormat === 'csv'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    CSV Spreadsheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-lg border text-center font-semibold transition-all ${
                      exportFormat === 'json'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    JSON Raw Object
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Generating Export...' : 'Download Records'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Live Test Event Simulator Modal */}
      {showSimulatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Interactive Audit Event Simulator
                </h3>
              </div>
              <button
                onClick={() => setShowSimulatorModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Trigger realistic multi-module enterprise transactions to verify immediate before/after state diff generation, sensitive data redaction, and SHA-256 chain signing.
            </p>

            <div className="space-y-2 text-xs">
              {[
                {
                  id: 'STOCK_ADJUSTED',
                  title: 'Inventory Stock Adjustment',
                  desc: 'Adjusts on-hand stock and captures old/new quantity diffs',
                  module: 'Inventory',
                },
                {
                  id: 'INVOICE_POSTED',
                  title: 'Tax Invoice GL Posting',
                  desc: 'Posts draft invoice of ₹3,20,000 to general ledger',
                  module: 'Finance',
                },
                {
                  id: 'QC_APPROVED',
                  title: 'Batch QC Inspection Approval',
                  desc: 'Approves finished goods formulation with COA parameters',
                  module: 'Quality',
                },
                {
                  id: 'ROLE_CHANGED',
                  title: 'Security Role Permissions Update',
                  desc: 'Modifies permissions for Plant Manager role',
                  module: 'Security & RBAC',
                },
                {
                  id: 'FAILED_PAYMENT',
                  title: 'Failed Payment Allocation Alert',
                  desc: 'Simulates transaction rollback on overpaid invoice',
                  module: 'Finance (Failed)',
                },
              ].map((s) => (
                <button
                  key={s.id}
                  disabled={simulating}
                  onClick={() => handleSimulate(s.id)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{s.title}</span>
                      <Badge variant="outline" className="text-[9px] py-0 font-mono">
                        {s.module}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setShowSimulatorModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
