import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  CheckCircle,
  AlertTriangle,
  Users,
  Store,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerFollowUp, FollowupStatus } from '../../../types/retailers.ts';

interface RetailerFollowupsViewProps {
  onAddFollowup: () => void;
}

export const RetailerFollowupsView: React.FC<RetailerFollowupsViewProps> = ({ onAddFollowup }) => {
  const [followups, setFollowups] = useState<RetailerFollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    loadFollowups();
  }, [statusFilter, priorityFilter, overdueOnly]);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      const res = await retailerApi.listFollowups({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        overdue_only: overdueOnly,
        limit: 100,
      });
      setFollowups(res.data);
    } catch (err) {
      console.error('Failed to load followups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: RetailerFollowUp) => {
    const nextStatus: FollowupStatus = item.status === 'completed' ? 'open' : 'completed';
    try {
      await retailerApi.updateFollowupStatus(item.id, nextStatus);
      loadFollowups();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-rose-600 rounded"
            />
            Overdue Only
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadFollowups}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onAddFollowup}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Follow-up Task
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading follow-up tasks...</div>
          ) : followups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No follow-up tasks matching criteria.</div>
          ) : (
            followups.map((f) => (
              <div
                key={f.id}
                className={`p-4 flex items-center justify-between transition ${
                  f.status === 'completed' ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(f)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition"
                  >
                    <CheckCircle
                      className={`w-5 h-5 ${
                        f.status === 'completed' ? 'text-emerald-600 fill-emerald-100' : 'text-slate-300'
                      }`}
                    />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          f.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {f.subject}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          f.is_overdue
                            ? 'bg-rose-100 text-rose-800'
                            : f.priority === 'urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : f.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {f.is_overdue ? 'Overdue' : f.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{f.notes || 'No additional notes provided.'}</p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-4">
                      <span>Retailer: <strong className="text-slate-600">{f.retailer_name}</strong></span>
                      <span>Assignee: {f.assigned_user_name}</span>
                      <span className={f.is_overdue ? 'text-rose-600 font-semibold' : ''}>
                        Due: {new Date(f.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium capitalize ${
                      f.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : f.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {f.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
