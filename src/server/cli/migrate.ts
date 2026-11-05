// Usage:  npm run db:migrate              -> apply pending versioned migrations
//         npm run db:migrate -- --legacy -> ALSO run the legacy unversioned schema/seed migrations first
//         npm run db:migrate -- --status -> list pending migrations only
// This is the only supported way to change the production schema. It never runs on server boot in production.
import { pool } from '../db.ts';
import { pendingMigrations, runVersionedMigrations } from '../core/migrator.ts';
import { runLegacyMigrations } from '../core/legacy-migrations.ts';

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--status')) {
    const pending = await pendingMigrations(pool);
    console.log(pending.length ? `Pending: ${pending.join(', ')}` : 'No pending migrations.');
    return;
  }
  if (args.has('--legacy')) {
    const results = await runLegacyMigrations();
    const failed = results.filter((r) => !r.success);
    console.log(`Legacy migrations: ${results.length - failed.length} ok, ${failed.length} failed.`);
    if (failed.length) {
      failed.forEach((f) => console.error(` - ${f.name}: ${f.error}`));
      process.exitCode = 1;
    }
  }
  const { applied, skipped } = await runVersionedMigrations(pool);
  console.log(`Versioned migrations applied: ${applied.join(', ') || 'none'} (already applied: ${skipped.length})`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
