import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  AlertTriangle,
  Building2,
  Store,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerStockItem, RetailerReceivingRecord } from '../../../types/retailers.ts';

export const RetailerInventoryView: React.FC = () => {
  const [subTab, setSubTab] = useState<'on_hand' | 'receiving_log'>('on_hand');
  const [stockItems, setStockItems] = useState<RetailerStockItem[]>([]);
  const [receivingRecords, setReceivingRecords] = useState<RetailerReceivingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [nearExpiryOnly, setNearExpiryOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, [subTab, nearExpiryOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'on_hand') {
        const res = await retailerApi.getStockItems({
          search,
          near_expiry: nearExpiryOnly,
          limit: 100,
        });
        setStockItems(res.data);
      } else {
        const res = await retailerApi.listReceivingRecords({ limit: 100 });
        setReceivingRecords(res.data);
      }
    } catch (err) {
      console.error('Failed to load channel inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Subtab Bar & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('on_hand')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'on_hand'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Channel On-Hand Stock
          </button>
          <button
            onClick={() => setSubTab('receiving_log')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'receiving_log'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Distributor Dispatches Received
          </button>
        </div>

        {subTab === 'on_hand' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU or store..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
              />
            </div>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={nearExpiryOnly}
                onChange={(e) => setNearExpiryOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-600 rounded"
              />
              Near-Expiry Only (&lt;60d)
            </label>

            <button
              onClick={loadData}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {subTab === 'on_hand' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-3 px-4">Retailer Outlet</th>
                  <th className="py-3 px-4">Product SKU</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Source Distributor</th>
                  <th className="py-3 px-4">Available Qty</th>
                  <th className="py-3 px-4">Valuation</th>
                  <th className="py-3 px-4">Shelf-Life Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Loading channel stock...</td>
                  </tr>
                ) : stockItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">No stock records found matching filters.</td>
                  </tr>
                ) : (
                  stockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.retailer_name}
                        <div className="text-[10px] text-slate-400 font-mono">{item.retailer_code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{item.sku_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.sku_code} • {item.category}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{item.batch_number}</td>
                      <td className="py-3 px-4 text-slate-600">{item.distributor_name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{item.quantity_available}</span> {item.uom}
                        {item.quantity_damaged > 0 && (
                          <div className="text-[10px] text-rose-500 font-medium">({item.quantity_damaged} damaged)</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{formatCurrency(item.total_valuation || 0)}</td>
                      <td className="py-3 px-4">
                        {item.shelf_life_days_remaining !== undefined ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.shelf_life_days_remaining <= 0
                                ? 'bg-rose-100 text-rose-800'
                                : item.shelf_life_days_remaining <= 60
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.shelf_life_days_remaining <= 60 && <AlertTriangle className="w-3 h-3" />}
                            {item.shelf_life_days_remaining <= 0 ? 'Expired' : `${item.shelf_life_days_remaining}d shelf-life`}
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">Retailer</th>
                  <th className="py-3 px-4">Distributor</th>
                  <th className="py-3 px-4">SKU & Batch</th>
                  <th className="py-3 px-4">Quantity Received</th>
                  <th className="py-3 px-4">Damage / Shortage</th>
                  <th className="py-3 px-4">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Loading receiving history...</td>
                  </tr>
                ) : receivingRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">No receiving records logged.</td>
                  </tr>
                ) : (
                  receivingRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{rec.grn_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{rec.retailer_name}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.distributor_name}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{rec.sku_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Batch: {rec.batch_number}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{rec.received_quantity}</td>
                      <td className="py-3 px-4">
                        {rec.damaged_quantity > 0 || rec.shortage_quantity > 0 ? (
                          <span className="text-rose-600 font-medium">
                            {rec.damaged_quantity} dmg / {rec.shortage_quantity} short
                          </span>
                        ) : (
                          <span className="text-slate-400">Nil</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(rec.received_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
