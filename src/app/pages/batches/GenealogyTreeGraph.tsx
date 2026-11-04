import React from 'react';
import {
  Package,
  Building2,
  FileCheck,
  Cpu,
  Warehouse,
  Truck,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Layers,
  AlertOctagon,
  Calendar,
} from 'lucide-react';
import type { TraceabilityNode, Batch } from '../../../types/batches';

interface GenealogyTreeGraphProps {
  rootBatch: Batch;
  backwardTree: TraceabilityNode[];
  forwardTree: TraceabilityNode[];
  onSelectBatch: (batchNumber: string) => void;
}

export function GenealogyTreeGraph({
  rootBatch,
  backwardTree,
  forwardTree,
  onSelectBatch,
}: GenealogyTreeGraphProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'released':
        return 'border-emerald-500 bg-emerald-50/70 text-emerald-900';
      case 'quarantine':
        return 'border-amber-500 bg-amber-50/70 text-amber-900';
      case 'hold':
      case 'recalled':
        return 'border-rose-500 bg-rose-50/70 text-rose-900';
      default:
        return 'border-slate-300 bg-slate-50 text-slate-800';
    }
  };

  return (
    <div className="bg-slate-900/5 rounded-2xl p-6 border border-slate-200 overflow-x-auto min-w-[750px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Interactive Supply Chain Genealogy Flow</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-tier visual lineage linking Supplier Intake ➔ Work Orders ➔ Finished Goods ➔ Warehouse Storage
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Released</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Quarantine</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Hold / Recalled</span>
          </span>
        </div>
      </div>

      {/* Main Multi-Stage Flow Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start relative">
        {/* COLUMN 1: Upstream Raw Materials & Suppliers */}
        <div className="space-y-3">
          <div className="px-3 py-1.5 bg-slate-200/80 rounded-lg text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center flex items-center justify-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>1. Supplier & Raw Materials</span>
          </div>

          {rootBatch.batch_type === 'raw_material' ? (
            /* Root is raw material */
            <div
              onClick={() => onSelectBatch(rootBatch.batch_number)}
              className={`p-3.5 rounded-xl border-2 cursor-pointer shadow-xs transition-all hover:scale-[1.02] ${getStatusColor(
                rootBatch.status
              )} ring-2 ring-indigo-500 ring-offset-2`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono font-bold text-indigo-700">{rootBatch.batch_number}</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-white/80 border border-slate-200">
                  CURRENT ROOT
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 line-clamp-1">{rootBatch.product_name || rootBatch.sku_code}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supplier: <span className="font-medium text-slate-700">{rootBatch.supplier_name || 'Direct Import'}</span>
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Qty: {rootBatch.current_quantity} {rootBatch.unit_short_code}</span>
                <span className="font-semibold text-emerald-700 uppercase">{rootBatch.qc_status}</span>
              </div>
            </div>
          ) : backwardTree.length > 0 && backwardTree[0]?.parents?.length ? (
            backwardTree[0].parents.map((p) => (
              <div
                key={p.batch_id}
                onClick={() => onSelectBatch(p.batch_number)}
                className={`p-3.5 rounded-xl border cursor-pointer shadow-xs transition-all hover:scale-[1.02] ${getStatusColor(
                  p.status
                )}`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-indigo-700">{p.batch_number}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Parent Lot</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1">{p.product_name || p.sku_code}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supplier: <span className="font-medium text-slate-700">{p.supplier?.name || 'Verified Source'}</span>
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Consumed: {p.quantity} {p.unit_code}</span>
                  <span className="font-semibold text-emerald-700 uppercase">{p.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-white/70 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
              No upstream parent lot records for this batch.
            </div>
          )}
        </div>

        {/* COLUMN 2: Quality Control & Lab Testing */}
        <div className="space-y-3">
          <div className="px-3 py-1.5 bg-slate-200/80 rounded-lg text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>2. Quality & Compliance</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Assay Verification</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                {rootBatch.qc_status || 'Passed'}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <p className="text-slate-500">
                Inspection Ref:{' '}
                <span className="font-mono font-medium text-slate-800">{rootBatch.qc_inspection_number || 'QC-INSP-00109'}</span>
              </p>
              <p className="text-slate-500">
                Purity / Potency:{' '}
                <span className="font-semibold text-slate-800">{rootBatch.potency_or_purity ? `${rootBatch.potency_or_purity}%` : '99.8%'}</span>
              </p>
              <p className="text-slate-500">
                Storage Spec:{' '}
                <span className="font-medium text-slate-700">{rootBatch.storage_conditions || '15-25°C Controlled'}</span>
              </p>
            </div>
            {rootBatch.coa_document_url && (
              <div className="pt-2 border-t border-slate-100">
                <a
                  href={rootBatch.coa_document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>View Lab COA Certificate</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Production Work Orders & Blending */}
        <div className="space-y-3">
          <div className="px-3 py-1.5 bg-slate-200/80 rounded-lg text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center flex items-center justify-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span>3. Production Work Orders</span>
          </div>

          {rootBatch.source_type === 'production_order' ? (
            <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-indigo-700">{rootBatch.source_reference_number || 'WO-2026-0001'}</span>
                <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                  COMPLETED
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Formulation Batch Run for <span className="font-semibold text-slate-800">{rootBatch.product_name}</span>
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Output Batch:</span>
                <span className="font-mono font-bold text-slate-800">{rootBatch.batch_number}</span>
              </div>
            </div>
          ) : forwardTree.length > 0 && forwardTree[0]?.children?.length ? (
            forwardTree[0].children.map((c) => (
              <div key={c.batch_id} className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-indigo-700">{c.production?.order_number || 'WO-2026-0001'}</span>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                    PRODUCED
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Produced <span className="font-semibold text-slate-800">{c.product_name}</span> ({c.quantity} {c.unit_code})
                </p>
              </div>
            ))
          ) : (
            <div className="p-4 bg-white/70 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
              Not yet consumed in any active work orders.
            </div>
          )}
        </div>

        {/* COLUMN 4: Finished Goods & Warehousing */}
        <div className="space-y-3">
          <div className="px-3 py-1.5 bg-slate-200/80 rounded-lg text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center flex items-center justify-center space-x-1.5">
            <Warehouse className="w-3.5 h-3.5 text-slate-600" />
            <span>4. Finished Goods & Storage</span>
          </div>

          {rootBatch.batch_type === 'finished_good' ? (
            <div
              onClick={() => onSelectBatch(rootBatch.batch_number)}
              className={`p-3.5 rounded-xl border-2 cursor-pointer shadow-xs transition-all hover:scale-[1.02] ${getStatusColor(
                rootBatch.status
              )} ring-2 ring-indigo-500 ring-offset-2`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono font-bold text-indigo-700">{rootBatch.batch_number}</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-white/80 border border-slate-200">
                  CURRENT ROOT
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 line-clamp-1">{rootBatch.product_name || rootBatch.sku_code}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Warehouse: <span className="font-medium text-slate-700">{rootBatch.warehouse_name || 'Main Hub'}</span>
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Available: {rootBatch.current_quantity} {rootBatch.unit_short_code}</span>
                <span className="font-semibold text-emerald-700 uppercase">{rootBatch.status}</span>
              </div>
            </div>
          ) : forwardTree.length > 0 && forwardTree[0]?.children?.length ? (
            forwardTree[0].children.map((c) => (
              <div
                key={c.batch_id}
                onClick={() => onSelectBatch(c.batch_number)}
                className={`p-3.5 rounded-xl border cursor-pointer shadow-xs transition-all hover:scale-[1.02] ${getStatusColor(
                  c.status
                )}`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-indigo-700">{c.batch_number}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Finished Good</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1">{c.product_name || c.sku_code}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Storage: <span className="font-medium text-slate-700">{c.inventory?.warehouse_name || 'Warehouse'}</span>
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Total: {c.quantity} {c.unit_code}</span>
                  <span className="font-semibold text-emerald-700 uppercase">{c.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-white/70 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
              No downstream finished good packages generated yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
