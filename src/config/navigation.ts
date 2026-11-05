import type { NavItem, NavChild, BreadcrumbItem, PageMeta } from '../types/navigation';
import type { AuthUser } from '../types/auth';
import { accessControlService } from '../services/accessControl';

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'command-center',
    title: 'Command Center',
    path: '/command-center',
    iconName: 'LayoutDashboard',
    plannedPhase: 'Phase 2 Shell Active',
    requiredPermission: 'command_center.view',
    description: 'Unified executive cockpit aggregating operational and strategic telemetry across all business units.',
  },
  {
    id: 'business',
    title: 'Business',
    path: '/business',
    iconName: 'Briefcase',
    plannedPhase: 'Phase 3 / 5',
    requiredPermission: 'organization.view',
    description: 'Enterprise governance, legal entities, multi-branch master data, and corporate reporting.',
    children: [
      {
        id: 'business-overview',
        title: 'Business Overview',
        path: '/business/overview',
        plannedPhase: 'Phase 3',
        requiredPermission: 'organization.view',
        description: 'High-level business telemetry, corporate entities, and executive snapshots.',
      },
      {
        id: 'business-reports',
        title: 'Reports',
        path: '/business/reports',
        plannedPhase: 'Phase 5',
        requiredPermission: 'reports.view',
        description: 'Comprehensive financial, regulatory, and multi-facility compliance reports.',
      },
      {
        id: 'business-analytics',
        title: 'Analytics',
        path: '/business/analytics',
        plannedPhase: 'Phase 5',
        requiredPermission: 'analytics.view',
        description: 'Cross-functional operational performance, profitability metrics, and cohort analysis.',
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    path: '/marketing',
    iconName: 'Megaphone',
    plannedPhase: 'Phase 10',
    requiredPermission: 'marketing.view',
    description: 'Unified omni-channel advertising intelligence, attribution modeling, and campaign analytics.',
    children: [
      {
        id: 'marketing-overview',
        title: 'Marketing Overview',
        path: '/marketing',
        plannedPhase: 'Phase 10',
        requiredPermission: 'marketing.view',
        description: 'Blended ROAS, multi-channel advertising performance, and customer acquisition cost tracker.',
      },
      {
        id: 'marketing-meta',
        title: 'Meta Ads',
        path: '/marketing/meta',
        plannedPhase: 'Phase 10',
        requiredPermission: 'marketing.manage_campaigns',
        description: 'Facebook & Instagram ad campaign metrics, creative ROAS, and live spending controls.',
      },
      {
        id: 'marketing-google',
        title: 'Google Ads',
        path: '/marketing/google',
        plannedPhase: 'Phase 10',
        requiredPermission: 'marketing.manage_campaigns',
        description: 'Google Search, Shopping, and Performance Max campaign telemetry and conversion tracking.',
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Sales',
    path: '/crm',
    iconName: 'UserCheck',
    plannedPhase: 'Phase 21b Live',
    requiredPermission: 'crm.view',
    description: 'Enterprise commercial relationship management, omnichannel lead ingestion, B2B deal pipelines, and customer 360.',
    children: [
      {
        id: 'crm-overview',
        title: 'Command Center',
        path: '/crm/overview',
        plannedPhase: 'Phase 21b Live',
        requiredPermission: 'crm.view',
        description: 'CRM executive cockpit, pipeline velocity, lead funnel conversion, and weighted revenue forecast.',
      },
      {
        id: 'crm-leads',
        title: 'Leads',
        path: '/crm/leads',
        plannedPhase: 'Phase 21b Live',
        requiredPermission: 'crm.view',
        description: 'Omnichannel lead directory, qualification scoring, round-robin assignment, and transaction-safe conversion.',
      },
      {
        id: 'crm-accounts',
        title: 'Accounts & Contacts',
        path: '/crm/accounts',
        plannedPhase: 'Phase 21b Live',
        requiredPermission: 'crm.view',
        description: 'B2B enterprise accounts, contact directory, customer 360 dossiers, and operational entity linking.',
      },
      {
        id: 'crm-deals',
        title: 'Deals & Pipeline',
        path: '/crm/deals',
        plannedPhase: 'Phase 21b Live',
        requiredPermission: 'crm.view',
        description: 'Interactive visual deal Kanban, customizable pipeline stages, win/loss analytics, and Sales handoff.',
      },
      {
        id: 'crm-activities',
        title: 'Activities & Engagement',
        path: '/crm/activities',
        plannedPhase: 'Phase 21b Live',
        requiredPermission: 'crm.view',
        description: 'Unified customer interaction timeline, phone call logs, scheduled meetings, tasks, and follow-up reminders.',
      },
      {
        id: 'crm-integrations',
        title: 'Lead Capture & Integrations',
        path: '/crm/integrations',
        plannedPhase: 'Phase 21b Live',
        requiredPermission: 'crm.view',
        description: 'Public webform intake endpoint, IndiaMART connector, Meta/Google lead webhooks, and Shopify sync.',
      },
    ],
  },
  {
    id: 'commerce',
    title: 'Commerce',
    path: '/commerce',
    iconName: 'ShoppingBag',
    plannedPhase: 'Phase 9',
    requiredPermission: 'commerce.view',
    description: 'Omni-channel synchronization across direct-to-consumer websites and online marketplaces.',
    children: [
      {
        id: 'commerce-overview',
        title: 'Commerce Overview',
        path: '/commerce',
        plannedPhase: 'Phase 9',
        requiredPermission: 'commerce.view',
        description: 'Consolidated sales channel dispatch status, stock reservations, and multi-store metrics.',
      },
      {
        id: 'commerce-shopify',
        title: 'Shopify Storefront',
        path: '/commerce/shopify',
        plannedPhase: 'Phase 25 Live',
        requiredPermission: 'commerce.manage_channels',
        description: 'Direct-to-consumer store orders, catalog sync, webhooks, and live fulfillment pipeline.',
      },
      {
        id: 'commerce-marketplaces',
        title: 'Marketplaces',
        path: '/commerce/marketplaces',
        plannedPhase: 'Phase 9',
        requiredPermission: 'commerce.manage_channels',
        description: 'Centralized multi-marketplace channel hub and unified stock allocation manager.',
        children: [
          {
            id: 'marketplace-overview',
            title: 'Marketplace Overview',
            path: '/commerce/marketplaces/overview',
            plannedPhase: 'Phase 9',
            requiredPermission: 'commerce.manage_channels',
            description: 'Cross-marketplace fulfillment health, commission reconciliation, and order ingestion rate.',
          },
          {
            id: 'marketplace-amazon',
            title: 'Amazon',
            path: '/commerce/marketplaces/amazon',
            plannedPhase: 'Phase 9',
            requiredPermission: 'commerce.manage_channels',
            description: 'Amazon SP-API integration, FBA & FBM inventory synchronization, and buy-box monitoring.',
          },
          {
            id: 'marketplace-flipkart',
            title: 'Flipkart',
            path: '/commerce/marketplaces/flipkart',
            plannedPhase: 'Phase 9',
            requiredPermission: 'commerce.manage_channels',
            description: 'Flipkart fulfillment hub, SLA dispatch scheduling, and commission statements.',
          },
          {
            id: 'marketplace-myntra',
            title: 'Myntra',
            path: '/commerce/marketplaces/myntra',
            plannedPhase: 'Phase 9',
            requiredPermission: 'commerce.manage_channels',
            description: 'Myntra Partner Bridge, fashion catalog sync, and omni-channel stock reservation.',
          },
        ],
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    path: '/operations',
    iconName: 'Factory',
    plannedPhase: 'Phase 4 / 6',
    description: 'Manufacturing floor management, formulation engine, inventory registers, and depot logistics.',
    children: [
      {
        id: 'operations-products',
        title: 'Product & SKU Master',
        path: '/operations/products',
        plannedPhase: 'Phase 6 Live',
        requiredPermission: 'products.view',
        description: 'Canonical master product identity, multi-variant 1:N SKU matrix, packaging specifications, and omni-channel mappings.',
      },
      {
        id: 'operations-suppliers',
        title: 'Supplier Master',
        path: '/operations/suppliers',
        plannedPhase: 'Phase 7 Live',
        requiredPermission: 'suppliers.view',
        description: 'Vendor profiles, contact directory, multi-facility addresses, canonical SKU mappings, contract rate cards, and compliance documents.',
      },
      {
        id: 'operations-procurement',
        title: 'Procurement',
        path: '/operations/procurement',
        plannedPhase: 'Phase 5 Live',
        requiredPermission: 'procurement.view',
        description: 'Purchase requisitions (PR), supplier RFQs, purchase orders (PO), and Goods Receipt Notes (GRN).',
        children: [
          {
            id: 'procurement-requisitions',
            title: 'Purchase Requests',
            path: '/operations/procurement/requisitions',
            plannedPhase: 'Phase 5 Live',
            requiredPermission: 'procurement.view',
            description: 'Internal material requisitions, department approvals, and PO conversion.',
          },
          {
            id: 'procurement-orders',
            title: 'Purchase Orders',
            path: '/operations/procurement/orders',
            plannedPhase: 'Phase 5 Live',
            requiredPermission: 'procurement.view',
            description: 'Vendor commercial purchasing orders, approval limits, and dispatch status.',
          },
          {
            id: 'procurement-grn',
            title: 'Goods Receipts (GRN)',
            path: '/operations/procurement/receipts',
            plannedPhase: 'Phase 5 Live',
            requiredPermission: 'procurement.view',
            description: 'Dock inwarding, quality inspection breakdown, and automatic perpetual inventory posting.',
          },
        ],
      },
      {
        id: 'operations-inventory',
        title: 'Inventory',
        path: '/operations/inventory',
        plannedPhase: 'Phase 4',
        requiredPermission: 'inventory.view',
        description: 'Real-time stock valuation, serial/batch registers, stock movements, and low stock threshold alerts.',
      },
      {
        id: 'operations-manufacturing',
        title: 'BOM / Formulations',
        path: '/operations/manufacturing',
        plannedPhase: 'Phase 12 Live',
        requiredPermission: 'formulations.view',
        description: 'Master recipe formulations, multi-level Bills of Materials (BOM), version control, circular reference detection, and linear batch scaling simulation.',
      },
      {
        id: 'operations-production',
        title: 'Manufacturing / Production',
        path: '/operations/production',
        plannedPhase: 'Phase 13 Live',
        requiredPermission: 'production.view',
        description: 'Production plans, work orders, material staging, batch execution workbench, yield variance, and QC handoff.',
      },
      {
        id: 'operations-quality',
        title: 'Quality Control',
        path: '/operations/quality',
        plannedPhase: 'Phase 6 Live',
        requiredPermission: 'quality.view',
        description: 'Inward sampling, analytical parameter testing, quarantine holds, and release authorization.',
      },
      {
        id: 'operations-batches',
        title: 'Batch & Traceability',
        path: '/operations/batches',
        plannedPhase: 'Phase 14 Live',
        requiredPermission: 'batches.view',
        description: 'Multi-tier genealogy, forward & backward recall blast radius, FEFO shelf-life tracking, and QC quarantine containment.',
      },
      {
        id: 'operations-warehouse',
        title: 'Warehouse',
        path: '/operations/warehouse',
        plannedPhase: 'Phase 4',
        requiredPermission: 'warehouse.view',
        description: 'Facility storage layouts, aisle-bin mapping, dock operations, and inter-depot stock transfer orders.',
      },
    ],
  },
  {
    id: 'distribution',
    title: 'Distribution',
    path: '/distribution',
    iconName: 'Truck',
    plannedPhase: 'Phase 7',
    description: 'Supply chain delivery networks, Carrying & Forwarding (C&F) depots, and retailer beat tracking.',
    children: [
      {
        id: 'distribution-cf',
        title: 'C&F',
        path: '/distribution/cf',
        plannedPhase: 'Phase 15 Live',
        requiredPermission: 'cfs.view',
        description: 'Carrying & Forwarding depot allocations, stock custody agreements, plant transfers, and consignment returns.',
      },
      {
        id: 'distribution-distributors',
        title: 'Distributors',
        path: '/distribution/distributors',
        plannedPhase: 'Phase 16 Live',
        requiredPermission: 'distributors.view',
        description: 'Authorized regional distributors, territory allocations, C&F dispatches, commercial credit limits, and channel stock.',
      },
      {
        id: 'distribution-retailers',
        title: 'Retailers',
        path: '/distribution/retailers',
        plannedPhase: 'Phase 17 Live',
        requiredPermission: 'retailers.view',
        description: 'Retail merchant directory, multi-distributor fulfillment hierarchy, channel inventory, replenishment orders, and field sales engagement.',
      },
      {
        id: 'distribution-field-sales',
        title: 'Field Sales',
        path: '/distribution/field-sales',
        plannedPhase: 'Phase 20 Live',
        requiredPermission: 'field_sales.view',
        description: 'Beat planning, GPS attendance, on-site distributor/retailer visits, order booking, collections, targets, and field activity.',
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    path: '/finance',
    iconName: 'Landmark',
    plannedPhase: 'Phase 8 / 11',
    description: 'Fiscal accounting, government e-invoicing, accounts receivable, and general ledger reconciliation.',
    children: [
      {
        id: 'finance-orders',
        title: 'Sales Orders',
        path: '/finance/orders',
        plannedPhase: 'Phase 8',
        requiredPermission: 'invoices.view',
        description: 'Sales order dispatch authorization, credit approval checks, and proforma generation.',
      },
      {
        id: 'finance-invoices',
        title: 'Invoices',
        path: '/finance/invoices',
        plannedPhase: 'Phase 8',
        requiredPermission: 'invoices.view',
        description: 'Tax invoices, E-Way Bill numbers, government IRN generation, and GST/VAT ledger.',
      },
      {
        id: 'finance-payments',
        title: 'Payments',
        path: '/finance/payments',
        plannedPhase: 'Phase 8',
        requiredPermission: 'payments.view',
        description: 'Payment gateway reconciliation, bank transfers, cheque clearing, and receipt generation.',
      },
      {
        id: 'finance-collections',
        title: 'Collections',
        path: '/finance/collections',
        plannedPhase: 'Phase 8',
        requiredPermission: 'finance.view',
        description: 'Field sales cash collections, distributor deposit tracking, and credit note settlement.',
      },
      {
        id: 'finance-outstanding',
        title: 'Outstanding',
        path: '/finance/outstanding',
        plannedPhase: 'Phase 8',
        requiredPermission: 'finance.view',
        description: 'Accounts Receivable (AR) aging analysis (30/60/90+ days) and automated dunning alerts.',
      },
      {
        id: 'finance-expenses',
        title: 'Expenses',
        path: '/finance/expenses',
        plannedPhase: 'Phase 11',
        requiredPermission: 'finance.view',
        description: 'Operational operating expenses (OPEX), procurement payables (AP), and cost center allocation.',
      },
    ],
  },
  {
    id: 'people',
    title: 'People',
    path: '/people',
    iconName: 'Users',
    plannedPhase: 'Phase 21 Live',
    requiredPermission: 'employees.view',
    description: 'Human capital management, employee directory, shift rosters, attendance, leave, tasks, targets, and organizational hierarchy.',
    children: [
      {
        id: 'people-overview',
        title: 'HR Overview',
        path: '/people/overview',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Executive HR command center, headcount analytics, daily attendance muster snapshot, and quick actions.',
      },
      {
        id: 'people-employees',
        title: 'Employees & Org',
        path: '/people/employees',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Staff directory, 360 employee profile, organizational tree, designation matrices, and department assignments.',
      },
      {
        id: 'people-attendance',
        title: 'Time & Attendance',
        path: '/people/attendance',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Daily attendance punch register, hours tracking, and regularized attendance correction workflow.',
      },
      {
        id: 'people-leave',
        title: 'Leave Management',
        path: '/people/leave',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Leave balance ledger, leave request application, supervisory approval, and auto-attendance sync.',
      },
      {
        id: 'people-payroll',
        title: 'Payroll & Compensation',
        path: '/people/payroll',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'payroll.view',
        description: 'Monthly payroll runs, statutory deductions (PF, ESIC, PT, TDS), payslips register, and Finance JV handoff.',
      },
      {
        id: 'people-shifts',
        title: 'Shifts & Rosters',
        path: '/people/shifts',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Work shift definitions, grace periods, rotational assignments, and company holiday calendar.',
      },
      {
        id: 'people-performance',
        title: 'Performance & Reviews',
        path: '/people/performance',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Employee KPI target tracking, quarterly appraisal reviews, performance ratings, and feedback.',
      },
      {
        id: 'people-tasks',
        title: 'Workforce Tasks',
        path: '/people/tasks',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Operational workforce task assignments, cross-department checklists, and resolution tracking.',
      },
      {
        id: 'people-ess',
        title: 'Employee Self-Service',
        path: '/people/ess',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Employee self-service desk for personal attendance punch, leave applications, personal payslips, and notices.',
      },
      {
        id: 'people-workflows',
        title: 'HR Workflows & Exits',
        path: '/people/requests',
        plannedPhase: 'Phase 21 Live',
        requiredPermission: 'employees.view',
        description: 'Internal employee service requests, resignation offboarding, department clearance workflows, and company broadcasts.',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI Intelligence',
    path: '/ai',
    iconName: 'Sparkles',
    plannedPhase: 'Phase 12',
    requiredPermission: 'ai.view',
    description: 'Enterprise AI intelligence, predictive demand forecasts, and operational anomaly detection.',
    children: [
      {
        id: 'ai-copilot',
        title: 'AI Copilot',
        path: '/ai/copilot',
        plannedPhase: 'Phase 12',
        requiredPermission: 'ai.view',
        description: 'Server-side Gemini AI copilot for natural language enterprise data queries and operational advice.',
      },
      {
        id: 'ai-insights',
        title: 'Insights',
        path: '/ai/insights',
        plannedPhase: 'Phase 12',
        requiredPermission: 'ai.view',
        description: 'Automated executive insights highlighting production bottlenecks and high-margin product trends.',
      },
      {
        id: 'ai-recommendations',
        title: 'Recommendations',
        path: '/ai/recommendations',
        plannedPhase: 'Phase 12',
        requiredPermission: 'ai.view',
        description: 'Predictive inventory reorder recommendations, safety stock triggers, and formulation optimization.',
      },
      {
        id: 'ai-alerts',
        title: 'Alerts',
        path: '/ai/alerts',
        plannedPhase: 'Phase 12',
        requiredPermission: 'ai.view',
        description: 'Proactive detection of supply lead-time delays, abnormal batch scrap rates, and payment defaults.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    path: '/settings',
    iconName: 'Settings',
    plannedPhase: 'Phase 1 / 3',
    description: 'Enterprise settings, security governance, InsForge database status, and audit logs.',
    children: [
      {
        id: 'settings-organization',
        title: 'Organization',
        path: '/settings/organization',
        plannedPhase: 'Phase 4 Live',
        requiredPermission: 'organization.view',
        description: 'Enterprise legal entities, GSTIN/VAT registrations, corporate identity, and currency standards.',
      },
      {
        id: 'settings-branches',
        title: 'Branches & Plants',
        path: '/settings/branches',
        plannedPhase: 'Phase 4 Live',
        requiredPermission: 'branches.view',
        description: 'Corporate headquarters, manufacturing plants, regional offices, and retail branch entities.',
      },
      {
        id: 'settings-departments',
        title: 'Departments',
        path: '/settings/departments',
        plannedPhase: 'Phase 4 Live',
        requiredPermission: 'departments.view',
        description: 'Organizational divisions, branch cost centers, and departmental staff structures.',
      },
      {
        id: 'settings-warehouses',
        title: 'Warehouses',
        path: '/settings/warehouses',
        plannedPhase: 'Phase 4 Live',
        requiredPermission: 'warehouses.view',
        description: 'Physical storage depots, manufacturing plant storehouses, and logistics distribution centers.',
      },
      {
        id: 'settings-locations',
        title: 'Warehouse Locations',
        path: '/settings/locations',
        plannedPhase: 'Phase 4 Live',
        requiredPermission: 'locations.view',
        description: 'Specific aisles, racks, shelves, and storage bin locations inside warehouse facilities.',
      },
      {
        id: 'settings-units',
        title: 'Units of Measure',
        path: '/settings/units',
        plannedPhase: 'Phase 4 Live',
        requiredPermission: 'units.view',
        description: 'Standardized physical units of measurement (UOM), weight, volume, length, and packaging ratios.',
      },
      {
        id: 'settings-products',
        title: 'Product & SKU Master',
        path: '/settings/products',
        plannedPhase: 'Phase 6 Live',
        requiredPermission: 'products.view',
        description: 'Canonical master product identity, multi-variant 1:N SKU matrix, packaging specifications, and omni-channel mappings.',
      },
      {
        id: 'settings-business',
        title: 'Business Parameters',
        path: '/settings/business',
        plannedPhase: 'Phase 4 Live',
        requiredPermission: 'business_settings.view',
        description: 'Global business currency, fiscal year cycles, operating work days, and default measurement standards.',
      },
      {
        id: 'settings-users',
        title: 'Users',
        path: '/settings/users',
        plannedPhase: 'Phase 3 Live',
        requiredPermission: 'users.view',
        description: 'Operator accounts, multi-branch access assignments, and enterprise identity management.',
      },
      {
        id: 'settings-roles',
        title: 'Roles & Permissions',
        path: '/settings/roles',
        plannedPhase: 'Phase 3 Live',
        requiredPermission: 'roles.view',
        description: 'Role-based access control (RBAC) security matrix and granular capability tokens.',
      },
      {
        id: 'settings-audit-logs',
        title: 'Audit Logs',
        path: '/settings/audit-logs',
        plannedPhase: 'Phase 23 Live',
        requiredPermission: 'audit_logs.view',
        description: 'Immutable system audit trail tracking operator actions, state diffs, and SHA-256 hash chains.',
      },
      {
        id: 'settings-design-system',
        title: 'Design System & UI',
        path: '/design-system',
        plannedPhase: 'Phase 5 Live',
        description: 'Enterprise reusable UI foundation, data table engine, filters, forms, charts, and dialogs.',
      },
      {
        id: 'settings-notifications',
        title: 'Central Notifications',
        path: '/notifications',
        plannedPhase: 'Phase 22 Live',
        description: 'Multi-module operational alerts, cross-department approval requests, and channel routing preferences.',
      },
      {
        id: 'settings-integrations',
        title: 'Integrations Hub',
        path: '/settings/integrations',
        plannedPhase: 'Phase 24 Live',
        requiredPermission: 'integrations.view',
        description: 'Third-party API connectors, encrypted credential vault, HMAC webhook receivers, and real-time synchronization.',
      },
    ],
  },
];

/**
 * Filters the entire navigation tree based on active user role tokens.
 * Complies with strict rule:
 * - If section has children and user has NO child access -> hide section
 * - If user has access to some children -> display parent and only authorized children
 */
export function filterNavigationForUser(items: NavItem[], user: AuthUser | null | undefined): NavItem[] {
  if (!user || user.status !== 'active') return [];
  if (user.is_super_admin) return items;

  return items
    .map((item) => {
      // If item has children
      if (item.children && item.children.length > 0) {
        const filteredChildren = item.children
          .map((child) => {
            if (child.children && child.children.length > 0) {
              const filteredGrandchildren = child.children.filter((gc) => {
                if (!gc.requiredPermission) return true;
                return accessControlService.hasPermission(user, gc.requiredPermission);
              });
              if (filteredGrandchildren.length === 0) return null;
              return { ...child, children: filteredGrandchildren };
            }

            if (!child.requiredPermission) return child;
            if (accessControlService.hasPermission(user, child.requiredPermission)) {
              return child;
            }
            return null;
          })
          .filter((c): c is NavChild => c !== null);

        // If user cannot access ANY child routes -> hide parent
        if (filteredChildren.length === 0) {
          if (item.requiredPermission && accessControlService.hasPermission(user, item.requiredPermission)) {
            return { ...item, children: [] };
          }
          return null;
        }

        return {
          ...item,
          children: filteredChildren,
        };
      }

      // Root single item
      if (item.requiredPermission && !accessControlService.hasPermission(user, item.requiredPermission)) {
        return null;
      }

      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

/**
 * Finds the required security permission token for any route path.
 */
export function getRequiredPermissionForPath(rawPath: string): string | undefined {
  const path = rawPath.split('?')[0].split('#')[0];

  // Check top-level items
  for (const item of NAVIGATION_ITEMS) {
    if (item.path === path && item.requiredPermission) {
      return item.requiredPermission;
    }

    if (item.children) {
      for (const child of item.children) {
        if (child.path === path && child.requiredPermission) {
          return child.requiredPermission;
        }

        if (child.children) {
          for (const grandChild of child.children) {
            if (grandChild.path === path && grandChild.requiredPermission) {
              return grandChild.requiredPermission;
            }
          }
        }
      }
    }
  }

  // Domain prefix matching fallback
  if (path.startsWith('/marketing')) return 'marketing.view';
  if (path.startsWith('/commerce')) return 'commerce.view';
  if (path.startsWith('/operations/suppliers') || path.startsWith('/suppliers')) return 'suppliers.view';
  if (path.startsWith('/operations/products') || path.startsWith('/products')) return 'products.view';
  if (path.startsWith('/operations/procurement')) return 'procurement.view';
  if (path.startsWith('/operations/inventory')) return 'inventory.view';
  if (path.startsWith('/operations/manufacturing') || path.startsWith('/operations/production')) return 'manufacturing.view';
  if (path.startsWith('/operations/quality')) return 'quality.view';
  if (path.startsWith('/operations/warehouse')) return 'warehouse.view';
  if (path.startsWith('/distribution/field-sales')) return 'field_sales.view';
  if (path.startsWith('/distribution')) return 'distribution.view';
  if (path.startsWith('/finance')) return 'finance.view';
  if (path.startsWith('/people')) return 'users.view';
  if (path.startsWith('/ai')) return 'ai.view';
  if (path === '/settings/users') return 'users.view';
  if (path === '/settings/roles') return 'roles.view';
  if (path === '/settings/audit-logs') return 'audit_logs.view';
  if (path === '/settings/organization') return 'organization.view';
  if (path === '/settings/branches') return 'branches.view';
  if (path === '/settings/departments') return 'departments.view';
  if (path === '/settings/warehouses') return 'warehouses.view';
  if (path === '/settings/locations') return 'locations.view';
  if (path === '/settings/units') return 'units.view';
  if (path === '/settings/business') return 'business_settings.view';
  if (path === '/settings/integrations' || path.startsWith('/settings/integrations')) return 'integrations.view';

  return undefined;
}

export interface SearchableItem {
  id: string;
  title: string;
  path: string;
  parentTitle?: string;
  grandParentTitle?: string;
  description?: string;
  plannedPhase?: string;
  iconName: string;
  requiredPermission?: string;
}

/**
 * Flattens the navigation tree into searchable entries for Global Search
 */
export function getSearchableNavItems(): SearchableItem[] {
  const items: SearchableItem[] = [];

  for (const item of NAVIGATION_ITEMS) {
    items.push({
      id: item.id,
      title: item.title,
      path: item.path,
      description: item.description,
      plannedPhase: item.plannedPhase,
      iconName: item.iconName,
      requiredPermission: item.requiredPermission,
    });

    if (item.children) {
      for (const child of item.children) {
        items.push({
          id: child.id,
          title: child.title,
          path: child.path,
          parentTitle: item.title,
          description: child.description,
          plannedPhase: child.plannedPhase,
          iconName: item.iconName,
          requiredPermission: child.requiredPermission,
        });

        if (child.children) {
          for (const grandChild of child.children) {
            items.push({
              id: grandChild.id,
              title: grandChild.title,
              path: grandChild.path,
              parentTitle: child.title,
              grandParentTitle: item.title,
              description: grandChild.description,
              plannedPhase: grandChild.plannedPhase,
              iconName: item.iconName,
              requiredPermission: grandChild.requiredPermission,
            });
          }
        }
      }
    }
  }

  return items;
}

export function getPageMeta(pathname: string): PageMeta {
  const cleanPath = pathname.split('?')[0].split('#')[0];

  const allItems = getSearchableNavItems();
  const matched = allItems.find((n) => n.path === cleanPath);

  if (cleanPath === '/command-center' || cleanPath === '/') {
    return {
      title: 'Command Center',
      subtitle: 'Central nervous system for business telemetry, plant metrics, and executive KPIs.',
      breadcrumbs: [{ label: 'Command Center', isCurrent: true }],
      plannedPhase: 'Phase 2 Shell Active',
    };
  }

  if (cleanPath === '/business') {
    return {
      title: 'Business & ERP',
      subtitle: 'Enterprise governance, legal entities, multi-branch master data, and corporate reporting.',
      breadcrumbs: [{ label: 'Business', isCurrent: true }],
      plannedPhase: 'Phase 3 / 5',
    };
  }

  if (cleanPath === '/design-system') {
    return {
      title: 'Design System & UI Foundation',
      subtitle: 'Reusable enterprise UI interaction language, data table engine, filters, forms, and charts.',
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Design System', isCurrent: true },
      ],
      plannedPhase: 'Phase 5 Live',
    };
  }

  if (cleanPath === '/notifications') {
    return {
      title: 'Central Notification Center',
      subtitle: 'Multi-module operational alerts, cross-department approval requests, and real-time streaming notifications.',
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Notifications', isCurrent: true },
      ],
      plannedPhase: 'Phase 22 Live',
    };
  }

  if (cleanPath === '/settings') {
    return {
      title: 'Settings & Foundation Diagnostics',
      subtitle: 'Enterprise settings, security governance, InsForge database status, and foundation telemetry.',
      breadcrumbs: [{ label: 'Settings', isCurrent: true }],
      plannedPhase: 'Phase 3 Live',
    };
  }

  if (matched) {
    const breadcrumbs: BreadcrumbItem[] = [];

    if (matched.grandParentTitle) {
      const gp = NAVIGATION_ITEMS.find((n) => n.title === matched.grandParentTitle);
      breadcrumbs.push({ label: matched.grandParentTitle, href: gp?.path });
    }

    if (matched.parentTitle) {
      const parentItem = allItems.find((n) => n.title === matched.parentTitle);
      breadcrumbs.push({ label: matched.parentTitle, href: parentItem?.path });
    }

    breadcrumbs.push({ label: matched.title, isCurrent: true });

    return {
      title: matched.title,
      subtitle: matched.description || `${matched.title} management and configuration.`,
      breadcrumbs,
      plannedPhase: matched.plannedPhase,
    };
  }

  const segments = cleanPath.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = segments.map((seg, idx) => {
    const isCurrent = idx === segments.length - 1;
    const partialPath = '/' + segments.slice(0, idx + 1).join('/');
    const title = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    return {
      label: title,
      href: isCurrent ? undefined : partialPath,
      isCurrent,
    };
  });

  const lastSegment = segments[segments.length - 1] || 'Page';
  const pageTitle = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');

  return {
    title: pageTitle,
    subtitle: `Jyotsvan Enterprise Platform — ${pageTitle}`,
    breadcrumbs: breadcrumbs.length > 0 ? breadcrumbs : [{ label: 'Overview', isCurrent: true }],
    plannedPhase: 'Scheduled Phase',
  };
}

export const getPageMetadata = getPageMeta;
