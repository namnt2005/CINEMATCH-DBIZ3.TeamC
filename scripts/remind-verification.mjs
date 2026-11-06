#!/usr/bin/env node
// Daily VFDA Verified reminders (M4 FR-011; specs/007-m4-partners R8): the users of each organisation whose badge ends
// within 30 days get one notification and email per badge. Where pg_cron is enabled, the migration schedules the same
// function at 08:00 Vietnam time; this script is the fallback and the offline run.
//   npm run verification:remind                       (node:sqlite: the seed in memory, nothing is kept)
//   npm run verification:remind  with .env loaded     (Supabase: SUPABASE_SECRET_KEY, System actor)
import { remindExpiringVerifications } from '../lib/db/verification.js';

try {
  const count = await remindExpiringVerifications();
  console.log(`verification reminders: ${count} organisation(s) reminded`);
} catch (err) {
  console.error(`verification reminders failed: ${err.code || err.message}`);
  process.exit(1);
}
