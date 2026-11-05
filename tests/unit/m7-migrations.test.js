import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of supabase/migrations/20261106000100_m7_notices.sql (T004, BR-001, R6, R9)
const FILE = path.join('supabase', 'migrations', '20261106000100_m7_notices.sql');
const FUNCTIONS = ['app_express_interest', 'app_submit_notice', 'app_review_notice', 'app_mark_notice_downloaded', 'app_record_province_reply', 'app_request_consultation'];
function read() {
  if (!fs.existsSync(FILE)) throw new Error(`Missing migration ${FILE}`);
  return fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
}
function fn(sql, name) {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION (public|app)\\.${name}\\(([\\s\\S]*?)AS (\\$\\w*\\$)([\\s\\S]*?)\\3`));
  assert.ok(m, `function ${name} not found`);
  return { header: m[2], body: m[4] };
}

describe('Migration 20261106000100_m7_notices.sql (T004)', () => {
  test('D1, D2: columns added if missing; delivery_status replaced; review_status and recipient checks added', () => {
    const sql = read();
    for (const col of ['review_status', 'review_note', 'recipient', 'response_recorded_by']) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.province_notice[\\s\\S]*?ADD COLUMN IF NOT EXISTS ${col}\\b`), col);
    }
    assert.match(sql, /ALTER TABLE public\.consultation_booking[\s\S]*?ADD COLUMN IF NOT EXISTS preferred_times\b/);
    assert.match(sql, /DROP CONSTRAINT IF EXISTS ck_province_notice_delivery_status/);
    assert.match(sql, /ck_province_notice_delivery_status CHECK \(delivery_status IN \('queued', 'downloaded', 'sent', 'bounced'\)\)/);
    assert.match(sql, /ck_province_notice_review_status CHECK \(review_status IN \('draft', 'submitted', 'changes_requested', 'approved'\)\)/);
    assert.match(sql, /ck_province_notice_recipient CHECK \(recipient IN \('peoples_committee', 'culture_department'\)\)/);
  });

  for (const name of ['notice_summary', ...FUNCTIONS]) {
    test(`R9: ${name} is SECURITY DEFINER with an empty search_path`, () => {
      const { header } = fn(read(), name);
      assert.match(header, /SECURITY DEFINER/);
      assert.match(header, /SET search_path = ''/);
    });
  }

  test('R9: the functions are executable by authenticated, never by anon or PUBLIC', () => {
    const sql = read();
    for (const name of FUNCTIONS) {
      assert.match(sql, new RegExp(`REVOKE (ALL|EXECUTE) ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC, anon`), name);
      assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO authenticated`), name);
    }
  });

  test('R9: no direct INSERT on location_interest or consultation_booking; members read their own requests', () => {
    const sql = read();
    assert.match(sql, /REVOKE INSERT ON public\.location_interest, public\.consultation_booking FROM authenticated/);
    assert.match(sql, /CREATE POLICY [\w_]+ ON public\.consultation_booking FOR SELECT TO authenticated\s+USING \(member_id = auth\.uid\(\)\)/);
  });

  test('BR-001, R6: every review writes one audit_log row, inside the review function', () => {
    const { body } = fn(read(), 'app_review_notice');
    assert.match(body, /INSERT INTO public\.audit_log/);
    assert.match(body, /'notice\.approve'/);
    assert.match(body, /'notice\.request_changes'/);
    assert.match(body, /NOTE_REQUIRED/);
    assert.match(body, /has_role\('vfda_staff'\)/);
  });

  test('BR-001: nothing in the migration sends a notice — no email row, no HTTP call, no delete', () => {
    const sql = read();
    assert.doesNotMatch(sql, /email_delivery/i);
    assert.doesNotMatch(sql, /\bnet\.|http_post|http_get|pg_net/i);
    assert.doesNotMatch(sql, /\bDELETE\b/i);
  });

  test('D7: the download is recorded once, by owner or edit, on an approved notice only', () => {
    const { body } = fn(read(), 'app_mark_notice_downloaded');
    assert.match(body, /'approved'/);
    assert.match(body, /'owner', 'edit'/);
    assert.match(body, /sent_at IS NULL|delivery_status IS DISTINCT FROM 'downloaded'|COALESCE\(sent_at/);
  });

  test('BR-003: the reply function accepts only the three values', () => {
    const { body } = fn(read(), 'app_record_province_reply');
    assert.match(body, /NOT IN \('received', 'info_needed', 'cannot_support'\)/);
  });
});
