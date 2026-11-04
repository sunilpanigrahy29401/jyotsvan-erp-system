import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert, Lock, RotateCcw } from 'lucide-react';
import type { Batch, BatchStatus } from '../../../types/batches';

interface BatchStatusModalProps {
  batch: Batch;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { targetStatus: BatchStatus; reason: string; justification?: string }) => Promise<void>;
}

export function BatchStatusModal({ batch, isOpen, onClose, onSubmit }: BatchStatusModalProps) {
  const [targetStatus, setTargetStatus] = useState<BatchStatus>(
    batch.status === 'quarantine' ? 'released' : 'hold'
  );
  const [reason, setReason] = useState('QC Release Authorization');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the status change.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ targetStatus, reason, justification });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update batch status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: { value: BatchStatus; label: string; desc: string }[] = [
    { value: 'released', label: 'Released (Available)', desc: 'Release into general inventory for production or dispatch.' },
    { value: 'quarantine', label: 'Quarantine', desc: 'Isolate stock pending QA/QC verification.' },
    { value: 'hold', label: 'Investigative Hold', desc: 'Lock stock due to non-conformance or investigation.' },
    { value: 'rejected', label: 'Rejected / Non-Conforming', desc: 'Mark batch as rejected. Stock flagged for disposal or return.' },
    { value: 'recalled', label: 'Recalled', desc: 'Immediate quarantine and containment across all locations.' },
    { value: 'expired', label: 'Expired', desc: 'Past shelf-life threshold; prohibit usage.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Change Batch Status</h3>
              <p className="text-xs text-slate-500">Batch #{batch.batch_number} ({batch.sku_code})</p>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Target Status
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {statusOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                    targetStatus === opt.value
                      ? 'border-indigo-600 bg-indigo-50/40'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="targetStatus"
                    value={opt.value}
                    checked={targetStatus === opt.value}
                    onChange={(e) => setTargetStatus(e.target.value as BatchStatus)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-slate-800 block">{opt.label}</span>
                    <span className="text-xs text-slate-500 block">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Action Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., QC Certificate Approved, Packaging Deviation"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Technical Justification / Quality Audit Notes
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide context, test references, or regulatory compliance justification..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Status Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
