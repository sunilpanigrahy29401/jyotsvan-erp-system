// Small shared building blocks for the CRM screens (kept local so the CRM stays self-contained).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { CrmApi, CrmApiError, type Employee } from '../../../services/crmApi.ts';
import { useToast } from '../../../context/ToastContext';

export const inputCls = 'w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50';
export const btnPrimary = 'px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-colors';
export const btnGhost = 'px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors';
export const btnDanger = 'px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors';
export const cardCls = 'bg-white rounded-xl border border-slate-200 shadow-sm';

export const inr = (v?: number | string | null) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v || 0));
export const dt = (v?: string | null) => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—');
export const label = (s?: string | null) => (s ? s.replace(/_/g, ' ') : '—');

/** Runs a loader, exposing loading/error/data and a reload function. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await fnRef.current()); } catch (e: any) { setError(e?.message || 'Failed to load.'); } finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, deps);
  return { data, setData, loading, error, reload };
}

/** Wraps an async action with toast feedback and returns whether it succeeded. */
export function useAction() {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok) showToast(ok, 'success');
      return r;
    } catch (e: any) {
      showToast(e instanceof CrmApiError || e?.message ? e.message : 'Something went wrong.', 'error');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [showToast]);
  return { run, busy };
}

export function ErrorLine({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" /><span>{message}</span>
    </div>
  );
}

export function Spinner({ text = 'Loading…' }: { text?: string }) {
  return <div className="py-10 text-center text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />{text}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-xs text-slate-400">{children}</div>;
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-white rounded-xl border border-slate-200 shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-6`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, onClose, children }: { title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between sticky top-0 bg-white z-10">
          <div><div className="text-base font-bold text-slate-900">{title}</div>{subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}</div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label: l, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs">
      <span className="block text-slate-600 font-medium mb-1">{l}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200', red: 'bg-rose-50 text-rose-700 border-rose-200', amber: 'bg-amber-50 text-amber-800 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200', slate: 'bg-slate-100 text-slate-700 border-slate-200', purple: 'bg-purple-50 text-purple-700 border-purple-200',
};
export function Pill({ tone = 'slate', children }: { tone?: keyof typeof TONES | string; children: React.ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${TONES[tone] || TONES.slate}`}>{children}</span>;
}

const STATUS_TONE: Record<string, string> = {
  open: 'blue', pending: 'amber', resolved: 'green', closed: 'slate', draft: 'slate', sent: 'blue', accepted: 'green', rejected: 'red', expired: 'amber', won: 'green', lost: 'red',
  active: 'green', completed: 'green', queued: 'amber', cancelled: 'slate', verified: 'green', submitted: 'blue', granted: 'green', withdrawn: 'red', published: 'green',
  urgent: 'red', high: 'amber', medium: 'blue', low: 'slate', connected: 'green', not_connected: 'slate', awaiting_credentials: 'amber', configuration_required: 'amber', disabled: 'slate', stopped: 'slate',
};
export const StatusPill = ({ value }: { value?: string | null }) => <Pill tone={STATUS_TONE[value || ''] || 'slate'}>{label(value)}</Pill>;

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Array<{ id: T; label: string; count?: number }>; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`px-3.5 py-2 text-xs font-semibold border-b-2 -mb-px ${value === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-[10px] text-slate-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Kpi({ title, value, sub, tone }: { title: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'red' | 'green' | 'amber' }) {
  const c = tone === 'red' ? 'text-rose-600' : tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900';
  return (
    <div className={`${cardCls} p-4`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</div>
      <div className={`text-xl font-bold mt-1 ${c}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

let employeeCache: Promise<Employee[]> | null = null;
export function useEmployees() {
  const [list, setList] = useState<Employee[]>([]);
  useEffect(() => {
    employeeCache ??= CrmApi.getEmployees().catch((e) => { employeeCache = null; throw e; });
    let live = true;
    employeeCache.then((r) => live && setList(r)).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return list;
}

export function EmployeeSelect({ value, onChange, allowNone = true, className = inputCls }: { value: string; onChange: (v: string) => void; allowNone?: boolean; className?: string }) {
  const emps = useEmployees();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {allowNone ? <option value="">Unassigned</option> : !value && <option value="">Select…</option>}
      {emps.map((e) => <option key={e.id} value={e.id}>{e.display_name}{e.designation ? ` — ${e.designation}` : ''}</option>)}
    </select>
  );
}

/** Confirm using a styled modal instead of window.confirm. */
export function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, withReason }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean; withReason?: string; onConfirm: (reason: string) => void | Promise<void>; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-xs text-slate-600 mb-3">{message}</p>
      {withReason && <Field label={withReason}><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} rows={2} /></Field>}
      <div className="flex justify-end gap-2 pt-3">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={danger ? btnDanger : btnPrimary} disabled={Boolean(withReason) && !reason.trim()} onClick={() => onConfirm(reason)}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
