import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShoppingCart,
  PackageCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { ProcurementMetricsHeader } from './ProcurementMetricsHeader';
import { PurchaseRequestListTable } from './PurchaseRequestListTable';
import { PurchaseRequestDetailDrawer } from './PurchaseRequestDetailDrawer';
import { CreatePurchaseRequestModal } from './CreatePurchaseRequestModal';
import { PurchaseOrderListTable } from './PurchaseOrderListTable';
import { PurchaseOrderDetailDrawer } from './PurchaseOrderDetailDrawer';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';
import { GoodsReceiptListTable } from './GoodsReceiptListTable';
import { GoodsReceiptDetailDrawer } from './GoodsReceiptDetailDrawer';
import { CreateGoodsReceiptModal } from './CreateGoodsReceiptModal';
import { procurementApi } from '../../../services/procurementApi';
import type {
  ProcurementSummary,
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
} from '../../../types/procurement';

type ProcurementTab = 'requisitions' | 'orders' | 'receipts';

interface ProcurementModuleProps {
  initialTab?: ProcurementTab;
}

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({ initialTab = 'requisitions' }) => {
  const [activeTab, setActiveTab] = useState<ProcurementTab>(initialTab);
  const [metrics, setMetrics] = useState<ProcurementSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // PR State
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [prTotal, setPrTotal] = useState(0);
  const [prPage, setPrPage] = useState(1);
  const [prLoading, setPrLoading] = useState(false);
  const [prSearch, setPrSearch] = useState('');
  const [prStatusFilter, setPrStatusFilter] = useState('');
  const [selectedPr, setSelectedPr] = useState<PurchaseRequest | null>(null);
  const [isPrDetailOpen, setIsPrDetailOpen] = useState(false);
  const [isCreatePrOpen, setIsCreatePrOpen] = useState(false);

  // PO State
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [poTotal, setPoTotal] = useState(0);
  const [poPage, setPoPage] = useState(1);
  const [poLoading, setPoLoading] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isPoDetailOpen, setIsPoDetailOpen] = useState(false);
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [poFromPr, setPoFromPr] = useState<PurchaseRequest | null>(null);

  // GRN State
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [grnTotal, setGrnTotal] = useState(0);
  const [grnPage, setGrnPage] = useState(1);
  const [grnLoading, setGrnLoading] = useState(false);
  const [grnSearch, setGrnSearch] = useState('');
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceipt | null>(null);
  const [isGrnDetailOpen, setIsGrnDetailOpen] = useState(false);
  const [isCreateGrnOpen, setIsCreateGrnOpen] = useState(false);
  const [grnTargetOrder, setGrnTargetOrder] = useState<PurchaseOrder | null>(null);

  // Initial fetch
  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    if (activeTab === 'requisitions') {
      loadRequests();
    } else if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'receipts') {
      loadReceipts();
    }
  }, [activeTab, prPage, prStatusFilter, poPage, poStatusFilter, grnPage]);

  // Load KPI Metrics
  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const data = await procurementApi.getSummary();
      setMetrics(data);
    } catch (err) {
      console.error('[Failed to fetch metrics]', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  // PR handlers
  const loadRequests = async () => {
    setPrLoading(true);
    try {
      const data = await procurementApi.getPurchaseRequests({
        page: prPage,
        limit: 10,
        status: prStatusFilter || undefined,
        search: prSearch.trim() || undefined,
      });
      setRequests(data.requests);
      setPrTotal(data.total);
    } catch (err) {
      console.error('[Failed to load PRs]', err);
    } finally {
      setPrLoading(false);
    }
  };

  // PO handlers
  const loadOrders = async () => {
    setPoLoading(true);
    try {
      const data = await procurementApi.getPurchaseOrders({
        page: poPage,
        limit: 10,
        status: poStatusFilter || undefined,
        search: poSearch.trim() || undefined,
      });
      setOrders(data.orders);
      setPoTotal(data.total);
    } catch (err) {
      console.error('[Failed to load POs]', err);
    } finally {
      setPoLoading(false);
    }
  };

  // GRN handlers
  const loadReceipts = async () => {
    setGrnLoading(true);
    try {
      const data = await procurementApi.getGoodsReceipts({
        page: grnPage,
        limit: 10,
        search: grnSearch.trim() || undefined,
      });
      setReceipts(data.receipts);
      setGrnTotal(data.total);
    } catch (err) {
      console.error('[Failed to load GRNs]', err);
    } finally {
      setGrnLoading(false);
    }
  };

  const handleRefreshAll = () => {
    loadMetrics();
    if (activeTab === 'requisitions') loadRequests();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'receipts') loadReceipts();
  };

  // PR Actions
  const handleSelectPr = (pr: PurchaseRequest) => {
    setSelectedPr(pr);
    setIsPrDetailOpen(true);
  };

  const handleSubmitPr = async (id: string) => {
    await procurementApi.submitPurchaseRequest(id);
    handleRefreshAll();
  };

  const handleApprovePr = async (id: string) => {
    await procurementApi.approvePurchaseRequest(id);
    handleRefreshAll();
  };

  const handleRejectPr = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      await procurementApi.rejectPurchaseRequest(id, reason);
      handleRefreshAll();
    }
  };

  const handleConvertToPo = (pr: PurchaseRequest) => {
    setPoFromPr(pr);
    setIsCreatePoOpen(true);
  };

  // PO Actions
  const handleSelectPo = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setIsPoDetailOpen(true);
  };

  const handleSubmitPo = async (id: string) => {
    await procurementApi.submitPurchaseOrder(id);
    handleRefreshAll();
  };

  const handleApprovePo = async (id: string) => {
    await procurementApi.approvePurchaseOrder(id);
    handleRefreshAll();
  };

  const handleSendPo = async (id: string) => {
    await procurementApi.sendPurchaseOrder(id);
    handleRefreshAll();
  };

  const handleAcknowledgePo = async (id: string) => {
    await procurementApi.acknowledgePurchaseOrder(id);
    handleRefreshAll();
  };

  const handleCreateGrnFromPo = (po: PurchaseOrder) => {
    setGrnTargetOrder(po);
    setIsCreateGrnOpen(true);
  };

  // GRN Actions
  const handleSelectGrn = (grn: GoodsReceipt) => {
    setSelectedGrn(grn);
    setIsGrnDetailOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Metrics Banner */}
      <ProcurementMetricsHeader
        metrics={metrics}
        loading={metricsLoading}
        onRefresh={handleRefreshAll}
      />

      {/* Main Sub-Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            id="tab-procurement-prs"
            onClick={() => setActiveTab('requisitions')}
            className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'requisitions'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Purchase Requests
            {metrics?.pending_requests_approval ? (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-bold">
                {metrics.pending_requests_approval}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            id="tab-procurement-pos"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase Orders
            {metrics?.open_purchase_orders ? (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">
                {metrics.open_purchase_orders}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            id="tab-procurement-grns"
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'receipts'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <PackageCheck className="w-4 h-4 mr-2" />
            Goods Receipts (GRN)
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          {activeTab === 'requisitions' && (
            <button
              type="button"
              id="btn-create-pr-modal"
              onClick={() => setIsCreatePrOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Requisition
            </button>
          )}

          {activeTab === 'orders' && (
            <button
              type="button"
              id="btn-create-po-modal"
              onClick={() => {
                setPoFromPr(null);
                setIsCreatePoOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Purchase Order
            </button>
          )}

          {activeTab === 'receipts' && (
            <button
              type="button"
              id="btn-create-grn-modal"
              onClick={() => {
                setGrnTargetOrder(null);
                setIsCreateGrnOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center"
            >
              <PackageCheck className="w-4 h-4 mr-1.5" />
              Receive Materials (GRN)
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              activeTab === 'requisitions'
                ? 'Search by PR#, purpose...'
                : activeTab === 'orders'
                ? 'Search PO#, supplier...'
                : 'Search GRN#, challan#, PO#...'
            }
            value={
              activeTab === 'requisitions'
                ? prSearch
                : activeTab === 'orders'
                ? poSearch
                : grnSearch
            }
            onChange={(e) => {
              if (activeTab === 'requisitions') setPrSearch(e.target.value);
              else if (activeTab === 'orders') setPoSearch(e.target.value);
              else setGrnSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (activeTab === 'requisitions') loadRequests();
                else if (activeTab === 'orders') loadOrders();
                else loadReceipts();
              }
            }}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {activeTab === 'requisitions' && (
            <select
              value={prStatusFilter}
              onChange={(e) => {
                setPrStatusFilter(e.target.value);
                setPrPage(1);
              }}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="converted_to_po">PO Created</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

          {activeTab === 'orders' && (
            <select
              value={poStatusFilter}
              onChange={(e) => {
                setPoStatusFilter(e.target.value);
                setPoPage(1);
              }}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent to Vendor</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="partially_received">Partially Received</option>
              <option value="fully_received">Fully Received</option>
              <option value="closed">Closed</option>
            </select>
          )}

          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      {activeTab === 'requisitions' && (
        <PurchaseRequestListTable
          requests={requests}
          loading={prLoading}
          total={prTotal}
          page={prPage}
          limit={10}
          onPageChange={setPrPage}
          onSelectRequest={handleSelectPr}
          onSubmitRequest={handleSubmitPr}
          onApproveRequest={handleApprovePr}
          onRejectRequest={handleRejectPr}
          onConvertToPo={handleConvertToPo}
        />
      )}

      {activeTab === 'orders' && (
        <PurchaseOrderListTable
          orders={orders}
          loading={poLoading}
          total={poTotal}
          page={poPage}
          limit={10}
          onPageChange={setPoPage}
          onSelectOrder={handleSelectPo}
          onSubmitOrder={handleSubmitPo}
          onApproveOrder={handleApprovePo}
          onSendOrder={handleSendPo}
          onAcknowledgeOrder={handleAcknowledgePo}
          onCreateGrn={handleCreateGrnFromPo}
        />
      )}

      {activeTab === 'receipts' && (
        <GoodsReceiptListTable
          receipts={receipts}
          loading={grnLoading}
          total={grnTotal}
          page={grnPage}
          limit={10}
          onPageChange={setGrnPage}
          onSelectReceipt={handleSelectGrn}
        />
      )}

      {/* Drawers & Modals */}
      <PurchaseRequestDetailDrawer
        isOpen={isPrDetailOpen}
        requestId={selectedPr?.id || null}
        onClose={() => setIsPrDetailOpen(false)}
        onRefresh={handleRefreshAll}
        onConvertToPo={handleConvertToPo}
      />

      <CreatePurchaseRequestModal
        isOpen={isCreatePrOpen}
        onClose={() => setIsCreatePrOpen(false)}
        onSuccess={() => {
          handleRefreshAll();
          setActiveTab('requisitions');
        }}
      />

      <PurchaseOrderDetailDrawer
        isOpen={isPoDetailOpen}
        orderId={selectedPo?.id || null}
        onClose={() => setIsPoDetailOpen(false)}
        onRefresh={handleRefreshAll}
        onCreateGrn={handleCreateGrnFromPo}
      />

      <CreatePurchaseOrderModal
        isOpen={isCreatePoOpen}
        initialFromRequest={poFromPr}
        onClose={() => {
          setIsCreatePoOpen(false);
          setPoFromPr(null);
        }}
        onSuccess={() => {
          handleRefreshAll();
          setActiveTab('orders');
        }}
      />

      <GoodsReceiptDetailDrawer
        isOpen={isGrnDetailOpen}
        receiptId={selectedGrn?.id || null}
        onClose={() => setIsGrnDetailOpen(false)}
        onRefresh={handleRefreshAll}
      />

      <CreateGoodsReceiptModal
        isOpen={isCreateGrnOpen}
        targetOrder={grnTargetOrder}
        onClose={() => {
          setIsCreateGrnOpen(false);
          setGrnTargetOrder(null);
        }}
        onSuccess={() => {
          handleRefreshAll();
          setActiveTab('receipts');
        }}
      />
    </div>
  );
};
