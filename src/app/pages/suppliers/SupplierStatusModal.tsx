import React, { useState } from 'react';
import { X, ShieldAlert, Check, AlertCircle } from 'lucide-react';
import { SupplierStatus } from '../../../types/suppliers';

interface SupplierStatusModalProps {
  isOpen: boolean;
  supplierName: string;
  currentStatus: SupplierStatus;
  onClose: () => void;
  onConfirm: (newStatus: SupplierStatus, reason?: string) => Promise<void>;
}

export const SupplierStatusModal: React.FC<SupplierStatusModalProps> = ({
  isOpen,
  supplierName,
  currentStatus,
  onClose,
  onConfirm,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<SupplierStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === 'blocked' && !reason.trim()) {
      setError('A reason is mandatory when blocking or blacklisting a vendor');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(selectedStatus, reason.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update supplier status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Vendor Status</h3>
              <p className="text-xs text-slate-500">{supplierName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Lifecycle Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'active', label: 'Active', desc: 'Authorized for PO creation' },
                { id: 'inactive', label: 'Inactive', desc: 'Temporarily paused' },
                { id: 'blocked', label: 'Blocked', desc: 'Disqualified / Compliance hold' },
                { id: 'archived', label: 'Archived', desc: 'Historical records only' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStatus(st.id as SupplierStatus)}
                  className={`p-2.5 text-left rounded-lg border text-xs transition-all ${
                    selectedStatus === st.id
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">{st.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Status Audit Justification {selectedStatus === 'blocked' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Disqualified due to repeated QC rejections on batch MTC #412..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Updating...' : 'Confirm Status Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
