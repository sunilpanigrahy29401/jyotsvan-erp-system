// src/app/pages/field-sales/components/VisitCard.tsx
import React from 'react';
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Navigation,
  FileText,
  ShoppingBag,
  CreditCard,
  Building2,
  Store,
  ChevronRight,
  MoreVertical,
  Calendar,
  UserCheck,
} from 'lucide-react';
import type { FieldSalesVisit } from '../../../../types/field-sales';

interface VisitCardProps {
  visit: FieldSalesVisit;
  onCheckIn: (visit: FieldSalesVisit) => void;
  onCheckOut: (visit: FieldSalesVisit) => void;
  onQuickView: (customerType: 'distributor' | 'retailer', customerId: string) => void;
  onBookOrder: (visit: FieldSalesVisit) => void;
  onRecordCollection: (visit: FieldSalesVisit) => void;
  onStatusChange: (visit: FieldSalesVisit, newStatus: 'skipped' | 'cancelled' | 'planned') => void;
  onViewDetails?: (visit: FieldSalesVisit) => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  onCheckIn,
  onCheckOut,
  onQuickView,
  onBookOrder,
  onRecordCollection,
  onStatusChange,
  onViewDetails,
}) => {
  const formatCurrency = (val?: number | null) => {
    if (!val || val <= 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadge = () => {
    switch (visit.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            In Progress
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Skipped
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Planned
          </span>
        );
    }
  };

  const getOutcomeBadge = () => {
    if (!visit.outcome) return null;
    const label = visit.outcome.replace(/_/g, ' ');
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize border border-slate-200">
        {label}
      </span>
    );
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200">
      {/* Top Bar: Customer Type & Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              visit.customer_type === 'distributor'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {visit.customer_type === 'distributor' ? (
              <Building2 className="w-5 h-5" />
            ) : (
              <Store className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onQuickView(visit.customer_type, visit.customer_id)}
                className="text-base font-bold text-slate-900 hover:text-indigo-600 transition text-left truncate max-w-[240px] sm:max-w-md"
              >
                {visit.customer_name}
              </button>
              {visit.customer_code && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {visit.customer_code}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="capitalize font-medium text-slate-700">
                {visit.customer_type}
              </span>
              {visit.territory_name && (
                <>
                  <span>•</span>
                  <span>{visit.territory_name}</span>
                </>
              )}
              {visit.route_name && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[150px]">{visit.route_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Address & Contact Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 rounded-lg p-2.5 mb-3 border border-slate-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {visit.customer_address || visit.customer_city || 'Address on file'}
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {visit.customer_phone ? (
            <a
              href={`tel:${visit.customer_phone}`}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{visit.customer_phone}</span>
            </a>
          ) : (
            <span className="text-slate-400">No phone listed</span>
          )}
        </div>
      </div>

      {/* Visit Metadata & Purpose */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
            Purpose: {visit.visit_purpose.replace(/_/g, ' ')}
          </span>
          {getOutcomeBadge()}
        </div>

        {/* Times & Duration */}
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          {visit.check_in_time && (
            <span>In: {formatTime(visit.check_in_time)}</span>
          )}
          {visit.check_out_time && (
            <span>• Out: {formatTime(visit.check_out_time)}</span>
          )}
          {visit.duration_minutes && (
            <span className="text-slate-500">({visit.duration_minutes}m)</span>
          )}
        </div>
      </div>

      {/* GPS Verification Badge (if checked in or completed) */}
      {(visit.status === 'in_progress' || visit.status === 'completed') && (
        <div className="flex items-center gap-2 text-xs mb-3">
          {visit.location_status === 'verified' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UserCheck className="w-3 h-3" />
              GPS Location Verified ({visit.check_in_distance_meters ? `${Math.round(visit.check_in_distance_meters)}m from store` : 'On-site'})
            </span>
          ) : visit.location_status === 'out_of_range' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3 h-3" />
              Location Notice ({Math.round(visit.check_in_distance_meters || 0)}m distance)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
              Manual Check-in (No GPS)
            </span>
          )}
        </div>
      )}

      {/* Notes / Findings preview if available */}
      {visit.notes && (
        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-3 line-clamp-2 border border-slate-100">
          <span className="font-semibold text-slate-700">Notes: </span>
          {visit.notes}
        </p>
      )}

      {/* Commercial Deliverables (Orders / Collections booked during this visit) */}
      {(visit.order_amount! > 0 || visit.collection_amount! > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-3 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-xs">
          {visit.order_amount! > 0 && (
            <div>
              <span className="text-slate-500 block">Order Booked:</span>
              <span className="font-bold text-emerald-800 text-sm">
                {formatCurrency(visit.order_amount)}
              </span>
              {visit.order_taken_number && (
                <span className="block text-[10px] text-slate-500 font-mono">
                  #{visit.order_taken_number}
                </span>
              )}
            </div>
          )}
          {visit.collection_amount! > 0 && (
            <div>
              <span className="text-slate-500 block">Collection Recorded:</span>
              <span className="font-bold text-indigo-800 text-sm">
                {formatCurrency(visit.collection_amount)}
              </span>
              {visit.collection_taken_number && (
                <span className="block text-[10px] text-slate-500 font-mono">
                  #{visit.collection_taken_number}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => onQuickView(visit.customer_type, visit.customer_id)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          Quick 360°
        </button>

        <div className="flex items-center gap-2">
          {/* Planned state actions */}
          {visit.status === 'planned' && (
            <>
              <button
                onClick={() => onStatusChange(visit, 'skipped')}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition"
              >
                Skip
              </button>
              <button
                onClick={() => onCheckIn(visit)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5" />
                Check In
              </button>
            </>
          )}

          {/* In Progress state actions */}
          {visit.status === 'in_progress' && (
            <>
              <button
                onClick={() => onBookOrder(visit)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Book Order
              </button>
              <button
                onClick={() => onRecordCollection(visit)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold border border-purple-200 transition"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Collection
              </button>
              <button
                onClick={() => onCheckOut(visit)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Check Out
              </button>
            </>
          )}

          {/* Completed state view */}
          {visit.status === 'completed' && onViewDetails && (
            <button
              onClick={() => onViewDetails(visit)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded"
            >
              View Log
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
