// src/app/pages/field-sales/components/CreateVisitModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Building2,
  Store,
  Search,
  MapPin,
  Clock,
} from 'lucide-react';
import type { FieldCustomerType, VisitPurpose, FieldSalesVisit } from '../../../../types/field-sales';

interface CreateVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (visit: FieldSalesVisit) => void;
  defaultCustomerType?: FieldCustomerType;
  defaultCustomerId?: string;
}

const PURPOSES: { value: VisitPurpose; label: string }[] = [
  { value: 'routine_order_booking', label: 'Routine Order Booking & Replenishment' },
  { value: 'collection_followup', label: 'Collection & Payment Recovery' },
  { value: 'stock_audit', label: 'Stock Audit & Shelf Share Inspection' },
  { value: 'new_product_pitch', label: 'New Product Pitch & Scheme Intro' },
  { value: 'relationship_building', label: 'Relationship / Review Meeting' },
  { value: 'complaint_resolution', label: 'Complaint / Quality Issue Resolution' },
  { value: 'new_customer_onboarding', label: 'New Customer Verification & Onboarding' },
  { value: 'general_inquiry', label: 'General Market Inquiry' },
];

export const CreateVisitModal: React.FC<CreateVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCustomerType = 'retailer',
  defaultCustomerId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerType, setCustomerType] = useState<FieldCustomerType>(defaultCustomerType);
  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [plannedDate, setPlannedDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    return d.toISOString().substring(0, 16);
  });
  const [visitPurpose, setVisitPurpose] = useState<VisitPurpose>('routine_order_booking');
  const [notes, setNotes] = useState('');

  // Available customers list
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchCustomers();
    }
  }, [isOpen, customerType]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch(`/api/field-sales/customers?type=${customerType}`, {
        headers: { 'x-organization-id': 'org-jyotsvan-corp' },
      });
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setCustomers(json.data);
        if (!customerId && json.data.length > 0) {
          setCustomerId(json.data[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch customer list', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/field-sales/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'org-jyotsvan-corp',
          'x-user-id': 'usr-fieldsales',
        },
        body: JSON.stringify({
          customerType,
          customerId,
          plannedDate: new Date(plannedDate).toISOString(),
          visitPurpose,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to schedule visit.');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return true;
    return (
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.code?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.city?.toLowerCase().includes(customerSearch.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule Field Visit</h3>
              <p className="text-xs text-slate-500">Plan a customer touchpoint or beat visit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Channel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomerType('retailer');
                  setCustomerId('');
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  customerType === 'retailer'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Store className="w-4 h-4 text-blue-600" />
                Retail Merchant
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerType('distributor');
                  setCustomerId('');
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  customerType === 'distributor'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4 text-purple-600" />
                Authorized Distributor
              </button>
            </div>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Customer <span className="text-rose-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name, code, or city..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
              {loadingCustomers ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading accounts...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No accounts found.</div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setCustomerId(c.id)}
                    className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                      customerId === c.id ? 'bg-indigo-50 font-bold text-indigo-900' : 'hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {c.code} • {c.city || c.territory_name || 'All India'}
                      </span>
                    </div>
                    {customerId === c.id && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Planned Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Planned Schedule <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Visit Purpose */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Visit Purpose <span className="text-rose-500">*</span>
            </label>
            <select
              value={visitPurpose}
              onChange={(e) => setVisitPurpose(e.target.value as VisitPurpose)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            >
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Objectives & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Visit Objectives / Preparation Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Pitch seasonal bio-fertilizer range and collect invoice payment..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Footer Actions */}
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
              disabled={loading || !customerId}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Confirm Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
