// src/app/pages/people/LeaveManagement.tsx
// Leave Policy, Paid Time Off Ledger, and Managerial Approval Workflow

import { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, Clock, XCircle, AlertCircle, Plus, 
  Check, X, Users, Filter, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { LeaveType, LeaveBalance, LeaveRequest, Employee } from '../../../types/people.ts';

export function LeaveManagement() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [empFilter, setEmpFilter] = useState<string>('');

  // Apply leave modal
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [applyForm, setApplyForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_half_day: false,
    half_day_period: 'first_half',
    reason: '',
  });
  const [applying, setApplying] = useState<boolean>(false);

  // Review modal
  const [reviewingRequest, setReviewingRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [reviewing, setReviewing] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, empFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [types, bals, reqs, emps] = await Promise.all([
        PeopleAPI.getLeaveTypes(),
        PeopleAPI.getLeaveBalances(empFilter || undefined),
        PeopleAPI.getLeaveRequests({
          status: statusFilter || undefined,
          employee_id: empFilter || undefined,
        }),
        PeopleAPI.getEmployees(),
      ]);

      setLeaveTypes(types);
      setBalances(bals);
      setRequests(reqs);
      setEmployees(emps);
    } catch (err: any) {
      setError(err.message || 'Failed to load leave records.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!applyForm.employee_id || !applyForm.leave_type_id || !applyForm.reason) return;
    setApplying(true);
    setError(null);
    try {
      await PeopleAPI.createLeaveRequest({
        employee_id: applyForm.employee_id,
        leave_type_id: applyForm.leave_type_id,
        start_date: applyForm.start_date,
        end_date: applyForm.end_date,
        is_half_day: applyForm.is_half_day,
        half_day_period: applyForm.is_half_day ? (applyForm.half_day_period as any) : null,
        reason: applyForm.reason,
      });
      setShowApplyModal(false);
      setApplyForm({
        employee_id: '',
        leave_type_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        is_half_day: false,
        half_day_period: 'first_half',
        reason: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave application.');
    } finally {
      setApplying(false);
    }
  }

  async function handleReviewDecision(decision: 'approved' | 'rejected') {
    if (!reviewingRequest) return;
    setReviewing(true);
    setError(null);
    try {
      await PeopleAPI.reviewLeaveRequest(reviewingRequest.id, decision, rejectionReason);
      setReviewingRequest(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to review leave application.');
    } finally {
      setReviewing(false);
    }
  }

  const isPending = (status: string) => status === 'pending_approval' || status === 'submitted' || status === 'draft';
  const pendingCount = requests.filter(r => isPending(r.status)).length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-600" />
            Leave & Time-Off Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Leave balance tracking, paid time-off applications, and supervisory approval workflow
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Apply For Leave
        </button>
      </div>

      {/* Leave Types Policy Quotas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {leaveTypes.map((type) => (
          <div key={type.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{type.code}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                type.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {type.is_paid ? 'PAID' : 'UNPAID'}
              </span>
            </div>
            <p className="text-xl font-bold text-amber-600">{type.annual_allocation} <span className="text-[10px] text-slate-400 font-normal">days/yr</span></p>
            <p className="text-[11px] text-slate-500 truncate">{type.name}</p>
          </div>
        ))}
      </div>

      {/* Filter & Application Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Leave Applications Ledger</h3>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                {pendingCount} Pending Approval
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 max-w-xs"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.display_name} ({e.employee_code})</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Requests List */}
        <div className="space-y-3">
          {requests.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {requests.map((req) => (
                <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{req.employee_name}</span>
                      <span className="font-mono text-slate-400 text-[11px]">({req.employee_code})</span>
                      <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {req.leave_type_name}
                      </span>
                      <span className="font-mono text-slate-500">{req.request_number}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      Duration: <span className="font-semibold text-slate-800">{req.start_date} to {req.end_date}</span> • <span className="font-bold text-slate-900">{req.total_days} Day(s)</span>
                      {req.is_half_day && <span className="text-indigo-600 ml-1.5">(Half Day - {req.half_day_period})</span>}
                    </p>

                    <p className="text-slate-500 italic">Reason: "{req.reason}"</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPending(req.status) && (
                      <button
                        type="button"
                        onClick={() => setReviewingRequest(req)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm"
                      >
                        Review Decision
                      </button>
                    )}
                    {!isPending(req.status) && req.approver_name && (
                      <div className="text-right text-[11px] text-slate-500">
                        <p>Reviewed by {req.approver_name}</p>
                        {req.rejection_reason && <p className="text-rose-600 italic">"{req.rejection_reason}"</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No leave requests found</p>
              <p className="text-xs text-slate-400 mt-1">Leave applications filed by staff will appear here for review.</p>
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Apply For Leave / Time-Off</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Employee *</label>
                <select
                  required
                  value={applyForm.employee_id}
                  onChange={(e) => setApplyForm({ ...applyForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.display_name} ({e.employee_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Leave Category *</label>
                <select
                  required
                  value={applyForm.leave_type_id}
                  onChange={(e) => setApplyForm({ ...applyForm, leave_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Choose Leave Type --</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code}) - {t.annual_allocation}d/yr</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.start_date}
                    onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">End Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.end_date}
                    onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="half_day"
                  checked={applyForm.is_half_day}
                  onChange={(e) => setApplyForm({ ...applyForm, is_half_day: e.target.checked })}
                  className="rounded text-amber-600"
                />
                <label htmlFor="half_day" className="text-slate-700 font-medium">Apply as Half-Day Leave (0.5d)</label>
              </div>

              {applyForm.is_half_day && (
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Half Day Period</label>
                  <select
                    value={applyForm.half_day_period}
                    onChange={(e) => setApplyForm({ ...applyForm, half_day_period: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="first_half">First Half (Morning Shift)</option>
                    <option value="second_half">Second Half (Afternoon Shift)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Reason for Leave *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Attending family function, medical appointment"
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Leave Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Review Leave Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 border border-slate-200">
                <p className="font-bold text-slate-900">{reviewingRequest.employee_name} ({reviewingRequest.employee_code})</p>
                <p className="text-slate-600">Category: <span className="font-semibold text-amber-700">{reviewingRequest.leave_type_name}</span></p>
                <p className="text-slate-600">Period: <span className="font-semibold">{reviewingRequest.start_date} to {reviewingRequest.end_date}</span> ({reviewingRequest.total_days} Days)</p>
                <p className="text-slate-700 italic pt-1 border-t border-slate-200">Reason: "{reviewingRequest.reason}"</p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Rejection Reason (If rejecting)</label>
                <input
                  type="text"
                  placeholder="e.g. Critical plant shift operations during scheduled dates"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReviewDecision('rejected')}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold"
                >
                  Reject
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  onClick={() => handleReviewDecision('approved')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
