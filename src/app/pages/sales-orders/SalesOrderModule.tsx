// src/app/pages/sales-orders/SalesOrderModule.tsx
// Master Hub for Phase 18 Sales Orders, Pricing Engine, Credit Sentinel & Fulfillment Lifecycle

import React, { useState } from 'react';
import {
  FileText,
  Boxes,
  Truck,
  RotateCcw,
  Calculator,
  Plus,
  ArrowRight,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { SalesOrderListView } from './SalesOrderListView.tsx';
import { SalesOrderReservationsView } from './SalesOrderReservationsView.tsx';
import { SalesOrderDispatchesView } from './SalesOrderDispatchesView.tsx';
import { SalesReturnsView } from './SalesReturnsView.tsx';
import { CommercialPricingEngineView } from './CommercialPricingEngineView.tsx';
import { CreateSalesOrderModal } from './CreateSalesOrderModal.tsx';
import { SalesOrderDetailDrawer } from './SalesOrderDetailDrawer.tsx';

export function SalesOrderModule() {
  const [activeTab, setActiveTab] = useState<'orders' | 'reservations' | 'dispatches' | 'returns' | 'pricing'>('orders');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleTriggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Finance & Commerce</span>
            <span>/</span>
            <span className="text-emerald-700">Phase 18 Live</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
            <span>Sales Orders & Commercial Fulfillment</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Phase 18
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Commercial order lifecycles, dynamic customer price books, automated credit exposure validation, FEFO batch allocations, warehouse dispatches, and statutory GST e-invoice handoff.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center space-x-2 transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Order</span>
        </button>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-2 rounded-t-xl space-x-2 text-xs font-bold text-slate-600 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sales Orders Master</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reservations')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'reservations'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Allocation (FEFO)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispatches')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'dispatches'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Dispatches & Shipments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'returns'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Returns (RMA) & QC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'pricing'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Pricing & Tax Engine</span>
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'orders' && (
        <SalesOrderListView
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onSelectOrder={(id) => setSelectedOrderId(id)}
          refreshKey={refreshKey}
        />
      )}

      {activeTab === 'reservations' && (
        <SalesOrderReservationsView
          onSelectOrder={(id) => setSelectedOrderId(id)}
          refreshKey={refreshKey}
        />
      )}

      {activeTab === 'dispatches' && (
        <SalesOrderDispatchesView
          onSelectOrder={(id) => setSelectedOrderId(id)}
          refreshKey={refreshKey}
        />
      )}

      {activeTab === 'returns' && (
        <SalesReturnsView
          onSelectOrder={(id) => setSelectedOrderId(id)}
          refreshKey={refreshKey}
        />
      )}

      {activeTab === 'pricing' && <CommercialPricingEngineView />}

      {/* Modals & Slide-over Drawer */}
      <CreateSalesOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(id) => {
          handleTriggerRefresh();
          setSelectedOrderId(id);
        }}
      />

      <SalesOrderDetailDrawer
        orderId={selectedOrderId}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={handleTriggerRefresh}
      />
    </div>
  );
}
