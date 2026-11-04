// src/app/pages/field-sales/components/CheckInModal.tsx
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
  RefreshCw,
  Building2,
  Store,
} from 'lucide-react';
import type { FieldSalesVisit } from '../../../../types/field-sales';

interface CheckInModalProps {
  isOpen: boolean;
  visit: FieldSalesVisit | null;
  onClose: () => void;
  onSuccess: (updatedVisit: FieldSalesVisit) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  visit,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Request GPS when modal opens
  useEffect(() => {
    if (isOpen && visit) {
      setNotes('');
      setError(null);
      acquireGPS();
    }
  }, [isOpen, visit]);

  const acquireGPS = () => {
    setGpsLoading(true);
    setGpsErrorMsg(null);

    if (!('geolocation' in navigator)) {
      setGpsLoading(false);
      setGpsErrorMsg('GPS location is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsErrorMsg(
          err.code === 1
            ? 'Location permission was denied. You may still proceed with manual check-in.'
            : 'Unable to acquire GPS coordinates. You may continue with manual check-in.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  if (!isOpen || !visit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/field-sales/visits/${visit.id}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': visit.organization_id,
          'x-user-id': visit.salesperson_id,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to record check-in.');
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
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Visit Check-In</h3>
              <p className="text-xs text-slate-500">Record on-site arrival & coordinates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Summary Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
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
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 truncate">
                  {visit.customer_name}
                </span>
                <span className="text-[11px] font-medium text-slate-500 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                  {visit.customer_type}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {visit.customer_address || visit.customer_city || 'Registered location'}
              </p>
            </div>
          </div>

          {/* GPS Status Box */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Geolocation Verification
              </span>
              <button
                type="button"
                onClick={acquireGPS}
                disabled={gpsLoading}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                Retry GPS
              </button>
            </div>

            {gpsLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Acquiring high-accuracy satellite fix...</span>
              </div>
            ) : latitude && longitude ? (
              <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Coordinates Captured
                  </span>
                  {accuracy && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      ±{Math.round(accuracy)}m precision
                    </span>
                  )}
                </div>
                <p className="text-slate-600 font-mono text-[11px]">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p>{gpsErrorMsg || 'GPS not available. Manual check-in will be logged.'}</p>
              </div>
            )}
          </div>

          {/* Optional Check-in Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Arrival Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Met with proprietor Mr. Patel at the main counter..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Arrival
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
