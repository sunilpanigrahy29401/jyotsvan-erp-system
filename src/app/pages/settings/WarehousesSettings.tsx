import React, { useState, useEffect } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  MapPin,
  Building,
  Phone,
  Mail,
  Box,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { Warehouse, WarehouseType, Branch, EntityStatus } from '../../../types/database';

const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  central_hub: 'Central Fulfillment Hub',
  regional_depot: 'Regional Depot',
  factory_storage: 'Factory Floor Storage',
  transit_hub: 'Transit Cross-Dock Hub',
  raw_material: 'Raw Material Store',
  finished_goods: 'Finished Goods Depot',
  packaging: 'Packaging Material Store',
  wip_production: 'WIP Production Holding',
  dispatch: 'Outbound Dispatch Dock',
  cnf: 'C&F Consignment Depot',
  quarantine: 'QA Quarantine Holding',
};

const WAREHOUSE_TYPE_COLORS: Record<WarehouseType, string> = {
  central_hub: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  regional_depot: 'bg-blue-50 text-blue-700 border-blue-200',
  factory_storage: 'bg-amber-50 text-amber-700 border-amber-200',
  transit_hub: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  raw_material: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  finished_goods: 'bg-violet-50 text-violet-700 border-violet-200',
  packaging: 'bg-orange-50 text-orange-700 border-orange-200',
  wip_production: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  dispatch: 'bg-slate-100 text-slate-800 border-slate-300',
  cnf: 'bg-pink-50 text-pink-700 border-pink-200',
  quarantine: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface WarehousesSettingsProps {
  onNavigateToLocations?: (warehouseId: string) => void;
}

export function WarehousesSettings({ onNavigateToLocations }: WarehousesSettingsProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [warehouses, setWarehouses] = useState<Array<Warehouse & { branch?: Branch | null; locationsCount: number }>>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    warehouse_type: 'finished_goods' as WarehouseType,
    branch_id: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    contact_person: '',
    phone: '',
    email: '',
    capacity_cubic_meters: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [whList, brList, locList] = await Promise.all([
        databaseService.getWarehouses(currentUser),
        databaseService.getBranches(currentUser),
        databaseService.getWarehouseLocations(currentUser),
      ]);

      const enhanced = whList.map((wh) => {
        const branch = brList.find((b) => b.id === wh.branch_id) || null;
        const locationsCount = locList.filter((l) => l.warehouse_id === wh.id).length;
        return {
          ...wh,
          branch,
          locationsCount,
        };
      });

      setWarehouses(enhanced);
      setBranches(brList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load warehouses';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: '',
      warehouse_type: 'finished_goods',
      branch_id: branches[0]?.id || '',
      address: '',
      city: '',
      state: 'Maharashtra',
      postal_code: '',
      contact_person: '',
      phone: '',
      email: '',
      capacity_cubic_meters: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    setFormData({
      name: wh.name,
      code: wh.code,
      warehouse_type: wh.warehouse_type,
      branch_id: wh.branch_id || '',
      address: wh.address || wh.address_line1 || '',
      city: wh.city || '',
      state: wh.state || '',
      postal_code: wh.postal_code || '',
      contact_person: wh.contact_person || '',
      phone: wh.phone || '',
      email: wh.email || '',
      capacity_cubic_meters: wh.capacity_cubic_meters ? String(wh.capacity_cubic_meters) : '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.createWarehouse(currentUser, {
        name: formData.name,
        code: formData.code,
        warehouse_type: formData.warehouse_type,
        branch_id: formData.branch_id || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postal_code || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        capacity_cubic_meters: formData.capacity_cubic_meters ? Number(formData.capacity_cubic_meters) : null,
      });

      showToast(`Warehouse "${formData.name}" created.`, 'success');
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create warehouse';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedWarehouse) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.updateWarehouse(currentUser, selectedWarehouse.id, {
        name: formData.name,
        code: formData.code,
        warehouse_type: formData.warehouse_type,
        branch_id: formData.branch_id || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postal_code || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        capacity_cubic_meters: formData.capacity_cubic_meters ? Number(formData.capacity_cubic_meters) : null,
      });

      showToast(`Warehouse "${formData.name}" updated.`, 'success');
      setIsEditModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update warehouse';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (wh: Warehouse) => {
    if (!currentUser) return;
    const nextStatus: EntityStatus = wh.status === 'active' ? 'inactive' : 'active';
    try {
      await databaseService.toggleWarehouseStatus(currentUser, wh.id, nextStatus);
      showToast(`Warehouse status changed to ${nextStatus}.`, 'info');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !selectedWarehouse) return;
    setIsSubmitting(true);
    try {
      await databaseService.deleteWarehouse(currentUser, selectedWarehouse.id);
      showToast(`Warehouse "${selectedWarehouse.name}" deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setSelectedWarehouse(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete warehouse';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch =
      wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wh.city && wh.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (wh.contact_person && wh.contact_person.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || wh.warehouse_type === typeFilter;
    const matchesBranch = branchFilter === 'all' || wh.branch_id === branchFilter;
    const matchesStatus = statusFilter === 'all' || wh.status === statusFilter;

    return matchesSearch && matchesType && matchesBranch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-indigo-600" />
            Warehouse Facilities & Storage Depots
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Physical warehouse master registry, plant stores, distribution centers, and sub-location partitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Can do="warehouses.create">
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Warehouse
            </Button>
          </Can>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search warehouse code, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Warehouse Types</option>
                <option value="central_hub">Central Fulfillment Hub</option>
                <option value="regional_depot">Regional Depot</option>
                <option value="factory_storage">Factory Floor Storage</option>
                <option value="transit_hub">Transit Cross-Dock Hub</option>
                <option value="raw_material">Raw Material Store</option>
                <option value="finished_goods">Finished Goods Depot</option>
                <option value="packaging">Packaging Store</option>
                <option value="wip_production">WIP Holding</option>
                <option value="dispatch">Dispatch Dock</option>
                <option value="cnf">C&F Depot</option>
                <option value="quarantine">QA Quarantine</option>
              </select>
            </div>

            <div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Operating Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouses Table */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 py-3.5 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Configured Warehouses ({filteredWarehouses.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Warehouses hold inventory bins, quarantine zones, and dock staging areas tied to operating legal branches.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Warehouse Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Assigned Branch</th>
                  <th className="py-2.5 px-4">Location Bins</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No warehouses found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {wh.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                          {wh.name}
                        </div>
                        {wh.city && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {wh.city}{wh.state ? `, ${wh.state}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${WAREHOUSE_TYPE_COLORS[wh.warehouse_type]}`}
                        >
                          {WAREHOUSE_TYPE_LABELS[wh.warehouse_type]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {wh.branch ? (
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{wh.branch.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                            <Box className="w-3 h-3 mr-1 text-slate-400" />
                            {wh.locationsCount} Bins
                          </Badge>
                          {onNavigateToLocations && (
                            <button
                              onClick={() => onNavigateToLocations(wh.id)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px] flex items-center gap-0.5"
                            >
                              Manage <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${
                            wh.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {wh.status === 'active' ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span className="capitalize">{wh.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Can do="warehouses.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit warehouse"
                              onClick={() => handleOpenEdit(wh)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title={wh.status === 'active' ? 'Deactivate warehouse' : 'Activate warehouse'}
                              onClick={() => handleToggleStatus(wh)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-amber-600"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </Can>

                          <Can do="warehouses.delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete warehouse"
                              onClick={() => {
                                setSelectedWarehouse(wh);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ADD WAREHOUSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-indigo-600" />
                Register New Warehouse Facility
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bhiwandi Central Finished Goods Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warehouse Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH-BHI-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warehouse Type *</label>
                  <select
                    value={formData.warehouse_type}
                    onChange={(e) => setFormData({ ...formData, warehouse_type: e.target.value as WarehouseType })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="central_hub">Central Fulfillment Hub</option>
                    <option value="regional_depot">Regional Depot</option>
                    <option value="factory_storage">Factory Floor Storage</option>
                    <option value="transit_hub">Transit Cross-Dock Hub</option>
                    <option value="raw_material">Raw Material Store</option>
                    <option value="finished_goods">Finished Goods Depot</option>
                    <option value="packaging">Packaging Material Store</option>
                    <option value="wip_production">WIP Production Holding</option>
                    <option value="dispatch">Outbound Dispatch Dock</option>
                    <option value="cnf">C&F Consignment Depot</option>
                    <option value="quarantine">QA Quarantine Holding</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Parent Operating Branch</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Standalone (No Branch Link) --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="Survey No. 88, Logistics Park"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Bhiwandi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Capacity (Cubic Meters)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={formData.capacity_cubic_meters}
                    onChange={(e) => setFormData({ ...formData, capacity_cubic_meters: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Subhash Deshmukh"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98200 11223"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="bhiwandi.hub@jyotsvan.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? 'Creating...' : 'Register Warehouse'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit Warehouse: {selectedWarehouse.name}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warehouse Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warehouse Type *</label>
                  <select
                    value={formData.warehouse_type}
                    onChange={(e) => setFormData({ ...formData, warehouse_type: e.target.value as WarehouseType })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="central_hub">Central Fulfillment Hub</option>
                    <option value="regional_depot">Regional Depot</option>
                    <option value="factory_storage">Factory Floor Storage</option>
                    <option value="transit_hub">Transit Cross-Dock Hub</option>
                    <option value="raw_material">Raw Material Store</option>
                    <option value="finished_goods">Finished Goods Depot</option>
                    <option value="packaging">Packaging Material Store</option>
                    <option value="wip_production">WIP Production Holding</option>
                    <option value="dispatch">Outbound Dispatch Dock</option>
                    <option value="cnf">C&F Consignment Depot</option>
                    <option value="quarantine">QA Quarantine Holding</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Parent Operating Branch</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Standalone (No Branch Link) --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Capacity (Cubic Meters)</label>
                  <input
                    type="number"
                    value={formData.capacity_cubic_meters}
                    onChange={(e) => setFormData({ ...formData, capacity_cubic_meters: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Confirm Warehouse Removal
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-600">
              <p>
                Are you sure you want to permanently delete warehouse{' '}
                <strong className="text-slate-900">{selectedWarehouse.name}</strong> ({selectedWarehouse.code})?
              </p>
              <p className="text-[11px] text-slate-500">
                A warehouse cannot be deleted if active sub-locations or bins exist inside it.
              </p>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Warehouse'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
