import React, { useState, useEffect } from 'react';
import { Search, RotateCw, Download, ChevronLeft, ChevronRight, History, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Lock, Layers } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { LoadingState } from '../../../components/ui/loading-state';
import type { InventoryMovement } from '../../../types/inventory';

export function MovementLedgerTab() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/warehouses')
      .then((r) => r.json())
      .then((data) => {
        if (data.warehouses) setWarehouses(data.warehouses);
      })
      .catch(() => {});
  }, []);

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.getMovements({
        search: search.trim() || undefined,
        movementType: movementType || undefined,
        warehouseId: warehouseId || undefined,
        page,
        limit,
      });

      setMovements(data.movements);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load movement ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page, search, movementType, warehouseId]);

  const handleExportCSV = () => {
    if (movements.length === 0) return;
    const headers = ['Movement ID', 'Timestamp', 'SKU', 'Variant', 'Warehouse', 'Location', 'Movement Type', 'Stock Type', 'Quantity', 'Before Qty', 'After Qty', 'Reference Type', 'Reference ID', 'Actor', 'Reason'];
    const rows = movements.map((m) => [
      m.id,
      m.created_at,
      m.sku_code,
      m.variant_name,
      m.warehouse_name,
      m.location_name || 'Default Bay',
      m.movement_type,
      m.stock_type,
      m.quantity,
      m.before_quantity,
      m.after_quantity,
      m.reference_type || 'N/A',
      m.reference_id || 'N/A',
      m.performed_by_email || 'System',
      `"${(m.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_movement_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTypeBadge = (type: string) => {
    if (type.includes('increase') || type.includes('intake') || type.includes('opening')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowUpRight className="w-3 h-3 mr-1" />
          {type.replace(/_/g, ' ')}
        </span>
      );
    }
    if (type.includes('transfer')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <ArrowRightLeft className="w-3 h-3 mr-1" />
          {type.replace(/_/g, ' ')}
        </span>
      );
    }
    if (type.includes('reserve') || type.includes('hold')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Lock className="w-3 h-3 mr-1" />
          {type.replace(/_/g, ' ')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <ArrowDownRight className="w-3 h-3 mr-1" />
        {type.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by SKU, reference ID, reason, or actor email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="w-full sm:w-52">
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Movement Types</option>
              <option value="adjustment_increase">Adjustment Increase (+)</option>
              <option value="adjustment_decrease">Adjustment Decrease (-)</option>
              <option value="transfer_in">Transfer Intake (In)</option>
              <option value="transfer_out">Transfer Dispatch (Out)</option>
              <option value="reservation_hold">Reservation Hold</option>
              <option value="reservation_release">Reservation Release</option>
              <option value="reservation_consume">Reservation Dispatched</option>
              <option value="opening_balance">Opening Balance Baseline</option>
              <option value="purchase_intake">Purchase Order GRN Intake</option>
              <option value="production_consumption">Production BOM Consumption</option>
              <option value="production_yield">Production Finished Yield</option>
            </select>
          </div>

          <div className="w-full sm:w-48">
            <select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMovements}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh Ledger"
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

      {/* Movement Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingState message="Loading Stock Movement Ledger" description="Fetching append-only audit trail and transactional state transitions..." />
          </div>
        ) : movements.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-3">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No stock movements found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Movements will be logged immutably whenever stock adjustments, transfers, or reservations occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp & ID</th>
                  <th className="py-3 px-3">Canonical SKU</th>
                  <th className="py-3 px-3">Warehouse / Depot</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3 text-right">Delta Quantity</th>
                  <th className="py-3 px-3 text-right">Balance Transition</th>
                  <th className="py-3 px-3">Reference / Order</th>
                  <th className="py-3 px-4">Actor & Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isPos = m.movement_type.includes('increase') || m.movement_type.includes('intake') || m.movement_type.includes('transfer_in') || m.movement_type.includes('opening');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp & ID */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.id.substring(0, 12)}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900 text-xs">{m.sku_code}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{m.variant_name}</div>
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{m.warehouse_name}</div>
                        <div className="text-[11px] text-slate-400">{m.location_name || 'Default Bay'}</div>
                      </td>

                      {/* Movement Type */}
                      <td className="py-3 px-3">{renderTypeBadge(m.movement_type)}</td>

                      {/* Delta Quantity */}
                      <td className={`py-3 px-3 text-right font-bold text-sm ${isPos ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isPos ? '+' : '-'}{Number(m.quantity).toLocaleString()}
                      </td>

                      {/* Before -> After */}
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                        <span className="text-slate-400">{Number(m.before_quantity).toLocaleString()}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-bold text-slate-800">{Number(m.after_quantity).toLocaleString()}</span>
                      </td>

                      {/* Reference */}
                      <td className="py-3 px-3">
                        {m.reference_id ? (
                          <div>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">
                              {m.reference_id}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 capitalize">{m.reference_type}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actor & Reason */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-[220px]" title={m.reason || ''}>
                          {m.reason || 'General Ledger Mutation'}
                        </div>
                        <div className="text-[10px] text-slate-400">{m.performed_by_email || 'system'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{movements.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold">{total}</span> ledger entries
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
