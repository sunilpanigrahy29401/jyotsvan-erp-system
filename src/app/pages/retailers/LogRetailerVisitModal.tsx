import React, { useState } from 'react';
import { X, Calendar, Users, Store } from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerMaster, RetailerVisitPurpose } from '../../../types/retailers.ts';

interface LogRetailerVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  retailers: RetailerMaster[];
  preselectedRetailer?: RetailerMaster | null;
}

export const LogRetailerVisitModal: React.FC<LogRetailerVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  retailers,
  preselectedRetailer,
}) => {
  const [retailerId, setRetailerId] = useState(preselectedRetailer?.id || '');
  const [salespersonName, setSalespersonName] = useState('Rahul Deshmukh (TSO)');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState<RetailerVisitPurpose>('routine_order_booking');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
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
      await retailerApi.logVisit({
        retailer_id: selRetailerId,
        salesperson_name: salespersonName,
        visit_date: visitDate,
        purpose,
        notes,
        outcome,
        next_follow_up_date: nextFollowUpDate || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Log Field Sales Beat Visit</h2>
              <p className="text-xs text-slate-500">Record on-site visit findings, order booking, or payment review.</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-medium">Sales Officer Name *</label>
              <input
                type="text"
                value={salespersonName}
                onChange={(e) => setSalespersonName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium">Visit Date *</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-600 font-medium">Visit Purpose *</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as RetailerVisitPurpose)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="routine_order_booking">Routine Order Booking</option>
              <option value="stock_audit">Stock & Shelf Audit</option>
              <option value="payment_followup">Payment Collection / Follow-up</option>
              <option value="new_product_pitch">New Product Launch Pitch</option>
              <option value="issue_resolution">Issue / Return Resolution</option>
              <option value="promotional_drive">Trade Scheme / Promotional Drive</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 font-medium">Discussion Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Checked Bio-NPK stock; counter requested 20 bottles additional allocation"
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="text-slate-600 font-medium">Outcome / Commitments</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Booked order #SO-REQ-901 for 24 bottles"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="text-slate-600 font-medium">Next Scheduled Follow-up (Auto-creates Task)</label>
            <input
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Logging...' : 'Log Field Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
