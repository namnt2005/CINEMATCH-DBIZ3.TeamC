import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// SC-28 view rules (T035; M5 BR-002, Q3, SC-28 #4, #7, #8, #10; analysis A1).
const vi = JSON.parse(fs.readFileSync('lib/i18n/vi.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('lib/i18n/en.json', 'utf8'));
const view = () => import('../../lib/drafts/view.js');
const P = (idx, status, target_text = 'Bản dịch', reviewed_by_name = null) => ({ idx, status, target_text, reviewed_by_name, reviewer_org_name: null, reviewed_at: status === 'reviewed' ? '2026-11-10T09:00:00+07:00' : null });

describe('SC-28 view rules (T035)', () => {
  test('progress and the strips: DRAFT with the number left; the green strip at 100 %', async () => {
    const { progressView, stripView } = await view();
    const some = [P(1, 'reviewed'), P(2, 'machine'), P(3, 'machine', '')];
    assert.deepEqual(progressView(some), { reviewed: 1, total: 3, pct: 33, complete: false });
    assert.deepEqual(stripView(some), { key: 'drafts.strip.draft', vars: { n: 2 }, ok: false });
    assert.deepEqual(stripView([P(1, 'reviewed')]), { key: 'drafts.strip.done', vars: {}, ok: true });
  });

  test('A1: an empty Vietnamese paragraph reads "Not translated yet"; machine and reviewed have their own texts', async () => {
    const { statusView } = await view();
    assert.equal(en[statusView(P(1, 'machine', '')).key], 'Not translated yet');
    assert.equal(vi[statusView(P(1, 'machine', '')).key], 'Chưa có bản dịch');
    assert.equal(en[statusView(P(1, 'machine')).key], 'Machine translation · not proofread');
    const r = statusView(P(1, 'reviewed', 'x', 'Lan Phạm'));
    assert.equal(r.key, 'drafts.status.reviewed');
    assert.deepEqual(r.vars, { name: 'Lan Phạm', date: '10/11/2026' });
  });

  test('✓ Proofread only on non-empty machine paragraphs with can_proofread; Confirm whole document only with can_confirm', async () => {
    const { canMarkProofread, showConfirm } = await view();
    assert.equal(canMarkProofread(P(1, 'machine'), { can_proofread: true }), true);
    assert.equal(canMarkProofread(P(1, 'machine', ''), { can_proofread: true }), false);
    assert.equal(canMarkProofread(P(1, 'reviewed'), { can_proofread: true }), false);
    assert.equal(canMarkProofread(P(1, 'machine'), { can_proofread: false }), false);
    assert.equal(showConfirm({ can_confirm: true }, [P(1, 'machine')]), true);
    assert.equal(showConfirm({ can_confirm: false }, [P(1, 'machine')]), false);
    assert.equal(showConfirm({ can_confirm: true }, [P(1, 'reviewed')]), false, 'nothing left to confirm');
  });

  test('Q3: the consent box only with the paid plan; the mismatch text names the term', async () => {
    const { consentVisible, mismatchVars } = await view();
    assert.equal(consentVisible({ consent_needed: true }), true);
    assert.equal(consentVisible({ consent_needed: false }), false);
    assert.deepEqual(mismatchVars({ term_en: 'ferry', term_vi: 'đò' }), { en: 'ferry', vi: 'đò' });
  });

  test('every key used exists in vi.json and en.json; no banned word in drafts.* / glossary.*; no node: import', async () => {
    const { DRAFTS_KEYS } = await view();
    assert.ok(DRAFTS_KEYS.length >= 30);
    for (const k of DRAFTS_KEYS) { assert.ok(vi[k], `vi ${k}`); assert.ok(en[k], `en ${k}`); }
    for (const k of DRAFTS_KEYS.filter(k => /^(drafts|glossary)\./.test(k))) {
      assert.doesNotMatch(en[k], /\b(approved|accepted|legally compliant|safe)\b/i, k);
      assert.doesNotMatch(vi[k], /an toàn|đã được duyệt|hợp pháp/i, k);
    }
    assert.doesNotMatch(fs.readFileSync('lib/drafts/view.js', 'utf8'), /from ['"]node:/);
  });
});
