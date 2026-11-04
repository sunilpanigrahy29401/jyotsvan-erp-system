// src/app/pages/ai/AiRecommendationsPage.tsx
// Phase 41: Prescriptive Enterprise AI Recommendations Workspace

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import type { AiRecommendation } from '../../../server/ai-recommendations-service.ts';

export function AiRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/recommendations');
      if (res.ok) {
        setRecommendations(await res.json());
      }
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = async (id: string, status: string) => {
    try {
      await fetch(`/api/ai/recommendations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const handleProposeAction = async (rec: AiRecommendation) => {
    try {
      const res = await fetch('/api/ai/actions/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: rec.action_type || 'AI_RECOMMENDED_MUTATION',
          title: rec.title,
          description: rec.recommendation_text,
          riskLevel: rec.category === 'INVENTORY' || rec.category === 'MANUFACTURING' ? 'HIGH' : 'MEDIUM',
          payload: rec.evidence_json,
          proposedBy: 'AI_RECOMMENDATION',
        }),
      });
      if (res.ok) {
        alert('Action proposed to Controlled Actions Workbench! Requires executive authorization before mutation.');
        await handleUpdate(rec.id, 'APPROVED');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to propose action');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Recommendations</h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Prescriptive Optimizations
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted recommendations with evidence models, expected commercial impact, and confidence rankings.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Evaluating prescriptive models...</div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-xs text-slate-500">
            No pending recommendations.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                    {rec.category}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-indigo-600">
                    Confidence: {Math.round(rec.confidence_score * 100)}%
                  </span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  rec.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                  rec.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {rec.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                <p className="text-xs text-slate-600 mt-1">
                  <span className="font-semibold text-slate-700">Problem:</span> {rec.problem_statement}
                </p>
              </div>

              {/* Recommendation Callout */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs">
                <div className="font-bold text-indigo-900 mb-1">Prescribed Action:</div>
                <div className="text-indigo-800 leading-relaxed">{rec.recommendation_text}</div>
                <div className="mt-2.5 pt-2 border-t border-indigo-100 flex items-center justify-between font-semibold text-indigo-950">
                  <span>Expected Impact:</span>
                  <span className="text-emerald-700 font-bold">{rec.expected_impact}</span>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUpdate(rec.id, 'APPROVED')}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-emerald-600"
                    title="Mark Helpful"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleUpdate(rec.id, 'REJECTED')}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600"
                    title="Dismiss"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>

                {rec.status === 'PENDING' && (
                  <button
                    onClick={() => handleProposeAction(rec)}
                    className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
                  >
                    <span>Propose Controlled Action</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
