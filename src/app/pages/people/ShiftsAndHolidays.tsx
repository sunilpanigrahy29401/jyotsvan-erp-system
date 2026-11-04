// src/app/pages/people/ShiftsAndHolidays.tsx
// Shift Roster Definition & Plant-wise Public Holiday Calendar Management

import { useState, useEffect } from 'react';
import { Clock, Calendar, Plus, CheckCircle2, AlertCircle, Moon, Sun, Shield, Users } from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { ShiftMaster, HolidayCalendar, Employee } from '../../../types/people.ts';

export function ShiftsAndHolidays() {
  const [activeTab, setActiveTab] = useState<'shifts' | 'holidays'>('shifts');
  const [shifts, setShifts] = useState<ShiftMaster[]>([]);
  const [holidays, setHolidays] = useState<HolidayCalendar[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Shift Modal
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    start_time: '09:00:00',
    end_time: '17:30:00',
    grace_period_mins: 15,
    break_duration_mins: 60,
    half_day_hours: 4.5,
    full_day_hours: 8.5,
    is_overnight: false,
    night_allowance: 0,
  });

  // Assign Shift Modal
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    shift_id: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [sList, hList, eList] = await Promise.all([
        PeopleAPI.getShifts(),
        PeopleAPI.getHolidays(),
        PeopleAPI.getEmployees(),
      ]);
      setShifts(sList);
      setHolidays(hList);
      setEmployees(eList);
      if (sList.length > 0 && eList.length > 0) {
        setAssignForm(prev => ({
          ...prev,
          shift_id: sList[0].id,
          employee_id: eList[0].id,
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load shifts and holidays.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    try {
      await PeopleAPI.createShift(shiftForm);
      setShowShiftModal(false);
      setSuccessMsg('Shift created successfully!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create shift.');
    }
  }

  async function handleAssignShift(e: React.FormEvent) {
    e.preventDefault();
    try {
      await PeopleAPI.assignShift(assignForm.employee_id, assignForm.shift_id, assignForm.effective_from);
      setShowAssignModal(false);
      setSuccessMsg('Employee shift updated successfully!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign shift.');
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading shift masters & calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600" />
            Shift Rosters & Holiday Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable morning, evening, overnight rotational shifts with grace periods & plant holidays
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-slate-500" />
            Assign Roster
          </button>
          <button
            onClick={() => setShowShiftModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Shift
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

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex items-center gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'shifts' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Shift Master ({shifts.length})
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'holidays' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Public & Plant Holidays ({holidays.length})
        </button>
      </div>

      {/* TAB 1: SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {shifts.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                    {s.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{s.name}</h3>
                </div>
                {s.is_overnight ? (
                  <Moon className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Timings:</span>
                  <span className="font-mono font-bold text-slate-900">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Grace Period:</span>
                  <span className="font-semibold text-slate-800">{s.grace_period_mins} mins</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Break Duration:</span>
                  <span className="font-semibold text-slate-800">{s.break_duration_mins} mins</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Night Allowance:</span>
                  <span className="font-mono text-emerald-700 font-bold">₹{Number(s.night_allowance).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Overtime: {s.overtime_eligible ? 'Eligible' : 'No'}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">ACTIVE</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: HOLIDAYS */}
      {activeTab === 'holidays' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900 text-sm">2026 Enterprise Holiday Calendar</h2>
            <p className="text-[11px] text-slate-500">Official statutory paid days off and plant manufacturing holidays</p>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Holiday Name</th>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {holidays.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-900">{h.holiday_name}</td>
                  <td className="p-3 font-mono text-slate-700">{h.holiday_date}</td>
                  <td className="p-3 capitalize">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      h.holiday_type === 'national' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {h.holiday_type}
                    </span>
                  </td>
                  <td className="p-3 text-emerald-700 font-semibold">Mandatory Paid Off</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Assign Shift Roster</h3>
            <form onSubmit={handleAssignShift} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Employee</label>
                <select
                  value={assignForm.employee_id}
                  onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.display_name} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Target Shift</label>
                <select
                  value={assignForm.shift_id}
                  onChange={(e) => setAssignForm({ ...assignForm, shift_id: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Effective Date</label>
                <input
                  type="date"
                  value={assignForm.effective_from}
                  onChange={(e) => setAssignForm({ ...assignForm, effective_from: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
