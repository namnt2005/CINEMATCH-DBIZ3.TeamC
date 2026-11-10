import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, getOne, query } from '../../lib/db/client.js';

// The rule base on node:sqlite (T013 — first part: BR-002 and D9). A rule becomes active only with a citation AND an
// approver; the database refuses anything else, and only the VFDA Legal Board signs (exception to SYS question 5).
// The rest of T013 (revisions Q13, retirement, audit rows, Q3 notifications, validation) follows below (written 10/11/2026).
const rules = () => import('../../lib/db/legal-rules.js');
const user = (role, userId) => ({ role, isAuthenticated: true, userId });
const QUAN = user('vfda_legal', 'd8eb7d55-1c9f-59fe-8ebf-2c509ea2b49f');   // seed Legal Board member
const ADMIN = user('admin', 'dffdeb6f-0d86-5bd0-8d0e-85962427b1d2');
const YUI = user('member', '118de3c8-88eb-5003-a2f9-26bbdd0186ae');
const ruleOf = (code) => getOne('SELECT * FROM legal_rule WHERE rule_code = ? ORDER BY revision DESC LIMIT 1', [code]);
const statusOf = (code) => getOne('SELECT status FROM legal_rule WHERE rule_code = ? AND status = ?', [code, 'draft'])?.status ?? null;
const versions = () => Number(getOne('SELECT COUNT(*) AS n FROM rule_set_version').n);

/** Runs `sql` inside a transaction that is always rolled back; returns the error, if any. */
function refused(sql, params) {
  const db = getDb();
  db.exec('BEGIN');
  try { db.prepare(sql).run(...params); return null; } catch (err) { return err; } finally { db.exec('ROLLBACK'); }
}

