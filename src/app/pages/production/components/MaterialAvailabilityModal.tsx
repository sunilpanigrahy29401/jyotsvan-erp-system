import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Layers,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import type { MaterialAvailabilityReport } from '../../../../types/production';
import { productionApi } from '../../../../services/productionApi';

interface MaterialAvailabilityModalProps {
  isOpen: boolean;
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onReserved: () => void;
}

export const MaterialAvailabilityModal: React.FC<MaterialAvailabilityModalProps> = ({
  isOpen,
  orderId,
  orderNumber,
  onClose,
  onReserved,
}) => {
  const [report, setReport] = useState<MaterialAvailabilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionApi.checkMaterialAvailability(orderId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check material availability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchAvailability();
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const handleReserveAll = async () => {
    setReserving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await productionApi.reserveMaterials(orderId);
      setSuccessMsg('All required materials have been atomically reserved in warehouse inventory.');
      setTimeout(() => {
        onReserved();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to reserve materials.');
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Material Availability Check
              </h3>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-medium text-slate-700">{orderNumber}</span> • Warehouse Stock Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Checking live warehouse balances & reservations...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Availability Evaluation Notice</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Overall Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  report.overall_status === 'ready'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : report.overall_status === 'reserved' || report.overall_status === 'issued'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : report.overall_status === 'partial_shortage'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {report.overall_status === 'ready' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                  {(report.overall_status === 'reserved' || report.overall_status === 'issued') && <Lock className="w-6 h-6 text-blue-600" />}
                  {report.overall_status === 'partial_shortage' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                  {report.overall_status === 'critical_shortage' && <XCircle className="w-6 h-6 text-rose-600" />}
                  <div>
                    <h4 className="text-sm font-semibold capitalize">
                      {report.overall_status === 'ready'
                        ? '100% Materials Available for Staging'
                        : report.overall_status === 'reserved'
                        ? 'Materials Already Reserved'
                        : report.overall_status === 'issued'
                        ? 'Materials Issued to Shop Floor'
                        : `Material Shortage Detected (${report.total_shortage_items} component${report.total_shortage_items > 1 ? 's' : ''})`}
                    </h4>
                    <p className="text-xs opacity-90">
                      Warehouse: <span className="font-medium">{report.warehouse_name}</span> • Total Required Value: ₹
                      {report.total_required_cost.toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchAvailability}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                >
                  Refresh Stock
                </button>
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {successMsg}
                </div>
              )}

              {/* Components Availability Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Component / SKU</th>
                      <th className="px-4 py-3 text-right">Planned Gross</th>
                      <th className="px-4 py-3 text-right">Wh. Available</th>
                      <th className="px-4 py-3 text-right">Order Reserved</th>
                      <th className="px-4 py-3 text-right">Order Issued</th>
                      <th className="px-4 py-3 text-right">Shortage</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.items.map((item, idx) => (
                      <tr key={item.component_id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{item.sku_name}</div>
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">{item.sku_code}</span>
                            <span className="capitalize text-slate-400">• {item.component_type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {item.planned_quantity.toLocaleString()} {item.unit_code}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {item.available_in_warehouse.toLocaleString()} {item.unit_code}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-indigo-600">
                          {item.already_reserved_for_order.toLocaleString()} {item.unit_code}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-blue-600">
                          {item.already_issued_for_order.toLocaleString()} {item.unit_code}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {item.shortage_quantity > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              -{item.shortage_quantity.toLocaleString()} {item.unit_code}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.status === 'fully_issued' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Issued
                            </span>
                          )}
                          {item.status === 'fully_reserved' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Reserved
                            </span>
                          )}
                          {item.status === 'available' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Available
                            </span>
                          )}
                          {item.status === 'partial_shortage' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Partial
                            </span>
                          )}
                          {item.status === 'critical_shortage' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                              Shortage
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
          >
            Close
          </button>

          {report && (report.overall_status === 'ready' || report.overall_status === 'partial_shortage') && (
            <button
              onClick={handleReserveAll}
              disabled={reserving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {reserving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Reserving Inventory...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Reserve Available Materials
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
