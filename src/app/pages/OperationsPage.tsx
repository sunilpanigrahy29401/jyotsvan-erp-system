import { ModulePlaceholder } from './ModulePlaceholder';
import { Factory } from 'lucide-react';
import { ProductsPage } from './products/ProductsPage';
import { SuppliersPage } from './suppliers/SuppliersPage';
import { InventoryPage } from './inventory/InventoryPage';
import { WarehousesPage } from './warehouses/WarehousesPage';
import { ProcurementModule } from './procurement/ProcurementModule';
import { QualityModule } from './quality/QualityModule';
import { FormulationModule } from './formulations/FormulationModule';
import { ProductionModule } from './production/ProductionModule';
import { BatchModule } from './batches/BatchModule';

export interface OperationsPageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function OperationsPage({ currentPath = '/operations', onNavigate }: OperationsPageProps) {
  if (currentPath === '/operations/products' || currentPath.startsWith('/operations/products')) {
    return <ProductsPage onNavigate={onNavigate} />;
  }

  if (currentPath === '/operations/suppliers' || currentPath.startsWith('/operations/suppliers')) {
    return <SuppliersPage onNavigate={onNavigate} />;
  }

  if (currentPath === '/operations/inventory' || currentPath.startsWith('/operations/inventory')) {
    return <InventoryPage onNavigate={onNavigate} />;
  }

  if (
    currentPath === '/operations/warehouse' ||
    currentPath === '/operations/warehouses' ||
    currentPath.startsWith('/operations/warehouse') ||
    currentPath.startsWith('/operations/warehouses')
  ) {
    let tab: 'facilities' | 'transfers' | 'counts' | 'staging' = 'facilities';
    if (currentPath.includes('transfer')) tab = 'transfers';
    if (currentPath.includes('count') || currentPath.includes('audit')) tab = 'counts';
    if (currentPath.includes('staging') || currentPath.includes('dock')) tab = 'staging';
    return <WarehousesPage onNavigate={onNavigate} defaultTab={tab} />;
  }

  if (
    currentPath === '/operations/procurement' ||
    currentPath.startsWith('/operations/procurement')
  ) {
    let tab: 'requisitions' | 'orders' | 'receipts' = 'requisitions';
    if (currentPath.includes('order') || currentPath.includes('po')) tab = 'orders';
    if (currentPath.includes('receipt') || currentPath.includes('grn')) tab = 'receipts';
    return <ProcurementModule initialTab={tab} />;
  }

  if (
    currentPath === '/operations/batches' ||
    currentPath.startsWith('/operations/batches') ||
    currentPath.startsWith('/operations/traceability')
  ) {
    return <BatchModule />;
  }

  if (
    currentPath === '/operations/quality' ||
    currentPath.startsWith('/operations/quality')
  ) {
    return <QualityModule />;
  }

  if (
    currentPath === '/operations/production' ||
    currentPath.startsWith('/operations/production')
  ) {
    return <ProductionModule />;
  }

  if (
    currentPath === '/operations/manufacturing' ||
    currentPath.startsWith('/operations/manufacturing') ||
    currentPath === '/operations/formulations' ||
    currentPath.startsWith('/operations/formulations')
  ) {
    return <FormulationModule />;
  }

  if (currentPath === '/operations/quality') {
    return (
      <ModulePlaceholder
        title="Quality Assurance & QC"
        subtitle="In-process quality inspections, quarantine holds, and Certificate of Analysis (COA) compliance."
        plannedPhase="Phase 6"
        icon={<Factory className="w-5 h-5 text-slate-700" />}
        parentPath="/operations"
        parentTitle="Operations Overview"
        onNavigate={onNavigate}
        plannedDeliverables={[
          'Inward raw material sampling plans and inspection checklists',
          'In-process parameter verification (pH, viscosity, temperature, tensile)',
          'Quarantine hold placement and release authorization for manufactured batches',
          'Certificate of Analysis (COA) generation and customer specification matching',
        ]}
        subsystems={[
          'Inspection Checklist Engine',
          'Quarantine & Release Matrix',
          'Certificate of Analysis (COA)',
          'Non-Conformance Report (NCR)',
        ]}
        architecturalNotes="Batches failing mandatory QC thresholds are automatically locked from dispatch allocation."
      />
    );
  }

  if (currentPath === '/operations/warehouse') {
    return (
      <ModulePlaceholder
        title="Warehouse Logistics"
        subtitle="Facility storage layouts, aisle-bin mapping, dock operations, and inter-depot stock transfer orders."
        plannedPhase="Phase 4"
        icon={<Factory className="w-5 h-5 text-slate-700" />}
        parentPath="/operations"
        parentTitle="Operations Overview"
        onNavigate={onNavigate}
        plannedDeliverables={[
          'Warehouse bin and rack location indexing with volumetric capacity rules',
          'Directed put-away logic and optimized wave pick path planning',
          'Inter-warehouse Stock Transfer Orders (STO) with transit tracking',
          'Cycle counting workflows and barcode mobile scanner integration',
        ]}
        subsystems={[
          'Bin & Rack Location Master',
          'Pick, Pack & Ship Dispatcher',
          'Stock Transfer Orders (STO)',
          'Cycle Counting & Barcode Scanning',
        ]}
        architecturalNotes="Phase 1 implements the base warehouses PostgreSQL schema; detailed bin mapping follows in Phase 4."
      />
    );
  }

  return (
    <ModulePlaceholder
      title="Operations & Manufacturing"
      subtitle="Production floor management, multi-level BOM formulations, batch execution, and quality control."
      plannedPhase="Phase 4 / Phase 6"
      icon={<Factory className="w-5 h-5 text-slate-700" />}
      parentPath="/command-center"
      parentTitle="Command Center"
      onNavigate={onNavigate}
      plannedDeliverables={[
        'Formulation engine and multi-level Bills of Materials (BOM)',
        'Production batch planning, work order issuance, and routing steps',
        'In-process quality inspection checkpoints and quarantine workflows',
        'Physical warehouse bin management, stock aging, and batch traceability',
      ]}
      subsystems={[
        'BOM & Formulation Architect',
        'Work Order Dispatch & Routing',
        'Batch Lifecycle & Traceability',
        'Quality Assurance & COA Quarantine',
        'Warehouse Storage Master',
      ]}
      architecturalNotes="Phase 1 implements the foundational warehouses entity schema in PostgreSQL; production workflows will be introduced in Phase 4 and Phase 6."
    />
  );
}
