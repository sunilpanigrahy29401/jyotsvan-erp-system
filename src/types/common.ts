import React from 'react';

export type AlertVariant = 'default' | 'info' | 'success' | 'warning' | 'destructive' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: AlertVariant;
  duration?: number;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  minWidth?: string;
  className?: string;
  headerClassName?: string;
  priority?: 'high' | 'medium' | 'low'; // high = always visible, medium = visible on md+, low = visible on lg+
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type KPITrend = 'up' | 'down' | 'neutral';

export type SemanticStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'quarantine'
  | 'low_stock'
  | 'overdue'
  | 'in_transit'
  | 'quality_pass'
  | 'quality_fail'
  | 'published'
  | 'archived';

export interface StatusConfig {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
}

export interface ActivityTimelineItem {
  id: string;
  timestamp: string | Date;
  user: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  };
  action: string;
  target?: string;
  targetType?: string;
  description?: string;
  status?: SemanticStatus | string;
  metadata?: Record<string, unknown>;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string;
  url?: string;
  uploadedAt: string | Date;
  uploadedBy?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  badge?: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multi_select' | 'status' | 'date_range' | 'boolean';
  options?: FilterOption[];
  placeholder?: string;
}
