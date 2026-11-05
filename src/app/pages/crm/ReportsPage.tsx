// CRM reports: lead funnel, revenue forecast, win/loss, source performance and rep scoreboard.
import React, { useState } from 'react';
import { CrmApi } from '../../../services/crmApi.ts';
import { Empty, ErrorLine, Kpi, Spinner, Tabs, cardCls, inr, useLoad } from './shared.tsx';

type Tab = 'funnel' | 'forecast' | 'winloss' | 'sources' | 'reps';

function Bar({ value, max, tone = 'bg-blue-500' }: { value: number; max: number; tone?: string }) {
  return <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>;
}

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('funnel');
  const [range, setRange] = useState({ from: '', to: '' });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-center">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'funnel', label: 'Lead funnel' }, { id: 'forecast', label: 'Forecast' }, { id: 'winloss', label: 'Win / loss' }, { id: 'sources', label: 'Sources' }, { id: 'reps', label: 'Team' }]} />
        {['funnel', 'winloss'].includes(tab) && (
          <div className="flex items-center gap-2 text-xs"><input type="date" aria-label="From" className="px-2 py-1 border border-slate-200 rounded" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            to <input type="date" aria-label="To" className="px-2 py-1 border border-slate-200 rounded" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
        )}
      </div>
      {tab === 'funnel' && <Funnel range={range} />}{tab === 'forecast' && <Forecast />}{tab === 'winloss' && <WinLoss range={range} />}{tab === 'sources' && <Sources />}{tab === 'reps' && <Reps />}
    </div>
  );
}

function Funnel({ range }: { range: { from: string; to: string } }) {
  const { data, loading, error } = useLoad(() => CrmApi.getFunnel({ from: range.from, to: range.to }), [range.from, range.to]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorLine message={error} />;
  const max = data.steps[0]?.count || 0;
  return (
    <div className={`${cardCls} p-5 space-y-3`}>
      {!max ? <Empty>No leads in this period.</Empty> : data.steps.map((s: any) => (
        <div key={s.stage}><div className="flex justify-between text-xs mb-1"><span className="font-semibold capitalize">{s.stage}</span><span>{s.count}{s.conversion_from_previous_percent !== null && <span className="text-slate-400"> · {s.conversion_from_previous_percent}% of previous</span>}</span></div><Bar value={s.count} max={max} /></div>
      ))}
      <div className="text-xs text-slate-500 pt-2 border-t">Lost: {data.lost} · Unqualified: {data.unqualified}</div>
    </div>
  );
}

function Forecast() {
  const { data, loading, error } = useLoad(() => CrmApi.getForecast());
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorLine message={error} />;
  const max = Math.max(0, ...data.by_month.map((m: any) => m.value));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3"><Kpi title="Weighted forecast" value={inr(data.total_weighted)} sub="value × stage probability" />
        <Kpi title="Past-due deals" value={data.past_due_deals} tone={data.past_due_deals ? 'red' : undefined} sub="expected close date has passed" /></div>
      <div className={`${cardCls} p-5 space-y-3`}><div className="text-xs font-bold text-slate-500 uppercase">By expected close month</div>
        {!data.by_month.length ? <Empty>No open deals.</Empty> : data.by_month.map((m: any) => (
          <div key={m.month}><div className="flex justify-between text-xs mb-1"><span className="font-mono">{m.month}</span><span>{inr(m.value)} · weighted {inr(m.weighted)} · {m.deals} deal(s)</span></div><Bar value={m.value} max={max} /></div>))}</div>
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full text-xs"><thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 text-left"><th className="p-3">Owner</th><th className="p-3 text-right">Deals</th><th className="p-3 text-right">Value</th><th className="p-3 text-right">Weighted</th></tr></thead>
        <tbody className="divide-y">{data.by_owner.map((o: any) => <tr key={o.owner_employee_id}><td className="p-3">{o.owner_name || o.owner_employee_id}</td><td className="p-3 text-right">{o.deals}</td><td className="p-3 text-right">{inr(o.value)}</td><td className="p-3 text-right font-semibold">{inr(o.weighted)}</td></tr>)}</tbody></table></div>
    </div>
  );
}

