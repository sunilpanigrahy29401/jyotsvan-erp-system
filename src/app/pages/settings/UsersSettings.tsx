import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  Eye,
  Key,
  Building2,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { User, Role, Branch } from '../../../types/database';

export function UsersSettings() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [usersList, setUsersList] = useState<Array<User & { roles: Role[]; permissionsCount: number }>>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(User & { roles: Role[]; permissionsCount: number }) | null>(null);
  const [viewUserDetails, setViewUserDetails] = useState<{ user: User; roles: Role[]; permissions: string[] } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    roleId: '',
    branchId: '',
    isSuperAdmin: false,
    status: 'active' as 'active' | 'inactive',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [users, roles, branches] = await Promise.all([
        databaseService.getUsers(currentUser),
        databaseService.getRoles(currentUser),
        databaseService.getBranches(currentUser),
      ]);
      setUsersList(users);
      setRolesList(roles);
      setBranchesList(branches);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load users';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      roleId: rolesList[0]?.id || '',
      branchId: branchesList[0]?.id || '',
      isSuperAdmin: false,
      status: 'active',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User & { roles: Role[]; permissionsCount: number }) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number || '',
      roleId: user.roles[0]?.id || rolesList[0]?.id || '',
      branchId: user.default_branch_id || branchesList[0]?.id || '',
      isSuperAdmin: user.is_super_admin,
      status: user.status as 'active' | 'inactive',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open View Details Modal
  const handleOpenView = async (user: User & { roles: Role[]; permissionsCount: number }) => {
    if (!currentUser) return;
    try {
      const details = await databaseService.getUserById(currentUser, user.id);
      if (details) {
        setViewUserDetails({
          user: details,
          roles: details.roles,
          permissions: details.permissions,
        });
        setIsViewModalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve user details';
      showToast(msg, 'error');
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.createUser(currentUser, {
        email: formData.email,
        full_name: formData.fullName,
        phone_number: formData.phoneNumber || undefined,
        role_id: formData.roleId,
        default_branch_id: formData.branchId || undefined,
        is_super_admin: formData.isSuperAdmin,
      });

      showToast(`User ${formData.fullName} created successfully`, 'success');
      setIsAddModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating user';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update User Handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUser) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.updateUser(currentUser, selectedUser.id, {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber || null,
        role_id: formData.roleId,
        default_branch_id: formData.branchId || null,
        status: formData.status,
        is_super_admin: formData.isSuperAdmin,
      });

      showToast(`User ${formData.fullName} updated successfully`, 'success');
      setIsEditModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating user';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle User Active Status
  const handleToggleStatus = async (user: User) => {
    if (!currentUser) return;
    try {
      const updated = await databaseService.toggleUserStatus(currentUser, user.id);
      showToast(
        `User ${updated.full_name} is now ${updated.status === 'active' ? 'Activated' : 'Deactivated'}`,
        'success'
      );
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle user status';
      showToast(msg, 'error');
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (user: User) => {
    if (!currentUser) return;
    if (!window.confirm(`Are you sure you want to permanently delete user ${user.full_name} (${user.email})?`)) {
      return;
    }

    try {
      await databaseService.deleteUser(currentUser, user.id);
      showToast(`User ${user.full_name} deleted`, 'info');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      showToast(msg, 'error');
    }
  };

  // Filtered list
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.roles.some((r) => r.id === roleFilter || r.slug === roleFilter);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header with Title & Add User Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Users & Identity Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage enterprise personnel accounts, departmental roles, and access credential states.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Can do="users.create">
            <Button size="sm" onClick={handleOpenAdd} className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <UserPlus className="w-3.5 h-3.5" />
              Add Enterprise User
            </Button>
          </Can>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-hidden"
            >
              <option value="all">All Roles</option>
              {rolesList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role & Authority</th>
                <th className="py-3 px-4">Facility / Branch</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Capabilities</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading user registry...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const branch = branchesList.find((b) => b.id === u.default_branch_id);
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.full_name}
                              {isCurrent && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                              {u.is_super_admin && (
                                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-200 py-0">
                                  Super Admin
                                </Badge>
                              )}
                            </div>
                            <span className="text-slate-500 text-[11px] font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r.id} variant="secondary" className="text-[10px] font-medium bg-slate-100 text-slate-800">
                              {r.name}
                            </Badge>
                          ))}
                          {u.roles.length === 0 && (
                            <span className="text-slate-400 text-[11px] italic">No assigned role</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 text-xs flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {branch?.name || 'Headquarters'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {u.is_super_admin ? 'Full (*:*)' : `${u.permissionsCount} tokens`}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenView(u)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                            title="View Full Permissions"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Edit User */}
                          <Can do="users.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(u)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                              title="Edit User Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </Can>

                          {/* Toggle Active Status */}
                          <Can do="users.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(u)}
                              disabled={isCurrent && u.status === 'active'}
                              className={`h-7 w-7 p-0 ${
                                u.status === 'active'
                                  ? 'text-emerald-600 hover:text-amber-600'
                                  : 'text-slate-400 hover:text-emerald-600'
                              }`}
                              title={
                                isCurrent
                                  ? 'Cannot deactivate own account'
                                  : u.status === 'active'
                                  ? 'Deactivate User'
                                  : 'Activate User'
                              }
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </Can>

                          {/* Delete User */}
                          <Can do="users.delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(u)}
                              disabled={isCurrent || (u.is_super_admin && usersList.filter(x => x.is_super_admin).length <= 1)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                              title={isCurrent ? 'Cannot delete self' : 'Delete User'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Provision New Enterprise User
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Legal Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Katherine Pierce"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. katherine@jyotsvan.enterprise"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Telephone Contact (Optional)</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Assigned Security Role *</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Operating Facility *</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentUser?.is_super_admin && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isSuperAdminCheckbox"
                    checked={formData.isSuperAdmin}
                    onChange={(e) => setFormData({ ...formData, isSuperAdmin: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="isSuperAdminCheckbox" className="text-slate-700 cursor-pointer font-medium">
                    Designate as Super Administrator (Unrestricted platform authority)
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isSubmitting ? 'Provisioning...' : 'Provision Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit User Identity: {selectedUser.full_name}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Telephone Contact</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Assigned Security Role</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Operating Facility</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Account State</label>
                <select
                  value={formData.status}
                  disabled={currentUser?.id === selectedUser.id}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="active">Active (Access Enabled)</option>
                  <option value="inactive">Inactive (Suspended)</option>
                </select>
                {currentUser?.id === selectedUser.id && (
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    You cannot change the status of your active session.
                  </span>
                )}
              </div>

              {currentUser?.is_super_admin && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editSuperAdminCheckbox"
                    checked={formData.isSuperAdmin}
                    onChange={(e) => setFormData({ ...formData, isSuperAdmin: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="editSuperAdminCheckbox" className="text-slate-700 cursor-pointer font-medium">
                    Super Administrator Privileges
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {isViewModalOpen && viewUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  User Profile & Security Tokens
                </h3>
                <span className="text-xs text-slate-500">{viewUserDetails.user.email}</span>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/70">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">User ID</span>
                <span className="font-mono text-slate-800 text-[11px]">{viewUserDetails.user.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Account State</span>
                <span className="font-semibold text-slate-800 capitalize">{viewUserDetails.user.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Roles</span>
                <span className="font-semibold text-slate-800">
                  {viewUserDetails.roles.map((r) => r.name).join(', ') || 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Super Admin Status</span>
                <span className="font-semibold text-slate-800">
                  {viewUserDetails.user.is_super_admin ? 'Active (Bypasses All)' : 'Standard RBAC'}
                </span>
              </div>
            </div>

            {/* Granted Capability Tokens */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  Granted Capability Tokens ({viewUserDetails.permissions.length})
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto p-2 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] space-y-1 scrollbar-thin">
                {viewUserDetails.user.is_super_admin ? (
                  <div className="text-amber-300 font-semibold">
                    *:* (Wildcard - Unrestricted enterprise authority across all domains)
                  </div>
                ) : viewUserDetails.permissions.length === 0 ? (
                  <div className="text-slate-500 italic">No explicit permissions granted</div>
                ) : (
                  viewUserDetails.permissions.map((perm) => (
                    <div key={perm} className="flex items-center gap-1.5">
                      <span className="text-slate-500 select-none">&gt;</span>
                      <span>{perm}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
