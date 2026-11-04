import { useState, useEffect } from 'react';
import { X, Layers, Plus, Check, Trash2, AlertCircle } from 'lucide-react';
import type { QCParameter } from '../../../types/quality';
import { qualityApi } from '../../../services/qualityApi';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTemplateModalProps) {
  const [templateCode, setTemplateCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'incoming_material' | 'in_process' | 'finished_good' | 'packaging'>('incoming_material');
  const [description, setDescription] = useState('');
  const [selectedParams, setSelectedParams] = useState<Array<{
    parameterId: string;
    parameterName: string;
    parameterCode: string;
    unitCode?: string;
    isMandatory: boolean;
    minimumValue?: number | null;
    maximumValue?: number | null;
  }>>([]);

  const [availableParams, setAvailableParams] = useState<QCParameter[]>([]);
  const [selectedParamToAdd, setSelectedParamToAdd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadParameters();
    }
  }, [isOpen]);

  const loadParameters = async () => {
    try {
      const res = await qualityApi.getParameters({ limit: 100 });
      setAvailableParams(res.parameters || []);
    } catch (err) {
      console.warn('Failed to load parameters:', err);
    }
  };

  if (!isOpen) return null;

  const handleAddParam = () => {
    if (!selectedParamToAdd) return;
    const found = availableParams.find((p) => p.id === selectedParamToAdd);
    if (!found) return;

    if (selectedParams.some((p) => p.parameterId === found.id)) return;

    setSelectedParams([
      ...selectedParams,
      {
        parameterId: found.id,
        parameterName: found.parameter_name,
        parameterCode: found.parameter_code,
        unitCode: found.unit_code,
        isMandatory: true,
        minimumValue: found.minimum_value,
        maximumValue: found.maximum_value,
      },
    ]);
    setSelectedParamToAdd('');
  };

  const handleRemoveParam = (index: number) => {
    setSelectedParams(selectedParams.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateCode || !name) {
      setError('Template Code and Name are required.');
      return;
    }
    if (selectedParams.length === 0) {
      setError('Please add at least one test parameter to this specification.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await qualityApi.createTemplate({
        templateCode: templateCode.toUpperCase().trim(),
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        parameters: selectedParams.map((p, idx) => ({
          parameterId: p.parameterId,
          displayOrder: idx + 1,
          isMandatory: p.isMandatory,
          minimumValue: p.minimumValue,
          maximumValue: p.maximumValue,
        })),
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create specification template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create QC Specification Template</h2>
              <p className="text-xs text-slate-500">Group test parameters into a reusable inspection standard</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Specification Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. SPEC-RAW-COAL-01"
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Material Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="incoming_material">Incoming Raw Material</option>
                <option value="in_process">In-Process Blend</option>
                <option value="finished_good">Finished Goods (FG)</option>
                <option value="packaging">Packaging Materials</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Specification Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. High Grade Bituminous Coal Inward Assay"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Mandatory laboratory parameters for coal rail wagon inward..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Linked Parameters Section */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Assigned Test Parameters ({selectedParams.length})</span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedParamToAdd}
                  onChange={(e) => setSelectedParamToAdd(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Add Parameter --</option>
                  {availableParams
                    .filter((p) => !selectedParams.some((sp) => sp.parameterId === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.parameter_code} - {p.parameter_name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddParam}
                  disabled={!selectedParamToAdd}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {selectedParams.map((p, idx) => (
                <div key={p.parameterId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-slate-900">{p.parameterName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.parameterCode}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.isMandatory}
                        onChange={(e) => {
                          const updated = [...selectedParams];
                          updated[idx].isMandatory = e.target.checked;
                          setSelectedParams(updated);
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Mandatory</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveParam(idx)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
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
              <span>{submitting ? 'Creating Specification...' : 'Create Specification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
