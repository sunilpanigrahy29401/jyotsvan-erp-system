import { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ENV } from '../../config/env';
import { databaseService } from '../../services/database';
import { insforgeService } from '../../services/insforge';
import {
  Database,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Users,
  Key,
  Webhook,
  Warehouse,
  Sliders,
  ScrollText,
  Building2,
  Building,
  Briefcase,
  Box,
  Scale,
  ArrowRight,
  Shield,
  UserCheck,
  Bell,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ModulePlaceholder } from './ModulePlaceholder';
import { UsersSettings } from './settings/UsersSettings';
import { RolesSettings } from './settings/RolesSettings';
import { AuditLogsSettings } from './settings/AuditLogsSettings';
import { OrganizationSettings } from './settings/OrganizationSettings';
import { BranchesSettings } from './settings/BranchesSettings';
import { DepartmentsSettings } from './settings/DepartmentsSettings';
import { WarehousesSettings } from './settings/WarehousesSettings';
import { WarehouseLocationsSettings } from './settings/WarehouseLocationsSettings';
import { UnitsSettings } from './settings/UnitsSettings';
import { BusinessSettingsPage } from './settings/BusinessSettingsPage';
import { ProductsPage } from './products/ProductsPage';
import { IntegrationsSettings } from './settings/IntegrationsSettings';

export interface SettingsPageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function SettingsPage({ currentPath = '/settings', onNavigate }: SettingsPageProps) {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [healthStatus, setHealthStatus] = useState<{ status: string; message: string }>({
    status: 'checking',
    message: 'Evaluating connection status...',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkConnection = async () => {
    setIsRefreshing(true);
    const res = await insforgeService.checkHealth();
    setHealthStatus(res);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (currentPath === '/settings') {
      checkConnection();
    }
  }, [currentPath]);

  const [basePath, queryString] = currentPath.split('?');
  const queryParams = new URLSearchParams(queryString || '');
  const initialWarehouseId = queryParams.get('warehouse') || undefined;

  // Subroutes for Settings

  // 1. Users & Identity Management
  if (basePath === '/settings/users') {
    return (
      <PageContainer
        title="Enterprise User Directory"
        description="Manage personnel accounts, branch access scopes, credential statuses, and security tokens."
        phaseBadge="Phase 3 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <UsersSettings />
      </PageContainer>
    );
  }

  // 2. Roles & Permissions (RBAC)
  if (basePath === '/settings/roles') {
    return (
      <PageContainer
        title="Role-Based Access Control (RBAC)"
        description="Configure operational roles, define granular module tokens, and audit capability matrices."
        phaseBadge="Phase 3 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <RolesSettings />
      </PageContainer>
    );
  }

  // 3. Immutable Audit Logs
  if (basePath === '/settings/audit-logs') {
    return (
      <PageContainer
        title="Compliance & Security Audit Trail"
        description="Immutable, append-only historical audit trail tracking state diffs, operator actions, and SHA-256 hash chains."
        phaseBadge="Phase 23 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <AuditLogsSettings />
      </PageContainer>
    );
  }

  // 4. Enterprise Organization Profile
  if (basePath === '/settings/organization') {
    return (
      <PageContainer
        title="Organization Profile & Identity"
        description="Legal enterprise identity, GSTIN/VAT registrations, fiscal currency parameters, and sovereign branch partition."
        phaseBadge="Phase 4 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <OrganizationSettings onNavigate={onNavigate} />
      </PageContainer>
    );
  }

  // 5. Operating Branches & Plants
  if (basePath === '/settings/branches') {
    return (
      <PageContainer
        title="Branches & Plant Facilities"
        description="Multi-facility corporate structure, manufacturing plants, regional offices, and retail hubs."
        phaseBadge="Phase 4 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <BranchesSettings />
      </PageContainer>
    );
  }

  // 6. Departments & Cost Centers
  if (basePath === '/settings/departments') {
    return (
      <PageContainer
        title="Organizational Departments"
        description="Corporate operational divisions, cost centers, and branch-level team structures."
        phaseBadge="Phase 4 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <DepartmentsSettings />
      </PageContainer>
    );
  }

  // 7. Warehouses & Physical Facilities
  if (basePath === '/settings/warehouses') {
    return (
      <PageContainer
        title="Warehouse Facilities Registry"
        description="Physical warehouse facility directory, storage zones, dock locations, and branch mappings."
        phaseBadge="Phase 4 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <WarehousesSettings
          onNavigateToLocations={(whId) => onNavigate?.(`/settings/locations?warehouse=${whId}`)}
        />
      </PageContainer>
    );
  }

  // 8. Warehouse Locations & Storage Bins
  if (basePath === '/settings/locations') {
    return (
      <PageContainer
        title="Warehouse Locations & Storage Bins"
        description="Granular storage topology, zones, aisles, racks, shelves, and bins for directed putaway."
        phaseBadge="Phase 4 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings/warehouses')}
            className="text-xs"
          >
            &larr; Warehouses
          </Button>
        }
      >
        <WarehouseLocationsSettings initialWarehouseId={initialWarehouseId} />
      </PageContainer>
    );
  }

