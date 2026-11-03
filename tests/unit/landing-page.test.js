import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const loadContent = () => import('../../app/landing-content.js');
const vi = JSON.parse(fs.readFileSync('lib/i18n/vi.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('lib/i18n/en.json', 'utf8'));
const pageSource = () => fs.readFileSync('app/page.js', 'utf8');

// Every dictionary key a source file passes to t('…')
const keysIn = (source) => [...source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

describe('SC-01 landing page (T010, FR-001, Clarifications Q3, plan D2, SR-012, SR-013)', () => {
  test('Clarifications Q3: no text of the landing page names VFDA, in Vietnamese or English', async () => {
    const { LANDING, landingKeys } = await loadContent();
    const keys = [...new Set([...keysIn(pageSource()), ...landingKeys(LANDING)])];
    assert.ok(keys.length >= 10, 'the page reads its text from the dictionary');
    for (const key of keys) {
      assert.ok(key in vi && key in en, `missing key ${key}`);
      assert.doesNotMatch(vi[key], /VFDA/i, `vi ${key}`);
      assert.doesNotMatch(en[key], /VFDA/i, `en ${key}`);
    }
    assert.doesNotMatch(pageSource(), /VFDA/i);
  });

  test('Clarifications Q3: the page title and description (search results, link previews) do not name VFDA either', async () => {
    const source = pageSource();
    assert.match(source, /export async function generateMetadata/);
    const keys = [...source.matchAll(/(title|description): t\(['"]([^'"]+)['"]\)/g)].map(m => m[2]);
    assert.ok(keys.length === 2, `title and description keys: ${keys}`);
    for (const key of keys) {
      assert.doesNotMatch(vi[key], /VFDA/i, `vi ${key}`);
      assert.doesNotMatch(en[key], /VFDA/i, `en ${key}`);
    }
  });

  test('Clarifications Q3: no logo or other image on the landing page', () => {
    assert.doesNotMatch(pageSource(), /<img\b|<Image\b|logo/i);
  });

  test('Clarifications Q3: on the landing page the footer does not say "operated for VFDA"; elsewhere it still does', async () => {
    const { footerTextKey } = await loadContent();
    assert.doesNotMatch(vi[footerTextKey('/')], /VFDA/);
    assert.doesNotMatch(en[footerTextKey('/')], /VFDA/);
    assert.equal(footerTextKey('/locations'), 'frame.footer');
  });

  test('FR-001: Get started leads to the router at /start', async () => {
    const { LANDING } = await loadContent();
    assert.equal(LANDING.start.href, '/start');
  });

  test('SR-012 / D2: four items; only "Where should we shoot each scene?" is live; the others and Quick content check read "coming soon"', async () => {
    const { LANDING } = await loadContent();
    assert.equal(LANDING.uncertainties.length, 4);
    const live = LANDING.uncertainties.filter(i => i.href);
    assert.deepEqual(live.map(i => i.href), ['/locations/match']);
    for (const item of LANDING.uncertainties.filter(i => !i.href)) assert.equal(item.status, 'soon', item.key);
    assert.equal(LANDING.quickCheck.href, null);
    assert.equal(LANDING.quickCheck.status, 'soon');
  });

  test('SC-01 #10: the 5-step journey, in fixed order', async () => {
    const { LANDING } = await loadContent();
    assert.equal(LANDING.journey.length, 5);
  });

  test('SR-013: no Article 13 strip until the Legal Board approves its wording', async () => {
    const { LANDING, landingKeys } = await loadContent();
    assert.equal(LANDING.article13, undefined);
    for (const key of [...keysIn(pageSource()), ...landingKeys(LANDING)]) assert.doesNotMatch(key, /article/i, key);
    assert.doesNotMatch(pageSource(), /Điều 13|Article 13/);
  });
});
