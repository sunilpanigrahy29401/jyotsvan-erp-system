import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Plus,
  Download,
  MapPin,
  Boxes,
  Layers,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Archive,
  Phone,
  Mail,
  User,
  ExternalLink,
} from 'lucide-react';
import { WarehouseMaster, WarehouseType, WarehouseOperationalStatus } from '../../../types/warehouse';

interface WarehouseListTableProps {
  warehouses: WarehouseMaster[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSelectWarehouse: (warehouse: WarehouseMaster) => void;
  onOpenCreate: () => void;
  onStatusChange: (id: string, status: WarehouseOperationalStatus) => void;
}

const WAREHOUSE_TYPES: { label: string; value: WarehouseType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Central Hub', value: 'central_hub' },
  { label: 'Regional Depot', value: 'regional_depot' },
  { label: 'Factory Storage', value: 'factory_storage' },
  { label: 'Transit Hub', value: 'transit_hub' },
  { label: 'Raw Material', value: 'raw_material' },
  { label: 'Finished Goods', value: 'finished_goods' },
  { label: 'Packaging Store', value: 'packaging' },
  { label: 'WIP Production', value: 'wip_production' },
  { label: 'Dispatch Dock', value: 'dispatch' },
  { label: 'C&F Agent', value: 'cnf' },
  { label: 'Quarantine Bay', value: 'quarantine' },
  { label: 'Returns Depot', value: 'returns_depot' },
];

export const WarehouseListTable: React.FC<WarehouseListTableProps> = ({
  warehouses,
  loading,
  total,
  page,
  limit,
  onPageChange,
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onSelectWarehouse,
  onOpenCreate,
  onStatusChange,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getStatusBadge = (status: WarehouseOperationalStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Maintenance
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Inactive
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const formatWarehouseType = (type: string) => {
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const handleExportCSV = () => {
    const headers = [
      'Warehouse Code',
      'Name',
      'Type',
      'Status',
      'City',
      'State',
      'Country',
      'Capacity (m3)',
      'Capacity (sq.ft)',
      'Contact Person',
      'Phone',
      'Email',
      'Total Bins',
      'SKUs Count',
      'Total Units',
    ];
    const rows = warehouses.map((w) => [
      w.code,
      `"${w.name.replace(/"/g, '""')}"`,
      w.warehouse_type,
      w.status,
      w.city || '',
      w.state || '',
      w.country || 'India',
      w.capacity_cubic_meters || '',
      w.capacity_sq_ft || '',
      `"${(w.contact_name || w.contact_person || '').replace(/"/g, '""')}"`,
      w.contact_phone || w.phone || '',
      w.contact_email || w.email || '',
      w.total_locations_count || 0,
      w.total_skus_count || 0,
      w.total_units_count || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `warehouses_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by warehouse name, code, city, manager..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              aria-label="Filter warehouses by facility type"
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {WAREHOUSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              aria-label="Filter warehouses by operational status"
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Facility
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4">Warehouse Code & Name</th>
              <th className="py-3.5 px-4">Facility Type</th>
              <th className="py-3.5 px-4">Location & Territory</th>
              <th className="py-3.5 px-4">Capacity & Storage</th>
              <th className="py-3.5 px-4">Indexed Bins</th>
              <th className="py-3.5 px-4">Stored SKUs</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="py-4 px-4">
                    <div className="h-5 bg-slate-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : warehouses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-700">No warehouse facilities found</p>
                  <p className="text-xs text-slate-400 mt-1">Try changing search filters or register a new facility.</p>
                </td>
              </tr>
            ) : (
              warehouses.map((wh) => (
                <tr
                  key={wh.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelectWarehouse(wh)}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 border border-blue-100">
                        {wh.code.slice(0, 4)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          {wh.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>{wh.code}</span>
                          {wh.branch_name && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{wh.branch_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                      {formatWarehouseType(wh.warehouse_type)}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{wh.city ? `${wh.city}, ${wh.state || ''}` : wh.address || 'Address unassigned'}</span>
                    </div>
                    {(wh.contact_name || wh.contact_person) && (
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{wh.contact_name || wh.contact_person}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs font-semibold text-slate-800">
                      {wh.capacity_sq_ft
                        ? `${wh.capacity_sq_ft.toLocaleString()} sq.ft`
                        : wh.capacity_cubic_meters
                        ? `${wh.capacity_cubic_meters.toLocaleString()} m³`
                        : 'Unspecified'}
                    </div>
                    {wh.total_units_count !== undefined && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {wh.total_units_count.toLocaleString()} units stored
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{wh.total_locations_count || 0} bins</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <Boxes className="w-3.5 h-3.5 text-slate-400" />
                      <span>{wh.total_skus_count || 0} SKUs</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(wh.status)}</td>

                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === wh.id ? null : wh.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === wh.id && (
                        <div
                          className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-slate-100 focus:outline-none z-30"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => {
                                onSelectWarehouse(wh);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              View 360° Facility Details
                            </button>
                          </div>
                          <div className="py-1">
                            {wh.status !== 'active' && (
                              <button
                                onClick={() => {
                                  onStatusChange(wh.id, 'active');
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Mark as Active
                              </button>
                            )}
                            {wh.status !== 'maintenance' && (
                              <button
                                onClick={() => {
                                  onStatusChange(wh.id, 'maintenance');
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                              >
                                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                                Set to Maintenance
                              </button>
                            )}
                            {wh.status !== 'inactive' && (
                              <button
                                onClick={() => {
                                  onStatusChange(wh.id, 'inactive');
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Archive className="w-3.5 h-3.5 text-slate-400" />
                                Deactivate Facility
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} facilities
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
