// src/app/pages/ai/AiInsightsPage.tsx
// Phase 40: Proactive Enterprise AI Operational Insights

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Eye,
  Check,
  X,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AiInsight } from '../../../server/ai-insights-service.ts';

export function AiInsightsPage() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai/insights?status=${statusFilter}`);
      if (res.ok) {
        setInsights(await res.json());
      }
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/ai/insights/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadInsights();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const getSeverityPill = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OPPORTUNITY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Operational Insights</h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Continuous Anomaly Detection
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Proactive intelligence detecting safety buffer depletion, distributor payment stretch, ad fatigue, and yield anomalies.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === s ? 'bg-slate-900 text-white font-bold' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Scanning anomaly logs...</div>
        ) : insights.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">No active anomalies detected</h3>
            <p className="text-xs text-slate-500 mt-1">All operational telemetry is adhering to nominal thresholds.</p>
          </div>
        ) : (
          insights.map((ins) => {
            const isExp = expandedId === ins.id;
            return (
              <div
                key={ins.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getSeverityPill(ins.severity)}`}>
                        {ins.severity}
                      </span>
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {ins.insight_type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(ins.detected_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{ins.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{ins.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    {ins.status === 'NEW' && (
                      <button
                        onClick={() => updateStatus(ins.id, 'ACKNOWLEDGED')}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    {ins.status !== 'RESOLVED' && (
                      <button
                        onClick={() => updateStatus(ins.id, 'RESOLVED')}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExp ? null : ins.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Inspect evidence details"
                    >
                      {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Evidence Drawer */}
                {isExp && ins.evidence_data && (
                  <div className="px-5 pb-5 pt-2 bg-slate-50/75 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Underlying Telemetry Evidence
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(ins.evidence_data).map(([k, v]) => (
                        <div key={k} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                          <span className="text-[10px] text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <div className="font-bold text-slate-900 mt-0.5 font-mono">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
