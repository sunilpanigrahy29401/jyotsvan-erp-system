import React, { useState, useEffect } from 'react';
import {
  Layers,
  Scale,
  GitCompare,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import type { Formulation, FormulationSummaryMetrics } from '../../../types/formulations';
import { formulationApi } from '../../../services/formulationApi';
import { FormulationMetricsHeader } from './FormulationMetricsHeader';
import { FormulationListTable } from './FormulationListTable';
import { FormulationDetailDrawer } from './FormulationDetailDrawer';
import { FormulationEditorModal } from './FormulationEditorModal';
import { FormulationVersionCompareModal } from './FormulationVersionCompareModal';
import { FormulationNewVersionModal } from './FormulationNewVersionModal';
import { BatchScalingWorkbench } from './BatchScalingWorkbench';

export function FormulationModule() {
  const [activeTab, setActiveTab] = useState<'formulations' | 'scaling' | 'guidelines'>('formulations');

  // Data states
  const [metrics, setMetrics] = useState<FormulationSummaryMetrics | null>(null);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Drawer State
  const [selectedFormulation, setSelectedFormulation] = useState<Formulation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFormulation, setEditingFormulation] = useState<Formulation | null>(null);
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [versioningFormulation, setVersioningFormulation] = useState<Formulation | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareV1Id, setCompareV1Id] = useState<string | undefined>(undefined);
  const [compareV2Id, setCompareV2Id] = useState<string | undefined>(undefined);

  // Standalone workbench selection
  const [scalingFormulationId, setScalingFormulationId] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, [statusFilter]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [m, listRes] = await Promise.all([
        formulationApi.getMetrics(),
        formulationApi.listFormulations({
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 100,
        }),
      ]);
      setMetrics(m);
      setFormulations(listRes.data || []);
      if (!scalingFormulationId && listRes.data && listRes.data.length > 0) {
        setScalingFormulationId(listRes.data[0].id);
      }
    } catch (err) {
      console.warn('Failed to load formulation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFormulation = async (f: Formulation) => {
    try {
      const full = await formulationApi.getFormulation(f.id);
      setSelectedFormulation(full);
      setIsDrawerOpen(true);
    } catch {
      setSelectedFormulation(f);
      setIsDrawerOpen(true);
    }
  };

  const handleEditFormulation = (f: Formulation) => {
    setEditingFormulation(f);
    setIsEditorOpen(true);
  };

  const handleNewVersion = (f: Formulation) => {
    setVersioningFormulation(f);
    setIsNewVersionOpen(true);
  };

  const handleScaleBatch = (f: Formulation) => {
    setScalingFormulationId(f.id);
    setActiveTab('scaling');
  };

  const handleCompareVersions = (f: Formulation, otherVersionId?: string) => {
    setCompareV1Id(f.id);
    setCompareV2Id(otherVersionId);
    setIsCompareOpen(true);
  };

  const handleSubmitForReview = async (f: Formulation) => {
    const updated = await formulationApi.submitForReview(f.id);
    setSelectedFormulation(updated);
    loadAllData();
  };

  const handleApprove = async (f: Formulation) => {
    const updated = await formulationApi.approveFormulation(f.id);
    setSelectedFormulation(updated);
    loadAllData();
  };

  const handleActivate = async (f: Formulation) => {
    const updated = await formulationApi.activateFormulation(f.id);
    setSelectedFormulation(updated);
    loadAllData();
  };

  const handleDeactivate = async (f: Formulation) => {
    const updated = await formulationApi.deactivateFormulation(f.id);
    setSelectedFormulation(updated);
    loadAllData();
  };

  const handleArchive = async (f: Formulation) => {
    const updated = await formulationApi.archiveFormulation(f.id);
    setSelectedFormulation(updated);
    loadAllData();
  };

  const handleFormulationSaved = (saved: Formulation) => {
    loadAllData();
    setSelectedFormulation(saved);
    setIsDrawerOpen(true);
  };

  const filteredFormulations = formulations.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.formulation_code.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.finished_sku_code.toLowerCase().includes(q) ||
      (f.finished_sku_name && f.finished_sku_name.toLowerCase().includes(q)) ||
      (f.finished_product_name && f.finished_product_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Metrics Bar */}
      <FormulationMetricsHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadAllData}
        onNewFormulation={() => {
          setEditingFormulation(null);
          setIsEditorOpen(true);
        }}
        onOpenScalingWorkbench={() => setActiveTab('scaling')}
        onOpenCompare={() => {
          setCompareV1Id(formulations[0]?.id);
          setCompareV2Id(formulations[1]?.id || formulations[0]?.id);
          setIsCompareOpen(true);
        }}
      />

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('formulations')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'formulations'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Master Formulations & Recipes ({formulations.length})
        </button>

        <button
          onClick={() => setActiveTab('scaling')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'scaling'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          Batch Scaling & Simulation Workbench
        </button>

        <button
          onClick={() => setActiveTab('guidelines')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'guidelines'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          BOM Architecture & Governance
        </button>
      </div>

      {/* TAB 1: Formulation Registry */}
      {activeTab === 'formulations' && (
        <FormulationListTable
          formulations={filteredFormulations}
          loading={loading}
          onSelectFormulation={handleSelectFormulation}
          onEditFormulation={handleEditFormulation}
          onNewVersion={handleNewVersion}
          onScaleBatch={handleScaleBatch}
          onCompareVersions={f => handleCompareVersions(f)}
          onSubmitForReview={handleSubmitForReview}
          onApprove={handleApprove}
          onActivate={handleActivate}
          onArchive={handleArchive}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      )}

      {/* TAB 2: Batch Scaling Simulator */}
      {activeTab === 'scaling' && (
        <BatchScalingWorkbench
          formulationList={formulations}
          selectedFormulationId={scalingFormulationId}
          onSelectFormulationChange={setScalingFormulationId}
        />
      )}

      {/* TAB 3: Architecture & Governance */}
      {activeTab === 'guidelines' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 text-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Formulation & BOM Engineering Principles (Phase 12)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Foundational architecture governing formulation templates, immutable version control, scrap calculations, and circular BOM prevention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Template Definition Constraint
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Formulations and Bills of Materials are structural master definitions. They define the precise component recipes, expected yields, and process scrap allowances. Formulations do <strong>not</strong> directly consume inventory; inventory consumption is reserved for Production Orders (Phase 13).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Recursive Circular BOM Protection
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Before saving, updating, or activating any formulation, a recursive Depth-First Search (DFS) runs across the SKU dependency adjacency graph to prevent direct or indirect cycles (e.g., A → B → C → A).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Immutable Version Lifecycle
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Active and Approved recipes are locked from direct in-place modification to ensure audit traceability. Changes require creating a new revision (e.g., v1.1 or v2.0), testing via batch scaling, and executing approval workflows before superseding the predecessor.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Material Cost Rollup Foundation
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Component line items calculate gross quantities including scrap allowances and roll up unit costs from active SKU standard costs. This provides immediate production feasibility analysis without creating accounting ledger entries.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <FormulationDetailDrawer
        formulation={selectedFormulation}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleEditFormulation}
        onNewVersion={handleNewVersion}
        onCompareWith={(f, otherId) => handleCompareVersions(f, otherId)}
        onSubmitForReview={handleSubmitForReview}
        onApprove={handleApprove}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
        onArchive={handleArchive}
      />

      <FormulationEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={handleFormulationSaved}
        editingFormulation={editingFormulation}
      />

      <FormulationNewVersionModal
        isOpen={isNewVersionOpen}
        onClose={() => setIsNewVersionOpen(false)}
        formulation={versioningFormulation}
        onVersionCreated={handleFormulationSaved}
      />

      <FormulationVersionCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        formulationList={formulations}
        initialV1Id={compareV1Id}
        initialV2Id={compareV2Id}
      />
    </div>
  );
}
