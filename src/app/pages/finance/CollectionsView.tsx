// src/app/pages/finance/CollectionsView.tsx
// Field Sales Collections, Dunning Tasks & Follow-up Logs (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  PhoneCall,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  TrendingDown,
  MessageSquare,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { CollectionTask, CustomerType } from '../../../types/finance.ts';

interface CollectionsViewProps {
  onLogActivity: (task: CollectionTask) => void;
  onOpenLedger: (customerId: string, customerType: CustomerType, customerName: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  onLogActivity,
  onOpenLedger,
}) => {
  const [tasks, setTasks] = useState<CollectionTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await financeApi.getCollections({
        search: search || undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [priorityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTasks();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collection task by customer, rep..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Followup Statuses</option>
            <option value="open">Open</option>
            <option value="follow_up_scheduled">Follow-up Scheduled</option>
            <option value="promise_to_pay">Promise to Pay (PTP)</option>
            <option value="partially_collected">Partially Collected</option>
            <option value="collected">Fully Collected</option>
            <option value="escalated">Escalated</option>
          </select>

          <button
            onClick={loadTasks}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Collections"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Cards & Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs font-medium">Loading collection follow-ups...</p>
          </div>
        ) : tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                  <th className="py-3 px-4 text-right">Target Recovery (₹)</th>
                  <th className="py-3 px-4">Follow-up Date</th>
                  <th className="py-3 px-4">Promised Commitment (PTP)</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">{getPriorityBadge(t.priority)}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{t.customer_name}</span>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {t.customer_type} • Code: {t.customer_code || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">
                      ₹{t.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      ₹{t.target_collection_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {new Date(t.follow_up_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      {t.promised_payment_date ? (
                        <div>
                          <span className="font-semibold text-emerald-700 block">
                            ₹{(t.promised_payment_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            By {new Date(t.promised_payment_date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No PTP logged</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {t.assigned_to_name || 'Accounts Recovery Desk'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          t.status === 'collected'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'promise_to_pay' || t.status === 'partially_collected'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : t.status === 'escalated'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onLogActivity(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-semibold text-xs border border-indigo-200 transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" />
                          Log Call
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No active collection tasks found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
