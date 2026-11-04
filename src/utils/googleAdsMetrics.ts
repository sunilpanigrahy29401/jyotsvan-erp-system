// src/utils/googleAdsMetrics.ts
// Phase 28 & 29: Centralized Metric Calculations, Safe Math & Formatting for Google Ads

import type {
  GoogleDashboardKPIs,
  GoogleKPICardData,
  GoogleComparisonMetric,
} from '../types/google-ads.ts';

/**
 * Click-Through Rate: Clicks / Impressions * 100
 * If impressions = 0, returns null.
 */
export function calcCTR(clicks: number, impressions: number): number | null {
  if (!impressions || impressions <= 0) return null;
  const ctr = (clicks / impressions) * 100;
  return Number(ctr.toFixed(2));
}

/**
 * Cost Per Click: Spend / Clicks
 * If clicks = 0, returns null.
 */
export function calcCPC(spend: number, clicks: number): number | null {
  if (!clicks || clicks <= 0) return null;
  const cpc = spend / clicks;
  return Number(cpc.toFixed(2));
}

/**
 * Cost Per Acquisition (CPA): Spend / Conversions
 * If conversions = 0, returns null.
 */
export function calcCPA(spend: number, conversions: number): number | null {
  if (!conversions || conversions <= 0) return null;
  const cpa = spend / conversions;
  return Number(cpa.toFixed(2));
}

/**
 * Return On Ad Spend (ROAS): Conversion Value / Spend
 * If spend = 0, returns null.
 */
export function calcROAS(conversionValue: number, spend: number): number | null {
  if (!spend || spend <= 0) return null;
  const roas = conversionValue / spend;
  return Number(roas.toFixed(2));
}

/**
 * Format currency with internationalization
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'INR'): string {
  if (amount == null || isNaN(amount)) return '—';
  
  const symbolMap: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
  };

  const symbol = symbolMap[currency.toUpperCase()] || `${currency} `;

  // Formatter for large values
  if (Math.abs(amount) >= 10000000) {
    return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(2)} L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}k`;
  }

  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format raw numbers cleanly
 */
export function formatCount(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toLocaleString('en-IN');
}

/**
 * Format percentage with fallback
 */