  // 9. Units of Measurement
  if (basePath === '/settings/units') {
    return (
      <PageContainer
        title="Units of Measurement (UOM)"
        description="Standardized physical measurement units, discrete counts, mass, volume, and packaging ratios."
        phaseBadge="Phase 4 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <UnitsSettings />
      </PageContainer>
    );
  }

  // 9b. Master Product & SKU Master
  if (basePath === '/settings/products') {
    return (
      <PageContainer
        title="Product & SKU Master Registry"
        description="Canonical master product identity, multi-variant 1:N SKU matrix, packaging specifications, and omni-channel mappings."
        phaseBadge="Phase 6 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <ProductsPage onNavigate={onNavigate} />
      </PageContainer>
    );
  }

  // 10. Global Business Settings
  if (basePath === '/settings/business') {
    return (
      <PageContainer
        title="Business Parameters & Operational Defaults"
        description="Enterprise operating currencies, timezones, fiscal year cycles, and standard measurement anchors."
        phaseBadge="Phase 4 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <BusinessSettingsPage />
      </PageContainer>
    );
  }

  // 11. Integrations Hub (Phase 24 Live)
  if (basePath === '/settings/integrations') {
    return (
      <PageContainer
        title="Enterprise Integration Hub"
        description="Third-party API credentials, webhook endpoints, server proxies, and electronic data interchange (EDI)."
        phaseBadge="Phase 24 Live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/settings')}
            className="text-xs"
          >
            &larr; Settings Overview
          </Button>
        }
      >
        <IntegrationsSettings />
      </PageContainer>
    );
  }

  const schemaStats = databaseService.getFoundationSchemaStats();

  const docFiles = [
    { title: 'Project Specification', path: '/docs/PROJECT_SPEC.md', desc: 'Overall roadmap & purpose' },
    { title: 'Architecture Specification', path: '/docs/ARCHITECTURE.md', desc: 'Modular monolith principles' },
    { title: 'Database Schema', path: '/docs/DATABASE_SCHEMA.md', desc: 'PostgreSQL foundation tables' },
    { title: 'Design System & UI', path: '/docs/DESIGN_SYSTEM.md', desc: 'Enterprise design tokens' },
    { title: 'Permissions Matrix', path: '/docs/PERMISSIONS.md', desc: 'RBAC structure & capability tokens' },
    { title: 'QA & Verification', path: '/docs/QA_CHECKLIST.md', desc: 'Verification scenarios & test matrix' },
  ];

  const quickNavModules = [
    {
      title: 'Enterprise Organization Profile',
      desc: 'Legal corporate parameters, tax identifier, and tenant isolation',
      path: '/settings/organization',
      icon: <Building2 className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 4 Live',
    },
    {
      title: 'Branches & Plant Facilities',
      desc: 'Corporate offices, manufacturing plants, regional hubs, and branch isolation',
      path: '/settings/branches',
      icon: <Building className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 4 Live',
    },
    {
      title: 'Departments & Cost Centers',
      desc: 'Organizational divisions, branch cost centers, and departmental staff structures',
      path: '/settings/departments',
      icon: <Briefcase className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 4 Live',
    },
    {
      title: 'Warehouse Facilities Registry',
      desc: 'Physical storage depots, manufacturing plant storehouses, and logistics centers',
      path: '/settings/warehouses',
      icon: <Warehouse className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 4 Live',
    },
    {
      title: 'Storage Locations & Bins',
      desc: 'Granular aisles, racks, shelves, and storage bin coordinates inside facilities',
      path: '/settings/locations',
      icon: <Box className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 4 Live',
    },
    {
      title: 'Units of Measure (UOM)',
      desc: 'Standardized measurement units for raw materials, batches, mass, volume, and counts',
      path: '/settings/units',
      icon: <Scale className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 4 Live',
    },
    {
      title: 'Global Business Parameters',
      desc: 'Operating currency, timezone, fiscal year schedule, and measurement anchors',
      path: '/settings/business',
      icon: <Sliders className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 4 Live',
    },
    {
      title: 'Users & Identity Management',
      desc: 'Directory of enterprise accounts, facility scoping, and account states',
      path: '/settings/users',
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 3 Live',
    },
    {
      title: 'Roles & Permissions (RBAC)',
      desc: 'Configure security roles and map granular domain capability tokens',
      path: '/settings/roles',
      icon: <Key className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 3 Live',
    },
    {
      title: 'Compliance & Audit Trail',
      desc: 'Immutable append-only record of security and authorization events',
      path: '/settings/audit-logs',
      icon: <ScrollText className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 3 Live',
    },
    {
      title: 'Central Notification Center',
      desc: 'Operational alerts, approval requests, event simulation, and in-app channel routing preferences',
      path: '/notifications',
      icon: <Bell className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 22 Live',
    },
    {
      title: 'Enterprise Integration Hub',
      desc: 'Third-party marketplaces, webhooks, secure credential vault, and partner EDI connections',
      path: '/settings/integrations',
      icon: <Webhook className="w-5 h-5 text-indigo-600" />,
      badge: 'Phase 24 Live',
    },
  ];

  return (
    <PageContainer
      title="Settings & Foundation Diagnostics"
      description="Enterprise organization master data, facility topology, role-based access control, and platform telemetry."
      phaseBadge="Phase 4 Live"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            checkConnection();
            showToast('Diagnostics Refreshed', 'info');
          }}
          disabled={isRefreshing}
          className="text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Diagnostics
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Quick Testing Persona Simulator Banner */}
        <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white shadow-xs">
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>Signed in as: {currentUser?.full_name}</span>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0">
                    {currentUser?.roles?.map((r) => r.name).join(', ') || 'Standard User'}
                  </Badge>
                  {currentUser?.is_super_admin && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] py-0">
                      Super Admin
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Your access is determined by the roles assigned to your account. Ask an administrator to change them.
                </p>
              </div>
            </div>


          </CardContent>
        </Card>

        {/* Core Administrative Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNavModules.map((item) => (
            <Card
              key={item.path}
              className="border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
              onClick={() => onNavigate?.(item.path)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-indigo-50 transition-colors">
                    {item.icon}
                  </div>
                  <Badge variant="outline" className="text-[10px] py-0">
                    {item.badge}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* InsForge Platform Connection Status */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-700" />
                  InsForge Platform Connection
                </CardTitle>
                <Badge variant={ENV.isInsforgeConfigured ? 'default' : 'secondary'}>
                  {ENV.isInsforgeConfigured ? 'Configured' : 'Foundation Mode'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Backend environment and PostgreSQL connectivity status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Project Identifier:</span>
                  <span className="text-slate-900 font-semibold">{ENV.projectId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">API Gateway:</span>
                  <span className="text-slate-900 truncate max-w-[220px]">{ENV.apiUrl}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-100 bg-white">
                {healthStatus.status === 'connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 text-xs">Connection Telemetry</p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{healthStatus.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Foundation Tables */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  PostgreSQL Schema Registry
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {schemaStats.tables.length} Schema Tables
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Foundation, RBAC & Organization master entities actively maintained in `/src/database/schema.sql`
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs max-h-48 overflow-y-auto scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Table Name</th>
                      <th className="py-2 px-3">Records</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                    {schemaStats.tables.map((tbl) => (
                      <tr key={tbl.name} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-3 font-semibold text-slate-900">{tbl.name}</td>
                        <td className="py-1.5 px-3 text-slate-500">{tbl.count}</td>
                        <td className="py-1.5 px-3 text-right font-sans">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Architecture Documentation Source of Truth */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              Project Documentation & Architectural Source of Truth
            </CardTitle>
            <CardDescription className="text-xs">
              Controlled phase documentation governing Jyotsvan enterprise architecture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {docFiles.map((doc) => (
                <div
                  key={doc.path}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900">{doc.title}</span>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      Markdown
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">{doc.desc}</p>
                  <span className="text-[10px] font-mono text-slate-400 block pt-1">{doc.path}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
