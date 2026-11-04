// src/app/pages/people/EmployeeDirectory.tsx
// Employee Directory with Grid/List/Hierarchy Views & Filters

import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, LayoutGrid, List, Network, 
  Building2, MapPin, Mail, Phone, ShieldCheck, ChevronRight, RefreshCw, Briefcase
} from 'lucide-react';
import { PeopleAPI } from '../../../services/people-api.ts';
import type { Employee, Designation } from '../../../types/people.ts';
import { Employee360Modal } from './Employee360Modal.tsx';
import { OnboardEmployeeModal } from './OnboardEmployeeModal.tsx';
import { DesignationsModal } from './DesignationsModal.tsx';
import { OrgHierarchyView } from './OrgHierarchyView.tsx';

export function EmployeeDirectory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'hierarchy'>('grid');

  // Modals
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showDesignationsModal, setShowDesignationsModal] = useState<boolean>(false);
  const [hierarchyNodes, setHierarchyNodes] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [departmentFilter, statusFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [empList, desigList, hier] = await Promise.all([
        PeopleAPI.getEmployees({
          department_id: departmentFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        PeopleAPI.getDesignations(),
        PeopleAPI.getOrgHierarchy(),
      ]);
      setEmployees(empList);
      setDesignations(desigList);
      setHierarchyNodes(hier);
    } catch (err: any) {
      setError(err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      emp.display_name.toLowerCase().includes(query) ||
      emp.employee_code.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      (emp.phone && emp.phone.includes(query)) ||
      (emp.designation_name && emp.designation_name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            Staff & Employee Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal human resources, reporting hierarchy, profiles & designations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowDesignationsModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4 text-slate-500" />
            Manage Designations
          </button>
          <button
            type="button"
            onClick={() => setShowOnboardModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Onboard Employee
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Mode */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, employee code, email, phone, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Department & Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">All Departments</option>
              <option value="dept-sales">Sales & Commercial</option>
              <option value="dept-mfg">Manufacturing & Plant</option>
              <option value="dept-ops">Supply Chain & Logistics</option>
              <option value="dept-qc">Quality Assurance</option>
              <option value="dept-fin">Finance & Accounts</option>
              <option value="dept-hr">HR & Administration</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('hierarchy')}
                className={`p-1.5 rounded-md ${viewMode === 'hierarchy' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                title="Org Tree Hierarchy"
              >
                <Network className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'hierarchy' ? (
        <OrgHierarchyView nodes={hierarchyNodes} onSelectEmployee={(id) => setSelectedEmployeeId(id)} />
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading workforce records...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="font-medium text-slate-700">No employees match your criteria</p>
          <p className="text-xs text-slate-400">Try adjusting your search terms or filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployeeId(emp.id)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      `${emp.first_name[0]}${emp.last_name[0] || ''}`
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                      {emp.display_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{emp.designation_name || 'Staff'}</p>
                    <span className="inline-block mt-0.5 font-mono text-[10px] text-slate-400 font-semibold">
                      {emp.employee_code}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                    emp.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : emp.status === 'on_leave'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {emp.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{emp.department_name} • {emp.branch_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Manager: {emp.reporting_manager_name || 'None (Top Level)'}</span>
                <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  View 360 <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Reporting Manager</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {emp.first_name[0]}
                        </div>
                        <span className="font-bold text-slate-900">{emp.display_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{emp.employee_code}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{emp.department_name}</p>
                      <p className="text-[11px] text-slate-400">{emp.designation_name || 'Staff'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{emp.branch_name}</td>
                    <td className="py-3 px-4">
                      <p className="text-slate-800">{emp.email}</p>
                      <p className="text-[11px] text-slate-400">{emp.phone}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{emp.reporting_manager_name || '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                          emp.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : emp.status === 'on_leave'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {emp.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployeeId(emp.id);
                        }}
                        className="text-amber-600 hover:text-amber-800 font-semibold"
                      >
                        Profile 360°
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedEmployeeId && (
        <Employee360Modal
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
          onEmployeeUpdated={loadData}
          onSelectOtherEmployee={(id) => setSelectedEmployeeId(id)}
        />
      )}

      {showOnboardModal && (
        <OnboardEmployeeModal
          designations={designations}
          onClose={() => setShowOnboardModal(false)}
          onSuccess={() => {
            setShowOnboardModal(false);
            loadData();
          }}
        />
      )}

      {showDesignationsModal && (
        <DesignationsModal
          departments={[
            { id: 'dept-sales', name: 'Sales & Commercial' },
            { id: 'dept-mfg', name: 'Manufacturing & Plant' },
            { id: 'dept-ops', name: 'Supply Chain & Logistics' },
            { id: 'dept-qc', name: 'Quality Assurance' },
            { id: 'dept-fin', name: 'Finance & Accounts' },
            { id: 'dept-hr', name: 'HR & Administration' },
          ]}
          onClose={() => {
            setShowDesignationsModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
