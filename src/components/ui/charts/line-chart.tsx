import React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer, ChartContainerProps } from './chart-container';
import { formatNumber, formatCurrency } from '../../../lib/format';

export interface LineSeriesConfig {
  key: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface LineChartProps extends Omit<ChartContainerProps, 'children'> {
  data: Record<string, unknown>[];
  xAxisKey: string;
  series: LineSeriesConfig[];
  valueFormatter?: (val: number) => string;
  formatAsCurrency?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

// Enterprise Executive Palette
const PALETTE = ['#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export function LineChart({
  data,
  xAxisKey,
  series,
  valueFormatter,
  formatAsCurrency = false,
  showGrid = true,
  showLegend = true,
  ...containerProps
}: LineChartProps) {
  const formatVal = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    if (formatAsCurrency) return formatCurrency(v, { compact: true });
    return formatNumber(v);
  };

  const isEmpty = !data || data.length === 0;

  return (
    <ChartContainer isEmpty={isEmpty} {...containerProps}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis
            dataKey={xAxisKey}
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatVal}
            width={60}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-800 pb-1 border-b border-slate-100">{label}</p>
                    {payload.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600">{item.name}:</span>
                        </div>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatVal(Number(item.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />
          )}
          {series.map((s, idx) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color || PALETTE[idx % PALETTE.length]}
              strokeWidth={s.strokeWidth || 2}
              strokeDasharray={s.strokeDasharray}
              dot={{ r: 3, fill: s.color || PALETTE[idx % PALETTE.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
