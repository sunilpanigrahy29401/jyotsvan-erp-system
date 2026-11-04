// src/app/pages/people/HRWorkflowCenter.tsx
// Unified HR Requests, Employee Exit Separations & Corporate Announcements Center

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertCircle, FileText, Bell, LogOut, Clock, 
  Send, Users, ChevronRight, ShieldCheck, Check, X, Plus
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { HRRequest, HRAnnouncement, EmployeeExit, Employee } from '../../../types/people.ts';

export function HRWorkflowCenter() {
  const [activeTab, setActiveTab] = useState<'requests' | 'exits' | 'announcements'>('requests');
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [exits, setExits] = useState<EmployeeExit[]>([]);
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Announcement Modal
  const [showAnnModal, setShowAnnModal] = useState<boolean>(false);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    category: 'company' as any,
    target_audience: 'all' as any,
    priority: 'normal' as any,
    published_by: 'Head of HR',
  });

  // Resignation Submission Modal
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [exitForm, setExitForm] = useState({
    employee_id: '',
    resignation_reason: '',
    notice_period_days: 30,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [rList, eList, aList, empList] = await Promise.all([
        PeopleAPI.getRequests(),
        PeopleAPI.getExits(),
        PeopleAPI.getAnnouncements(),
        PeopleAPI.getEmployees(),
      ]);
      setRequests(rList);
      setExits(eList);
      setAnnouncements(aList);
      setEmployees(empList);
      if (empList.length > 0) {
        setExitForm(prev => ({ ...prev, employee_id: empList[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load HR workflow items.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    try {
      await PeopleAPI.createAnnouncement(annForm);
      setShowAnnModal(false);
      setSuccessMsg('Announcement published to all personnel!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to post announcement.');
    }
  }

  async function handleSubmitExit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await PeopleAPI.submitResignation(exitForm);
      setShowExitModal(false);
      setSuccessMsg('Resignation recorded and clearance workflow initiated!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit resignation.');
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading HR requests and clearance registers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-amber-600" />
            HR Workflow Center & Announcements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified managerial requests, separation clearances, full-and-final settlements, and company notices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExitModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            Process Separation
          </button>
          <button
            onClick={() => setShowAnnModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Post Announcement
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
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'requests' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Unified HR Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('exits')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'exits' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Exit & Separation Clearances ({exits.length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'announcements' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Announcements & Notices ({announcements.length})
        </button>
      </div>

      {/* TAB 1: HR REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900 text-sm">Employee Service Requests</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Request No.</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Request Type</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No pending employee service requests.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-bold text-slate-900">{r.request_number}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{r.employee_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.employee_code}</p>
                    </td>
                    <td className="p-3 capitalize font-semibold text-slate-700">{r.request_type.replace(/_/g, ' ')}</td>
                    <td className="p-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: EXITS & SEPARATION */}
      {activeTab === 'exits' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Exit & Full-and-Final Clearances</h2>
              <p className="text-[11px] text-slate-500">Notice period tracking, departmental handovers, and gratuity calculations</p>
            </div>
            <button
              onClick={() => setShowExitModal(true)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold"
            >
              + Initiate Exit
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Employee</th>
                <th className="p-3">Resignation Date</th>
                <th className="p-3">Notice Period</th>
                <th className="p-3">Tentative LWD</th>
                <th className="p-3">Clearance Checklist</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {exits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No active resignation or separation clearances in progress.
                  </td>
                </tr>
              ) : (
                exits.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{ex.employee_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{ex.employee_code}</p>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{ex.resignation_date}</td>
                    <td className="p-3 font-semibold text-slate-800">{ex.notice_period_days} Days</td>
                    <td className="p-3 font-mono font-bold text-amber-800">{ex.tentative_last_working_day}</td>
                    <td className="p-3 text-[11px] text-slate-600">
                      IT Assets: {ex.clearance_checklist.it_assets ? '✓' : 'Pending'} • ID Card: {ex.clearance_checklist.id_card ? '✓' : 'Pending'}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                        {ex.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                    {a.category}
                  </span>
                  <span className="text-[11px] text-slate-400">{new Date(a.published_at).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{a.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{a.content}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Author: <strong className="text-slate-700">{a.published_by}</strong></span>
                  <span className="text-emerald-700 font-semibold">Active Notice</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Post Corporate Notice</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Notice Title"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Notice Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter full notice or communication body..."
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold"
                >
                  Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Record Employee Resignation</h3>
            <form onSubmit={handleSubmitExit} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Employee</label>
                <select
                  value={exitForm.employee_id}
                  onChange={(e) => setExitForm({ ...exitForm, employee_id: e.target.value })}
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
                <label className="block text-slate-600 mb-1 font-medium">Notice Period (Days)</label>
                <input
                  type="number"
                  value={exitForm.notice_period_days}
                  onChange={(e) => setExitForm({ ...exitForm, notice_period_days: parseInt(e.target.value, 10) })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Reason for Separation</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Reason for resignation / departure..."
                  value={exitForm.resignation_reason}
                  onChange={(e) => setExitForm({ ...exitForm, resignation_reason: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold"
                >
                  Initiate Separation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
