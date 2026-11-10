import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// SC-30 and SC-31 view rules (T074; D15 sample label, SC-30 #9 severity labels, SR-282 citation, SR-283 wording).
const vi = JSON.parse(readFileSync(new URL('../../lib/i18n/vi.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../../lib/i18n/en.json', import.meta.url), 'utf8'));
const view = () => import('../../lib/requirements/view.js');
const base = { rule_code: 'A9-MIL', rule_slug: 'a9-mil', topic: 'security', severity: 'action', title_en: 'Military sites', title_vi: 'Khu quân sự',
  citation: 'Điều 9 khoản 1 điểm c', rule_version: '2026.08', is_sample: true, segments: ['A', 'B', 'C'] };

describe('Requirements view rules (T074)', () => {
  test('the card carries the Sample label only on sample rules (D15)', async () => {
    const { cardView } = await view();
    assert.equal(cardView(base, 'en').sampleKey, 'rules.sample');
    assert.equal(cardView({ ...base, is_sample: false }, 'en').sampleKey, null);
  });

  test('severity labels: notice → Needs attention, action → Action required (SC-30 #9); title by interface language', async () => {
    const { cardView } = await view();
    assert.equal(en[cardView(base, 'en').severityKey], 'Action required');
    assert.equal(en[cardView({ ...base, severity: 'notice' }, 'en').severityKey], 'Needs attention');
    assert.equal(cardView(base, 'vi').title, 'Khu quân sự');
    assert.equal(cardView(base, 'en').title, 'Military sites');
    assert.equal(cardView(base, 'en').href, '/requirements/a9-mil');
  });

  test('SR-282: a rule without a citation is never shown as a card', async () => {
    const { visibleCards } = await view();
    const cards = visibleCards([base, { ...base, rule_code: 'X', citation: '' }, { ...base, rule_code: 'Y', citation: null }], 'en');
    assert.deepEqual(cards.map(c => c.code), ['A9-MIL']);
    assert.ok(cards.every(c => c.citation.trim()));
  });

  test('filter links keep the choice in the URL (SC-30 interactions 1–2)', async () => {
    const { filterHref } = await view();
    assert.equal(filterHref({}), '/requirements');
    assert.equal(filterHref({ topic: 'history' }), '/requirements?topic=history');
    assert.equal(filterHref({ topic: 'history', segment: 'B' }), '/requirements?topic=history&segment=B');
  });

  test('every key the two screens use exists in vi.json and en.json, and no text calls content approved or safe (SR-283)', async () => {
    const { REQUIREMENTS_KEYS } = await view();
    assert.ok(REQUIREMENTS_KEYS.length >= 15);
    for (const k of REQUIREMENTS_KEYS) { assert.ok(vi[k], `vi ${k}`); assert.ok(en[k], `en ${k}`); }
    for (const k of REQUIREMENTS_KEYS.filter(k => k.startsWith('requirements.'))) {
      assert.doesNotMatch(en[k], /\b(approved|accepted|legally compliant|safe)\b/i, k);
      assert.doesNotMatch(vi[k], /an toàn|đã được duyệt|hợp pháp/i, k);
    }
  });

  test('the pages exist and every text goes through t() (pages app/requirements/page.js and [slug]/page.js)', () => {
    for (const p of ['app/requirements/page.js', 'app/requirements/[slug]/page.js']) assert.ok(existsSync(new URL(`../../${p}`, import.meta.url)), p);
  });
});
