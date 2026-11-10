// npm run build:ci-check — the production build as the host runs it: a Supabase URL is set, SUPABASE_SECRET_KEY is
// not (Vercel failure of 11/11/2026, "Error occurred prerendering page /api/precheck/basis"). Anything that reads the
// database while `next build` prerenders makes this build fail. The publishable key is a placeholder, so no real
// credential is used and no request can reach a real project. Output goes to .next/ci-check, so the normal build in
// .next is left alone. Next does not replace a variable that is already set (even empty) with the value from .env.
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'ci-check-placeholder',
  SUPABASE_SECRET_KEY: '',
  NEXT_DIST_DIR: '.next/ci-check',
  NEXT_TELEMETRY_DISABLED: '1'
};

const run = spawnSync('npx', ['next', 'build'], { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const out = `${run.stdout || ''}${run.stderr || ''}`;
process.stdout.write(out);

const problems = [];
if (run.status !== 0) problems.push(`next build exited with ${run.status}`);
if (/Error occurred prerendering/.test(out)) problems.push('a page or route was prerendered and failed');
const staticApi = out.split('\n').filter(l => /[├└┌]\s+[○●]\s+\/api\//.test(l)).map(l => l.trim());
if (staticApi.length) problems.push(`Route Handlers prerendered at build time: ${staticApi.join('; ')}`);

if (problems.length) {
  console.error(`\nbuild:ci-check FAILED (Supabase URL set, no SUPABASE_SECRET_KEY):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nbuild:ci-check OK — the build succeeds with a Supabase URL and without SUPABASE_SECRET_KEY; no Route Handler is static.');
