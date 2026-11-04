import { useState } from 'react';
import { Search, Layers, Plus, CheckCircle2, ChevronRight } from 'lucide-react';
import type { QCTemplate } from '../../../types/quality';

interface TemplateCatalogTableProps {
  templates: QCTemplate[];
  loading?: boolean;
  onNewTemplate?: () => void;
  onSelectTemplate?: (template: QCTemplate) => void;
}

export function TemplateCatalogTable({
  templates,
  loading = false,
  onNewTemplate,
  onSelectTemplate,
}: TemplateCatalogTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = templates.filter((t) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchCode = t.template_code.toLowerCase().includes(term);
      const matchName = t.name.toLowerCase().includes(term);
      const matchDesc = (t.description || '').toLowerCase().includes(term);
      if (!matchCode && !matchName && !matchDesc) return false;
    }
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
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
            placeholder="Search specification template code, name, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="incoming_material">Incoming Raw Material</option>
              <option value="in_process">In-Process Blend</option>
              <option value="finished_good">Finished Product (FG)</option>
              <option value="packaging">Packaging Materials</option>
            </select>
          </div>

          {onNewTemplate && (
            <button
              onClick={onNewTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Specification</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid or Table */}
      <div className="divide-y divide-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading QC specification templates...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No specification templates found.</div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectTemplate && onSelectTemplate(t)}
              className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0 mt-0.5">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{t.name}</span>
                    <span className="font-mono text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                      {t.template_code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      v{t.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{t.description || 'Standard QC testing specification'}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="capitalize text-slate-600 font-medium">{t.category.replace('_', ' ')}</span>
                    <span>&bull;</span>
                    <span>{t.parameters_count || 0} Test Parameters Linked</span>
                    <span>&bull;</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Specification
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
