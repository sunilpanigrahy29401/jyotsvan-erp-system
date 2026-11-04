import { useState, useEffect } from 'react';
import { Building2, Package, ShieldCheck, Award, AlertTriangle, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import type { SupplierQualityReport, SkuQualityReport } from '../../../types/quality';
import { qualityApi } from '../../../services/qualityApi';

export function QualityScorecardView() {
  const [supplierReports, setSupplierReports] = useState<SupplierQualityReport[]>([]);
  const [skuReports, setSkuReports] = useState<SkuQualityReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [sup, sk] = await Promise.all([
        qualityApi.getSupplierReports(),
        qualityApi.getSkuReports(),
      ]);
      setSupplierReports(sup || []);
      setSkuReports(sk || []);
    } catch (err) {
      console.warn('Failed to load quality reports:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Intro */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Vendor Quality & Defect Compliance Telemetry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical process control across suppliers, inwards goods conformance rates, and SKU non-conformance tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
          <Award className="w-4 h-4 text-emerald-600" />
          <span>ISO 9001:2015 Conformance Engine</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Scorecard */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase">Vendor Quality Ratings</h3>
            </div>
            <span className="text-[11px] text-slate-500">{supplierReports.length} vendors evaluated</span>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Computing supplier pass ratings...</div>
            ) : supplierReports.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No supplier inspection data recorded yet.</div>
            ) : (
              supplierReports.map((sup) => (
                <div key={sup.supplier_id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{sup.supplier_name}</span>
                      <span className="font-mono text-[10px] text-slate-400 ml-2">{sup.supplier_code}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          sup.pass_rate_percentage >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : sup.pass_rate_percentage >= 75
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sup.pass_rate_percentage}% Pass Rate
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        sup.pass_rate_percentage >= 90
                          ? 'bg-emerald-500'
                          : sup.pass_rate_percentage >= 75
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${sup.pass_rate_percentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Inspected</span>
                      <span className="font-bold text-slate-900">{sup.total_inspections} lots</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Passed</span>
                      <span className="font-bold text-emerald-700">{sup.passed_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Failed</span>
                      <span className="font-bold text-rose-700">{sup.failed_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Quarantine</span>
                      <span className="font-bold text-purple-700">{sup.quarantine_count}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SKU Quality Performance */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase">SKU Conformance & Defect Rates</h3>
            </div>
            <span className="text-[11px] text-slate-500">{skuReports.length} SKUs monitored</span>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Computing SKU conformity logs...</div>
            ) : skuReports.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No SKU quality test data recorded yet.</div>
            ) : (
              skuReports.map((sku) => (
                <div key={sku.sku_id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{sku.sku_code}</span>
                      <span className="text-slate-600 text-[11px] ml-2">{sku.sku_name}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        sku.pass_rate_percentage >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : sku.pass_rate_percentage >= 75
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sku.pass_rate_percentage}% Conformance
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        sku.pass_rate_percentage >= 90
                          ? 'bg-emerald-500'
                          : sku.pass_rate_percentage >= 75
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${sku.pass_rate_percentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Batches Tested</span>
                      <span className="font-bold text-slate-900">{sku.total_inspections}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Passed Lots</span>
                      <span className="font-bold text-emerald-700">{sku.passed_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Failed Lots</span>
                      <span className="font-bold text-rose-700">{sku.failed_count}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
