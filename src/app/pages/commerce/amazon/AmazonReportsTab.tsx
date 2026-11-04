// src/app/pages/commerce/amazon/AmazonReportsTab.tsx
// Phase 31: Amazon Reports Engine (SP-API Reports 2021-06-30 Specification)

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  Download,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';
import type { AmazonReport } from '../../../../types/amazon.ts';

interface AmazonReportsTabProps {
  selectedMarketplace: string;
}

const REPORT_TYPES = [
  {
    type: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
    name: 'All Orders Report (Flat File)',
    desc: 'Complete order header and item data for all MFN and FBA orders.',
  },
  {
    type: 'GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA',
    name: 'FBA Manage Inventory Report',
    desc: 'Real-time FC unsuppressed inventory balances, condition and warehouse status.',
  },
  {
    type: 'GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2',
    name: 'Settlement Flat File V2 Report',
    desc: 'Financial disbursements, transaction fees, closing fees, and GST credits.',
  },
  {
    type: 'GET_FBA_ESTIMATED_FEE_TXT_DATA',
    name: 'FBA Fee Preview Report',
    desc: 'Estimates of referral fee, weight handling, and storage fees across all ASINs.',
  },
  {
    type: 'GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA',
    name: 'FBA Customer Returns Report',
    desc: 'Detailed return reasons, customer disposition, and carrier damage logs.',
  },
];

export function AmazonReportsTab({ selectedMarketplace }: AmazonReportsTabProps) {
  const [reports, setReports] = useState<AmazonReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedType, setSelectedType] = useState(REPORT_TYPES[0].type);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await amazonApi.getReports({});
      setReports(res.reports);
    } catch (err) {
      console.error('Failed to load Amazon reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedMarketplace]);

  const handleRequestReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    try {
      await amazonApi.requestReport({
        reportType: selectedType,
        marketplaceId: selectedMarketplace !== 'ALL' ? selectedMarketplace : undefined,
      });
      setShowRequestModal(false);
      await fetchReports();
    } catch (err) {
      console.error('Failed to request report:', err);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">SP-API Asynchronous Reports Pipeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Complies with Amazon 2021-06-30 Reports API. Reports are queued, compiled in AWS S3, and ingested into PostgreSQL.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchReports}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition"
            title="Refresh reports list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Report Type & ID</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-center">Lifecycle Status</th>
                <th className="py-3 px-4 text-center">Ingestion Status</th>
                <th className="py-3 px-4 text-center">Records Parsed</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Fetching report documents...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No reports requested yet. Click "Generate Report" above to trigger an SP-API document pull.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono text-xs">{r.report_type}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">ID: {r.report_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                          r.report_status === 'DONE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {r.report_status === 'DONE' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {r.report_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {r.processing_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {r.records_parsed || 0} rows
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => alert(`Simulated document download for report ${r.report_id}`)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Request Amazon SP-API Report</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select the SP-API report document you wish to generate and ingest into the ERP.
            </p>

            <form onSubmit={handleRequestReport} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Report Type
                </label>
                <div className="space-y-2">
                  {REPORT_TYPES.map((rt) => (
                    <label
                      key={rt.type}
                      className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                        selectedType === rt.type
                          ? 'border-amber-500 bg-amber-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportType"
                        value={rt.type}
                        checked={selectedType === rt.type}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900">{rt.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{rt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requesting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {requesting ? 'Requesting SP-API...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
