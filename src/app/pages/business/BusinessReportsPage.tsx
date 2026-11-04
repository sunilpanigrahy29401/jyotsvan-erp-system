// src/app/pages/business/BusinessReportsPage.tsx
// Phase 36: Centralized Enterprise Reports Engine & Export Workbench

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Landmark,
  Archive,
  Factory,
  ShoppingBag,
  Megaphone,
} from 'lucide-react';
import type { ReportDefinition } from '../../../server/reports-engine-service.ts';

interface BusinessReportsPageProps {
  onNavigate?: (path: string) => void;
}

export function BusinessReportsPage({ onNavigate }: BusinessReportsPageProps) {
  const [catalogue, setCatalogue] = useState<ReportDefinition[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('sales-by-sku');
  const [activeReportData, setActiveReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const loadCatalogue = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/catalogue');
      if (res.ok) {
        const j = await res.json();
        setCatalogue(j.reports || []);
      }
    } catch (err) {
      console.error('Failed to load reports catalogue:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeSelectedReport = async (reportId: string) => {
    try {
      setIsExecuting(true);
      const res = await fetch(`/api/reports/execute/${reportId}`);
      if (res.ok) {
        const j = await res.json();
        setActiveReportData(j);
      }
    } catch (err) {
      console.error('Failed to execute report:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    loadCatalogue();
  }, []);

  useEffect(() => {
    if (selectedReportId) {
      executeSelectedReport(selectedReportId);
    }
  }, [selectedReportId]);

  const handleExportCsv = () => {
    window.open(`/api/reports/export/${selectedReportId}`, '_blank');
  };

  const filteredCatalogue = catalogue.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categories = ['ALL', 'Sales', 'Finance', 'Inventory', 'Manufacturing', 'Procurement', 'Commerce', 'Marketing'];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Reports Engine</h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {catalogue.length} Standard Reports
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-domain statutory, commercial, production, and marketplace reports with CSV export and subledger reconciliation.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => executeSelectedReport(selectedReportId)}
              disabled={isExecuting}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isExecuting ? 'animate-spin' : ''}`} />
              Run Report
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar: Report Catalogue */}
        <div className="w-full md:w-80 bg-white border-r border-slate-200 p-4 space-y-4 shrink-0">
          <div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                  categoryFilter === c
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            {filteredCatalogue.map((rep) => {
              const isSelected = selectedReportId === rep.id;
              return (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                      {rep.category}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{rep.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{rep.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Pane: Active Report View */}
        <div className="flex-1 p-6 space-y-5 overflow-x-auto">
          {activeReportData && (
            <>
              {/* Report Header Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
                      {activeReportData.definition.category}
                    </span>
                    <h2 className="text-base font-bold text-slate-900">{activeReportData.definition.title}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">{activeReportData.definition.description}</p>
                </div>

                <div className="text-xs text-slate-500">
                  Total Records: <span className="font-bold text-slate-900">{activeReportData.rows.length}</span>
                </div>
              </div>

              {/* Summary KPIs if available */}
              {activeReportData.summary && Object.keys(activeReportData.summary).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(activeReportData.summary).map(([k, v]) => (
                    <div key={k} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-400 capitalize">
                        {k.replace(/([A-Z])/g, ' $1')}
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {typeof v === 'number'
                          ? k.toLowerCase().includes('pct') || k.toLowerCase().includes('percent')
                            ? `${v}%`
                            : k.toLowerCase().includes('sales') || k.toLowerCase().includes('value') || k.toLowerCase().includes('invoiced') || k.toLowerCase().includes('collected') || k.toLowerCase().includes('due') || k.toLowerCase().includes('payout') || k.toLowerCase().includes('commissions') || k.toLowerCase().includes('gmv')
                            ? `₹${v.toLocaleString('en-IN')}`
                            : v.toLocaleString('en-IN')
                          : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                        {activeReportData.definition.columns.map((col: any) => (
                          <th
                            key={col.key}
                            className={`py-3 px-4 font-semibold ${
                              col.format === 'currency' || col.format === 'number' || col.format === 'percent'
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeReportData.rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                          {activeReportData.definition.columns.map((col: any) => {
                            const val = row[col.key];
                            return (
                              <td
                                key={col.key}
                                className={`py-3 px-4 ${
                                  col.format === 'currency' || col.format === 'number' || col.format === 'percent'
                                    ? 'text-right font-medium'
                                    : 'text-left'
                                }`}
                              >
                                {col.format === 'currency'
                                  ? `₹${Number(val || 0).toLocaleString('en-IN')}`
                                  : col.format === 'percent'
                                  ? `${val}%`
                                  : col.format === 'number'
                                  ? Number(val || 0).toLocaleString()
                                  : String(val ?? '')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
