// CRM configuration: pipelines & stages, lead sources/tags, scoring, auto-assignment, SLAs, custom fields, automation.
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { CrmApi } from '../../../services/crmApi.ts';
import { EmployeeSelect, Empty, ErrorLine, Field, Modal, Pill, Spinner, StatusPill, Tabs, btnGhost, btnPrimary, cardCls, dt, inputCls, label, useAction, useEmployees, useLoad } from './shared.tsx';

type Tab = 'pipelines' | 'sources' | 'scoring' | 'assignment' | 'sla' | 'fields' | 'automation';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('pipelines');
  return (
    <div className="space-y-4">
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'pipelines', label: 'Pipelines' }, { id: 'sources', label: 'Sources & tags' }, { id: 'scoring', label: 'Lead scoring' }, { id: 'assignment', label: 'Auto-assignment' }, { id: 'sla', label: 'SLAs' }, { id: 'fields', label: 'Custom fields' }, { id: 'automation', label: 'Automation' }]} />
      {tab === 'pipelines' && <Pipelines />}{tab === 'sources' && <Sources />}{tab === 'scoring' && <Scoring />}{tab === 'assignment' && <Assignment />}
      {tab === 'sla' && <Sla />}{tab === 'fields' && <CustomFields />}{tab === 'automation' && <Automation />}
    </div>
  );
}