function WinLoss({ range }: { range: { from: string; to: string } }) {
  const { data, loading, error } = useLoad(() => CrmApi.getWinLoss({ from: range.from, to: range.to }), [range.from, range.to]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorLine message={error} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi title="Win rate" value={data.win_rate_percent === null ? '—' : `${data.win_rate_percent}%`} sub={`${data.won} won · ${data.lost} lost`} />
        <Kpi title="Won value" value={inr(data.won_value)} tone="green" /><Kpi title="Lost value" value={inr(data.lost_value)} tone="red" />
        <Kpi title="Avg. sales cycle" value={data.avg_sales_cycle_days === null ? '—' : `${data.avg_sales_cycle_days} days`} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`${cardCls} p-4 text-xs`}><div className="font-bold text-slate-500 uppercase text-[10px] mb-2">Reasons</div>
          {!data.reasons.length ? <Empty>No closed deals.</Empty> : data.reasons.map((r: any, i: number) => <div key={i} className="flex justify-between py-1.5 border-b border-slate-100"><span>{r.reason} <span className={r.status === 'won' ? 'text-emerald-600' : 'text-rose-600'}>({r.status})</span></span><span>{r.c} · {inr(r.value)}</span></div>)}</div>
        <div className={`${cardCls} p-4 text-xs`}><div className="font-bold text-slate-500 uppercase text-[10px] mb-2">Competitors</div>
          {!data.competitors.length ? <Empty>No competitor recorded.</Empty> : data.competitors.map((c: any) => <div key={c.competitor_name} className="flex justify-between py-1.5 border-b border-slate-100"><span>{c.competitor_name}</span><span>lost to {c.lost_to} · won against {c.won_against}</span></div>)}</div>
      </div>
    </div>
  );
}

function Sources() {
  const { data, loading, error } = useLoad(() => CrmApi.getSourcePerformance());
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorLine message={error} />;
  return <div className={`${cardCls} overflow-x-auto`}><table className="w-full text-xs"><thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 text-left"><th className="p-3">Source</th><th className="p-3 text-right">Leads</th><th className="p-3 text-right">Converted</th><th className="p-3 text-right">Conv. %</th><th className="p-3 text-right">Avg score</th><th className="p-3 text-right">Won value</th></tr></thead>
    <tbody className="divide-y">{data.map((s: any) => <tr key={s.source}><td className="p-3 font-medium">{s.source}</td><td className="p-3 text-right">{s.leads}</td><td className="p-3 text-right">{s.converted}</td><td className="p-3 text-right">{s.conversion_percent}%</td><td className="p-3 text-right">{s.avg_score ?? '—'}</td><td className="p-3 text-right font-semibold">{inr(s.won_value)}</td></tr>)}</tbody></table></div>;
}

function Reps() {
  const { data, loading, error } = useLoad(() => CrmApi.getRepPerformance());
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorLine message={error} />;
  if (!data.length) return <Empty>No leads, deals or tasks are assigned to employees yet.</Empty>;
  const cols: Array<[string, string]> = [['open_leads', 'Open leads'], ['converted_leads', 'Converted'], ['sla_breaches', 'SLA breaches'], ['open_deals', 'Open deals'], ['activities_30d', 'Activities (30d)'], ['overdue_tasks', 'Overdue tasks']];
  return <div className={`${cardCls} overflow-x-auto`}><table className="w-full text-xs"><thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 text-left"><th className="p-3">Rep</th>{cols.map(([, l]) => <th key={l} className="p-3 text-right">{l}</th>)}<th className="p-3 text-right">Won this month</th></tr></thead>
    <tbody className="divide-y">{data.map((r: any) => <tr key={r.id}><td className="p-3 font-medium">{r.display_name}</td>{cols.map(([k]) => <td key={k} className={`p-3 text-right ${(k === 'sla_breaches' || k === 'overdue_tasks') && r[k] ? 'text-rose-600 font-semibold' : ''}`}>{r[k]}</td>)}<td className="p-3 text-right font-semibold">{inr(r.won_this_month)}</td></tr>)}</tbody></table></div>;
}
