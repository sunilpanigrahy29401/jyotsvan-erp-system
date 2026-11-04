import React, { useState, useEffect } from 'react';
import {
  Factory,
  Layers,
  Sparkles,
  Package,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Lock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  FileText,
  Sliders,
  Scale,
} from 'lucide-react';
import type {
  ProductionOrder,
  ProductionPlan,
  ProductionSummaryMetrics,
} from '../../../types/production';
import { productionApi } from '../../../services/productionApi';

import { ProductionOrderCreateModal } from './components/ProductionOrderCreateModal';
import { ProductionPlanCreateModal } from './components/ProductionPlanCreateModal';
import { MaterialAvailabilityModal } from './components/MaterialAvailabilityModal';
import { MaterialIssueModal } from './components/MaterialIssueModal';
import { MaterialReturnModal } from './components/MaterialReturnModal';
import { ProductionOutputModal } from './components/ProductionOutputModal';
import { ProductionWastageModal } from './components/ProductionWastageModal';
import { ProductionOrderDetailDrawer } from './components/ProductionOrderDetailDrawer';
import { ShopFloorConsole } from './components/ShopFloorConsole';

export const ProductionModule: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<'orders' | 'shopfloor' | 'plans' | 'availability' | 'analytics'>('orders');

  // Metrics
  const [metrics, setMetrics] = useState<ProductionSummaryMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderMatFilter, setOrderMatFilter] = useState('all');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Plans State
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [totalPlans, setTotalPlans] = useState(0);
  const [planSearch, setPlanSearch] = useState('');
  const [planStatusFilter, setPlanStatusFilter] = useState('all');
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Modals & Drawer State
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [selectedOrderIdForDrawer, setSelectedOrderIdForDrawer] = useState<string | null>(null);

  // Modal Contexts
  const [availabilityContext, setAvailabilityContext] = useState<{ isOpen: boolean; orderId: string; orderNumber: string }>({
    isOpen: false,
    orderId: '',
    orderNumber: '',
  });
  const [modalOrder, setModalOrder] = useState<ProductionOrder | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await productionApi.getMetrics();
      setMetrics(data);
    } catch {
      // Ignore
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await productionApi.listOrders({
        page: orderPage,
        limit: 15,
        search: orderSearch || undefined,
        status: orderStatusFilter !== 'all' ? orderStatusFilter : undefined,
        material_status: orderMatFilter !== 'all' ? orderMatFilter : undefined,
      });
      setOrders(res.data || []);
      setTotalOrders(res.total || 0);
    } catch {
      // Ignore
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await productionApi.listPlans({
        limit: 20,
        search: planSearch || undefined,
        status: planStatusFilter !== 'all' ? planStatusFilter : undefined,
      });
      setPlans(res.data || []);
      setTotalPlans(res.total || 0);
    } catch {
      // Ignore
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchOrders();
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [orderPage, orderStatusFilter, orderMatFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderPage(1);
    fetchOrders();
  };

  // Handlers for modal openings
  const handleOpenAvailability = (orderId: string, orderNumber: string) => {
    setAvailabilityContext({ isOpen: true, orderId, orderNumber });
  };

  const handleOpenIssue = (order: ProductionOrder) => {
    setModalOrder(order);
    setIsIssueModalOpen(true);
  };

  const handleOpenReturn = (order: ProductionOrder) => {
    setModalOrder(order);
    setIsReturnModalOpen(true);
  };

  const handleOpenOutput = (order: ProductionOrder) => {
    setModalOrder(order);
    setIsOutputModalOpen(true);
  };

  const handleOpenWastage = (order: ProductionOrder) => {
    setModalOrder(order);
    setIsWastageModalOpen(true);
  };

  const refreshAll = () => {
    fetchMetrics();
    fetchOrders();
    fetchPlans();
  };

  return (
    <div className="space-y-6">
      {/* Module Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manufacturing & Production Execution
            </h1>
            <p className="text-xs text-slate-500">
              Formula Explosion • Shop Floor Dispensing • Yield Reconciliation • QC Handoff
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshAll}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreatePlanOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            New Master Plan
          </button>
          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Production Order
          </button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Active Floor Batches</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {metrics?.in_production_orders || 0}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">
              / {metrics?.total_orders || 0} Orders
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Planned Production Volume</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {metrics ? Math.round(metrics.total_planned_volume).toLocaleString() : 0}
            </span>
            <span className="text-[11px] text-slate-400">units/kg</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Finished Output Realized</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {metrics ? Math.round(metrics.total_actual_volume).toLocaleString() : 0}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              ({metrics?.average_yield_pct || 0}% Yield)
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Staging Readiness</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-700 font-mono">
              {(metrics?.allocated_orders || 0) + (metrics?.in_production_orders || 0)}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">
              Batches Reserved
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Recorded Process Loss</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-rose-600 font-mono">
              {metrics ? Math.round(metrics.total_wastage_quantity).toLocaleString() : 0}
            </span>
            <span className="text-[11px] text-rose-500 font-medium">Scrap/Spill</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Factory className="w-4 h-4" />
          Production Orders ({totalOrders})
        </button>

        <button
          onClick={() => setActiveTab('shopfloor')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'shopfloor'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Shop Floor Execution Console
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'plans'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Master Production Schedules ({totalPlans})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Yield & Wastage Performance
        </button>
      </div>

      {/* TAB 1: PRODUCTION ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <input
                type="text"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder="Search order #, SKU, formulation..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="allocated">Allocated / Reserved</option>
                <option value="in_production">In Production</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={orderMatFilter}
                onChange={e => setOrderMatFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                <option value="all">All Materials</option>
                <option value="pending">Material Pending</option>
                <option value="partially_reserved">Partially Reserved</option>
                <option value="fully_reserved">Fully Reserved</option>
                <option value="partially_issued">Partially Issued</option>
                <option value="fully_issued">Fully Issued</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {loadingOrders ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <RefreshCw className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-medium">Fetching production order ledger...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 p-6">
                <Factory className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No production orders found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or create a new order.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Order # & Batch</th>
                    <th className="px-4 py-3">Manufactured Product & Recipe</th>
                    <th className="px-4 py-3 text-right">Planned vs Output</th>
                    <th className="px-4 py-3">Material Status</th>
                    <th className="px-4 py-3">Execution Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => {
                    const yieldPercent = order.planned_quantity > 0
                      ? Math.round(((order.actual_output_quantity || 0) / order.planned_quantity) * 1000) / 10
                      : 0;

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedOrderIdForDrawer(order.id)}
                            className="font-mono font-bold text-indigo-600 hover:text-indigo-800 text-left block"
                          >
                            {order.production_order_number}
                          </button>
                          <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                            {order.batch_number || 'Batch unassigned'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{order.finished_sku_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{order.finished_sku_code}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-medium">
                              {order.formulation_code} (v{order.formulation_version})
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="font-mono font-medium text-slate-800">
                            {order.actual_output_quantity.toLocaleString()} / {order.planned_quantity.toLocaleString()} {order.unit_code}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, yieldPercent)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 font-medium">
                              {yieldPercent}%
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                              order.material_status === 'fully_issued'
                                ? 'bg-blue-100 text-blue-800'
                                : order.material_status === 'partially_issued'
                                ? 'bg-cyan-100 text-cyan-800'
                                : order.material_status === 'reserved'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.material_status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                order.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'in_production'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : order.status === 'reserved'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'approved'
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.status === 'cancelled'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {order.status.replace('_', ' ')}
                            </span>
                            {order.is_on_hold && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                                HOLD
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAvailability(order.id, order.production_order_number)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100"
                              title="Check Material Stock"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                              <>
                                <button
                                  onClick={() => handleOpenIssue(order)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                                  title="Issue Raw Materials"
                                >
                                  <Package className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenOutput(order)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100"
                                  title="Record Manufactured Output"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setSelectedOrderIdForDrawer(order.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-xs transition-colors flex items-center gap-1"
                            >
                              Details <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHOP FLOOR CONSOLE */}
      {activeTab === 'shopfloor' && (
        <ShopFloorConsole
          onOpenIssue={handleOpenIssue}
          onOpenReturn={handleOpenReturn}
          onOpenOutput={handleOpenOutput}
          onOpenWastage={handleOpenWastage}
          onOpenAvailability={handleOpenAvailability}
          onOpenOrderDetail={id => setSelectedOrderIdForDrawer(id)}
        />
      )}

      {/* TAB 3: MASTER SCHEDULES & PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {loadingPlans ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <RefreshCw className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-medium">Loading production master schedules...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-16 p-6">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Master Production Plans Found</p>
                <p className="text-xs text-slate-400 mt-0.5">Click "New Master Plan" above to create high-level production schedules.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Plan # & Title</th>
                    <th className="px-4 py-3">Facility</th>
                    <th className="px-4 py-3">Planned Schedule</th>
                    <th className="px-4 py-3 text-right">Orders Linked</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map(plan => (
                    <tr key={plan.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{plan.title}</div>
                        <span className="font-mono text-indigo-600 text-[11px] block mt-0.5">
                          {plan.plan_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{plan.warehouse_name || 'All Facilities'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>Start: {new Date(plan.planned_date).toLocaleDateString()}</div>
                        {plan.target_completion_date && (
                          <div className="text-[10px] text-slate-400">
                            Target: {new Date(plan.target_completion_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                        {plan.total_orders_count || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            plan.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : plan.status === 'approved'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {plan.status === 'draft' && (
                          <button
                            onClick={async () => {
                              await productionApi.approvePlan(plan.id);
                              fetchPlans();
                            }}
                            className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
                          >
                            Approve Plan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: YIELD & SCRAP ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                Target Planned Output
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {metrics ? Math.round(metrics.total_planned_volume).toLocaleString() : 0} units
              </div>
              <p className="text-xs text-slate-400 mt-1">Aggregated target production batches</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                Actual Realized Output
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                {metrics ? Math.round(metrics.total_actual_volume).toLocaleString() : 0} units
              </div>
              <p className="text-xs text-emerald-600 mt-1">Passed finished goods inwards</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                Aggregated Yield Performance
              </span>
              <div className="text-2xl font-bold font-mono text-indigo-700 mt-2">
                {metrics?.average_yield_pct || 0}%
              </div>
              <p className="text-xs text-indigo-500 mt-1">Plant-wide formula conversion efficiency</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals & 360 Drawer */}
      <ProductionOrderCreateModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onCreated={orderId => {
          refreshAll();
          setSelectedOrderIdForDrawer(orderId);
        }}
      />

      <ProductionPlanCreateModal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        onCreated={() => {
          refreshAll();
          setActiveTab('plans');
        }}
      />

      <MaterialAvailabilityModal
        isOpen={availabilityContext.isOpen}
        orderId={availabilityContext.orderId}
        orderNumber={availabilityContext.orderNumber}
        onClose={() => setAvailabilityContext({ isOpen: false, orderId: '', orderNumber: '' })}
        onReserved={() => {
          refreshAll();
        }}
      />

      {modalOrder && (
        <>
          <MaterialIssueModal
            isOpen={isIssueModalOpen}
            order={modalOrder}
            onClose={() => {
              setIsIssueModalOpen(false);
              setModalOrder(null);
            }}
            onIssued={() => {
              refreshAll();
            }}
          />

          <MaterialReturnModal
            isOpen={isReturnModalOpen}
            order={modalOrder}
            onClose={() => {
              setIsReturnModalOpen(false);
              setModalOrder(null);
            }}
            onReturned={() => {
              refreshAll();
            }}
          />

          <ProductionOutputModal
            isOpen={isOutputModalOpen}
            order={modalOrder}
            onClose={() => {
              setIsOutputModalOpen(false);
              setModalOrder(null);
            }}
            onRecorded={() => {
              refreshAll();
            }}
          />

          <ProductionWastageModal
            isOpen={isWastageModalOpen}
            order={modalOrder}
            onClose={() => {
              setIsWastageModalOpen(false);
              setModalOrder(null);
            }}
            onRecorded={() => {
              refreshAll();
            }}
          />
        </>
      )}

      <ProductionOrderDetailDrawer
        orderId={selectedOrderIdForDrawer}
        isOpen={Boolean(selectedOrderIdForDrawer)}
        onClose={() => setSelectedOrderIdForDrawer(null)}
        onRefresh={() => {
          refreshAll();
        }}
        onOpenAvailability={handleOpenAvailability}
        onOpenIssue={handleOpenIssue}
        onOpenReturn={handleOpenReturn}
        onOpenOutput={handleOpenOutput}
        onOpenWastage={handleOpenWastage}
      />
    </div>
  );
};