describe('A rule needs a citation and an approver to be active (T013, BR-002, D9)', () => {
  test('BR-002 in the database: an approved rule without an approver is refused, even with a citation', () => {
    const err = refused("UPDATE legal_rule SET status = 'approved', is_active = 'true', citation = 'Điều 9 khoản 1, Luật Điện ảnh 2022', approved_by = NULL, approved_at = '2026-11-09T09:00:00+07:00' WHERE rule_code = 'A9-DRUG'", []);
    assert.match(String(err?.message), /CHECK constraint failed|ck_legal_rule_approved_needs_signature/);
    assert.equal(statusOf('A9-DRUG'), 'draft');
  });

  test('BR-002 in the database: an approved rule without a citation is refused, even with an approver', () => {
    const err = refused("UPDATE legal_rule SET status = 'approved', is_active = 'true', citation = NULL, approved_by = ?, approved_at = '2026-11-09T09:00:00+07:00' WHERE rule_code = 'A9-DRUG'", [QUAN.userId]);
    assert.match(String(err?.message), /CHECK constraint failed|ck_legal_rule_approved_needs_signature/);
  });

  test('a draft cannot be marked active', () => {
    const err = refused("UPDATE legal_rule SET is_active = 'true' WHERE rule_code = 'A9-DRUG'", []);
    assert.match(String(err?.message), /CHECK constraint failed|ck_legal_rule_active_matches_status/);
  });

  test('US-3 Sc1: signing the draft A9-HERIT (no citation) → CITATION_REQUIRED; it stays a draft and no version is made', async () => {
    const { signRule } = await rules();
    const before = versions();
    const draft = ruleOf('A9-HERIT');
    await assert.rejects(() => signRule(QUAN, draft.rule_id), (e) => e.code === 'CITATION_REQUIRED' && Boolean(e.fields?.citation));
    assert.equal(ruleOf('A9-HERIT').status, 'draft');
    assert.equal(ruleOf('A9-HERIT').approved_by ?? null, null);
    assert.equal(versions(), before);
  });

  test('D9: admin and member cannot sign; a guest is not signed in', async () => {
    const { saveDraft, signRule } = await rules();
    const draft = ruleOf('A9-DRUG');
    await saveDraft(QUAN, draft.rule_id, { citation: 'Điều 9 khoản 1, Luật Điện ảnh 2022' });
    for (const s of [ADMIN, YUI]) await assert.rejects(() => signRule(s, draft.rule_id), (e) => e.code === 'FORBIDDEN', s.role);
    await assert.rejects(() => signRule({ role: 'guest', isAuthenticated: false, userId: null }, draft.rule_id), (e) => e.code === 'UNAUTHENTICATED');
    assert.equal(ruleOf('A9-DRUG').status, 'draft');
  });

  test('US-3 Sc2 / Q2: with a citation the Legal Board member signs alone — approver recorded, active, new version', async () => {
    const { signRule } = await rules();
    const before = versions();
    const draft = ruleOf('A9-DRUG');
    const out = await signRule(QUAN, draft.rule_id);
    const signed = getOne('SELECT * FROM legal_rule WHERE rule_id = ?', [draft.rule_id]);
    assert.equal(signed.status, 'approved');
    assert.equal(String(signed.is_active), 'true');
    assert.equal(signed.approved_by, QUAN.userId);
    assert.ok(signed.approved_at);
    assert.equal(signed.rule_version, out.rule_version);
    assert.equal(versions(), before + 1);
    assert.equal(query('SELECT 1 AS x FROM rule_set_version WHERE rule_version = ?', [out.rule_version]).length, 1);
  });

  // ---- T013, second part (written 10/11/2026, before the code): Q13, BR-008, Q3, validation, audit, D9 for retiring
  const audit = (action) => Number(getOne('SELECT COUNT(*) AS n FROM audit_log WHERE action = ? AND admin_id = ?', [action, QUAN.userId]).n);
  const FIELDS = { rule_code: 'A9-DRONE', topic: 'security', severity: 'notice', title_vi: 'Quay bằng thiết bị bay', title_en: 'Filming with drones',
    description_vi: 'Mô tả mẫu', description_en: 'Sample description', guidance_vi: 'Cân nhắc', guidance_en: 'Consider', segments: ['A', 'B'],
    keywords_vi: ['flycam'], keywords_en: ['drone'] };

  test('FR-002: a new rule is revision 1, a draft, not a sample, with its slug; one rule.save audit row', async () => {
    const { saveDraft } = await rules();
    const before = audit('rule.save');
    const out = await saveDraft(QUAN, null, FIELDS);
    const row = getOne('SELECT * FROM legal_rule WHERE rule_id = ?', [out.rule_id]);
    assert.deepEqual([row.rule_code, Number(row.revision), row.status, row.rule_slug, String(row.is_sample)], ['A9-DRONE', 1, 'draft', 'a9-drone', 'false']);
    assert.deepEqual(JSON.parse(row.segments), ['A', 'B']);
    assert.equal(audit('rule.save'), before + 1);
  });

  test('validation: an existing code, an empty title, too many keywords, no segment; editing an approved revision is refused', async () => {
    const { saveDraft } = await rules();
    await assert.rejects(() => saveDraft(QUAN, null, { ...FIELDS, rule_code: 'A9-MIL' }), (e) => e.code === 'CODE_EXISTS');
    await assert.rejects(() => saveDraft(QUAN, null, { ...FIELDS, rule_code: 'A9-X1', title_en: '' }), (e) => e.code === 'VALIDATION_ERROR' && Boolean(e.fields.title_en));
    await assert.rejects(() => saveDraft(QUAN, null, { ...FIELDS, rule_code: 'A9-X2', keywords_en: Array.from({ length: 31 }, (_, i) => `k${i}`) }), (e) => Boolean(e.fields?.keywords_en));
    await assert.rejects(() => saveDraft(QUAN, null, { ...FIELDS, rule_code: 'A9-X3', segments: [] }), (e) => Boolean(e.fields?.segments));
    const approved = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-MIL' AND status = 'approved'").rule_id;
    await assert.rejects(() => saveDraft(QUAN, approved, { title_en: 'Changed' }), (e) => e.code === 'NOT_DRAFT');
  });

  test('Q13: Create revision copies the signed text into revision n+1; the signed revision stays the active one', async () => {
    const { reviseRule } = await rules();
    const signed = getOne("SELECT * FROM legal_rule WHERE rule_code = 'A9-MIL' AND status = 'approved'");
    const before = audit('rule.revise');
    const out = await reviseRule(QUAN, signed.rule_id);
    const draft = getOne('SELECT * FROM legal_rule WHERE rule_id = ?', [out.rule_id]);
    assert.equal(Number(draft.revision), Number(signed.revision) + 1);
    assert.equal(draft.status, 'draft');
    assert.equal(draft.title_en, signed.title_en);
    assert.equal(draft.citation, signed.citation);
    assert.equal(getOne("SELECT status FROM legal_rule WHERE rule_id = ?", [signed.rule_id]).status, 'approved');
    assert.equal(audit('rule.revise'), before + 1);
    await assert.rejects(() => reviseRule(QUAN, signed.rule_id), (e) => e.code === 'DRAFT_EXISTS');
    const hist = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-HIST' AND status = 'approved'").rule_id;
    await assert.rejects(() => reviseRule(QUAN, hist), (e) => e.code === 'DRAFT_EXISTS', 'the seed already has a draft revision 2 of A9-HIST');
    await assert.rejects(() => reviseRule(QUAN, out.rule_id), (e) => e.code === 'NOT_APPROVED');
  });

  test('Q13 / BR-008: signing revision 2 retires revision 1 in the new version; old findings keep the text of revision 1', async () => {
    const { signRule, saveDraft } = await rules();
    const r1 = getOne("SELECT * FROM legal_rule WHERE rule_code = 'A9-MIL' AND status = 'approved'");
    const r2 = getOne("SELECT * FROM legal_rule WHERE rule_code = 'A9-MIL' AND status = 'draft'");
    await saveDraft(QUAN, r2.rule_id, { title_en: 'Military uniforms, weapons or installations (revised)' });
    const out = await signRule(QUAN, r2.rule_id);
    const old = getOne('SELECT * FROM legal_rule WHERE rule_id = ?', [r1.rule_id]);
    assert.equal(old.status, 'retired');
    assert.equal(String(old.is_active), 'false');
    assert.equal(old.retired_version, out.rule_version);
    assert.equal(out.retired_rule_id, r1.rule_id);
    assert.equal(Number(getOne("SELECT COUNT(*) AS n FROM legal_rule WHERE rule_code = 'A9-MIL' AND status = 'approved'").n), 1);
    const cited = getOne("SELECT r.title_en FROM compliance_finding f JOIN legal_rule r ON r.rule_id = f.rule_id WHERE f.rule_id = ? LIMIT 1", [r1.rule_id]);
    assert.equal(cited.title_en, r1.title_en, 'the old finding still shows revision 1');
  });

  test('Q13: retiring creates a version; only an approved revision can be retired; admin cannot retire (D9); one audit row', async () => {
    const { retireRule } = await rules();
    const relig = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-RELIG' AND status = 'approved'").rule_id;
    await assert.rejects(() => retireRule(ADMIN, relig), (e) => e.code === 'FORBIDDEN');
    const versionsBefore = versions();
    const before = audit('rule.retire');
    const out = await retireRule(QUAN, relig);
    const row = getOne('SELECT status, is_active, retired_version FROM legal_rule WHERE rule_id = ?', [relig]);
    assert.deepEqual([row.status, String(row.is_active), row.retired_version], ['retired', 'false', out.rule_version]);
    assert.equal(versions(), versionsBefore + 1);
    assert.equal(audit('rule.retire'), before + 1);
    const draft = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-HERIT'").rule_id;
    await assert.rejects(() => retireRule(QUAN, draft), (e) => e.code === 'NOT_APPROVED');
  });

  test('Q3: each owner of a non-archived project whose latest content check used an older version gets one notification per new version; nothing is re-run', async () => {
    const { retireRule } = await rules();
    const runs = Number(getOne('SELECT COUNT(*) AS n FROM compliance_run').n);
    const mark = Number(getOne('SELECT COALESCE(MAX(rowid), 0) AS n FROM notification').n);
    const person = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-PERSON' AND status = 'approved'").rule_id;
    const out = await retireRule(QUAN, person);
    const expected = query(`SELECT DISTINCT pm.user_id FROM project p JOIN project_member pm ON pm.project_id = p.project_id AND pm.permission = 'owner'
      WHERE COALESCE(p.stage, '') <> 'archived' AND (SELECT r.rule_version FROM compliance_run r WHERE r.project_id = p.project_id ORDER BY r.run_at DESC, r.run_id DESC LIMIT 1) < ?`, [out.rule_version]).map(r => r.user_id).sort();
    assert.ok(expected.length >= 2, 'not vacuous');
    const sent = query("SELECT recipient_id, payload FROM notification WHERE rowid > ? AND event_type = 'rule_set.new_version'", [mark]);
    assert.equal(new Set(sent.map(n => n.recipient_id)).size, sent.length > 0 ? new Set(sent.map(n => n.recipient_id)).size : 0);
    assert.deepEqual([...new Set(sent.map(n => n.recipient_id))].sort(), expected);
    for (const n of sent) assert.equal(JSON.parse(n.payload).rule_version, out.rule_version);
    assert.equal(Number(getOne('SELECT COUNT(*) AS n FROM compliance_run').n), runs, 'no check is re-run');
  });

  test('C3: a second approved revision of one code is refused by the database', () => {
    const err = refused(`INSERT INTO legal_rule (rule_id, rule_code, revision, title_vi, title_en, description_vi, description_en, guidance_vi, guidance_en, citation, severity, topic, rule_slug, status, approved_by, approved_at, is_active, segments, is_sample, rule_version)
      SELECT 'f0000000-0000-4000-8000-000000000001', rule_code, 99, title_vi, title_en, description_vi, description_en, guidance_vi, guidance_en, citation, severity, topic, rule_slug, 'approved', approved_by, approved_at, 'true', segments, 'true', rule_version
      FROM legal_rule WHERE rule_code = 'A9-LONG' AND status = 'approved'`, []);
    assert.match(String(err?.message), /UNIQUE constraint failed|uq_legal_rule_one_approved/);
  });

  test('FR-001 / FR-004: the list shows the latest revision per code with a draft flag; the history lists signed and retired codes; members cannot read it', async () => {
    const { listRules, listVersions } = await rules();
    const out = await listRules(ADMIN, {});
    const mil = out.rules.find(r => r.rule_code === 'A9-MIL');
    assert.equal(mil.status, 'approved');
    assert.equal(Number(mil.revision), 2);
    assert.equal(out.rules.find(r => r.rule_code === 'A9-HIST').has_draft, true);
    assert.equal((await listRules(QUAN, { status: 'retired' })).rules.every(r => r.status === 'retired'), true);
    await assert.rejects(() => listRules(YUI, {}), (e) => e.code === 'FORBIDDEN');
    const { versions: hist } = await listVersions(QUAN);
    assert.ok(hist.length >= 5);
    assert.ok(hist[0].rule_version >= hist[hist.length - 1].rule_version, 'newest first');
    assert.ok(hist.some(v => v.retired.includes('A9-RELIG')));
    assert.ok(hist.some(v => v.signed.includes('A9-MIL')));
  });

  test('BR-008: the module has no delete', async () => {
    assert.deepEqual(Object.keys(await rules()).filter(k => /delete|remove|destroy/i.test(k)), []);
  });
});
