export interface NavChild {
  id: string;
  title: string;
  path: string;
  badge?: string;
  description?: string;
  plannedPhase?: string;
  requiredPermission?: string;
  children?: NavChild[];
}

export interface NavItem {
  id: string;
  title: string;
  path: string;
  iconName: string;
  badge?: string;
  description?: string;
  plannedPhase: string;
  requiredPermission?: string;
  children?: NavChild[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface PageMeta {
  title: string;
  subtitle: string;
  breadcrumbs: BreadcrumbItem[];
  plannedPhase?: string;
  deliverables?: string[];
  subsystems?: string[];
  architecturalNotes?: string;
}
