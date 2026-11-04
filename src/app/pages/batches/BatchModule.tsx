import React, { useState, useEffect } from 'react';
import {
  Layers,
  GitBranch,
  Calendar,
  Lock,
  Settings,
  Plus,
  RotateCw,
  ShieldCheck,
  AlertTriangle,
  Package,
  Activity,
  Boxes,
} from 'lucide-react';
import { batchApi } from '../../../services/batchApi';
import { BatchRegistryTab } from './BatchRegistryTab';
import { TraceabilityWorkbench } from './TraceabilityWorkbench';
import { BatchExpiryTab } from './BatchExpiryTab';
import { BatchHoldsTab } from './BatchHoldsTab';
import { BatchSettingsTab } from './BatchSettingsTab';
import { CreateBatchModal } from './CreateBatchModal';
import { BatchDetailDrawer } from './BatchDetailDrawer';
import { BatchStatusModal } from './BatchStatusModal';
import { PlaceHoldModal } from './PlaceHoldModal';
import type { Batch, BatchSummaryMetrics, BatchStatus } from '../../../types/batches';

type BatchModuleTab = 'registry' | 'traceability' | 'shelf_life' | 'holds' | 'numbering';

export function BatchModule() {
  const [activeTab, setActiveTab] = useState<BatchModuleTab>('registry');
  const [metrics, setMetrics] = useState<BatchSummaryMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [drawerBatchId, setDrawerBatchId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [statusModalBatch, setStatusModalBatch] = useState<Batch | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [holdModalBatch, setHoldModalBatch] = useState<Batch | null>(null);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);

  const [traceabilityTargetBatch, setTraceabilityTargetBatch] = useState<string>('');

  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const data = await batchApi.getSummary();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load batch metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleOpenDetail = (batchId: string) => {
    setDrawerBatchId(batchId);
    setIsDrawerOpen(true);
  };

  const handleOpenStatusModal = (batch: Batch) => {
    setStatusModalBatch(batch);
    setIsStatusModalOpen(true);
  };

  const handleOpenHoldModal = (batch: Batch) => {
    setHoldModalBatch(batch);
    setIsHoldModalOpen(true);
  };

  const handleOpenTraceability = (batchNumber: string) => {
    setTraceabilityTargetBatch(batchNumber);
    setActiveTab('traceability');
    setIsDrawerOpen(false);
  };

  const handleCreateBatch = async (data: any) => {
    await batchApi.createBatch(data);
    fetchMetrics();
  };

  const handleUpdateStatus = async (data: { targetStatus: BatchStatus; reason: string; justification?: string }) => {
    if (!statusModalBatch) return;
    await batchApi.transitionStatus(statusModalBatch.id, data);
    fetchMetrics();
    // Refresh drawer if open
    if (drawerBatchId === statusModalBatch.id) {
      // Re-trigger drawer reload
      setDrawerBatchId(null);
      setTimeout(() => setDrawerBatchId(statusModalBatch.id), 50);
    }
  };

  const handlePlaceHold = async (data: any) => {
    await batchApi.placeHold(data);
    fetchMetrics();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            <span>Batch, Lot & Traceability Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end multi-tier genealogy, FEFO shelf-life compliance, QC quarantine gates & recall containment
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register Batch</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Batches</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {isLoadingMetrics ? '...' : metrics?.total_batches || 0}
            </span>
            <span className="text-xs text-slate-500">Active lot records</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Released Lots</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600">
              {isLoadingMetrics ? '...' : metrics?.released_batches || 0}
            </span>
            <span className="text-xs text-emerald-600">Available to pick</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">In Quarantine</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-600">
              {isLoadingMetrics ? '...' : metrics?.quarantine_batches || 0}
            </span>
            <span className="text-xs text-amber-600">Pending assay release</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Active Holds</span>
            <Lock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-black ${(metrics?.hold_or_recalled_batches && metrics.hold_or_recalled_batches > 0) ? 'text-rose-600' : 'text-slate-900'}`}>
              {isLoadingMetrics ? '...' : metrics?.hold_or_recalled_batches || 0}
            </span>
            <span className="text-xs text-rose-600">Under investigation</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Near Expiry (&lt; 30d)</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-700">
              {isLoadingMetrics ? '...' : metrics?.near_expiry_batches || 0}
            </span>
            <span className="text-xs text-amber-700">FEFO priority</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4">
        <button
          onClick={() => setActiveTab('registry')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'registry'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Batch Master Registry</span>
        </button>

        <button
          onClick={() => setActiveTab('traceability')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'traceability'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Traceability & Blast Radius</span>
        </button>

        <button
          onClick={() => setActiveTab('shelf_life')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'shelf_life'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>FEFO & Shelf-Life Risk</span>
        </button>

        <button
          onClick={() => setActiveTab('holds')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'holds'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Holds & Recalls</span>
        </button>

        <button
          onClick={() => setActiveTab('numbering')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'numbering'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Numbering Rules</span>
        </button>
      </div>

      {/* Tab Content Panels */}
      <div>
        {activeTab === 'registry' && (
          <BatchRegistryTab
            onOpenCreate={() => setIsCreateOpen(true)}
            onInspectBatch={handleOpenDetail}
            onChangeStatus={handleOpenStatusModal}
            onPlaceHold={handleOpenHoldModal}
            onOpenTraceability={handleOpenTraceability}
          />
        )}

        {activeTab === 'traceability' && (
          <TraceabilityWorkbench
            initialSearchQuery={traceabilityTargetBatch}
            onInspectBatch={handleOpenDetail}
            onPlaceHold={handleOpenHoldModal}
          />
        )}

        {activeTab === 'shelf_life' && (
          <BatchExpiryTab
            onInspectBatch={handleOpenDetail}
            onPlaceHold={handleOpenHoldModal}
          />
        )}

        {activeTab === 'holds' && (
          <BatchHoldsTab
            onInspectBatch={handleOpenDetail}
            onRefreshBatchData={fetchMetrics}
          />
        )}

        {activeTab === 'numbering' && <BatchSettingsTab />}
      </div>

      {/* Modals & Slide-out Drawers */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateBatch}
      />

      <BatchDetailDrawer
        batchId={drawerBatchId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onChangeStatus={handleOpenStatusModal}
        onPlaceHold={handleOpenHoldModal}
        onOpenTraceability={handleOpenTraceability}
      />

      {statusModalBatch && (
        <BatchStatusModal
          batch={statusModalBatch}
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          onSubmit={handleUpdateStatus}
        />
      )}

      <PlaceHoldModal
        batch={holdModalBatch}
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
        onSubmit={handlePlaceHold}
      />
    </div>
  );
}
