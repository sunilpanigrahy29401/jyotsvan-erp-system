// src/utils/metaMetrics.ts
// Phase 27: Centralized Metric Utilities, Safe Calculations & Formatters

import type {
  MetaComparePeriod,
  MetaDateRangePreset,
  MetaDashboardKPIs,
  MetaKPICardData,
} from '../types/meta.ts';

/**
 * Safe CTR calculation (%)
 * clicks / impressions * 100
 */
export function calcCTR(clicks: number | null | undefined, impressions: number | null | undefined): number | null {
  if (impressions == null || impressions <= 0 || clicks == null) return null;
  return (clicks / impressions) * 100;
}

/**
 * Safe CPC calculation
 * spend / clicks
 */
export function calcCPC(spend: number | null | undefined, clicks: number | null | undefined): number | null {
  if (clicks == null || clicks <= 0 || spend == null) return null;
  return spend / clicks;
}

/**
 * Safe CPM calculation
 * (spend / impressions) * 1000
 */
export function calcCPM(spend: number | null | undefined, impressions: number | null | undefined): number | null {
  if (impressions == null || impressions <= 0 || spend == null) return null;
  return (spend / impressions) * 1000;
}

/**
 * Safe CPA calculation (Cost per Conversion)
 * spend / conversions
 */
export function calcCPA(spend: number | null | undefined, conversions: number | null | undefined): number | null {
  if (conversions == null || conversions <= 0 || spend == null) return null;
  return spend / conversions;
}

/**
 * Safe ROAS calculation (Return on Ad Spend)
 * conversion_value / spend
 */
export function calcROAS(conversionValue: number | null | undefined, spend: number | null | undefined): number | null {
  if (spend == null || spend <= 0 || conversionValue == null) return null;
  return conversionValue / spend;
}

/**
 * Calculate absolute difference and percentage change safely
 */
export function calcDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): { absolute: number | null; percentage: number | null; direction: 'up' | 'down' | 'neutral' } {
  if (current == null && previous == null) {
    return { absolute: null, percentage: null, direction: 'neutral' };
  }

  const cur = current ?? 0;
  const prev = previous ?? 0;
  const absolute = cur - prev;

  let percentage: number | null = null;
  if (prev > 0) {
    percentage = (absolute / prev) * 100;
  } else if (prev === 0 && cur > 0) {
    percentage = 100;
  } else if (prev === 0 && cur === 0) {
    percentage = 0;
  }

  let direction: 'up' | 'down' | 'neutral' = 'neutral';
  if (absolute > 0.001) direction = 'up';
  else if (absolute < -0.001) direction = 'down';

  return { absolute, percentage, direction };
}

/**
 * Build structured KPI card data
 */
export function buildKPICard(
  key: string,
  label: string,
  currentValue: number | null,
  previousValue: number | null,
  options: {
    isPositiveGood?: boolean;
    isCurrency?: boolean;
    isPercentage?: boolean;
    currency?: string;
    tooltipText?: string;
  } = {}
): MetaKPICardData {
  const { absolute, percentage, direction } = calcDelta(currentValue, previousValue);
  return {
    key,
    label,
    currentValue,
    previousValue,
    absoluteChange: absolute,
    percentageChange: percentage,
    direction,
    isPositiveGood: options.isPositiveGood ?? true,
    isCurrency: options.isCurrency ?? false,
    isPercentage: options.isPercentage ?? false,
    currency: options.currency || 'INR',
    tooltipText: options.tooltipText,
  };
}

/**
 * Computes all 11 primary KPIs from aggregated totals
 */
