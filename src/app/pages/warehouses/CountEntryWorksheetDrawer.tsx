import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Download,
} from 'lucide-react';
import { StockCountSession, StockCountItem, StockCountStatus } from '../../../types/warehouse';

interface CountEntryWorksheetDrawerProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshList: () => void;
}

export const CountEntryWorksheetDrawer: React.FC<CountEntryWorksheetDrawerProps> = ({
  sessionId,
  isOpen,
  onClose,
  onRefreshList,
}) => {
  const [session, setSession] = useState<StockCountSession | null>(null);
  const [items, setItems] = useState<StockCountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Local editable quantities: { [itemId]: number }
  const [countInputs, setCountInputs] = useState<Record<string, number>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionId && isOpen) {
      loadCountSession();
    }
  }, [sessionId, isOpen]);

  const loadCountSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/warehouse-counts/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.data.session);
        const fetchedItems: StockCountItem[] = data.data.items || [];
        setItems(fetchedItems);

        // Pre-populate input states
        const initialCounts: Record<string, number> = {};
        const initialNotes: Record<string, string> = {};
        fetchedItems.forEach((it) => {
          initialCounts[it.id] = it.counted_quantity !== null && it.counted_quantity !== undefined ? it.counted_quantity : it.system_quantity;
          initialNotes[it.id] = it.notes || '';
        });
        setCountInputs(initialCounts);
        setNoteInputs(initialNotes);
      } else {
        setError(data.error || 'Failed to load count session');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading count session');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !sessionId) return null;

  const handleSaveProgress = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = items.map((it) => ({
        id: it.id,
        counted_quantity: countInputs[it.id] !== undefined ? countInputs[it.id] : it.system_quantity,
        notes: noteInputs[it.id] || null,
      }));

      const res = await fetch(`/api/warehouse-counts/${sessionId}/items/record-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save counts');

      setSuccessMsg('Physical counts recorded and variances recalculated.');
      await loadCountSession();
      onRefreshList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReconcile = async () => {
    const isConfirmed = window.confirm(
      'Are you sure you want to finalize and reconcile this physical count session? This will post authoritative adjustments to the inventory ledger.'
    );
    if (!isConfirmed) return;

    setReconciling(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // 1. Save inputs first
      await handleSaveProgress();

      // 2. Trigger reconciliation
      const res = await fetch(`/api/warehouse-counts/${sessionId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Reconciliation failed');

      setSuccessMsg('Stock count session successfully reconciled! Immutable inventory ledger updated.');
      await loadCountSession();
      onRefreshList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReconciling(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU Code',
      'Product Name',
      'Location Bin',
      'System Qty',
      'Counted Qty',
      'Variance Qty',
      'Unit Cost (₹)',
      'Variance Value (₹)',
      'Count Notes',
    ];

    const rows = items.map((it) => {
      const counted = countInputs[it.id] !== undefined ? countInputs[it.id] : it.system_quantity;
      const variance = counted - it.system_quantity;
      const val = variance * (it.unit_cost || 0);
      return [
        it.sku_code,
        `"${(it.product_name || it.sku_name || '').replace(/"/g, '""')}"`,
        it.location_code || 'General Storage',
        it.system_quantity,
        counted,
        variance,
        it.unit_cost || 0,
        val,
        `"${(noteInputs[it.id] || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `count_worksheet_${session?.count_number || 'audit'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isReconciled = session?.status === 'reconciled';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {session?.count_number || 'Loading Audit...'}
                </h2>
                {session && (
                  <span className="capitalize px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {session.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {session?.warehouse_name} • {session?.count_type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              title="Download worksheet CSV"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={loadCountSession}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Audit Metrics Banner */}
          {session && (
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Scheduled Date:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {new Date(session.count_date || session.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Total Items:</span>
                <div className="font-bold text-slate-900 mt-0.5">{items.length} line items</div>
              </div>
              <div>
                <span className="text-slate-500">Variance Items:</span>
                <div className="font-bold text-amber-700 mt-0.5">
                  {session.discrepancy_items_count || 0} discrepancies
                </div>
              </div>
              <div>
                <span className="text-slate-500">Net Valuation Variance:</span>
                <div
                  className={`font-bold mt-0.5 ${
                    session.net_variance_value < 0
                      ? 'text-rose-600'
                      : session.net_variance_value > 0
                      ? 'text-emerald-600'
                      : 'text-slate-900'
                  }`}
                >
                  ₹{session.net_variance_value?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          )}

          {/* Editable Count Worksheet Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Physical Inventory Worksheet
              </h3>
              <span className="text-2xs text-slate-400">
                {isReconciled ? 'Read-only reconciled archive' : 'Update counted quantity and click Save'}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">SKU & Product</th>
                    <th className="py-2.5 px-3">Location Bin</th>
                    <th className="py-2.5 px-3 text-right">System Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Physical Count</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                    <th className="py-2.5 px-3 text-right">Valuation Diff</th>
                    <th className="py-2.5 px-3">Discrepancy Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No items generated for this count session.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => {
                      const counted = countInputs[it.id] !== undefined ? countInputs[it.id] : it.system_quantity;
                      const variance = counted - it.system_quantity;
                      const hasVariance = variance !== 0;
                      const valDiff = variance * (it.unit_cost || 0);

                      return (
                        <tr key={it.id} className={hasVariance ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-900">{it.sku_code}</span>
                            <div className="text-slate-500">{it.product_name || it.sku_name}</div>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {it.location_code || 'General'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            {it.system_quantity}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {isReconciled ? (
                              <span className="font-bold text-slate-900">{it.counted_quantity}</span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={countInputs[it.id] !== undefined ? countInputs[it.id] : it.system_quantity}
                                onChange={(e) =>
                                  setCountInputs({
                                    ...countInputs,
                                    [it.id]: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className={`w-20 text-xs font-bold text-right px-2 py-1 rounded border ${
                                  hasVariance
                                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                                    : 'border-slate-200 bg-white text-slate-900'
                                }`}
                              />
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {hasVariance ? (
                              <span
                                className={`inline-flex items-center gap-0.5 font-bold ${
                                  variance > 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {variance > 0 ? `+${variance}` : variance}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-xs">
                            {valDiff !== 0 ? (
                              <span className={valDiff > 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                                {valDiff > 0 ? `+₹${valDiff.toLocaleString()}` : `-₹${Math.abs(valDiff).toLocaleString()}`}
                              </span>
                            ) : (
                              <span className="text-slate-400">₹0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {isReconciled ? (
                              <span className="text-2xs text-slate-500">{it.notes || '-'}</span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Audit note..."
                                value={noteInputs[it.id] || ''}
                                onChange={(e) =>
                                  setNoteInputs({
                                    ...noteInputs,
                                    [it.id]: e.target.value,
                                  })
                                }
                                className="w-full text-2xs px-2 py-1 bg-white border border-slate-200 rounded"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {!isReconciled && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              disabled={saving || reconciling}
              onClick={handleSaveProgress}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Counts...' : 'Save Worksheet Counts'}
            </button>

            <button
              type="button"
              disabled={saving || reconciling}
              onClick={handleReconcile}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4" />
              {reconciling ? 'Reconciling Ledger...' : 'Approve & Reconcile Physical Ledger'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
