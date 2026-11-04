import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  SlidersHorizontal,
  ArrowRightLeft,
  Lock,
  History,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Plus,
  Sparkles,
  DollarSign,
  TrendingDown,
  Warehouse,
} from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { StockBalancesTab } from './StockBalancesTab';
import { Sku360ProfileTab } from './Sku360ProfileTab';
import { MovementLedgerTab } from './MovementLedgerTab';
import { StockReservationsTab } from './StockReservationsTab';
import { StockAdjustmentsTab } from './StockAdjustmentsTab';
import { IntegrityReconciliationTab } from './IntegrityReconciliationTab';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockTransferModal } from './StockTransferModal';
import { StockReservationModal } from './StockReservationModal';
import { OpeningBalanceModal } from './OpeningBalanceModal';
import { SkuDetailsDrawerModal } from './SkuDetailsDrawerModal';
import type { InventorySummary, InventoryBalance } from '../../../types/inventory';

type TabKey = 'balances' | 'sku360' | 'ledger' | 'reservations' | 'adjustments' | 'integrity';

export interface InventoryPageProps {
  onNavigate?: (path: string) => void;
}

export function InventoryPage({ onNavigate }: InventoryPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('balances');
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Modal states
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);

  // Selected entities for modals / inspect
  const [selectedBalance, setSelectedBalance] = useState<InventoryBalance | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [inspectSkuId, setInspectSkuId] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const data = await inventoryApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load inventory summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleRefreshAll = () => {
    fetchSummary();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory & Stock Registers</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 8 Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-depot stock registers, atomic row-locked transactions, and immutable audit ledger.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedBalance(null);
              setIsAdjustmentModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>Stock Adjustment</span>
          </button>

          <button
            onClick={() => {
              setSelectedBalance(null);
              setIsTransferModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Inter-Warehouse Transfer</span>
          </button>

          <button
            onClick={() => {
              setSelectedBalance(null);
              setIsReservationModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Reserve Stock</span>
          </button>

          <button
            onClick={() => setIsOpeningBalanceModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Opening Baseline</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Tracked SKUs */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tracked SKUs</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {summary ? Number(summary.total_skus).toLocaleString() : '—'}
          </div>
          <span className="text-[10px] text-slate-400">Active catalog variants</span>
        </div>

        {/* Available Stock */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Available Stock</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <div className="text-xl font-black text-emerald-600 mt-2">
            {summary ? Number(summary.total_available_stock).toLocaleString() : '—'}
          </div>
          <span className="text-[10px] text-slate-400">Ready for fulfillment</span>
        </div>

        {/* Reserved Holds */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Reserved Holds</span>
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 mt-2">
            {summary ? Number(summary.total_reserved_stock).toLocaleString() : '—'}
          </div>
          <span className="text-[10px] text-slate-400">Allocated to orders</span>
        </div>

        {/* Damaged & Quarantine */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Dmg / Quarantine</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 mt-2">
            {summary ? (Number(summary.total_damaged_stock) + Number(summary.total_quarantine_stock)).toLocaleString() : '—'}
          </div>
          <span className="text-[10px] text-slate-400">
            {summary ? `${Number(summary.total_damaged_stock)} dmg • ${Number(summary.total_quarantine_stock)} quar` : '—'}
          </span>
        </div>

        {/* Total Valuation */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Inventory Value</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-950 mt-2">
            ₹{summary ? (Number(summary.total_valuation_cents || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
          </div>
          <span className="text-[10px] text-indigo-600">Total physical assets</span>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Low Stock Alerts</span>
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {summary ? Number(summary.low_stock_sku_count).toLocaleString() : '—'}
          </div>
          <span className="text-[10px] text-amber-600">Items below ROL</span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center space-x-1 border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'balances'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stock Balances &amp; Distribution</span>
        </button>

        <button
          onClick={() => setActiveTab('sku360')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'sku360'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>SKU 360° Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Movement Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'reservations'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Stock Reservations</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'adjustments'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Physical Adjustments</span>
        </button>

        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'integrity'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Reconciliation &amp; Diagnostic</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="transition-all duration-150">
        {activeTab === 'balances' && (
          <StockBalancesTab
            onOpenAdjustment={(balance) => {
              setSelectedBalance(balance || null);
              setIsAdjustmentModalOpen(true);
            }}
            onOpenTransfer={(balance) => {
              setSelectedBalance(balance || null);
              setIsTransferModalOpen(true);
            }}
            onOpenReservation={(balance) => {
              setSelectedBalance(balance || null);
              setIsReservationModalOpen(true);
            }}
            onInspectSku={(skuId) => {
              setInspectSkuId(skuId);
            }}
          />
        )}

        {activeTab === 'sku360' && (
          <Sku360ProfileTab
            selectedSkuId={selectedSkuId}
            onOpenAdjustment={(skuId) => {
              setSelectedSkuId(skuId);
              setIsAdjustmentModalOpen(true);
            }}
            onOpenTransfer={(skuId) => {
              setSelectedSkuId(skuId);
              setIsTransferModalOpen(true);
            }}
          />
        )}

        {activeTab === 'ledger' && <MovementLedgerTab />}

        {activeTab === 'reservations' && (
          <StockReservationsTab
            onOpenNewReservation={() => {
              setSelectedBalance(null);
              setIsReservationModalOpen(true);
            }}
          />
        )}

        {activeTab === 'adjustments' && (
          <StockAdjustmentsTab
            onOpenNewAdjustment={() => {
              setSelectedBalance(null);
              setIsAdjustmentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'integrity' && <IntegrityReconciliationTab />}
      </div>

      {/* Modals */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={handleRefreshAll}
        preselectedBalance={selectedBalance}
      />

      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={handleRefreshAll}
        preselectedBalance={selectedBalance}
      />

      <StockReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        onSuccess={handleRefreshAll}
        preselectedBalance={selectedBalance}
      />

      <OpeningBalanceModal
        isOpen={isOpeningBalanceModalOpen}
        onClose={() => setIsOpeningBalanceModalOpen(false)}
        onSuccess={handleRefreshAll}
      />

      <SkuDetailsDrawerModal
        skuId={inspectSkuId}
        isOpen={!!inspectSkuId}
        onClose={() => setInspectSkuId(null)}
        onOpenAdjustment={(skuId) => {
          setSelectedSkuId(skuId);
          setIsAdjustmentModalOpen(true);
        }}
        onOpenTransfer={(skuId) => {
          setSelectedSkuId(skuId);
          setIsTransferModalOpen(true);
        }}
      />
    </div>
  );
}
