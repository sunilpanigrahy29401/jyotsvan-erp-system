import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Plus,
  Store,
  MapPin,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerVisit } from '../../../types/retailers.ts';

interface RetailerVisitsViewProps {
  onLogVisit: () => void;
}

export const RetailerVisitsView: React.FC<RetailerVisitsViewProps> = ({ onLogVisit }) => {
  const [visits, setVisits] = useState<RetailerVisit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const res = await retailerApi.listVisits({ limit: 100 });
      setVisits(res.data);
    } catch (err) {
      console.error('Failed to load visits:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Field Sales Beat Visits
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Log of on-site retailer counter visits, stock audits, order bookings, and merchant feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadVisits}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onLogVisit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Field Visit
          </button>
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Visit Date</th>
                <th className="py-3 px-4">Retailer Outlet</th>
                <th className="py-3 px-4">Sales Officer</th>
                <th className="py-3 px-4">Visit Purpose</th>
                <th className="py-3 px-4">Observations / Outcome</th>
                <th className="py-3 px-4">Next Follow-Up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading visit records...</td>
                </tr>
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No field visits logged yet.</td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {new Date(v.visit_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {v.retailer_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        {v.salesperson_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 capitalize">
                        {v.purpose.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {v.outcome || v.notes || 'Routine check completed.'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {v.next_follow_up_date ? (
                        <span className="text-emerald-700 font-medium">
                          {new Date(v.next_follow_up_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
