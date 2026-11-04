import React from 'react';
import {
  PackageCheck,
  Calendar,
  Building,
  Truck,
  Eye,
  CheckCircle,
  AlertCircle,
  FileCheck2,
  Clock,
} from 'lucide-react';
import type { GoodsReceipt, GoodsReceiptStatus, GoodsReceiptQcStatus } from '../../../types/procurement';

interface GoodsReceiptListTableProps {
  receipts: GoodsReceipt[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onSelectReceipt: (receipt: GoodsReceipt) => void;
}

export const GoodsReceiptListTable: React.FC<GoodsReceiptListTableProps> = ({
  receipts,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onSelectReceipt,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  const getQcBadge = (status: GoodsReceiptQcStatus) => {
    switch (status) {
      case 'not_required':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Not Required</span>;
      case 'pending_qc':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending QC</span>;
      case 'qc_approved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">QC Passed</span>;
      case 'qc_rejected':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">QC Rejected</span>;
      default:
        return <span className="text-xs text-slate-600">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading goods receipts (GRNs)...</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
          <PackageCheck className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 mb-1">No Goods Receipts Found</h4>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
          No goods receipt notes match your criteria. When deliveries arrive at the warehouse dock, create a GRN against an active PO to update inventory balances.
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
              <th className="px-5 py-3.5">GRN Number</th>
              <th className="px-4 py-3.5">Purchase Order</th>
              <th className="px-4 py-3.5">Supplier / Vendor</th>
              <th className="px-4 py-3.5">Warehouse / Dock</th>
              <th className="px-4 py-3.5">Received Date</th>
              <th className="px-4 py-3.5 text-center">QC Status</th>
              <th className="px-4 py-3.5 text-center">Inventory Posted</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
            {receipts.map((grn) => (
              <tr
                key={grn.id}
                id={`grn-row-${grn.id}`}
                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                onClick={() => onSelectReceipt(grn)}
              >
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
                      <PackageCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {grn.grn_number}
                      </div>
                      {grn.delivery_challan_number && (
                        <div className="text-[11px] text-slate-400">
                          Challan: {grn.delivery_challan_number}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="font-medium text-slate-800">{grn.purchase_order_number || 'PO'}</div>
                  {grn.supplier_reference && (
                    <div className="text-xs text-slate-400">Ref: {grn.supplier_reference}</div>
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-800">{grn.supplier_name || 'Vendor'}</div>
                  <div className="text-xs text-slate-400">{grn.supplier_code}</div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {grn.warehouse_name || 'Warehouse'}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center text-xs text-slate-700">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {new Date(grn.received_date).toLocaleDateString()}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {getQcBadge(grn.qc_status)}
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {grn.inventory_posted ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Posted
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                      Pending Post
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    id={`btn-view-grn-${grn.id}`}
                    onClick={() => onSelectReceipt(grn)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                    title="View GRN Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{receipts.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> of{' '}
          <span className="font-semibold text-slate-700">{total}</span> goods receipts
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
