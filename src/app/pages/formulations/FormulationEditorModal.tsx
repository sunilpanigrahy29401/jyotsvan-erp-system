import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
  Sparkles,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
} from 'lucide-react';
import type {
  Formulation,
  CreateFormulationPayload,
  ComponentType,
} from '../../../types/formulations';
import { formulationApi } from '../../../services/formulationApi';

interface SkuOption {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  cost_price: number;
  unit_id: string;
  unit_code: string;
  product_id: string;
  product_name: string;
  product_type: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (formulation: Formulation) => void;
  editingFormulation?: Formulation | null;
}

export function FormulationEditorModal({
  isOpen,
  onClose,
  onSaved,
  editingFormulation,
}: Props) {
  const [availableSkus, setAvailableSkus] = useState<SkuOption[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formulationCode, setFormulationCode] = useState('');
  const [name, setName] = useState('');
  const [finishedSkuId, setFinishedSkuId] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');
  const [batchSize, setBatchSize] = useState('1000');
  const [batchSizeUnitId, setBatchSizeUnitId] = useState('u-l');
  const [expectedYield, setExpectedYield] = useState('950');
  const [expectedYieldUnitId, setExpectedYieldUnitId] = useState('u-l');
  const [expectedWastage, setExpectedWastage] = useState('50');
  const [expectedWastageUnitId, setExpectedWastageUnitId] = useState('u-l');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [notes, setNotes] = useState('');

  // Components State
  const [components, setComponents] = useState<
    {
      component_sku_id: string;
      component_type: ComponentType;
      quantity: string;
      unit_id: string;
      unit_code: string;
      wastage_allowance_percentage: string;
      is_optional: boolean;
      is_substitutable: boolean;
      notes: string;
    }[]
  >([]);

  // Substitutions State
  const [substitutions, setSubstitutions] = useState<
    {
      primary_component_index: number;
      alternate_sku_id: string;
      conversion_factor: string;
      preference_priority: string;
      substitution_group: string;
      notes: string;
    }[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      loadSkus();
      if (editingFormulation) {
        populateFromExisting(editingFormulation);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingFormulation]);

  const loadSkus = async () => {
    setLoadingSkus(true);
    try {
      const skus = await formulationApi.getAvailableSkus();
      setAvailableSkus(skus);
      if (skus.length > 0 && !finishedSkuId && !editingFormulation) {
        setFinishedSkuId(skus[0].sku_id);
        setBatchSizeUnitId(skus[0].unit_id || 'u-l');
        setExpectedYieldUnitId(skus[0].unit_id || 'u-l');
        setExpectedWastageUnitId(skus[0].unit_id || 'u-l');
      }
    } catch (e) {
      console.warn('Failed to load available SKUs:', e);
    } finally {
      setLoadingSkus(false);
    }
  };

  const resetForm = () => {
    setFormulationCode(`BOM-${Date.now().toString().slice(-4)}`);
    setName('');
    setVersion('1.0');
    setDescription('');
    setBatchSize('1000');
    setExpectedYield('950');
    setExpectedWastage('50');
    setEffectiveFrom('');
    setEffectiveTo('');
    setNotes('');
    setComponents([
      {
        component_sku_id: '',
        component_type: 'raw_material',
        quantity: '450',
        unit_id: 'u-kg',
        unit_code: 'kg',
        wastage_allowance_percentage: '2',
        is_optional: false,
        is_substitutable: false,
        notes: '',
      },
    ]);
    setSubstitutions([]);
    setError(null);
  };

  const populateFromExisting = (f: Formulation) => {
    setFormulationCode(f.formulation_code);
    setName(f.name);
    setFinishedSkuId(f.finished_sku_id);
    setVersion(f.version);
    setDescription(f.description || '');
    setBatchSize(f.batch_size.toString());
    setBatchSizeUnitId(f.batch_size_unit_id);
    setExpectedYield(f.expected_yield.toString());
    setExpectedYieldUnitId(f.expected_yield_unit_id);
    setExpectedWastage((f.expected_wastage_quantity || 0).toString());
    setExpectedWastageUnitId(f.expected_wastage_unit_id || f.batch_size_unit_id);
    setEffectiveFrom(f.effective_from || '');
    setEffectiveTo(f.effective_to || '');
    setNotes(f.notes || '');

    if (f.components && f.components.length > 0) {
      setComponents(
        f.components.map(c => ({
          component_sku_id: c.component_sku_id,
          component_type: c.component_type,
          quantity: c.quantity.toString(),
          unit_id: c.unit_id,
          unit_code: c.unit_code || 'units',
          wastage_allowance_percentage: (c.wastage_allowance_percentage || 0).toString(),
          is_optional: c.is_optional,
          is_substitutable: c.is_substitutable,
          notes: c.notes || '',
        }))
      );
    }

    // Populate substitutions
    const subs: any[] = [];
    if (f.components) {
      f.components.forEach((c, cIdx) => {
        if (c.substitutions) {
          c.substitutions.forEach(s => {
            subs.push({
              primary_component_index: cIdx,
              alternate_sku_id: s.alternate_sku_id,
              conversion_factor: s.conversion_factor.toString(),
              preference_priority: s.preference_priority.toString(),
              substitution_group: s.substitution_group || '',
              notes: s.notes || '',
            });
          });
        }
      });
    }
    setSubstitutions(subs);
    setError(null);
  };

  const handleAddComponent = () => {
    const defaultSku = availableSkus.find(s => s.sku_id !== finishedSkuId) || availableSkus[0];
    setComponents([
      ...components,
      {
        component_sku_id: defaultSku?.sku_id || '',
        component_type: 'raw_material',
        quantity: '100',
        unit_id: defaultSku?.unit_id || 'u-kg',
        unit_code: defaultSku?.unit_code || 'kg',
        wastage_allowance_percentage: '1',
        is_optional: false,
        is_substitutable: false,
        notes: '',
      },
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
    // Remove associated substitutions
    setSubstitutions(substitutions.filter(s => s.primary_component_index !== index));
  };

  const handleAddSubstitution = (compIndex: number) => {
    const altSku = availableSkus.find(s => s.sku_id !== finishedSkuId && s.sku_id !== components[compIndex]?.component_sku_id);
    setSubstitutions([
      ...substitutions,
      {
        primary_component_index: compIndex,
        alternate_sku_id: altSku?.sku_id || '',
        conversion_factor: '1.0',
        preference_priority: '1',
        substitution_group: 'Group-A',
        notes: '',
      },
    ]);
  };

  const handleRemoveSubstitution = (index: number) => {
    setSubstitutions(substitutions.filter((_, i) => i !== index));
  };

  // Live Cost Rollup Calculation
  let estimatedTotalCost = 0;
  components.forEach(comp => {
    const sku = availableSkus.find(s => s.sku_id === comp.component_sku_id);
    const qty = parseFloat(comp.quantity) || 0;
    const scrapPct = parseFloat(comp.wastage_allowance_percentage) || 0;
    const grossQty = qty * (1 + scrapPct / 100);
    const cost = sku ? sku.cost_price : 0;
    estimatedTotalCost += grossQty * cost;
  });

  const parsedBatch = parseFloat(batchSize) || 1;
  const parsedYield = parseFloat(expectedYield) || 1;
  const yieldPercentage = parsedBatch > 0 ? (parsedYield / parsedBatch) * 100 : 0;
  const costPerBatchUnit = estimatedTotalCost / parsedBatch;
  const costPerYieldUnit = estimatedTotalCost / parsedYield;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formulationCode.trim()) {
      setError('Formulation Code is required.');
      return;
    }
    if (!name.trim()) {
      setError('Formulation Name is required.');
      return;
    }
    if (!finishedSkuId) {
      setError('Target Finished SKU is required.');
      return;
    }
    if (components.length === 0) {
      setError('At least one recipe component / raw material is required.');
      return;
    }

    // Direct Circular Check
    for (const comp of components) {
      if (comp.component_sku_id === finishedSkuId) {
        setError(
          'Direct Circular Reference: A formulation recipe cannot consume its own finished SKU as a raw component.'
        );
        return;
      }
      if (!comp.component_sku_id) {
        setError('All component rows must have a valid SKU selected.');
        return;
      }
      if (parseFloat(comp.quantity) <= 0 || isNaN(parseFloat(comp.quantity))) {
        setError('All component quantities must be greater than 0.');
        return;
      }
    }

    const payload: CreateFormulationPayload = {
      formulation_code: formulationCode.trim(),
      name: name.trim(),
      finished_sku_id: finishedSkuId,
      version: version.trim() || '1.0',
      description: description.trim() || undefined,
      batch_size: parseFloat(batchSize) || 1000,
      batch_size_unit_id: batchSizeUnitId,
      expected_yield: parseFloat(expectedYield) || 950,
      expected_yield_unit_id: expectedYieldUnitId,
      expected_wastage_quantity: parseFloat(expectedWastage) || 0,
      expected_wastage_unit_id: expectedWastageUnitId,
      effective_from: effectiveFrom || undefined,
      effective_to: effectiveTo || undefined,
      notes: notes.trim() || undefined,
      components: components.map((c, idx) => ({
        component_sku_id: c.component_sku_id,
        component_type: c.component_type,
        quantity: parseFloat(c.quantity),
        unit_id: c.unit_id,
        sequence_order: idx + 1,
        wastage_allowance_percentage: parseFloat(c.wastage_allowance_percentage) || 0,
        is_optional: c.is_optional,
        is_substitutable: c.is_substitutable,
        notes: c.notes || undefined,
      })),
      substitutions: substitutions.map(s => ({
        primary_component_index: s.primary_component_index,
        alternate_sku_id: s.alternate_sku_id,
        conversion_factor: parseFloat(s.conversion_factor) || 1.0,
        preference_priority: parseInt(s.preference_priority, 10) || 1,
        substitution_group: s.substitution_group || undefined,
        notes: s.notes || undefined,
      })),
    };

    setSaving(true);
    try {
      let saved: Formulation;
      if (editingFormulation) {
        saved = await formulationApi.updateFormulation(editingFormulation.id, payload);
      } else {
        saved = await formulationApi.createFormulation(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save formulation');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingFormulation ? 'Edit Formulation Recipe' : 'New Master Formulation & BOM'}
              </h2>
              <p className="text-xs text-slate-500">
                Specify recipe ingredients, scrap allowances, yield parameters, and component substitutions.
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
          <div className="m-5 mb-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Form Scroll Area */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* SECTION 1: Master Formulation Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Master Recipe Identity & Target SKU
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Formulation Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formulationCode}
                  onChange={e => setFormulationCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BOM-BIO-NPK-1L"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Recipe / Formulation Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Bio NPK Liquid 1L Master Formula"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Finished SKU <span className="text-rose-500">*</span>
                </label>
                <select
                  value={finishedSkuId}
                  onChange={e => {
                    const sku = availableSkus.find(s => s.sku_id === e.target.value);
                    setFinishedSkuId(e.target.value);
                    if (sku) {
                      setBatchSizeUnitId(sku.unit_id || 'u-l');
                      setExpectedYieldUnitId(sku.unit_id || 'u-l');
                      setExpectedWastageUnitId(sku.unit_id || 'u-l');
                    }
                  }}
                  disabled={Boolean(editingFormulation)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {availableSkus.map(s => (
                    <option key={s.sku_id} value={s.sku_id}>
                      {s.sku_code} — {s.sku_name || s.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  disabled={Boolean(editingFormulation)}
                  placeholder="1.0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description / Process Notes
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Standard emulsification run"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Batch Basis & Yield Parameters */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Standard Batch Basis & Expected Yield
              </h3>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                Yield Rate: {yieldPercentage.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Base Batch Size <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={batchSize}
                    onChange={e => setBatchSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                  <select
                    value={batchSizeUnitId}
                    onChange={e => setBatchSizeUnitId(e.target.value)}
                    className="w-24 px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="u-l">L (Litre)</option>
                    <option value="u-kg">kg (Kilogram)</option>
                    <option value="u-pcs">pcs (Pieces)</option>
                    <option value="u-g">g (Gram)</option>
                    <option value="u-ml">ml (Millilitre)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Expected Finished Yield <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={expectedYield}
                    onChange={e => setExpectedYield(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                  <select
                    value={expectedYieldUnitId}
                    onChange={e => setExpectedYieldUnitId(e.target.value)}
                    className="w-24 px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="u-l">L (Litre)</option>
                    <option value="u-kg">kg (Kilogram)</option>
                    <option value="u-pcs">pcs (Pieces)</option>
                    <option value="u-g">g (Gram)</option>
                    <option value="u-ml">ml (Millilitre)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Expected Wastage / Scrap Allowance
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={expectedWastage}
                    onChange={e => setExpectedWastage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                  <select
                    value={expectedWastageUnitId}
                    onChange={e => setExpectedWastageUnitId(e.target.value)}
                    className="w-24 px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="u-l">L (Litre)</option>
                    <option value="u-kg">kg (Kilogram)</option>
                    <option value="u-pcs">pcs (Pieces)</option>
                    <option value="u-g">g (Gram)</option>
                    <option value="u-ml">ml (Millilitre)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Bill of Materials Component Recipe */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Bill of Materials & Components ({components.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select raw materials, packaging, semi-finished blends, and consumables.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddComponent}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Component
              </button>
            </div>

            <div className="space-y-2.5">
              {components.map((comp, idx) => {
                const selectedSku = availableSkus.find(s => s.sku_id === comp.component_sku_id);
                const isFinishedSelf = comp.component_sku_id === finishedSkuId;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                      isFinishedSelf
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        Item #{idx + 1}
                      </span>
                      {isFinishedSelf && (
                        <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Direct Circular Reference Error
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(idx)}
                        disabled={components.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Component SKU
                        </label>
                        <select
                          value={comp.component_sku_id}
                          onChange={e => {
                            const sku = availableSkus.find(s => s.sku_id === e.target.value);
                            const updated = [...components];
                            updated[idx].component_sku_id = e.target.value;
                            if (sku) {
                              updated[idx].unit_id = sku.unit_id || 'u-kg';
                              updated[idx].unit_code = sku.unit_code || 'kg';
                            }
                            setComponents(updated);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="">Select SKU...</option>
                          {availableSkus.map(s => (
                            <option key={s.sku_id} value={s.sku_id}>
                              {s.sku_code} — {s.sku_name || s.product_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Component Type
                        </label>
                        <select
                          value={comp.component_type}
                          onChange={e => {
                            const updated = [...components];
                            updated[idx].component_type = e.target.value as ComponentType;
                            setComponents(updated);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="raw_material">Raw Material</option>
                          <option value="packaging">Packaging</option>
                          <option value="semi_finished">Semi-Finished</option>
                          <option value="additive">Additive</option>
                          <option value="consumable">Consumable</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Quantity
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={comp.quantity}
                            onChange={e => {
                              const updated = [...components];
                              updated[idx].quantity = e.target.value;
                              setComponents(updated);
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                          />
                          <span className="px-2 py-1.5 text-xs bg-slate-100 rounded-lg text-slate-600 font-mono">
                            {comp.unit_code}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Scrap / Loss %
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={comp.wastage_allowance_percentage}
                          onChange={e => {
                            const updated = [...components];
                            updated[idx].wastage_allowance_percentage = e.target.value;
                            setComponents(updated);
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Est. Line Cost
                        </label>
                        <div className="px-2.5 py-1.5 text-xs bg-slate-100/80 rounded-lg font-semibold text-slate-800 font-mono">
                          ₹
                          {(
                            (parseFloat(comp.quantity) || 0) *
                            (1 + (parseFloat(comp.wastage_allowance_percentage) || 0) / 100) *
                            (selectedSku?.cost_price || 0)
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={comp.is_substitutable}
                            onChange={e => {
                              const updated = [...components];
                              updated[idx].is_substitutable = e.target.checked;
                              setComponents(updated);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Allow Substitution</span>
                        </label>

                        {comp.is_substitutable && (
                          <button
                            type="button"
                            onClick={() => handleAddSubstitution(idx)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            + Add Alternate SKU
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Component instructions / notes..."
                        value={comp.notes}
                        onChange={e => {
                          const updated = [...components];
                          updated[idx].notes = e.target.value;
                          setComponents(updated);
                        }}
                        className="w-1/2 px-2 py-1 text-[11px] border border-slate-200 rounded-md"
                      />
                    </div>

                    {/* Substitutions Sub-Rows */}
                    {substitutions.filter(s => s.primary_component_index === idx).length > 0 && (
                      <div className="pl-4 border-l-2 border-indigo-200 space-y-2 pt-1">
                        <span className="text-[11px] font-semibold text-indigo-900">
                          Approved Alternate Substitutes for Item #{idx + 1}:
                        </span>
                        {substitutions
                          .map((sub, sIdx) => ({ sub, sIdx }))
                          .filter(({ sub }) => sub.primary_component_index === idx)
                          .map(({ sub, sIdx }) => (
                            <div key={sIdx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-indigo-100">
                              <select
                                value={sub.alternate_sku_id}
                                onChange={e => {
                                  const updated = [...substitutions];
                                  updated[sIdx].alternate_sku_id = e.target.value;
                                  setSubstitutions(updated);
                                }}
                                className="px-2 py-1 text-xs border border-slate-200 rounded-md w-1/3"
                              >
                                <option value="">Select Alternate SKU...</option>
                                {availableSkus
                                  .filter(s => s.sku_id !== comp.component_sku_id)
                                  .map(s => (
                                    <option key={s.sku_id} value={s.sku_id}>
                                      {s.sku_code} — {s.sku_name || s.product_name}
                                    </option>
                                  ))}
                              </select>

                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-400">Ratio:</span>
                                <input
                                  type="number"
                                  step="any"
                                  min="0.01"
                                  value={sub.conversion_factor}
                                  onChange={e => {
                                    const updated = [...substitutions];
                                    updated[sIdx].conversion_factor = e.target.value;
                                    setSubstitutions(updated);
                                  }}
                                  className="w-16 px-1.5 py-1 text-xs border border-slate-200 rounded-md font-mono"
                                />
                                <span className="text-[11px] text-slate-400">x</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveSubstitution(sIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: Live Estimated Material Cost Rollup Card */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                Estimated Material Cost Rollup Foundation
              </span>
              <span className="text-xs font-bold text-indigo-950">
                Total: ₹{estimatedTotalCost.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-indigo-700">
              <span>Per Batch Unit: ₹{costPerBatchUnit.toFixed(2)}</span>
              <span>Per Finished Yield Unit: ₹{costPerYieldUnit.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-indigo-500 italic">
              Note: Estimated material cost is computed strictly from active component standard SKU valuation costs for production feasibility analysis.
            </p>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : editingFormulation ? 'Update Formulation' : 'Create Formulation'}
          </button>
        </div>
      </div>
    </div>
  );
}
