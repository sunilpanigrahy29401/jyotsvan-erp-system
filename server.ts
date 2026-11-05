import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { pool } from './src/server/db.ts';
import { createApp } from './src/server/app.ts';
import { runLegacyMigrations } from './src/server/core/legacy-migrations.ts';
import { pendingMigrations, runVersionedMigrations } from './src/server/core/migrator.ts';

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const app = createApp();

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Jyotsvan] Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
    void bootMigrationPolicy();
  });
}

/**
 * Migrations never run automatically in production (they alter the database).
 * Development convenience: set RUN_MIGRATIONS_ON_BOOT=false to disable.
 * Production: run `npm run db:migrate` as a deliberate release step.
 */
async function bootMigrationPolicy() {
  try {
    if (isProd) {
      const pending = await pendingMigrations(pool);
      if (pending.length > 0) {
        console.error(`[Migrations] ${pending.length} pending migration(s): ${pending.join(', ')}. Run "npm run db:migrate" before serving traffic.`);
      }
      return;
    }
    if (process.env.RUN_MIGRATIONS_ON_BOOT === 'false') return;
    await runLegacyMigrations();
    const r = await runVersionedMigrations(pool);
    console.log(`[Migrations] versioned applied: ${r.applied.join(', ') || 'none'}`);
  } catch (err) {
    console.error('[Migrations] startup migration step failed:', err instanceof Error ? err.message : err);
  }
}

startServer().catch((err) => {
  console.error('[Jyotsvan] Failed to start server:', err);
  process.exit(1);
});
