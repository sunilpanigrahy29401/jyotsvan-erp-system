// src/app/pages/people/AttendanceManagement.tsx
// Daily Muster Roll, Shift Clock-In/Out, and Attendance Regularization Workflows

import { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle2, AlertCircle, Calendar, Users, MapPin, 
  ArrowRight, ShieldAlert, Check, X, FileEdit, Plus, UserCheck
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { AttendanceRecord, AttendanceCorrection, Employee } from '../../../types/people.ts';

export function AttendanceManagement() {
  const [activeTab, setActiveTab] = useState<'register' | 'corrections'>('register');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick punch modal
  const [showPunchModal, setShowPunchModal] = useState<boolean>(false);
  const [punchForm, setPunchForm] = useState({
    employee_id: '',
    type: 'in', // 'in' or 'out'
    location: 'Corporate HQ Office - Biometric Sync',
    remarks: '',
  });
  const [punching, setPunching] = useState<boolean>(false);

  // Correction request modal
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [correctionForm, setCorrectionForm] = useState({
    employee_id: '',
    requested_date: new Date().toISOString().split('T')[0],
    requested_check_in: '09:00',
    requested_check_out: '18:00',
    requested_status: 'present',
    reason: '',
  });
  const [submittingCorrection, setSubmittingCorrection] = useState<boolean>(false);

  // Review modal
  const [reviewingCorrection, setReviewingCorrection] = useState<AttendanceCorrection | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [reviewing, setReviewing] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [date, activeTab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [empList, attList, corrList] = await Promise.all([
        PeopleAPI.getEmployees(),
        PeopleAPI.getAttendance({ date }),
        PeopleAPI.getAttendanceCorrections(),
      ]);

      setEmployees(empList);
      setRecords(attList);
      setCorrections(corrList);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePunch(e: React.FormEvent) {
    e.preventDefault();
    if (!punchForm.employee_id) return;
    setPunching(true);
    setError(null);
    try {
      if (punchForm.type === 'in') {
        await PeopleAPI.checkIn({
          employee_id: punchForm.employee_id,
          location: punchForm.location,
          remarks: punchForm.remarks,
        });
      } else {
        await PeopleAPI.checkOut({
          employee_id: punchForm.employee_id,
          location: punchForm.location,
          remarks: punchForm.remarks,
        });
      }
      setShowPunchModal(false);
      setPunchForm({ employee_id: '', type: 'in', location: 'Corporate HQ Office', remarks: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to log attendance punch.');
    } finally {
      setPunching(false);
    }
  }

  async function handleSubmitCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!correctionForm.employee_id || !correctionForm.reason) return;
    setSubmittingCorrection(true);
    setError(null);
    try {
      await PeopleAPI.createAttendanceCorrection({
        employee_id: correctionForm.employee_id,
        requested_date: correctionForm.requested_date,
        requested_check_in: correctionForm.requested_check_in,
        requested_check_out: correctionForm.requested_check_out,
        requested_status: correctionForm.requested_status as any,
        reason: correctionForm.reason,
      });
      setShowCorrectionModal(false);
      setCorrectionForm({
        employee_id: '',
        requested_date: new Date().toISOString().split('T')[0],
        requested_check_in: '09:00',
        requested_check_out: '18:00',
        requested_status: 'present',
        reason: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit regularization request.');
    } finally {
      setSubmittingCorrection(false);
    }
  }

  async function handleReviewDecision(decision: 'approved' | 'rejected') {
    if (!reviewingCorrection) return;
    setReviewing(true);
    setError(null);
    try {
      await PeopleAPI.reviewAttendanceCorrection(reviewingCorrection.id, decision, reviewerNotes);
      setReviewingCorrection(null);
      setReviewerNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to review correction request.');
    } finally {
      setReviewing(false);
    }
  }

  const presentCount = records.filter(r => r.status === 'present').length;
  const onLeaveCount = records.filter(r => r.status === 'leave').length;
  const halfDayCount = records.filter(r => r.status === 'half_day').length;
  const absentCount = employees.length - presentCount - onLeaveCount - halfDayCount;
  const pendingCorrections = corrections.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600" />
            Attendance & Shift Time Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Muster roll logs, biometric check-ins, working hours computation, and regularizations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCorrectionModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <FileEdit className="w-4 h-4 text-slate-500" />
            Request Regularization
          </button>
          <button
            type="button"
            onClick={() => setShowPunchModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            Log Staff Punch
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Workforce</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{employees.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-600">Present Today</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{presentCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-600">On Leave</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{onLeaveCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-rose-600">Unpunched / Absent</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{Math.max(0, absentCount)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-indigo-600">Pending Corrections</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{pendingCorrections}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'register'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Daily Muster Roll
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('corrections')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'corrections'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Regularization Requests</span>
              {pendingCorrections > 0 && (
                <span className="bg-amber-500 text-white px-1.5 py-0.2 text-[10px] rounded-full">
                  {pendingCorrections}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'register' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Selected Date:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* TAB 1: DAILY MUSTER ROLL */}
        {activeTab === 'register' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Total Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const rec = records.find(r => r.employee_id === emp.id);
                  const isCheckedIn = !!rec?.check_in_time;
                  const isCheckedOut = !!rec?.check_out_time;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.display_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{emp.display_name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{emp.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{emp.department_name}</p>
                        <p className="text-[11px] text-slate-400">{emp.designation_name || 'Staff'}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {rec?.check_in_time ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {rec?.check_out_time ? (
                          <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {rec?.total_hours ? `${rec.total_hours} hrs` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {rec ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                            rec.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                            rec.status === 'leave' ? 'bg-amber-100 text-amber-800' :
                            rec.status === 'half_day' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rec.status.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            Not Punched
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 uppercase text-[11px]">
                        {rec?.source || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isCheckedIn ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPunchForm({ employee_id: emp.id, type: 'in', location: 'Corporate HQ', remarks: '' });
                              setShowPunchModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Clock In
                          </button>
                        ) : !isCheckedOut ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPunchForm({ employee_id: emp.id, type: 'out', location: 'Corporate HQ', remarks: '' });
                              setShowPunchModal(true);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Clock Out
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: REGULARIZATION REQUESTS */}
        {activeTab === 'corrections' && (
          <div className="space-y-3">
            {corrections.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {corrections.map((corr) => (
                  <div key={corr.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{corr.employee_name}</span>
                        <span className="text-slate-500">({corr.employee_code})</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          Target Date: {corr.requested_date}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          corr.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          corr.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {corr.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Requested: <span className="font-semibold text-slate-800">{corr.requested_status.toUpperCase()}</span> ({corr.requested_check_in || '—'} to {corr.requested_check_out || '—'})
                      </p>
                      <p className="text-slate-500 italic">Reason: "{corr.reason}"</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {corr.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => setReviewingCorrection(corr)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Review Request
                        </button>
                      )}
                      {corr.status !== 'pending' && corr.reviewed_by_name && (
                        <div className="text-right text-[11px] text-slate-500">
                          <p>Reviewed by {corr.reviewed_by_name}</p>
                          {corr.reviewer_notes && <p className="italic text-slate-400">"{corr.reviewer_notes}"</p>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-medium text-slate-700">No attendance regularizations pending</p>
                <p className="text-xs text-slate-400 mt-1">All employee punch events are up to date and reconciled.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Punch Clock Modal */}
      {showPunchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">
                  {punchForm.type === 'in' ? 'Clock In Personnel' : 'Clock Out Personnel'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPunchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePunch} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Select Staff Member *</label>
                <select
                  required
                  value={punchForm.employee_id}
                  onChange={(e) => setPunchForm({ ...punchForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.display_name} ({e.employee_code}) - {e.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Punch Action *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPunchForm({ ...punchForm, type: 'in' })}
                    className={`py-2 text-center rounded-lg font-bold border transition-colors ${
                      punchForm.type === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    CLOCK IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setPunchForm({ ...punchForm, type: 'out' })}
                    className={`py-2 text-center rounded-lg font-bold border transition-colors ${
                      punchForm.type === 'out'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    CLOCK OUT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Location / Terminal</label>
                <input
                  type="text"
                  value={punchForm.location}
                  onChange={(e) => setPunchForm({ ...punchForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Remarks / Work Note</label>
                <input
                  type="text"
                  placeholder="Optional shift notes..."
                  value={punchForm.remarks}
                  onChange={(e) => setPunchForm({ ...punchForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPunchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={punching}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-sm"
                >
                  {punching ? 'Recording...' : 'Confirm Punch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileEdit className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Attendance Regularization Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Employee *</label>
                <select
                  required
                  value={correctionForm.employee_id}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.display_name} ({e.employee_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Target Date *</label>
                <input
                  type="date"
                  required
                  value={correctionForm.requested_date}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, requested_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Requested In Time</label>
                  <input
                    type="time"
                    value={correctionForm.requested_check_in}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requested_check_in: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Requested Out Time</label>
                  <input
                    type="time"
                    value={correctionForm.requested_check_out}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requested_check_out: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Requested Status</label>
                <select
                  value={correctionForm.requested_status}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, requested_status: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="half_day">Half Day</option>
                  <option value="wfh">Work From Home (WFH)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Reason for Regularization *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Biometric turnstile hardware glitch during morning shift entry"
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {submittingCorrection ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Request Modal */}
      {reviewingCorrection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Review Regularization Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingCorrection(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 border border-slate-200">
                <p className="font-bold text-slate-900">{reviewingCorrection.employee_name} ({reviewingCorrection.employee_code})</p>
                <p className="text-slate-600">Date: <span className="font-semibold">{reviewingCorrection.requested_date}</span></p>
                <p className="text-slate-600">Requested Status: <span className="font-semibold uppercase">{reviewingCorrection.requested_status}</span></p>
                <p className="text-slate-600">Timing: {reviewingCorrection.requested_check_in} to {reviewingCorrection.requested_check_out}</p>
                <p className="text-slate-700 italic pt-1 border-t border-slate-200">Reason: "{reviewingCorrection.reason}"</p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Supervisor / Manager Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Verified with shift manager, approved."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
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
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReviewDecision('approved')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Approve & Regularize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
