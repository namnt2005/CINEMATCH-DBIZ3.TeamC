import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of the draft and glossary functions of 20261111000100_m5_dossier.sql (T036; FR-004..FR-006, BR-002, BR-006, D4).
const FILE = path.join('supabase', 'migrations', '20261111000100_m5_dossier.sql');
const sql = () => fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
const body = (name) => (sql().match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`)) || [])[0] || '';
const SIGS = {
  app_create_bilingual: 'uuid, text, text, jsonb', app_edit_paragraph: 'uuid, text, integer, text', app_review_paragraph: 'uuid, text, integer',
  app_confirm_bilingual: 'uuid, text', app_set_bilingual_pdf: 'uuid, text, text', app_save_glossary_term: 'uuid, text, text', app_delete_glossary_term: 'uuid, text'
};

describe('Draft and glossary functions (T036)', () => {
  test('each is SECURITY DEFINER with search_path = \'\'; EXECUTE revoked from PUBLIC and anon, granted to authenticated', () => {
    for (const [name, sig] of Object.entries(SIGS)) {
      const b = body(name);
      assert.ok(b, name);
      assert.match(b, /SECURITY DEFINER/, name);
      assert.match(b, /SET search_path = ''/, name);
      assert.match(sql(), new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(${sig}\\) FROM PUBLIC, anon`), name);
      assert.match(sql(), new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\(${sig}\\) TO authenticated`), name);
    }
  });

  test('SR-163, BR-002: an edit clears the reviewer and lowers a present slot to needs_fix', () => {
    const b = body('app_edit_paragraph');
    assert.match(b, /status = 'machine'/);
    assert.match(b, /reviewed_by = NULL/); assert.match(b, /reviewer_org_id = NULL/); assert.match(b, /reviewed_at = NULL/);
    assert.match(b, /state = 'needs_fix'[\s\S]*?state = 'present'/);
    assert.match(b, /app\.can_proofread\(p_project_id\)/);
  });

  test('BR-002: review and confirm refuse empty targets and set the slot present when no machine paragraph is left', () => {
    for (const name of ['app_review_paragraph', 'app_confirm_bilingual']) {
      const b = body(name);
      assert.match(b, /EMPTY_PARAGRAPH/, name);
      assert.match(b, /NOT EXISTS \(SELECT 1 FROM public\.bilingual_paragraph[\s\S]*?status <> 'reviewed'/, name);
      assert.match(b, /INSERT INTO public\.document_slot[\s\S]*?ON CONFLICT \(project_id, doc_code\) DO UPDATE SET state = 'present'/, name);
    }
    assert.match(body('app_review_paragraph'), /app\.can_proofread\(p_project_id\)/);
    assert.match(body('app_confirm_bilingual'), /app\.can_confirm_draft\(p_project_id\)/);
    assert.match(body('app_review_paragraph'), /reviewer_org_id/);
  });

  test('create and glossary: owner or edit, not archived; create replaces the paragraphs; one term per lower(term_en)', () => {
    for (const name of ['app_create_bilingual', 'app_save_glossary_term', 'app_delete_glossary_term', 'app_set_bilingual_pdf']) {
      assert.match(body(name), /'owner', 'edit'/, name);
      assert.match(body(name), /archived/, name);
    }
    assert.match(body('app_create_bilingual'), /DELETE FROM public\.bilingual_paragraph/);
    assert.match(body('app_create_bilingual'), /project_meta/);
    assert.match(body('app_save_glossary_term'), /lower\(/);
  });
});
