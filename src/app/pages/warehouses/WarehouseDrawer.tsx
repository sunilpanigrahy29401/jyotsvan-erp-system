import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Layers,
  Boxes,
  ArrowLeftRight,
  ClipboardCheck,
  Users,
  Plus,
  ShieldCheck,
  Wrench,
  Archive,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { WarehouseMaster, WarehouseLocationHierarchy } from '../../../types/warehouse';
import { LocationTreeViewer } from './LocationTreeViewer';
import { CreateLocationModal } from './CreateLocationModal';
import { WarehouseStaffModal } from './WarehouseStaffModal';

interface WarehouseDrawerProps {
  warehouse: WarehouseMaster | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const WarehouseDrawer: React.FC<WarehouseDrawerProps> = ({ warehouse, isOpen, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'stock' | 'transfers' | 'counts' | 'staff'>('overview');
  const [locations, setLocations] = useState<WarehouseLocationHierarchy[]>([]);
  const [locationTree, setLocationTree] = useState<WarehouseLocationHierarchy[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedParentLocationId, setSelectedParentLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (warehouse && isOpen) {
      loadWarehouseData();
    }
  }, [warehouse?.id, isOpen, activeTab]);

  const loadWarehouseData = async () => {
    if (!warehouse) return;
    setLoading(true);

    try {
      if (activeTab === 'locations' || activeTab === 'overview') {
        const [locRes, treeRes] = await Promise.all([
          fetch(`/api/warehouses/${warehouse.id}/locations`),
          fetch(`/api/warehouses/${warehouse.id}/locations/tree`),
        ]);
        const locData = await locRes.json();
        const treeData = await treeRes.json();
        if (locData.success) setLocations(locData.data || []);
        if (treeData.success) setLocationTree(treeData.data || []);
      }

      if (activeTab === 'stock') {
        const stockRes = await fetch(`/api/inventory/balances?warehouse_id=${warehouse.id}&limit=100`);
        const stockData = await stockRes.json();
        if (stockData.success) setStockItems(stockData.balances || []);
      }

      if (activeTab === 'transfers') {
        const trfRes = await fetch(`/api/warehouse-transfers?source_warehouse_id=${warehouse.id}&limit=20`);
        const trfData = await trfRes.json();
        if (trfData.success) setTransfers(trfData.transfers || []);
      }

      if (activeTab === 'counts') {
        const cntRes = await fetch(`/api/warehouse-counts?warehouse_id=${warehouse.id}&limit=20`);
        const cntData = await cntRes.json();
        if (cntData.success) setCounts(cntData.sessions || []);
      }

      if (activeTab === 'staff') {
        const staffRes = await fetch(`/api/warehouses/${warehouse.id}/staff`);
        const staffData = await staffRes.json();
        if (staffData.success) setStaff(staffData.data || []);
      }
    } catch (err) {
      console.error('[Warehouse Drawer Error]', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !warehouse) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {warehouse.code.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{warehouse.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                  {warehouse.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{warehouse.city ? `${warehouse.city}, ${warehouse.state || ''}` : warehouse.country}</span>
                <span>•</span>
                <span className="capitalize">{warehouse.warehouse_type.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadWarehouseData}
              title="Refresh facility data"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-1 bg-white overflow-x-auto">
          {[
            { id: 'overview', label: 'Facility 360°', icon: Info },
            { id: 'locations', label: `Locations & Bins (${locations.length})`, icon: Layers },
            { id: 'stock', label: `Stock Balances (${warehouse.total_skus_count || 0})`, icon: Boxes },
            { id: 'transfers', label: 'Transfers & STO', icon: ArrowLeftRight },
            { id: 'counts', label: 'Cycle Audits', icon: ClipboardCheck },
            { id: 'staff', label: 'Assigned Staff', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Highlights */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium">Usable Area</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {warehouse.capacity_sq_ft ? `${warehouse.capacity_sq_ft.toLocaleString()} sq.ft` : '50,000 sq.ft'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Volumetric: {warehouse.capacity_cubic_meters || 12000} m³</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium">Indexed Storage Slots</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">{warehouse.total_locations_count || locations.length}</div>
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">85% Safe Target Threshold</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium">Inventory Units</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {(warehouse.total_units_count || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-indigo-600 font-medium mt-0.5">{warehouse.total_skus_count || 0} unique SKUs</div>
                </div>
              </div>

              {/* Facility Metadata */}
              <div className="grid grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Facility Parameters</h3>
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Facility Type:</dt>
                      <dd className="font-semibold text-slate-800 capitalize">{warehouse.warehouse_type.replace(/_/g, ' ')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Corporate Branch:</dt>
                      <dd className="font-semibold text-slate-800">{warehouse.branch_name || 'Corporate HQ'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Operational Status:</dt>
                      <dd className="font-semibold text-emerald-600 uppercase tracking-wide">{warehouse.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Registered Date:</dt>
                      <dd className="text-slate-700">{new Date(warehouse.created_at).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Management & Address</h3>
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Contact Lead:</dt>
                      <dd className="font-semibold text-slate-800">{warehouse.contact_name || warehouse.contact_person || 'Assigned'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Direct Phone:</dt>
                      <dd className="text-slate-700">{warehouse.contact_phone || warehouse.phone || '+91 22 4567 8900'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Direct Email:</dt>
                      <dd className="text-slate-700">{warehouse.contact_email || warehouse.email || 'warehouse@jyotsvan.enterprise'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Full Address:</dt>
                      <dd className="text-slate-700 text-right max-w-[200px] truncate">{warehouse.address || warehouse.address_line1 || 'Main Facility'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Operating Notes */}
              {warehouse.notes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">Dock Rules & Operational Notes</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{warehouse.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOCATIONS & HIERARCHY TREE */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hierarchical Storage Structure</h3>
                  <p className="text-xs text-slate-500">Zones, Aisles, Racks, Shelves, and Pallet/Bin Slots</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedParentLocationId(null);
                    setIsAddLocationOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Zone / Bin
                </button>
              </div>

              <LocationTreeViewer
                tree={locationTree}
                onAddChild={(parentId) => {
                  setSelectedParentLocationId(parentId);
                  setIsAddLocationOpen(true);
                }}
                onRefresh={loadWarehouseData}
              />
            </div>
          )}

          {/* TAB 3: STOCK BALANCES */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Active Warehouse Inventory</h3>
                <span className="text-xs text-slate-500">{stockItems.length} SKU stock records</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU & Product</th>
                      <th className="py-2.5 px-3">Location Bin</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-right">Reserved</th>
                      <th className="py-2.5 px-3 text-right">Quarantine</th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-800">Total Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No active stock balances recorded at this warehouse.
                        </td>
                      </tr>
                    ) : (
                      stockItems.map((stk) => (
                        <tr key={stk.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-900">{stk.sku_code}</span>
                            <div className="text-slate-500">{stk.product_name || stk.sku_name}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {stk.location_name || stk.location_code || 'General Storage'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                            {stk.available_quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-600">{stk.reserved_quantity || 0}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600">{stk.quarantine_quantity || 0}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{stk.total_quantity}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSFERS & STO */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Outbound & Inbound Transfers</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Transfer #</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No recent transfer orders recorded.
                        </td>
                      </tr>
                    ) : (
                      transfers.map((trf) => (
                        <tr key={trf.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{trf.transfer_number}</td>
                          <td className="py-2.5 px-3">{trf.destination_warehouse_name}</td>
                          <td className="py-2.5 px-3">
                            {trf.items_count} items ({trf.total_quantity} units)
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="capitalize px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">
                              {trf.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{new Date(trf.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CYCLE COUNTS */}
          {activeTab === 'counts' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Physical Stock Audits</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Count #</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Discrepancies</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Conducted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {counts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No cycle audit records for this facility.
                        </td>
                      </tr>
                    ) : (
                      counts.map((cnt) => (
                        <tr key={cnt.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{cnt.count_number}</td>
                          <td className="py-2.5 px-3 capitalize">{cnt.count_type.replace(/_/g, ' ')}</td>
                          <td className="py-2.5 px-3 text-amber-600 font-semibold">
                            {cnt.discrepancy_items_count || 0} variance items
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="capitalize px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">
                              {cnt.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{new Date(cnt.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: STAFF */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Warehouse Operations Roster</h3>
                <button
                  onClick={() => setIsStaffModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign Operator / Lead
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {staff.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No dedicated staff assigned to this facility.
                  </div>
                ) : (
                  staff.map((st) => (
                    <div key={st.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {st.user_name?.slice(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900">{st.user_name}</div>
                          <div className="text-2xs text-slate-500">{st.user_email}</div>
                        </div>
                      </div>
                      <span className="capitalize px-2 py-0.5 text-2xs font-semibold rounded bg-white border border-slate-200 text-slate-700">
                        {st.role_type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sub-Modals */}
        <CreateLocationModal
          isOpen={isAddLocationOpen}
          warehouseId={warehouse.id}
          parentLocationId={selectedParentLocationId}
          onClose={() => setIsAddLocationOpen(false)}
          onSuccess={() => {
            loadWarehouseData();
            onRefresh();
          }}
        />

        <WarehouseStaffModal
          isOpen={isStaffModalOpen}
          warehouseId={warehouse.id}
          onClose={() => setIsStaffModalOpen(false)}
          onSuccess={() => {
            loadWarehouseData();
            onRefresh();
          }}
        />
      </div>
    </div>
  );
};
