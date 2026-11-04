import React from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer, ChartContainerProps } from './chart-container';
import { formatNumber, formatCurrency, formatPercentage } from '../../../lib/format';

export interface PieDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartProps extends Omit<ChartContainerProps, 'children'> {
  data: PieDataPoint[];
  donut?: boolean;
  centerLabel?: string;
  centerValue?: React.ReactNode;
  valueFormatter?: (val: number) => string;
  formatAsCurrency?: boolean;
  showLegend?: boolean;
}

const PALETTE = ['#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export function PieChart({
  data,
  donut = false,
  centerLabel,
  centerValue,
  valueFormatter,
  formatAsCurrency = false,
  showLegend = true,
  ...containerProps
}: PieChartProps) {
  const formatVal = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    if (formatAsCurrency) return formatCurrency(v, { compact: true });
    return formatNumber(v);
  };

  const isEmpty = !data || data.length === 0 || data.every((d) => d.value === 0);
  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <ChartContainer isEmpty={isEmpty} {...containerProps}>
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  const itemVal = Number(item.value);
                  const pct = total > 0 ? (itemVal / total) * 100 : 0;
                  return (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 pb-1 border-b border-slate-100">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600">Value:</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatVal(itemVal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600">Share:</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatPercentage(pct)}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
            )}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={donut ? '58%' : 0}
              outerRadius="80%"
              paddingAngle={donut ? 2 : 0}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || PALETTE[index % PALETTE.length]}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>

        {donut && (centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && (
              <span className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </ChartContainer>
  );
}
