// src/app/pages/people/WorkforceTasks.tsx
// Operational Workforce Tasks, Departmental Action Items & Execution Tracking

import { useState, useEffect } from 'react';
import { 
  CheckSquare, Plus, Clock, CheckCircle2, AlertCircle, Filter, 
  Calendar, Building2, User, ChevronRight, Check, X, ShieldAlert
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { PeopleTask, Employee } from '../../../types/people.ts';

export function WorkforceTasks() {
  const [tasks, setTasks] = useState<PeopleTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [empFilter, setEmpFilter] = useState<string>('');

  // Create task modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    department_id: 'dept-sales',
    assigned_employee_id: '',
    priority: 'medium',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });
  const [creating, setCreating] = useState<boolean>(false);

  // Update status modal
  const [selectedTask, setSelectedTask] = useState<PeopleTask | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, empFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [tskList, empList] = await Promise.all([
        PeopleAPI.getTasks({
          status: statusFilter || undefined,
          employee_id: empFilter || undefined,
        }),
        PeopleAPI.getEmployees(),
      ]);

      setTasks(tskList);
      setEmployees(empList);
    } catch (err: any) {
      setError(err.message || 'Failed to load workforce tasks.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title || !createForm.due_date) return;
    setCreating(true);
    setError(null);
    try {
      await PeopleAPI.createTask({
        title: createForm.title,
        description: createForm.description || undefined,
        department_id: createForm.department_id,
        assigned_employee_id: createForm.assigned_employee_id || undefined,
        priority: createForm.priority as any,
        due_date: createForm.due_date,
      });
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        department_id: 'dept-sales',
        assigned_employee_id: '',
        priority: 'medium',
        due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateStatus(status: string) {
    if (!selectedTask) return;
    setUpdating(true);
    try {
      await PeopleAPI.updateTaskStatus(selectedTask.id, status, resolutionNotes || undefined);
      setSelectedTask(null);
      setResolutionNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update task status.');
    } finally {
      setUpdating(false);
    }
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const filteredTasks = tasks.filter(t => {
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-amber-600" />
            Workforce Operational Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational action items, departmental responsibilities, and team execution tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Assign New Task
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Action Items</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-600">Pending Assignment</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-blue-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Filter & Task List */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm">Operational Task Board</h3>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 max-w-xs"
            >
              <option value="">All Assignees</option>
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

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filteredTasks.map((t) => (
                <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50 text-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{t.title}</span>
                      <span className="font-mono text-slate-400">({t.task_number})</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                        t.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    {t.description && <p className="text-slate-600">{t.description}</p>}

                    <div className="flex items-center gap-4 text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {t.department_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {t.assigned_employee_name ? `${t.assigned_employee_name} (${t.assigned_employee_code})` : 'Unassigned'}
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Due: {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    </div>

                    {t.resolution_notes && (
                      <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                        <p className="font-semibold text-[11px]">Resolution Notes:</p>
                        <p className="italic text-[11px] mt-0.5">{t.resolution_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {t.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm"
                      >
                        Update Status
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
              <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No operational tasks found</p>
              <p className="text-xs text-slate-400 mt-1">Assign new tasks using the button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Assign Workforce Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct plant mixer sanitation check"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed instructions..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Priority *</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Assign To Staff Member</label>
                <select
                  value={createForm.assigned_employee_id}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Unassigned (Department Pool) --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.display_name} ({e.employee_code}) - {e.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {creating ? 'Assigning...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Task Status Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Update Task Progress</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 border border-slate-200">
                <p className="font-bold text-slate-900">{selectedTask.title}</p>
                <p className="text-slate-600">{selectedTask.description}</p>
                <p className="text-slate-500 text-[11px] pt-1">Due: {new Date(selectedTask.due_date).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Resolution Notes / Action Summary</label>
                <textarea
                  rows={3}
                  placeholder="Describe actions taken to complete this operational task..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('in_progress')}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold"
                >
                  Mark In Progress
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('completed')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Mark Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
