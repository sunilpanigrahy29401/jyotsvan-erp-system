import React, { useState, useEffect } from 'react';
import {
  Building2,
  Boxes,
  Truck,
  AlertTriangle,
  FileText,
  RotateCcw,
  BarChart3,
  RefreshCw,
  Plus,
  Send,
} from 'lucide-react';
import { distributorApi } from '../../../services/distributorApi.ts';
import type {
  DistributorMaster,
  DistributorSummaryMetrics,
  DistributorStockItem,
  DistributorTransfer,
  DistributorDiscrepancy,
  DistributorOrder,
  DistributorReturn,
} from '../../../types/distributors.ts';

import { DistributorDashboardView } from './DistributorDashboardView.tsx';
import { DistributorListView } from './DistributorListView.tsx';
import { DistributorDetailDrawer } from './DistributorDetailDrawer.tsx';
import { DistributorInventoryView } from './DistributorInventoryView.tsx';
import { DistributorTransfersView } from './DistributorTransfersView.tsx';
import { DistributorDiscrepanciesView } from './DistributorDiscrepanciesView.tsx';
import { DistributorOrdersView } from './DistributorOrdersView.tsx';
import { DistributorReturnsView } from './DistributorReturnsView.tsx';
import { CreateDistributorModal } from './CreateDistributorModal.tsx';
import { CreateDistributorTransferModal } from './CreateDistributorTransferModal.tsx';
import { ReceiveDistributorTransferModal } from './ReceiveDistributorTransferModal.tsx';

