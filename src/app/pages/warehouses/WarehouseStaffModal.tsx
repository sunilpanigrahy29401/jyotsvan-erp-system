import React, { useState, useEffect } from 'react';
import { X, Users, ShieldCheck, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { WarehouseStaffRole } from '../../../types/warehouse';

interface WarehouseStaffModalProps {
  isOpen: boolean;
  warehouseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const WarehouseStaffModal: React.FC<WarehouseStaffModalProps> = ({
  isOpen,
  warehouseId,
  onClose,
  onSuccess,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleType, setRoleType] = useState<WarehouseStaffRole>('operator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAssignableUsers();
    }
  }, [isOpen]);

  const loadAssignableUsers = async () => {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'SELECT id, email, full_name FROM users ORDER BY full_name LIMIT 50',
          params: [],
        }),
      });
      const data = await res.json();
      if (data.rows && data.rows.length > 0) {
        setUsers(data.rows);
        setSelectedUserId(data.rows[0].id);
      }
    } catch (err) {
      console.error('[Users Query Error]', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a system user to assign.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          role_type: roleType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign warehouse staff member.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Assign Warehouse Operator</h2>
              <p className="text-xs text-slate-500">Configure role responsibilities and dock permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select User Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Operational Role</label>
            <select
              value={roleType}
              onChange={(e) => setRoleType(e.target.value as WarehouseStaffRole)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 capitalize"
            >
              <option value="manager">Warehouse Facility Manager</option>
              <option value="supervisor">Floor Supervisor & Lead</option>
              <option value="operator">Material Handler / Operator</option>
              <option value="picker">Order Picking Specialist</option>
              <option value="driver">Internal Fleet Driver</option>
              <option value="auditor">Cycle Audit Specialist</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || users.length === 0}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Assigning...' : 'Assign Staff Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
