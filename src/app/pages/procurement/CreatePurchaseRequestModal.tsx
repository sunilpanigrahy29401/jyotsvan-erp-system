import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  FileText,
  Building,
  Package,
} from 'lucide-react';
import { procurementApi } from '../../../services/procurementApi';

interface CreatePurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SkuOption {
  id: string;
  sku_code: string;
  variant_name: string;
  product_name: string;
  mrp: number;
  cost_price: number;
  unit_name?: string;
}

interface ItemRow {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  estimatedUnitCost: number;
  notes: string;
}

export const CreatePurchaseRequestModal: React.FC<CreatePurchaseRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [requiredByDate, setRequiredByDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const [availableSkus, setAvailableSkus] = useState<SkuOption[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch SKUs
      const skuRes = await fetch('/api/skus?limit=100');
      const skuData = await skuRes.json();
      if (skuData.success && skuData.skus) {
        setAvailableSkus(skuData.skus);
        if (skuData.skus.length > 0 && items.length === 0) {
          const first = skuData.skus[0];
          setItems([
            {
              skuId: first.id,
              skuCode: first.sku_code,
              productName: first.product_name || first.variant_name,
              quantity: 10,
              estimatedUnitCost: Number(first.cost_price || first.mrp || 100),
              notes: '',
            },
          ]);
        }
      }

      // 2. Fetch Departments
      const deptRes = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT id, name FROM departments WHERE organization_id = $1 ORDER BY name ASC`,
          params: ['org-jyotsvan-corp'],
        }),
      });
      const deptData = await deptRes.json();
      if (deptData.rows && deptData.rows.length > 0) {
        setDepartments(deptData.rows);
        setDepartmentId(deptData.rows[0].id);
      }
    } catch (err: any) {
      console.error('[Error loading form data]', err);
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    if (availableSkus.length === 0) return;
    const first = availableSkus[0];
    setItems([
      ...items,
      {
        skuId: first.id,
        skuCode: first.sku_code,
        productName: first.product_name || first.variant_name,
        quantity: 1,
        estimatedUnitCost: Number(first.cost_price || first.mrp || 100),
        notes: '',
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSkuChange = (idx: number, skuId: string) => {
    const selected = availableSkus.find((s) => s.id === skuId);
    if (!selected) return;
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      skuId: selected.id,
      skuCode: selected.sku_code,
      productName: selected.product_name || selected.variant_name,
      estimatedUnitCost: Number(selected.cost_price || selected.mrp || 100),
    };
    setItems(newItems);
  };

  const handleItemChange = (idx: number, field: keyof ItemRow, val: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: val };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.estimatedUnitCost) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!requiredByDate) {
      setError('Please select a required-by delivery date.');
      return;
    }

    if (items.length === 0) {
      setError('At least one item is required.');
      return;
    }

    for (const item of items) {
      if (!item.skuId) {
        setError('All line items must have a selected SKU.');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setError('Line item quantities must be greater than zero.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await procurementApi.createPurchaseRequest({
        departmentId: departmentId || undefined,
        requiredByDate,
        priority,
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          skuId: it.skuId,
          quantity: Number(it.quantity),
          estimatedUnitCost: Number(it.estimatedUnitCost),
          notes: it.notes || undefined,
        })),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Purchase Requisition (PR)</h3>
              <p className="text-xs text-slate-500">Initiate internal material requirement request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-500" />
              {error}
            </div>
          )}

          {/* Form Header Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required By Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 font-medium"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Escalation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purpose / Business Justification
            </label>
            <input
              type="text"
              placeholder="e.g., Raw material replenishment for upcoming bottling batch run"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
            />
          </div>

          {/* Line Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Requested SKU Items ({items.length})
              </h4>
              <button
                type="button"
                onClick={addItemRow}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 w-5/12">Select SKU Item</th>
                    <th className="px-3 py-2 w-2/12 text-right">Quantity</th>
                    <th className="px-3 py-2 w-2/12 text-right">Est. Unit Price (₹)</th>
                    <th className="px-3 py-2 w-2/12 text-right">Line Total</th>
                    <th className="px-3 py-2 w-1/12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const lineTotal = (Number(it.quantity) || 0) * (Number(it.estimatedUnitCost) || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2">
                          <select
                            value={it.skuId}
                            onChange={(e) => handleSkuChange(idx, e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800"
                          >
                            {availableSkus.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.sku_code} — {s.product_name || s.variant_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                            className="w-20 text-xs p-1.5 text-right bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.estimatedUnitCost}
                            onChange={(e) => handleItemChange(idx, 'estimatedUnitCost', parseFloat(e.target.value) || 0)}
                            className="w-24 text-xs p-1.5 text-right bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            disabled={items.length <= 1}
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-xs text-slate-600 uppercase">
                      Estimated Grand Total:
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-sm text-indigo-700">
                      {formatCurrency(calculateTotal())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes / Special Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific requirements, vendor preferences, or delivery instructions..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total Estimated: <span className="font-bold text-slate-900">{formatCurrency(calculateTotal())}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating Requisition...' : 'Create Purchase Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
