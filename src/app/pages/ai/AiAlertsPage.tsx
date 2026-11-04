// src/app/pages/ai/AiAlertsPage.tsx
// Phase 41-42: Enterprise AI Anomaly Alerts & Human-in-the-Loop Controlled Actions

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';
import type { AiControlledAction } from '../../../server/ai-actions-service.ts';

export function AiAlertsPage() {
  const [actions, setActions] = useState<AiControlledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<AiControlledAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai/actions${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setActions(data);
      }
    } catch (err) {
      console.error('Failed to load AI actions/alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/ai/actions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to approve action:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExecute = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/ai/actions/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedAction) return;
    try {
      setProcessingId(selectedAction.id);
      const res = await fetch(`/api/ai/actions/${selectedAction.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || 'Declined by enterprise governance manager.' }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedAction(null);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to reject action:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = actions.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.title.toLowerCase().includes(term) ||
      a.description.toLowerCase().includes(term) ||
      a.action_type.toLowerCase().includes(term)
    );
  });

  const pendingCount = actions.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'PROPOSED').length;
  const highRiskCount = actions.filter((a) => a.risk_level === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">AI Anomaly Alerts & Controlled Actions</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Human-in-the-Loop Governed
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Proactive operational safety sentinel detecting supply variances, scrap deviations, and high-risk inventory transactions. Requires explicit human validation before enterprise ERP ledger mutation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <div className="text-xs text-slate-400 font-medium">Pending Approvals</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Awaiting supervisor sign-off</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">High Risk Alerts</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">{highRiskCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Strict multi-tier review</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Executed Safely</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {actions.filter((a) => a.status === 'EXECUTED').length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Audit logged & verifiable</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Policy Compliance</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">100%</div>
            <div className="text-xs text-slate-500 mt-0.5">Zero unapproved writes</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search anomalies or action types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Action Queue List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-400" />
            <p className="text-sm font-medium">Querying Enterprise AI Anomaly Sentinel...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
            <p className="text-sm font-medium text-slate-300">No anomalies or actions match criteria.</p>
            <p className="text-xs text-slate-500 mt-1">All enterprise production lines and commercial metrics operating normally.</p>
          </div>
        ) : (
          filtered.map((action) => {
            const isPending = action.status === 'PENDING_APPROVAL' || action.status === 'PROPOSED';
            const isApproved = action.status === 'APPROVED';
            const isExecuted = action.status === 'EXECUTED';
            const isRejected = action.status === 'REJECTED';

            return (
              <div
                key={action.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          action.risk_level === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : action.risk_level === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {action.risk_level} Risk
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                          isExecuted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isApproved
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {action.status.replace('_', ' ')}
                      </span>

                      <span className="text-xs text-slate-500 font-mono">
                        {action.action_type}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white tracking-tight">{action.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{action.description}</p>

                    {/* Metadata payload drilldown */}
                    {action.payload && Object.keys(action.payload).length > 0 && (
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-400 font-mono flex flex-wrap gap-x-4 gap-y-1">
                        {Object.entries(action.payload).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-slate-500">{k}:</span>{' '}
                            <span className="text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {action.rejection_reason && (
                      <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
                        Rejection reason: {action.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Actions / Decision Controls */}
                  <div className="flex items-center space-x-2.5 lg:self-center">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(action.id)}
                          disabled={processingId === action.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAction(action);
                            setShowRejectModal(true);
                          }}
                          disabled={processingId === action.id}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => handleExecute(action.id)}
                        disabled={processingId === action.id}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Execute Now</span>
                      </button>
                    )}

                    {isExecuted && (
                      <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ledger Mutated</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Decline Proposed Action</h3>
            <p className="text-xs text-slate-400">
              Provide governance justification for declining action: <strong className="text-white">{selectedAction.title}</strong>
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Supplier agreed to waive penalty; buffer is adequate."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedAction(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
