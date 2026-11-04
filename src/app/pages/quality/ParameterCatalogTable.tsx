import { useState } from 'react';
import { Search, Settings, Plus, CheckCircle2, XCircle } from 'lucide-react';
import type { QCParameter } from '../../../types/quality';

interface ParameterCatalogTableProps {
  parameters: QCParameter[];
  loading?: boolean;
  onNewParameter?: () => void;
  onRefresh?: () => void;
}

export function ParameterCatalogTable({
  parameters,
  loading = false,
  onNewParameter,
}: ParameterCatalogTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = parameters.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchCode = p.parameter_code.toLowerCase().includes(term);
      const matchName = p.parameter_name.toLowerCase().includes(term);
      const matchDesc = (p.description || '').toLowerCase().includes(term);
      if (!matchCode && !matchName && !matchDesc) return false;
    }
    if (typeFilter !== 'all' && p.parameter_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search parameter code, name, test standard..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="numeric">Numeric / Quantitative</option>
              <option value="percentage">Percentage (%)</option>
              <option value="pass_fail">Pass / Fail</option>
              <option value="selection">Selection List</option>
              <option value="text">Text / Visual Observation</option>
            </select>
          </div>

          {onNewParameter && (
            <button
              onClick={onNewParameter}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parameter</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Parameter Name & Description</th>
              <th className="py-3 px-4">Data Type</th>
              <th className="py-3 px-4">Default Specification Limits</th>
              <th className="py-3 px-4">Test Method / Instrument</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">Loading parameter catalog...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">No test parameters found.</td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.parameter_code}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{p.parameter_name}</div>
                    {p.description && <div className="text-[11px] text-slate-500 line-clamp-1">{p.description}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700">
                      {p.parameter_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {p.minimum_value !== null && p.maximum_value !== null ? (
                      <span>
                        {p.minimum_value} &ndash; {p.maximum_value} {p.unit_code}
                      </span>
                    ) : p.allowed_values && p.allowed_values.length > 0 ? (
                      <span className="line-clamp-1">{p.allowed_values.join(', ')}</span>
                    ) : (
                      <span className="text-slate-400">Qualitative / Pass-Fail</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 italic">
                    {p.test_method || 'Standard organoleptic'}
                  </td>
                  <td className="py-3 px-4">
                    {p.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