export const DistributorModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'registry' | 'inventory' | 'transfers' | 'discrepancies' | 'orders' | 'returns'
  >('dashboard');

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DistributorSummaryMetrics | null>(null);
  const [distributors, setDistributors] = useState<DistributorMaster[]>([]);
  const [stockItems, setStockItems] = useState<DistributorStockItem[]>([]);
  const [transfers, setTransfers] = useState<DistributorTransfer[]>([]);
  const [discrepancies, setDiscrepancies] = useState<DistributorDiscrepancy[]>([]);
  const [orders, setOrders] = useState<DistributorOrder[]>([]);
  const [returns, setReturns] = useState<DistributorReturn[]>([]);

  // Search and filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedDistributorId, setSelectedDistributorId] = useState('all');
  const [nearExpiryOnly, setNearExpiryOnly] = useState(false);

  // Modals and Drawers
  const [selectedDistributor, setSelectedDistributor] = useState<DistributorMaster | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isCreateDistributorOpen, setIsCreateDistributorOpen] = useState(false);
  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<DistributorTransfer | null>(null);
  const [targetDistributorForTransfer, setTargetDistributorForTransfer] = useState<string | undefined>();

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [mRes, distRes, stkRes, trfRes, discRes, ordRes, retRes] = await Promise.all([
        distributorApi.getSummaryMetrics().catch(() => null),
        distributorApi.listDistributors({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          distributor_type: typeFilter !== 'all' ? typeFilter : undefined,
          region: regionFilter !== 'all' ? regionFilter : undefined,
          limit: 100,
        }),
        distributorApi.getInventoryItems({
          distributor_id: selectedDistributorId !== 'all' ? selectedDistributorId : undefined,
          search: search || undefined,
          near_expiry: nearExpiryOnly || undefined,
          limit: 100,
        }),
        distributorApi.listTransfers({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
          limit: 100,
        }),
        distributorApi.listDiscrepancies({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
          limit: 100,
        }),
        distributorApi.listOrders({ limit: 100 }),
        distributorApi.listReturns({ limit: 100 }),
      ]);

      setMetrics(mRes);
      setDistributors(distRes.data || []);
      setStockItems(stkRes.data || []);
      setTransfers(trfRes.data || []);
      setDiscrepancies(discRes.data || []);
      setOrders(ordRes.data || []);
      setReturns(retRes.data || []);
    } catch (e) {
      console.error('[DistributorModule] Failed to fetch distributor data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [search, statusFilter, typeFilter, regionFilter, selectedDistributorId, nearExpiryOnly]);

  const handleSelectDistributor = (dist: DistributorMaster) => {
    setSelectedDistributor(dist);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenCreateTransfer = (distributorId?: string) => {
    setTargetDistributorForTransfer(distributorId);
    setIsCreateTransferOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Phase 16
            </span>
            <span className="text-xs text-slate-500 font-medium">Enterprise Supply Chain & Channel Control</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Distributor Management</h1>
          <p className="text-sm text-slate-500">
            Authorized regional distributors, C&F consignments, channel stock visibility, and commercial terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllData()}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => handleOpenCreateTransfer()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" /> Dispatch from C&F
          </button>

          <button
            id="btn-onboard-distributor-top"
            onClick={() => setIsCreateDistributorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard Distributor
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 flex space-x-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3 },
          { id: 'registry', label: `Distributor Master (${distributors.length})`, icon: Building2 },
          { id: 'inventory', label: `Channel Inventory (${stockItems.length})`, icon: Boxes },
          { id: 'transfers', label: `C&F Dispatches (${transfers.length})`, icon: Truck },
          { id: 'discrepancies', label: `Discrepancies (${discrepancies.length})`, icon: AlertTriangle },
          { id: 'orders', label: `Orders Pipeline (${orders.length})`, icon: FileText },
          { id: 'returns', label: `Returns & Claims (${returns.length})`, icon: RotateCcw },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearch('');
                setStatusFilter('all');
              }}
              className={`py-3 px-4 border-b-2 font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panes */}
      <div className="pt-1">
        {activeTab === 'dashboard' && (
          <DistributorDashboardView
            metrics={metrics}
            distributors={distributors}
            transfers={transfers}
            onOpenCreateDistributor={() => setIsCreateDistributorOpen(true)}
            onOpenCreateTransfer={() => handleOpenCreateTransfer()}
            onSelectDistributor={handleSelectDistributor}
            onNavigateTab={tab => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'registry' && (
          <DistributorListView
            distributors={distributors}
            total={distributors.length}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            regionFilter={regionFilter}
            onRegionFilterChange={setRegionFilter}
            onOpenCreateDistributor={() => setIsCreateDistributorOpen(true)}
            onSelectDistributor={handleSelectDistributor}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'inventory' && (
          <DistributorInventoryView
            stockItems={stockItems}
            distributors={distributors}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            selectedDistributor={selectedDistributorId}
            onDistributorChange={setSelectedDistributorId}
            nearExpiryOnly={nearExpiryOnly}
            onNearExpiryChange={setNearExpiryOnly}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'transfers' && (
          <DistributorTransfersView
            transfers={transfers}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onOpenCreateTransfer={() => handleOpenCreateTransfer()}
            onOpenReceiveTransfer={trf => setReceivingTransfer(trf)}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'discrepancies' && (
          <DistributorDiscrepanciesView
            discrepancies={discrepancies}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'orders' && (
          <DistributorOrdersView
            orders={orders}
            distributors={distributors}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'returns' && (
          <DistributorReturnsView
            returns={returns}
            distributors={distributors}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onRefresh={loadAllData}
          />
        )}
      </div>

      {/* Drawer: Detailed Distributor View */}
      {isDetailDrawerOpen && selectedDistributor && (
        <DistributorDetailDrawer
          distributor={selectedDistributor}
          onClose={() => {
            setIsDetailDrawerOpen(false);
            setSelectedDistributor(null);
          }}
          onRefresh={loadAllData}
          onOpenCreateTransferForDistributor={id => {
            setIsDetailDrawerOpen(false);
            handleOpenCreateTransfer(id);
          }}
        />
      )}

      {/* Modal: Onboard New Distributor */}
      {isCreateDistributorOpen && (
        <CreateDistributorModal
          onClose={() => setIsCreateDistributorOpen(false)}
          onSuccess={() => {
            setIsCreateDistributorOpen(false);
            loadAllData();
          }}
        />
      )}

      {/* Modal: Create C&F Dispatch */}
      {isCreateTransferOpen && (
        <CreateDistributorTransferModal
          distributors={distributors}
          initialDistributorId={targetDistributorForTransfer}
          onClose={() => setIsCreateTransferOpen(false)}
          onSuccess={() => {
            setIsCreateTransferOpen(false);
            loadAllData();
          }}
        />
      )}

      {/* Modal: Receive Consignment & Log Discrepancies */}
      {receivingTransfer && (
        <ReceiveDistributorTransferModal
          transfer={receivingTransfer}
          onClose={() => setReceivingTransfer(null)}
          onSuccess={() => {
            setReceivingTransfer(null);
            loadAllData();
          }}
        />
      )}
    </div>
  );
};
