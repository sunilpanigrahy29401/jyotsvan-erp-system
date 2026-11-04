// src/app/pages/people/Employee360Modal.tsx
// Comprehensive 360-Degree Employee Profile & Operational Dossier

import { useState, useEffect } from 'react';
import { 
  X, Mail, Phone, MapPin, Building2, Calendar, Award, CheckCircle2, 
  Clock, FileText, Target, DollarSign, Briefcase, ChevronRight, Upload,
  AlertCircle, ShieldCheck, Check, ArrowUpRight
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { Employee360View, Designation } from '../../../types/people.ts';

interface Employee360ModalProps {
  employeeId: string;
  onClose: () => void;
  onEmployeeUpdated?: () => void;
  onSelectOtherEmployee?: (id: string) => void;
}

export function Employee360Modal({
  employeeId,
  onClose,
  onEmployeeUpdated,
  onSelectOtherEmployee,
}: Employee360ModalProps) {
  const [data, setData] = useState<Employee360View | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'org' | 'attendance' | 'leave' | 'performance' | 'tasks' | 'documents' | 'operations' | 'edit'
  >('overview');

  // Edit form state
  const [editForm, setEditForm] = useState<any>({});
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Document upload state
  const [newDoc, setNewDoc] = useState({
    title: '',
    document_type: 'id_proof',
    file_name: '',
    notes: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [employeeId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await PeopleAPI.getEmployeeById(employeeId);
      setData(res);
      setEditForm({
        first_name: res.first_name,
        middle_name: res.middle_name || '',
        last_name: res.last_name,
        display_name: res.display_name,
        phone: res.phone,
        alternate_phone: res.alternate_phone || '',
        email: res.email,
        personal_email: res.personal_email || '',
        address: res.address || '',
        city: res.city || '',
        state: res.state || '',
        pincode: res.pincode || '',
        emergency_contact_name: res.emergency_contact_name || '',
        emergency_contact_phone: res.emergency_contact_phone || '',
        emergency_contact_relation: res.emergency_contact_relation || '',
        employment_type: res.employment_type,
        status: res.status,
        designation_id: res.designation_id || '',
        notes: res.notes || '',
      });

      const desigs = await PeopleAPI.getDesignations();
      setDesignations(desigs);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await PeopleAPI.updateEmployee(employeeId, editForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!newDoc.title || !newDoc.file_name) return;
    setUploadingDoc(true);
    try {
      await PeopleAPI.uploadDocument({
        employee_id: employeeId,
        title: newDoc.title,
        document_type: newDoc.document_type as any,
        file_name: newDoc.file_name,
        notes: newDoc.notes,
        file_size: 1024 * 1024,
        file_type: 'application/pdf',
      });
      setNewDoc({ title: '', document_type: 'id_proof', file_name: '', notes: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleVerifyDoc(docId: string) {
    try {
      await PeopleAPI.verifyDocument(docId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to verify document');
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await PeopleAPI.deleteDocument(docId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading Employee 360 Profile...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-slate-800 font-semibold">{error || 'Employee not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 shrink-0 relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
              {data.display_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{data.display_name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-slate-800 text-amber-400 border border-slate-700">
                  {data.employee_code}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  data.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                }`}>
                  {data.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                {data.designation_name || 'Staff Member'} • <span className="text-amber-400">{data.department_name}</span> • {data.branch_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 shrink-0 flex items-center gap-2 overflow-x-auto text-xs font-medium scrollbar-thin">
          {[
            { id: 'overview', label: '360 Overview' },
            { id: 'org', label: `Org Tree (${data.direct_reports?.length || 0} Reports)` },
            { id: 'attendance', label: 'Attendance & Clock' },
            { id: 'leave', label: 'Leaves & Balances' },
            { id: 'performance', label: 'Targets & Appraisals' },
            { id: 'tasks', label: `Tasks (${data.tasks?.length || 0})` },
            { id: 'documents', label: `Documents (${data.documents?.length || 0})` },
            { id: 'operations', label: 'Field & Finance' },
            { id: 'edit', label: 'Edit Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-800 font-semibold bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium">Days Present (This Month)</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {data.attendance_summary?.present_days || 0} <span className="text-xs text-slate-500 font-normal">/ {data.attendance_summary?.total_days || 0} days</span>
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium">Avg Working Hours</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {data.attendance_summary?.average_hours || 0} <span className="text-xs text-slate-500 font-normal">hrs/day</span>
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium">Active Targets</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {data.targets?.filter(t => t.status === 'active').length || 0}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium">Open Assigned Tasks</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">
                    {data.tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0}
                  </p>
                </div>
              </div>

              {/* Personal & Employment Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    Employment & Role Particulars
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-slate-400">Department</p>
                      <p className="font-medium text-slate-800 mt-0.5">{data.department_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Branch / Location</p>
                      <p className="font-medium text-slate-800 mt-0.5">{data.branch_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Designation</p>
                      <p className="font-medium text-slate-800 mt-0.5">{data.designation_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Employment Type</p>
                      <p className="font-medium text-slate-800 mt-0.5 capitalize">{data.employment_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Joining Date</p>
                      <p className="font-medium text-slate-800 mt-0.5">{data.joining_date}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Reporting Manager</p>
                      {data.reporting_manager ? (
                        <button
                          onClick={() => onSelectOtherEmployee && onSelectOtherEmployee(data.reporting_manager!.id)}
                          className="font-medium text-amber-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          {data.reporting_manager.display_name}
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <p className="font-medium text-slate-500 mt-0.5">Top Level Executive</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    Contact & Personal Dossier
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-slate-400">Official Email</p>
                      <p className="font-medium text-slate-800 mt-0.5">{data.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Primary Phone</p>
                      <p className="font-medium text-slate-800 mt-0.5">{data.phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Date of Birth</p>
                      <p className="font-medium text-slate-800 mt-0.5">{data.date_of_birth || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Gender</p>
                      <p className="font-medium text-slate-800 mt-0.5 capitalize">{data.gender || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400">Residential Address</p>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {[data.address, data.city, data.state, data.pincode].filter(Boolean).join(', ') || 'No address on file'}
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-100">
                      <p className="text-slate-400">Emergency Contact</p>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {data.emergency_contact_name ? `${data.emergency_contact_name} (${data.emergency_contact_relation || 'Contact'}) — ${data.emergency_contact_phone}` : 'None recorded'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indian Statutory Compliance & Banking Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Indian Statutory Compliance & Banking Dossier
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400">PAN Card Number</p>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{data.pan_number || 'Not Linked'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">UAN Number</p>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{data.uan || 'Not Linked'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">EPF Member ID</p>
                    <p className="font-mono font-medium text-slate-800 mt-0.5">{data.pf_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">ESIC Insurance ID</p>
                    <p className="font-mono font-medium text-slate-800 mt-0.5">{data.esi_number || 'Exempt / Not Enrolled'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Bank Name</p>
                    <p className="font-medium text-slate-800 mt-0.5">{data.bank_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Bank Account No.</p>
                    <p className="font-mono font-medium text-slate-800 mt-0.5">{data.bank_account_number || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Bank IFSC</p>
                    <p className="font-mono font-medium text-slate-800 mt-0.5">{data.bank_ifsc || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Tax Regime</p>
                    <p className="font-medium text-amber-700 uppercase mt-0.5">{(data as any).tax_regime || 'New Regime'}</p>
                  </div>
                </div>
              </div>

              {data.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Administrative Notes</p>
                  <p className="text-slate-600">{data.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORG HIERARCHY */}
          {activeTab === 'org' && (
            <div className="space-y-6">
              {/* Manager Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Direct Supervisor / Manager</p>
                {data.reporting_manager ? (
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                        {data.reporting_manager.display_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{data.reporting_manager.display_name}</p>
                        <p className="text-xs text-slate-500">{data.reporting_manager.designation || 'Reporting Lead'} • {data.reporting_manager.employee_code}</p>
                      </div>
                    </div>
                    {onSelectOtherEmployee && (
                      <button
                        onClick={() => onSelectOtherEmployee(data.reporting_manager!.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1"
                      >
                        View Profile
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No reporting manager assigned (Executive Head of Entity).</p>
                )}
              </div>

              {/* Direct Reports */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Direct Reports ({data.direct_reports?.length || 0})
                </p>
                {data.direct_reports && data.direct_reports.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.direct_reports.map((report) => (
                      <div key={report.id} className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {report.display_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-slate-900 truncate">{report.display_name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{report.designation || 'Staff'} • {report.department || 'Operations'}</p>
                          </div>
                        </div>
                        {onSelectOtherEmployee && (
                          <button
                            onClick={() => onSelectOtherEmployee(report.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md shrink-0 ml-2"
                            title="View Profile"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">This employee currently has no direct subordinate reports.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Current Month Attendance Roll</h3>
                <span className="text-xs text-slate-500 font-medium">Logged punches & regularized events</span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-700 font-medium">Present</p>
                  <p className="text-lg font-bold text-emerald-900">{data.attendance_summary?.present_days || 0}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-medium">Leaves</p>
                  <p className="text-lg font-bold text-amber-900">{data.attendance_summary?.leave_days || 0}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs text-rose-700 font-medium">Absent</p>
                  <p className="text-lg font-bold text-rose-900">{data.attendance_summary?.absent_days || 0}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-700 font-medium">Half Day / WFH</p>
                  <p className="text-lg font-bold text-blue-900">
                    {(data.attendance_summary?.half_days || 0) + (data.attendance_summary?.wfh_days || 0)}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-center justify-between">
                <span>To clock in/out or view full muster roll, open the Attendance Management tab.</span>
              </div>
            </div>
          )}

          {/* TAB 4: LEAVE */}
          {activeTab === 'leave' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Leave Balances ({new Date().getFullYear()})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {data.leave_balances && data.leave_balances.length > 0 ? (
                    data.leave_balances.map((bal) => (
                      <div key={bal.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-slate-700">{bal.leave_type_code}</p>
                        <p className="text-xl font-bold text-amber-600 mt-1">{bal.remaining_days}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Avail of {bal.allocated_days}d</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic col-span-full">No leave balance quotas initialized for this year.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Leave Applications</h3>
                {data.recent_leaves && data.recent_leaves.length > 0 ? (
                  <div className="space-y-2">
                    {data.recent_leaves.map((lr) => (
                      <div key={lr.id} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{lr.leave_type_name}</span>
                            <span className="font-mono text-slate-500">({lr.request_number})</span>
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              lr.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              lr.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {lr.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-slate-500 mt-1">
                            {lr.start_date} to {lr.end_date} • <span className="font-medium text-slate-700">{lr.total_days} Day(s)</span>
                          </p>
                          <p className="text-slate-600 mt-0.5 italic">"{lr.reason}"</p>
                        </div>
                        {lr.approver_name && (
                          <div className="text-right text-[11px] text-slate-400">
                            <p>Reviewed by</p>
                            <p className="font-medium text-slate-700">{lr.approver_name}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No past leave applications on record.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PERFORMANCE */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Targets */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Key Performance Indicators & Quotas</h3>
                {data.targets && data.targets.length > 0 ? (
                  <div className="space-y-3">
                    {data.targets.map((tgt) => (
                      <div key={tgt.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{tgt.title}</p>
                            <p className="text-slate-500 text-[11px]">Period: {tgt.period_identifier} ({tgt.period_type})</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-700 text-sm">{tgt.achievement_percent}%</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              tgt.status === 'achieved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {tgt.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tgt.achievement_percent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, tgt.achievement_percent)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Target: {Number(tgt.target_value).toLocaleString()} {tgt.unit}</span>
                          <span>Achieved: {Number(tgt.achieved_value).toLocaleString()} {tgt.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No KPI targets currently assigned.</p>
                )}
              </div>

              {/* Reviews */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Appraisal & Review History</h3>
                {data.performance_reviews && data.performance_reviews.length > 0 ? (
                  <div className="space-y-3">
                    {data.performance_reviews.map((rev) => (
                      <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{rev.period}</span>
                            <span className="text-slate-500 ml-2">({rev.review_type})</span>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                            <Award className="w-3.5 h-3.5 text-amber-700" />
                            <span>{rev.rating_score} / 5.0</span>
                          </div>
                        </div>

                        {rev.strengths && (
                          <div>
                            <p className="font-semibold text-slate-700">Key Strengths:</p>
                            <p className="text-slate-600 italic">{rev.strengths}</p>
                          </div>
                        )}

                        {rev.growth_areas && (
                          <div>
                            <p className="font-semibold text-slate-700">Growth Opportunities:</p>
                            <p className="text-slate-600 italic">{rev.growth_areas}</p>
                          </div>
                        )}

                        {rev.manager_comments && (
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-slate-500">Manager Remarks ({rev.reviewer_name || 'Supervisor'}): <span className="text-slate-700">{rev.manager_comments}</span></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No performance appraisals completed yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Assigned Operational Tasks</h3>
                <span className="text-xs text-slate-500">{data.tasks?.length || 0} total tasks</span>
              </div>

              {data.tasks && data.tasks.length > 0 ? (
                <div className="space-y-2">
                  {data.tasks.map((tsk) => (
                    <div key={tsk.id} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{tsk.title}</span>
                          <span className="font-mono text-slate-400">{tsk.task_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            tsk.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                            tsk.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {tsk.priority.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            tsk.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            tsk.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {tsk.status.toUpperCase()}
                          </span>
                        </div>
                        {tsk.description && <p className="text-slate-600">{tsk.description}</p>}
                        <p className="text-slate-400 text-[11px]">Due: {new Date(tsk.due_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No tasks currently assigned to this employee.</p>
              )}
            </div>
          )}

          {/* TAB 7: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Document Form */}
              <form onSubmit={handleUploadDoc} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  Attach New Compliance or Identity Document
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">Document Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aadhaar Card, Degree Certificate"
                      value={newDoc.title}
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Category *</label>
                    <select
                      value={newDoc.document_type}
                      onChange={(e) => setNewDoc({ ...newDoc, document_type: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="id_proof">Identity Proof (Aadhaar/PAN/Passport)</option>
                      <option value="contract">Employment Contract / Offer Letter</option>
                      <option value="education_certificate">Educational / Degree Certificate</option>
                      <option value="medical_fitness">Medical Fitness / Health Checkup</option>
                      <option value="other">Other Supporting Document</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">File Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. employee_id_proof.pdf"
                      value={newDoc.file_name}
                      onChange={(e) => setNewDoc({ ...newDoc, file_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploadingDoc}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingDoc ? 'Attaching...' : 'Upload & Save'}
                  </button>
                </div>
              </form>

              {/* Documents List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Attached Documents</h4>
                {data.documents && data.documents.length > 0 ? (
                  <div className="space-y-2">
                    {data.documents.map((doc) => (
                      <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{doc.title}</span>
                              <span className="text-slate-400 capitalize">({doc.document_type.replace('_', ' ')})</span>
                              {doc.is_verified ? (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                  Pending Verification
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5">{doc.file_name} • {(doc.file_size ? (doc.file_size / 1024).toFixed(0) : 512)} KB</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!doc.is_verified && (
                            <button
                              type="button"
                              onClick={() => handleVerifyDoc(doc.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium"
                            >
                              Verify
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No documents attached yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: OPERATIONS (FIELD SALES & FINANCE) */}
          {activeTab === 'operations' && (
            <div className="space-y-6">
              {/* Field Sales Data */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-600" />
                  Field Sales 360 Activity (Phase 20 Cross-Module)
                </h3>
                {data.field_sales_data ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500">Assigned Territory</p>
                      <p className="font-bold text-slate-900 text-xs mt-1">{data.field_sales_data.assigned_territory}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500">Visits Completed</p>
                      <p className="font-bold text-slate-900 text-lg mt-1">{data.field_sales_data.total_visits_month}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500">Orders Booked</p>
                      <p className="font-bold text-emerald-700 text-lg mt-1">{data.field_sales_data.total_orders_month}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500">Collections Done</p>
                      <p className="font-bold text-amber-700 text-lg mt-1">₹{data.field_sales_data.total_collections_month.toLocaleString()}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">This employee is not mapped to field sales territory or visit activities.</p>
                )}
              </div>

              {/* Finance Expense Claims */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Finance & Expense Claims (Phase 19 Cross-Module)
                </h3>
                {data.expense_claims && data.expense_claims.length > 0 ? (
                  <div className="space-y-2">
                    {data.expense_claims.map((exp: any) => (
                      <div key={exp.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900">{exp.expense_number}</span>
                          <span className="text-slate-500 ml-2">• {exp.category_name}</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">{exp.expense_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">₹{Number(exp.total_amount).toLocaleString()}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            exp.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {exp.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No operational expense claims filed by this employee.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: EDIT PROFILE */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Employee profile details saved successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Middle Name</label>
                  <input
                    type="text"
                    value={editForm.middle_name}
                    onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Primary Phone *</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Designation</label>
                  <select
                    value={editForm.designation_id}
                    onChange={(e) => setEditForm({ ...editForm, designation_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="">-- None Selected --</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Employment Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="probation">Probation</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Employment Type</label>
                  <select
                    value={editForm.employment_type}
                    onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contractual</option>
                    <option value="intern">Intern</option>
                    <option value="trainee">Trainee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-600 mb-1 font-medium">Full Residential Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={editForm.emergency_contact_name}
                    onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.emergency_contact_phone}
                    onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse, Father, Sister"
                    value={editForm.emergency_contact_relation}
                    onChange={(e) => setEditForm({ ...editForm, emergency_contact_relation: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-600 mb-1 font-medium">Internal Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between text-xs text-slate-500">
          <span>Joined on {data.joining_date} • Canonical Staff ID: {data.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
