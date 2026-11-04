import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, RotateCw, Sparkles, FileCheck, Layers, ArrowRight } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { useToast } from '../../../context/ToastContext';
import { LoadingState } from '../../../components/ui/loading-state';
import type { IntegrityReport } from '../../../types/inventory';

export function IntegrityReconciliationTab() {
  const { addToast } = useToast();
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isHealthy = report ? (report.isHealthy ?? (report.status === 'passed' && (report.discrepancies_count ?? 0) === 0)) : false;
  const checkedBalancesCount = report ? (report.checkedBalancesCount ?? report.total_balances_scanned ?? 0) : 0;
  const discrepancyCount = report ? (report.discrepancyCount ?? report.discrepancies_count ?? 0) : 0;

  const runAudit = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryApi.runIntegrityCheck();
      setReport(res);
      const healthy = res.isHealthy ?? (res.status === 'passed' && (res.discrepancies_count ?? 0) === 0);
      const discCount = res.discrepancyCount ?? res.discrepancies_count ?? 0;
      if (healthy) {
        addToast({
          type: 'success',
          title: 'Integrity Check Passed',
          message: 'All balances match physical ledger entries. Zero mathematical discrepancies found.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Integrity Discrepancies Detected',
          message: `Found ${discCount} discrepancy items requiring ledger reconciliation.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Diagnostic Audit Failed',
        message: err.message || 'Error occurred while running inventory integrity scan',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Audit Status Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className={`p-3.5 rounded-xl border flex-shrink-0 ${
            isHealthy
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            {isHealthy ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">Inventory Ledger Diagnostic & Parity Scanner</h2>
              {report && (
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  isHealthy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isHealthy ? '100% HEALTHY' : 'DISCREPANCIES FOUND'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verifies mathematical balance invariants (Available + Reserved + Damaged + Quarantine == Total) and checks for negative balances or ledger anomalies.
            </p>
          </div>
        </div>

        <button
          onClick={runAudit}
          disabled={isLoading}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2 flex-shrink-0"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Running Ledger Diagnostic...' : 'Re-Run Diagnostic Scan'}</span>
        </button>
      </div>

      {isLoading && (
        <div className="py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <LoadingState message="Executing Real-time Integrity Audit" description="Verifying row-level locks, ledger parity, and balance summation across database nodes..." />
        </div>
      )}

      {report && !isLoading && (
        <div className="space-y-6">
          {/* Diagnostic Metrics Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scanned Balances</span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {checkedBalancesCount.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Active SKU-Warehouse allocation records</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected Discrepancies</span>
              <div className={`text-3xl font-black mt-2 ${discrepancyCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {discrepancyCount.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                {discrepancyCount === 0 ? 'Zero math or balance violations' : 'Inconsistencies detected'}
              </span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Timestamp</span>
              <div className="text-sm font-bold text-slate-800 mt-3 font-mono">
                {new Date(report.timestamp).toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">PostgreSQL Read-Committed Snapshot</span>
            </div>
          </div>

          {/* Diagnostic Results Section */}
          {isHealthy ? (
            <div className="p-8 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700 flex-shrink-0">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900">Deterministic Ledger Parity Confirmed</h3>
                <p className="text-xs text-emerald-700 mt-1 max-w-2xl">
                  Every storage node adheres to row-level concurrency standards. The sum of available, reserved, damaged, and quarantine units matches total physical inventory with zero negative quantities.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-red-50/80 border-b border-red-200 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-bold text-red-900">Discrepancy Details & Recommended Rectification</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Balance ID</th>
                      <th className="py-2.5 px-4">SKU Code</th>
                      <th className="py-2.5 px-4">Warehouse</th>
                      <th className="py-2.5 px-4">Discrepancy Issue</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.discrepancies.map((d, idx) => (
                      <tr key={idx} className="hover:bg-red-50/30">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{d.balance_id || 'N/A'}</td>
                        <td className="py-3 px-4 font-mono text-slate-900">{d.sku_code || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-700">{d.warehouse_name || 'N/A'}</td>
                        <td className="py-3 px-4 font-semibold text-red-700">{d.type.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-4 text-slate-600">{d.details || d.description || 'Discrepancy flagged'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Architectural Security Notice */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>Architectural Ledger Safeguards</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              InsForge Inventory Engine executes all stock-altering actions within isolated database transactions featuring <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]">SELECT ... FOR UPDATE</code> row-level pessimistic locking. All mutations trigger an immutable ledger entry in <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]">inventory_movements</code> with actor timestamps, idempotency tokens, and before/after quantity stamps.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
