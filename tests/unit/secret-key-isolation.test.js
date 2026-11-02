import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? filesUnder(p) : /\.(m?js|jsx)$/.test(d.name) ? [p] : [];
  });
}

describe('Secret key stays on the server (T005, BR-004, research R15, Constitution IV)', () => {
  test('R15: lib/supabase/admin.js refuses to load where a browser window exists', async () => {
    globalThis.window = {};
    try {
      await assert.rejects(() => import(`../../lib/supabase/admin.js?browser=${Date.now()}`), /server/i);
    } finally {
      delete globalThis.window;
    }
  });

  test('R15: no client component and no file under app/ imports the secret-key client', () => {
    const offenders = [...filesUnder(path.join(ROOT, 'app')), ...filesUnder(path.join(ROOT, 'lib'))]
      .filter(f => {
        const src = fs.readFileSync(f, 'utf8');
        const importsAdmin = /from ['"][^'"]*supabase\/admin(\.js)?['"]/.test(src);
        return importsAdmin && (f.includes(`${path.sep}app${path.sep}`) || /^\s*['"]use client['"]/.test(src));
      })
      .map(f => path.relative(ROOT, f));
    assert.deepEqual(offenders, []);
  });

  test('R15: no NEXT_PUBLIC_ variable carries a secret, anywhere in code or .env.example', () => {
    const sources = [...filesUnder(path.join(ROOT, 'app')), ...filesUnder(path.join(ROOT, 'lib')), path.join(ROOT, '.env.example')];
    const leaks = sources.filter(f => /NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE)/.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(leaks.map(f => path.relative(ROOT, f)), []);
  });

  test('R15: .env.example uses the new key names with empty values, and none of the old names', () => {
    const lines = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l));
    const names = lines.map(l => l.split('=')[0]);
    for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']) {
      assert.ok(names.includes(name), `${name} is listed`);
    }
    for (const old of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL']) {
      assert.ok(!names.includes(old), `${old} is not listed as a variable`);
    }
    for (const l of lines.filter(l => /SUPABASE|RESEND/.test(l))) {
      assert.match(l, /^[A-Z_]+=$/, `${l.split('=')[0]} has no value`);
    }
  });

  test('Constitution IV: supabase/.temp/ is git-ignored', () => {
    assert.match(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'), /^supabase\/\.temp\/?$/m);
  });
});
