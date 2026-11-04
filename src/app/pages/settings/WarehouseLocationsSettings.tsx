import React, { useState, useEffect } from 'react';
import {
  Box,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Layers,
  MapPin,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { WarehouseLocation, Warehouse, EntityStatus } from '../../../types/database';

interface WarehouseLocationsSettingsProps {
  initialWarehouseId?: string | null;
}

export function WarehouseLocationsSettings({ initialWarehouseId }: WarehouseLocationsSettingsProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [locations, setLocations] = useState<Array<WarehouseLocation & { warehouse?: Warehouse | null }>>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(initialWarehouseId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    warehouse_id: '',
    code: '',
    name: '',
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [whList, locList] = await Promise.all([
        databaseService.getWarehouses(currentUser),
        databaseService.getWarehouseLocations(currentUser),
      ]);

      const enhanced = locList.map((loc) => ({
        ...loc,
        warehouse: whList.find((w) => w.id === loc.warehouse_id) || null,
      }));

      setWarehouses(whList);
      setLocations(enhanced);

      if (initialWarehouseId && selectedWhFilter === 'all') {
        setSelectedWhFilter(initialWarehouseId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load locations';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleOpenAdd = () => {
    const defaultWh = selectedWhFilter !== 'all' ? selectedWhFilter : warehouses[0]?.id || '';
    setFormData({
      warehouse_id: defaultWh,
      code: '',
      name: '',
      description: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (loc: WarehouseLocation) => {
    setSelectedLocation(loc);
    setFormData({
      warehouse_id: loc.warehouse_id,
      code: loc.code,
      name: loc.name,
      description: loc.description || '',
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
      await databaseService.createWarehouseLocation(currentUser, {
        warehouse_id: formData.warehouse_id,
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
      });

      showToast(`Location bin "${formData.code}" created.`, 'success');
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create location';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedLocation) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.updateWarehouseLocation(currentUser, selectedLocation.id, {
        warehouse_id: formData.warehouse_id,
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
      });

      showToast(`Location "${formData.code}" updated.`, 'success');
      setIsEditModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update location';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (loc: WarehouseLocation) => {
    if (!currentUser) return;
    const nextStatus: EntityStatus = loc.status === 'active' ? 'inactive' : 'active';
    try {
      await databaseService.toggleWarehouseLocationStatus(currentUser, loc.id, nextStatus);
      showToast(`Location status changed to ${nextStatus}.`, 'info');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !selectedLocation) return;
    setIsSubmitting(true);
    try {
      await databaseService.deleteWarehouseLocation(currentUser, selectedLocation.id);
      showToast(`Location "${selectedLocation.code}" removed.`, 'success');
      setIsDeleteModalOpen(false);
      setSelectedLocation(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete location';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.description && loc.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesWarehouse = selectedWhFilter === 'all' || loc.warehouse_id === selectedWhFilter;
    const matchesStatus = statusFilter === 'all' || loc.status === statusFilter;

    return matchesSearch && matchesWarehouse && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            Warehouse Storage Locations & Bins
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage granular aisle, rack, shelf, and bin locations within registered enterprise warehouses.
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

          <Can do="locations.create">
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Storage Bin / Location
            </Button>
          </Can>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search location code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={selectedWhFilter}
                onChange={(e) => setSelectedWhFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
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
                <option value="active">Active Bins Only</option>
                <option value="inactive">Inactive Bins</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 py-3.5 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Storage Bins & Locations ({filteredLocations.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Granular coordinate bins for putaway, cycle count, and warehouse operations.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Location Bin Code</th>
                  <th className="py-2.5 px-4">Designation / Name</th>
                  <th className="py-2.5 px-4">Facility Warehouse</th>
                  <th className="py-2.5 px-4">Description / Zone</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No warehouse storage bins found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {loc.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-slate-400" />
                          {loc.name}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {loc.warehouse ? (
                          <div className="text-slate-800">
                            <span className="font-medium">{loc.warehouse.name}</span>
                            <span className="text-[10px] text-slate-500 ml-1 font-mono">({loc.warehouse.code})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {loc.description || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${
                            loc.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {loc.status === 'active' ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span className="capitalize">{loc.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Can do="locations.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit location"
                              onClick={() => handleOpenEdit(loc)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title={loc.status === 'active' ? 'Deactivate bin' : 'Activate bin'}
                              onClick={() => handleToggleStatus(loc)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-amber-600"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </Can>

                          <Can do="locations.delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete location"
                              onClick={() => {
                                setSelectedLocation(loc);
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

      {/* ADD LOCATION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-600" />
                Add Warehouse Location Bin
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

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Warehouse *</label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bin / Rack Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A1-R02-B04"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400">Must be unique within this warehouse</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location Name / Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aisle 1, Rack 2, Level 4"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Storage Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Heavy-duty pallet storage for cold-press oils or bulk drums"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
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
                  {isSubmitting ? 'Creating...' : 'Create Location Bin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit Location Bin: {selectedLocation.code}
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

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Warehouse *</label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bin / Rack Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Storage Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
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
      {isDeleteModalOpen && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Confirm Location Bin Removal
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
                Are you sure you want to permanently delete location bin{' '}
                <strong className="text-slate-900">{selectedLocation.code}</strong> ({selectedLocation.name})?
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
                  {isSubmitting ? 'Deleting...' : 'Delete Location'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
