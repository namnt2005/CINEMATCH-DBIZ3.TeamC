import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-27 view rules (T047; SC-27 #4–#12, SR-081..SR-086; BR-003; Clarifications Q9).
const check = () => import('../../lib/dossier/check.js');
const wording = () => import('../../lib/content-check/wording.js');
const ROWS = ['A13_APPLICATION', 'A13_SCRIPT_VI', 'A13_SERVICE_AGREEMENT', 'A13_ART9_COMMITMENT'].map((doc_code, i) => ({ doc_code, ord: i + 1, state: ['present', 'needs_fix', 'pending', 'missing'][i], stored_state: ['present', 'present', 'present', 'missing'][i] }));
const TYPES = ROWS.map(r => ({ doc_code: r.doc_code, name_vi: `${r.doc_code} vi`, name_en: `${r.doc_code} en`, template_url: 'https://storage.cinematch.example/x.docx' }));

describe('SC-27 view rules (T047)', () => {
  test('SR-082: every state has an icon and a text key; no colour-only state', async () => {
    const { stateView } = await check();
    for (const s of ['present', 'needs_fix', 'pending', 'missing']) {
      const v = stateView(s);
      assert.ok(v.icon && v.icon.trim(), s);
      assert.equal(v.key, `dossier.state.${s}`);
      assert.equal(typeof vi[v.key], 'string'); assert.equal(typeof en[v.key], 'string');
    }
  });

  test('SR-085 / SR-086: a lowered component carries its reason', async () => {
    const { shapeDossier } = await check();
    const d = shapeDossier({ segment: 'A' }, ROWS, TYPES, '2026-11-09T10:00:00+07:00');
    assert.equal(d.components[1].reason, 'dossier.reason.paragraphs_open');
    assert.equal(d.components[2].reason, 'dossier.reason.request_not_confirmed');
    assert.equal(d.components[0].reason ?? null, null);
    assert.equal(d.verdict, 'not_ready');
    assert.equal(d.present, 1);
  });

  test('SR-083: automatic checks and checks by a person are separate lists, and nothing declares a signature or seal valid', async () => {
    const { shapeDossier } = await check();
    const d = shapeDossier({ segment: 'B' }, ROWS, TYPES, '2026-11-09T10:00:00+07:00');
    for (const c of d.components) {
      assert.equal(c.auto_checked.some(k => c.needs_person.includes(k)), false, c.doc_code);
      for (const k of [...c.auto_checked, ...c.needs_person]) {
        assert.equal(typeof en[k], 'string', k);
        assert.doesNotMatch(en[k], /signature (is )?valid|seal (is )?valid/i, k);
      }
      assert.ok(c.needs_person.some(k => /signature|seal/.test(k)) || c.doc_code === 'A13_SCRIPT_VI', `${c.doc_code}: a person checks signatures and seals`);
    }
  });

  test('BR-003 / SC-27 #5: the verdict texts never say passed or approved, in either language', async () => {
    const { findBanned } = await wording();
    for (const k of ['dossier.verdict.complete', 'dossier.verdict.not_ready']) {
      assert.equal(typeof en[k], 'string', k); assert.equal(typeof vi[k], 'string', k);
      assert.deepEqual(findBanned(en[k], 'en'), [], k);
      assert.deepEqual(findBanned(vi[k], 'vi'), [], k);
    }
  });

  test('Q9: row a names Mẫu số 01, Phụ lục I, Thông tư 17/2022/TT-BVHTTDL; row d names Phụ lục IV', () => {
    assert.match(vi['dossier.form.application'], /Mẫu số 01, Phụ lục I, Thông tư 17\/2022\/TT-BVHTTDL/);
    assert.match(en['dossier.form.application'], /Mẫu số 01, Phụ lục I, Thông tư 17\/2022\/TT-BVHTTDL/);
    assert.match(vi['dossier.form.commitment'], /Phụ lục IV/);
    assert.match(en['dossier.form.commitment'], /Phụ lục IV/);
  });

  test('all four complete → complete verdict; segment C → not applicable', async () => {
    const { shapeDossier } = await check();
    const full = ROWS.map(r => ({ ...r, state: 'present', stored_state: 'present' }));
    assert.equal(shapeDossier({ segment: 'A' }, full, TYPES, 'x').verdict, 'complete');
    assert.equal(shapeDossier({ segment: 'C' }, [], TYPES, 'x').applies, false);
  });
});
