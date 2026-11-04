// src/app/pages/people/OnboardEmployeeModal.tsx
// Comprehensive Onboard Employee Modal with Bank, Indian Statutory Compliance, Shift & Salary Configuration

import { useState } from 'react';
import { UserPlus, X, Building2, MapPin, Mail, Phone, Calendar, Briefcase, Landmark, ShieldCheck } from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { Designation, EmploymentType, Gender } from '../../../types/people.ts';

interface OnboardEmployeeModalProps {
  designations: Designation[];
  onClose: () => void;
  onSuccess: () => void;
}

export function OnboardEmployeeModal({ designations, onClose, onSuccess }: OnboardEmployeeModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    personal_email: '',
    date_of_birth: '',
    gender: 'prefer_not_to_say' as Gender,
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Spouse',
    joining_date: new Date().toISOString().split('T')[0],
    employment_type: 'full_time' as EmploymentType,
    department_id: 'dept-sales',
    branch_id: 'br-hq-01',
    designation_id: designations[0]?.id || 'desig-sales-exec',
    reporting_manager_id: 'emp-001',
    shift_id: 'shift-gen',
    notes: '',
    
    // Banking Details
    bank_name: 'HDFC Bank',
    bank_account_number: '',
    bank_ifsc: 'HDFC0000128',

    // Indian Statutory IDs
    pan_number: '',
    aadhaar_number: '',
    uan: '',
    pf_number: '',
    esi_number: '',
  });

  function updateField(key: string, value: any) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === 'first_name' || key === 'last_name') {
        updated.display_name = `${updated.first_name} ${updated.last_name}`.trim();
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
      setError('Please complete all mandatory fields (First name, Last name, Email, Phone).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await PeopleAPI.createEmployee({
        ...form,
        gender: form.gender as Gender,
        middle_name: form.middle_name || undefined,
        alternate_phone: form.alternate_phone || undefined,
        personal_email: form.personal_email || undefined,
        date_of_birth: form.date_of_birth || undefined,
        designation_id: form.designation_id || undefined,
        reporting_manager_id: form.reporting_manager_id || undefined,
        shift_id: form.shift_id || undefined,
        bank_name: form.bank_name || undefined,
        bank_account_number: form.bank_account_number || undefined,
        bank_ifsc: form.bank_ifsc || undefined,
        pan_number: form.pan_number ? form.pan_number.toUpperCase() : undefined,
        aadhaar_number: form.aadhaar_number || undefined,
        uan: form.uan || undefined,
        pf_number: form.pf_number || undefined,
        esi_number: form.esi_number || undefined,
        status: 'active',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to onboard employee.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base">Onboard New Employee</h2>
              <p className="text-[11px] text-slate-400">Enterprise employee registration & statutory compliance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 text-xs">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Section 1: Personal Details */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> 1. Personal & Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh"
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Middle Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kumar"
                  value={form.middle_name}
                  onChange={(e) => updateField('middle_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patel"
                  value={form.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Official Corporate Email *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh.patel@jyotsvan.enterprise"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Official Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer Not To Say</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Personal Email</label>
                <input
                  type="email"
                  placeholder="ramesh@gmail.com"
                  value={form.personal_email}
                  onChange={(e) => updateField('personal_email', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Department & Employment Role */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> 2. Organizational Role, Branch & Shift
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Department *</label>
                <select
                  required
                  value={form.department_id}
                  onChange={(e) => updateField('department_id', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="dept-mgmt">Corporate Management</option>
                  <option value="dept-sales">Sales & Commercial</option>
                  <option value="dept-prod">Production & Manufacturing</option>
                  <option value="dept-proc">Procurement & Sourcing</option>
                  <option value="dept-wh">Warehouse & Logistics</option>
                  <option value="dept-qc">Quality Control</option>
                  <option value="dept-fin">Finance & Accounts</option>
                  <option value="dept-hr">Human Resources</option>
                  <option value="dept-mkt">Growth Marketing</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Branch Location *</label>
                <select
                  required
                  value={form.branch_id}
                  onChange={(e) => updateField('branch_id', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="br-hq-01">Corporate Headquarters (Mumbai)</option>
                  <option value="br-plant-01">Advanced Manufacturing Plant #1 (Bhubaneswar)</option>
                  <option value="br-delhi-01">Northern Regional Hub & Depot (Delhi)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Assigned Shift *</label>
                <select
                  required
                  value={form.shift_id}
                  onChange={(e) => updateField('shift_id', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="shift-gen">General Day Shift (09:00 - 17:30)</option>
                  <option value="shift-mfg-a">Plant Morning Shift (06:00 - 14:30)</option>
                  <option value="shift-mfg-b">Plant Evening Shift (14:00 - 22:30)</option>
                  <option value="shift-mfg-c">Plant Night Shift (22:00 - 06:30)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Designation</label>
                <select
                  value={form.designation_id}
                  onChange={(e) => updateField('designation_id', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Reporting Manager</label>
                <select
                  value={form.reporting_manager_id}
                  onChange={(e) => updateField('reporting_manager_id', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">No Reporting Manager (Self-Directing)</option>
                  <option value="emp-001">Aarav Singhania (CEO)</option>
                  <option value="emp-002">Eleanor Vance (COO)</option>
                  <option value="emp-003">David Miller (CFO)</option>
                  <option value="emp-004">Arthur Pendelton (Head Procurement)</option>
                  <option value="emp-007">Vikram Sharma (Field Sales Mgr)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Employment Type</label>
                <select
                  value={form.employment_type}
                  onChange={(e) => updateField('employment_type', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="full_time">Full Time Permanent</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Fixed-Term Contract</option>
                  <option value="intern">Apprentice / Intern</option>
                  <option value="consultant">Retainer Consultant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Indian Statutory Identifiers */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 3. Indian Statutory Compliance (EPF / ESI / PAN)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">PAN Card Number</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  value={form.pan_number}
                  onChange={(e) => updateField('pan_number', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Aadhaar Number</label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="12-digit Aadhaar"
                  value={form.aadhaar_number}
                  onChange={(e) => updateField('aadhaar_number', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">UAN (Universal Account Number)</label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="12-digit UAN"
                  value={form.uan}
                  onChange={(e) => updateField('uan', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">PF Number</label>
                <input
                  type="text"
                  placeholder="e.g. MH/BAN/0045892/009"
                  value={form.pf_number}
                  onChange={(e) => updateField('pf_number', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">ESIC Insurance Number</label>
                <input
                  type="text"
                  placeholder="17-digit ESIC code (if applicable)"
                  value={form.esi_number}
                  onChange={(e) => updateField('esi_number', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank Details for Salary Disbursement */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> 4. Banking Details for Payroll Disbursement
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Bank Name</label>
                <input
                  type="text"
                  placeholder="HDFC Bank / ICICI / SBI"
                  value={form.bank_name}
                  onChange={(e) => updateField('bank_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Bank Account Number</label>
                <input
                  type="text"
                  placeholder="Account Number"
                  value={form.bank_account_number}
                  onChange={(e) => updateField('bank_account_number', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Bank IFSC Code</label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="e.g. HDFC0000128"
                  value={form.bank_ifsc}
                  onChange={(e) => updateField('bank_ifsc', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Emergency Contact & Address */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-amber-800">
              5. Emergency Contact & Residential Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Emergency Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Patel"
                  value={form.emergency_contact_name}
                  onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Emergency Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98250 12345"
                  value={form.emergency_contact_phone}
                  onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Relationship</label>
                <input
                  type="text"
                  placeholder="Spouse / Parent / Sibling"
                  value={form.emergency_contact_relation}
                  onChange={(e) => updateField('emergency_contact_relation', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 mb-1 font-medium">Residential Address</label>
                <input
                  type="text"
                  placeholder="Flat 402, Highrise Apartments, BKC"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Onboarding Personnel...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Complete Enterprise Onboarding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
