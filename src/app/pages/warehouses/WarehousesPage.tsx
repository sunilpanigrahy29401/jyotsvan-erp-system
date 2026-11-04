import React, { useState, useEffect } from 'react';
import {
  Building2,
  Boxes,
  ArrowLeftRight,
  ClipboardCheck,
  Truck,
  Plus,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { WarehouseMaster, WarehouseSummaryMetrics, StockTransferOrder, StockCountSession, WarehouseOperationalStatus } from '../../../types/warehouse';
import { WarehouseMetricsHeader } from './WarehouseMetricsHeader';
import { WarehouseListTable } from './WarehouseListTable';
import { WarehouseDrawer } from './WarehouseDrawer';
import { CreateWarehouseModal } from './CreateWarehouseModal';
import { TransferListTable } from './TransferListTable';
import { CreateTransferModal } from './CreateTransferModal';
import { TransferDetailDrawer } from './TransferDetailDrawer';
import { CountSessionListTable } from './CountSessionListTable';
import { CreateCountModal } from './CreateCountModal';
import { CountEntryWorksheetDrawer } from './CountEntryWorksheetDrawer';
import { DockStagingConsole } from './DockStagingConsole';

interface WarehousesPageProps {
  onNavigate?: (path: string) => void;
  defaultTab?: 'facilities' | 'transfers' | 'counts' | 'staging';
}

export const WarehousesPage: React.FC<WarehousesPageProps> = ({ onNavigate, defaultTab = 'facilities' }) => {
  const [activeTab, setActiveTab] = useState<'facilities' | 'transfers' | 'counts' | 'staging'>(defaultTab);

  // Data states
  const [metrics, setMetrics] = useState<WarehouseSummaryMetrics | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseMaster[]>([]);
  const [warehousesTotal, setWarehousesTotal] = useState(0);
  const [warehousesPage, setWarehousesPage] = useState(1);
  const [whSearch, setWhSearch] = useState('');
  const [whTypeFilter, setWhTypeFilter] = useState('all');
  const [whStatusFilter, setWhStatusFilter] = useState('all');

  const [transfers, setTransfers] = useState<StockTransferOrder[]>([]);
  const [transfersTotal, setTransfersTotal] = useState(0);
  const [transfersPage, setTransfersPage] = useState(1);
  const [trfSearch, setTrfSearch] = useState('');
  const [trfStatusFilter, setTrfStatusFilter] = useState('all');

  const [countSessions, setCountSessions] = useState<StockCountSession[]>([]);
  const [countsTotal, setCountsTotal] = useState(0);
  const [countsPage, setCountsPage] = useState(1);
  const [cntSearch, setCntSearch] = useState('');
  const [cntStatusFilter, setCntStatusFilter] = useState('all');

  const [loading, setLoading] = useState(false);

  // Selected records for drawers & modals
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseMaster | null>(null);
  const [isWarehouseDrawerOpen, setIsWarehouseDrawerOpen] = useState(false);
  const [isCreateWarehouseOpen, setIsCreateWarehouseOpen] = useState(false);

  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);

  const [selectedCountSessionId, setSelectedCountSessionId] = useState<string | null>(null);
  const [isCountDrawerOpen, setIsCountDrawerOpen] = useState(false);
  const [isCreateCountOpen, setIsCreateCountOpen] = useState(false);

  useEffect(() => {
    loadMetrics();
    loadWarehouses();
    loadTransfers();
    loadCounts();
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [warehousesPage, whSearch, whTypeFilter, whStatusFilter]);

  useEffect(() => {
    loadTransfers();
  }, [transfersPage, trfSearch, trfStatusFilter]);

  useEffect(() => {
    loadCounts();
  }, [countsPage, cntSearch, cntStatusFilter]);

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/warehouses/metrics/summary');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error('[Warehouse Metrics Error]', err);
    }
  };

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: warehousesPage.toString(),
        limit: '15',
        search: whSearch,
        type: whTypeFilter,
        status: whStatusFilter,
      });
      const res = await fetch(`/api/warehouses?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWarehouses(data.data || []);
        setWarehousesTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('[Warehouses List Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransfers = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: transfersPage.toString(),
        limit: '15',
        search: trfSearch,
        status: trfStatusFilter,
      });
      const res = await fetch(`/api/warehouse-transfers?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransfers(data.transfers || []);
        setTransfersTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('[Transfers List Error]', err);
    }
  };

  const loadCounts = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: countsPage.toString(),
        limit: '15',
        search: cntSearch,
        status: cntStatusFilter,
      });
      const res = await fetch(`/api/warehouse-counts?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCountSessions(data.sessions || []);
        setCountsTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('[Counts List Error]', err);
    }
  };

  const handleWarehouseStatusChange = async (id: string, status: WarehouseOperationalStatus) => {
    try {
      const res = await fetch(`/api/warehouses/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        loadWarehouses();
        loadMetrics();
      }
    } catch (err) {
      console.error('[Warehouse Status Change Error]', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span
              onClick={() => onNavigate?.('/operations')}
              className="hover:text-blue-600 cursor-pointer"
            >
              Operations & Logistics
            </span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Warehouse Management System</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-blue-600" />
            Warehouse Management & Inter-Depot Logistics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Storage facility master, hierarchical bin layouts, stock transfer orders (STO), and physical count verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadMetrics();
              loadWarehouses();
              loadTransfers();
              loadCounts();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Sync Network
          </button>

          {activeTab === 'facilities' && (
            <button
              onClick={() => setIsCreateWarehouseOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Warehouse
            </button>
          )}

          {activeTab === 'transfers' && (
            <button
              onClick={() => setIsCreateTransferOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New STO Transfer
            </button>
          )}

          {activeTab === 'counts' && (
            <button
              onClick={() => setIsCreateCountOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Initiate Count Session
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Header */}
      <WarehouseMetricsHeader metrics={metrics} loading={loading && !metrics} />

      {/* Executive Module Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'facilities', label: 'Storage Facilities & Master Register', count: warehousesTotal, icon: Building2 },
          { id: 'transfers', label: 'Stock Transfer Orders (STO)', count: transfersTotal, icon: ArrowLeftRight },
          { id: 'counts', label: 'Stock Verification & Cycle Audits', count: countsTotal, icon: ClipboardCheck },
          { id: 'staging', label: 'Dock & Staging Console', count: undefined, icon: Truck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-2xs px-2 py-0.5 rounded-full font-bold ${
                    active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'facilities' && (
        <WarehouseListTable
          warehouses={warehouses}
          loading={loading}
          total={warehousesTotal}
          page={warehousesPage}
          limit={15}
          onPageChange={setWarehousesPage}
          searchTerm={whSearch}
          onSearchChange={setWhSearch}
          typeFilter={whTypeFilter}
          onTypeFilterChange={setWhTypeFilter}
          statusFilter={whStatusFilter}
          onStatusFilterChange={setWhStatusFilter}
          onSelectWarehouse={(wh) => {
            setSelectedWarehouse(wh);
            setIsWarehouseDrawerOpen(true);
          }}
          onOpenCreate={() => setIsCreateWarehouseOpen(true)}
          onStatusChange={handleWarehouseStatusChange}
        />
      )}

      {activeTab === 'transfers' && (
        <TransferListTable
          transfers={transfers}
          loading={loading}
          total={transfersTotal}
          page={transfersPage}
          limit={15}
          onPageChange={setTransfersPage}
          searchTerm={trfSearch}
          onSearchChange={setTrfSearch}
          statusFilter={trfStatusFilter}
          onStatusFilterChange={setTrfStatusFilter}
          onSelectTransfer={(trf) => {
            setSelectedTransferId(trf.id);
            setIsTransferDrawerOpen(true);
          }}
          onOpenCreate={() => setIsCreateTransferOpen(true)}
        />
      )}

      {activeTab === 'counts' && (
        <CountSessionListTable
          sessions={countSessions}
          loading={loading}
          total={countsTotal}
          page={countsPage}
          limit={15}
          onPageChange={setCountsPage}
          searchTerm={cntSearch}
          onSearchChange={setCntSearch}
          statusFilter={cntStatusFilter}
          onStatusFilterChange={setCntStatusFilter}
          onSelectSession={(sess) => {
            setSelectedCountSessionId(sess.id);
            setIsCountDrawerOpen(true);
          }}
          onOpenCreate={() => setIsCreateCountOpen(true)}
        />
      )}

      {activeTab === 'staging' && (
        <DockStagingConsole
          warehouses={warehouses}
          onSelectWarehouse={(wh) => {
            setSelectedWarehouse(wh);
            setIsWarehouseDrawerOpen(true);
          }}
          onRefresh={() => {
            loadWarehouses();
            loadTransfers();
          }}
        />
      )}

      {/* Drawers & Modals */}
      <WarehouseDrawer
        warehouse={selectedWarehouse}
        isOpen={isWarehouseDrawerOpen}
        onClose={() => {
          setIsWarehouseDrawerOpen(false);
          setSelectedWarehouse(null);
        }}
        onRefresh={() => {
          loadWarehouses();
          loadMetrics();
        }}
      />

      <CreateWarehouseModal
        isOpen={isCreateWarehouseOpen}
        onClose={() => setIsCreateWarehouseOpen(false)}
        onSuccess={() => {
          loadWarehouses();
          loadMetrics();
        }}
      />

      <CreateTransferModal
        isOpen={isCreateTransferOpen}
        warehouses={warehouses}
        onClose={() => setIsCreateTransferOpen(false)}
        onSuccess={() => {
          loadTransfers();
          loadMetrics();
        }}
      />

      <TransferDetailDrawer
        transferId={selectedTransferId}
        isOpen={isTransferDrawerOpen}
        onClose={() => {
          setIsTransferDrawerOpen(false);
          setSelectedTransferId(null);
        }}
        onRefreshList={() => {
          loadTransfers();
          loadMetrics();
        }}
      />

      <CreateCountModal
        isOpen={isCreateCountOpen}
        warehouses={warehouses}
        onClose={() => setIsCreateCountOpen(false)}
        onSuccess={() => {
          loadCounts();
          loadMetrics();
        }}
      />

      <CountEntryWorksheetDrawer
        sessionId={selectedCountSessionId}
        isOpen={isCountDrawerOpen}
        onClose={() => {
          setIsCountDrawerOpen(false);
          setSelectedCountSessionId(null);
        }}
        onRefreshList={() => {
          loadCounts();
          loadMetrics();
        }}
      />
    </div>
  );
};
