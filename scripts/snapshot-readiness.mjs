// Nightly readiness snapshot (M0 FR-008) run by hand: npm run snapshot [-- YYYY-MM-DD]
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env (System actor); prints only the count.
// Without the Supabase URL it runs on the in-memory seed (offline check).
import { runSnapshot } from './lib/snapshot.mjs';

try {
  const { date, inserted } = await runSnapshot({ date: process.argv[2] });
  console.log(`readiness snapshot ${date}: ${inserted} project(s) recorded`);
} catch (err) {
  console.error(`readiness snapshot failed: ${err.message}`);
  process.exit(1);
}