export function computeDashboardKPIs(
  current: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    conversions: number;
    conversion_value: number;
  },
  previous: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    conversions: number;
    conversion_value: number;
  } | null,
  currency: string = 'INR'
): MetaDashboardKPIs {
  const curCTR = calcCTR(current.clicks, current.impressions);
  const curCPC = calcCPC(current.spend, current.clicks);
  const curCPM = calcCPM(current.spend, current.impressions);
  const curCPA = calcCPA(current.spend, current.conversions);
  const curROAS = calcROAS(current.conversion_value, current.spend);

  const prevCTR = previous ? calcCTR(previous.clicks, previous.impressions) : null;
  const prevCPC = previous ? calcCPC(previous.spend, previous.clicks) : null;
  const prevCPM = previous ? calcCPM(previous.spend, previous.impressions) : null;
  const prevCPA = previous ? calcCPA(previous.spend, previous.conversions) : null;
  const prevROAS = previous ? calcROAS(previous.conversion_value, previous.spend) : null;

  return {
    spend: buildKPICard('spend', 'Spend', current.spend, previous?.spend ?? null, {
      isPositiveGood: true,
      isCurrency: true,
      currency,
      tooltipText: 'Total Meta-reported advertising spend in account currency.',
    }),
    impressions: buildKPICard('impressions', 'Impressions', current.impressions, previous?.impressions ?? null, {
      isPositiveGood: true,
      tooltipText: 'Total number of times ads were displayed on screen.',
    }),
    reach: buildKPICard('reach', 'Reach', current.reach, previous?.reach ?? null, {
      isPositiveGood: true,
      tooltipText: 'Estimated unique people who saw your ads at least once.',
    }),
    clicks: buildKPICard('clicks', 'Clicks', current.clicks, previous?.clicks ?? null, {
      isPositiveGood: true,
      tooltipText: 'Total interactions and clicks across all active ad units.',
    }),
    ctr: buildKPICard('ctr', 'CTR', curCTR, prevCTR, {
      isPositiveGood: true,
      isPercentage: true,
      tooltipText: 'Click-Through Rate: (Clicks / Impressions) × 100.',
    }),
    cpc: buildKPICard('cpc', 'CPC', curCPC, prevCPC, {
      isPositiveGood: false, // Lower CPC is better
      isCurrency: true,
      currency,
      tooltipText: 'Cost Per Click: Total Spend / Clicks. Lower cost indicates efficiency.',
    }),
    cpm: buildKPICard('cpm', 'CPM', curCPM, prevCPM, {
      isPositiveGood: false, // Lower CPM is better
      isCurrency: true,
      currency,
      tooltipText: 'Cost Per Mille: (Spend / Impressions) × 1,000.',
    }),
    conversions: buildKPICard('conversions', 'Conversions', current.conversions, previous?.conversions ?? null, {
      isPositiveGood: true,
      tooltipText: 'Total attributed conversion actions reported by Meta Pixel and CAPI.',
    }),
    cpa: buildKPICard('cpa', 'CPA', curCPA, prevCPA, {
      isPositiveGood: false, // Lower CPA is better
      isCurrency: true,
      currency,
      tooltipText: 'Cost Per Acquisition: Spend / Conversions.',
    }),
    conversion_value: buildKPICard('conversion_value', 'Conversion Value', current.conversion_value, previous?.conversion_value ?? null, {
      isPositiveGood: true,
      isCurrency: true,
      currency,
      tooltipText: 'Total monetary value of attributed conversion events (Meta-reported).',
    }),
    roas: buildKPICard('roas', 'ROAS', curROAS, prevROAS, {
      isPositiveGood: true,
      tooltipText: 'Return on Ad Spend: Conversion Value / Spend (e.g., 3.50x).',
    }),
  };
}

/**
 * Currency Symbol Map
 */
export function getCurrencySymbol(currency: string = 'INR'): string {
  const map: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    SGD: 'S$',
    AED: 'AED ',
    JPY: '¥',
  };
  return map[currency.toUpperCase()] || `${currency} `;
}

/**
 * Format currency amounts with proper locale and precision
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'INR',
  compact: boolean = false
): string {
  if (amount == null || isNaN(amount)) return 'N/A';

  const symbol = getCurrencySymbol(currency);
  const isIndian = currency.toUpperCase() === 'INR';

  if (compact) {
    if (Math.abs(amount) >= 10000000 && isIndian) {
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(amount) >= 100000 && isIndian) {
      return `${symbol}${(amount / 100000).toFixed(2)} L`;
    }
    if (Math.abs(amount) >= 1000000) {
      return `${symbol}${(amount / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(1)}k`;
    }
  }

  const formatted = new Intl.NumberFormat(isIndian ? 'en-IN' : 'en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol}${formatted}`;
}

/**
 * Format count numbers (Impressions, clicks, reach)
 */
