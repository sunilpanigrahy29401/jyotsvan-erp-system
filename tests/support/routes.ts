// Statically enumerates every route mounted by src/server/app.ts (method + full path under /api).
import fs from 'fs';
import path from 'path';

export interface MountedRoute {
  method: string;
  /** Path after "/api", e.g. "/finance/invoices/:id" */
  full: string;
  file: string;
}

export function collectRoutes(): MountedRoute[] {
  const root = path.resolve(__dirname, '../..');
  const app = fs.readFileSync(path.join(root, 'src/server/app.ts'), 'utf8');
  const importFile = new Map<string, string>();
  for (const m of app.matchAll(/import \{([^}]+)\} from '\.\/([^']+)'/g)) {
    for (const n of m[1].split(',')) importFile.set(n.trim().split(' as ').pop()!.trim(), m[2]);
  }
  const mounts: Array<{ prefix: string; router: string }> = [];
  for (const m of app.matchAll(/app\.use\('(\/api[^']*)',\s*([A-Za-z0-9_]+)\)/g)) mounts.push({ prefix: m[1], router: m[2] });
  const out: MountedRoute[] = [];
  for (const { prefix, router } of mounts) {
    const rel = importFile.get(router);
    if (!rel || router === 'authRouter') continue;
    const file = path.join(root, 'src/server', rel);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(new RegExp(`\\b${router}\\.(get|post|put|patch|delete)\\(\\s*['"\`]([^'"\`]*)['"\`]`, 'g'))) {
      const sub = m[2];
      const full = (prefix.replace(/^\/api/, '') + (sub === '' || sub.startsWith('/') ? '' : '/') + sub) || '/';
      out.push({ method: m[1].toUpperCase(), full, file: rel });
    }
  }
  return out;
}
