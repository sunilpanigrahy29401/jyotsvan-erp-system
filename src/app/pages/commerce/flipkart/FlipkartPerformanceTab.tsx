// src/app/pages/commerce/flipkart/FlipkartPerformanceTab.tsx
// Phase 32: Flipkart Seller Performance & Service Quality Benchmarks Tab

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Award,
  Star,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';
import type { FlipkartPerformanceMetric } from '../../../../types/flipkart.ts';

export function FlipkartPerformanceTab() {
  const [metrics, setMetrics] = useState<FlipkartPerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await flipkartApi.getPerformance();
      setMetrics(res.metrics || []);
    } catch (err) {
      console.error('Error fetching Flipkart performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  return (
    <div className="space-y-6">
      {/* Tier & Health Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold">Flipkart Gold Seller Status</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-bold text-[11px]">
                  Top Tier Active
                </span>
              </div>
              <p className="text-blue-100 text-xs mt-1">
                Jyotsvan Enterprises complies with all Flipkart service quality, ready-to-dispatch, and low-cancellation thresholds.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 bg-white/10 rounded-xl px-5 py-3 border border-white/15">
            <div>
              <div className="text-xs text-blue-200">Catalog Rating</div>
              <div className="text-lg font-bold flex items-center space-x-1">
                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>4.74 / 5.0</span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div>
              <div className="text-xs text-blue-200">Commission Benefit</div>
              <div className="text-lg font-bold text-emerald-300">15% Discount</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            Loading performance metrics...
          </div>
        ) : (
          metrics.map((m) => {
            const isExcellent = m.status === 'EXCELLENT';
            const isGood = m.status === 'GOOD';

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {m.metric_category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isExcellent
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isGood
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{m.metric_name}</h4>
                  <p className="text-xs text-slate-400">Flipkart Seller SLA Standard</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-extrabold text-slate-900">
                      {m.current_value}
                      {m.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Target Threshold</div>
                    <div className="text-xs font-semibold text-slate-600">
                      &lt; {m.benchmark_target}
                      {m.unit}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
