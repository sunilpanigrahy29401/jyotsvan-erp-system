// Helpdesk: ticket queue with SLA timers and escalation, ticket detail with comments / CSAT, and the knowledge base.
import React, { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { CrmApi } from '../../../services/crmApi.ts';
import {
  ConfirmModal, Drawer, Empty, ErrorLine, EmployeeSelect, Field, Kpi, Modal, Pill, Spinner, StatusPill, Tabs, btnGhost, btnPrimary, cardCls, dt, inputCls, useAction, useLoad,
} from './shared.tsx';

type Tab = 'tickets' | 'kb';

export function SupportPage() {
  const [tab, setTab] = useState<Tab>('tickets');
  return (
    <div className="space-y-4">
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'tickets', label: 'Tickets' }, { id: 'kb', label: 'Knowledge base' }]} />
      {tab === 'tickets' ? <Tickets /> : <KnowledgeBase />}
    </div>
  );
}

function SlaCell({ t }: { t: any }) {
  if (['resolved', 'closed'].includes(t.status)) return <span className="text-slate-400">—</span>;
  const due = new Date(t.resolution_due_at).getTime();
  const mins = Math.round((due - Date.now()) / 60000);
  const text = mins < 0 ? `${Math.abs(Math.round(mins / 60))}h overdue` : mins < 120 ? `${mins}m left` : `${Math.round(mins / 60)}h left`;
  return <span className={mins < 0 ? 'text-rose-600 font-semibold' : mins < 120 ? 'text-amber-600' : 'text-slate-600'}>{text}{t.escalation_level > 0 && <span className="ml-1 text-rose-600">▲{t.escalation_level}</span>}</span>;
}

function Tickets() {
  const [f, setF] = useState({ status: 'open', priority: 'all', search: '' });
  const stats = useLoad(() => CrmApi.getTicketStats());
  const list = useLoad(() => CrmApi.getTickets({ ...f, limit: 100 }), [f.status, f.priority, f.search]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const reloadAll = () => { void stats.reload(); void list.reload(); };
  const s = stats.data;

  return (
    <div className="space-y-4">
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi title="Open" value={s.open + s.pending} sub={`${s.pending} pending`} />
          <Kpi title="Overdue" value={s.overdue} tone={s.overdue ? 'red' : undefined} />
          <Kpi title="SLA compliance" value={s.sla_compliance_percent === null ? '—' : `${s.sla_compliance_percent}%`} sub="resolved within SLA" />
          <Kpi title="Avg resolution" value={s.avg_resolution_hours === null ? '—' : `${s.avg_resolution_hours}h`} />
          <Kpi title="CSAT" value={s.avg_csat === null ? '—' : `${s.avg_csat}/5`} sub={`${s.csat_responses} responses`} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
            <option value="all">All</option>{['open', 'pending', 'resolved', 'closed'].map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
            <option value="all">Any priority</option>{['urgent', 'high', 'medium', 'low'].map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <input className={`${inputCls} w-56`} placeholder="Search subject, #, order…" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <EscalateButton onDone={reloadAll} />
          <button className={btnPrimary} onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New ticket</button>
        </div>
      </div>
      <ErrorLine message={list.error} />
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-xs text-left">
          <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b"><th className="p-3">Ticket</th><th className="p-3">Account</th><th className="p-3">Category</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">SLA</th><th className="p-3">Owner</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.loading ? <tr><td colSpan={7}><Spinner /></td></tr> : !list.data?.data.length ? <tr><td colSpan={7}><Empty>No tickets match.</Empty></td></tr> : list.data.data.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(t.id)}>
                <td className="p-3"><div className="font-semibold">{t.subject}</div><div className="font-mono text-[10px] text-slate-400">{t.ticket_number}{t.order_ref ? ` · ${t.order_ref}` : ''}</div></td>
                <td className="p-3">{t.account_name || '—'}</td><td className="p-3">{t.category_name || '—'}</td>
                <td className="p-3"><StatusPill value={t.priority} /></td><td className="p-3"><StatusPill value={t.status} /></td>
                <td className="p-3"><SlaCell t={t} /></td><td className="p-3">{t.assigned_employee_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <NewTicket onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reloadAll(); }} />}
      {openId && <TicketDrawer id={openId} onClose={() => setOpenId(null)} onChanged={reloadAll} />}
    </div>
  );
}

function EscalateButton({ onDone }: { onDone: () => void }) {
  const { run, busy } = useAction();
  return <button className={btnGhost} disabled={busy} title="Marks SLA breaches and escalates overdue tickets" onClick={async () => {
    const r = await run(() => CrmApi.escalateTickets());
    if (r) { onDone(); window.alert(`Escalated ${r.escalated} ticket(s); ${r.first_response_breached} first-response breach(es) flagged.`); }
  }}><AlertTriangle className="w-3.5 h-3.5" />Run escalation</button>;
}

