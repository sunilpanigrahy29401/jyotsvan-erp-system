import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Save,
  RotateCcw,
  FileText,
  Upload,
  Building2,
  Package,
  Layers,
  Calendar,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import type { QCInspection, QCInspectionItem } from '../../../types/quality';
import { qualityApi } from '../../../services/qualityApi';

interface InspectionDetailDrawerProps {
  inspection: QCInspection | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function InspectionDetailDrawer({
  inspection,
  isOpen,
  onClose,
  onUpdated,
}: InspectionDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'assay' | 'decision' | 'documents' | 'audit'>('assay');
  const [itemsState, setItemsState] = useState<Record<string, {
    actualValue?: number | null;
    textResult?: string | null;
    booleanResult?: boolean | null;
    selectionResult?: string | null;
    remarks?: string | null;
  }>>({});
  const [sampleQty, setSampleQty] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Decision state
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'quarantine'>('approved');
  const [rejectionCode, setRejectionCode] = useState<string>('out_of_spec');
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [acceptedQty, setAcceptedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);

  // Override Modal state
  const [overrideItem, setOverrideItem] = useState<QCInspectionItem | null>(null);
  const [overrideResult, setOverrideResult] = useState<'pass' | 'fail' | 'conditional'>('pass');
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Re-inspection Modal state
  const [showReinspectionModal, setShowReinspectionModal] = useState(false);
  const [reinspectionReason, setReinspectionReason] = useState('');

  // Document Upload state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('coa');
  const [docUrl, setDocUrl] = useState('');

  useEffect(() => {
    if (inspection) {
      const stateMap: Record<string, any> = {};
      inspection.items?.forEach((it) => {
        stateMap[it.id] = {
          actualValue: it.actual_value !== undefined && it.actual_value !== null ? it.actual_value : null,
          textResult: it.text_result || '',
          booleanResult: it.boolean_result,
          selectionResult: it.selection_result || '',
          remarks: it.remarks || '',
        };
      });
      setItemsState(stateMap);
      setSampleQty(inspection.sample_quantity || 0);
      setAcceptedQty(inspection.received_quantity || 0);
      setRejectedQty(0);
      setActionError(null);
      setActionSuccess(null);
    }
  }, [inspection]);

  if (!isOpen || !inspection) return null;

  const isFinalized = ['approved', 'rejected', 'released', 'cancelled'].includes(inspection.status);

  // Auto-evaluation live helper
  const calculateLiveItemEval = (item: QCInspectionItem) => {
    if (item.is_overridden) return item.evaluated_result;
    const curr = itemsState[item.id] || {};
    const type = item.parameter_type_snapshot;

    if (type === 'numeric' || type === 'percentage') {
      if (curr.actualValue === null || curr.actualValue === undefined || (curr.actualValue as any) === '') return 'pending';
      const val = Number(curr.actualValue);
      if (isNaN(val)) return 'fail';
      if (item.minimum_value !== null && item.minimum_value !== undefined && val < item.minimum_value) return 'fail';
      if (item.maximum_value !== null && item.maximum_value !== undefined && val > item.maximum_value) return 'fail';
      return 'pass';
    }

    if (type === 'pass_fail') {
      if (curr.booleanResult === true) return 'pass';
      if (curr.booleanResult === false) return 'fail';
      if (!curr.selectionResult) return 'pending';
      const sel = curr.selectionResult.toLowerCase();
      if (sel === 'pass' || sel === 'complies' || sel === 'yes' || sel === 'ok') return 'pass';
      if (sel === 'fail' || sel === 'no' || sel === 'rejected') return 'fail';
      return 'pending';
    }

    if (type === 'selection') {
      if (!curr.selectionResult) return 'pending';
      const allowed = item.allowed_values_snapshot || [];
      if (allowed.length === 0) return 'pass';
      return allowed.some(a => a.toLowerCase() === curr.selectionResult?.toLowerCase()) ? 'pass' : 'fail';
    }

    if (type === 'text') {
      return curr.textResult ? 'pass' : 'pending';
    }

    return 'pending';
  };

  // Submit test measurements
  const handleSaveResults = async () => {
    try {
      setSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      const payloadItems = Object.entries(itemsState).map(([id, state]) => ({
        id,
        actualValue: state.actualValue !== null && state.actualValue !== undefined && (state.actualValue as any) !== '' ? Number(state.actualValue) : null,
        textResult: state.textResult || null,
        booleanResult: state.booleanResult,
        selectionResult: state.selectionResult || null,
        remarks: state.remarks || null,
      }));

      await qualityApi.submitResults(inspection.id, {
        items: payloadItems,
        sampleQuantity: sampleQty,
      });

      setActionSuccess('Quality test results & assay evaluations submitted successfully.');
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit test results.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Managerial Override
  const handleApplyOverride = async () => {
    if (!overrideItem) return;
    try {
      setSubmitting(true);
      setActionError(null);
      await qualityApi.overrideItemEvaluation(inspection.id, {
        itemId: overrideItem.id,
        overrideResult,
        overrideReason,
      });
      setOverrideItem(null);
      setOverrideReason('');
      setActionSuccess(`Evaluation for ${overrideItem.parameter_name_snapshot} successfully overridden to ${overrideResult.toUpperCase()}.`);
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to apply override.');
    } finally {
      setSubmitting(false);
    }
  };

  // Final Decision Execution
  const handleExecuteDecision = async () => {
    try {
      setSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      await qualityApi.makeDecision(inspection.id, {
        decision: decisionType,
        rejectionReasonCode: decisionType === 'rejected' ? rejectionCode : undefined,
        decisionReason: decisionReason || (decisionType === 'approved' ? 'Batch conforms to specification standard' : 'Material out of specification tolerances'),
        comments,
        acceptedQuantity: decisionType === 'approved' ? acceptedQty : 0,
        rejectedQuantity: decisionType === 'rejected' ? rejectedQty : 0,
        quarantineQuantity: decisionType === 'quarantine' ? inspection.received_quantity : 0,
      });

      setActionSuccess(`QC Decision finalized: Material ${decisionType.toUpperCase()} with atomic inventory transaction completed.`);
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute QC decision.');
    } finally {
      setSubmitting(false);
    }
  };

  // Re-inspection Execution
  const handleCreateReinspection = async () => {
    try {
      setSubmitting(true);
      setActionError(null);
      const newInsp = await qualityApi.createReinspection(inspection.id, {
        reinspectionReason,
      });
      setShowReinspectionModal(false);
      setReinspectionReason('');
      setActionSuccess(`Child Re-Inspection ${newInsp.inspection_number} successfully initiated.`);
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create re-inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload Document
  const handleUploadDocument = async () => {
    if (!docName || !docUrl) return;
    try {
      setSubmitting(true);
      await qualityApi.uploadDocument(inspection.id, {
        documentName: docName,
        documentType: docType,
        fileUrl: docUrl,
      });
      setDocName('');
      setDocUrl('');
      setActionSuccess('Quality verification document / Certificate of Analysis attached.');
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to upload document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{inspection.inspection_number}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">
                  {inspection.inspection_type.replace('_', ' ')}
                </span>
                {inspection.is_reinspection && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Re-Inspection
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                SKU: <span className="font-semibold text-slate-700">{inspection.sku_code}</span> ({inspection.product_name || 'Standard Material'}) &bull; Batch: <span className="font-mono text-slate-700">{inspection.batch_number || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinalized && (
              <button
                onClick={() => setShowReinspectionModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                title="Initiate traceable sample re-test"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                <span>Re-Inspect</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Traceability Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 bg-slate-100/70 border-b border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Source Reference</span>
            <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
              <FileText className="w-3 h-3 text-slate-400" />
              {inspection.source_id}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Warehouse / Plant</span>
            <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-slate-400" />
              {inspection.warehouse_name || 'Main Plant'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Received / Sample Qty</span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {inspection.received_quantity} / {inspection.sample_quantity} {inspection.unit_code}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Evaluation Status</span>
            <span className="font-bold uppercase mt-0.5 block">
              {inspection.status === 'approved' ? (
                <span className="text-emerald-700">Approved & Released</span>
              ) : inspection.status === 'rejected' ? (
                <span className="text-rose-700">Rejected (OOS)</span>
              ) : (
                <span className="text-amber-700">{inspection.status.replace('_', ' ')}</span>
              )}
            </span>
          </div>
        </div>

        {/* Notification Alerts */}
        {actionError && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-5 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('assay')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'assay'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Assay & Parameters ({inspection.items?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('decision')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'decision'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>QC Decision & Inventory Release</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>COA & Attachments ({inspection.documents?.length || 0})</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: PARAMETER ASSAYS & RESULT ENTRY */}
          {activeTab === 'assay' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mandatory Test Parameters & Specifications</h3>
                  <p className="text-xs text-slate-500">
                    Input measured analytical parameters. The system automatically evaluates conformity against standard tolerances.
                  </p>
                </div>
                {!isFinalized && (
                  <button
                    onClick={handleSaveResults}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Saving...' : 'Save & Evaluate'}</span>
                  </button>
                )}
              </div>

              {/* Sample Quantity Input */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-800">Sample Drawn for Inspection</span>
                  <p className="text-[11px] text-slate-500">Recorded sample volume/units drawn from batch lot</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    disabled={isFinalized}
                    value={sampleQty}
                    onChange={(e) => setSampleQty(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  />
                  <span className="text-xs font-medium text-slate-500">{inspection.unit_code}</span>
                </div>
              </div>

              {/* Parameters List */}
              <div className="space-y-3">
                {inspection.items?.map((item, index) => {
                  const curr = itemsState[item.id] || {};
                  const liveEval = calculateLiveItemEval(item);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        liveEval === 'pass'
                          ? 'border-emerald-200 bg-emerald-50/10'
                          : liveEval === 'fail'
                          ? 'border-rose-200 bg-rose-50/10'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Parameter Header & Specs */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                            <span className="text-xs font-bold text-slate-900">{item.parameter_name_snapshot}</span>
                            <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                              {item.parameter_code_snapshot}
                            </span>
                            {item.is_mandatory && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Mandatory
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                            {item.minimum_value !== null && item.maximum_value !== null && (
                              <span>
                                Target Range: <strong className="text-slate-800">{item.minimum_value} &ndash; {item.maximum_value} {item.unit_code_snapshot}</strong>
                              </span>
                            )}
                            {item.allowed_values_snapshot && item.allowed_values_snapshot.length > 0 && (
                              <span>
                                Allowed: <strong className="text-slate-800">{item.allowed_values_snapshot.join(', ')}</strong>
                              </span>
                            )}
                            {item.test_method_snapshot && (
                              <span className="text-slate-500 italic">
                                Method: {item.test_method_snapshot}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Live Evaluation Badge & Override Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {liveEval === 'pass' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              PASS
                            </span>
                          )}
                          {liveEval === 'fail' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3.5 h-3.5" />
                              FAIL
                            </span>
                          )}
                          {liveEval === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                              <Clock className="w-3.5 h-3.5" />
                              PENDING
                            </span>
                          )}

                          {item.is_overridden && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200" title={item.override_reason || ''}>
                              OVERRIDDEN
                            </span>
                          )}

                          {!isFinalized && (
                            <button
                              onClick={() => {
                                setOverrideItem(item);
                                setOverrideResult(liveEval === 'fail' ? 'pass' : 'conditional');
                              }}
                              className="text-xs text-slate-500 hover:text-slate-900 underline ml-1"
                              title="Override evaluation with manager authorization"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Input Measurement Controls */}
                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Value Input */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Measured Assay Reading
                          </label>
                          {item.parameter_type_snapshot === 'numeric' || item.parameter_type_snapshot === 'percentage' ? (
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                disabled={isFinalized}
                                placeholder="Enter value..."
                                value={curr.actualValue !== null && curr.actualValue !== undefined ? curr.actualValue : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                  setItemsState((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], actualValue: val },
                                  }));
                                }}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900 disabled:bg-slate-100"
                              />
                              {item.unit_code_snapshot && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                                  {item.unit_code_snapshot}
                                </span>
                              )}
                            </div>
                          ) : item.parameter_type_snapshot === 'pass_fail' ? (
                            <select
                              disabled={isFinalized}
                              value={curr.selectionResult || (curr.booleanResult === true ? 'Pass' : curr.booleanResult === false ? 'Fail' : '')}
                              onChange={(e) => {
                                const sel = e.target.value;
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    selectionResult: sel,
                                    booleanResult: sel === 'Pass',
                                  },
                                }));
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold disabled:bg-slate-100"
                            >
                              <option value="">-- Select Result --</option>
                              <option value="Pass">Pass / Complies</option>
                              <option value="Fail">Fail / Out of Spec</option>
                            </select>
                          ) : item.parameter_type_snapshot === 'selection' ? (
                            <select
                              disabled={isFinalized}
                              value={curr.selectionResult || ''}
                              onChange={(e) => {
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], selectionResult: e.target.value },
                                }));
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold disabled:bg-slate-100"
                            >
                              <option value="">-- Select Observation --</option>
                              {item.allowed_values_snapshot?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              disabled={isFinalized}
                              placeholder="Observation remarks..."
                              value={curr.textResult || ''}
                              onChange={(e) => {
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], textResult: e.target.value },
                                }));
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                            />
                          )}
                        </div>

                        {/* Remarks */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Notes / Instrument Remarks
                          </label>
                          <input
                            type="text"
                            disabled={isFinalized}
                            placeholder="e.g. Clean sample, calibration verified..."
                            value={curr.remarks || ''}
                            onChange={(e) => {
                              setItemsState((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], remarks: e.target.value },
                              }));
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                          />
                        </div>
                      </div>

                      {/* Override details tag */}
                      {item.is_overridden && (
                        <div className="mt-2 p-2 bg-purple-50 rounded-lg text-[11px] text-purple-900 border border-purple-200">
                          <strong>Manager Override Applied:</strong> {item.override_reason} (By: {item.overridden_by_email})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FINAL DECISION & INVENTORY RELEASE */}
          {activeTab === 'decision' && (
            <div className="space-y-5">
              {inspection.decision ? (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {inspection.decision.decision === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      )}
                      <h3 className="text-sm font-bold text-slate-900 uppercase">
                        Final Decision: {inspection.decision.decision}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(inspection.decision.decision_date).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Accepted Qty</span>
                      <span className="font-bold text-emerald-700">{inspection.decision.accepted_quantity} {inspection.unit_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Rejected Qty</span>
                      <span className="font-bold text-rose-700">{inspection.decision.rejected_quantity} {inspection.unit_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Quarantine Qty</span>
                      <span className="font-bold text-purple-700">{inspection.decision.quarantine_quantity} {inspection.unit_code}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1">
                    <div><strong>Authorization Reason:</strong> {inspection.decision.decision_reason}</div>
                    {inspection.decision.comments && <div><strong>Comments:</strong> {inspection.decision.comments}</div>}
                    <div><strong>Decided By:</strong> {inspection.decision.decided_by_email}</div>
                    <div><strong>Inventory Status:</strong> <span className="font-mono text-emerald-700 font-semibold">{inspection.decision.inventory_action_status}</span></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Authorize Quality Decision</h3>
                    <p className="text-xs text-slate-500">
                      Authorizing QC decision triggers atomic inventory ledger stock movements. Approved material will be released from quarantine to available stock.
                    </p>
                  </div>

                  {/* Decision Type Radio Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecisionType('approved')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        decisionType === 'approved'
                          ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>APPROVE & RELEASE</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Release full batch to available stock for dispatch & distribution.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionType('rejected')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        decisionType === 'rejected'
                          ? 'border-rose-600 bg-rose-50/40 ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>REJECT OUT-OF-SPEC</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Lock material in damaged/rejected status. Block from sales.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionType('quarantine')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        decisionType === 'quarantine'
                          ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-purple-900">
                        <AlertTriangle className="w-4 h-4 text-purple-600" />
                        <span>HOLD IN QUARANTINE</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Maintain in quarantine staging pending specialized assay.
                      </p>
                    </button>
                  </div>

                  {/* Quantity Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {decisionType === 'approved' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Approved Quantity to Release ({inspection.unit_code})
                        </label>
                        <input
                          type="number"
                          value={acceptedQty}
                          onChange={(e) => setAcceptedQty(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                        />
                      </div>
                    )}

                    {decisionType === 'rejected' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Rejected Quantity ({inspection.unit_code})
                          </label>
                          <input
                            type="number"
                            value={rejectedQty || inspection.received_quantity}
                            onChange={(e) => setRejectedQty(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Rejection Reason Code
                          </label>
                          <select
                            value={rejectionCode}
                            onChange={(e) => setRejectionCode(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 font-semibold"
                          >
                            <option value="out_of_spec">Out of Specification Parameters</option>
                            <option value="damaged">Packaging / Container Damage</option>
                            <option value="contamination">Contamination / Foreign Particulates</option>
                            <option value="incorrect_material">Incorrect SKU / Grade Mismatch</option>
                            <option value="expired">Expired Material / Shelf Life Exceeded</option>
                            <option value="other">Other Non-Conformance</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Decision Justification / Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. All 7 mandatory QC parameters verified within IS standard limits..."
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Additional Comments / Storage Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional remarks..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleExecuteDecision}
                      disabled={submitting}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-lg shadow-md transition-colors disabled:opacity-50 ${
                        decisionType === 'approved'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : decisionType === 'rejected'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{submitting ? 'Executing Atomic Inventory Release...' : `Confirm & Authorize ${decisionType.toUpperCase()}`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COA & ATTACHMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Certificate of Analysis (COA) & Lab Reports</h3>
                  <p className="text-xs text-slate-500">
                    Attach supplier manufacturer certificates, 3rd-party laboratory assays, and inspection photographs.
                  </p>
                </div>
              </div>

              {/* Upload Box */}
              {!isFinalized && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Document Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Manufacturer COA Batch 26A"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Type</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="coa">Certificate of Analysis (COA)</option>
                        <option value="lab_report">3rd-Party Lab Report</option>
                        <option value="supplier_certificate">Supplier Certificate</option>
                        <option value="inspection_photo">Inspection Photo</option>
                        <option value="ncr_report">Non-Conformance Report (NCR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">File URL / Storage Path</label>
                      <input
                        type="text"
                        placeholder="https://storage... or /docs/..."
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleUploadDocument}
                      disabled={submitting || !docName || !docUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Attach Document</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Documents List */}
              <div className="space-y-2">
                {inspection.documents?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No documents attached yet. Attach supplier COA for regulatory compliance.
                  </div>
                ) : (
                  inspection.documents?.map((doc) => (
                    <div key={doc.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <div>
                          <div className="font-semibold text-xs text-slate-900">{doc.document_name}</div>
                          <div className="text-[10px] text-slate-500 uppercase">{doc.document_type} &bull; Uploaded by {doc.uploaded_by_email}</div>
                        </div>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        View File
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Inspection ID: <span className="font-mono">{inspection.id}</span></span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Close Workbench
          </button>
        </div>
      </div>

      {/* MODAL 1: MANAGERIAL OVERRIDE JUSTIFICATION */}
      {overrideItem && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                Managerial Result Override
              </h3>
              <button onClick={() => setOverrideItem(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are applying a supervisory override for parameter <strong>{overrideItem.parameter_name_snapshot}</strong>. A mandatory audit log entry with your reason will be permanently recorded.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Overridden Result</label>
              <select
                value={overrideResult}
                onChange={(e) => setOverrideResult(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
              >
                <option value="pass">PASS (Acceptable Tolerance)</option>
                <option value="conditional">CONDITIONAL APPROVAL</option>
                <option value="fail">FAIL (Reject)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Override Justification (Required)</label>
              <textarea
                rows={3}
                placeholder="Specify laboratory technical justification, batch re-assay reference, or engineering approval..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideItem(null)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverride}
                disabled={submitting || overrideReason.trim().length < 5}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RE-INSPECTION TRACEABILITY TRIGGER */}
      {showReinspectionModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                Initiate Sample Re-Inspection
              </h3>
              <button onClick={() => setShowReinspectionModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Creates an immutable child inspection linked to <strong>{inspection.inspection_number}</strong>. Original measurements are preserved for historical audit trails.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Re-Inspection (Required)</label>
              <textarea
                rows={3}
                placeholder="e.g. Disputed moisture assay result; secondary composite sample requested by QC Manager..."
                value={reinspectionReason}
                onChange={(e) => setReinspectionReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReinspectionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReinspection}
                disabled={submitting || reinspectionReason.trim().length < 5}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Create Child Re-Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
