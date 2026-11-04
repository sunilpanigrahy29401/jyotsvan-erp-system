import React, { useState, useEffect } from 'react';
import {
  Truck,
  Boxes,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
  Building2,
  PackagePlus,
  RefreshCw,
} from 'lucide-react';
import { WarehouseMaster } from '../../../types/warehouse';

interface DockStagingConsoleProps {
  warehouses: WarehouseMaster[];
  onSelectWarehouse: (wh: WarehouseMaster) => void;
  onRefresh: () => void;
}

export const DockStagingConsole: React.FC<DockStagingConsoleProps> = ({
  warehouses,
  onSelectWarehouse,
  onRefresh,
}) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [stagingData, setStagingData] = useState<{
    inboundTransfers: any[];
    outboundTransfers: any[];
    quarantineStock: any[];
    dockLocations: any[];
  }>({
    inboundTransfers: [],
    outboundTransfers: [],
    quarantineStock: [],
    dockLocations: [],
  });

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses]);

  useEffect(() => {
    if (selectedWarehouseId) {
      loadDockData(selectedWarehouseId);
    }
  }, [selectedWarehouseId]);

  const loadDockData = async (whId: string) => {
    setLoading(true);
    try {
      const [inboundRes, outboundRes, stockRes, locRes] = await Promise.all([
        fetch(`/api/warehouse-transfers?destination_warehouse_id=${whId}&status=in_transit&limit=10`),
        fetch(`/api/warehouse-transfers?source_warehouse_id=${whId}&status=approved&limit=10`),
        fetch(`/api/inventory/balances?warehouse_id=${whId}&limit=100`),
        fetch(`/api/warehouses/${whId}/locations`),
      ]);

      const inData = await inboundRes.json();
      const outData = await outboundRes.json();
      const stData = await stockRes.json();
      const lcData = await locRes.json();

      const quarantine = (stData.balances || []).filter((b: any) => Number(b.quarantine_quantity) > 0);
      const docks = (lcData.data || []).filter((l: any) =>
        ['receiving', 'dispatch', 'quarantine', 'transit'].includes(l.location_type)
      );

      setStagingData({
        inboundTransfers: inData.transfers || [],
        outboundTransfers: outData.transfers || [],
        quarantineStock: quarantine,
        dockLocations: docks,
      });
    } catch (err) {
      console.error('[Dock Console Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  return (
    <div className="space-y-6">
      {/* Header filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Dock & Staging Logistics Console</h3>
            <p className="text-xs text-slate-500">Monitor live inbound gates, staging bays, and quarantine holds</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Facility:</label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => selectedWarehouseId && loadDockData(selectedWarehouseId)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Dock Stations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Inbound Gate & Receiving Docks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Inbound Receiving Docks</h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {stagingData.inboundTransfers.length} Inbound
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {stagingData.inboundTransfers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No trucks currently in-transit to this facility.</div>
            ) : (
              stagingData.inboundTransfers.map((trf) => (
                <div key={trf.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono font-bold text-blue-600">
                    <span>{trf.transfer_number}</span>
                    <span className="text-2xs font-semibold text-emerald-600 px-1.5 py-0.2 bg-emerald-50 rounded">
                      In-Transit
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span>From: {trf.source_warehouse_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-slate-500 pt-1 border-t border-slate-200">
                    <span>{trf.total_quantity} units</span>
                    <span>Carrier: {trf.shipping_carrier || 'Fleet'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Outbound Staging & Picking Bays */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/40">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Outbound Dispatch Staging</h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {stagingData.outboundTransfers.length} Ready
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {stagingData.outboundTransfers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No pending orders awaiting dispatch staging.</div>
            ) : (
              stagingData.outboundTransfers.map((trf) => (
                <div key={trf.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono font-bold text-indigo-600">
                    <span>{trf.transfer_number}</span>
                    <span className="text-2xs font-semibold text-blue-600 px-1.5 py-0.2 bg-blue-50 rounded">Approved</span>
                  </div>
                  <div className="text-slate-700">To: {trf.destination_warehouse_name}</div>
                  <div className="flex items-center justify-between text-2xs text-slate-500 pt-1 border-t border-slate-200">
                    <span>{trf.total_quantity} units</span>
                    <span className="font-semibold text-indigo-600">Ready for Truck Load</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Quarantine & Isolation Holds */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quarantine & QC Holding</h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {stagingData.quarantineStock.length} SKUs Held
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {stagingData.quarantineStock.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No quarantine holds active at this facility.</div>
            ) : (
              stagingData.quarantineStock.map((stk) => (
                <div key={stk.id} className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono font-bold text-amber-900">
                    <span>{stk.sku_code}</span>
                    <span className="font-bold text-rose-600">{stk.quarantine_quantity} held</span>
                  </div>
                  <div className="text-slate-600">{stk.product_name || stk.sku_name}</div>
                  <div className="text-2xs text-amber-700 font-medium">Locked from outbound allocation</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
