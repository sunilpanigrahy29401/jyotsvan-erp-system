import React, { useState, useEffect } from 'react';
import {
  Scale,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Lock,
  Tag,
  Hash,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { Unit, UnitCategory, EntityStatus } from '../../../types/database';

const CATEGORY_LABELS: Record<UnitCategory, string> = {
  count: 'Count & Discrete Pieces',
  weight: 'Mass & Weight',
  volume: 'Liquid & Volume',
  length: 'Distance & Length',
  packaging: 'Packaging Multiples',
  area: 'Surface Area',
  other: 'Other Custom Unit',
};

const CATEGORY_COLORS: Record<UnitCategory, string> = {
  count: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  weight: 'bg-amber-50 text-amber-700 border-amber-200',
  volume: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  length: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  packaging: 'bg-purple-50 text-purple-700 border-purple-200',
  area: 'bg-blue-50 text-blue-700 border-blue-200',
  other: 'bg-slate-100 text-slate-700 border-slate-300',
};

export function UnitsSettings() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    category: 'count' as UnitCategory,
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUnits = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await databaseService.getUnits(currentUser);
      setUnits(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load units of measurement';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, [currentUser]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      short_code: '',
      category: 'count',
      description: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      name: unit.name,
      short_code: unit.short_code,
      category: unit.category,
      description: unit.description || '',
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
      await databaseService.createUnit(currentUser, {
        name: formData.name,
        short_code: formData.short_code.trim(),
        category: formData.category,
        description: formData.description || null,
      });

      showToast(`Unit "${formData.name}" (${formData.short_code}) created.`, 'success');
      setIsAddModalOpen(false);
      await loadUnits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create unit';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUnit) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.updateUnit(currentUser, selectedUnit.id, {
        name: formData.name,
        short_code: formData.short_code.trim(),
        category: formData.category,
        description: formData.description || null,
      });

      showToast(`Unit "${formData.name}" updated.`, 'success');
      setIsEditModalOpen(false);
      await loadUnits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update unit';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (unit: Unit) => {
    if (!currentUser) return;
    const nextStatus: EntityStatus = unit.status === 'active' ? 'inactive' : 'active';
    try {
      await databaseService.toggleUnitStatus(currentUser, unit.id, nextStatus);
      showToast(`Unit status changed to ${nextStatus}.`, 'info');
      await loadUnits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !selectedUnit) return;
    if (selectedUnit.is_system) {
      showToast('System standardized units cannot be deleted', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await databaseService.deleteUnit(currentUser, selectedUnit.id);
      showToast(`Unit "${selectedUnit.name}" deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setSelectedUnit(null);
      await loadUnits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete unit';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.short_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.description && u.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || u.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            Units of Measurement (UOM) Registry
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Standardized physical measurement units, discrete counts, mass, and packaging ratios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUnits}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Can do="units.create">
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Unit of Measure
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
                placeholder="Search unit by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Measurement Categories</option>
                <option value="count">Count & Discrete Pieces</option>
                <option value="weight">Mass & Weight</option>
                <option value="volume">Liquid & Volume</option>
                <option value="length">Distance & Length</option>
                <option value="packaging">Packaging Multiples</option>
                <option value="area">Surface Area</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Units Only</option>
                <option value="inactive">Inactive Units</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 py-3.5 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Measurement Units ({filteredUnits.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              System standardized units anchor bill of materials (BOM), production batches, and purchase receipts.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Symbol / Code</th>
                  <th className="py-2.5 px-4">Unit Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Classification</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No units of measurement found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {u.short_code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {u.name}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`text-[10px] font-medium ${CATEGORY_COLORS[u.category]}`}>
                          {CATEGORY_LABELS[u.category]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {u.is_system ? (
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-300 gap-1">
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            Standard System
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Custom Org Unit
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {u.description || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span className="capitalize">{u.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Can do="units.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit unit"
                              onClick={() => handleOpenEdit(u)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title={u.status === 'active' ? 'Deactivate unit' : 'Activate unit'}
                              onClick={() => handleToggleStatus(u)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-amber-600"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </Can>

                          <Can do="units.delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={u.is_system ? 'System units cannot be deleted' : 'Delete unit'}
                              disabled={u.is_system}
                              onClick={() => {
                                setSelectedUnit(u);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-rose-600 disabled:opacity-30"
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

      {/* ADD UNIT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                Register New Unit of Measurement
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
                  <label className="block font-medium text-slate-700 mb-1">Unit Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metric Tonne"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Short Code / Symbol *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MT"
                    value={formData.short_code}
                    onChange={(e) => setFormData({ ...formData, short_code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Measurement Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as UnitCategory })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="count">Count & Discrete Pieces (pcs, box, pack)</option>
                  <option value="weight">Mass & Weight (kg, g, mg, MT)</option>
                  <option value="volume">Liquid & Volume (L, mL, drum)</option>
                  <option value="length">Distance & Length (m, cm, mm)</option>
                  <option value="packaging">Packaging Multiples (carton, pallet)</option>
                  <option value="area">Surface Area (sq m, sq ft)</option>
                  <option value="other">Other Custom Standard</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 1 Metric Tonne = 1,000 Kilograms used for bulk raw materials"
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
                  {isSubmitting ? 'Creating...' : 'Register Unit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit Unit: {selectedUnit.name}
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
                  <label className="block font-medium text-slate-700 mb-1">Unit Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Short Code / Symbol *</label>
                  <input
                    type="text"
                    required
                    value={formData.short_code}
                    onChange={(e) => setFormData({ ...formData, short_code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Measurement Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as UnitCategory })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="count">Count & Discrete Pieces</option>
                  <option value="weight">Mass & Weight</option>
                  <option value="volume">Liquid & Volume</option>
                  <option value="length">Distance & Length</option>
                  <option value="packaging">Packaging Multiples</option>
                  <option value="area">Surface Area</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Notes</label>
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
      {isDeleteModalOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Confirm Unit Removal
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
                Are you sure you want to delete custom unit{' '}
                <strong className="text-slate-900">{selectedUnit.name}</strong> ({selectedUnit.short_code})?
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
                  {isSubmitting ? 'Deleting...' : 'Delete Unit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