function Pipelines() {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getPipelines(true));
  const { run, busy } = useAction();
  const [creating, setCreating] = useState('');
  const [stage, setStage] = useState<Record<string, { name: string; probability: string; kind: string }>>({});
  const move = async (pid: string, ids: string[], i: number, d: -1 | 1) => {
    const next = [...ids]; [next[i], next[i + d]] = [next[i + d], next[i]];
    if (await run(() => CrmApi.reorderStages(pid, next))) reload();
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-md"><input className={inputCls} placeholder="New pipeline name, e.g. Distributor onboarding" value={creating} onChange={(e) => setCreating(e.target.value)} />
        <button className={btnPrimary} disabled={busy || !creating.trim()} onClick={async () => { if (await run(() => CrmApi.createPipeline({ name: creating }), 'Pipeline created.')) { setCreating(''); reload(); } }}><Plus className="w-4 h-4" />Add</button></div>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : data?.map((p: any) => {
        const ns = stage[p.id] || { name: '', probability: '50', kind: 'open' };
        return (
          <div key={p.id} className={`${cardCls} p-4 space-y-3`}>
            <div className="flex justify-between items-center"><div className="font-bold text-sm">{p.name} {p.is_default && <Pill tone="blue">default</Pill>} {!p.is_active && <Pill>inactive</Pill>}</div>
              <div className="flex gap-3 text-xs">
                {!p.is_default && <button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.updatePipeline(p.id, { is_default: true }), 'Default pipeline changed.')) reload(); }}>Make default</button>}
                {!p.is_default && <button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.updatePipeline(p.id, { is_active: !p.is_active }), 'Saved.')) reload(); }}>{p.is_active ? 'Deactivate' : 'Activate'}</button>}
                {!p.is_default && <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this pipeline?') && (await run(() => CrmApi.deletePipeline(p.id), 'Deleted.'))) reload(); }}>Delete</button>}</div></div>
            <ol className="space-y-1.5">
              {p.stages.map((s: any, i: number) => (
                <li key={s.id} className="flex items-center gap-2 text-xs border border-slate-200 rounded-lg px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="font-medium flex-1">{s.name}</span>
                  <span className="text-slate-500">{s.default_probability}%</span>{s.is_won_stage && <Pill tone="green">won</Pill>}{s.is_lost_stage && <Pill tone="red">lost</Pill>}
                  <button aria-label="Move up" disabled={i === 0 || busy} className="text-slate-400 hover:text-slate-700 disabled:opacity-30" onClick={() => move(p.id, p.stages.map((x: any) => x.id), i, -1)}><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button aria-label="Move down" disabled={i === p.stages.length - 1 || busy} className="text-slate-400 hover:text-slate-700 disabled:opacity-30" onClick={() => move(p.id, p.stages.map((x: any) => x.id), i, 1)}><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button aria-label="Edit probability" className="text-blue-600 hover:underline" onClick={async () => { const v = window.prompt(`Win probability for "${s.name}" (0–100)`, String(s.default_probability)); if (v !== null && (await run(() => CrmApi.updateStage(s.id, { probability: Number(v) }), 'Saved.'))) reload(); }}>Edit %</button>
                  <button aria-label="Delete stage" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (window.confirm(`Delete stage "${s.name}"?`) && (await run(() => CrmApi.deleteStage(s.id), 'Stage deleted.'))) reload(); }}><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ol>
            <div className="flex gap-2 items-end text-xs">
              <Field label="Add stage"><input className={inputCls} value={ns.name} onChange={(e) => setStage({ ...stage, [p.id]: { ...ns, name: e.target.value } })} /></Field>
              <Field label="Probability %"><input type="number" min="0" max="100" className={`${inputCls} w-24`} value={ns.probability} onChange={(e) => setStage({ ...stage, [p.id]: { ...ns, probability: e.target.value } })} /></Field>
              <Field label="Type"><select className={inputCls} value={ns.kind} onChange={(e) => setStage({ ...stage, [p.id]: { ...ns, kind: e.target.value } })}><option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option></select></Field>
              <button className={btnGhost} disabled={busy || !ns.name.trim()} onClick={async () => {
                if (await run(() => CrmApi.addStage(p.id, { name: ns.name, probability: Number(ns.probability), is_won_stage: ns.kind === 'won', is_lost_stage: ns.kind === 'lost' }), 'Stage added.')) { setStage({ ...stage, [p.id]: { name: '', probability: '50', kind: 'open' } }); reload(); }
              }}>Add</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Sources() {
  const sources = useLoad(() => CrmApi.getSources());
  const tags = useLoad(() => CrmApi.getTags());
  const { run, busy } = useAction();
  const [src, setSrc] = useState({ name: '', channel_type: 'other' });
  const [tag, setTag] = useState({ name: '', color: '#3b82f6' });
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className={`${cardCls} p-4 space-y-3`}><div className="font-bold text-sm">Lead sources</div><ErrorLine message={sources.error} />
        {sources.data?.map((s: any) => (
          <div key={s.id} className="flex justify-between items-center text-xs border-b border-slate-100 py-1.5"><span>{s.name} <span className="text-slate-400">({s.lead_count} leads)</span></span>
            <span className="flex gap-3"><button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.updateSource(s.id, { is_active: !s.is_active }), 'Saved.')) sources.reload(); }}>{s.is_active ? 'Disable' : 'Enable'}</button>
              <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this source?') && (await run(() => CrmApi.deleteSource(s.id), 'Deleted.'))) sources.reload(); }}>Delete</button></span></div>
        ))}
        <div className="flex gap-2"><input className={inputCls} placeholder="New source" value={src.name} onChange={(e) => setSrc({ ...src, name: e.target.value })} />
          <button className={btnGhost} disabled={busy || !src.name.trim()} onClick={async () => { if (await run(() => CrmApi.createSource(src), 'Source added.')) { setSrc({ name: '', channel_type: 'other' }); sources.reload(); } }}>Add</button></div></div>
      <div className={`${cardCls} p-4 space-y-3`}><div className="font-bold text-sm">Lead tags</div><ErrorLine message={tags.error} />
        <div className="flex flex-wrap gap-2">{tags.data?.map((t: any) => (
          <span key={t.id} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border" style={{ borderColor: t.color, color: t.color }}>{t.name} <span className="text-slate-400">{t.lead_count}</span>
            <button aria-label={`Delete tag ${t.name}`} className="text-slate-400 hover:text-rose-600" onClick={async () => { if (window.confirm(`Delete tag "${t.name}" and remove it from leads?`) && (await run(() => CrmApi.deleteTag(t.id), 'Tag deleted.'))) tags.reload(); }}>×</button></span>))}</div>
        <div className="flex gap-2"><input className={inputCls} placeholder="New tag" value={tag.name} onChange={(e) => setTag({ ...tag, name: e.target.value })} /><input type="color" aria-label="Tag colour" value={tag.color} onChange={(e) => setTag({ ...tag, color: e.target.value })} className="h-9 w-12 border border-slate-200 rounded" />
          <button className={btnGhost} disabled={busy || !tag.name.trim()} onClick={async () => { if (await run(() => CrmApi.createTag(tag), 'Tag added.')) { setTag({ ...tag, name: '' }); tags.reload(); } }}>Add</button></div></div>
    </div>
  );
}

