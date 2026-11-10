import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

// Vercel build failure of 11/11/2026: `next build` prerendered GET /api/precheck/basis and /start, which read the
// database, while the build has no SUPABASE_SECRET_KEY ("Error occurred prerendering page /api/precheck/basis").
// Rules: every Route Handler and every page or layout that reads data runs per request (force-dynamic); no module
// creates a Supabase client or reads an environment variable when it is imported; Node is pinned to 22.x.
// The full build without the secret key is `npm run build:ci-check` (scripts/build-ci-check.mjs).
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const rel = (f) => path.relative(ROOT, f);
const read = (f) => readFileSync(f, 'utf8');
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.m?js$/.test(e.name) ? [path.join(d, e.name)] : []));
const APP = walk(path.join(ROOT, 'app'));
const FORCE = /^export const dynamic = ['"]force-dynamic['"];?\s*$/m;
const isClient = (src) => /^\s*['"]use client['"]/.test(src);

// Modules that read data: the database facades, the Supabase clients, the session.
const DATA = [/^lib\/db\//, /^lib\/supabase\//, /^lib\/auth\/session\.js$/, /^lib\/auth\/header-state\.js$/];
function readsData(file, seen = new Set()) {
  if (seen.has(file)) return false;
  seen.add(file);
  const src = read(file);
  if (seen.size > 1 && isClient(src)) return false;                 // a client component never runs during prerender on the server
  for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const spec = m[1] || m[2];
    if (!spec.startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), spec);
    if (DATA.some(r => r.test(rel(target)))) return true;
    if (existsSync(target) && readsData(target, seen)) return true;
  }
  return false;
}

describe('Nothing that reads data is prerendered at build time', () => {
  test('every Route Handler in app/api/** exports dynamic = "force-dynamic"', () => {
    const routes = APP.filter(f => f.endsWith('/route.js'));
    assert.ok(routes.length >= 70, `${routes.length} route files found`);
    assert.deepEqual(routes.filter(f => !FORCE.test(read(f))).map(rel), []);
  });

  test('every page and layout that reads data (lib/db, lib/supabase, the session) exports dynamic = "force-dynamic"', () => {
    const files = APP.filter(f => /\/(page|layout)\.js$/.test(f) && readsData(f));
    assert.ok(files.some(f => rel(f) === 'app/start/page.js'), '/start reads the router tables');
    assert.ok(files.some(f => rel(f) === 'app/layout.js'), 'the root layout reads the session for the header');
    assert.deepEqual(files.filter(f => !FORCE.test(read(f))).map(rel), []);
  });

  test('no module creates a Supabase client or reads process.env when it is imported (only inside functions)', () => {
    const offenders = [];
    for (const f of [...walk(path.join(ROOT, 'lib')), ...APP]) {
      read(f).split('\n').forEach((line, i) => {
        if (/^\s/.test(line)) return;                                 // inside a block: runs on call
        const topLevel = /^(export\s+)?(const|let|var)\s+[\w$]+\s*=(?!\s*\(?[\w$,\s{}=]*\)?\s*=>|\s*async\b|\s*function\b)/.test(line) || /^(if|await)\b/.test(line);
        if (topLevel && /process\.env|\b(createClient|createServerClient|createBrowserClient|getAdminClient|getUserClient|systemDb|userDb)\s*\(|new\s+(Resend|GoogleGenAI)\b/.test(line)) {
          offenders.push(`${rel(f)}:${i + 1}`);
        }
      });
    }
    assert.deepEqual(offenders, []);
  });
});

describe('Build settings', () => {
  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
  test('engines.node is "22.x" so the host does not move to a newer Node by itself', () => {
    assert.equal(pkg.engines?.node, '22.x');
  });
  test('npm run build:ci-check builds with a Supabase URL and without SUPABASE_SECRET_KEY', () => {
    assert.equal(pkg.scripts?.['build:ci-check'], 'node scripts/build-ci-check.mjs');
    const src = read(path.join(ROOT, 'scripts/build-ci-check.mjs'));
    assert.match(src, /https:\/\/example\.supabase\.co/);
    assert.match(src, /SUPABASE_SECRET_KEY/);
  });
});
