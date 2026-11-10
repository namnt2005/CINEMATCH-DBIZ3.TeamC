import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne, query } from '../../lib/db/client.js';

// The project content check on node:sqlite (T031, FR-013, FR-014, decision D5, Clarifications Q3, research R7):
// "Save to project" writes a compliance run with the quoted passages of the member's own project; members mark findings
// reviewed; the M0 Content gauge reads it (30 run + 30 current version + 40 × reviewed share).
const checks = () => import('../../lib/db/content-checks.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const YUI = member('118de3c8-88eb-5003-a2f9-26bbdd0186ae');      // owner of Lantern Street
const LAURENT = member('95f36904-6141-5469-8c63-712a80a4295e');  // owner of Rice and Salt and of Harbour Lights (archived)
const OKAFOR = member('2985398f-7372-5d92-a85d-117c3a4b91e4');   // view member of Rice and Salt
const LANTERN = '196465cf-563e-507e-aa03-b73497ac8e56';
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const HARBOUR_LIGHTS = 'a745bb54-573f-5e8f-9d99-2d7e9af46ccf';
const TEXT = 'At dawn two soldiers row a lantern boat to the border post while the whole street watches from the bridge.';
const FINDINGS = [{ rule_code: 'A9-MIL', quoted_text: 'two soldiers' }, { rule_code: 'A9-LONG', quoted_text: 'border post' }];
const version = () => getOne('SELECT MAX(rule_version) AS v FROM rule_set_version').v;
const gauge = (projectId) => getOne('SELECT content_score, content_action FROM v_project_readiness WHERE project_id = ?', [projectId]);
let runId;

describe('Project content check on node:sqlite (T031)', () => {
  test('before: Lantern Street has a current run with every finding reviewed → Content 100', () => {
    assert.equal(Number(gauge(LANTERN).content_score), 100);
  });

  test('D5 / FR-013: Save to project writes one compliance run (current version), its open findings with their passages, and a pre-check run', async () => {
    const { saveContentCheck } = await checks();
    const beforePrecheck = Number(getOne('SELECT COUNT(*) AS n FROM precheck_run WHERE project_id = ?', [LANTERN]).n);
    const out = await saveContentCheck(YUI, LANTERN, { text: TEXT, lang: 'en', rule_version: version(), findings: FINDINGS });
    runId = out.run_id;
    assert.equal(out.findings, 2);
    const run = getOne('SELECT * FROM compliance_run WHERE run_id = ?', [runId]);
    assert.equal(run.project_id, LANTERN);
    assert.equal(run.rule_version, version());
    const rows = query('SELECT f.quoted_text, f.finding_status, r.rule_code, r.status FROM compliance_finding f JOIN legal_rule r ON r.rule_id = f.rule_id WHERE f.run_id = ? ORDER BY r.rule_code', [runId]);
    assert.deepEqual(rows.map(r => [r.rule_code, r.quoted_text, r.finding_status, r.status]), [['A9-LONG', 'border post', 'open', 'approved'], ['A9-MIL', 'two soldiers', 'open', 'approved']]);
    assert.equal(Number(getOne('SELECT COUNT(*) AS n FROM precheck_run WHERE project_id = ?', [LANTERN]).n), beforePrecheck + 1, 'FR-007 demand data point');
    assert.equal(JSON.stringify(getOne('SELECT * FROM precheck_run WHERE project_id = ? ORDER BY created_at DESC LIMIT 1', [LANTERN])).includes('lantern boat'), false);
    assert.equal(Number(gauge(LANTERN).content_score), 60, '30 + 30 + 0 reviewed');
  });

  test('R7: a finding whose code is not signed or whose quote is not in the text is never saved', async () => {
    const { saveContentCheck } = await checks();
    for (const bad of [[{ rule_code: 'A9-MIL', quoted_text: 'three soldiers' }], [{ rule_code: 'A9-HERIT', quoted_text: 'bridge' }], [{ rule_code: 'A9-NAVY', quoted_text: 'boat' }]]) {
      await assert.rejects(() => saveContentCheck(YUI, LANTERN, { text: TEXT, lang: 'en', rule_version: version(), findings: bad }), (e) => e.code === 'VALIDATION_ERROR', JSON.stringify(bad));
    }
  });

  test('refusals: rule set changed, view member, non-member, archived project', async () => {
    const { saveContentCheck } = await checks();
    const body = { text: TEXT, lang: 'en', rule_version: version(), findings: FINDINGS };
    await assert.rejects(() => saveContentCheck(YUI, LANTERN, { ...body, rule_version: '2026.07' }), (e) => e.code === 'RULE_SET_CHANGED');
    await assert.rejects(() => saveContentCheck(OKAFOR, RICE, body), (e) => e.code === 'FORBIDDEN');
    await assert.rejects(() => saveContentCheck(YUI, RICE, body), (e) => e.code === 'NOT_FOUND');
    await assert.rejects(() => saveContentCheck(LAURENT, HARBOUR_LIGHTS, body), (e) => e.code === 'ARCHIVED');
  });

  test('FR-013 / BR-008: the latest run lists each finding with the text of the revision it cites', async () => {
    const { latestContentCheck } = await checks();
    const out = await latestContentCheck(YUI, LANTERN);
    assert.equal(out.run_id, runId);
    assert.equal(out.current, true);
    const mil = out.findings.find(f => f.rule_code === 'A9-MIL');
    assert.ok(mil.citation && mil.title_en && mil.guidance_en && mil.description_en);
    assert.equal(mil.quoted_text, 'two soldiers');
    assert.equal(mil.finding_status, 'open');
    await assert.rejects(() => latestContentCheck(LAURENT, LANTERN), (e) => e.code === 'NOT_FOUND');
  });

  test('FR-014: owner marks a finding reviewed with a note (≤ 1 000); view members cannot; the gauge counts it', async () => {
    const { latestContentCheck, reviewFinding } = await checks();
    const id = (await latestContentCheck(YUI, LANTERN)).findings[0].finding_id;
    await assert.rejects(() => reviewFinding(YUI, id, { note: 'x'.repeat(1001) }), (e) => e.code === 'VALIDATION_ERROR');
    const out = await reviewFinding(YUI, id, { note: 'Uniforms are fictional.' });
    assert.deepEqual(out, { finding_id: id, finding_status: 'reviewed', reviewer_note: 'Uniforms are fictional.' });
    assert.equal(Number(gauge(LANTERN).content_score), 80, '30 + 30 + 40 × 1/2');
    const riceFinding = getOne("SELECT f.finding_id FROM compliance_finding f JOIN compliance_run r ON r.run_id = f.run_id WHERE r.project_id = ? LIMIT 1", [RICE]).finding_id;
    await assert.rejects(() => reviewFinding(OKAFOR, riceFinding, {}), (e) => e.code === 'FORBIDDEN');
  });

  test('Q3: after a new rule-set version the gauge loses its 30 current-version points and asks for a re-check — nothing is re-run', async () => {
    const runs = Number(getOne('SELECT COUNT(*) AS n FROM compliance_run').n);
    query("INSERT INTO rule_set_version (rule_version, created_at, created_by) VALUES ('2026.11', '2026-11-09T10:00:00+07:00', 'd8eb7d55-1c9f-59fe-8ebf-2c509ea2b49f')");
    assert.equal(Number(gauge(LANTERN).content_score), 50, '30 + 0 + 20');
    assert.equal(gauge(LANTERN).content_action, 'content.recheck_new_rules');
    assert.equal(Number(getOne('SELECT COUNT(*) AS n FROM compliance_run').n), runs);
  });
});
