import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of supabase/migrations/20261111000100_m5_dossier.sql — Phase 2 part (T005; D1, D4, R3, R12, SR-154).
// The function bodies have their own tests (T018, T036).
const FILE = path.join('supabase', 'migrations', '20261111000100_m5_dossier.sql');
const M5_TABLES = ['document_slot', 'document', 'bilingual_document', 'bilingual_paragraph', 'project_glossary', 'location_document_type'];
function read() {
  if (!fs.existsSync(FILE)) throw new Error(`Missing migration ${FILE}`);
  return fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
}
const fn = (sql, name) => (sql.match(new RegExp(`CREATE OR REPLACE FUNCTION app\\.${name}\\([\\s\\S]*?\\$\\$;`)) || [])[0] || '';

describe('Migration 20261111000100_m5_dossier.sql — Phase 2 (T005)', () => {
  test('D1: document_type columns and the CHECK added safely; location_document_type created if missing', () => {
    const sql = read();
    assert.match(sql, /ALTER TABLE public\.document_type[\s\S]*?ADD COLUMN IF NOT EXISTS requirement_code\b/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS awaiting_confirmation BOOLEAN/);
    assert.match(sql, /ck_document_type_location_no_requirement/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.location_document_type/);
  });

  test('R3: private bucket project-documents, 25 MB, PDF and DOCX only; no storage policy for anon or authenticated', () => {
    const sql = read();
    const bucket = sql.match(/INSERT INTO storage\.buckets[\s\S]*?;/)?.[0] || '';
    assert.match(bucket, /'project-documents'/);
    assert.match(bucket, /false/);
    assert.match(bucket, /26214400/);
    assert.match(bucket, /application\/pdf/);
    assert.match(bucket, /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
    assert.doesNotMatch(sql, /CREATE POLICY[^;]*ON storage\.objects/i, 'no storage policy: the server signs links');
  });

  test('R12: read policies of data-model §7 with DROP POLICY IF EXISTS; the partner case needs both NDA rows', () => {
    const sql = read();
    for (const t of ['bilingual_document', 'bilingual_paragraph', 'project_glossary', 'location_document_type']) {
      assert.match(sql, new RegExp(`DROP POLICY IF EXISTS [a-z_]+ ON public\\.${t}`), `drop before create on ${t}`);
      assert.match(sql, new RegExp(`CREATE POLICY [a-z_]+ ON public\\.${t}\\s+FOR SELECT`), `select policy on ${t}`);
    }
    for (const t of ['bilingual_document', 'bilingual_paragraph', 'project_glossary']) {
      const pol = sql.match(new RegExp(`CREATE POLICY [a-z_]+ ON public\\.${t}\\s+FOR SELECT[\\s\\S]*?;`))[0];
      assert.match(pol, /app\.can_read_draft\(|app\.is_project_member\(/, `${t}: members or the NDA-gated partner`);
    }
    assert.doesNotMatch(sql, /GRANT[^;]*TO anon/);
  });

  test('R12: direct INSERT, UPDATE, DELETE revoked on the six M5 tables', () => {
    const sql = read();
    for (const t of M5_TABLES) {
      assert.match(sql, new RegExp(`REVOKE INSERT, UPDATE, DELETE ON public\\.${t} FROM anon, authenticated`), t);
    }
  });

  test('D4: app.can_proofread, app.can_confirm_draft and app.can_read_draft are SECURITY DEFINER, search_path = \'\', and check both NDA rows', () => {
    const sql = read();
    for (const name of ['can_proofread', 'can_confirm_draft', 'can_read_draft']) {
      const body = fn(sql, name);
      assert.ok(body, `function app.${name}`);
      assert.match(body, /SECURITY DEFINER/);
      assert.match(body, /SET search_path = ''/);
      assert.match(body, /public\.organisation_user/);
      assert.match(body, /public\.collab_request/);
      assert.match(body, /party = 'producer'[\s\S]*?accepted/);
      assert.match(body, /party = 'partner'[\s\S]*?accepted/);
    }
    assert.match(fn(sql, 'can_confirm_draft'), /'confirmed'/);
    assert.doesNotMatch(fn(sql, 'can_confirm_draft'), /'accepted'\s*,\s*'confirmed'|IN \('accepted'/, 'confirm: confirmed requests only');
  });
});
