// src/app/pages/people/PeopleDashboard.tsx
// Command Center & Operational Overview for Staff & People Management

import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Clock, Calendar, CheckSquare, Award, ArrowUpRight, 
  CheckCircle2, AlertCircle, TrendingUp, Building2, MapPin, ShieldAlert,
  FileText, ChevronRight
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { PeopleDashboardMetrics } from '../../../types/people.ts';

interface PeopleDashboardProps {
  onNavigate?: (path: string) => void;
}

export function PeopleDashboard({ onNavigate }: PeopleDashboardProps) {
  const [metrics, setMetrics] = useState<PeopleDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const data = await PeopleAPI.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load people dashboard.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Aggregating workforce intelligence & attendance metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            Staff & Workforce Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational human capital, real-time muster roll, shift attendance, and managerial workflows
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/people/employees')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-slate-500" />
            Employees
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/people/attendance')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            Attendance
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/people/payroll')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Payroll & Indian Statutory
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/people/shifts')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            Shifts & Holidays
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/people/ess')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            Self-Service Portal
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 4 Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {metrics?.total_employees || 0}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {metrics?.active_employees || 0} active personnel on roll
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Present Today</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-700 tracking-tight">
            {metrics?.present_today || 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {metrics?.attendance_rate_percent || 0}% attendance rate
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Approvals</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-700 tracking-tight">
            {(metrics?.pending_leave_requests || 0) + (metrics?.pending_attendance_corrections || 0)}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {metrics?.pending_leave_requests || 0} leaves • {metrics?.pending_attendance_corrections || 0} corrections
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Open Tasks</span>
            <CheckSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-indigo-700 tracking-tight">
            {metrics?.open_tasks_count || 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {metrics?.departments_count || 0} departments • {metrics?.branches_count || 0} branches
          </p>
        </div>
      </div>

      {/* Main Grid: Operational Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Modules & Department Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Launch Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => onNavigate && onNavigate('/people/employees')}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                Employee 360 & Org Chart
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Full personnel profiles, contact records, reporting hierarchy tree, and designation matrices.
              </p>
            </div>

            <div
              onClick={() => onNavigate && onNavigate('/people/attendance')}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Clock className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                Attendance & Shift Muster
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Daily clock-in/out records, working hours computation, and supervisory regularization requests.
              </p>
            </div>

            <div
              onClick={() => onNavigate && onNavigate('/people/leave')}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                Leave & Paid Time Off
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                CL/SL/EL annual quotas, balance ledgers, online applications, and supervisor approvals.
              </p>
            </div>

            <div
              onClick={() => onNavigate && onNavigate('/people/performance')}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Award className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                Targets & Scorecards
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Employee KPI quotas, achievement tracking %, quarterly appraisals, and review ratings.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Snapshot & Key Operational Metrics */}
        <div className="space-y-6">
          {/* Today's Muster Roll Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Today's Workforce Status
              </span>
              <span className="text-xs font-mono font-normal text-slate-400">
                {new Date().toISOString().split('T')[0]}
              </span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 text-emerald-900 rounded-xl">
                <span className="font-medium">Present on Duty</span>
                <span className="font-bold text-sm">{metrics?.present_today || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-50 text-amber-900 rounded-xl">
                <span className="font-medium">On Approved Leave</span>
                <span className="font-bold text-sm">{metrics?.on_leave_today || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-indigo-50 text-indigo-900 rounded-xl">
                <span className="font-medium">Active Headcount</span>
                <span className="font-bold text-sm">{metrics?.active_employees || 0}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/people/attendance')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1"
            >
              Open Live Attendance Register
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module Architecture Highlights */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              InsForge Enterprise Foundation
            </span>
            <h4 className="text-sm font-bold text-white">Staff & People Architecture</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unified with canonical system users, department hierarchies, field sales beat activities, finance OPEX claims, and granular RBAC permissions.
            </p>
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Phase 21 People Engine</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