function Scoring() {
  const rules = useLoad(() => CrmApi.getScoringRules());
  const meta = useLoad(() => CrmApi.getScoringMeta());
  const { run, busy } = useAction();
  const [f, setF] = useState({ name: '', field: 'estimated_deal_value', operator: 'gte', value: '', points: '10' });
  const needsValue = !['present', 'absent'].includes(f.operator);
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">Every lead starts at 30 points; each matching rule adds (or subtracts) points, capped 0–100. With no rules, the built-in formula applies. Scores update when a lead changes — use “Re-score all” after editing rules.</p>
      <ErrorLine message={rules.error} />
      <div className={`${cardCls} divide-y`}>{!rules.data?.length ? <Empty>No custom rules (built-in formula in use).</Empty> : rules.data.map((r: any) => (
        <div key={r.id} className="p-3 flex justify-between items-center text-xs"><span><strong>{r.name}</strong> — {label(r.field)} {r.operator} {r.value ?? ''} → <span className={r.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{r.points > 0 ? '+' : ''}{r.points}</span> {!r.is_active && <Pill>off</Pill>}</span>
          <span className="flex gap-3"><button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.updateScoringRule(r.id, { is_active: !r.is_active }), 'Saved.')) rules.reload(); }}>{r.is_active ? 'Turn off' : 'Turn on'}</button>
            <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.deleteScoringRule(r.id), 'Deleted.')) rules.reload(); }}>Delete</button></span></div>))}</div>
      <div className={`${cardCls} p-4 grid grid-cols-2 md:grid-cols-6 gap-2 items-end`}>
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Field"><select className={inputCls} value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })}>{meta.data?.fields.map((x) => <option key={x} value={x}>{label(x)}</option>)}</select></Field>
        <Field label="Operator"><select className={inputCls} value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })}>{meta.data?.operators.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Value"><input className={inputCls} disabled={!needsValue} value={needsValue ? f.value : ''} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
        <Field label="Points"><input type="number" className={inputCls} value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} /></Field>
        <button className={btnPrimary} disabled={busy || !f.name.trim()} onClick={async () => { if (await run(() => CrmApi.createScoringRule({ ...f, value: needsValue ? f.value : undefined, points: Number(f.points) }), 'Rule added.')) { setF({ ...f, name: '', value: '' }); rules.reload(); } }}>Add rule</button>
      </div>
      <button className={btnGhost} disabled={busy} onClick={async () => { const r = await run(() => CrmApi.rescoreLeads()); if (r) window.alert(`Re-scored ${r.examined} open lead(s); ${r.changed} changed.`); }}>Re-score all open leads</button>
    </div>
  );
}

