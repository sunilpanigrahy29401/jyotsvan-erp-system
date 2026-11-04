import React, { useState, useEffect } from 'react';
import {
  Building,
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
  Phone,
  Mail,
  Shield,
  Layers,
  Building2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { Branch, BranchType, EntityStatus } from '../../../types/database';

const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  headquarters: 'Corporate HQ',
  factory: 'Manufacturing Plant',
  depot: 'Distribution Depot',
  sales_office: 'Regional Sales Office',
  warehouse: 'Storage Facility',
};

const BRANCH_TYPE_BADGES: Record<BranchType, string> = {
  headquarters: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  factory: 'bg-amber-50 text-amber-700 border-amber-200',
  depot: 'bg-blue-50 text-blue-700 border-blue-200',
  sales_office: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warehouse: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function BranchesSettings() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    branch_type: 'factory' as BranchType,
    address: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    phone: '',
    email: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBranches = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await databaseService.getBranches(currentUser);
      setBranches(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load branches';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [currentUser]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: '',
      branch_type: 'factory',
      address: '',
      city: '',
      state: 'Maharashtra',
      country: 'India',
      postal_code: '',
      phone: '',
      email: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      branch_type: branch.branch_type,
      address: branch.address || '',
      city: branch.city,
      state: branch.state || '',
      country: branch.country || 'India',
      postal_code: branch.postal_code || '',
      phone: branch.phone || branch.phone_number || '',
      email: branch.email || '',
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
      await databaseService.createBranch(currentUser, {
        name: formData.name,
        code: formData.code,
        branch_type: formData.branch_type,
        address: formData.address || null,
        city: formData.city,
        state: formData.state || null,
        country: formData.country,
        postal_code: formData.postal_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
      });

      showToast(`Branch "${formData.name}" created successfully.`, 'success');
      setIsAddModalOpen(false);
      await loadBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create branch';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedBranch) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.updateBranch(currentUser, selectedBranch.id, {
        name: formData.name,
        code: formData.code,
        branch_type: formData.branch_type,
        address: formData.address || null,
        city: formData.city,
        state: formData.state || null,
        country: formData.country,
        postal_code: formData.postal_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
      });

      showToast(`Branch "${formData.name}" updated.`, 'success');
      setIsEditModalOpen(false);
      await loadBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update branch';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    if (!currentUser) return;
    const nextStatus: EntityStatus = branch.status === 'active' ? 'inactive' : 'active';
    try {
      await databaseService.toggleBranchStatus(currentUser, branch.id, nextStatus);
      showToast(`Branch status updated to ${nextStatus}.`, 'info');
      await loadBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !selectedBranch) return;
    setIsSubmitting(true);
    try {
      await databaseService.deleteBranch(currentUser, selectedBranch.id);
      showToast(`Branch "${selectedBranch.name}" removed.`, 'success');
      setIsDeleteModalOpen(false);
      setSelectedBranch(null);
      await loadBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete branch';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.state && b.state.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || b.branch_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Branch & Operating Facilities Directory
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure enterprise physical branches, manufacturing plants, corporate offices, and distribution depots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBranches}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Can do="branches.create">
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Facility / Branch
            </Button>
          </Can>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search branches by code, name, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Facility Types</option>
                <option value="headquarters">Corporate HQ</option>
                <option value="factory">Manufacturing Plant</option>
                <option value="depot">Distribution Depot</option>
                <option value="sales_office">Regional Sales Office</option>
                <option value="warehouse">Storage Facility</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Operational Statuses</option>
                <option value="active">Active Facilities Only</option>
                <option value="inactive">Inactive Facilities</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branches List Table */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 py-3.5 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Operating Facilities ({filteredBranches.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Each branch serves as a physical site container for warehouses, operators, and plant assets.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Facility / Branch Name</th>
                  <th className="py-2.5 px-4">Facility Type</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No branches or facilities found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {branch.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {branch.name}
                        </div>
                        {branch.address && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {branch.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`text-[10px] font-medium ${BRANCH_TYPE_BADGES[branch.branch_type]}`}>
                          {BRANCH_TYPE_LABELS[branch.branch_type]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-800">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{branch.city}{branch.state ? `, ${branch.state}` : ''}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pl-4">{branch.country}</div>
                      </td>
                      <td className="py-3 px-4 space-y-0.5 text-[11px]">
                        {(branch.phone || branch.phone_number) && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {branch.phone || branch.phone_number}
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {branch.email}
                          </div>
                        )}
                        {!branch.phone && !branch.phone_number && !branch.email && (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${
                            branch.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {branch.status === 'active' ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span className="capitalize">{branch.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Can do="branches.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit facility details"
                              onClick={() => handleOpenEdit(branch)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title={branch.status === 'active' ? 'Deactivate facility' : 'Activate facility'}
                              onClick={() => handleToggleStatus(branch)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-amber-600"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </Can>

                          <Can do="branches.delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete facility"
                              onClick={() => {
                                setSelectedBranch(branch);
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

      {/* ADD BRANCH MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                Register New Enterprise Facility / Branch
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
                  <label className="block font-medium text-slate-700 mb-1">Facility Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune Central Factory & Warehouse"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unique Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-PUN-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Facility Type *</label>
                <select
                  value={formData.branch_type}
                  onChange={(e) => setFormData({ ...formData, branch_type: e.target.value as BranchType })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="headquarters">Corporate Headquarters</option>
                  <option value="factory">Manufacturing Plant</option>
                  <option value="depot">Distribution Depot</option>
                  <option value="sales_office">Regional Sales Office</option>
                  <option value="warehouse">Storage Facility</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="Plot No. 42, MIDC Industrial Area"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Pune"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    placeholder="411018"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Facility Phone</label>
                  <input
                    type="text"
                    placeholder="+91 20 2740 1000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Facility Email</label>
                  <input
                    type="email"
                    placeholder="pune.plant@jyotsvan.com"
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
                  {isSubmitting ? 'Creating...' : 'Register Facility'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {isEditModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit Facility: {selectedBranch.name}
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
                  <label className="block font-medium text-slate-700 mb-1">Facility Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Facility Type *</label>
                <select
                  value={formData.branch_type}
                  onChange={(e) => setFormData({ ...formData, branch_type: e.target.value as BranchType })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="headquarters">Corporate Headquarters</option>
                  <option value="factory">Manufacturing Plant</option>
                  <option value="depot">Distribution Depot</option>
                  <option value="sales_office">Regional Sales Office</option>
                  <option value="warehouse">Storage Facility</option>
                </select>
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
                  <label className="block font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Facility Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Facility Email</label>
                  <input
                    type="email"
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

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Confirm Facility Removal
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
                Are you sure you want to permanently delete facility{' '}
                <strong className="text-slate-900">{selectedBranch.name}</strong> ({selectedBranch.code})?
              </p>
              <p className="text-[11px] text-slate-500">
                A branch cannot be removed if it has linked active warehouses or operators configured with it as their default location.
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
                  {isSubmitting ? 'Deleting...' : 'Delete Facility'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
