import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// M7 BR-001: the system never sends a notice (T013). No notice file imports an email sender or writes email_delivery.
const ROOTS = ['lib/notices', 'app/api/notices', 'app/api/projects/[id]/interests', 'app/api/projects/[id]/notices', 'app/api/admin/notices', 'app/projects/[id]/provinces'];
const FILES = ['lib/db/notices.js', 'lib/db/sqlite/notices.js', 'lib/db/supabase/notices.js'];
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : [])) : []);

describe('Nothing sends a notice (T013, BR-001)', () => {
  test('the notice code exists', () => {
    for (const f of FILES) assert.ok(fs.existsSync(f), f);
    assert.ok(walk('lib/notices').length >= 3);
  });

  test('BR-001: no notice file imports resend or lib/email, or writes email_delivery itself', () => {
    for (const file of [...ROOTS.flatMap(walk), ...FILES]) {
      const src = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /from ['"]resend['"]|lib\/email\/|['"]\.\.?\/[^'"]*email\//, `${file} imports an email sender`);
      assert.doesNotMatch(src, /INSERT INTO email_delivery|from\(['"]email_delivery['"]\)/, `${file} writes email_delivery`);
    }
  });
});
