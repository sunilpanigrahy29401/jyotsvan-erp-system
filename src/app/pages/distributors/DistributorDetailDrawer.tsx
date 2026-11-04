import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Boxes,
  Truck,
  FileText,
  RotateCcw,
  Clock,
  Layers,
  Percent,
} from 'lucide-react';
import { distributorApi } from '../../../services/distributorApi.ts';
import type {
  DistributorMaster,
  DistributorContact,
  DistributorAddress,
  DistributorCFMapping,
  DistributorAssortment,
  DistributorStockItem,
  DistributorStatus,
} from '../../../types/distributors.ts';

interface DistributorDetailDrawerProps {
  distributor: DistributorMaster | null;
  onClose: () => void;
  onRefresh: () => void;
  onOpenCreateTransferForDistributor?: (distributorId: string) => void;
}

export const DistributorDetailDrawer: React.FC<DistributorDetailDrawerProps> = ({
  distributor,
  onClose,
  onRefresh,
  onOpenCreateTransferForDistributor,
}) => {
  if (!distributor) return null;

  const [activeTab, setActiveTab] = useState<
    'profile' | 'contacts' | 'addresses' | 'cfs' | 'assortment' | 'inventory' | 'transfers' | 'commercial'
  >('profile');

  const [contacts, setContacts] = useState<DistributorContact[]>([]);
  const [addresses, setAddresses] = useState<DistributorAddress[]>([]);
  const [mappedCFs, setMappedCFs] = useState<DistributorCFMapping[]>([]);
  const [assortment, setAssortment] = useState<DistributorAssortment[]>([]);
  const [stockItems, setStockItems] = useState<DistributorStockItem[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // New sub-resource dialog states
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', designation: 'Sales Head', phone: '', email: '' });

  const [showAddCF, setShowAddCF] = useState(false);
  const [newCFMap, setNewCFMap] = useState({ cf_id: 'cf-mumbai-01', is_preferred: true });

  useEffect(() => {
    if (distributor) {
      loadSubResources();
    }
  }, [distributor.id, activeTab]);

  const loadSubResources = async () => {
    setLoadingSub(true);
    try {
      if (activeTab === 'contacts') {
        const data = await distributorApi.getContacts(distributor.id);
        setContacts(data);
      } else if (activeTab === 'addresses') {
        const data = await distributorApi.getAddresses(distributor.id);
        setAddresses(data);
      } else if (activeTab === 'cfs') {
        const data = await distributorApi.getMappedCFs(distributor.id);
        setMappedCFs(data);
      } else if (activeTab === 'assortment') {
        const data = await distributorApi.getAssortment(distributor.id);
        setAssortment(data);
      } else if (activeTab === 'inventory') {
        const data = await distributorApi.getInventoryItems({ distributor_id: distributor.id });
        setStockItems(data.data);
      }
    } catch (err) {
      console.error('Failed to load sub resources:', err);
    } finally {
      setLoadingSub(false);
    }
  };

  const handleStatusChange = async (newStatus: DistributorStatus) => {
    if (!confirm(`Are you sure you want to change distributor status to '${newStatus}'?`)) return;
    setStatusUpdating(true);
    try {
      await distributorApi.updateDistributorStatus(distributor.id, newStatus);
      onRefresh();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await distributorApi.addContact(distributor.id, newContact);
      setShowAddContact(false);
      setNewContact({ name: '', designation: 'Sales Head', phone: '', email: '' });
      loadSubResources();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMapCF = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await distributorApi.mapCF(distributor.id, newCFMap);
      setShowAddCF(false);
      loadSubResources();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700">{distributor.distributor_code}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                    distributor.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : distributor.status === 'suspended'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {distributor.status}
                </span>
                <span className="text-xs text-slate-500 font-medium">{distributor.region} Region</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{distributor.display_name}</h2>
              <p className="text-xs text-slate-500">{distributor.legal_name} • GSTIN: {distributor.gstin || 'Unregistered'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreateTransferForDistributor && (
              <button
                onClick={() => onOpenCreateTransferForDistributor(distributor.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Stock
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 bg-white overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile & Terms', icon: Building2 },
            { id: 'contacts', label: 'Contacts', icon: Phone },
            { id: 'addresses', label: 'Addresses', icon: MapPin },
            { id: 'cfs', label: 'Mapped C&Fs', icon: Truck },
            { id: 'assortment', label: 'Assortment', icon: Layers },
            { id: 'inventory', label: 'Ground Stock', icon: Boxes },
            { id: 'commercial', label: 'Credit & Finance', icon: CreditCard },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 font-medium text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* 1. PROFILE & LEGAL */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Quick Status Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Lifecycle Status</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 capitalize">
                    Current Status: <span className="text-blue-600">{distributor.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {distributor.status !== 'active' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                    >
                      Activate Account
                    </button>
                  )}
                  {distributor.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange('suspended')}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium"
                    >
                      Suspend
                    </button>
                  )}
                  {distributor.status !== 'blocked' && (
                    <button
                      onClick={() => handleStatusChange('blocked')}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium"
                    >
                      Block
                    </button>
                  )}
                </div>
              </div>

              {/* Registration & Identification */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Entity Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Distributor Type</span>
                    <span className="font-semibold text-slate-800 capitalize">{distributor.distributor_type.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">GSTIN</span>
                    <span className="font-semibold text-slate-800">{distributor.gstin || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PAN</span>
                    <span className="font-semibold text-slate-800">{distributor.pan || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Primary Contact</span>
                    <span className="font-semibold text-slate-800">{distributor.primary_contact}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone</span>
                    <span className="font-semibold text-slate-800">{distributor.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email</span>
                    <span className="font-semibold text-slate-800">{distributor.email}</span>
                  </div>
                </div>
              </div>

              {/* Territory & Jurisdiction */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Territory & Jurisdiction</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Assigned Territory</span>
                    <span className="font-semibold text-slate-800">{distributor.territory_name || 'Standard Area'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Region</span>
                    <span className="font-semibold text-slate-800">{distributor.region}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">State & District</span>
                    <span className="font-semibold text-slate-800">{distributor.city}, {distributor.state} ({distributor.pincode})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Operational Address</span>
                    <span className="font-semibold text-slate-800">{distributor.operational_address || distributor.registered_address}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Authorized Personnel & Stakeholders</h3>
                  <p className="text-xs text-slate-500">Key contacts for orders, dispatches, accounts, and operations</p>
                </div>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </div>

              {showAddContact && (
                <form onSubmit={handleAddContact} className="p-4 bg-white rounded-xl border border-blue-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">New Contact Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={newContact.name}
                        onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Role / Designation</label>
                      <input
                        type="text"
                        required
                        value={newContact.designation}
                        onChange={e => setNewContact({ ...newContact, designation: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Phone</label>
                      <input
                        type="text"
                        required
                        value={newContact.phone}
                        onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddContact(false)}
                      className="px-3 py-1 border border-slate-200 text-slate-600 rounded text-xs"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold">
                      Save Contact
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contacts.map(c => (
                  <div key={c.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{c.name}</span>
                      {c.is_primary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                          Primary Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{c.designation}</p>
                    <div className="pt-2 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {c.phone}
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {c.email}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Operating Docks & Registered Locations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {addresses.map(a => (
                  <div key={a.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                        {a.address_type} Address
                      </span>
                      {a.is_primary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-800 font-medium">{a.address_line1}</p>
                    <p className="text-xs text-slate-500">{a.city}, {a.state} - {a.postal_code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. MAPPED C&F DEPOTS */}
          {activeTab === 'cfs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mapped C&F Depot Logistics Hubs</h3>
                  <p className="text-xs text-slate-500">Source C&F agencies supplying inventory to this distributor</p>
                </div>
                <button
                  onClick={() => setShowAddCF(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Map C&F
                </button>
              </div>

              {showAddCF && (
                <form onSubmit={handleMapCF} className="p-4 bg-white rounded-xl border border-blue-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">Map C&F Agency</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Select C&F Depot</label>
                      <select
                        value={newCFMap.cf_id}
                        onChange={e => setNewCFMap({ ...newCFMap, cf_id: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-md"
                      >
                        <option value="cf-mumbai-01">CF-MUM-01 — Apex Logistics C&F (Mumbai)</option>
                        <option value="cf-delhi-01">CF-DEL-01 — North Capital C&F (Delhi)</option>
                        <option value="cf-bengaluru-01">CF-BLR-01 — Deccan Supply Chain C&F (Bengaluru)</option>
                        <option value="cf-odisha-01">CF-OD-01 — Utkal Forwarding Agency (Odisha)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="chk-pref"
                        checked={newCFMap.is_preferred}
                        onChange={e => setNewCFMap({ ...newCFMap, is_preferred: e.target.checked })}
                      />
                      <label htmlFor="chk-pref" className="text-xs text-slate-700 font-medium">Set as Preferred Depot</label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCF(false)}
                      className="px-3 py-1 border border-slate-200 text-slate-600 rounded text-xs"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold">
                      Save Mapping
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {mappedCFs.map(cf => (
                  <div key={cf.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{cf.cf_code}</span>
                          <span className="text-sm font-bold text-slate-900">{cf.cf_name}</span>
                          {cf.is_preferred && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Preferred Source
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{cf.cf_city}, {cf.cf_state} • Priority Rank: #{cf.priority_rank}</p>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (confirm('Unmap this C&F depot?')) {
                          await distributorApi.unmapCF(distributor.id, cf.cf_id);
                          loadSubResources();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Unmap C&F"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. ASSORTMENT */}
          {activeTab === 'assortment' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Authorized Product Assortment</h3>
                  <p className="text-xs text-slate-500">Commercial SKUs authorized for sale, with MOQs and pack requirements</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU Code & Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Standard MRP</th>
                      <th className="py-2.5 px-3">MOQ</th>
                      <th className="py-2.5 px-3">Target Stock</th>
                      <th className="py-2.5 px-3">Pack Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assortment.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          <span className="font-mono text-blue-600 font-bold block">{item.sku_code}</span>
                          {item.sku_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{item.category || 'General'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{formatCurrency(item.standard_mrp || 0)}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{item.minimum_order_quantity} Units</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{item.target_stock} Units</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.preferred_pack_size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. GROUND INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Channel Stock on Ground</h3>
                  <p className="text-xs text-slate-500">Live batch-traceable inventory holding at distributor location</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Holding Value:</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(distributor.stock_valuation || 0)}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU & Batch</th>
                      <th className="py-2.5 px-3">Available</th>
                      <th className="py-2.5 px-3">On Hand</th>
                      <th className="py-2.5 px-3">Unit Cost</th>
                      <th className="py-2.5 px-3">Valuation</th>
                      <th className="py-2.5 px-3">Source C&F</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No stock currently reported on ground.
                        </td>
                      </tr>
                    ) : (
                      stockItems.map(stk => (
                        <tr key={stk.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-blue-600 font-bold block">{stk.sku_code}</span>
                            <span className="font-semibold text-slate-800 block">{stk.sku_name}</span>
                            <span className="text-[11px] text-slate-500">Batch: {stk.batch_number || 'Standard'}</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-700">{stk.quantity_available}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{stk.quantity_on_hand}</td>
                          <td className="py-2.5 px-3 text-slate-600">{formatCurrency(stk.unit_cost)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{formatCurrency(stk.estimated_valuation)}</td>
                          <td className="py-2.5 px-3 text-slate-500">{stk.source_cf_name || 'Primary C&F'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. COMMERCIAL & CREDIT */}
          {activeTab === 'commercial' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Credit Terms & Exposure</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500 block">Total Credit Limit</span>
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(distributor.credit_limit)}</span>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <span className="text-xs text-purple-700 block">Current Outstanding</span>
                    <span className="text-lg font-bold text-purple-900">{formatCurrency(distributor.current_outstanding_amount || 0)}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <span className="text-xs text-emerald-700 block">Available Credit</span>
                    <span className="text-lg font-bold text-emerald-900">{formatCurrency(distributor.available_credit || distributor.credit_limit)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Payment Terms</span>
                    <span className="font-semibold text-slate-800">{distributor.payment_terms_days} Days Net</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Agreed Discount</span>
                    <span className="font-semibold text-slate-800">{distributor.agreed_discount_percent}% on standard distributor price</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Price List Type</span>
                    <span className="font-semibold text-slate-800 capitalize">{distributor.price_list_type?.replace('_', ' ') || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Credit Hold Status</span>
                    <span className={`font-semibold ${distributor.credit_hold ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {distributor.credit_hold ? 'On Hold' : 'Clear / Good Standing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
