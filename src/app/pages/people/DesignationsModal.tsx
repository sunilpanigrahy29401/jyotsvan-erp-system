// src/app/pages/people/DesignationsModal.tsx
// Designation Matrix & Job Role Hierarchy Management

import { useState, useEffect } from 'react';
import { X, Briefcase, Plus, AlertCircle, Check } from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { Designation } from '../../../types/people.ts';

interface DesignationsModalProps {
  onClose: () => void;
  departments: { id: string; name: string }[];
}

export function DesignationsModal({ onClose, departments }: DesignationsModalProps) {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    department_id: '',
    description: '',
  });
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    loadDesignations();
  }, []);

  async function loadDesignations() {
    setLoading(true);
    try {
      const data = await PeopleAPI.getDesignations();
      setDesignations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load designations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.code) return;
    setCreating(true);
    setError(null);
    try {
      await PeopleAPI.createDesignation({
        name: form.name,
        code: form.code.toUpperCase(),
        department_id: form.department_id || undefined,
        description: form.description || undefined,
      });
      setForm({ name: '', code: '', department_id: '', description: '' });
      await loadDesignations();
    } catch (err: any) {
      setError(err.message || 'Failed to create designation');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Designation Matrix & Job Titles</h2>
              <p className="text-xs text-slate-300">Standardized organizational role taxonomy and department bands</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add New Designation Form */}
          <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              Add New Designation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Title / Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Area Sales Manager"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Role Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ASM"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Mapped Department</label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Universal Role --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1 text-xs">Job Description / Responsibilities</label>
              <input
                type="text"
                placeholder="Brief scope of responsibilities..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {creating ? 'Saving...' : 'Add Designation'}
              </button>
            </div>
          </form>

          {/* Designations Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Current Active Designations ({designations.length})</h3>
            {loading ? (
              <p className="text-xs text-slate-500 py-4 text-center">Loading designations...</p>
            ) : designations.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {designations.map((des) => (
                  <div key={des.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{des.name}</span>
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          {des.code}
                        </span>
                        {des.department_name ? (
                          <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            {des.department_name}
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            All Departments
                          </span>
                        )}
                      </div>
                      {des.description && <p className="text-slate-500 mt-1 text-[11px]">{des.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No designations created yet.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
