// src/app/pages/commerce/amazon/AmazonInventoryTab.tsx
// Phase 31: Amazon FBA & MFN Multi-Channel Inventory Management

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  Truck,
  PackageCheck,
  AlertTriangle,
  Clock,
  Archive,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';
import type { AmazonInventory } from '../../../../types/amazon.ts';

interface AmazonInventoryTabProps {
  selectedMarketplace: string;
}

export function AmazonInventoryTab({ selectedMarketplace }: AmazonInventoryTabProps) {
  const [inventory, setInventory] = useState<AmazonInventory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await amazonApi.getInventory({
        marketplaceId: selectedMarketplace,
        fulfillmentChannel: channelFilter,
        search,
      });
      setInventory(res.inventory);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load Amazon inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedMarketplace, channelFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  // Aggregated summaries
  const totalFba = inventory
    .filter((i) => i.fulfillment_channel === 'FBA')
    .reduce((sum, i) => sum + i.available_quantity, 0);
  const totalMfn = inventory
    .filter((i) => i.fulfillment_channel === 'MFN')
    .reduce((sum, i) => sum + i.available_quantity, 0);
  const totalReserved = inventory.reduce((sum, i) => sum + i.reserved_quantity, 0);
  const totalInbound = inventory.reduce(
    (sum, i) => sum + i.inbound_working + i.inbound_shipped + i.inbound_receiving,
    0
  );

  return (
    <div className="space-y-4">
      {/* 4-KPI Inventory Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            FBA Available Units
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalFba} units</div>
          <div className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1 font-medium">
            <PackageCheck className="w-3 h-3" /> Ready for Prime Dispatch
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            MFN Merchant Units
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalMfn} units</div>
          <div className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-1 font-medium">
            <Truck className="w-3 h-3" /> Central Warehouse Link
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            FBA Customer Reserved
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{totalReserved} units</div>
          <div className="text-[11px] text-purple-600 mt-0.5 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> FC Transfer & Order Lock
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Inbound Shipment Pipeline
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{totalInbound} units</div>
          <div className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1 font-medium">
            <Archive className="w-3 h-3" /> Working / Shipped / Receiving
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, ASIN, or FNSKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Channels</option>
            <option value="FBA">FBA (Fulfillment by Amazon)</option>
            <option value="MFN">MFN (Merchant Fulfilled)</option>
          </select>

          <button
            onClick={fetchInventory}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Seller SKU / ASIN</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Reserved</th>
                <th className="py-3 px-4 text-center">Inbound Pipeline</th>
                <th className="py-3 px-4 text-center">Total Inventory</th>
                <th className="py-3 px-4">Stock Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Fetching Amazon SP-API inventory summaries...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                inventory.map((inv) => {
                  const isLow = inv.available_quantity < 25;
                  const inboundTotal = inv.inbound_working + inv.inbound_shipped + inv.inbound_receiving;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">{inv.seller_sku}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ASIN: <strong className="text-amber-700">{inv.asin || 'N/A'}</strong>
                          {inv.fnsku ? ` • FNSKU: ${inv.fnsku}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            inv.fulfillment_channel === 'FBA'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {inv.fulfillment_channel === 'FBA' ? 'FBA Prime' : 'MFN Merchant'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-bold text-slate-900">{inv.available_quantity}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        {inv.reserved_quantity}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-slate-800">{inboundTotal}</span>
                        {inboundTotal > 0 && (
                          <div className="text-[10px] text-slate-400">
                            {inv.inbound_working}w / {inv.inbound_shipped}s / {inv.inbound_receiving}r
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {inv.total_quantity}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Low Stock ({inv.available_quantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Healthy Buffer
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
