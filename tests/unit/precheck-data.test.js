import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { getOne, query } from '../../lib/db/client.js';

// The pre-check on node:sqlite (T029, FR-006, FR-007, FR-012, BR-004, BR-007, Clarifications Q6, decision D11, US-1
// Scenarios 1–3). The summaries are invented; LLM_PROVIDER=mock → keyword match; the model is a fake client.
const precheck = () => import('../../lib/db/precheck.js');
const GUEST = { role: 'guest', isAuthenticated: false, userId: null };
const MOCK = { LLM_PROVIDER: 'mock' };
const PAID = { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-test', GEMINI_PAID_TIER: 'true' };
const STORY = 'An ageing ferryman named Tư lives in a fishing village on the northern coast. Every morning he carries schoolchildren, '
  + 'traders and their bicycles across a wide, muddy estuary. One stormy night, two young soldiers knock on his door and ask him to take them '
  + 'to the border post on the far side before dawn. Tư hesitates, because the river is high and his boat is old. His granddaughter, who '
  + 'dreams of studying in Hà Nội, insists on coming along. The crossing tests their courage, and by sunrise the three strangers have become a kind of family.';
const QUIET = "A young chef opens a small noodle shop in a quiet street of Đà Lạt and slowly wins over her neighbours with recipes from her grandmother's notebook.";
const fake = (findings) => ({ models: { generateContent: async () => ({ text: JSON.stringify({ findings }) }) } });
const sha = (t) => createHash('sha256').update(t.trim().replace(/\s+/g, ' ')).digest('hex');
const currentVersion = () => getOne('SELECT MAX(rule_version) AS v FROM rule_set_version').v;

describe('Pre-check on node:sqlite (T029)', () => {
  test('US-1 Sc1: a 96-word summary gives a level, cited findings with their spans, and a brief id', async () => {
    const { runPrecheck } = await precheck();
    assert.equal(STORY.trim().split(/\s+/).length, 96);
    const out = await runPrecheck(GUEST, { text: STORY, lang: 'en', flags: { military: 'yes' } }, { env: MOCK });
    assert.equal(out.method, 'keywords');
    assert.equal(out.state, 'findings');
    assert.equal(out.attention_level, 'high', 'two action findings (A9-MIL, A9-LONG)');
    assert.deepEqual(out.findings.map(f => f.rule_code).sort(), ['A9-LONG', 'A9-MIL']);
    for (const f of out.findings) {
      assert.ok(f.citation, `${f.rule_code} citation`);
      assert.equal(STORY.slice(f.span_start, f.span_end), f.quoted_text);
      assert.ok(f.guidance_en && f.description_en, 'the rule\'s own texts');
    }
    assert.match(out.brief_id, /^[0-9a-f-]{36}$/);
    assert.equal(out.rule_version, currentVersion());
  });

  test('Q6 / FR-007: the stored run keeps the hash, never the text; findings keep the revision and the span only', async () => {
    const { runPrecheck } = await precheck();
    const out = await runPrecheck(GUEST, { text: STORY, lang: 'en', flags: { military: 'yes', real_person: 'no' } }, { env: MOCK, country: 'KR' });
    const run = getOne('SELECT * FROM precheck_run WHERE brief_id = ?', [out.brief_id]);
    assert.equal(run.synopsis_hash, sha(STORY));
    assert.equal(run.country_guess, 'KR');
    assert.equal(run.lang, 'en');
    assert.equal(run.project_id, null);
    const stored = JSON.stringify([run, ...query('SELECT * FROM precheck_finding WHERE brief_id = ?', [out.brief_id])]);
    for (const piece of ['two young soldiers knock on his door', 'border post on the far side', 'ferryman']) assert.equal(stored.includes(piece), false, piece);
    const findings = query('SELECT * FROM precheck_finding WHERE brief_id = ?', [out.brief_id]);
    assert.equal(findings.length, 2);
    for (const f of findings) assert.deepEqual(Object.keys(f).sort(), ['brief_id', 'rule_id', 'span_end', 'span_start']);
  });

  test('US-1 Sc3: nothing found → Low and state none; nothing stored but the run', async () => {
    const { runPrecheck } = await precheck();
    const out = await runPrecheck(GUEST, { text: QUIET, lang: 'en' }, { env: MOCK });
    assert.equal(out.state, 'none');
    assert.equal(out.attention_level, 'low');
    assert.deepEqual(out.findings, []);
    assert.equal(getOne('SELECT attention_level FROM precheck_run WHERE brief_id = ?', [out.brief_id]).attention_level, 'low');
  });

  test('US-1 Sc2 / D11: every model finding dropped → could_not_check, no level; count and codes stored, no text', async () => {
    const { runPrecheck } = await precheck();
    const out = await runPrecheck(GUEST, { text: STORY, lang: 'en', consent_advanced: true },
      { env: PAID, client: fake([{ rule_code: 'A9-NAVY', quoted_text: 'soldiers' }, { rule_code: 'A9-MIL', quoted_text: 'tanks on the beach' }]) });
    assert.equal(out.method, 'model');
    assert.equal(out.state, 'could_not_check');
    assert.equal(out.attention_level, null);
    assert.equal(out.dropped_count, 2);
    const run = getOne('SELECT * FROM precheck_run WHERE brief_id = ?', [out.brief_id]);
    assert.equal(run.attention_level, null);
    assert.equal(Number(run.dropped_count), 2);
    assert.deepEqual(JSON.parse(run.dropped_rule_codes).sort(), ['A9-MIL', 'A9-NAVY']);
    assert.equal(JSON.stringify(run).includes('tanks on the beach'), false);
  });

  test('BR-004: recordPrecheck recomputes the level from the cited rules — a wrong level from the caller is not stored', async () => {
    const { recordPrecheck } = await precheck();
    const mil = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-MIL' AND status = 'approved'").rule_id;
    const long = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-LONG' AND status = 'approved'").rule_id;
    const id = await recordPrecheck({ hash: sha('x'), lang: 'en', flags: null, country: null, rule_version: currentVersion(), project_id: null,
      attention_level: 'low', dropped_count: 0, dropped_rule_codes: [],
      findings: [{ rule_id: mil, span_start: 0, span_end: 4 }, { rule_id: long, span_start: 10, span_end: 16 }] });
    assert.equal(getOne('SELECT attention_level FROM precheck_run WHERE brief_id = ?', [id]).attention_level, 'high');
  });

  test('BR-001: recordPrecheck refuses a revision that is not approved in the version', async () => {
    const { recordPrecheck } = await precheck();
    const draft = getOne("SELECT rule_id FROM legal_rule WHERE rule_code = 'A9-HERIT'").rule_id;
    await assert.rejects(() => recordPrecheck({ hash: sha('y'), lang: 'en', rule_version: currentVersion(), dropped_count: 0, dropped_rule_codes: [],
      findings: [{ rule_id: draft, span_start: 0, span_end: 3 }] }), (e) => e.code === 'VALIDATION_ERROR');
  });

  test('BR-007 / US-3 Sc2: after a new rule-set version the next pre-check stores that version', async () => {
    const { runPrecheck } = await precheck();
    query("INSERT INTO rule_set_version (rule_version, created_at, created_by) VALUES ('2026.11', '2026-11-09T10:00:00+07:00', 'd8eb7d55-1c9f-59fe-8ebf-2c509ea2b49f')");
    const out = await runPrecheck(GUEST, { text: QUIET, lang: 'en' }, { env: MOCK });
    assert.equal(out.rule_version, '2026.11');
    assert.equal(getOne('SELECT rule_version FROM precheck_run WHERE brief_id = ?', [out.brief_id]).rule_version, '2026.11');
  });

  test('model and keyword match both failing → CHECK_UNAVAILABLE and nothing stored', async () => {
    const { runPrecheck } = await precheck();
    const before = Number(getOne('SELECT COUNT(*) AS n FROM precheck_run').n);
    await assert.rejects(() => runPrecheck(GUEST, { text: STORY, lang: 'en' }, { env: MOCK, keywordMatcher: () => { throw new Error('broken'); } }),
      (e) => e.code === 'CHECK_UNAVAILABLE');
    assert.equal(Number(getOne('SELECT COUNT(*) AS n FROM precheck_run').n), before);
  });

  test('basis for SC-03 #10: current version, number of approved rules, advanced analysis only on the paid plan', async () => {
    const { precheckBasis } = await precheck();
    const approved = Number(getOne("SELECT COUNT(*) AS n FROM legal_rule WHERE status = 'approved' AND is_active IN ('true', 1)").n);
    assert.deepEqual(await precheckBasis({ env: MOCK }), { rule_version: currentVersion(), approved_count: approved, advanced_available: false });
    assert.equal((await precheckBasis({ env: PAID })).advanced_available, true);
  });
});
