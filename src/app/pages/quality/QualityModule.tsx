import { useState, useEffect } from 'react';
import { ShieldCheck, FileCheck2, Layers, Settings, Award } from 'lucide-react';
import type { QCInspection, QCParameter, QCTemplate, QCSummaryMetrics } from '../../../types/quality';
import { qualityApi } from '../../../services/qualityApi';
import { QualityMetricsHeader } from './QualityMetricsHeader';
import { InspectionListTable } from './InspectionListTable';
import { InspectionDetailDrawer } from './InspectionDetailDrawer';
import { CreateInspectionModal } from './CreateInspectionModal';
import { ParameterCatalogTable } from './ParameterCatalogTable';
import { CreateParameterModal } from './CreateParameterModal';
import { TemplateCatalogTable } from './TemplateCatalogTable';
import { CreateTemplateModal } from './CreateTemplateModal';
import { QualityScorecardView } from './QualityScorecardView';

export function QualityModule() {
  const [activeTab, setActiveTab] = useState<'inspections' | 'templates' | 'parameters' | 'scorecard'>('inspections');

  // Data state
  const [metrics, setMetrics] = useState<QCSummaryMetrics | null>(null);
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [templates, setTemplates] = useState<QCTemplate[]>([]);
  const [parameters, setParameters] = useState<QCParameter[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals and Drawer state
  const [selectedInspection, setSelectedInspection] = useState<QCInspection | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewInspectionOpen, setIsNewInspectionOpen] = useState(false);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [isNewParameterOpen, setIsNewParameterOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Metrics always refreshed
      const m = await qualityApi.getMetrics();
      setMetrics(m);

      // 2. Tab-specific data
      if (activeTab === 'inspections') {
        const res = await qualityApi.getInspections({ limit: 100 });
        setInspections(res.inspections || []);
      } else if (activeTab === 'templates') {
        const res = await qualityApi.getTemplates({ limit: 100 });
        setTemplates(res.templates || []);
      } else if (activeTab === 'parameters') {
        const res = await qualityApi.getParameters({ limit: 100 });
        setParameters(res.parameters || []);
      }
    } catch (err) {
      console.warn('Failed to load quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInspection = async (insp: QCInspection) => {
    try {
      const full = await qualityApi.getInspectionById(insp.id);
      setSelectedInspection(full);
      setIsDrawerOpen(true);
    } catch {
      setSelectedInspection(insp);
      setIsDrawerOpen(true);
    }
  };

  const handleDrawerUpdated = async () => {
    if (selectedInspection) {
      try {
        const full = await qualityApi.getInspectionById(selectedInspection.id);
        setSelectedInspection(full);
      } catch {}
    }
    loadAllData();
  };

  return (
    <div className="space-y-6">
      {/* Metrics & Action Bar */}
      <QualityMetricsHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadAllData}
        onNewInspection={() => setIsNewInspectionOpen(true)}
        onNewTemplate={() => setIsNewTemplateOpen(true)}
        onNewParameter={() => setIsNewParameterOpen(true)}
      />

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('inspections')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'inspections'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Inspection Registers & Testing</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>QC Specifications & Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('parameters')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'parameters'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Parameter Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('scorecard')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'scorecard'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Supplier Quality & Defect Scorecard</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'inspections' && (
        <InspectionListTable
          inspections={inspections}
          loading={loading}
          onSelectInspection={handleSelectInspection}
          onNewInspection={() => setIsNewInspectionOpen(true)}
        />
      )}

      {activeTab === 'templates' && (
        <TemplateCatalogTable
          templates={templates}
          loading={loading}
          onNewTemplate={() => setIsNewTemplateOpen(true)}
        />
      )}

      {activeTab === 'parameters' && (
        <ParameterCatalogTable
          parameters={parameters}
          loading={loading}
          onNewParameter={() => setIsNewParameterOpen(true)}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'scorecard' && <QualityScorecardView />}

      {/* Modals & Workbench Drawer */}
      <InspectionDetailDrawer
        inspection={selectedInspection}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdated={handleDrawerUpdated}
      />

      <CreateInspectionModal
        isOpen={isNewInspectionOpen}
        onClose={() => setIsNewInspectionOpen(false)}
        onCreated={loadAllData}
      />

      <CreateTemplateModal
        isOpen={isNewTemplateOpen}
        onClose={() => setIsNewTemplateOpen(false)}
        onCreated={loadAllData}
      />

      <CreateParameterModal
        isOpen={isNewParameterOpen}
        onClose={() => setIsNewParameterOpen(false)}
        onCreated={loadAllData}
      />
    </div>
  );
}
