import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  User,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Package,
  Layers,
  Send,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import type { PurchaseRequest, PurchaseRequestItem } from '../../../types/procurement';
import { procurementApi } from '../../../services/procurementApi';

interface PurchaseRequestDetailDrawerProps {
  isOpen: boolean;
  requestId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onConvertToPo: (request: PurchaseRequest) => void;
}

export const PurchaseRequestDetailDrawer: React.FC<PurchaseRequestDetailDrawerProps> = ({
  isOpen,
  requestId,
  onClose,
  onRefresh,
  onConvertToPo,
}) => {
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && requestId) {
      loadRequest(requestId);
    } else {
      setRequest(null);
      setShowRejectBox(false);
      setError(null);
    }
  }, [isOpen, requestId]);

  const loadRequest = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await procurementApi.getPurchaseRequestById(id);
      setRequest(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load requisition details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'submit' | 'approve' | 'reject' | 'cancel') => {
    if (!request) return;
    setActionLoading(true);
    setError(null);
    try {
      if (action === 'submit') {
        await procurementApi.submitPurchaseRequest(request.id);
      } else if (action === 'approve') {
        await procurementApi.approvePurchaseRequest(request.id);
      } else if (action === 'reject') {
        if (!rejectNote.trim()) {
          setError('Please specify a rejection reason or note.');
          setActionLoading(false);
          return;
        }
        await procurementApi.rejectPurchaseRequest(request.id, rejectNote.trim());
      } else if (action === 'cancel') {
        await procurementApi.cancelPurchaseRequest(request.id, 'User cancelled');
      }
      onRefresh();
      loadRequest(request.id);
      setShowRejectBox(false);
    } catch (err: any) {
      setError(err.message || `Failed to perform ${action} action`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {request?.request_number || 'Purchase Requisition'}
                </h3>
                {request?.priority && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                    request.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                    request.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {request.priority}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Created on {request ? new Date(request.created_at).toLocaleDateString() : '...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
              <p className="text-sm text-slate-500">Loading requisition details...</p>
            </div>
          ) : request ? (
            <>
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-500" />
                  {error}
                </div>
              )}

              {/* Status Header Overview */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className="text-sm font-bold text-slate-800 capitalize mt-0.5 inline-block">
                    {request.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Department</span>
                  <span className="text-sm font-semibold text-slate-800 mt-0.5 inline-block">
                    {request.department_name || 'Operations'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Required Date</span>
                  <span className="text-sm font-semibold text-slate-800 mt-0.5 inline-block">
                    {new Date(request.required_by_date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Estimated</span>
                  <span className="text-sm font-bold text-indigo-700 mt-0.5 inline-block">
                    {formatCurrency(request.total_estimated_amount)}
                  </span>
                </div>
              </div>

              {/* Requester & Approval Details */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Requested By:</span>
                  <span className="font-semibold text-slate-800">{request.requested_by_email}</span>
                </div>
                {request.purpose && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Business Purpose:</span>
                    <span className="font-medium text-slate-800 text-right max-w-xs">{request.purpose}</span>
                  </div>
                )}
                {request.approved_by_email && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Approved By:</span>
                    <span className="font-semibold text-emerald-700">
                      {request.approved_by_email} on {new Date(request.approved_at || '').toLocaleDateString()}
                    </span>
                  </div>
                )}
                {request.rejection_reason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-md text-rose-700 mt-2">
                    <span className="font-semibold block mb-0.5">Rejection / Review Notes:</span>
                    {request.rejection_reason}
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Requisition Line Items ({request.items?.length || 0})
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">Item / SKU</th>
                        <th className="px-3 py-2.5 text-right">Quantity</th>
                        <th className="px-3 py-2.5 text-right">Est. Rate</th>
                        <th className="px-3 py-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {request.items?.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">{item.product_name || item.variant_name}</div>
                            <div className="text-[11px] text-slate-500">SKU: {item.sku_code}</div>
                            {item.notes && <div className="text-[10px] text-slate-400 mt-0.5 italic">{item.notes}</div>}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900">{item.quantity}</span>{' '}
                            <span className="text-slate-500 text-[11px]">{item.unit_short_code || 'Units'}</span>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap font-medium text-slate-700">
                            {formatCurrency(item.estimated_unit_cost)}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap font-bold text-slate-900">
                            {formatCurrency(item.estimated_line_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/75 border-t border-slate-200 font-semibold text-slate-900">
                      <tr>
                        <td colSpan={3} className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] text-slate-500">
                          Grand Estimated Total:
                        </td>
                        <td className="px-3 py-2.5 text-right text-indigo-700 font-bold text-sm">
                          {formatCurrency(request.total_estimated_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Rejection Input Box if triggered */}
              {showRejectBox && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                    Specify Reason for Rejection / Return
                  </h5>
                  <textarea
                    rows={2}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Enter reason for rejection or required changes..."
                    className="w-full text-xs p-2.5 bg-white border border-rose-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-slate-800"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAction('reject')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">No data found</div>
          )}
        </div>

        {/* Drawer Action Footer */}
        {request && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              {request.status === 'draft' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('cancel')}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 transition-colors"
                >
                  Cancel Requisition
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {request.status === 'draft' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('submit')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit for Review
                </button>
              )}

              {(request.status === 'submitted' || request.status === 'under_review') && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowRejectBox(true)}
                    className="px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    Reject / Return
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('approve')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Approve Requisition
                  </button>
                </>
              )}

              {(request.status === 'approved' || request.status === 'partially_converted') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConvertToPo(request);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center shadow-xs"
                >
                  Create Purchase Order
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
