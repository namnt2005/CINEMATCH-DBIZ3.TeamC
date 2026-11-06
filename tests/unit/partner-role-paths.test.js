import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// The only paths to the partner role (T024, SYS BR-002 as changed 06/11/2026, M4 BR-003, analysis G1): it reads the code,
// telling writes of the role apart from places that only name it (lib/auth/session.js lists the roles; the seed loader
// loads seed rows, which is data, not a grant).
const ROOTS = ['lib', 'app', 'scripts', 'supabase/migrations'];
function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : files(full);
    return /\.(js|mjs|sql)$/.test(e.name) ? [full] : [];
  });
}
const all = ROOTS.flatMap(files);
const read = (f) => fs.readFileSync(f, 'utf8').replace(/--[^\n]*/g, '');

describe('Paths to the partner role (T024)', () => {
  test('the newest app_grant_role refuses partner before any update and still needs an admin', () => {
    const migrations = files('supabase/migrations').sort().filter(f => /CREATE OR REPLACE FUNCTION public\.app_grant_role\(/.test(read(f)));
    assert.ok(migrations.length >= 2, 'the M4 migration replaces the SYS function');
    const sql = read(migrations[migrations.length - 1]);
    const body = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.app_grant_role('));
    const end = body.indexOf('$$;');
    const fn = body.slice(0, end);
    assert.match(fn, /app\.has_role\('admin'\)/);
    const refuse = fn.search(/p_role = 'partner'[\s\S]*?ROLE_BY_INVITATION_ONLY/);
    assert.ok(refuse >= 0 && refuse < fn.search(/UPDATE public\.user_account/));
  });

  test('only the invitation acceptance sets role = partner (the function and its node:sqlite twin)', () => {
    const writers = all.filter(f => /SET\s+role\s*=\s*'partner'/i.test(read(f)));
    assert.deepEqual(writers.sort(), ['lib/db/sqlite/partner-invitations.js', 'supabase/migrations/20261106000200_m4_partners.sql'].map(p => path.normalize(p)).sort());
    const sql = read('supabase/migrations/20261106000200_m4_partners.sql');
    const accept = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.app_accept_partner_invitation('));
    assert.match(accept.slice(0, accept.indexOf('$$;')), /SET role = 'partner'/, 'the SQL write is inside app_accept_partner_invitation');
    assert.match(read('lib/db/sqlite/partner-invitations.js'), /export (async )?function acceptInvitation/);
  });

  test('no route grants a role directly; a new account is still always member (SYS BR-002)', () => {
    for (const f of files('app/api')) assert.doesNotMatch(read(f), /app_grant_role/, f);
    assert.match(read('supabase/migrations/20261101000200_auth_link.sql'), /'member'/);
  });
});