function NewTicket({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const cats = useLoad(() => CrmApi.getTicketCategories());
  const accounts = useLoad(() => CrmApi.getAccounts({ limit: 200 }));
  const { run, busy } = useAction();
  const [f, setF] = useState({ subject: '', description: '', category_id: '', priority: '', account_id: '', order_ref: '', assigned_employee_id: '', channel: 'manual' });
  return (
    <Modal title="New ticket" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Subject *"><input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Description"><textarea rows={3} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select className={inputCls} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}><option value="">—</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Priority" hint="Blank = category default"><select className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="">Default</option>{['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Account"><select className={inputCls} value={f.account_id} onChange={(e) => setF({ ...f, account_id: e.target.value })}><option value="">—</option>{accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Order / invoice ref"><input className={inputCls} value={f.order_ref} onChange={(e) => setF({ ...f, order_ref: e.target.value })} /></Field>
          <Field label="Channel"><select className={inputCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>{['manual', 'phone', 'email', 'whatsapp', 'web', 'marketplace'].map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Assign to"><EmployeeSelect value={f.assigned_employee_id} onChange={(v) => setF({ ...f, assigned_employee_id: v })} /></Field>
        </div>
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={busy || !f.subject.trim()} onClick={async () => {
            const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
            if (await run(() => CrmApi.createTicket(body), 'Ticket created.')) onSaved();
          }}>Create</button></div>
      </div>
    </Modal>
  );
}

function TicketDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getTicket(id), [id]);
  const { run, busy } = useAction();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [score, setScore] = useState(5);
  const after = async () => { await reload(); onChanged(); };
  if (loading && !data) return <Drawer title="Ticket" onClose={onClose}><Spinner /></Drawer>;
  if (error || !data) return <Drawer title="Ticket" onClose={onClose}><ErrorLine message={error} /></Drawer>;
  const t = data;
  const closed = t.status === 'closed';
  return (
    <Drawer title={t.subject} subtitle={<span className="font-mono">{t.ticket_number} · {t.account_name || 'No account'}{t.order_ref ? ` · ${t.order_ref}` : ''}</span>} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StatusPill value={t.status} /><StatusPill value={t.priority} />{t.escalation_level > 0 && <Pill tone="red">escalated L{t.escalation_level}</Pill>}
        {t.sla_breached_at && <Pill tone="red">SLA breached</Pill>}
        <span className="text-slate-500">First reply due {dt(t.first_response_due_at)} · resolve by {dt(t.resolution_due_at)}</span>
      </div>
      {t.description && <p className="text-xs text-slate-700 whitespace-pre-wrap">{t.description}</p>}
      <div className="flex flex-wrap gap-2">
        {t.status === 'open' && <button className={btnGhost} disabled={busy} onClick={async () => { if (await run(() => CrmApi.setTicketStatus(id, 'pending'), 'Marked pending.')) await after(); }}>Waiting on customer</button>}
        {t.status === 'pending' && <button className={btnGhost} disabled={busy} onClick={async () => { if (await run(() => CrmApi.setTicketStatus(id, 'open'), 'Re-opened.')) await after(); }}>Back to open</button>}
        {['open', 'pending'].includes(t.status) && <button className={btnPrimary} onClick={() => setResolving(true)}>Resolve</button>}
        {t.status === 'resolved' && <button className={btnPrimary} disabled={busy} onClick={async () => { if (await run(() => CrmApi.setTicketStatus(id, 'closed'), 'Ticket closed.')) await after(); }}>Close</button>}
        {['resolved', 'closed'].includes(t.status) && <button className={btnGhost} disabled={busy} onClick={async () => { if (await run(() => CrmApi.setTicketStatus(id, 'open'), 'Re-opened.')) await after(); }}>Re-open</button>}
      </div>
      {['resolved', 'closed'].includes(t.status) && (
        <div className={`${cardCls} p-3 text-xs flex items-center gap-3`}>
          {t.csat_score ? <>Customer rating: <strong>{t.csat_score}/5</strong>{t.csat_comment && <span className="text-slate-500">“{t.csat_comment}”</span>}</> : <>
            <span>Record customer satisfaction:</span>
            <select className={`${inputCls} w-20`} value={score} onChange={(e) => setScore(Number(e.target.value))} aria-label="CSAT score">{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select>
            <button className={btnGhost} disabled={busy} onClick={async () => { if (await run(() => CrmApi.rateTicket(id, score), 'Rating saved.')) await after(); }}>Save</button></>}
        </div>
      )}
      <div className="space-y-2">
        {t.comments.map((c: any) => (
          <div key={c.id} className={`p-3 rounded-lg text-xs border ${c.is_internal ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>{c.author_name || 'System'}{c.is_internal ? ' · internal note' : ''}</span><span>{dt(c.created_at)}</span></div>
            <div className="whitespace-pre-wrap text-slate-800">{c.body}</div>
          </div>
        ))}
      </div>
      {!closed && (
        <div className="space-y-2">
          <textarea rows={3} className={inputCls} placeholder="Write a reply or internal note…" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex items-center justify-between"><label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal note (not visible to the customer)</label>
            <button className={btnPrimary} disabled={busy || !reply.trim()} onClick={async () => { if (await run(() => CrmApi.commentTicket(id, reply, internal), internal ? 'Note added.' : 'Reply sent.')) { setReply(''); await after(); } }}>{internal ? 'Add note' : 'Reply'}</button></div>
          <p className="text-[10px] text-slate-400">Replies are recorded on the ticket. E-mail/WhatsApp delivery is not connected, so contact the customer through your usual channel.</p>
        </div>
      )}
      {resolving && <ConfirmModal title="Resolve ticket" message="Describe what was done. This is shown on the ticket as the resolution." withReason="Resolution note" confirmLabel="Resolve" onClose={() => setResolving(false)}
        onConfirm={async (note) => { setResolving(false); if (await run(() => CrmApi.setTicketStatus(id, 'resolved', note), 'Ticket resolved.')) await after(); }} />}
    </Drawer>
  );
}

function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useLoad(() => CrmApi.getKb({ search }), [search]);
  const [edit, setEdit] = useState<any | null>(null);
  const [view, setView] = useState<any | null>(null);
  const { run, busy } = useAction();
  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2"><input className={`${inputCls} max-w-sm`} placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={btnPrimary} onClick={() => setEdit({ title: '', category: '', body: '', status: 'draft' })}><Plus className="w-4 h-4" />New article</button></div>
      <ErrorLine message={error} />
      {loading ? <Spinner /> : !data?.length ? <Empty>No articles yet. Write answers to repeat questions so the team can reuse them.</Empty> : (
        <div className="grid md:grid-cols-2 gap-3">
          {data.map((a) => (
            <div key={a.id} className={`${cardCls} p-4 text-xs`}>
              <div className="flex justify-between"><button className="font-bold text-sm text-left text-slate-900 hover:underline" onClick={async () => setView(await CrmApi.getKbArticle(a.id))}>{a.title}</button><StatusPill value={a.status} /></div>
              <div className="text-slate-500 mt-1 line-clamp-2">{a.excerpt}</div>
              <div className="flex justify-between items-center mt-3 text-[10px] text-slate-400"><span>{a.category || 'Uncategorised'} · {a.views} views · 👍 {a.helpful_yes} 👎 {a.helpful_no}</span>
                <span className="flex gap-3"><button className="text-blue-600 hover:underline" onClick={async () => setEdit(await CrmApi.getKbArticle(a.id))}>Edit</button>
                  <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (window.confirm('Delete this article?') && (await run(() => CrmApi.deleteKb(a.id), 'Article deleted.'))) reload(); }}>Delete</button></span></div>
            </div>
          ))}
        </div>
      )}
      {view && <Drawer title={view.title} subtitle={view.category} onClose={() => setView(null)}><div className="text-sm whitespace-pre-wrap text-slate-800">{view.body}</div>
        <div className="flex gap-2 text-xs items-center">Was this helpful?
          <button className={btnGhost} onClick={() => run(() => CrmApi.kbFeedback(view.id, true), 'Thanks.')}>Yes</button><button className={btnGhost} onClick={() => run(() => CrmApi.kbFeedback(view.id, false), 'Thanks.')}>No</button></div></Drawer>}
      {edit && (
        <Modal title={edit.id ? 'Edit article' : 'New article'} onClose={() => setEdit(null)} wide>
          <div className="space-y-3">
            <Field label="Title *"><input className={inputCls} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><input className={inputCls} value={edit.category || ''} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></Field>
              <Field label="Status"><select className={inputCls} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></Field>
            </div>
            <Field label="Body *"><textarea rows={10} className={inputCls} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !edit.title.trim() || !edit.body.trim()} onClick={async () => {
                const body = { title: edit.title, category: edit.category || undefined, body: edit.body, status: edit.status };
                if (await run(() => (edit.id ? CrmApi.updateKb(edit.id, body) : CrmApi.createKb(body)), 'Article saved.')) { setEdit(null); reload(); }
              }}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