function Assignment() {
  const rules = useLoad(() => CrmApi.getAssignmentRules());
  const sources = useLoad(() => CrmApi.getSources());
  const emps = useEmployees();
  const { run, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ name: '', strategy: 'round_robin', priority: '100', employee_ids: [] as string[], state: '', territory: '', source_id: '' });
  const nameOf = (id: string) => emps.find((e) => e.id === id)?.display_name || id;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">New and unassigned leads are routed by the first matching rule (lowest priority number). Round-robin rotates fairly, load-based picks the rep with the fewest open leads, fixed always picks the first rep.</p>
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => setOpen(true)}><Plus className="w-4 h-4" />New rule</button></div>
      <ErrorLine message={rules.error} />
      {!rules.data?.length ? <Empty>No assignment rules: new leads stay unassigned until someone takes them.</Empty> : rules.data.map((r: any) => (
        <div key={r.id} className={`${cardCls} p-4 text-xs flex justify-between`}>
          <div><div className="font-bold text-sm">{r.name} <Pill tone="blue">{label(r.strategy)}</Pill> <span className="text-slate-400 font-normal">priority {r.priority}</span> {!r.is_active && <Pill>off</Pill>}</div>
            <div className="text-slate-500">When: {Object.entries(r.conditions || {}).filter(([, v]) => v).map(([k, v]) => `${label(k)} = ${v}`).join(', ') || 'any lead'} → {(r.employee_ids as string[]).map(nameOf).join(', ')}</div></div>
          <span className="flex gap-3 items-start"><button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.updateAssignmentRule(r.id, { is_active: !r.is_active }), 'Saved.')) rules.reload(); }}>{r.is_active ? 'Turn off' : 'Turn on'}</button>
            <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.deleteAssignmentRule(r.id), 'Deleted.')) rules.reload(); }}>Delete</button></span>
        </div>))}
      {open && (
        <Modal title="New assignment rule" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Name *"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Strategy"><select className={inputCls} value={f.strategy} onChange={(e) => setF({ ...f, strategy: e.target.value })}><option value="round_robin">Round-robin</option><option value="load_based">Load-based</option><option value="fixed">Fixed</option></select></Field>
              <Field label="Priority" hint="Lower runs first"><input type="number" className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} /></Field>
              <Field label="State (optional)"><input className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
              <Field label="Territory (optional)"><input className={inputCls} value={f.territory} onChange={(e) => setF({ ...f, territory: e.target.value })} /></Field>
              <Field label="Source (optional)"><select className={inputCls} value={f.source_id} onChange={(e) => setF({ ...f, source_id: e.target.value })}><option value="">Any</option>{sources.data?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            </div>
            <Field label="Representatives *"><div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">{emps.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.employee_ids.includes(e.id)} onChange={(ev) => setF({ ...f, employee_ids: ev.target.checked ? [...f.employee_ids, e.id] : f.employee_ids.filter((x: string) => x !== e.id) })} />{e.display_name}</label>))}</div></Field>
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !f.name.trim() || !f.employee_ids.length} onClick={async () => {
                const conditions = Object.fromEntries([['state', f.state], ['territory', f.territory], ['source_id', f.source_id]].filter(([, v]) => v));
                if (await run(() => CrmApi.createAssignmentRule({ name: f.name, strategy: f.strategy, priority: Number(f.priority), employee_ids: f.employee_ids, conditions }), 'Rule saved.')) { setOpen(false); rules.reload(); }
              }}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Sla() {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getSla());
  const { run, busy } = useAction();
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorLine message={error} />;
  return (
    <div className="grid md:grid-cols-2 gap-4 text-xs">
      <div className={`${cardCls} p-4 space-y-2`}><div className="font-bold text-sm">Lead first-response (minutes)</div>
        {['urgent', 'high', 'medium', 'low'].map((p) => { const cur = data.lead.find((x: any) => x.priority === p); return (
          <div key={p} className="flex items-center justify-between"><StatusPill value={p} /><span className="flex gap-2 items-center"><span className="text-slate-500">{cur?.first_response_minutes ?? '—'}</span>
            <button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { const v = window.prompt(`First-response time for ${p} leads (minutes)`, String(cur?.first_response_minutes ?? 60)); if (v !== null && (await run(() => CrmApi.setLeadSla(p, Number(v)), 'Saved.'))) reload(); }}>Change</button></span></div>); })}</div>
      <div className={`${cardCls} p-4 space-y-2`}><div className="font-bold text-sm">Ticket SLA (minutes)</div>
        {['urgent', 'high', 'medium', 'low'].map((p) => { const cur = data.ticket.find((x: any) => x.priority === p); return (
          <div key={p} className="flex items-center justify-between"><StatusPill value={p} /><span className="flex gap-2 items-center"><span className="text-slate-500">reply {cur?.first_response_minutes ?? '—'} · resolve {cur?.resolution_minutes ?? '—'}</span>
            <button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => {
              const fr = window.prompt(`First reply within (minutes) for ${p} tickets`, String(cur?.first_response_minutes ?? 120)); if (fr === null) return;
              const rs = window.prompt(`Resolve within (minutes) for ${p} tickets`, String(cur?.resolution_minutes ?? 1440)); if (rs === null) return;
              if (await run(() => CrmApi.setTicketSla(p, Number(fr), Number(rs)), 'Saved.')) reload();
            }}>Change</button></span></div>); })}</div>
    </div>
  );
}

