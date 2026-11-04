import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  ArrowRightLeft,
  Lock,
  Eye,
  AlertTriangle,
  Download,
  RotateCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  ShieldAlert,
} from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { LoadingState } from '../../../components/ui/loading-state';
import type { InventoryBalance } from '../../../types/inventory';

interface StockBalancesTabProps {
  onOpenAdjustment: (balance?: InventoryBalance) => void;
  onOpenTransfer: (balance?: InventoryBalance) => void;
  onOpenReservation: (balance?: InventoryBalance) => void;
  onInspectSku: (skuId: string) => void;
}

export function StockBalancesTab({
  onOpenAdjustment,
  onOpenTransfer,
  onOpenReservation,
  onInspectSku,
}: StockBalancesTabProps) {
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('total_quantity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load warehouses
  useEffect(() => {
    fetch('/api/warehouses')
      .then((r) => r.json())
      .then((data) => {
        if (data.warehouses) setWarehouses(data.warehouses);
      })
      .catch(() => {});
  }, []);

  const fetchBalances = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.getBalances({
        search: search.trim() || undefined,
        warehouseId: warehouseId || undefined,
        stockStatus: stockStatus !== 'all' ? stockStatus : undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      setBalances(data.balances);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load stock balances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [page, search, warehouseId, stockStatus, sortBy, sortOrder]);

  const handleExportCSV = () => {
    if (balances.length === 0) return;
    const headers = ['SKU', 'Variant', 'Category', 'Warehouse', 'Location', 'Available', 'Reserved', 'Damaged', 'Quarantine', 'Total Physical', 'Reorder Level', 'Unit Price (INR)', 'Total Valuation (INR)'];
    const rows = balances.map((b) => [
      b.sku_code,
      b.variant_name,
      b.category_name || 'N/A',
      b.warehouse_name,
      b.location_name || 'Default Bay',
      b.available_quantity,
      b.reserved_quantity,
      b.damaged_quantity,
      b.quarantine_quantity,
      b.total_quantity,
      b.reorder_level,
      b.unit_price_cents ? (b.unit_price_cents / 100).toFixed(2) : 0,
      b.estimated_valuation_cents ? (b.estimated_valuation_cents / 100).toFixed(2) : 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_balances_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by SKU, variant name, barcode, or category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Warehouse Filter */}
          <div className="w-full sm:w-56">
            <select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Warehouses & Depots</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="w-full sm:w-44">
            <select
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; 0)</option>
              <option value="low_stock">Low Stock (≤ ROL)</option>
              <option value="out_of_stock">Out of Stock (= 0)</option>
              <option value="damaged">Has Damaged Stock</option>
              <option value="quarantine">In QC Quarantine</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchBalances}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh Stock Balances"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stock Balances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingState message="Fetching Stock Balances" description="Aggregating multi-depot physical inventory and valuation..." />
          </div>
        ) : balances.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-3">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No stock balances found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Try adjusting your warehouse filter or search terms, or establish an opening balance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">SKU & Item Master</th>
                  <th className="py-3 px-3">Depot / Location</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Available</th>
                  <th className="py-3 px-3 text-right text-amber-700">Reserved</th>
                  <th className="py-3 px-3 text-right text-rose-700">Dmg / Quar</th>
                  <th className="py-3 px-3 text-right font-bold text-slate-900">Total Physical</th>
                  <th className="py-3 px-3 text-center">Reorder Status</th>
                  <th className="py-3 px-4 text-right">Est. Valuation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map((b) => {
                  const avail = Number(b.available_quantity);
                  const res = Number(b.reserved_quantity);
                  const dmg = Number(b.damaged_quantity);
                  const quar = Number(b.quarantine_quantity);
                  const total = Number(b.total_quantity);
                  const rol = Number(b.reorder_level || 0);

                  const isLow = total > 0 && total <= rol;
                  const isOut = total <= 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* SKU & Product */}
                      <td className="py-3 px-4">
                        <div className="flex items-start space-x-2.5">
                          <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 flex-shrink-0 mt-0.5">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-slate-900 text-xs">{b.sku_code}</span>
                              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {b.variant_name}
                              </span>
                            </div>
                            <p className="text-slate-600 font-medium text-xs truncate max-w-[200px]" title={b.product_name}>
                              {b.product_name}
                            </p>
                            <span className="text-[10px] text-slate-400">Category: {b.category_name || 'Standard'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Warehouse & Bay */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{b.warehouse_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {b.location_name ? `${b.location_name} (${b.location_code})` : 'Default Bay'}
                        </div>
                      </td>

                      {/* Available */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 text-sm">
                        {avail.toLocaleString()}
                      </td>

                      {/* Reserved */}
                      <td className="py-3 px-3 text-right font-semibold text-amber-600 text-xs">
                        {res > 0 ? res.toLocaleString() : '—'}
                      </td>

                      {/* Damaged / Quarantine */}
                      <td className="py-3 px-3 text-right text-xs">
                        {dmg + quar > 0 ? (
                          <span className="text-rose-600 font-medium">
                            {dmg > 0 ? `${dmg} dmg` : ''} {quar > 0 ? `${quar} quar` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total Physical */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">
                        {total.toLocaleString()}
                      </td>

                      {/* Reorder Status */}
                      <td className="py-3 px-3 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Low Stock (≤{rol})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Healthy
                          </span>
                        )}
                      </td>

                      {/* Est. Valuation */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 text-xs">
                        ₹{(Number(b.estimated_valuation_cents || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => onInspectSku(b.sku_id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Inspect SKU 360 Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenAdjustment(b)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Adjust Stock Count"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenTransfer(b)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Inter-Warehouse Transfer"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenReservation(b)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Reserve Stock"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{balances.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold">{total}</span> records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
