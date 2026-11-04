import React from 'react';
import {
  FileText,
  Calendar,
  User,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Eye,
  AlertCircle,
  Send,
  MoreVertical,
} from 'lucide-react';
import type { PurchaseRequest, PurchaseRequestStatus, PurchaseRequestPriority } from '../../../types/procurement';

interface PurchaseRequestListTableProps {
  requests: PurchaseRequest[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onSelectRequest: (request: PurchaseRequest) => void;
  onSubmitRequest: (id: string) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onConvertToPo: (request: PurchaseRequest) => void;
}

export const PurchaseRequestListTable: React.FC<PurchaseRequestListTableProps> = ({
  requests,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onSelectRequest,
  onSubmitRequest,
  onApproveRequest,
  onRejectRequest,
  onConvertToPo,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  const getPriorityBadge = (priority: PurchaseRequestPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Urgent</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">High</span>;
      case 'normal':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Normal</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">Low</span>;
      default:
        return <span className="text-xs text-slate-500">{priority}</span>;
    }
  };

  const getStatusBadge = (status: PurchaseRequestStatus) => {
    switch (status) {
      case 'draft':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Draft</span>;
      case 'submitted':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Submitted</span>;
      case 'under_review':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Under Review</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Returned / Rejected</span>;
      case 'partially_converted':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Partially Converted</span>;
      case 'converted_to_po':
      case 'completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">PO Created</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 line-through">Cancelled</span>;
      default:
        return <span className="text-xs text-slate-600">{status}</span>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading purchase requisitions...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 mb-1">No Purchase Requests Found</h4>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
          No requisitions match your current search or filter criteria. Create a new purchase request to begin the procurement pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">PR Number</th>
              <th className="px-4 py-3.5">Department / Purpose</th>
              <th className="px-4 py-3.5">Requested By</th>
              <th className="px-4 py-3.5">Required By</th>
              <th className="px-4 py-3.5">Priority</th>
              <th className="px-4 py-3.5 text-right">Est. Amount</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
            {requests.map((pr) => (
              <tr
                key={pr.id}
                id={`pr-row-${pr.id}`}
                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                onClick={() => onSelectRequest(pr)}
              >
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {pr.request_number}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(pr.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="font-medium text-slate-800">{pr.department_name || 'General Operations'}</div>
                  <div className="text-xs text-slate-500 truncate max-w-xs">{pr.purpose || 'Material replenishment'}</div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-800">{pr.requested_by_email?.split('@')[0]}</div>
                  <div className="text-xs text-slate-400">{pr.requested_by_email}</div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center text-xs text-slate-700 font-medium">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    {new Date(pr.required_by_date).toLocaleDateString()}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {getPriorityBadge(pr.priority)}
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-right font-semibold text-slate-900">
                  {formatCurrency(pr.total_estimated_amount)}
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(pr.status)}
                </td>

                <td className="px-5 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end space-x-2">
                    {pr.status === 'draft' && (
                      <button
                        type="button"
                        id={`btn-submit-pr-${pr.id}`}
                        onClick={() => onSubmitRequest(pr.id)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center"
                        title="Submit for review"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Submit
                      </button>
                    )}

                    {(pr.status === 'submitted' || pr.status === 'under_review') && (
                      <>
                        <button
                          type="button"
                          id={`btn-approve-pr-${pr.id}`}
                          onClick={() => onApproveRequest(pr.id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center"
                          title="Approve Requisition"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                        <button
                          type="button"
                          id={`btn-reject-pr-${pr.id}`}
                          onClick={() => onRejectRequest(pr.id)}
                          className="px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                          title="Return with notes"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {(pr.status === 'approved' || pr.status === 'partially_converted') && (
                      <button
                        type="button"
                        id={`btn-convert-po-${pr.id}`}
                        onClick={() => onConvertToPo(pr)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors flex items-center"
                        title="Generate Purchase Order"
                      >
                        Create PO
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    )}

                    <button
                      type="button"
                      id={`btn-view-pr-${pr.id}`}
                      onClick={() => onSelectRequest(pr)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{requests.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> of{' '}
          <span className="font-semibold text-slate-700">{total}</span> requisitions
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-medium"
          >
            Previous
          </button>
          <span className="px-2 font-medium text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