function CustomFields() {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getCustomFields());
  const { run, busy } = useAction();
  const [f, setF] = useState({ entity: 'lead', field_key: '', label: '', field_type: 'text', options: '', is_required: false });
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">Add your own fields to leads, contacts, accounts and deals. Values are validated on save; keys cannot be changed later.</p>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : <div className={`${cardCls} divide-y`}>{!data?.length ? <Empty>No custom fields.</Empty> : data.map((d: any) => (
        <div key={d.id} className="p-3 flex justify-between text-xs"><span><strong>{d.label}</strong> <span className="font-mono text-slate-400">{d.entity}.{d.field_key}</span> · {d.field_type}{d.field_type === 'select' ? ` (${d.options.join(', ')})` : ''} {d.is_required && <Pill tone="amber">required</Pill>}</span>
          <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this field definition? Stored values stay on records but are no longer validated.') && (await run(() => CrmApi.deleteCustomField(d.id), 'Deleted.'))) reload(); }}>Delete</button></div>))}</div>}
      <div className={`${cardCls} p-4 grid grid-cols-2 md:grid-cols-6 gap-2 items-end`}>
        <Field label="Applies to"><select className={inputCls} value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })}>{['lead', 'contact', 'account', 'deal'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Key" hint="e.g. pack_size"><input className={inputCls} value={f.field_key} onChange={(e) => setF({ ...f, field_key: e.target.value })} /></Field>
        <Field label="Label"><input className={inputCls} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
        <Field label="Type"><select className={inputCls} value={f.field_type} onChange={(e) => setF({ ...f, field_type: e.target.value })}>{['text', 'number', 'date', 'select', 'boolean'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Options (comma separated)"><input className={inputCls} disabled={f.field_type !== 'select'} value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} /></Field>
        <label className="flex items-center gap-1.5 text-xs pb-2"><input type="checkbox" checked={f.is_required} onChange={(e) => setF({ ...f, is_required: e.target.checked })} />Required</label>
        <button className={btnPrimary} disabled={busy || !f.field_key || !f.label} onClick={async () => {
          const body = { ...f, options: f.field_type === 'select' ? f.options.split(',').map((x) => x.trim()).filter(Boolean) : undefined };
          if (await run(() => CrmApi.createCustomField(body), 'Field added.')) { setF({ ...f, field_key: '', label: '', options: '' }); reload(); }
        }}>Add field</button>
      </div>
    </div>
  );
}

function Automation() {
  const rules = useLoad(() => CrmApi.getAutomationRules());
  const logs = useLoad(() => CrmApi.getAutomationLogs());
  const meta = useLoad(() => CrmApi.getAutomationMeta());
  const { run, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', trigger_event: 'lead.created', cond_key: '', cond_val: '', action_type: 'create_task', subject: '', hours: '24', priority: 'high', tag: '', employee_id: '' });
  const params = () => {
    switch (f.action_type) {
      case 'create_task': return { subject: f.subject, due_in_hours: Number(f.hours) };
      case 'set_priority': return { priority: f.priority };
      case 'add_tag': return { tag: f.tag };
      case 'assign_owner': return { employee_id: f.employee_id };
      default: return {};
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">“When something happens, do this.” Rules run right after the change is saved; failures are logged below and never block the original action.</p>
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => setOpen(true)}><Plus className="w-4 h-4" />New rule</button></div>
      <ErrorLine message={rules.error} />
      {!rules.data?.length ? <Empty>No automation rules.</Empty> : rules.data.map((r: any) => (
        <div key={r.id} className={`${cardCls} p-4 text-xs flex justify-between`}>
          <div><div className="font-bold text-sm">{r.name} {!r.is_active && <Pill>off</Pill>}</div>
            <div className="text-slate-500">When <code>{r.trigger_event}</code>{Object.keys(r.conditions || {}).length ? ` and ${Object.entries(r.conditions).map(([k, v]) => `${k} = ${v}`).join(', ')}` : ''} → <code>{r.action_type}</code> {JSON.stringify(r.action_params)}</div>
            <div className="text-[10px] text-slate-400">Ran {r.execution_count} time(s){r.last_executed_at ? `, last ${dt(r.last_executed_at)}` : ''}</div></div>
          <span className="flex gap-3 items-start"><button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.updateAutomationRule(r.id, { is_active: !r.is_active }), 'Saved.')) rules.reload(); }}>{r.is_active ? 'Turn off' : 'Turn on'}</button>
            <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this rule and its log?') && (await run(() => CrmApi.deleteAutomationRule(r.id), 'Deleted.'))) { rules.reload(); logs.reload(); } }}>Delete</button></span>
        </div>))}
      <div className={`${cardCls} p-4`}><div className="font-bold text-sm mb-2">Recent runs</div>
        {!logs.data?.length ? <Empty>Nothing has run yet.</Empty> : <div className="max-h-56 overflow-y-auto divide-y text-xs">{logs.data.map((l: any) => <div key={l.id} className="py-1.5 flex justify-between"><span>{l.trigger_event} → {l.target_entity_type} <span className="font-mono text-slate-400">{l.target_entity_id.slice(-8)}</span> {l.error_message && <span className="text-rose-600">{l.error_message}</span>}</span><span><StatusPill value={l.status === 'success' ? 'completed' : 'rejected'} /> {dt(l.executed_at)}</span></div>)}</div>}</div>
      {open && (
        <Modal title="New automation rule" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Name *"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="When"><select className={inputCls} value={f.trigger_event} onChange={(e) => setF({ ...f, trigger_event: e.target.value })}>{meta.data?.events.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Only if field (optional)" hint="e.g. priority, state, status"><input className={inputCls} value={f.cond_key} onChange={(e) => setF({ ...f, cond_key: e.target.value })} /></Field>
              <Field label="equals"><input className={inputCls} value={f.cond_val} onChange={(e) => setF({ ...f, cond_val: e.target.value })} /></Field></div>
            <Field label="Then"><select className={inputCls} value={f.action_type} onChange={(e) => setF({ ...f, action_type: e.target.value })}>{meta.data?.actions.map((x) => <option key={x} value={x}>{label(x)}</option>)}</select></Field>
            {f.action_type === 'create_task' && <div className="grid grid-cols-2 gap-3"><Field label="Task *"><input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field><Field label="Due in (hours)"><input type="number" className={inputCls} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field></div>}
            {f.action_type === 'set_priority' && <Field label="Priority"><select className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{['low', 'medium', 'high', 'urgent'].map((x) => <option key={x}>{x}</option>)}</select></Field>}
            {f.action_type === 'add_tag' && <Field label="Tag"><input className={inputCls} value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} /></Field>}
            {f.action_type === 'assign_owner' && <Field label="Owner"><EmployeeSelect value={f.employee_id} onChange={(v) => setF({ ...f, employee_id: v })} allowNone={false} /></Field>}
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !f.name.trim()} onClick={async () => {
                const body = { name: f.name, trigger_event: f.trigger_event, action_type: f.action_type, action_params: params(), conditions: f.cond_key ? { [f.cond_key]: f.cond_val } : {} };
                if (await run(() => CrmApi.createAutomationRule(body), 'Rule saved.')) { setOpen(false); rules.reload(); }
              }}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
