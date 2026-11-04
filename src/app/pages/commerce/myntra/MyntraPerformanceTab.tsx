// src/app/pages/commerce/myntra/MyntraPerformanceTab.tsx
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';
import type { MyntraPerformanceMetric } from '../../../../types/myntra.ts';

export function MyntraPerformanceTab() {
  const [metrics, setMetrics] = useState<MyntraPerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await myntraApi.getPerformance();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Brand Partner Tier Card */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-6 h-6 text-amber-200" />
            <h2 className="text-lg font-bold">Tier 1 Brand Partner Status Active</h2>
          </div>
          <p className="text-xs text-pink-100 mt-1 max-w-xl">
            Jyotsvan Organics maintains top-quartile SLA dispatch compliance across Pure Play Marketplace Partner (PPMP) channels, qualifying for prime brand placement and reduced dispute deductibles.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 text-center border border-white/20">
          <div className="text-2xl font-bold">99.4%</div>
          <div className="text-[11px] text-pink-100 uppercase tracking-wider">Overall Dispatch SLA</div>
        </div>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="p-8 text-xs text-slate-500 col-span-3 text-center">Loading performance metrics...</div>
        ) : (
          metrics.map((m) => (
            <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.metric_category}</span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                  {m.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">{m.metric_name}</h3>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">
                  {m.current_value} {m.unit}
                </span>
                <span className="text-xs text-slate-500">
                  Benchmark: &lt; {m.benchmark_target} {m.unit}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Evaluation Period: Last 30 rolling days
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
