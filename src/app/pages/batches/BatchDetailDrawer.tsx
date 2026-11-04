import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Calendar,
  Warehouse,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  History,
  FileText,
  Clock,
  ExternalLink,
  GitBranch,
  Layers,
  ArrowRight,
  TrendingDown,
  Building2,
  Lock,
} from 'lucide-react';
import { batchApi } from '../../../services/batchApi';
import type { Batch } from '../../../types/batches';

interface BatchDetailDrawerProps {
  batchId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onChangeStatus: (batch: Batch) => void;
  onPlaceHold: (batch: Batch) => void;
  onOpenTraceability: (batchNumber: string) => void;
}

export function BatchDetailDrawer({
  batchId,
  isOpen,
  onClose,
  onChangeStatus,
  onPlaceHold,
  onOpenTraceability,
}: BatchDetailDrawerProps) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [backwardTree, setBackwardTree] = useState<any[]>([]);
  const [forwardTree, setForwardTree] = useState<any[]>([]);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'quality' | 'genealogy' | 'history'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !batchId) {
      setBatch(null);
      return;
    }

    setIsLoading(true);
    Promise.all([
      batchApi.getBatchById(batchId),
      batchApi.getBackwardTree(batchId).catch(() => ({ tree: [] })),
      batchApi.getForwardTree(batchId).catch(() => ({ tree: [] })),
    ])
      .then(([bData, backData, fwdData]) => {
        setBatch(bData);
        setBackwardTree(backData.tree || []);
        setForwardTree(fwdData.tree || []);
      })
      .catch((err) => {
        console.error('Failed to load batch drawer details:', err);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, batchId]);

  if (!isOpen) return null;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'released':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Released</span>;
      case 'quarantine':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Quarantine</span>;
      case 'hold':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Quality Hold</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Rejected</span>;
      case 'recalled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Recalled</span>;
      case 'expired':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300">Expired</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status || 'Unknown'}</span>;
    }
  };

  const getShelfLifeBadge = (batch: Batch) => {
    if (!batch.expiry_date) return <span className="text-xs text-slate-400">No expiry set</span>;
    const days = batch.days_to_expiry;
    if (days === null || days === undefined) return null;

    if (days < 0) {
      return <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-sm">Expired ({Math.abs(days)}d ago)</span>;
    } else if (days <= 30) {
      return <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm">Critical: {days}d left</span>;
    } else if (days <= 90) {
      return <span className="text-xs font-semibold text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded-sm">Near Expiry: {days}d left</span>;
    } else {
      return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">Good ({days}d remaining)</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-mono font-bold text-lg text-slate-900">{batch?.batch_number || 'Loading...'}</span>
              {batch && getStatusBadge(batch.status)}
              {batch && getShelfLifeBadge(batch)}
            </div>
            <p className="text-sm font-medium text-slate-700">{batch?.product_name || batch?.variant_name}</p>
            <p className="text-xs text-slate-500">SKU: {batch?.sku_code} • Type: <span className="capitalize">{batch?.batch_type?.replace('_', ' ')}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Bar */}
        {batch && (
          <div className="grid grid-cols-4 gap-2 p-4 bg-slate-100/70 border-b border-slate-200 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Available</span>
              <span className="text-base font-bold text-emerald-600">
                {(batch.current_quantity - batch.reserved_quantity - batch.quarantine_quantity).toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">{batch.unit_short_code}</span>
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Quarantine</span>
              <span className="text-base font-bold text-amber-600">
                {batch.quarantine_quantity.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">{batch.unit_short_code}</span>
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Reserved</span>
              <span className="text-base font-bold text-indigo-600">
                {batch.reserved_quantity.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">{batch.unit_short_code}</span>
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Lot</span>
              <span className="text-base font-bold text-slate-800">
                {batch.current_quantity.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">{batch.unit_short_code}</span>
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Specs
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'stock'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Stock Balances
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'quality'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Quality & COA
          </button>
          <button
            onClick={() => setActiveTab('genealogy')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'genealogy'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Genealogy Links
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading batch profile...</div>
          ) : !batch ? (
            <div className="py-12 text-center text-slate-400 text-sm">Batch not found.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & SPECS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Timeline Dates */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Shelf-Life & Critical Dates</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Manufacturing Date</span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Expiry Date</span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Retest / Recertification</span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {batch.retest_date ? new Date(batch.retest_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Best Before</span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {batch.best_before_date ? new Date(batch.best_before_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Supplier & Source Details */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>Origin & Inward Intake</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Source Channel</span>
                        <span className="font-semibold text-slate-800 capitalize">{batch.source_type?.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Source Reference</span>
                        <span className="font-semibold text-slate-800">{batch.source_reference_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Supplier</span>
                        <span className="font-semibold text-slate-800">{batch.supplier_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Supplier Batch Lot #</span>
                        <span className="font-mono font-semibold text-slate-800">{batch.supplier_batch_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Physical & Chemical Specifications */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Specifications & Storage Conditions</span>
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Storage Environmental Parameters</span>
                        <span className="font-medium text-slate-800">{batch.storage_conditions || 'Standard warehouse storage (Ambient 20-25°C)'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <span className="text-slate-500 block">Assay Potency / Purity</span>
                          <span className="font-semibold text-slate-800">{batch.potency_or_purity ? `${batch.potency_or_purity}%` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Unit Valuation Cost</span>
                          <span className="font-semibold text-slate-800">{batch.cost_per_unit ? `₹${batch.cost_per_unit.toFixed(2)}` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remarks & Notes */}
                  {batch.notes && (
                    <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs">
                      <span className="font-bold text-amber-900 block mb-1">Batch Notes</span>
                      <p className="text-slate-700 leading-relaxed">{batch.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: STOCK BALANCES */}
              {activeTab === 'stock' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                      Warehouse Location Allocation
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <div>
                          <span className="font-semibold text-slate-800 text-sm block">{batch.warehouse_name || 'Main Warehouse'}</span>
                          <span className="text-xs text-slate-500">Location: {batch.location_name || 'General Staging Area'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-base">{batch.current_quantity.toLocaleString()} {batch.unit_short_code}</span>
                          <span className="text-[11px] text-emerald-600 block">Available: {(batch.current_quantity - batch.reserved_quantity - batch.quarantine_quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: QUALITY & COA */}
              {activeTab === 'quality' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Quality Inspection & Release Status</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Inspection Reference</span>
                        <span className="font-mono font-semibold text-slate-800">{batch.qc_inspection_number || 'QC-PENDING'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Assay Decision</span>
                        <span className="font-semibold uppercase text-emerald-700">{batch.qc_status}</span>
                      </div>
                    </div>

                    {batch.coa_document_url && (
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <a
                          href={batch.coa_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Official Certificate of Analysis (COA)</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: GENEALOGY LINKS */}
              {activeTab === 'genealogy' && (
                <div className="space-y-6">
                  {/* Parents */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <GitBranch className="w-4 h-4 text-indigo-600 rotate-180" />
                      <span>Parent Ingredients Consumed (Backward)</span>
                    </h4>
                    {backwardTree.length === 0 || !backwardTree[0]?.parents?.length ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                        No parent batch records (This is a root raw material lot from supplier/intake).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {backwardTree[0].parents.map((p: any) => (
                          <div key={p.batch_id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-xs text-indigo-700 block">{p.batch_number}</span>
                              <span className="text-xs font-medium text-slate-700">{p.product_name || p.sku_code}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-slate-800">{p.quantity} {p.unit_code}</span>
                              <span className="text-[11px] text-slate-400 block">{p.production?.order_number || 'Consumed'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Children */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <GitBranch className="w-4 h-4 text-indigo-600" />
                      <span>Downstream Batches Produced (Forward)</span>
                    </h4>
                    {forwardTree.length === 0 || !forwardTree[0]?.children?.length ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                        No downstream child batches yet (Unconsumed stock).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {forwardTree[0].children.map((c: any) => (
                          <div key={c.batch_id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-xs text-indigo-700 block">{c.batch_number}</span>
                              <span className="text-xs font-medium text-slate-700">{c.product_name || c.sku_code}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-slate-800">{c.quantity} {c.unit_code}</span>
                              <span className="text-[11px] text-slate-400 block">{c.production?.order_number || 'Produced'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => onOpenTraceability(batch.batch_number)}
                      className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center justify-center space-x-2 transition-colors"
                    >
                      <GitBranch className="w-4 h-4" />
                      <span>Launch Full Blast Radius & Multi-Tier Genealogy Flow</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        {batch && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between space-x-3">
            <button
              onClick={() => onPlaceHold(batch)}
              className="px-3.5 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Place Hold / Recall</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onChangeStatus(batch)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Authorize Status</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
