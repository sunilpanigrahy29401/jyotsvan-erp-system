// Customer 360: everything about one account on one screen, with the partner-onboarding (KYC) and visit workflows.
import React, { useState } from 'react';
import { CrmApi } from '../../../services/crmApi.ts';
import {
  Drawer, Empty, ErrorLine, Field, Kpi, Modal, Pill, Spinner, StatusPill, Tabs, btnGhost, btnPrimary, cardCls, day, dt, inputCls, inr, label, useAction, useLoad,
} from './shared.tsx';

type Tab = 'overview' | 'contacts' | 'deals' | 'quotes' | 'support' | 'activity' | 'onboarding' | 'visits' | 'operations';

function LinkPanel({ accountId, links, onChanged }: { accountId: string; links: any[]; onChanged: () => void }) {
  const { run, busy } = useAction();
  const [type, setType] = useState('retailer');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const search = async (text: string, t = type) => { setQ(text); setHits(text.trim().length >= 2 ? await CrmApi.searchLinkable(t, text.trim()).catch(() => []) : []); };
  return (
    <div className={`${cardCls} p-3 space-y-2`}>
      <div className="text-[10px] font-bold uppercase text-slate-400">Linked operational records</div>
      {links.length === 0 ? <div className="text-slate-500">None. Link this account to a retailer, distributor or C&F so its orders and invoices appear here.</div> : links.map((l) => (
        <div key={l.id} className="flex justify-between"><span><Pill tone="blue">{l.entity_type}</Pill> {l.entity_name || l.entity_id}</span>
          <button className="text-rose-600 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.unlinkAccount(l.id), 'Link removed.')) onChanged(); }}>Unlink</button></div>))}
      <div className="flex gap-2 relative">
        <select className={`${inputCls} w-32`} value={type} onChange={(e) => { setType(e.target.value); void search(q, e.target.value); }} aria-label="Record type"><option value="retailer">Retailer</option><option value="distributor">Distributor</option><option value="cf">C&F</option></select>
        <input className={inputCls} placeholder="Search by name or code…" value={q} onChange={(e) => void search(e.target.value)} />
        {hits.length > 0 && <ul className="absolute top-full mt-1 left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {hits.map((h) => <li key={h.id}><button className="w-full text-left px-3 py-2 hover:bg-slate-50" onClick={async () => { if (await run(() => CrmApi.linkAccount(accountId, type, h.id), 'Linked.')) { setHits([]); setQ(''); onChanged(); } }}>{h.name} <span className="text-slate-400">{h.code}</span></button></li>)}</ul>}
      </div>
    </div>
  );
}

export function Customer360({ accountId, onClose, onChanged }: { accountId: string; onClose: () => void; onChanged?: () => void }) {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getAccount360(accountId), [accountId]);
  const [tab, setTab] = useState<Tab>('overview');
  const { run, busy } = useAction();
  const [doc, setDoc] = useState<{ doc_type: string; doc_number: string; file_url: string; expires_on: string } | null>(null);
  const [note, setNote] = useState('');
  const refresh = () => { reload(); onChanged?.(); };

  if (loading && !data) return <Drawer title="Loading…" onClose={onClose}><Spinner /></Drawer>;
  if (error || !data) return <Drawer title="Customer 360" onClose={onClose}><ErrorLine message={error || 'Not found.'} /></Drawer>;
  const a = data.account;
  const s = data.summary;

  return (
    <Drawer title={<span className="flex items-center gap-2">{a.name}<StatusPill value={a.status} /></span>}
      subtitle={<span className="font-mono">{a.account_number} · {label(a.relationship_type)} · {label(a.tier)}</span>} onClose={onClose}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' }, { id: 'contacts', label: 'Contacts', count: data.contacts.length }, { id: 'deals', label: 'Deals', count: data.deals.length },
        { id: 'quotes', label: 'Quotes', count: data.quotes.length }, { id: 'support', label: 'Support', count: data.tickets.length },
        { id: 'activity', label: 'Activity', count: data.activities.length }, { id: 'onboarding', label: 'Onboarding / KYC' },
        { id: 'visits', label: 'Visits', count: data.visits.length }, { id: 'operations', label: 'Orders & invoices' },
      ]} />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi title="Open pipeline" value={inr(s.open_deal_value)} />
            <Kpi title="Won" value={inr(s.won_deal_value)} tone="green" />
            <Kpi title="Open tickets" value={s.open_tickets} tone={s.open_tickets ? 'amber' : undefined} />
            <Kpi title="Last activity" value={<span className="text-sm">{day(s.last_activity_at)}</span>} />
          </div>
          <div className={`${cardCls} p-4 grid grid-cols-2 gap-3 text-xs`}>
            {([['Phone', a.phone], ['E-mail', a.email], ['City / State', [a.city, a.state].filter(Boolean).join(', ')], ['GSTIN', a.gstin], ['PAN', a.pan], ['Credit limit', inr(a.credit_limit)],
              ['Owner', a.assigned_employee_name], ['Territory', a.territory], ['KYC', label(a.kyc_status)], ['Onboarding', label(a.onboarding_status)]] as const).map(([k, v]) => (
              <div key={k}><div className="text-[10px] text-slate-400">{k}</div><div className="font-medium text-slate-800">{v || '—'}</div></div>
            ))}
          </div>
          {data.consent.length > 0 && (
            <div className={`${cardCls} p-4 text-xs`}>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Contact consent</div>
              <div className="flex flex-wrap gap-2">{data.consent.map((c: any, i: number) => <span key={i}>{c.display_name}: {c.channel} <StatusPill value={c.status} /></span>)}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'contacts' && (data.contacts.length === 0 ? <Empty>No contacts.</Empty> : (
        <ul className="divide-y divide-slate-100 text-xs">
          {data.contacts.map((c: any) => (
            <li key={c.id} className="py-2.5 flex justify-between"><div><div className="font-semibold text-slate-800">{c.display_name} {c.is_primary && <Pill tone="blue">primary</Pill>}</div>
              <div className="text-slate-500">{c.designation || label(c.role)} · {c.phone} · {c.email || 'no e-mail'}</div></div></li>
          ))}
        </ul>
      ))}

      {tab === 'deals' && (data.deals.length === 0 ? <Empty>No deals.</Empty> : (
        <ul className="divide-y divide-slate-100 text-xs">
          {data.deals.map((d: any) => (
            <li key={d.id} className="py-2.5 flex justify-between items-center"><div><div className="font-semibold">{d.title}</div><div className="text-slate-500 font-mono">{d.deal_number} · {d.stage_name} · close {day(d.expected_close_date)}</div></div>
              <div className="text-right"><div className="font-bold">{inr(d.deal_value)}</div><StatusPill value={d.status} /></div></li>
          ))}
        </ul>
      ))}

      {tab === 'quotes' && (data.quotes.length === 0 ? <Empty>No quotations.</Empty> : (
        <ul className="divide-y divide-slate-100 text-xs">
          {data.quotes.map((q: any) => (
            <li key={q.id} className="py-2.5 flex justify-between"><div><div className="font-semibold">{q.title}</div><div className="text-slate-500 font-mono">{q.quote_number} · valid until {day(q.valid_until)}</div></div>
              <div className="text-right"><div className="font-bold">{inr(q.grand_total)}</div><StatusPill value={q.status} /></div></li>
          ))}
        </ul>
      ))}

      {tab === 'support' && (data.tickets.length === 0 ? <Empty>No tickets.</Empty> : (
        <ul className="divide-y divide-slate-100 text-xs">
          {data.tickets.map((t: any) => (
            <li key={t.id} className="py-2.5 flex justify-between"><div><div className="font-semibold">{t.subject}</div><div className="text-slate-500 font-mono">{t.ticket_number} · {dt(t.created_at)}{t.csat_score ? ` · CSAT ${t.csat_score}/5` : ''}</div></div>
              <div className="flex gap-1"><StatusPill value={t.priority} /><StatusPill value={t.status} /></div></li>
          ))}
        </ul>
      ))}

      {tab === 'activity' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Add a note about this customer…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className={btnPrimary} disabled={busy || !note.trim()} onClick={async () => { if (await run(() => CrmApi.createNote({ account_id: accountId, content: note }), 'Note added.')) { setNote(''); refresh(); } }}>Add note</button>
          </div>
          {data.notes.map((n: any) => <div key={n.id} className={`${cardCls} p-3 text-xs`}><div className="text-slate-800">{n.content}</div><div className="text-[10px] text-slate-400 mt-1">{n.created_by_name} · {dt(n.created_at)}</div></div>)}
          {data.activities.length === 0 ? <Empty>No activities logged.</Empty> : (
            <ul className="divide-y divide-slate-100 text-xs">
              {data.activities.map((x: any) => <li key={x.id} className="py-2 flex justify-between"><div><span className="font-semibold">{x.subject}</span><div className="text-slate-500">{label(x.activity_type)} · {dt(x.completed_at || x.due_date || x.created_at)}</div></div><Pill tone={x.is_completed ? 'green' : 'amber'}>{x.is_completed ? 'done' : 'open'}</Pill></li>)}
            </ul>
          )}
        </div>
      )}

      {tab === 'onboarding' && (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex gap-2"><span>KYC:</span><StatusPill value={a.kyc_status} /><span>Onboarding:</span><StatusPill value={a.onboarding_status} /></div>
            <div className="flex gap-2">
              <button className={btnGhost} onClick={() => setDoc({ doc_type: 'gst', doc_number: a.gstin || '', file_url: '', expires_on: '' })}>Add document</button>
              <button className={btnPrimary} disabled={busy || a.kyc_status === 'verified'} onClick={async () => { if (await run(() => CrmApi.verifyKyc(accountId), 'KYC verified.')) refresh(); }}>Complete KYC</button>
            </div>
          </div>
          <p className="text-slate-500">KYC completes when GST and PAN documents are verified and the account has a GSTIN and PAN on record.</p>
          {data.documents.length === 0 ? <Empty>No documents uploaded yet.</Empty> : data.documents.map((d: any) => (
            <div key={d.id} className={`${cardCls} p-3 flex items-center justify-between`}>
              <div><div className="font-semibold uppercase">{label(d.doc_type)} <span className="font-normal text-slate-500 normal-case">{d.doc_number}</span></div>
                <div className="text-[10px] text-slate-400">{d.file_name || 'no file'}{d.expires_on ? ` · expires ${day(d.expires_on)}` : ''}{d.review_notes ? ` · ${d.review_notes}` : ''}</div></div>
              <div className="flex items-center gap-2"><StatusPill value={d.status} />
                {d.status === 'pending' && (<>
                  <button className="text-emerald-700 hover:underline" disabled={busy} onClick={async () => { if (await run(() => CrmApi.reviewDocument(d.id, { status: 'verified' }), 'Document verified.')) refresh(); }}>Verify</button>
                  <button className="text-rose-700 hover:underline" disabled={busy} onClick={async () => {
                    const why = window.prompt('Reason for rejecting this document?');
                    if (why && (await run(() => CrmApi.reviewDocument(d.id, { status: 'rejected', review_notes: why }), 'Document rejected.'))) refresh();
                  }}>Reject</button></>)}
              </div>
            </div>
          ))}
          {doc && (
            <Modal title="Add onboarding document" onClose={() => setDoc(null)}>
              <div className="space-y-3">
                <Field label="Document type"><select className={inputCls} value={doc.doc_type} onChange={(e) => setDoc({ ...doc, doc_type: e.target.value })}>
                  {['gst', 'pan', 'drug_licence', 'fssai', 'shop_act', 'cheque', 'agreement', 'photo', 'other'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
                <Field label="Document number"><input className={inputCls} value={doc.doc_number} onChange={(e) => setDoc({ ...doc, doc_number: e.target.value })} /></Field>
                <Field label="File link (https://…)" hint="Paste the link to the uploaded scan; file storage is handled outside the CRM."><input className={inputCls} value={doc.file_url} onChange={(e) => setDoc({ ...doc, file_url: e.target.value })} /></Field>
                <Field label="Expires on"><input type="date" className={inputCls} value={doc.expires_on} onChange={(e) => setDoc({ ...doc, expires_on: e.target.value })} /></Field>
                <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setDoc(null)}>Cancel</button>
                  <button className={btnPrimary} disabled={busy} onClick={async () => { if (await run(() => CrmApi.addDocument(accountId, { ...doc, expires_on: doc.expires_on || undefined, file_url: doc.file_url || undefined }), 'Document added.')) { setDoc(null); refresh(); } }}>Save</button></div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {tab === 'visits' && (
        <div className="space-y-3 text-xs">
          <div className="flex justify-end"><button className={btnPrimary} disabled={busy} onClick={async () => { if (await run(() => CrmApi.createVisit({ account_id: accountId, visit_type: 'sales' }), 'Visit planned.')) refresh(); }}>Plan visit</button></div>
          {data.visits.length === 0 ? <Empty>No visits logged.</Empty> : data.visits.map((v: any) => (
            <div key={v.id} className={`${cardCls} p-3 flex items-center justify-between`}>
              <div><div className="font-semibold capitalize">{label(v.visit_type)} visit</div>
                <div className="text-slate-500">{v.check_in_at ? `In ${dt(v.check_in_at)}` : 'Not started'}{v.check_out_at ? ` · Out ${dt(v.check_out_at)}` : ''}{v.check_in_lat ? ` · GPS ${Number(v.check_in_lat).toFixed(4)}, ${Number(v.check_in_lng).toFixed(4)}` : ''}</div>
                {v.summary && <div className="text-slate-700 mt-1">{v.summary}</div>}</div>
              <div className="flex gap-2">
                {!v.check_in_at && <button className={btnGhost} onClick={() => navigator.geolocation?.getCurrentPosition(
                  async (p) => { if (await run(() => CrmApi.visitCheckIn(v.id, { lat: p.coords.latitude, lng: p.coords.longitude }), 'Checked in.')) refresh(); },
                  async () => { if (await run(() => CrmApi.visitCheckIn(v.id, {}), 'Checked in (no GPS).')) refresh(); })}>Check in</button>}
                {v.check_in_at && !v.check_out_at && <button className={btnGhost} onClick={async () => {
                  const summary = window.prompt('Visit summary?') || undefined;
                  if (await run(() => CrmApi.visitCheckOut(v.id, { summary }), 'Checked out.')) refresh();
                }}>Check out</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'operations' && (
        <div className="space-y-3 text-xs">
          <LinkPanel accountId={accountId} links={data.linked_records} onChanged={refresh} />
          {!s.orders_available ? <Empty>This account is not linked to a distributor, retailer or C&F record yet, so orders and invoices cannot be shown.</Empty> : (<>
            <div className="font-bold text-slate-700">Sales orders</div>
            {data.orders.length === 0 ? <Empty>No orders.</Empty> : data.orders.map((o: any) => <div key={o.id} className="flex justify-between py-1.5 border-b border-slate-100"><span className="font-mono">{o.order_number} · {day(o.order_date || o.created_at)}</span><span>{inr(o.grand_total)} <StatusPill value={o.status} /></span></div>)}
            <div className="font-bold text-slate-700 pt-2">Invoices</div>
            {data.invoices.length === 0 ? <Empty>No invoices.</Empty> : data.invoices.map((o: any) => <div key={o.id} className="flex justify-between py-1.5 border-b border-slate-100"><span className="font-mono">{o.invoice_number} · due {day(o.due_date)}</span><span>{inr(o.grand_total)} · outstanding {inr(o.amount_outstanding)}</span></div>)}
          </>)}
        </div>
      )}
    </Drawer>
  );
}
