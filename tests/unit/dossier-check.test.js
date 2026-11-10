import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getDb } from '../../lib/db/client.js';

// The Article 13 dossier check on node:sqlite (T044, M2 BR-005, FR-008, FR-009, US-2 Scenarios 1–2, SC-27 SR-081..SR-086):
// four components a–d from fixed rules — never a language model.
const dossier = () => import('../../lib/db/dossier.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const LAURENT = member('95f36904-6141-5469-8c63-712a80a4295e');   // owner of Rice and Salt
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');      // owner of The Last Ferry, Quiet Harbour Blues, Monsoon Signal
const YUI = member('118de3c8-88eb-5003-a2f9-26bbdd0186ae');       // not on The Last Ferry
const OWNER_TERRACES = member('18557ae8-32fa-5e30-9f76-295c73953f1d');
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const BLUES = '8b0fd28f-7963-5089-879a-6970d82e04af';
const MONSOON = 'f1419149-4224-59e3-84d5-0697a882957c';
const TERRACES = '03f0d59d-ab53-519c-912e-71c66f38f3b6';
const ORDER = ['A13_APPLICATION', 'A13_SCRIPT_VI', 'A13_SERVICE_AGREEMENT', 'A13_ART9_COMMITMENT'];
const states = (d) => d.components.map(c => c.state);

describe('Article 13 dossier check (T044)', () => {
  test('US-2 Sc1: Rice and Salt (application only) → 1 / 4, 25 %, Not ready to submit, three components listed with an action', async () => {
    const { getDossier } = await dossier();
    const d = await getDossier(LAURENT, RICE);
    assert.equal(d.applies, true);
    assert.equal(d.total, 4);
    assert.equal(d.present, 1);
    assert.equal(Number(d.completeness_pct), 25);
    assert.equal(d.verdict, 'not_ready');
    assert.deepEqual(d.components.map(c => c.doc_code), ORDER, 'order a–d of Article 13 clause 3 (SR-081)');
    assert.deepEqual(d.components.map(c => c.letter), ['a', 'b', 'c', 'd']);
    assert.deepEqual(states(d), ['present', 'missing', 'missing', 'missing']);
    for (const c of d.components.filter(c => c.state !== 'present')) assert.ok(c.action, `${c.doc_code} has an action`);
  });

  test('US-2 Sc2: The Last Ferry — component b Needs fixing, not Present', async () => {
    const { getDossier } = await dossier();
    const d = await getDossier(PARK, FERRY);
    assert.equal(d.components[1].state, 'needs_fix');
    assert.equal(d.verdict, 'not_ready');
  });

  test('SR-086 / SR-085: a slot stored as present is lowered — b while a paragraph is not proofread, c while no request is confirmed', async () => {
    const { getDossier } = await dossier();
    const db = getDb();
    db.exec('BEGIN');
    try {
      db.prepare("UPDATE document_slot SET state = 'present' WHERE project_id = ? AND doc_code IN ('A13_SCRIPT_VI', 'A13_SERVICE_AGREEMENT')").run(FERRY);
      const d = await getDossier(PARK, FERRY);
      assert.equal(d.components[1].state, 'needs_fix', 'machine paragraphs remain');
      assert.equal(d.components[2].state, 'pending', 'the request to Bến Xưa is accepted, not confirmed');
    } finally {
      db.exec('ROLLBACK');
    }
  });

  test('Quiet Harbour Blues: all four present, proofread and confirmed → complete', async () => {
    const { getDossier } = await dossier();
    const d = await getDossier(PARK, BLUES);
    assert.deepEqual(states(d), ['present', 'present', 'present', 'present']);
    assert.equal(d.verdict, 'complete');
    assert.equal(Number(d.completeness_pct), 100);
  });

  test('a project with no slot shows four Missing; segment C needs no Article 13 dossier; non-members get NOT_FOUND', async () => {
    const { getDossier } = await dossier();
    assert.deepEqual(states(await getDossier(OWNER_TERRACES, TERRACES)), ['missing', 'missing', 'missing', 'missing']);
    assert.equal((await getDossier(PARK, MONSOON)).applies, false);
    await assert.rejects(() => getDossier(YUI, FERRY), (e) => e.code === 'NOT_FOUND');
  });

  test('BR-005: the dossier code imports no model, matcher or extractor', () => {
    const files = ['lib/dossier/check.js', 'lib/db/dossier.js', 'lib/db/sqlite/dossier.js', 'lib/db/supabase/dossier.js', 'lib/db/dossier-view.sql'];
    for (const f of files) {
      assert.ok(fs.existsSync(f), `${f} exists`);
      assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /content-check|extraction|@google\/genai|gemini|matcher/i, f);
    }
  });

  test('BR-005: the check gives the same answer with a model configured and the network cut', async () => {
    const { getDossier } = await dossier();
    const saved = { fetch: globalThis.fetch, provider: process.env.LLM_PROVIDER, key: process.env.GEMINI_API_KEY };
    let called = 0;
    globalThis.fetch = async () => { called++; throw new Error('no network in the dossier check'); };
    Object.assign(process.env, { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key-not-used' });
    try {
      const d = await getDossier(LAURENT, RICE);
      assert.equal(d.present, 1);
      assert.equal(called, 0, 'no call left the process');
    } finally {
      globalThis.fetch = saved.fetch;
      for (const [k, v] of [['LLM_PROVIDER', saved.provider], ['GEMINI_API_KEY', saved.key]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
  });
});
