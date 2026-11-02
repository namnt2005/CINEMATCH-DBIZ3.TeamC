#!/usr/bin/env node
// npm run check:supabase  (= node --env-file=.env scripts/check-supabase.mjs) — research R8. Never prints a key.
import { createClient } from '@supabase/supabase-js';
import { validateKeys, runSupabaseChecks } from './lib/supabase-check.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

try {
  if (!url) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL in .env.');
  validateKeys({ publishableKey, secretKey });
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const report = await runSupabaseChecks({
  anonClient: createClient(url, publishableKey, options),
  secretClient: createClient(url, secretKey, options)
});
for (const line of report.lines) console.log(`${line.ok ? 'PASS' : 'FAIL'}  ${line.name} — ${line.detail}`);
process.exit(report.ok ? 0 : 1);
