import React, { useState } from 'react';
import {
  Package,
  Search,
  Filter,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  TrendingDown,
  Warehouse,
} from 'lucide-react';
import type { CFStockItem, CFMaster } from '../../../types/cfs';

interface CFInventoryViewProps {
  inventory: CFStockItem[];
  cfs: CFMaster[];
  loading: boolean;
  onRefresh: () => void;
  onNewTransfer: () => void;
  onNewDispatch: () => void;
}

export const CFInventoryView: React.FC<CFInventoryViewProps> = ({
  inventory,
  cfs,
  loading,
  onRefresh,
  onNewTransfer,
  onNewDispatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCf, setSelectedCf] = useState<string>('all');

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.sku_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batch_number && item.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.cf_name && item.cf_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.warehouse_name && item.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCf = selectedCf === 'all' || item.cf_id === selectedCf;

    return matchesSearch && matchesCf;
  });

  const totalUnits = filteredInventory.reduce((acc, i) => acc + i.total_quantity, 0);
  const totalValuation = filteredInventory.reduce((acc, i) => acc + (i.estimated_inventory_value || (i.total_quantity * i.unit_cost)), 0);
  const totalReserved = filteredInventory.reduce((acc, i) => acc + i.reserved_quantity, 0);
  const totalAvailable = filteredInventory.reduce((acc, i) => acc + i.available_quantity, 0);

  return (
    <div className="space-y-4">
      {/* Metric summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Total C&F Depot Stock</p>
          <p className="text-xl font-bold text-neutral-900 mt-1">{totalUnits.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Units across all mapped partner depots</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Custody Inventory Valuation</p>
          <p className="text-xl font-bold text-indigo-700 mt-1">₹{totalValuation.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">At standard product cost</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Allocated / Reserved</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{totalReserved.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Committed to pending dispatches</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Free Available for Dispatch</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{totalAvailable.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Ready for channel fulfillment</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, Batch lot, C&F Agency or Warehouse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <select
            value={selectedCf}
            onChange={(e) => setSelectedCf(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All C&F Agencies</option>
            {cfs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name} ({c.city})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onNewTransfer}
            className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            + Replenish Depot
          </button>
          <button
            onClick={onNewDispatch}
            className="px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
          >
            + Outbound Dispatch
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">SKU Code & Product</th>
                <th className="py-3 px-4">Batch Lot</th>
                <th className="py-3 px-4">C&F Partner & Depot</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-right">On Hand</th>
                <th className="py-3 px-4 text-right">Reserved</th>
                <th className="py-3 px-4 text-right">Available</th>
                <th className="py-3 px-4 text-right">Valuation (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    Loading C&F Depot Stock Balances...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No stock balances recorded matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item, idx) => (
                  <tr key={`${item.sku_id}-${item.warehouse_id}-${item.batch_id || idx}`} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{item.sku_name}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{item.sku_code}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-neutral-700">
                      {item.batch_number ? (
                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-800 border border-neutral-200">
                          {item.batch_number}
                        </span>
                      ) : (
                        <span className="text-neutral-400 italic">Standard</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{item.cf_name || 'C&F Partner'}</div>
                      <div className="text-[11px] text-neutral-500">{item.warehouse_name}</div>
                    </td>

                    <td className="py-3 px-4 text-neutral-600">
                      {item.location_code || 'Default Bay'}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-neutral-900">
                      {item.total_quantity.toLocaleString('en-IN')} {item.unit_short_code || ''}
                    </td>

                    <td className="py-3 px-4 text-right text-amber-700 font-medium">
                      {item.reserved_quantity.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {item.available_quantity.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-neutral-900 font-medium">
                      ₹{(item.estimated_inventory_value || (item.total_quantity * item.unit_cost)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
