import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldPlus,
  Search,
  CheckCircle2,
  Lock,
  Edit2,
  Trash2,
  Eye,
  Key,
  Users,
  RefreshCw,
  Sliders,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Can } from '../../../components/auth/Can';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { databaseService } from '../../../services/database';
import type { Role, Permission, User } from '../../../types/database';

export function RolesSettings() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [rolesList, setRolesList] = useState<Array<Role & { usersCount: number; permissionsCount: number }>>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [viewRoleDetails, setViewRoleDetails] = useState<{
    role: Role;
    permissions: Permission[];
    assignedUsers: User[];
  } | null>(null);

  // Form State
  const [roleName, setRoleName] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>([]);
  const [permissionFilter, setPermissionFilter] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [roles, permissions] = await Promise.all([
        databaseService.getRoles(currentUser),
        databaseService.getPermissions(currentUser),
      ]);
      setRolesList(roles);
      setAllPermissions(permissions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load roles';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Group permissions by module domain
  const permissionsByModule = allPermissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  // Open Add Role Modal
  const handleOpenAdd = () => {
    setRoleName('');
    setRoleSlug('');
    setRoleDescription('');
    setSelectedPermissionCodes([]);
    setPermissionFilter('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEdit = async (role: Role) => {
    if (!currentUser) return;
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleSlug(role.slug);
    setRoleDescription(role.description || '');
    setPermissionFilter('');
    setFormError(null);

    const codes = databaseService.getRolePermissionCodes(role.id);
    setSelectedPermissionCodes(role.slug === 'super_admin' ? allPermissions.map((p) => p.code) : codes);
    setIsEditModalOpen(true);
  };

  // Open View Role Modal
  const handleOpenView = async (role: Role) => {
    if (!currentUser) return;
    try {
      const details = await databaseService.getRoleWithDetails(currentUser, role.id);
      if (details) {
        setViewRoleDetails(details);
        setIsViewModalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load role details';
      showToast(msg, 'error');
    }
  };

  // Auto-generate slug when typing name in Add mode
  const handleNameChange = (name: string) => {
    setRoleName(name);
    if (!selectedRole) {
      const derivedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setRoleSlug(derivedSlug);
    }
  };

  // Toggle single permission selection
  const handleTogglePermission = (code: string) => {
    setSelectedPermissionCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Toggle all permissions for a module
  const handleToggleModulePermissions = (modulePerms: Permission[]) => {
    const moduleCodes = modulePerms.map((p) => p.code);
    const allSelected = moduleCodes.every((c) => selectedPermissionCodes.includes(c));

    if (allSelected) {
      setSelectedPermissionCodes((prev) => prev.filter((c) => !moduleCodes.includes(c)));
    } else {
      setSelectedPermissionCodes((prev) => Array.from(new Set([...prev, ...moduleCodes])));
    }
  };

  // Select all permissions
  const handleSelectAll = () => {
    setSelectedPermissionCodes(allPermissions.map((p) => p.code));
  };

  // Deselect all permissions
  const handleDeselectAll = () => {
    setSelectedPermissionCodes([]);
  };

  // Create Role Handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.createRole(currentUser, {
        name: roleName,
        slug: roleSlug,
        description: roleDescription,
        permission_codes: selectedPermissionCodes,
      });

      showToast(`Role '${roleName}' created successfully`, 'success');
      setIsAddModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create role';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Role Handler
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedRole) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await databaseService.updateRole(currentUser, selectedRole.id, {
        name: roleName,
        description: roleDescription,
        permission_codes: selectedPermissionCodes,
      });

      showToast(`Role '${roleName}' updated successfully`, 'success');
      setIsEditModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Role Handler
  const handleDeleteRole = async (role: Role) => {
    if (!currentUser) return;
    if (!window.confirm(`Are you sure you want to permanently delete role '${role.name}'?`)) {
      return;
    }

    try {
      await databaseService.deleteRole(currentUser, role.id);
      showToast(`Role '${role.name}' removed`, 'info');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete role';
      showToast(msg, 'error');
    }
  };

  const filteredRoles = rolesList.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Roles & Capability Matrix
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure system and custom enterprise roles, assign granular module permissions, and inspect access scopes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Can do="roles.create">
            <Button size="sm" onClick={handleOpenAdd} className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <ShieldPlus className="w-3.5 h-3.5" />
              Create Custom Role
            </Button>
          </Can>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search roles by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total Roles: <span className="font-semibold text-slate-800">{rolesList.length}</span> | Available Tokens:{' '}
          <span className="font-semibold text-slate-800">{allPermissions.length}</span>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            Loading role definitions...
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No roles match the given search query.
          </div>
        ) : (
          filteredRoles.map((role) => {
            const isSuperAdmin = role.slug === 'super_admin';

            return (
              <Card key={role.id} className="border-slate-200 flex flex-col justify-between hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {role.name}
                        {role.is_system && (
                          <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-700 border-slate-200 py-0">
                            System
                          </Badge>
                        )}
                      </CardTitle>
                      <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                        slug: {role.slug}
                      </span>
                    </div>

                    <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                  </div>

                  <CardDescription className="text-xs text-slate-600 line-clamp-2 mt-2">
                    {role.description || 'No description provided for this operational role.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{role.usersCount} Assigned Users</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isSuperAdmin ? 'All (*:*)' : `${role.permissionsCount} Tokens`}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenView(role)}
                      className="text-xs text-slate-600 hover:text-slate-900 gap-1.5 h-7 px-2"
                    >
                      <Eye className="w-3 h-3" />
                      Inspect Matrix
                    </Button>

                    <div className="flex items-center gap-1">
                      <Can do="roles.edit">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(role)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                          title="Configure Permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </Can>

                      <Can do="roles.delete">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
                          disabled={role.is_system || role.usersCount > 0}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          title={
                            role.is_system
                              ? 'System roles cannot be deleted'
                              : role.usersCount > 0
                              ? 'Cannot delete role with assigned users'
                              : 'Delete Role'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </Can>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Role Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {isAddModalOpen ? (
                  <>
                    <ShieldPlus className="w-4 h-4 text-indigo-600" />
                    Create Custom Security Role
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 text-indigo-600" />
                    Edit Role: {selectedRole?.name}
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
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

            <form
              onSubmit={isAddModalOpen ? handleCreateRole : handleUpdateRole}
              className="space-y-4 flex-1 overflow-hidden flex flex-col text-xs"
            >
              {/* Role Title & Slug fields */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Regional Quality Inspector"
                    value={roleName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">System Slug Identifier</label>
                  <input
                    type="text"
                    required
                    disabled={isEditModalOpen}
                    placeholder="e.g. regional_quality_inspector"
                    value={roleSlug}
                    onChange={(e) => setRoleSlug(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-slate-50 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:text-slate-500"
                  />
                </div>
              </div>

              <div className="shrink-0">
                <label className="block text-slate-700 font-medium mb-1">Functional Description</label>
                <input
                  type="text"
                  placeholder="Describes the operational responsibilities and system scope of this role..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Permission Granularity Matrix Selector */}
              <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <div className="p-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      Grant Capability Tokens ({selectedPermissionCodes.length}/{allPermissions.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-[11px] h-6 px-2 text-indigo-600 hover:text-indigo-800"
                    >
                      Select All
                    </Button>
                    <span className="text-slate-300">|</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="text-[11px] h-6 px-2 text-slate-600 hover:text-slate-800"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Filter Input for Permissions */}
                <div className="p-2 bg-slate-100/70 border-b border-slate-200 shrink-0">
                  <input
                    type="text"
                    placeholder="Filter permissions by module or action (e.g. inventory, delete, view)..."
                    value={permissionFilter}
                    onChange={(e) => setPermissionFilter(e.target.value)}
                    className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded focus:outline-hidden"
                  />
                </div>

                {/* Grouped Permission Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
                  {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                    const filteredPerms = perms.filter(
                      (p) =>
                        p.code.toLowerCase().includes(permissionFilter.toLowerCase()) ||
                        (p.name && p.name.toLowerCase().includes(permissionFilter.toLowerCase())) ||
                        p.description.toLowerCase().includes(permissionFilter.toLowerCase()) ||
                        moduleName.toLowerCase().includes(permissionFilter.toLowerCase())
                    );

                    if (filteredPerms.length === 0) return null;

                    const allModuleSelected = perms.every((p) => selectedPermissionCodes.includes(p.code));

                    return (
                      <div key={moduleName} className="bg-white rounded-md border border-slate-200 p-2.5">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                            {moduleName} Subsystem ({filteredPerms.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePermissions(perms)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            {allModuleSelected ? 'Uncheck All' : 'Select All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {filteredPerms.map((perm) => {
                            const isChecked = selectedPermissionCodes.includes(perm.code);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors border ${
                                  isChecked
                                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900'
                                    : 'hover:bg-slate-50 border-transparent text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.code)}
                                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                <div className="text-[11px] leading-tight">
                                  <span className="font-medium block">{perm.name || perm.description}</span>
                                  <span className="font-mono text-[10px] text-slate-400">{perm.code}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isSubmitting ? 'Saving...' : isAddModalOpen ? 'Create Role' : 'Save Role Matrix'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Role Details Modal */}
      {isViewModalOpen && viewRoleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Role Security Matrix: {viewRoleDetails.role.name}
                </h3>
                <span className="text-xs text-slate-500 font-mono">slug: {viewRoleDetails.role.slug}</span>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded border border-slate-200/70 text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Role Scope</span>
                <p className="text-slate-700 mt-0.5">
                  {viewRoleDetails.role.description || 'Standard enterprise operational role.'}
                </p>
              </div>

              {/* Assigned Users list */}
              <div>
                <span className="font-bold text-slate-800 text-xs block mb-1.5">
                  Assigned Personnel ({viewRoleDetails.assignedUsers.length})
                </span>
                {viewRoleDetails.assignedUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No users currently assigned to this role.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {viewRoleDetails.assignedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded"
                      >
                        <Users className="w-3 h-3 text-indigo-500" />
                        {u.full_name} ({u.email})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Granted Permissions */}
              <div>
                <span className="font-bold text-slate-800 text-xs block mb-1.5">
                  Granted Security Tokens ({viewRoleDetails.permissions.length})
                </span>
                <div className="max-h-56 overflow-y-auto p-2.5 bg-slate-900 text-emerald-400 rounded font-mono text-[11px] space-y-1">
                  {viewRoleDetails.role.slug === 'super_admin' ? (
                    <div className="text-amber-300 font-semibold">
                      *:* (Wildcard Token - Full platform capability)
                    </div>
                  ) : viewRoleDetails.permissions.length === 0 ? (
                    <div className="text-slate-500 italic">No permissions assigned to this role.</div>
                  ) : (
                    viewRoleDetails.permissions.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px]">
                        <span>{p.code}</span>
                        <span className="text-slate-500 text-[10px]">{p.name || p.description}</span>
                      </div>
                    ))
                  )}
                </div>
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
