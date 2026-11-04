import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowRightLeft,
  Send,
  Package,
  ShieldAlert,
  BarChart3,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type {
  CFMaster,
  CFTransfer,
  CFDispatch,
  CFStockItem,
  CFTransferDiscrepancy,
  CFSummaryMetrics,
} from '../../../types/cfs';

import { CFDashboardView } from './CFDashboardView';
import { CFListView } from './CFListView';
import { CFTransfersView } from './CFTransfersView';
import { CFInventoryView } from './CFInventoryView';
import { CFDispatchesView } from './CFDispatchesView';
import { CFDiscrepanciesView } from './CFDiscrepanciesView';
import { CFDetailDrawer } from './CFDetailDrawer';
import { CreateCFModal } from './CreateCFModal';
import { CreateTransferModal } from './CreateTransferModal';
import { CreateDispatchModal } from './CreateDispatchModal';

export const CFModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registry' | 'transfers' | 'inventory' | 'dispatches' | 'discrepancies'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CFSummaryMetrics | null>(null);
  const [cfs, setCfs] = useState<CFMaster[]>([]);
  const [transfers, setTransfers] = useState<CFTransfer[]>([]);
  const [dispatches, setDispatches] = useState<CFDispatch[]>([]);
  const [inventory, setInventory] = useState<CFStockItem[]>([]);
  const [discrepancies, setDiscrepancies] = useState<CFTransferDiscrepancy[]>([]);

  // Drawers & Modals
  const [selectedCF, setSelectedCF] = useState<CFMaster | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isCreateCFOpen, setIsCreateCFOpen] = useState(false);
  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);
  const [isCreateDispatchOpen, setIsCreateDispatchOpen] = useState(false);
  const [defaultCfForAction, setDefaultCfForAction] = useState<string | undefined>();

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [mRes, cfRes, trRes, dpRes, invRes, discRes] = await Promise.all([
        cfApi.getSummaryMetrics().catch(() => null),
        cfApi.listCFs({ limit: 100 }),
        cfApi.listTransfers({ limit: 100 }),
        cfApi.listDispatches({ limit: 100 }),
        cfApi.getDepotInventory(),
        cfApi.getDiscrepancies(),
      ]);

      setMetrics(mRes);
      setCfs(cfRes.data || []);
      setTransfers(trRes.data || []);
      setDispatches(dpRes.data || []);
      setInventory(invRes || []);
      setDiscrepancies(discRes || []);
    } catch (e) {
      console.error('[CFModule] Failed to fetch C&F data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenTransfer = (cfId?: string) => {
    setDefaultCfForAction(cfId);
    setIsCreateTransferOpen(true);
  };

  const handleOpenDispatch = (cfId?: string) => {
    setDefaultCfForAction(cfId);
    setIsCreateDispatchOpen(true);
  };

  const handleSelectCF = (cf: CFMaster) => {
    setSelectedCF(cf);
    setIsDetailDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
              Phase 15
            </span>
            <h1 className="text-2xl font-bold text-neutral-900">
              Carrying & Forwarding (C&F) Operations
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Production-grade C&F custody management, regional depot inventory, multi-stage transfers & discrepancy ledger
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors"
            title="Refresh C&F Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateCFOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard C&F</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-neutral-200 overflow-x-auto bg-white rounded-t-xl px-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Operations Cockpit</span>
        </button>

        <button
          onClick={() => setActiveTab('registry')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
            activeTab === 'registry'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>C&F Master Registry ({cfs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
            activeTab === 'transfers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Inward Transfers ({transfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Depot Stock Balances ({inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dispatches')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
            activeTab === 'dispatches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Outward Dispatches ({dispatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
            activeTab === 'discrepancies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Variances & Claims ({discrepancies.length})</span>
        </button>
      </div>

      {/* Main Tab Panels */}
      <div>
        {activeTab === 'dashboard' && (
          <CFDashboardView
            metrics={metrics}
            cfs={cfs}
            recentTransfers={transfers}
            recentDispatches={dispatches}
            onOpenCreateCF={() => setIsCreateCFOpen(true)}
            onOpenCreateTransfer={() => handleOpenTransfer()}
            onOpenCreateDispatch={() => handleOpenDispatch()}
            onSelectTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'registry' && (
          <CFListView
            cfs={cfs}
            loading={loading}
            onSelectCF={handleSelectCF}
            onOpenCreateModal={() => setIsCreateCFOpen(true)}
            onNewTransfer={(cfId) => handleOpenTransfer(cfId)}
            onNewDispatch={(cfId) => handleOpenDispatch(cfId)}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'transfers' && (
          <CFTransfersView
            transfers={transfers}
            cfs={cfs}
            loading={loading}
            onRefresh={loadAllData}
            onOpenCreateTransfer={() => handleOpenTransfer()}
          />
        )}

        {activeTab === 'inventory' && (
          <CFInventoryView
            inventory={inventory}
            cfs={cfs}
            loading={loading}
            onRefresh={loadAllData}
            onNewTransfer={() => handleOpenTransfer()}
            onNewDispatch={() => handleOpenDispatch()}
          />
        )}

        {activeTab === 'dispatches' && (
          <CFDispatchesView
            dispatches={dispatches}
            cfs={cfs}
            loading={loading}
            onRefresh={loadAllData}
            onOpenCreateDispatch={() => handleOpenDispatch()}
          />
        )}

        {activeTab === 'discrepancies' && (
          <CFDiscrepanciesView
            discrepancies={discrepancies}
            cfs={cfs}
            loading={loading}
            onRefresh={loadAllData}
          />
        )}
      </div>

      {/* 360° Profile Inspector Drawer */}
      <CFDetailDrawer
        isOpen={isDetailDrawerOpen}
        cf={selectedCF}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedCF(null);
        }}
        onStatusUpdated={() => loadAllData()}
        onNewTransfer={(cfId) => handleOpenTransfer(cfId)}
        onNewDispatch={(cfId) => handleOpenDispatch(cfId)}
      />

      {/* Onboard C&F Modal */}
      <CreateCFModal
        isOpen={isCreateCFOpen}
        onClose={() => setIsCreateCFOpen(false)}
        onSuccess={() => loadAllData()}
      />

      {/* Stock Transfer Modal */}
      <CreateTransferModal
        isOpen={isCreateTransferOpen}
        onClose={() => setIsCreateTransferOpen(false)}
        onSuccess={() => loadAllData()}
        cfs={cfs}
        defaultCfId={defaultCfForAction}
      />

      {/* Outbound Dispatch Modal */}
      <CreateDispatchModal
        isOpen={isCreateDispatchOpen}
        onClose={() => setIsCreateDispatchOpen(false)}
        onSuccess={() => loadAllData()}
        cfs={cfs}
        defaultCfId={defaultCfForAction}
      />
    </div>
  );
};
