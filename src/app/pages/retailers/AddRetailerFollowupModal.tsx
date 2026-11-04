import React, { useState } from 'react';
import { X, Clock, Users, Store } from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerMaster, FollowupPriority } from '../../../types/retailers.ts';

interface AddRetailerFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  retailers: RetailerMaster[];
}

export const AddRetailerFollowupModal: React.FC<AddRetailerFollowupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  retailers,
}) => {
  const [retailerId, setRetailerId] = useState('');
  const [subject, setSubject] = useState('');
  const [assignedUserName, setAssignedUserName] = useState('Rahul Deshmukh (TSO)');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [priority, setPriority] = useState<FollowupPriority>('medium');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selRetailerId = retailerId || (retailers[0] && retailers[0].id);
    if (!selRetailerId) {
      setError('Please select a retailer');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await retailerApi.createFollowup({
        retailer_id: selRetailerId,
        subject,
        assigned_user_name: assignedUserName,
        due_date: dueDate,
        priority,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create follow-up task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Retailer Follow-up Task</h2>
              <p className="text-xs text-slate-500">Assign action items, overdue payment calls, or stock restock reminders.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-600 font-medium">Retailer Counter *</label>
            <select
              value={retailerId}
              onChange={(e) => setRetailerId(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">Select Retailer</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name} ({r.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-600 font-medium">Task Subject / Action *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Call regarding overdue invoice & verify bio-fertilizer inventory"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-medium">Assignee Name *</label>
              <input
                type="text"
                value={assignedUserName}
                onChange={(e) => setAssignedUserName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-600 font-medium">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as FollowupPriority)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 font-medium">Task Instructions / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Counter has pending payment of ₹45,000 against distributor invoice"
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
