// Status of the separately-run open-source modules (HRMS, GST billing) reached through /api/ext.
// Shows real state only: whether the upstream URL is set and whether it answers.
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Empty, ErrorLine, Pill, Spinner, btnGhost, cardCls, useLoad } from './crm/shared.tsx';

interface ModuleStatus { id: string; label: string; description: string; configured: boolean; reachable: boolean; httpStatus?: number; error?: string; hint?: string }

async function loadStatus(): Promise<ModuleStatus[]> {
  const res = await fetch('/api/ext/status');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status}).`);
  return body.data as ModuleStatus[];
}

export function ConnectedModulesPage() {
  const { data, loading, error, reload } = useLoad(loadStatus);
  return (
    <div className="space-y-4 p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Connected modules</h1>
          <p className="text-xs text-slate-500 mt-1">Open-source modules that run as their own services and are reached only through this application's login and permissions.</p>
        </div>
        <button className={btnGhost} onClick={reload}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>
      {loading && <Spinner />}
      {error && <ErrorLine message={error} />}
      {data && !data.length && <Empty>No modules registered.</Empty>}
      {data?.map((m) => (
        <div key={m.id} className={`${cardCls} p-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-900">{m.label}</div>
            <div className="text-xs text-slate-500">{m.description}</div>
            {!m.configured && <div className="text-xs text-amber-700 mt-1">{m.hint}</div>}
            {m.configured && !m.reachable && <div className="text-xs text-rose-700 mt-1">Configured but not answering{m.error ? `: ${m.error}` : ''}.</div>}
          </div>
          <Pill tone={!m.configured ? 'slate' : m.reachable ? 'green' : 'red'}>{!m.configured ? 'Not connected' : m.reachable ? 'Connected' : 'Unreachable'}</Pill>
        </div>
      ))}
      <p className="text-[11px] text-slate-400">Embedding each module's own screens needs a session bridge between this app and the module; until that is built, use the module's API through <code>/api/ext/&lt;module&gt;/…</code>.</p>
    </div>
  );
}
