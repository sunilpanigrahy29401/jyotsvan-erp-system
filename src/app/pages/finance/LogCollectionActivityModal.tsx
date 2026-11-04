// src/app/pages/finance/LogCollectionActivityModal.tsx
// Log Field & Phone Collection Follow-up Activity (Phase 19)

import React, { useState } from 'react';
import {
  X,
  PhoneCall,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { CollectionTask } from '../../../types/finance.ts';

interface LogCollectionActivityModalProps {
  collection: CollectionTask | null;
  isOpen: boolean;
  onClose: () => void;
  onActivityLogged: () => void;
}

export const LogCollectionActivityModal: React.FC<LogCollectionActivityModalProps> = ({
  collection,
  isOpen,
  onClose,
  onActivityLogged,
}) => {
  const [action, setAction] = useState<string>('Phone Call');
  const [contactMethod, setContactMethod] = useState<string>('phone');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [outcome, setOutcome] = useState<string>('Promise to Pay');
  const [promisedDate, setPromisedDate] = useState<string>('');
  const [promisedAmount, setPromisedAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !collection) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim()) {
      setErrorMessage('Action title is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await financeApi.logCollectionActivity(collection.id, {
        action,
        contactMethod,
        contactPerson: contactPerson || undefined,
        outcome: outcome || undefined,
        promisedDate: promisedDate || undefined,
        promisedAmount: promisedAmount > 0 ? Number(promisedAmount) : undefined,
        notes: notes || undefined,
      });

      onActivityLogged();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to log collection activity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Log Collection Activity</h2>
              <p className="text-xs text-slate-500">
                Customer: <strong className="text-slate-800">{collection.customer_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Method</label>
              <select
                value={contactMethod}
                onChange={(e) => {
                  setContactMethod(e.target.value);
                  setAction(
                    e.target.value === 'phone'
                      ? 'Phone Call'
                      : e.target.value === 'in_person'
                      ? 'Physical Visit'
                      : e.target.value === 'whatsapp'
                      ? 'WhatsApp Reminder'
                      : 'Email Dunning'
                  );
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="phone">Phone Call</option>
                <option value="in_person">In-Person Field Visit</option>
                <option value="whatsapp">WhatsApp / SMS</option>
                <option value="email">Email Notice</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Accounts Manager, Owner"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Call / Visit Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
            >
              <option value="Promise to Pay">Promise to Pay (PTP)</option>
              <option value="Cheque Handed Over">Cheque Handed Over</option>
              <option value="Disputed Invoice">Disputed Invoice / Rate Issue</option>
              <option value="Unreachable">Unreachable / No Answer</option>
              <option value="Escalation Required">Refused / Escalation Required</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Promised Date</label>
              <input
                type="date"
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Promised Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={promisedAmount || ''}
                onChange={(e) => setPromisedAmount(Number(e.target.value))}
                placeholder={String(collection.target_collection_amount || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-800 text-right"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Detailed Discussion Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record exact discussion notes, payment commitment terms, or disputes raised..."
              rows={3}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Activity Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
