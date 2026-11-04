import { ModulePlaceholder } from './ModulePlaceholder';
import { Truck } from 'lucide-react';
import { CFModule } from './cf/CFModule';
import { DistributorModule } from './distributors/DistributorModule';
import { RetailerModule } from './retailers/RetailerModule';
import { FieldSalesModule } from './field-sales/FieldSalesModule';

export interface DistributionPageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function DistributionPage({ currentPath = '/distribution', onNavigate }: DistributionPageProps) {
  if (currentPath === '/distribution/cf' || currentPath.startsWith('/distribution/cf')) {
    return <CFModule />;
  }

  if (currentPath === '/distribution/distributors' || currentPath.startsWith('/distribution/distributors')) {
    return <DistributorModule />;
  }

  if (currentPath === '/distribution/retailers' || currentPath.startsWith('/distribution/retailers')) {
    return <RetailerModule />;
  }

  if (currentPath === '/distribution/field-sales' || currentPath.startsWith('/distribution/field-sales')) {
    return <FieldSalesModule />;
  }

  return (
    <ModulePlaceholder
      title="Distribution & Field Sales"
      subtitle="C&F management, multi-tier distributor operations, retailer onboarding, and field sales tracking."
      plannedPhase="Phase 7"
      icon={<Truck className="w-5 h-5 text-slate-700" />}
      parentPath="/command-center"
      parentTitle="Command Center"
      onNavigate={onNavigate}
      plannedDeliverables={[
        'Carrying & Forwarding (C&F) agent contracts, depot stock allocations, and reconciliations',
        'Distributor hierarchy, credit limits, discount matrices, and secondary order capture',
        'Retailer database, geolocation verification, and KYC records',
        'Field sales beat planning, GPS attendance, van sales, and instant order booking',
      ]}
      subsystems={[
        'C&F Depot Network',
        'Distributor Partner Portal',
        'Retailer Master Registry',
        'Field Sales Beat & Van Routing',
      ]}
      architecturalNotes="The mobile-responsive viewport foundation established in Phase 1 ensures readiness for future field sales mobile device usage."
    />
  );
}