export function formatPercentage(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format ROAS as X.XXx
 */
export function formatROAS(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(2)}x`;
}

/**
 * Compute comparison change metrics between current and previous values
 */
export function computeDelta(
  key: string,
  label: string,
  current: number | null,
  previous: number | null,
  isPositiveGood: boolean = true,
  isCurrency: boolean = false,
  isPercentage: boolean = false,
  currency: string = 'INR',
  tooltipText?: string
): GoogleKPICardData {
  if (current == null && previous == null) {
    return {
      key,
      label,
      currentValue: null,
      previousValue: null,
      absoluteChange: null,
      percentageChange: null,
      direction: 'neutral',
      isPositiveGood,
      isCurrency,
      isPercentage,
      currency,
      tooltipText,
    };
  }

  const cur = current ?? 0;
  const prev = previous;

  if (prev == null) {
    return {
      key,
      label,
      currentValue: cur,
      previousValue: null,
      absoluteChange: null,
      percentageChange: null,
      direction: 'neutral',
      isPositiveGood,
      isCurrency,
      isPercentage,
      currency,
      tooltipText,
    };
  }

  const absoluteChange = cur - prev;
  let percentageChange: number | null = null;
  if (prev !== 0) {
    percentageChange = Number(((absoluteChange / Math.abs(prev)) * 100).toFixed(1));
  }

  let direction: 'up' | 'down' | 'neutral' = 'neutral';
  if (absoluteChange > 0.0001) direction = 'up';
  else if (absoluteChange < -0.0001) direction = 'down';

  return {
    key,
    label,
    currentValue: cur,
    previousValue: prev,
    absoluteChange: Number(absoluteChange.toFixed(2)),
    percentageChange,
    direction,
    isPositiveGood,
    isCurrency,
    isPercentage,
    currency,
    tooltipText,
  };
}

/**
 * Compute the complete 9-card KPI grid for Google Ads
 */
export function computeGoogleDashboardKPIs(
  current: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
  },
  previous: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
  } | null,
  currency: string = 'INR'
): GoogleDashboardKPIs {
  const curCTR = calcCTR(current.clicks, current.impressions);
  const curCPC = calcCPC(current.spend, current.clicks);
  const curCPA = calcCPA(current.spend, current.conversions);
  const curROAS = calcROAS(current.conversionValue, current.spend);

  const prevCTR = previous ? calcCTR(previous.clicks, previous.impressions) : null;
  const prevCPC = previous ? calcCPC(previous.spend, previous.clicks) : null;
  const prevCPA = previous ? calcCPA(previous.spend, previous.conversions) : null;
  const prevROAS = previous ? calcROAS(previous.conversionValue, previous.spend) : null;

  return {
    spend: computeDelta(
      'spend',
      'Total Spend',
      current.spend,
      previous ? previous.spend : null,
      false, // higher spend without context is cost
      true,
      false,
      currency,
      'Total Google Ads advertising cost for the selected period.'
    ),
    impressions: computeDelta(
      'impressions',
      'Impressions',
      current.impressions,
      previous ? previous.impressions : null,
      true,
      false,
      false,
      currency,
      'Total recorded ad impressions across Search, PMax, Shopping & YouTube.'
    ),
    clicks: computeDelta(
      'clicks',
      'Clicks',
      current.clicks,
      previous ? previous.clicks : null,
      true,
      false,
      false,
      currency,
      'Total user clicks on your Google advertisements.'
    ),
    ctr: computeDelta(
      'ctr',
      'CTR',
      curCTR,
      prevCTR,
      true,
      false,
      true,
      currency,
      'Click-Through Rate (Clicks / Impressions × 100).'
    ),
    cpc: computeDelta(
      'cpc',
      'Avg. CPC',
      curCPC,
      prevCPC,
      false, // lower CPC is good
      true,
      false,
      currency,
      'Average Cost Per Click (Spend / Clicks).'
    ),
    conversions: computeDelta(
      'conversions',
      'Conversions',
      current.conversions,
      previous ? previous.conversions : null,
      true,
      false,
      false,
      currency,
      'Total synchronized Google Ads conversion actions recorded.'
    ),
    cpa: computeDelta(
      'cpa',
      'Cost / Conv. (CPA)',
      curCPA,
      prevCPA,
      false, // lower CPA is good
      true,
      false,
      currency,
      'Cost Per Acquisition (Spend / Conversions).'
    ),
    conversion_value: computeDelta(
      'conversion_value',
      'Conv. Value',
      current.conversionValue,
      previous ? previous.conversionValue : null,
      true,
      true,
      false,
      currency,
      'Google Ads tracked conversion value (distinguished from finalized ERP ledger revenue).'
    ),
    roas: computeDelta(
      'roas',
      'ROAS',
      curROAS,
      prevROAS,
      true,
      false,
      false,
      currency,
      'Return on Ad Spend (Conversion Value / Total Spend).'
    ),
  };
}

/**
 * Get start and end date strings based on preset key
 */
export function getDateRangeFromPreset(
  preset: string,
  comparisonType: 'previous_period' | 'previous_year' | 'none' = 'previous_period'
): {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let start: Date;
  let end: Date = new Date(today);

  switch (preset) {
    case 'today':
      start = new Date(today);
      break;
    case 'yesterday': {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      start = yest;
      end = new Date(yest);
      break;
    }
    case '7d':
    case 'last_7d':
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    case '14d':
    case 'last_14d':
      start = new Date(today);
      start.setDate(start.getDate() - 13);
      break;
    case '30d':
    case 'last_30d':
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'last_month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    default:
      start = new Date(today);
      start.setDate(start.getDate() - 6);
  }

  const startDate = formatDate(start);
  const endDate = formatDate(end);

  if (comparisonType === 'none') {
    return { startDate, endDate };
  }

  // Calculate comparison range
  const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  let compStart: Date;
  let compEnd: Date;

  if (comparisonType === 'previous_year') {
    compStart = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate());
    compEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  } else {
    // previous_period
    compEnd = new Date(start);
    compEnd.setDate(compEnd.getDate() - 1);
    compStart = new Date(compEnd);
    compStart.setDate(compStart.getDate() - (daysDiff - 1));
  }

  return {
    startDate,
    endDate,
    compareStartDate: formatDate(compStart),
    compareEndDate: formatDate(compEnd),
  };
}

/**
 * Styling helper for delta pills
 */
export function getDeltaBadgeStyle(
  direction: 'up' | 'down' | 'neutral',
  isPositiveGood: boolean
): { bg: string; text: string; border: string } {
  if (direction === 'neutral') {
    return {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
    };
  }

  const isPositive = direction === 'up';
  const isGood = (isPositive && isPositiveGood) || (!isPositive && !isPositiveGood);

  if (isGood) {
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
