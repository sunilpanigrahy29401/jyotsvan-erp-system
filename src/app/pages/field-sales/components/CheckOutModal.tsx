// src/app/pages/field-sales/components/CheckOutModal.tsx
import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
  FileText,
  Calendar,
  Building2,
  Store,
  Tag,
  MessageSquare,
} from 'lucide-react';
import type { FieldSalesVisit, VisitOutcome } from '../../../../types/field-sales';

interface CheckOutModalProps {
  isOpen: boolean;
  visit: FieldSalesVisit | null;
  onClose: () => void;
  onSuccess: (updatedVisit: FieldSalesVisit) => void;
}

const OUTCOMES: { value: VisitOutcome; label: string; description: string }[] = [
  { value: 'order_taken', label: 'Order Booked', description: 'Placed new replenishment indent or primary sales order' },
  { value: 'collection_received', label: 'Collection Received', description: 'Collected cash, cheque, or payment confirmation' },
  { value: 'followup_required', label: 'Follow-Up Required', description: 'Customer needs proposal, price list, or second visit' },
  { value: 'product_inquiry', label: 'Product Inquiry / Demo', description: 'Demonstrated product features or samples' },
  { value: 'stock_checked', label: 'Stock Audit / Shelf Verification', description: 'Audited inventory levels and shelf presence' },
  { value: 'complaint_logged', label: 'Complaint / Quality Issue', description: 'Reported quality or damaged goods dispute' },
  { value: 'relationship_meeting', label: 'Relationship / Review Meeting', description: 'Periodic business discussion & goodwill visit' },
  { value: 'new_customer_onboarded', label: 'New Merchant Onboarded', description: 'Completed documentation and initial KYC' },
  { value: 'no_order', label: 'No Order Placed', description: 'Sufficient existing stock or deferred purchasing' },
  { value: 'customer_unavailable', label: 'Customer / Owner Unavailable', description: 'Key decision maker was away from store' },
];

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  visit,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<VisitOutcome>('order_taken');
  const [notes, setNotes] = useState('');
  const [competitorInfo, setCompetitorInfo] = useState('');
  const [requestedProducts, setRequestedProducts] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  if (!isOpen || !visit) return null;

  const checkInTime = visit.check_in_time ? new Date(visit.check_in_time) : null;
  const elapsedMinutes = checkInTime
    ? Math.max(1, Math.round((Date.now() - checkInTime.getTime()) / (1000 * 60)))
    : 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/field-sales/visits/${visit.id}/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': visit.organization_id,
          'x-user-id': visit.salesperson_id,
        },
        body: JSON.stringify({
          outcome,
          notes: notes.trim() || undefined,
          competitorInfo: competitorInfo.trim() || undefined,
          requestedProducts: requestedProducts.trim() || undefined,
          nextFollowUpDate: nextFollowUpDate || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete check-out.');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Complete Visit Check-Out</h3>
              <p className="text-xs text-slate-500">Record visit outcome, insights & next actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer & Elapsed Time Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div className="min-w-0 flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  visit.customer_type === 'distributor'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {visit.customer_type === 'distributor' ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <Store className="w-4 h-4" />
                )}
              </div>
              <div className="truncate">
                <span className="font-bold text-sm text-slate-900 block truncate">
                  {visit.customer_name}
                </span>
                <span className="text-[11px] text-slate-500">
                  {visit.customer_city || 'On-ground visit'}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-500 block">Time on site</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {elapsedMinutes} mins
              </span>
            </div>
          </div>

          {/* Outcome Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary Visit Outcome <span className="text-rose-500">*</span>
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as VisitOutcome)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-medium text-slate-800"
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — ({o.description})
                </option>
              ))}
            </select>
          </div>

          {/* Meeting Notes / Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Visit Summary & Findings
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key discussion points, customer feedback, inventory position, and agreed terms..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Market / Competitor Intelligence */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Competitor Activity & Market Intel (Optional)
            </label>
            <input
              type="text"
              value={competitorInfo}
              onChange={(e) => setCompetitorInfo(e.target.value)}
              placeholder="E.g., Competitor Brand X offering 10+1 scheme; high demand for 1L liquid fertilizer..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Requested Products */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              Customer Demands / SKU Requests (Optional)
            </label>
            <input
              type="text"
              value={requestedProducts}
              onChange={(e) => setRequestedProducts(e.target.value)}
              placeholder="E.g., Requested 250ml trial packaging of Bio-Stimulant Spray"
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Follow-up Reminder */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Next Scheduled Follow-up (Optional)
            </label>
            <input
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Finish Visit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
