import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Package,
  ArrowRightLeft,
  Send,
  AlertTriangle,
  FileText,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFMaster, CFTransfer, CFDispatch, CFStockItem, CFStatus } from '../../../types/cfs';

interface CFDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cf: CFMaster | null;
  onStatusUpdated?: (updated: CFMaster) => void;
  onNewTransfer?: (cfId: string) => void;
  onNewDispatch?: (cfId: string) => void;
}

export const CFDetailDrawer: React.FC<CFDetailDrawerProps> = ({
  isOpen,
  onClose,
  cf,
  onStatusUpdated,
  onNewTransfer,
  onNewDispatch,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'warehouses' | 'inventory' | 'transfers' | 'dispatches'>('overview');
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<CFStockItem[]>([]);
  const [transfers, setTransfers] = useState<CFTransfer[]>([]);
  const [dispatches, setDispatches] = useState<CFDispatch[]>([]);
  const [availableWarehouses, setAvailableWarehouses] = useState<any[]>([]);

  // Assign warehouse inline state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWhToAssign, setSelectedWhToAssign] = useState('');
  const [isPrimaryWh, setIsPrimaryWh] = useState(false);
  const [agreementRef, setAgreementRef] = useState('');

  useEffect(() => {
    if (!cf || !isOpen) return;

    async function loadCFData() {
      setLoading(true);
      try {
        const [invRes, trRes, dispRes, whRes] = await Promise.all([
          cfApi.getDepotInventory({ cfId: cf?.id }),
          cfApi.listTransfers({ cfId: cf?.id, limit: 20 }),
          cfApi.listDispatches({ cfId: cf?.id, limit: 20 }),
          fetch('/api/warehouses', { headers: { 'x-organization-id': 'org-jyotsvan-corp' } }).then(r => r.json()).catch(() => ({ data: [] })),
        ]);
        setInventory(invRes || []);
        setTransfers(trRes.data || []);
        setDispatches(dispRes.data || []);
        setAvailableWarehouses(whRes.data || whRes.rows || []);
      } catch (e) {
        console.error('Error fetching CF drawer details:', e);
      } finally {
        setLoading(false);
      }
    }

    loadCFData();
  }, [cf, isOpen]);

  if (!isOpen || !cf) return null;

  const handleStatusChange = async (newStatus: CFStatus) => {
    try {
      const updated = await cfApi.updateCFStatus(cf.id, newStatus, `Manual status change to ${newStatus}`);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (e: any) {
      alert(`Failed to update status: ${e.message}`);
    }
  };

  const handleAssignWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWhToAssign) return;
    try {
      await cfApi.assignWarehouse(cf.id, selectedWhToAssign, isPrimaryWh, agreementRef);
      setShowAssignModal(false);
      // Reload drawer
      const updatedCF = await cfApi.getCFById(cf.id);
      if (onStatusUpdated) onStatusUpdated(updatedCF);
    } catch (e: any) {
      alert(`Failed to assign warehouse: ${e.message}`);
    }
  };

  const handleUnassignWarehouse = async (whId: string) => {
    if (!confirm('Are you sure you want to unassign this warehouse from this C&F?')) return;
    try {
      await cfApi.unassignWarehouse(cf.id, whId);
      const updatedCF = await cfApi.getCFById(cf.id);
      if (onStatusUpdated) onStatusUpdated(updatedCF);
    } catch (e: any) {
      alert(`Failed to unassign warehouse: ${e.message}`);
    }
  };

  const totalStockUnits = inventory.reduce((acc, i) => acc + i.total_quantity, 0);
  const totalStockValuation = inventory.reduce((acc, i) => acc + (i.estimated_inventory_value || (i.total_quantity * i.unit_cost)), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-xl mt-0.5">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-neutral-900">{cf.legal_name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-neutral-200 text-neutral-800">
                  {cf.cf_code}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    cf.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : cf.status === 'suspended'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {cf.status}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 flex items-center space-x-2">
                <span>{cf.display_name || cf.legal_name}</span>
                <span>&bull;</span>
                <span>Type: <strong className="capitalize text-neutral-700">{cf.cf_type?.replace('_', ' ')}</strong></span>
                <span>&bull;</span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{cf.city}, {cf.state}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Strip */}
        <div className="px-6 py-2.5 bg-white border-b border-neutral-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3 text-neutral-600">
            <span>GSTIN: <strong className="font-mono text-neutral-900">{cf.gstin || 'N/A'}</strong></span>
            <span>&bull;</span>
            <span>Security Deposit: <strong className="text-neutral-900">₹{(cf.security_deposit_amount || 0).toLocaleString('en-IN')}</strong></span>
            <span>&bull;</span>
            <span>Commission: <strong className="text-indigo-600">{cf.commission_rate || 0}%</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            {onNewTransfer && (
              <button
                onClick={() => {
                  onClose();
                  onNewTransfer(cf.id);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-medium transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Inward Transfer</span>
              </button>
            )}

            {onNewDispatch && (
              <button
                onClick={() => {
                  onClose();
                  onNewDispatch(cf.id);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md font-medium transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Outward Dispatch</span>
              </button>
            )}

            <select
              value={cf.status}
              onChange={(e) => handleStatusChange(e.target.value as CFStatus)}
              className="px-2 py-1 border border-neutral-300 rounded-md text-xs bg-white text-neutral-700 font-medium outline-none"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
              <option value="under_audit">Under Audit</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 px-6 bg-neutral-50/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Overview & Custody</span>
          </button>

          <button
            onClick={() => setActiveTab('warehouses')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'warehouses'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <WarehouseIcon className="w-3.5 h-3.5" />
            <span>Physical Warehouses ({cf.warehouses?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'inventory'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Depot Stock ({inventory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'transfers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Inward Transfers ({transfers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dispatches')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'dispatches'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Outbound Dispatches ({dispatches.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-neutral-500">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading C&F Intelligence...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Financial & Custody Parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                        <span>Security Deposit</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-xl font-bold text-neutral-900">
                        ₹{(cf.security_deposit_amount || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">Bank Guarantee / Fixed Deposit</p>
                    </div>

                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                        <span>Custody Stock Valuation</span>
                        <Package className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="text-xl font-bold text-indigo-700">
                        ₹{totalStockValuation.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">{totalStockUnits} units in custody</p>
                    </div>

                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                        <span>C&F Commission</span>
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xl font-bold text-neutral-900">
                        {cf.commission_rate || 0}%
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">On primary net dispatch value</p>
                    </div>
                  </div>

                  {/* Operational Contacts & Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Key Contact & Operations</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500">Contact Person:</span>
                          <strong className="text-neutral-900">{cf.contact_person || 'N/A'}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500">Direct Phone:</span>
                          <strong className="text-neutral-900">{cf.phone || 'N/A'}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500">Official Email:</span>
                          <strong className="text-neutral-900">{cf.email || 'N/A'}</strong>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-neutral-500">Region:</span>
                          <strong className="text-neutral-900">{cf.region || 'National'}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Depot Location & Territory Scope</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="py-1 border-b border-neutral-100">
                          <span className="text-neutral-500 block mb-0.5">Physical Address:</span>
                          <strong className="text-neutral-900 block">{cf.address || 'Address not registered'}</strong>
                          <span className="text-neutral-500">{cf.city}, {cf.state} - {cf.pincode}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-neutral-500">Operating Territory:</span>
                          <strong className="text-neutral-900">{cf.territory || 'Unrestricted'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WAREHOUSES */}
              {activeTab === 'warehouses' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Physical Warehouses Managed by this C&F
                    </h3>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link Existing Warehouse</span>
                    </button>
                  </div>

                  {showAssignModal && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                      <h4 className="text-xs font-semibold text-indigo-900">Assign Warehouse to C&F</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <select
                            value={selectedWhToAssign}
                            onChange={(e) => setSelectedWhToAssign(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                          >
                            <option value="">-- Select Warehouse --</option>
                            {availableWarehouses.map(w => (
                              <option key={w.id} value={w.id}>
                                {w.name} ({w.code} - {w.city})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Agreement Ref No."
                            value={agreementRef}
                            onChange={(e) => setAgreementRef(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPrimaryWh}
                            onChange={(e) => setIsPrimaryWh(e.target.checked)}
                            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Set as Primary Operating Warehouse</span>
                        </label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowAssignModal(false)}
                            className="px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAssignWarehouse}
                            className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                          >
                            Save Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cf.warehouses && cf.warehouses.length > 0 ? (
                      cf.warehouses.map(wh => (
                        <div key={wh.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <WarehouseIcon className="w-4 h-4 text-indigo-600" />
                              <strong className="text-sm text-neutral-900">{wh.warehouse_name || 'Depot'}</strong>
                              <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-200 rounded text-neutral-700">
                                {wh.warehouse_code || 'WH'}
                              </span>
                            </div>
                            {wh.is_primary_depot && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">{wh.warehouse_city || ''}, {wh.warehouse_state || ''}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-xs">
                            <span className="text-neutral-500">Ref: {wh.custody_agreement_ref || 'Standard SLA'}</span>
                            <button
                              onClick={() => handleUnassignWarehouse(wh.warehouse_id)}
                              className="text-[11px] text-red-600 hover:text-red-800 font-medium"
                            >
                              Unlink
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-xs text-neutral-500 border border-dashed border-neutral-300 rounded-xl">
                        No physical warehouses mapped to this C&F agency yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Live Stock Balances at this C&F ({inventory.length} SKUs / Batches)
                    </h3>
                    <div className="text-xs text-neutral-500">
                      Total Valuation: <strong className="text-neutral-900 font-semibold">₹{totalStockValuation.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                        <tr>
                          <th className="py-2.5 px-3">Product SKU</th>
                          <th className="py-2.5 px-3">Batch Lot</th>
                          <th className="py-2.5 px-3">Warehouse / Bin</th>
                          <th className="py-2.5 px-3 text-right">On Hand</th>
                          <th className="py-2.5 px-3 text-right">Allocated</th>
                          <th className="py-2.5 px-3 text-right">Available</th>
                          <th className="py-2.5 px-3 text-right">Valuation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 bg-white">
                        {inventory.length > 0 ? (
                          inventory.map((item, idx) => (
                            <tr key={`${item.sku_id}-${item.warehouse_id}-${item.batch_id || idx}`} className="hover:bg-neutral-50/60">
                              <td className="py-2.5 px-3 font-semibold text-neutral-900">
                                {item.sku_name}
                                <span className="block text-[10px] text-neutral-400 font-mono">{item.sku_code}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-neutral-700">
                                {item.batch_number || 'Default'}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-600">
                                {item.warehouse_name} ({item.location_code || 'Main'})
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-neutral-900">
                                {item.total_quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-700">
                                {item.reserved_quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                {item.available_quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-neutral-800">
                                ₹{(item.estimated_inventory_value || (item.total_quantity * item.unit_cost)).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-neutral-400">
                              No stock balances currently recorded at this C&F depot.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: TRANSFERS */}
              {activeTab === 'transfers' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Recent Plant-to-C&F Transfers</h3>
                  <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                        <tr>
                          <th className="py-2.5 px-3">Transfer #</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Source Plant</th>
                          <th className="py-2.5 px-3">Carrier / Vehicle</th>
                          <th className="py-2.5 px-3 text-right">Items / Units</th>
                          <th className="py-2.5 px-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 bg-white">
                        {transfers.length > 0 ? (
                          transfers.map(tr => (
                            <tr key={tr.id} className="hover:bg-neutral-50/60">
                              <td className="py-2.5 px-3 font-bold text-indigo-700 font-mono">
                                {tr.transfer_number}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-100 text-blue-800">
                                  {tr.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-neutral-700">
                                {tr.source_warehouse_name || 'Plant Warehouse'}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-600">
                                {tr.shipping_carrier || 'Direct'} ({tr.vehicle_number || 'N/A'})
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-neutral-900">
                                {tr.items?.length || 0} lines &bull; {tr.total_received_quantity || tr.total_dispatched_quantity || tr.total_requested_quantity} units
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500">
                                {new Date(tr.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-neutral-400">
                              No transfer history recorded for this C&F.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: DISPATCHES */}
              {activeTab === 'dispatches' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Recent Outbound Dispatches</h3>
                  <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                        <tr>
                          <th className="py-2.5 px-3">Dispatch #</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Destination Entity</th>
                          <th className="py-2.5 px-3">Vehicle</th>
                          <th className="py-2.5 px-3 text-right">Units</th>
                          <th className="py-2.5 px-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 bg-white">
                        {dispatches.length > 0 ? (
                          dispatches.map(dp => (
                            <tr key={dp.id} className="hover:bg-neutral-50/60">
                              <td className="py-2.5 px-3 font-bold text-amber-700 font-mono">
                                {dp.dispatch_number}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-100 text-amber-800">
                                  {dp.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-neutral-900">
                                {dp.destination_name}
                                <span className="block text-[10px] text-neutral-400 capitalize">{dp.destination_type}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-neutral-600">
                                {dp.vehicle_number || 'Local Transport'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-neutral-900">
                                {dp.total_requested_quantity || dp.total_dispatched_quantity || 0}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500">
                                {new Date(dp.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-neutral-400">
                              No outbound dispatches recorded from this C&F yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
