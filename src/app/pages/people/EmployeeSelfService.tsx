// src/app/pages/people/EmployeeSelfService.tsx
// Dedicated Employee Self-Service (ESS) Portal for Punches, Leaves, Tasks, Payslips & Requests

import { useState, useEffect } from 'react';
import { 
  User, Clock, Calendar, FileText, CheckCircle2, AlertCircle, 
  Download, Plus, Send, ChevronRight, DollarSign, Bell, ShieldCheck
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { 
  Employee360View, 
  LeaveBalance, 
  LeaveRequest, 
  Payslip, 
  HRAnnouncement, 
  HRRequest 
} from '../../../types/people.ts';

export function EmployeeSelfService() {
  const [employee, setEmployee] = useState<Employee360View | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>([]);
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaves' | 'payslips' | 'requests'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Leave application modal
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: 'lt-cl',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_half_day: false,
    reason: '',
  });

  // Clock in/out status
  const [punching, setPunching] = useState<boolean>(false);

  useEffect(() => {
    loadPortalData();
  }, []);

  async function loadPortalData() {
    setLoading(true);
    setError(null);
    try {
      // Default to employee emp-007 (Vikram Sharma) or emp-001 (Aarav Singhania) as active user
      const empData = await PeopleAPI.getEmployeeById('emp-007');
      setEmployee(empData);

      const [bList, lList, pList, aList, rList] = await Promise.all([
        PeopleAPI.getLeaveBalances('emp-007', 2026),
        PeopleAPI.getLeaveRequests({ employee_id: 'emp-007' }),
        PeopleAPI.getPayslips(undefined, 'emp-007'),
        PeopleAPI.getAnnouncements(),
        PeopleAPI.getRequests(),
      ]);

      setBalances(bList);
      setLeaves(lList);
      setPayslips(pList);
      setAnnouncements(aList);
      setRequests(rList);
    } catch (err: any) {
      setError(err.message || 'Failed to load self-service profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePunch(type: 'check_in' | 'check_out') {
    if (!employee) return;
    setPunching(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await PeopleAPI.punchAttendance({
        employee_id: employee.id,
        punch_type: type,
        location: 'Self-Service Web Portal (HQ / Remote)',
        remarks: `ESS Web ${type === 'check_in' ? 'Arrival' : 'Departure'} punch`,
      });
      setSuccessMsg(`Attendance ${type === 'check_in' ? 'Check-In' : 'Check-Out'} logged successfully!`);
      await loadPortalData();
    } catch (err: any) {
      setError(err.message || 'Punch logging failed.');
    } finally {
      setPunching(false);
    }
  }

  async function handleApplyLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    try {
      await PeopleAPI.applyLeave({
        ...leaveForm,
        employee_id: employee.id,
        total_days: leaveForm.is_half_day ? 0.5 : 1.0,
      });
      setShowLeaveModal(false);
      setSuccessMsg('Leave request submitted to reporting manager for approval!');
      await loadPortalData();
    } catch (err: any) {
      setError(err.message || 'Leave application failed.');
    }
  }

  if (loading || !employee) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading your Employee Self-Service workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-2xl shadow-inner">
            {employee.display_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{employee.display_name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-amber-400 border border-slate-700">
                {employee.employee_code}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {employee.designation_name} • <span className="text-amber-400">{employee.department_name}</span> • {employee.branch_name}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Reporting Manager: {employee.reporting_manager?.display_name || 'Directing Executive'}
            </p>
          </div>
        </div>

        {/* Quick Punch Bar */}
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center gap-3">
          <button
            onClick={() => handlePunch('check_in')}
            disabled={punching}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Clock In</span>
          </button>
          <button
            onClick={() => handlePunch('check_out')}
            disabled={punching}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Clock Out</span>
          </button>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex items-center gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Overview & Balances
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'leaves' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Leave Applications ({leaves.length})
        </button>
        <button
          onClick={() => setActiveTab('payslips')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'payslips' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          My Payslips ({payslips.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'requests' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          HR Requests ({requests.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Leave Balances Grid */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">2026 Available Leave Balances</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {balances.map((b) => (
                <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {b.leave_type_code || 'LV'}
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-2">{b.leave_type_name}</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {b.remaining_days} <span className="text-xs text-slate-500 font-normal">days left</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allocated: {b.allocated_days} | Used: {b.used_days}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements & Compliance Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Company Announcements & Notices
              </h3>
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{a.title}</span>
                      <span className="text-[10px] text-slate-400">{new Date(a.published_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{a.content}</p>
                    <p className="text-[10px] text-amber-800 font-medium mt-1">From: {a.published_by}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                My Statutory & Bank Identifiers
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">PAN Card</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{employee.pan_number || 'Linked'}</p>
                </div>
                <div>
                  <p className="text-slate-400">UAN</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{employee.uan || 'Linked'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Bank Account</p>
                  <p className="font-mono font-medium text-slate-800 mt-0.5">{employee.bank_account_number || '•••• 0192'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Bank IFSC</p>
                  <p className="font-mono font-medium text-slate-800 mt-0.5">{employee.bank_ifsc || 'KKBK0000192'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE APPLICATIONS */}
      {activeTab === 'leaves' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-sm">Leave History & Approval Status</h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold"
            >
              + Apply Leave
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Request No.</th>
                <th className="p-3">Type</th>
                <th className="p-3">Dates</th>
                <th className="p-3 text-center">Days</th>
                <th className="p-3">Reason</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-mono font-bold text-slate-900">{l.request_number}</td>
                  <td className="p-3 font-semibold text-slate-800">{l.leave_type_name || 'Casual Leave'}</td>
                  <td className="p-3 text-slate-600">{l.start_date} to {l.end_date}</td>
                  <td className="p-3 text-center font-bold">{l.total_days}</td>
                  <td className="p-3 text-slate-600">{l.reason}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      l.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {l.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: PAYSLIPS */}
      {activeTab === 'payslips' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900 text-sm">Monthly Approved Payslips</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Period</th>
                <th className="p-3 text-center">Paid Days</th>
                <th className="p-3 text-right">Gross Earnings</th>
                <th className="p-3 text-right">Deductions</th>
                <th className="p-3 text-right">Net Take-Home</th>
                <th className="p-3 text-center">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {payslips.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-900">{p.period_name || 'March 2026'}</td>
                  <td className="p-3 text-center font-bold text-amber-800">{p.effective_paid_days}</td>
                  <td className="p-3 text-right font-mono">₹{Number(p.gross_earnings).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono text-rose-600">₹{Number(p.total_deductions).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                    ₹{Number(p.net_salary).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => window.print()}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Apply for Time Off</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Leave Category</label>
                <select
                  value={leaveForm.leave_type_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="lt-cl">Casual Leave (CL)</option>
                  <option value="lt-sl">Sick / Medical Leave (SL)</option>
                  <option value="lt-el">Earned / Privilege Leave (EL)</option>
                  <option value="lt-co">Compensatory Off (CO)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Reason for Absence</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe reason for managerial approval..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
