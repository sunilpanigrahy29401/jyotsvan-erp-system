// Lead-management extras: bulk tools toolbar (import / export / auto-assign / duplicates) and the detail panels shown in the lead drawer.
import React, { useRef, useState } from 'react';
import { CopyCheck, Download, Shuffle, Upload } from 'lucide-react';
import { CrmApi } from '../../../services/crmApi.ts';
import { ConfirmModal, Empty, ErrorLine, Modal, Pill, Spinner, StatusPill, btnGhost, btnPrimary, cardCls, dt, inputCls, label, useAction, useLoad } from './shared.tsx';

export function LeadToolbar({ filters, onChanged }: { filters: Record<string, any>; onChanged: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const { run, busy } = useAction();
  const [report, setReport] = useState<any | null>(null);
  const [dupes, setDupes] = useState(false);
  const [mode, setMode] = useState<'skip' | 'update'>('skip');

  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { setReport({ error: 'File is larger than 3 MB. Split it and import in parts.' }); return; }
    const csv = await f.text();
    const r = await run(() => CrmApi.importLeads({ csv, filename: f.name, mode }));
    if (r) { setReport(r); onChanged(); }
    if (file.current) file.current.value = '';
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white" title="What to do with rows that match an existing lead">
          <option value="skip">Import: skip duplicates</option>
          <option value="update">Import: update matches</option>
        </select>
        <button className={btnGhost} disabled={busy} onClick={() => file.current?.click()}><Upload className="w-3.5 h-3.5" />Import CSV</button>
        <button className={btnGhost} onClick={() => run(() => CrmApi.exportLeads(filters))}><Download className="w-3.5 h-3.5" />Export</button>
        <button className={btnGhost} disabled={busy} onClick={async () => { const r = await run(() => CrmApi.autoAssignLeads()); if (r) { onChanged(); setReport({ message: `Auto-assign examined ${r.examined} unassigned lead(s) and assigned ${r.assigned}.` }); } }}>
          <Shuffle className="w-3.5 h-3.5" />Auto-assign
        </button>
        <button className={btnGhost} onClick={() => setDupes(true)}><CopyCheck className="w-3.5 h-3.5" />Duplicates</button>
      </div>

      {report && (
        <Modal title="Result" onClose={() => setReport(null)}>
          {report.error ? <ErrorLine message={report.error} /> : report.message ? <p className="text-xs text-slate-700">{report.message}</p> : (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-5 gap-2 text-center">
                {[['Rows', report.total], ['Created', report.created], ['Updated', report.updated], ['Duplicates', report.duplicates], ['Failed', report.failed]].map(([k, v]) => (
                  <div key={k as string} className="p-2 rounded-lg bg-slate-50 border border-slate-200"><div className="text-lg font-bold">{v}</div><div className="text-[10px] text-slate-500 uppercase">{k}</div></div>
                ))}
              </div>
              {report.unknown_columns?.length > 0 && <p className="text-amber-700">Ignored columns: {report.unknown_columns.join(', ')}</p>}
              {report.errors?.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y">
                  {report.errors.map((e: any, i: number) => <div key={i} className="px-3 py-1.5"><span className="font-mono text-slate-500">Row {e.row}</span> — {e.error}</div>)}
                </div>
              )}
              <p className="text-slate-400">Accepted columns: name, first name, last name, mobile/phone, email, company, city, state, requirement, value, source, priority, territory.</p>
            </div>
          )}
        </Modal>
      )}
      {dupes && <DuplicatesModal onClose={() => setDupes(false)} onChanged={onChanged} />}
    </>
  );
}

function DuplicatesModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useLoad(() => CrmApi.getDuplicateGroups());
  const { run, busy } = useAction();
  const [survivor, setSurvivor] = useState<Record<string, string>>({});
  return (
    <Modal title="Possible duplicate leads" onClose={onClose} wide>
      {loading ? <Spinner /> : error ? <ErrorLine message={error} /> : !data?.length ? <Empty>No duplicate leads found.</Empty> : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {data.map((g) => {
            const keep = survivor[g.key] || g.leads[0].id;
            return (
              <div key={g.key} className={`${cardCls} p-3 text-xs`}>
                <div className="text-[10px] text-slate-400 mb-2">Same {g.key.startsWith('e:') ? 'e-mail' : 'phone number'}</div>
                {g.leads.map((l: any) => (
                  <label key={l.id} className="flex items-center gap-2 py-1">
                    <input type="radio" name={g.key} checked={keep === l.id} onChange={() => setSurvivor({ ...survivor, [g.key]: l.id })} />
                    <span className="font-medium">{l.display_name}</span><span className="text-slate-400">{l.lead_number} · {l.phone} · {l.email || 'no e-mail'}</span><StatusPill value={l.status} />
                  </label>
                ))}
                <div className="flex justify-end pt-2">
                  <button className={btnPrimary} disabled={busy} onClick={async () => {
                    const r = await run(() => CrmApi.mergeLeads(keep, g.leads.filter((l: any) => l.id !== keep).map((l: any) => l.id)), 'Leads merged.');
                    if (r) { await reload(); onChanged(); }
                  }}>Keep selected, merge others</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/** Panels inside the lead drawer. */
export function LeadDetailPanels({ lead, onChanged, onArchived }: { lead: any; onChanged: () => void; onArchived: () => void }) {
  const timeline = useLoad(() => CrmApi.getLeadTimeline(lead.id), [lead.id]);
  const consent = useLoad(() => CrmApi.getConsent('lead', lead.id), [lead.id]);
  const { run, busy } = useAction();
  const [note, setNote] = useState('');
  const [task, setTask] = useState({ subject: '', due: '' });
  const [confirmArchive, setConfirmArchive] = useState(false);
  const channels = ['email', 'sms', 'whatsapp', 'call'];
  const state = (ch: string) => consent.data?.current.find((c) => c.channel === ch && c.purpose === 'marketing')?.status;

  return (
    <div className="space-y-5">
      {lead.sla_due_at && !lead.first_response_at && (
        <div className={`p-3 rounded-lg text-xs border ${new Date(lead.sla_due_at) < new Date() ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          First response due {dt(lead.sla_due_at)}{new Date(lead.sla_due_at) < new Date() ? ' — overdue' : ''}. Log a call, e-mail or meeting to stop the clock.
        </div>
      )}
      {lead.merged_into_id && <Pill tone="amber">Merged into another lead</Pill>}

      <section className="space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick follow-up</div>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Task, e.g. Send price list" value={task.subject} onChange={(e) => setTask({ ...task, subject: e.target.value })} />
          <input className={`${inputCls} max-w-[11rem]`} type="datetime-local" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
          <button className={btnPrimary} disabled={busy || !task.subject.trim()} onClick={async () => {
            const r = await run(() => CrmApi.createActivity({ subject: task.subject, activity_type: 'follow_up', lead_id: lead.id, assigned_employee_id: lead.assigned_employee_id || undefined, due_date: task.due ? new Date(task.due).toISOString() : undefined }), 'Task added.');
            if (r) { setTask({ subject: '', due: '' }); timeline.reload(); onChanged(); }
          }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[['phone_call', 'Log call'], ['meeting', 'Log meeting'], ['email', 'Log e-mail'], ['whatsapp', 'Log WhatsApp']].map(([t, l]) => (
            <button key={t} className={btnGhost} disabled={busy} onClick={async () => {
              const r = await run(() => CrmApi.createActivity({ subject: l.replace('Log ', '').replace(/^./, (c) => c.toUpperCase()) + ' with ' + lead.display_name, activity_type: t as any, lead_id: lead.id, is_completed: true, direction: 'outbound', assigned_employee_id: lead.assigned_employee_id || undefined }), `${l.replace('Log ', '')} logged.`);
              if (r) { timeline.reload(); onChanged(); }
            }}>{l}</button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Marketing consent (DPDP)</div>
        <div className="grid grid-cols-2 gap-2">
          {channels.map((ch) => {
            const s = state(ch);
            return (
              <div key={ch} className="flex items-center justify-between p-2 border border-slate-200 rounded-lg text-xs">
                <span className="capitalize font-medium">{ch}</span>
                <span className="flex items-center gap-2">
                  {s ? <StatusPill value={s} /> : <span className="text-slate-400">not recorded</span>}
                  <button className="text-blue-600 hover:underline" disabled={busy} onClick={async () => {
                    const r = await run(() => CrmApi.recordConsent({ subject_type: 'lead', subject_id: lead.id, channel: ch, status: s === 'granted' ? 'withdrawn' : 'granted', source: 'staff', evidence: 'Recorded by staff in CRM' }), 'Consent updated.');
                    if (r) consent.reload();
                  }}>{s === 'granted' ? 'Withdraw' : 'Record consent'}</button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Timeline</div>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={btnGhost} disabled={busy || !note.trim()} onClick={async () => {
            const r = await run(() => CrmApi.createNote({ lead_id: lead.id, content: note }), 'Note added.');
            if (r) { setNote(''); timeline.reload(); }
          }}>Save note</button>
        </div>
        {timeline.loading ? <Spinner /> : !timeline.data?.length ? <Empty>No activity yet.</Empty> : (
          <ol className="border-l border-slate-200 ml-2 space-y-3">
            {timeline.data.map((t) => (
              <li key={`${t.kind}-${t.id}`} className="pl-4 relative text-xs">
                <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
                <div className="flex items-center gap-2"><span className="font-semibold text-slate-800">{t.title}</span>{t.kind === 'activity' && <Pill tone={t.is_completed ? 'green' : 'amber'}>{t.is_completed ? 'done' : 'open'}</Pill>}</div>
                {t.body && <div className="text-slate-500">{t.body}</div>}
                <div className="text-[10px] text-slate-400">{label(t.kind)} · {dt(t.at)}</div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {!lead.is_converted && (
        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
          {lead.status === 'archived'
            ? <button className={btnGhost} disabled={busy} onClick={async () => { if (await run(() => CrmApi.restoreLead(lead.id), 'Lead restored.')) { onChanged(); onArchived(); } }}>Restore lead</button>
            : <button className={btnGhost} onClick={() => setConfirmArchive(true)}>Archive lead</button>}
        </div>
      )}
      {confirmArchive && (
        <ConfirmModal title="Archive lead" message="The lead is hidden from lists but kept for audit. You can restore it later." confirmLabel="Archive" withReason="Reason for archiving"
          onClose={() => setConfirmArchive(false)}
          onConfirm={async (reason) => { setConfirmArchive(false); if (await run(() => CrmApi.archiveLead(lead.id, reason), 'Lead archived.')) { onChanged(); onArchived(); } }} />
      )}
    </div>
  );
}
