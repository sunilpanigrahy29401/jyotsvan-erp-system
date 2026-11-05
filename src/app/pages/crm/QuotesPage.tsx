// Quotations: builder tied to the product master (price + GST default), draft → sent → accepted/rejected lifecycle.
import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CrmApi, type ProductLookup } from '../../../services/crmApi.ts';
import {
  ConfirmModal, Drawer, Empty, ErrorLine, Field, Modal, Spinner, StatusPill, btnGhost, btnPrimary, cardCls, day, inputCls, inr, useAction, useLoad,
} from './shared.tsx';

interface Line { product_id?: string; sku?: string | null; description: string; quantity: number; unit_price: number; discount_pct: number; tax_pct: number }
const blank = (): Line => ({ description: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_pct: 0 });

export function totals(lines: Line[]) {
  let sub = 0, disc = 0, tax = 0;
  for (const l of lines) {
    const gross = l.quantity * l.unit_price, d = (gross * l.discount_pct) / 100;
    sub += gross; disc += d; tax += ((gross - d) * l.tax_pct) / 100;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: r(sub), discount: r(disc), tax: r(tax), total: r(sub - disc + tax) };
}

export function QuotesPage() {
  const [status, setStatus] = useState('all');
  const { data, loading, error, reload } = useLoad(() => CrmApi.getQuotes({ status, limit: 100 }), [status]);
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
          <option value="all">All statuses</option>{['draft', 'sent', 'accepted', 'rejected', 'expired'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className={btnPrimary} onClick={() => setEditing({})}><Plus className="w-4 h-4" />New quotation</button>
      </div>
      <ErrorLine message={error} />
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-xs text-left">
          <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200"><th className="p-3">Quote</th><th className="p-3">Account</th><th className="p-3">Valid until</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5}><Spinner /></td></tr> : !data?.data.length ? <tr><td colSpan={5}><Empty>No quotations yet.</Empty></td></tr> : data.data.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(q.id)}>
                <td className="p-3"><div className="font-semibold text-slate-900">{q.title}</div><div className="font-mono text-[10px] text-slate-400">{q.quote_number}</div></td>
                <td className="p-3">{q.account_name || '—'}</td><td className="p-3">{day(q.valid_until)}</td>
                <td className="p-3 text-right font-semibold">{inr(q.grand_total)}</td><td className="p-3"><StatusPill value={q.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <QuoteEditor id={editing.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
      {openId && <QuoteView id={openId} onClose={() => setOpenId(null)} onChanged={reload} onEdit={() => { setEditing({ id: openId }); setOpenId(null); }} />}
    </div>
  );
}

function ProductPicker({ onPick }: { onPick: (p: ProductLookup) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ProductLookup[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => CrmApi.searchProducts(q.trim()).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <input className={inputCls} placeholder="Search product master by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-xs">
          {hits.map((p) => <li key={p.id}><button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => { onPick(p); setQ(''); setHits([]); }}>
            <span className="font-medium">{p.name}</span> <span className="text-slate-400">{p.sku} · {inr(p.selling_price)} · GST {p.tax_rate ?? 0}%</span></button></li>)}
        </ul>
      )}
    </div>
  );
}

function QuoteEditor({ id, onClose, onSaved }: { id?: string; onClose: () => void; onSaved: () => void }) {
  const accounts = useLoad(() => CrmApi.getAccounts({ limit: 200 }));
  const existing = useLoad(async () => (id ? CrmApi.getQuote(id) : null), [id]);
  const { run, busy } = useAction();
  const [form, setForm] = useState({ title: '', account_id: '', valid_until: '', terms: 'Payment: 100% advance. Prices exclusive of freight unless stated.', notes: '' });
  const [lines, setLines] = useState<Line[]>([blank()]);

  useEffect(() => {
    const q = existing.data;
    if (!q) return;
    setForm({ title: q.title, account_id: q.account_id || '', valid_until: q.valid_until?.slice(0, 10) || '', terms: q.terms || '', notes: q.notes || '' });
    setLines(q.items.map((i: any) => ({ product_id: i.product_id || undefined, sku: i.sku, description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount_pct: Number(i.discount_pct), tax_pct: Number(i.tax_pct) })));
  }, [existing.data]);

  const t = totals(lines);
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const save = async () => {
    const body = { ...form, valid_until: form.valid_until || undefined, account_id: form.account_id || undefined, items: lines.map(({ sku: _s, ...l }) => l) };
    const r = await run(() => (id ? CrmApi.updateQuote(id, body) : CrmApi.createQuote(body)), 'Quotation saved.');
    if (r) onSaved();
  };

  return (
    <Modal title={id ? 'Edit quotation' : 'New quotation'} onClose={onClose} wide>
      {existing.loading ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title *"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Account *"><select className={inputCls} value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} disabled={Boolean(id)}>
              <option value="">Select account…</option>{accounts.data?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Valid until"><input type="date" className={inputCls} value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></Field>
          </div>
          <ProductPicker onPick={(p) => setLines([...lines.filter((l) => l.description || l.unit_price), { product_id: p.id, sku: p.sku, description: p.name, quantity: 1, unit_price: Number(p.selling_price), discount_pct: 0, tax_pct: Number(p.tax_rate ?? 0) }])} />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-[10px] uppercase text-slate-500"><th className="text-left p-1">Description</th><th className="p-1 w-20">Qty</th><th className="p-1 w-24">Unit ₹</th><th className="p-1 w-16">Disc %</th><th className="p-1 w-16">GST %</th><th className="p-1 w-24 text-right">Line</th><th /></tr></thead>
              <tbody>{lines.map((l, i) => {
                const g = l.quantity * l.unit_price, d = (g * l.discount_pct) / 100;
                return (
                  <tr key={i}>
                    <td className="p-1"><input className={inputCls} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} aria-label="Description" /></td>
                    <td className="p-1"><input type="number" min="0" className={inputCls} value={l.quantity} onChange={(e) => setLine(i, { quantity: num(e.target.value) })} aria-label="Quantity" /></td>
                    <td className="p-1"><input type="number" min="0" className={inputCls} value={l.unit_price} onChange={(e) => setLine(i, { unit_price: num(e.target.value) })} aria-label="Unit price" /></td>
                    <td className="p-1"><input type="number" min="0" max="100" className={inputCls} value={l.discount_pct} onChange={(e) => setLine(i, { discount_pct: num(e.target.value) })} aria-label="Discount percent" /></td>
                    <td className="p-1"><input type="number" min="0" max="100" className={inputCls} value={l.tax_pct} onChange={(e) => setLine(i, { tax_pct: num(e.target.value) })} aria-label="GST percent" /></td>
                    <td className="p-1 text-right font-medium">{inr(g - d + ((g - d) * l.tax_pct) / 100)}</td>
                    <td className="p-1"><button type="button" aria-label="Remove line" className="text-slate-400 hover:text-rose-600" onClick={() => setLines(lines.length > 1 ? lines.filter((_, k) => k !== i) : [blank()])}><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}</tbody>
            </table>
            <button type="button" className="text-xs text-blue-600 hover:underline mt-1" onClick={() => setLines([...lines, blank()])}>+ Add line</button>
          </div>
          <div className="flex justify-end text-xs"><div className="w-56 space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(t.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>− {inr(t.discount)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{inr(t.tax)}</span></div>
            <div className="flex justify-between font-bold text-sm border-t pt-1"><span>Total</span><span>{inr(t.total)}</span></div>
            <div className="text-[10px] text-slate-400">The server recalculates totals when saving.</div>
          </div></div>
          <Field label="Terms"><textarea rows={2} className={inputCls} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button>
            <button className={btnPrimary} disabled={busy || !form.title.trim() || !form.account_id} onClick={save}>Save draft</button></div>
        </div>
      )}
    </Modal>
  );
}

function QuoteView({ id, onClose, onChanged, onEdit }: { id: string; onClose: () => void; onChanged: () => void; onEdit: () => void }) {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getQuote(id), [id]);
  const { run, busy } = useAction();
  const [reject, setReject] = useState(false);
  const act = async (a: 'send' | 'accept' | 'clone', ok: string) => { const r = await run(() => CrmApi.quoteAction(id, a), ok); if (r) { await reload(); onChanged(); if (a === 'clone') onClose(); } };
  if (loading && !data) return <Drawer title="Quotation" onClose={onClose}><Spinner /></Drawer>;
  if (error || !data) return <Drawer title="Quotation" onClose={onClose}><ErrorLine message={error} /></Drawer>;
  return (
    <Drawer title={data.title} subtitle={<span className="font-mono">{data.quote_number} · {data.account_name}</span>} onClose={onClose}>
      <div className="flex items-center gap-2 flex-wrap"><StatusPill value={data.status} />
        {data.status === 'draft' && <><button className={btnGhost} onClick={onEdit}>Edit</button><button className={btnPrimary} disabled={busy} onClick={() => act('send', 'Marked as sent.')}>Mark as sent</button></>}
        {data.status === 'sent' && <><button className={btnPrimary} disabled={busy} onClick={() => act('accept', 'Quotation accepted.')}>Accepted</button><button className={btnGhost} onClick={() => setReject(true)}>Rejected</button></>}
        <button className={btnGhost} disabled={busy} onClick={() => act('clone', 'Cloned as a new draft.')}>Clone</button>
        <button className={btnGhost} onClick={() => window.print()}>Print</button>
      </div>
      <table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase text-slate-500 border-b"><th className="py-1">Item</th><th>Qty</th><th>Rate</th><th>Disc</th><th>GST</th><th className="text-right">Total</th></tr></thead>
        <tbody className="divide-y">{data.items.map((i: any) => <tr key={i.id}><td className="py-1.5">{i.description}<div className="text-[10px] text-slate-400">{i.sku}</div></td><td>{Number(i.quantity)}</td><td>{inr(i.unit_price)}</td><td>{Number(i.discount_pct)}%</td><td>{Number(i.tax_pct)}%</td><td className="text-right">{inr(i.line_total)}</td></tr>)}</tbody></table>
      <div className="text-xs text-right space-y-0.5"><div>Subtotal {inr(data.subtotal)}</div><div>Discount − {inr(data.discount_total)}</div><div>GST {inr(data.tax_total)}</div><div className="text-sm font-bold">Total {inr(data.grand_total)}</div></div>
      {data.terms && <p className="text-xs text-slate-600 whitespace-pre-wrap">{data.terms}</p>}
      {data.decision_note && <p className="text-xs text-slate-500">Decision note: {data.decision_note}</p>}
      {reject && <ConfirmModal title="Mark as rejected" message="Record why the customer rejected this quotation." withReason="Reason" confirmLabel="Reject" danger onClose={() => setReject(false)}
        onConfirm={async (note) => { setReject(false); if (await run(() => CrmApi.quoteAction(id, 'reject', note), 'Marked as rejected.')) { await reload(); onChanged(); } }} />}
    </Drawer>
  );
}
