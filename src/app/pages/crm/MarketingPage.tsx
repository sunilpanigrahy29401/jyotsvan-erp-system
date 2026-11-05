// Marketing: templates, audiences, campaigns (consent + suppression enforced), drip sequences and the suppression list.
// No delivery provider is connected: launching a campaign QUEUES recipients and says so; sequences create tasks for the owner.
import React, { useState } from 'react';
import { Info, Plus } from 'lucide-react';
import { CrmApi } from '../../../services/crmApi.ts';
import { Empty, ErrorLine, Field, Modal, Spinner, StatusPill, Tabs, btnGhost, btnPrimary, cardCls, dt, inputCls, label, useAction, useLoad } from './shared.tsx';

type Tab = 'campaigns' | 'audiences' | 'templates' | 'sequences' | 'suppressions';

export function MarketingPage() {
  const [tab, setTab] = useState<Tab>('campaigns');
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>E-mail, SMS and WhatsApp delivery providers are not connected yet. Launching a campaign freezes the eligible recipients (consent and unsubscribes applied) and queues them — nothing is sent. Download the recipient list to send through your current tool.</span>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'campaigns', label: 'Campaigns' }, { id: 'audiences', label: 'Audiences' }, { id: 'templates', label: 'Templates' }, { id: 'sequences', label: 'Sequences' }, { id: 'suppressions', label: 'Unsubscribes' }]} />
      {tab === 'campaigns' && <Campaigns />}{tab === 'audiences' && <Audiences />}{tab === 'templates' && <Templates />}{tab === 'sequences' && <Sequences />}{tab === 'suppressions' && <Suppressions />}
    </div>
  );
}

