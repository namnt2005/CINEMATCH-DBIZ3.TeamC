import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of supabase/migrations/20261106000200_m4_partners.sql (T004, BR-001, BR-003, BR-005, BR-007, BR-009, R4, R10)
const FILE = path.join('supabase', 'migrations', '20261106000200_m4_partners.sql');
const CLIENT_FUNCTIONS = ['app_save_org_profile', 'app_deactivate_org', 'app_submit_verification', 'app_decide_verification', 'app_set_art13',
  'app_send_collab_request', 'app_respond_collab_request', 'app_accept_nda', 'app_confirm_collab_request', 'app_withdraw_collab_request',
  'app_post_collab_message', 'app_create_partner_invitation', 'app_accept_partner_invitation', 'app_log_document_view'];
const M4_TABLES = ['organisation', 'organisation_member_layer', 'organisation_private_layer', 'verification_request', 'collab_request',
  'collab_message', 'nda_acceptance', 'document_access_log', 'organisation_user', 'partner_invitation'];

function read() {
  if (!fs.existsSync(FILE)) throw new Error(`Missing migration ${FILE}`);
  return fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
}
function fn(sql, schema, name) {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION ${schema}\\.${name}\\(([\\s\\S]*?)AS (\\$\\w*\\$)([\\s\\S]*?)\\2`));
  assert.ok(m, `function ${schema}.${name} not found`);
  return { header: m[1], body: m[3] };
}
const policy = (sql, name) => {
  const m = sql.match(new RegExp(`CREATE POLICY ${name} ON public\\.(\\w+)([\\s\\S]*?);`));
  assert.ok(m, `policy ${name} not found`);
  return { table: m[1], text: m[2] };
};

describe('Migration 20261106000200_m4_partners.sql (T004)', () => {
  test('D1, D2, D6: the two new tables and the verification times are created if missing, with their checks', () => {
    const sql = read();
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.organisation_user/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.partner_invitation/);
    for (const col of ['submitted_at', 'decided_at']) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.verification_request[\\s\\S]*?ADD COLUMN IF NOT EXISTS ${col}\\b`), col);
    }
    assert.match(sql, /expires_at > invited_at/);
    assert.match(sql, /\(accepted_at IS NULL\) = \(accepted_by IS NULL\)/);
  });

  for (const name of ['is_org_user']) {
    test(`R4: app.${name} is SECURITY DEFINER with an empty search_path`, () => {
      const { header } = fn(read(), 'app', name);
      assert.match(header, /SECURITY DEFINER/);
      assert.match(header, /SET search_path = ''/);
    });
  }

  for (const name of [...CLIENT_FUNCTIONS, 'app_remind_expiring_verifications', 'app_grant_role']) {
    test(`R4: public.${name} is SECURITY DEFINER with an empty search_path`, () => {
      const { header } = fn(read(), 'public', name);
      assert.match(header, /SECURITY DEFINER/);
      assert.match(header, /SET search_path = ''/);
      assert.doesNotMatch(header, /search_path = '[^']*,[^']*'/, 'no quoted schema list (build-log Entry 9)');
    });
  }

  test('R4: client functions are executable by authenticated, never by anon or PUBLIC; the reminder is System only', () => {
    const sql = read();
    for (const name of CLIENT_FUNCTIONS) {
      assert.match(sql, new RegExp(`REVOKE (ALL|EXECUTE) ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC, anon`), name);
      assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO authenticated`), name);
    }
    assert.match(sql, /REVOKE (ALL|EXECUTE) ON FUNCTION public\.app_remind_expiring_verifications\(\) FROM PUBLIC, anon, authenticated/);
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.app_remind_expiring_verifications\(\) TO authenticated/);
  });

  test('R4: no direct INSERT, UPDATE or DELETE on an M4 table for authenticated; the generated member insert is dropped', () => {
    const sql = read();
    for (const table of M4_TABLES) {
      assert.match(sql, new RegExp(`REVOKE[^;]*INSERT[^;]*UPDATE[^;]*DELETE[^;]*ON public\\.${table}\\b[^;]*FROM[^;]*authenticated`), table);
    }
    assert.match(sql, /DROP POLICY IF EXISTS rls_collab_request_insert_member ON public\.collab_request/);
  });

  test('BR-005: final requests refuse UPDATE only (DELETE is not granted to clients)', () => {
    const sql = read();
    const m = sql.match(/CREATE TRIGGER trg_collab_request_final\s+BEFORE (\w+(?: OR \w+)*) ON public\.collab_request/);
    assert.ok(m, 'trg_collab_request_final');
    assert.equal(m[1], 'UPDATE');
    assert.match(sql, /'declined'[\s\S]*'withdrawn'[\s\S]*'confirmed'|'confirmed'[\s\S]*'declined'[\s\S]*'withdrawn'/);
  });

  test('BR-009 and BR-007: messages and access-log rows refuse UPDATE and DELETE', () => {
    const sql = read();
    assert.match(sql, /CREATE TRIGGER trg_collab_message_no_update\s+BEFORE UPDATE OR DELETE ON public\.collab_message/);
    assert.match(sql, /CREATE TRIGGER trg_document_access_log_append_only\s+BEFORE UPDATE OR DELETE ON public\.document_access_log/);
  });

  test('BR-001: the private layer needs an accepted or confirmed request and both NDA rows; the organisation reads its own', () => {
    const sql = read();
    assert.match(sql, /DROP POLICY IF EXISTS rls_org_private_after_nda ON public\.organisation_private_layer/);
    const p = policy(sql, 'rls_org_private_after_nda');
    assert.equal(p.table, 'organisation_private_layer');
    assert.match(p.text, /FOR SELECT TO authenticated/);
    assert.match(p.text, /status IN \('accepted', 'confirmed'\)/);
    assert.match(p.text, /party = 'producer'/);
    assert.match(p.text, /party = 'partner'/);
    assert.match(p.text, /app\.is_project_member\(/);
    const own = policy(sql, 'rls_org_private_own');
    assert.equal(own.table, 'organisation_private_layer');
    // the organisation's own users: app.is_org_user, or its inline form, which the generated migration 300 needs
    // because it runs before this file defines the function
    assert.match(own.text, /app\.is_org_user\(org_id\)|EXISTS \(SELECT 1 FROM public\.organisation_user ou WHERE ou\.org_id = organisation_private_layer\.org_id AND ou\.user_id = auth\.uid\(\)\) AND app\.has_role\('partner'\)/);
  });

  test('M10 BR-005: decisions, the Article 13 switch, invitations, role grants and deactivations write an audit row', () => {
    const sql = read();
    for (const [name, action] of [['app_decide_verification', 'org.verify.approve'], ['app_decide_verification', 'org.verify.reject'],
      ['app_set_art13', 'organisation.art13_on'], ['app_set_art13', 'organisation.art13_off'],
      ['app_create_partner_invitation', 'partner.invite'], ['app_accept_partner_invitation', 'role.grant'],
      ['app_deactivate_org', 'organisation.deactivate']]) {
      const { body } = fn(sql, 'public', name);
      assert.match(body, /INSERT INTO public\.audit_log/, name);
      assert.ok(body.includes(`'${action}'`), `${name} audits ${action}`);
    }
  });

  test('Q3: switching Article 13 on needs the staff role and the business-line confirmation', () => {
    const { header, body } = fn(read(), 'public', 'app_set_art13');
    assert.match(header, /p_business_line_confirmed boolean/i);
    assert.match(body, /app\.has_role\('vfda_staff'\)/);
    assert.match(body, /p_on AND NOT COALESCE\(p_business_line_confirmed, false\)|p_on AND COALESCE\(p_business_line_confirmed, false\) = false/);
  });

  test('BR-003: the invitation code is compared as a SHA-256 digest and never stored', () => {
    const sql = read();
    const { body } = fn(sql, 'public', 'app_accept_partner_invitation');
    assert.match(body, /digest\(|sha256\(/);
    assert.doesNotMatch(sql, /\bcode\s+(text|varchar)/i, 'no plain code column');
  });

  test('SYS BR-002 (06/11/2026): app_grant_role refuses partner before any update and still needs an admin (analysis G1)', () => {
    const { body } = fn(read(), 'public', 'app_grant_role');
    assert.match(body, /app\.has_role\('admin'\)/);
    const refuse = body.search(/p_role = 'partner'[\s\S]*?ROLE_BY_INVITATION_ONLY/);
    const update = body.search(/UPDATE public\.user_account/);
    assert.ok(refuse >= 0, 'partner is refused with ROLE_BY_INVITATION_ONLY');
    assert.ok(update > refuse, 'the refusal comes before the update');
    assert.ok(body.includes("'role.grant'"), 'other grants are still audited');
  });

  test('R10: the org-documents bucket is private, 25 MB, PDF only, created inside a storage guard; no object policy', () => {
    const sql = read();
    assert.match(sql, /IF EXISTS \(SELECT 1 FROM pg_catalog\.pg_namespace WHERE nspname = 'storage'\)/);
    const insert = sql.match(/INSERT INTO storage\.buckets \(([^)]*)\)\s*VALUES \(([^)]*)\)/);
    assert.ok(insert, 'bucket insert');
    const cols = insert[1].split(',').map(s => s.trim());
    const vals = insert[2].split(/,(?![^{]*})/).map(s => s.trim());
    const row = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
    assert.equal(row.id, "'org-documents'");
    assert.equal(row.public, 'false');
    assert.equal(row.file_size_limit, '26214400');
    assert.match(row.allowed_mime_types, /application\/pdf/);
    assert.doesNotMatch(sql, /CREATE POLICY [^;]* ON storage\.objects/, 'the browser never reads the bucket directly');
  });

  test('FR-011: the reminder job is scheduled only where pg_cron exists', () => {
    assert.match(read(), /IF EXISTS \(SELECT 1 FROM pg_catalog\.pg_extension WHERE extname = 'pg_cron'\)[\s\S]*?cron\.schedule\([\s\S]*?app_remind_expiring_verifications/);
  });

  test('BR-008: nothing of M4 is deleted', () => {
    const sql = read();
    for (const table of M4_TABLES) assert.doesNotMatch(sql, new RegExp(`DELETE FROM public\\.${table}\\b`), table);
  });
});
