import React, { useState } from 'react';
import { X, Copy, GitBranch, AlertCircle, CheckCircle } from 'lucide-react';
import type { Formulation } from '../../../types/formulations';
import { formulationApi } from '../../../services/formulationApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  formulation: Formulation | null;
  onVersionCreated: (newFormulation: Formulation) => void;
}

export function FormulationNewVersionModal({
  isOpen,
  onClose,
  formulation,
  onVersionCreated,
}: Props) {
  const [versionType, setVersionType] = useState<'minor' | 'major' | 'custom'>('minor');
  const [customVersion, setCustomVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !formulation) return null;

  const currentVersion = formulation.version || '1.0';
  const parts = currentVersion.split('.');
  const majorNum = parseInt(parts[0], 10) || 1;
  const minorNum = parseInt(parts[1], 10) || 0;
  const nextMinor = `${majorNum}.${minorNum + 1}`;
  const nextMajor = `${majorNum + 1}.0`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await formulationApi.createNewVersion(formulation.id, {
        version_type: versionType,
        custom_version: versionType === 'custom' ? customVersion : undefined,
        notes: notes.trim() || undefined,
      });
      onVersionCreated(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create new version');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create New Formulation Version
              </h2>
              <p className="text-xs text-slate-500">
                Branch from <span className="font-semibold text-slate-700">{formulation.name}</span> (v{currentVersion})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-5 mb-0 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Choose Revision Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVersionType('minor')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  versionType === 'minor'
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Minor Revision</div>
                <div className="font-mono text-xs font-semibold text-indigo-600 mt-1">v{nextMinor}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Tweaks & adjustments</div>
              </button>

              <button
                type="button"
                onClick={() => setVersionType('major')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  versionType === 'major'
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Major Overhaul</div>
                <div className="font-mono text-xs font-semibold text-indigo-600 mt-1">v{nextMajor}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Structural BOM changes</div>
              </button>

              <button
                type="button"
                onClick={() => setVersionType('custom')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  versionType === 'custom'
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Custom Tag</div>
                <div className="font-mono text-xs font-semibold text-indigo-600 mt-1">e.g. 1.2-QC</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Specialized run</div>
              </button>
            </div>
          </div>

          {versionType === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Custom Version String
              </label>
              <input
                type="text"
                required
                value={customVersion}
                onChange={e => setCustomVersion(e.target.value)}
                placeholder="e.g. 1.5-BETA"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Revision Notes / Change Reason
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Replacing raw emulsifier with organic certified alternative to improve stability..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-[11px] text-amber-800">
            <strong>Lifecycle Rule:</strong> The new version will be created in <strong>DRAFT</strong> state with all components and substitutions cloned. The current active version remains unchanged until the new version is reviewed, approved, and explicitly activated.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {saving ? 'Creating...' : 'Create Draft Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
