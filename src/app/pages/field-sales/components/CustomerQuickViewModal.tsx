// src/app/pages/field-sales/components/CustomerQuickViewModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Building2,
  Store,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShoppingBag,
  Plus,
  Loader2,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import type { CustomerQuickView, FieldCustomerType } from '../../../../types/field-sales';

interface CustomerQuickViewModalProps {
  isOpen: boolean;
  customerType: FieldCustomerType | null;
  customerId: string | null;
  onClose: () => void;
  onScheduleVisit?: (customerType: FieldCustomerType, customerId: string) => void;
  onBookOrder?: (customerType: FieldCustomerType, customerId: string) => void;
  onRecordCollection?: (customerType: FieldCustomerType, customerId: string) => void;
}

export const CustomerQuickViewModal: React.FC<CustomerQuickViewModalProps> = ({
  isOpen,
  customerType,
  customerId,
  onClose,
  onScheduleVisit,
  onBookOrder,
  onRecordCollection,
}) => {
  const [data, setData] = useState<CustomerQuickView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'payments' | 'tasks'>('overview');

  useEffect(() => {
    if (isOpen && customerType && customerId) {
      fetchQuickView();
    } else {
      setData(null);
    }
  }, [isOpen, customerType, customerId]);

  const fetchQuickView = async () => {
    if (!customerType || !customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/field-sales/customers/${customerType}/${customerId}/quick-view`, {
        headers: {
          'x-organization-id': 'org-jyotsvan-corp',
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load customer profile.');
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                customerType === 'distributor'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {customerType === 'distributor' ? (
                <Building2 className="w-6 h-6" />
              ) : (
                <Store className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {data?.name || 'Customer 360° Snapshot'}
                </h3>
                {data?.code && (
                  <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {data.code}
                  </span>
                )}
                <span className="text-xs font-semibold capitalize bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  {customerType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {data?.address ? `${data.address}, ${data.city || ''}` : 'Loading location...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
            <p className="text-xs">Fetching customer ledger, orders & telemetry...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p>{error}</p>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-4 px-5 pt-3 border-b border-slate-200 text-xs font-semibold text-slate-500">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 border-b-2 transition ${
                  activeTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                Financial & Profile
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`pb-2.5 border-b-2 transition ${
                  activeTab === 'orders'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                Recent Orders ({data.recent_orders?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`pb-2.5 border-b-2 transition ${
                  activeTab === 'payments'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                Collections / Receipts ({data.recent_payments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`pb-2.5 border-b-2 transition ${
                  activeTab === 'tasks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent hover:text-slate-800'
                }`}
              >
                Open Tasks ({data.open_tasks?.length || 0})
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Tab 1: Overview & Financial Health */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Financial Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-xs text-slate-500 font-medium block">
                        Outstanding Balance
                      </span>
                      <span className="text-lg font-bold text-rose-600 mt-1 block">
                        {formatCurrency(data.outstanding_balance)}
                      </span>
                      <span className="text-[11px] text-slate-500">Live Subledger Balance</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-xs text-slate-500 font-medium block">Credit Limit</span>
                      <span className="text-lg font-bold text-slate-900 mt-1 block">
                        {formatCurrency(data.credit_limit)}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {formatCurrency(data.available_credit)} available
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-xs text-slate-500 font-medium block">
                        Credit Status & Terms
                      </span>
                      <div className="mt-1 flex items-center gap-1.5">
                        {data.credit_hold ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">
                            <ShieldAlert className="w-3 h-3" /> Credit Hold
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Active / Good
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Terms: Net {data.payment_terms_days} days
                      </span>
                    </div>
                  </div>

                  {/* Contact & Territory Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                      <h4 className="font-bold text-slate-900 mb-2">Contact & Territory</h4>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Phone:</span>
                        {data.phone ? (
                          <a
                            href={`tel:${data.phone}`}
                            className="font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {data.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">Not listed</span>
                        )}
                      </div>
                      {data.email && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Email:</span>
                          <span className="font-medium text-slate-800">{data.email}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Territory:</span>
                        <span className="font-medium text-slate-800">
                          {data.territory_name || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Assigned Rep:</span>
                        <span className="font-medium text-slate-800">
                          {data.primary_salesperson_name || 'Vikram Sharma'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                      <h4 className="font-bold text-slate-900 mb-2">Visit Schedule & History</h4>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Last Visit:</span>
                        <span className="font-medium text-slate-800">
                          {formatDate(data.last_visit_date)}
                        </span>
                      </div>
                      {data.last_visit_outcome && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Last Outcome:</span>
                          <span className="capitalize font-medium text-slate-800">
                            {data.last_visit_outcome.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Next Scheduled:</span>
                        <span className="font-medium text-indigo-600">
                          {formatDate(data.next_scheduled_visit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Contacts */}
                  {data.contacts && data.contacts.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <h4 className="text-xs font-bold text-slate-900 mb-2">Key People & Decision Makers</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {data.contacts.map((c, i) => (
                          <div
                            key={i}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">{c.name}</span>
                              <span className="text-[11px] text-slate-500">{c.designation}</span>
                            </div>
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {c.phone}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Recent Orders */}
              {activeTab === 'orders' && (
                <div className="space-y-2">
                  {data.recent_orders && data.recent_orders.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {data.recent_orders.map((o) => (
                        <div
                          key={o.id}
                          className="p-3.5 bg-white hover:bg-slate-50/80 transition flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block font-mono">
                              #{o.order_number}
                            </span>
                            <span className="text-[11px] text-slate-500">{formatDate(o.order_date)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 block">
                              {formatCurrency(o.grand_total)}
                            </span>
                            <span className="inline-block text-[10px] uppercase font-bold text-slate-500">
                              {o.order_status} • {o.payment_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">No orders recorded yet.</p>
                  )}
                </div>
              )}

              {/* Tab 3: Recent Payments */}
              {activeTab === 'payments' && (
                <div className="space-y-2">
                  {data.recent_payments && data.recent_payments.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {data.recent_payments.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 bg-white hover:bg-slate-50/80 transition flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block font-mono">
                              #{p.payment_number}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatDate(p.payment_date)} • {p.payment_method_name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 block">
                              +{formatCurrency(p.amount)}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold">Cleared</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">No collection receipts recorded yet.</p>
                  )}
                </div>
              )}

              {/* Tab 4: Open Tasks */}
              {activeTab === 'tasks' && (
                <div className="space-y-2">
                  {data.open_tasks && data.open_tasks.length > 0 ? (
                    <div className="space-y-2">
                      {data.open_tasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{t.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                              {t.priority}
                            </span>
                          </div>
                          {t.description && <p className="text-slate-600 text-[11px]">{t.description}</p>}
                          <p className="text-[11px] text-slate-400">Due: {formatDate(t.due_date)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">No open tasks for this customer.</p>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Field Sales Operations</span>
              <div className="flex items-center gap-2">
                {onBookOrder && (
                  <button
                    onClick={() => {
                      onClose();
                      onBookOrder(customerType!, customerId!);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Book Order
                  </button>
                )}
                {onRecordCollection && (
                  <button
                    onClick={() => {
                      onClose();
                      onRecordCollection(customerType!, customerId!);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Collect Payment
                  </button>
                )}
                {onScheduleVisit && (
                  <button
                    onClick={() => {
                      onClose();
                      onScheduleVisit(customerType!, customerId!);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Plan Visit
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
