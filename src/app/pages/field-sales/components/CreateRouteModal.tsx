// src/app/pages/field-sales/components/CreateRouteModal.tsx
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Building2,
  Store,
  Navigation,
  Search,
} from 'lucide-react';
import type { RouteFrequency, FieldCustomerType } from '../../../../types/field-sales';

interface CreateRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (route: any) => void;
}

interface RouteStopDraft {
  customerType: FieldCustomerType;
  customerId: string;
  customerName: string;
  city?: string;
  plannedSequence: number;
}

export const CreateRouteModal: React.FC<CreateRouteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<RouteFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<string>('Monday');
  const [territoryId, setTerritoryId] = useState<string>('ter-mh-west');

  // Stop list
  const [stops, setStops] = useState<RouteStopDraft[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchAvailableCustomers();
    }
  }, [isOpen]);

  const fetchAvailableCustomers = async () => {
    try {
      const res = await fetch('/api/field-sales/customers?type=all', {
        headers: { 'x-organization-id': 'org-jyotsvan-corp' },
      });
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setAvailableCustomers(json.data);
      }
    } catch (err) {
      console.warn('Failed to load customers for route', err);
    }
  };

  if (!isOpen) return null;

  const addStop = (customer: any) => {
    if (stops.some((s) => s.customerId === customer.id)) {
      return; // Already added
    }
    setStops([
      ...stops,
      {
        customerType: customer.customer_type || 'retailer',
        customerId: customer.id,
        customerName: customer.name,
        city: customer.city || customer.territory_name,
        plannedSequence: stops.length + 1,
      },
    ]);
  };

  const removeStop = (index: number) => {
    const updated = stops.filter((_, i) => i !== index);
    // re-sequence
    const resequenced = updated.map((s, idx) => ({ ...s, plannedSequence: idx + 1 }));
    setStops(resequenced);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a route / beat name.');
      return;
    }
    if (stops.length === 0) {
      setError('Please add at least one customer stop to the beat.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/field-sales/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'org-jyotsvan-corp',
          'x-user-id': 'usr-fieldsales',
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          territoryId,
          frequency,
          dayOfWeek,
          stops: stops.map((s) => ({
            customerType: s.customerType,
            customerId: s.customerId,
            plannedSequence: s.plannedSequence,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create route beat.');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = availableCustomers.filter((c) => {
    if (!customerSearch) return true;
    return (
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.city?.toLowerCase().includes(customerSearch.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Journey Plan (Beat Route)</h3>
              <p className="text-xs text-slate-500">Define permanent journey beats & sequence stops</p>
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Route Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Nashik Central Agri Beat"
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Route Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="E.g., BEAT-NSK-01"
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RouteFrequency)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Schedule</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Day</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white outline-none"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
          </div>

          {/* Add Stops Box */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Add Customers to Beat ({stops.length} stops)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search distributors or retailers..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-lg">
              {filteredCustomers.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="p-2 flex items-center justify-between text-xs hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-900 block truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-500 capitalize">
                      {c.customer_type} • {c.city || 'Standard Area'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addStop(c)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold shrink-0"
                  >
                    + Stop
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sequenced Stops List */}
          <div className="space-y-1.5">
            {stops.map((stop, idx) => (
              <div
                key={stop.customerId}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                    {stop.plannedSequence}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 block truncate">{stop.customerName}</span>
                    <span className="text-[10px] text-slate-500 capitalize">
                      {stop.customerType} • {stop.city}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeStop(idx)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
              disabled={loading || stops.length === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Save Beat Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
