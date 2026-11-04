import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { batchApi } from '../../../services/batchApi';
import type { BatchNumberingRule } from '../../../types/batches';

export function BatchSettingsTab() {
  const [rules, setRules] = useState<BatchNumberingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [activeRule, setActiveRule] = useState<Partial<BatchNumberingRule> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const data = await batchApi.getNumberingRules();
      setRules(data.rules);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenNew = () => {
    setActiveRule({
      name: 'Custom Numbering Pattern',
      rule_type: 'finished_good',
      prefix: 'BAT',
      include_year: true,
      year_format: 'YYYY',
      include_month: true,
      include_day: false,
      sequence_length: 5,
      separator: '-',
      is_active: true,
    });
    setIsEditing(true);
  };

  const handleEditRule = (r: BatchNumberingRule) => {
    setActiveRule({ ...r });
    setIsEditing(true);
  };

  const computePreview = (r: Partial<BatchNumberingRule>) => {
    const now = new Date();
    const parts: string[] = [r.prefix || 'BAT'];
    if (r.include_year) {
      let dt = r.year_format === 'YY' ? now.getFullYear().toString().slice(-2) : now.getFullYear().toString();
      if (r.include_month) dt += (now.getMonth() + 1).toString().padStart(2, '0');
      if (r.include_day) dt += now.getDate().toString().padStart(2, '0');
      parts.push(dt);
    }
    parts.push('1'.padStart(r.sequence_length || 5, '0'));
    if (r.suffix) parts.push(r.suffix);
    return parts.join(r.separator || '-');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRule?.name || !activeRule?.prefix) {
      setError('Please provide rule name and prefix.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await batchApi.saveNumberingRule(activeRule);
      setIsEditing(false);
      setActiveRule(null);
      fetchRules();
    } catch (err: any) {
      setError(err.message || 'Failed to save rule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Intro & Action Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>Configurable Batch & Lot Numbering Sequence Engine</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define automated nomenclature rules per product line, raw materials, or finished goods categories
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Numbering Rule</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="md:col-span-3 p-12 text-center text-slate-400">Loading numbering rules...</div>
        ) : rules.length === 0 ? (
          <div className="md:col-span-3 p-12 text-center text-slate-400">No numbering rules found.</div>
        ) : (
          rules.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="capitalize text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {r.rule_type.replace('_', ' ')}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {r.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Example Generation</span>
                  <span className="font-mono font-bold text-indigo-600 text-sm">{r.example_preview || computePreview(r)}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Prefix:</span>
                  <span className="font-mono font-semibold text-slate-800">{r.prefix}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Seq Counter:</span>
                  <span className="font-mono font-semibold text-slate-800">{r.current_sequence}</span>
                </div>
                <div className="flex justify-between">
                  <span>Separator:</span>
                  <span className="font-mono font-semibold text-slate-800">&quot;{r.separator}&quot;</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleEditRule(r)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Create Rule Modal */}
      {isEditing && activeRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800">
                  {activeRule.id ? 'Edit Batch Numbering Pattern' : 'Create Batch Numbering Pattern'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Dynamic Live Preview */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl text-center">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                  Live Generated Sample
                </span>
                <span className="font-mono text-base font-extrabold text-indigo-900">{computePreview(activeRule)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={activeRule.name || ''}
                  onChange={(e) => setActiveRule({ ...activeRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Rule Category</label>
                  <select
                    value={activeRule.rule_type || 'finished_good'}
                    onChange={(e) => setActiveRule({ ...activeRule, rule_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="global">Global Default</option>
                    <option value="raw_material">Raw Materials</option>
                    <option value="finished_good">Finished Goods</option>
                    <option value="product_line">Product Line</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Prefix</label>
                  <input
                    type="text"
                    required
                    value={activeRule.prefix || ''}
                    onChange={(e) => setActiveRule({ ...activeRule, prefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. BAT, RM, BULK"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Year Format</label>
                  <select
                    value={activeRule.year_format || 'YYYY'}
                    onChange={(e) => setActiveRule({ ...activeRule, year_format: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="YYYY">YYYY (2026)</option>
                    <option value="YY">YY (26)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Seq Length</label>
                  <input
                    type="number"
                    min="3"
                    max="8"
                    value={activeRule.sequence_length || 5}
                    onChange={(e) => setActiveRule({ ...activeRule, sequence_length: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Separator</label>
                  <input
                    type="text"
                    value={activeRule.separator ?? '-'}
                    onChange={(e) => setActiveRule({ ...activeRule, separator: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRule.include_year}
                    onChange={(e) => setActiveRule({ ...activeRule, include_year: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Include Year timestamp</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRule.include_month}
                    onChange={(e) => setActiveRule({ ...activeRule, include_month: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Include Month timestamp (e.g. 09)</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRule.is_active}
                    onChange={(e) => setActiveRule({ ...activeRule, is_active: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Rule is active for automated numbering</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Rule Pattern'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