export function formatCount(count: number | null | undefined, compact: boolean = false): string {
  if (count == null || isNaN(count)) return 'N/A';

  if (compact) {
    if (Math.abs(count) >= 10000000) {
      return `${(count / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(count) >= 100000) {
      return `${(count / 100000).toFixed(1)} L`;
    }
    if (Math.abs(count) >= 1000000) {
      return `${(count / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(count) >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
  }

  return new Intl.NumberFormat('en-IN').format(count);
}

/**
 * Format percentage values
 */
export function formatPercentage(val: number | null | undefined, decimals: number = 2): string {
  if (val == null || isNaN(val)) return 'N/A';
  return `${val.toFixed(decimals)}%`;
}

/**
 * Format ROAS multiple (e.g. 3.42x)
 */
export function formatROAS(roas: number | null | undefined): string {
  if (roas == null || isNaN(roas)) return 'N/A';
  return `${roas.toFixed(2)}x`;
}

/**
 * Metric Color Evaluator
 * Returns styling classes for KPI changes
 */
export function getDeltaBadgeStyle(
  direction: 'up' | 'down' | 'neutral',
  isPositiveGood: boolean = true
): { bg: string; text: string; border: string } {
  if (direction === 'neutral') {
    return {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    };
  }

  const isFavorable = isPositiveGood ? direction === 'up' : direction === 'down';

  if (isFavorable) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    };
  }

  return {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  };
}

/**
 * Calculate Date Ranges from Preset
 */
export function getDateRangeFromPreset(
  preset: string,
  comparisonType: 'previous_period' | 'previous_year' = 'previous_period'
): { startDate: string; endDate: string; compareStartDate?: string; compareEndDate?: string } {
  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const todayStr = formatDate(now);
  let startStr = todayStr;
  let endStr = todayStr;

  switch (preset) {
    case 'today':
      startStr = todayStr;
      endStr = todayStr;
      break;
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startStr = formatDate(y);
      endStr = formatDate(y);
      break;
    }
    case '7d':
    case 'last_7d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      startStr = formatDate(s);
      endStr = todayStr;
      break;
    }
    case '14d':
    case 'last_14d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 13);
      startStr = formatDate(s);
      endStr = todayStr;
      break;
    }
    case '30d':
    case 'last_30d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      startStr = formatDate(s);
      endStr = todayStr;
      break;
    }
    case '90d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 89);
      startStr = formatDate(s);
      endStr = todayStr;
      break;
    }
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = formatDate(s);
      endStr = todayStr;
      break;
    }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      startStr = formatDate(s);
      endStr = formatDate(e);
      break;
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), quarter * 3, 1);
      startStr = formatDate(s);
      endStr = todayStr;
      break;
    }
    case 'custom':
    default: {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      startStr = formatDate(s);
      endStr = todayStr;
      break;
    }
  }

  const comparison = getComparisonDateRange(startStr, endStr, comparisonType);

  return {
    startDate: startStr,
    endDate: endStr,
    compareStartDate: comparison?.compareStartDate,
    compareEndDate: comparison?.compareEndDate,
  };
}

/**
 * Calculate Comparison Date Range
 */
export function getComparisonDateRange(
  startDate: string,
  endDate: string,
  comparePeriod: MetaComparePeriod
): { compareStartDate: string; compareEndDate: string } | null {
  if (comparePeriod === 'none') return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (comparePeriod) {
    case 'previous_period': {
      const cEnd = new Date(start);
      cEnd.setDate(cEnd.getDate() - 1);
      const cStart = new Date(cEnd);
      cStart.setDate(cStart.getDate() - diffDays + 1);
      return { compareStartDate: formatDate(cStart), compareEndDate: formatDate(cEnd) };
    }
    case 'previous_week': {
      const cStart = new Date(start);
      cStart.setDate(cStart.getDate() - 7);
      const cEnd = new Date(end);
      cEnd.setDate(cEnd.getDate() - 7);
      return { compareStartDate: formatDate(cStart), compareEndDate: formatDate(cEnd) };
    }
    case 'previous_month': {
      const cStart = new Date(start);
      cStart.setMonth(cStart.getMonth() - 1);
      const cEnd = new Date(end);
      cEnd.setMonth(cEnd.getMonth() - 1);
      return { compareStartDate: formatDate(cStart), compareEndDate: formatDate(cEnd) };
    }
    case 'previous_year': {
      const cStart = new Date(start);
      cStart.setFullYear(cStart.getFullYear() - 1);
      const cEnd = new Date(end);
      cEnd.setFullYear(cEnd.getFullYear() - 1);
      return { compareStartDate: formatDate(cStart), compareEndDate: formatDate(cEnd) };
    }
    default:
      return null;
  }
}

/**
 * Export array of objects to CSV string
 */
export function exportToCSV(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>): void {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val == null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
