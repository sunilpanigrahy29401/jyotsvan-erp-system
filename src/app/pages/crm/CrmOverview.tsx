// src/app/pages/crm/CrmOverview.tsx
// CRM Command Center: Pipeline Velocity, Funnel Conversion, Forecast & Follow-ups

import { useState, useEffect } from 'react';
import { 
  Users, UserCheck, TrendingUp, DollarSign, Target, Clock, AlertTriangle, 
  ArrowUpRight, Plus, Calendar, Filter, PhoneCall, RefreshCw, Layers
} from 'lucide-react';
import { CrmApi } from '../../../services/crmApi.ts';
import type { CrmDashboardMetrics } from '../../../types/crm.ts';

interface CrmOverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenCreateLead: () => void;
}

export function CrmOverview({ onNavigateTab, onOpenCreateLead }: CrmOverviewProps) {
  const [metrics, setMetrics] = useState<CrmDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CrmApi.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load CRM telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-500 mr-2" />
        <span className="text-sm text-slate-500">Loading CRM Command Center telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Commercial Cockpit & Pipeline Velocity</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated telemetry across B2B clients, institutional deals, and channel partner onboarding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1.5 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenCreateLead}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Capture Lead</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab('leads')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Active Leads</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{metrics?.total_leads || 0}</div>
          <div className="mt-1 flex items-center text-[11px] text-emerald-600 font-medium">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            <span>+{metrics?.new_leads_month || 0} new this month</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('leads')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Qualified Inquiries</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><UserCheck className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{metrics?.qualified_leads || 0}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            Conversion Rate: <span className="font-semibold text-slate-800">{metrics?.conversion_rate_percent || 0}%</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('deals')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Pipeline Value</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><DollarSign className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(metrics?.total_pipeline_value || 0)}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across <span className="font-semibold text-slate-800">{metrics?.active_deals_count || 0}</span> open deals
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('deals')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Weighted Forecast</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Target className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(metrics?.weighted_forecast_value || 0)}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            Won this month: {formatCurrency(metrics?.won_deals_month_value || 0)}
          </div>
        </div>
      </div>

      {/* Pipeline Stage Breakdown & Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Pipeline Progression */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">B2B Deal Pipeline Progression</h3>
              <p className="text-xs text-slate-500">Active deal volume and potential revenue per stage</p>
            </div>
            <button 
              onClick={() => onNavigateTab('deals')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <span>View Kanban</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {metrics?.deals_by_stage && metrics.deals_by_stage.length > 0 ? (
              metrics.deals_by_stage.map((stg, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {stg.stage}
                      <span className="text-[10px] text-slate-400 font-normal">({stg.probability}% win probability)</span>
                    </span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900">{formatCurrency(stg.value)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({stg.count} deals)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, (stg.value / (metrics?.total_pipeline_value || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">No active deals in pipeline.</div>
            )}
          </div>
        </div>

        {/* Lead Ingestion Sources */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Lead Ingestion Channels</h3>
            <button 
              onClick={() => onNavigateTab('integrations')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Configure
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics?.leads_by_source && metrics.leads_by_source.length > 0 ? (
              metrics.leads_by_source.map((src, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="truncate pr-2">
                    <div className="text-xs font-semibold text-slate-800 truncate">{src.source}</div>
                    <div className="text-[10px] text-slate-500">Value: {formatCurrency(src.value)}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-white text-slate-700 text-xs font-bold rounded border border-slate-200">
                    {src.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">No lead sources tracked yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Section: Action Items & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Follow-ups & Reminders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Upcoming Follow-ups & Actions</span>
            </h3>
            <button 
              onClick={() => onNavigateTab('activities')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics?.upcoming_followups && metrics.upcoming_followups.length > 0 ? (
              metrics.upcoming_followups.map((act) => (
                <div key={act.id} className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-lg flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-900">{act.subject}</div>
                    <div className="text-[11px] text-slate-600 line-clamp-1">{act.description || 'No additional notes recorded.'}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span className="capitalize font-medium text-amber-700">{act.activity_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>Owner: {act.assigned_employee_name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded shrink-0">
                    {act.due_date ? new Date(act.due_date).toLocaleDateString() : 'Due Today'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">No pending follow-ups. All caught up!</div>
            )}
          </div>
        </div>

        {/* Recent CRM Activities Timeline */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Recent Customer Engagement</span>
            </h3>
            <button 
              onClick={() => onNavigateTab('activities')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Activity Log
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics?.recent_activities && metrics.recent_activities.length > 0 ? (
              metrics.recent_activities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600">
                      <PhoneCall className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{act.subject}</div>
                      <div className="text-[10px] text-slate-500">
                        {act.assigned_employee_name || 'Representative'} • {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${act.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {act.is_completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">No recent customer interactions recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