function Campaigns() {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getCampaigns());
  const templates = useLoad(() => CrmApi.getTemplates());
  const audiences = useLoad(() => CrmApi.getAudiences());
  const { run, busy } = useAction();
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: '', channel: 'email', template_id: '', audience_id: '' });
  const [preview, setPreview] = useState<any | null>(null);

  const check = async () => { const r = await run(() => CrmApi.previewAudience(f.audience_id, f.channel)); if (r) setPreview(r); };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New campaign</button></div>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : !data?.length ? <Empty>No campaigns yet.</Empty> : data.map((c) => (
        <div key={c.id} className={`${cardCls} p-4 text-xs flex flex-wrap justify-between gap-3`}>
          <div><div className="font-bold text-sm">{c.name}</div><div className="text-slate-500">{c.channel} · {c.template_name} → {c.audience_name}</div>
            {c.stats?.queued !== undefined && <div className="mt-1 text-slate-700">{c.stats.queued} queued of {c.stats.audience_size} · skipped: {c.stats.skipped?.no_consent} no consent, {c.stats.skipped?.suppressed} unsubscribed, {c.stats.skipped?.no_address} no address</div>}</div>
          <div className="flex items-center gap-2"><StatusPill value={c.status} />
            {c.status === 'draft' && <button className={btnPrimary} disabled={busy} onClick={async () => { if (window.confirm('Freeze the recipient list and queue this campaign?') && (await run(() => CrmApi.launchCampaign(c.id), 'Campaign queued (nothing is sent until a delivery provider is connected).'))) reload(); }}>Queue</button>}
            {c.status === 'queued' && <><button className={btnGhost} onClick={() => run(() => CrmApi.downloadRecipients(c.id))}>Download recipients</button><button className={btnGhost} disabled={busy} onClick={async () => { if (await run(() => CrmApi.cancelCampaign(c.id), 'Cancelled.')) reload(); }}>Cancel</button></>}
            {['draft', 'cancelled'].includes(c.status) && <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this campaign?') && (await run(() => CrmApi.deleteCampaign(c.id), 'Deleted.'))) reload(); }}>Delete</button>}
          </div>
        </div>
      ))}
      {creating && (
        <Modal title="New campaign" onClose={() => { setCreating(false); setPreview(null); }}>
          <div className="space-y-3">
            <Field label="Name *"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Channel"><select className={inputCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value, template_id: '' })}>{['email', 'sms', 'whatsapp'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Template *"><select className={inputCls} value={f.template_id} onChange={(e) => setF({ ...f, template_id: e.target.value })}><option value="">Select…</option>
              {templates.data?.filter((t) => t.channel === f.channel && t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            <Field label="Audience *"><select className={inputCls} value={f.audience_id} onChange={(e) => { setF({ ...f, audience_id: e.target.value }); setPreview(null); }}><option value="">Select…</option>{audiences.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            {f.audience_id && <button className={btnGhost} onClick={check} disabled={busy}>Check who can receive this</button>}
            {preview && <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">{preview.eligible} of {preview.total} can receive it. Excluded: {preview.skipped.no_consent} without consent, {preview.skipped.suppressed} unsubscribed, {preview.skipped.no_address} without an address.</div>}
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setCreating(false)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !f.name.trim() || !f.template_id || !f.audience_id} onClick={async () => { if (await run(() => CrmApi.createCampaign(f), 'Campaign saved as draft.')) { setCreating(false); setPreview(null); reload(); } }}>Save draft</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Audiences() {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getAudiences());
  const sources = useLoad(() => CrmApi.getSources());
  const { run, busy } = useAction();
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: '', entity: 'lead', status: '', source_id: '', state: '', city: '', tag: '', min_score: '' });
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New audience</button></div>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : !data?.length ? <Empty>No audiences yet. An audience is a saved filter over leads or contacts.</Empty> : data.map((a) => (
        <div key={a.id} className={`${cardCls} p-4 text-xs flex justify-between`}>
          <div><div className="font-bold text-sm">{a.name}</div><div className="text-slate-500">{a.entity}s · {Object.entries(a.filters || {}).map(([k, v]) => `${label(k)}: ${v}`).join(', ') || 'everyone'}</div></div>
          <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this audience?') && (await run(() => CrmApi.deleteAudience(a.id), 'Deleted.'))) reload(); }}>Delete</button>
        </div>
      ))}
      {creating && (
        <Modal title="New audience" onClose={() => setCreating(false)}>
          <div className="space-y-3">
            <Field label="Name *"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Who"><select className={inputCls} value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })}><option value="lead">Leads</option><option value="contact">Contacts</option></select></Field>
            {f.entity === 'lead' && <div className="grid grid-cols-2 gap-3">
              <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Any open</option>{['new', 'assigned', 'contacted', 'attempted', 'qualified', 'nurturing'].map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Source"><select className={inputCls} value={f.source_id} onChange={(e) => setF({ ...f, source_id: e.target.value })}><option value="">Any</option>{sources.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="State"><input className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
              <Field label="City"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
              <Field label="Tag"><input className={inputCls} value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} /></Field>
              <Field label="Min. score"><input type="number" min="0" max="100" className={inputCls} value={f.min_score} onChange={(e) => setF({ ...f, min_score: e.target.value })} /></Field>
            </div>}
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setCreating(false)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !f.name.trim()} onClick={async () => {
                const { name, entity, ...rest } = f;
                const filters = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== ''));
                if (await run(() => CrmApi.createAudience({ name, entity, filters }), 'Audience saved.')) { setCreating(false); reload(); }
              }}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Templates() {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getTemplates());
  const meta = useLoad(() => CrmApi.getTemplateMeta());
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<any | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => setEdit({ name: '', channel: 'email', subject: '', body: '', provider_template: '' })}><Plus className="w-4 h-4" />New template</button></div>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : !data?.length ? <Empty>No templates yet.</Empty> : data.map((t) => (
        <div key={t.id} className={`${cardCls} p-4 text-xs`}>
          <div className="flex justify-between"><div className="font-bold text-sm">{t.name} <StatusPill value={t.channel} /></div>
            <span className="flex gap-3"><button className="text-blue-600 hover:underline" onClick={() => setEdit(t)}>Edit</button>
              <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this template?') && (await run(() => CrmApi.deleteTemplate(t.id), 'Deleted.'))) reload(); }}>Delete</button></span></div>
          {t.subject && <div className="text-slate-700 mt-1">Subject: {t.subject}</div>}
          <div className="text-slate-500 mt-1 whitespace-pre-wrap line-clamp-3">{t.body}</div>
        </div>
      ))}
      {edit && (
        <Modal title={edit.id ? 'Edit template' : 'New template'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Field label="Name *"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Channel"><select className={inputCls} value={edit.channel} disabled={Boolean(edit.id)} onChange={(e) => setEdit({ ...edit, channel: e.target.value })}>{['email', 'sms', 'whatsapp'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            {edit.channel === 'email' && <Field label="Subject *"><input className={inputCls} value={edit.subject || ''} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>}
            <Field label="Body *" hint={`Placeholders: ${(meta.data?.placeholders || []).map((p) => `{{${p}}}`).join(' ')}`}><textarea rows={6} className={inputCls} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            {edit.channel !== 'email' && <Field label="Approved provider template id" hint="WhatsApp template name / SMS DLT template id, once your provider is connected."><input className={inputCls} value={edit.provider_template || ''} onChange={(e) => setEdit({ ...edit, provider_template: e.target.value })} /></Field>}
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !edit.name.trim() || !edit.body.trim()} onClick={async () => {
                const body = { name: edit.name, channel: edit.channel, subject: edit.subject || undefined, body: edit.body, provider_template: edit.provider_template || undefined };
                if (await run(() => (edit.id ? CrmApi.updateTemplate(edit.id, body) : CrmApi.createTemplate(body)), 'Template saved.')) { setEdit(null); reload(); }
              }}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Sequences() {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getSequences());
  const templates = useLoad(() => CrmApi.getTemplates());
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<any | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex justify-between"><button className={btnGhost} disabled={busy} onClick={async () => { const r = await run(() => CrmApi.runSequences()); if (r) { window.alert(`Processed ${r.processed}: ${r.tasks_created} task(s) created, ${r.stopped_no_consent} stopped, ${r.completed} completed.`); reload(); } }}>Run due steps now</button>
        <button className={btnPrimary} onClick={() => setEdit({ name: '', channel: 'email', steps: [{ delay_hours: 0, template_id: '' }] })}><Plus className="w-4 h-4" />New sequence</button></div>
      <p className="text-[11px] text-slate-500">Each due step creates a task for the lead owner (“send this template”), because no delivery provider is connected. Enrolment stops automatically for people without marketing consent, who unsubscribed, or who converted.</p>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : !data?.length ? <Empty>No sequences yet.</Empty> : data.map((s) => (
        <div key={s.id} className={`${cardCls} p-4 text-xs flex justify-between`}>
          <div><div className="font-bold text-sm">{s.name} <StatusPill value={s.channel} /></div><div className="text-slate-500">{s.steps.length} step(s) · {s.active_enrollments} active</div></div>
          <div className="flex gap-3 items-center">
            <button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.updateSequence(s.id, { is_active: !s.is_active }), s.is_active ? 'Paused.' : 'Activated.')) reload(); }}>{s.is_active ? 'Pause' : 'Activate'}</button>
            <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this sequence and its enrolments?') && (await run(() => CrmApi.deleteSequence(s.id), 'Deleted.'))) reload(); }}>Delete</button></div>
        </div>
      ))}
      {edit && (
        <Modal title="New sequence" onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Field label="Name *"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Channel"><select className={inputCls} value={edit.channel} onChange={(e) => setEdit({ ...edit, channel: e.target.value, steps: edit.steps.map((s: any) => ({ ...s, template_id: '' })) })}>{['email', 'sms', 'whatsapp'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            {edit.steps.map((st: any, i: number) => (
              <div key={i} className="grid grid-cols-[6rem_1fr] gap-2 items-end">
                <Field label={`Step ${i + 1}: wait (h)`}><input type="number" min="0" className={inputCls} value={st.delay_hours} onChange={(e) => setEdit({ ...edit, steps: edit.steps.map((x: any, k: number) => (k === i ? { ...x, delay_hours: Number(e.target.value) } : x)) })} /></Field>
                <Field label="Template"><select className={inputCls} value={st.template_id} onChange={(e) => setEdit({ ...edit, steps: edit.steps.map((x: any, k: number) => (k === i ? { ...x, template_id: e.target.value } : x)) })}><option value="">Select…</option>
                  {templates.data?.filter((t) => t.channel === edit.channel).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
              </div>
            ))}
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setEdit({ ...edit, steps: [...edit.steps, { delay_hours: 24, template_id: '' }] })}>+ Add step</button>
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !edit.name.trim() || edit.steps.some((s: any) => !s.template_id)} onClick={async () => { if (await run(() => CrmApi.createSequence(edit), 'Sequence saved.')) { setEdit(null); reload(); } }}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Suppressions() {
  const [channel, setChannel] = useState('email');
  const { data, loading, error, reload } = useLoad(() => CrmApi.getSuppressions(channel), [channel]);
  const { run, busy } = useAction();
  const [addr, setAddr] = useState('');
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white" value={channel} onChange={(e) => setChannel(e.target.value)}>{['email', 'sms', 'whatsapp'].map((c) => <option key={c}>{c}</option>)}</select>
        <input className={`${inputCls} max-w-xs`} placeholder={channel === 'email' ? 'address@example.com' : '10-digit mobile'} value={addr} onChange={(e) => setAddr(e.target.value)} />
        <button className={btnGhost} disabled={busy || !addr.trim()} onClick={async () => { if (await run(() => CrmApi.addSuppression({ channel, address: addr, reason: 'manual' }), 'Added to the do-not-contact list.')) { setAddr(''); reload(); } }}>Add</button>
      </div>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : !data?.length ? <Empty>Nobody is on the {channel} do-not-contact list.</Empty> : (
        <div className={`${cardCls} divide-y text-xs`}>{data.map((s) => (
          <div key={s.id} className="p-3 flex justify-between"><span className="font-mono">{s.address_norm}</span>
            <span className="flex gap-3 items-center"><span className="text-slate-500">{label(s.reason)} · {dt(s.created_at)}</span>
              {['unsubscribed', 'manual'].includes(s.reason) && <button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Remove from the list? Only do this if the person asked to receive messages again.') && (await run(() => CrmApi.removeSuppression(s.id), 'Removed.'))) reload(); }}>Remove</button>}</span></div>
        ))}</div>
      )}
    </div>
  );
}
