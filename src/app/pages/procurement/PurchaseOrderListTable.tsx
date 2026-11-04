import React from 'react';
import {
  ShoppingCart,
  Calendar,
  Building,
  Truck,
  CheckCircle,
  Eye,
  Send,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types/procurement';

interface PurchaseOrderListTableProps {
  orders: PurchaseOrder[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onSelectOrder: (order: PurchaseOrder) => void;
  onSubmitOrder: (id: string) => void;
  onApproveOrder: (id: string) => void;
  onSendOrder: (id: string) => void;
  onAcknowledgeOrder: (id: string) => void;
  onCreateGrn: (order: PurchaseOrder) => void;
}

export const PurchaseOrderListTable: React.FC<PurchaseOrderListTableProps> = ({
  orders,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onSelectOrder,
  onSubmitOrder,
  onApproveOrder,
  onSendOrder,
  onAcknowledgeOrder,
  onCreateGrn,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Draft</span>;
      case 'pending_approval':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Approval</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Approved</span>;
      case 'sent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Dispatched to Vendor</span>;
      case 'acknowledged':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Vendor Acknowledged</span>;
      case 'partially_received':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Partially Inwarded</span>;
      case 'fully_received':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">Fully Received</span>;
      case 'closed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Closed</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 line-through">Cancelled</span>;
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
        <p className="text-sm font-medium text-slate-600">Loading purchase orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 mb-1">No Purchase Orders Found</h4>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
          No purchase orders match your criteria. Create a direct PO or convert an approved PR to issue orders to vendors.
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
              <th className="px-5 py-3.5">PO Number</th>
              <th className="px-4 py-3.5">Supplier / Vendor</th>
              <th className="px-4 py-3.5">Destination Warehouse</th>
              <th className="px-4 py-3.5">Dates (Order / Exp. Delivery)</th>
              <th className="px-4 py-3.5 text-right">Total Amount</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
            {orders.map((po) => (
              <tr
                key={po.id}
                id={`po-row-${po.id}`}
                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                onClick={() => onSelectOrder(po)}
              >
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {po.po_number}
                      </div>
                      {po.purchase_request_number && (
                        <div className="text-[11px] text-slate-400">
                          Ref: {po.purchase_request_number}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-800">{po.supplier_name || 'Vendor Master'}</div>
                  <div className="text-xs text-slate-400">{po.supplier_code}</div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {po.warehouse_name || 'Central Warehouse'}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-xs text-slate-700">
                    <span className="text-slate-400">Ord:</span> {new Date(po.order_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs font-medium text-slate-900 flex items-center mt-0.5">
                    <span className="text-slate-400 mr-1">Exp:</span>
                    {new Date(po.expected_delivery_date).toLocaleDateString()}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-slate-900">
                  {formatCurrency(po.total_amount)}
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(po.status)}
                </td>

                <td className="px-5 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end space-x-2">
                    {po.status === 'draft' && (
                      <button
                        type="button"
                        id={`btn-submit-po-${po.id}`}
                        onClick={() => onSubmitOrder(po.id)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        Submit
                      </button>
                    )}

                    {po.status === 'pending_approval' && (
                      <button
                        type="button"
                        id={`btn-approve-po-${po.id}`}
                        onClick={() => onApproveOrder(po.id)}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </button>
                    )}

                    {po.status === 'approved' && (
                      <button
                        type="button"
                        id={`btn-send-po-${po.id}`}
                        onClick={() => onSendOrder(po.id)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Send Vendor
                      </button>
                    )}

                    {po.status === 'sent' && (
                      <button
                        type="button"
                        id={`btn-ack-po-${po.id}`}
                        onClick={() => onAcknowledgeOrder(po.id)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}

                    {(po.status === 'sent' || po.status === 'acknowledged' || po.status === 'partially_received') && (
                      <button
                        type="button"
                        id={`btn-receive-po-${po.id}`}
                        onClick={() => onCreateGrn(po)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors flex items-center"
                      >
                        <PackageCheck className="w-3 h-3 mr-1" />
                        Receive (GRN)
                      </button>
                    )}

                    <button
                      type="button"
                      id={`btn-view-po-${po.id}`}
                      onClick={() => onSelectOrder(po)}
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
          Showing <span className="font-semibold text-slate-700">{orders.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> of{' '}
          <span className="font-semibold text-slate-700">{total}</span> purchase orders
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
