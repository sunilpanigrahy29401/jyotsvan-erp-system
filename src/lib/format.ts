/**
 * Jyotsvan Enterprise Platform - Formatting & Localization Utilities
 * Centralized formatting functions for Currency, Numbers, Percentages, Dates,
 * Quantities, and Status strings.
 */

/**
 * Format currency with Indian Rupee (₹) by default or specified currency code.
 * Follows standard Indian numbering system (Lakhs / Crores) or international system.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: {
    currency?: string;
    decimals?: number;
    compact?: boolean;
    locale?: string;
  } = {}
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  const { currency = 'INR', decimals = 2, compact = false, locale = 'en-IN' } = options;

  if (compact) {
    if (Math.abs(num) >= 10000000) {
      return `₹${(num / 10000000).toFixed(decimals)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(decimals)} L`;
    }
    if (Math.abs(num) >= 1000) {
      return `₹${(num / 1000).toFixed(decimals)} k`;
    }
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: Number.isInteger(num) ? 0 : decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${num.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    })}`;
  }
}

/**
 * Format standard numbers with locale-aware commas.
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0,
  locale: string = 'en-IN'
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format percentages (e.g. 12.4%).
 */
export function formatPercentage(
  value: number | string | null | undefined,
  options: { decimals?: number; includeSign?: boolean } = {}
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  const { decimals = 1, includeSign = false } = options;
  const sign = includeSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)}%`;
}

/**
 * Format standard enterprise date (e.g. 07 Sep 2026).
 */
export function formatDate(
  dateStringOrDate: string | Date | null | undefined,
  format: 'standard' | 'short' | 'long' | 'iso' = 'standard'
): string {
  if (!dateStringOrDate) return '—';
  const d = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  if (isNaN(d.getTime())) return '—';

  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }

  if (format === 'short') {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  if (format === 'long') {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date with time (e.g. 07 Sep 2026, 10:30 AM).
 */
export function formatDateTime(
  dateStringOrDate: string | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!dateStringOrDate) return '—';
  const d = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).format(d);
}

/**
 * Format relative time (e.g., "Just now", "5 minutes ago", "2 hours ago", "Yesterday").
 */
export function formatRelativeTime(dateStringOrDate: string | Date | null | undefined): string {
  if (!dateStringOrDate) return '—';
  const d = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  if (isNaN(d.getTime())) return '—';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return formatDate(d, 'standard');
}

/**
 * Format quantity with Unit of Measure (UOM) (e.g. "1,250 kg", "400 units").
 */
export function formatQuantity(
  quantity: number | string | null | undefined,
  uom: string = 'units',
  decimals: number = 0
): string {
  if (quantity === null || quantity === undefined || quantity === '') return '—';
  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (isNaN(num)) return '—';

  return `${formatNumber(num, decimals)} ${uom}`;
}

/**
 * Format file size in bytes to KB/MB/GB.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format slug or code into readable title (e.g., "in_transit" -> "In Transit").
 */
export function formatStatusLabel(status: string): string {
  if (!status) return '—';
  return status
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
