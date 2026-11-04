import { useState } from 'react';
import { X, Settings, Plus, AlertCircle } from 'lucide-react';
import { qualityApi } from '../../../services/qualityApi';

interface CreateParameterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateParameterModal({
  isOpen,
  onClose,
  onCreated,
}: CreateParameterModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('numeric');
  const [minVal, setMinVal] = useState<number | ''>('');
  const [maxVal, setMaxVal] = useState<number | ''>('');
  const [targetVal, setTargetVal] = useState<number | ''>('');
  const [allowedValsStr, setAllowedValsStr] = useState('');
  const [testMethod, setTestMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      setError('Parameter Code and Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const allowedValues = allowedValsStr
        ? allowedValsStr.split(',').map((s) => s.trim()).filter(Boolean)
        : null;

      await qualityApi.createParameter({
        parameter_code: code.toUpperCase().trim(),
        parameter_name: name.trim(),
        description: description.trim() || undefined,
        parameter_type: type as any,
        minimum_value: minVal !== '' ? Number(minVal) : null,
        maximum_value: maxVal !== '' ? Number(maxVal) : null,
        target_value: targetVal !== '' ? Number(targetVal) : null,
        allowed_values: allowedValues,
        test_method: testMethod.trim() || undefined,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create parameter.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Quality Test Parameter</h2>
              <p className="text-xs text-slate-500">Define analytical, chemical, or organoleptic test standards</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Parameter Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. PARAM-PH"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="numeric">Numeric / Continuous</option>
                <option value="percentage">Percentage (%)</option>
                <option value="pass_fail">Pass / Fail</option>
                <option value="selection">Selection Dropdown</option>
                <option value="text">Text / Observation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parameter Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. pH Value (at 25°C)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Aqueous hydrogen ion concentration measurement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {(type === 'numeric' || type === 'percentage') && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Minimum Spec</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Min"
                  value={minVal}
                  onChange={(e) => setMinVal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Spec</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Target"
                  value={targetVal}
                  onChange={(e) => setTargetVal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Maximum Spec</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Max"
                  value={maxVal}
                  onChange={(e) => setMaxVal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {type === 'selection' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Allowed Choices (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Dark Brown Powder, Shiny Black Granules, Clear Amber"
                value={allowedValsStr}
                onChange={(e) => setAllowedValsStr(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Test Method Standard / Instrument</label>
            <input
              type="text"
              placeholder="e.g. HPLC UV-Vis / IS 101 / Digital pH Electrode"
              value={testMethod}
              onChange={(e) => setTestMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Adding...' : 'Add Parameter'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
