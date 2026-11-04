import React, { useState, useEffect } from 'react';
import {
  Store,
  Boxes,
  ShoppingBag,
  RotateCcw,
  Calendar,
  Clock,
  BarChart3,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type {
  RetailerMaster,
  RetailerSummaryMetrics,
  RetailerStockItem,
  RetailerOrderRequest,
  RetailerReturn,
  RetailerVisit,
  RetailerFollowUp,
  RetailerStatus,
} from '../../../types/retailers.ts';

import { RetailerDashboardView } from './RetailerDashboardView.tsx';
import { RetailerListView } from './RetailerListView.tsx';
import { RetailerDetailDrawer } from './RetailerDetailDrawer.tsx';
import { RetailerInventoryView } from './RetailerInventoryView.tsx';
import { RetailerOrdersView } from './RetailerOrdersView.tsx';
import { RetailerReturnsView } from './RetailerReturnsView.tsx';
import { RetailerVisitsView } from './RetailerVisitsView.tsx';
import { RetailerFollowupsView } from './RetailerFollowupsView.tsx';
import { CreateRetailerModal } from './CreateRetailerModal.tsx';
import { CreateRetailerOrderModal } from './CreateRetailerOrderModal.tsx';
import { CreateRetailerReturnModal } from './CreateRetailerReturnModal.tsx';
import { LogRetailerVisitModal } from './LogRetailerVisitModal.tsx';
import { AddRetailerFollowupModal } from './AddRetailerFollowupModal.tsx';

export const RetailerModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'registry' | 'inventory' | 'orders' | 'returns' | 'visits' | 'followups'
  >('dashboard');

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RetailerSummaryMetrics | null>(null);
  const [retailers, setRetailers] = useState<RetailerMaster[]>([]);
  const [recentVisits, setRecentVisits] = useState<RetailerVisit[]>([]);
  const [urgentFollowups, setUrgentFollowups] = useState<RetailerFollowUp[]>([]);
  const [recentOrders, setRecentOrders] = useState<RetailerOrderRequest[]>([]);

  // Search and filters for registry
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  // Modals and Drawers
  const [selectedRetailer, setSelectedRetailer] = useState<RetailerMaster | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isCreateRetailerOpen, setIsCreateRetailerOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isCreateReturnOpen, setIsCreateReturnOpen] = useState(false);
  const [isLogVisitOpen, setIsLogVisitOpen] = useState(false);
  const [isAddFollowupOpen, setIsAddFollowupOpen] = useState(false);
  const [targetRetailerForAction, setTargetRetailerForAction] = useState<RetailerMaster | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [mRes, retRes, visRes, fupRes, ordRes] = await Promise.all([
        retailerApi.getSummaryMetrics().catch(() => null),
        retailerApi.listRetailers({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          retailer_type: typeFilter !== 'all' ? typeFilter : undefined,
          region: regionFilter !== 'all' ? regionFilter : undefined,
          limit: 100,
        }),
        retailerApi.listVisits({ limit: 10 }),
        retailerApi.listFollowups({ limit: 10, priority: 'urgent' }),
        retailerApi.listOrders({ limit: 10 }),
      ]);

      setMetrics(mRes);
      setRetailers(retRes.data);
      setRecentVisits(visRes.data);
      setUrgentFollowups(fupRes.data);
      setRecentOrders(ordRes.data);
    } catch (err) {
      console.error('Failed to load retailer module data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [search, statusFilter, typeFilter, regionFilter]);

  const handleSelectRetailer = (ret: RetailerMaster) => {
    setSelectedRetailer(ret);
    setIsDetailDrawerOpen(true);
  };

  const handleUpdateStatus = async (ret: RetailerMaster, status: RetailerStatus) => {
    if (!confirm(`Change status of ${ret.display_name} to "${status}"?`)) return;
    try {
      await retailerApi.updateRetailerStatus(ret.id, status);
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenLogVisit = (retailer?: RetailerMaster) => {
    setTargetRetailerForAction(retailer || null);
    setIsLogVisitOpen(true);
  };

  const handleOpenCreateOrder = (retailer?: RetailerMaster) => {
    setTargetRetailerForAction(retailer || null);
    setIsCreateOrderOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 pt-6 pb-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Phase 17
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Downstream Commercial Network</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
              <Store className="w-6 h-6 text-emerald-600" />
              Retailer Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Store master registry, distributor mappings, channel inventory, order requests, and field sales engagement.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => handleOpenLogVisit()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              Log Visit
            </button>
            <button
              onClick={() => setIsCreateRetailerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Onboard Retailer
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium border-t border-slate-100 pt-2 pb-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Overview & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'registry'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Retailer Directory ({retailers.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Channel Inventory
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Replenishment Orders ({metrics?.pendingOrderRequests || 0})
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Returns & Claims ({metrics?.activeReturnsCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'visits'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Field Beat Visits
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`py-2.5 px-3.5 border-b-2 font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'followups'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Action Tasks ({metrics?.pendingFollowupsCount || 0})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div>
        {activeTab === 'dashboard' && (
          <RetailerDashboardView
            metrics={metrics}
            recentRetailers={retailers}
            urgentFollowups={urgentFollowups}
            recentVisits={recentVisits}
            recentOrders={recentOrders}
            onSelectRetailer={handleSelectRetailer}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onCreateRetailer={() => setIsCreateRetailerOpen(true)}
            onLogVisit={() => handleOpenLogVisit()}
          />
        )}

        {activeTab === 'registry' && (
          <RetailerListView
            retailers={retailers}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            regionFilter={regionFilter}
            onRegionFilterChange={setRegionFilter}
            onSelectRetailer={handleSelectRetailer}
            onCreateRetailer={() => setIsCreateRetailerOpen(true)}
            onUpdateStatus={handleUpdateStatus}
            onLogVisitForRetailer={handleOpenLogVisit}
            onCreateOrderForRetailer={handleOpenCreateOrder}
          />
        )}

        {activeTab === 'inventory' && <RetailerInventoryView />}

        {activeTab === 'orders' && (
          <RetailerOrdersView onCreateOrder={() => setIsCreateOrderOpen(true)} />
        )}

        {activeTab === 'returns' && (
          <RetailerReturnsView onCreateReturn={() => setIsCreateReturnOpen(true)} />
        )}

        {activeTab === 'visits' && (
          <RetailerVisitsView onLogVisit={() => handleOpenLogVisit()} />
        )}

        {activeTab === 'followups' && (
          <RetailerFollowupsView onAddFollowup={() => setIsAddFollowupOpen(true)} />
        )}
      </div>

      {/* Modals & Slide-over Drawer */}
      <RetailerDetailDrawer
        retailer={selectedRetailer}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedRetailer(null);
        }}
        onRefresh={loadAllData}
      />

      <CreateRetailerModal
        isOpen={isCreateRetailerOpen}
        onClose={() => setIsCreateRetailerOpen(false)}
        onSuccess={loadAllData}
      />

      <CreateRetailerOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => {
          setIsCreateOrderOpen(false);
          setTargetRetailerForAction(null);
        }}
        onSuccess={loadAllData}
        retailers={retailers}
        preselectedRetailer={targetRetailerForAction}
      />

      <CreateRetailerReturnModal
        isOpen={isCreateReturnOpen}
        onClose={() => setIsCreateReturnOpen(false)}
        onSuccess={loadAllData}
        retailers={retailers}
      />

      <LogRetailerVisitModal
        isOpen={isLogVisitOpen}
        onClose={() => {
          setIsLogVisitOpen(false);
          setTargetRetailerForAction(null);
        }}
        onSuccess={loadAllData}
        retailers={retailers}
        preselectedRetailer={targetRetailerForAction}
      />

      <AddRetailerFollowupModal
        isOpen={isAddFollowupOpen}
        onClose={() => setIsAddFollowupOpen(false)}
        onSuccess={loadAllData}
        retailers={retailers}
      />
    </div>
  );
};
