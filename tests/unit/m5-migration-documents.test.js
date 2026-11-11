import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of app_record_document in supabase/migrations/20261111000100_m5_dossier.sql (T018; M5 FR-002, R2, R3).
const FILE = path.join('supabase', 'migrations', '20261111000100_m5_dossier.sql');
const sql = () => fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
const body = () => (sql().match(/CREATE OR REPLACE FUNCTION public\.app_record_document\([\s\S]*?\$\$;/) || [])[0] || '';

describe('app_record_document (T018)', () => {
  test('SECURITY DEFINER with search_path = \'\'; EXECUTE revoked from PUBLIC and anon, granted to authenticated', () => {
    const b = body();
    assert.ok(b, 'function public.app_record_document');
    assert.match(b, /SECURITY DEFINER/);
    assert.match(b, /SET search_path = ''/);
    assert.match(sql(), /REVOKE ALL ON FUNCTION public\.app_record_document\(uuid, text, text\) FROM PUBLIC, anon/);
    assert.match(sql(), /GRANT EXECUTE ON FUNCTION public\.app_record_document\(uuid, text, text\) TO authenticated/);
  });

  test('checks: owner or edit, project not archived, the path of the project and code, not the provincial notice copy', () => {
    const b = body();
    assert.match(b, /app\.project_permission\(p_project_id\)/);
    assert.match(b, /'owner', 'edit'/);
    assert.match(b, /archived/);
    assert.match(b, /p_file_path LIKE p_project_id::text \|\| '\/' \|\| p_doc_code \|\| '\/%'/);
    assert.match(b, /PROVINCIAL_NOTICE_COPY/);
    assert.match(b, /public\.document_type/, 'the code must exist');
  });

  test('writes: version = max + 1, uploaded_by = auth.uid(); the slot is created or set to present', () => {
    const b = body();
    assert.match(b, /COALESCE\(MAX\(version\), 0\) \+ 1/);
    assert.match(b, /auth\.uid\(\)/);
    assert.match(b, /INSERT INTO public\.document_slot[\s\S]*?ON CONFLICT \(project_id, doc_code\) DO UPDATE SET state = 'present'/);
    assert.match(b, /INSERT INTO public\.document /);
  });
});
