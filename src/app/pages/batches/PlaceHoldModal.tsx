import React, { useState } from 'react';
import { X, Lock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Batch, BatchHoldType, BatchHoldSeverity } from '../../../types/batches';

interface PlaceHoldModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    batchId: string;
    holdType: BatchHoldType;
    severity: BatchHoldSeverity;
    reason: string;
    notes?: string;
  }) => Promise<void>;
}

export function PlaceHoldModal({ batch, isOpen, onClose, onSubmit }: PlaceHoldModalProps) {
  const [holdType, setHoldType] = useState<BatchHoldType>('investigation');
  const [severity, setSeverity] = useState<BatchHoldSeverity>('high');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a specific reason for locking this batch (min 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        batchId: batch.id,
        holdType,
        severity,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place batch hold.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Initiate Batch Containment Lock / Hold</h3>
              <p className="text-xs text-slate-500">Lock batch #{batch.batch_number} from reservations and dispatches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Product:</span>
              <span className="font-semibold text-slate-800">{batch.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Available Stock:</span>
              <span className="font-bold text-slate-900">{batch.current_quantity} {batch.unit_short_code}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Hold Classification <span className="text-rose-500">*</span>
            </label>
            <select
              value={holdType}
              onChange={(e) => setHoldType(e.target.value as BatchHoldType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
            >
              <option value="investigation">Quality Investigation (OOS / Deviation)</option>
              <option value="regulatory_hold">Regulatory / FDA Compliance Hold</option>
              <option value="recall">Supplier Upstream Recall</option>
              <option value="customer_complaint">Customer Quality Escalation</option>
              <option value="quarantine">Standard Quarantine Gate</option>
              <option value="qc_hold">QC Analytical Lock</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Severity / Risk Level <span className="text-rose-500">*</span>
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BatchHoldSeverity)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
            >
              <option value="low">Low (Routine Verification)</option>
              <option value="medium">Medium (Requires Lab Confirmation)</option>
              <option value="high">High (Immediate Stock Freeze)</option>
              <option value="critical_class_1">Critical Class 1 (Full Recall Protocol)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Trigger Reason / NCR Reference <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Deviation logged during HPLC assay analysis; suspected microbial contamination or seal compromise."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Handling & Isolation Directives
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Move physical drums to Red Tape Quarantine Cage immediately."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Locking...' : 'Confirm Hold / Quarantine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

