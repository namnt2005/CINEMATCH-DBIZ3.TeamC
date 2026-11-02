import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadLegal = () => import('../../lib/legal/documents.js');

describe('Versioned privacy policy and terms — SC-42, SC-43 (T051, BR-003, SR-251..SR-265)', () => {
  test('BR-003: one current consent version, at most 20 characters (consent.consent_version)', async () => {
    const { currentConsentVersion } = await import('../../lib/db/consent.js');
    const version = currentConsentVersion();
    assert.ok(version && version.length <= 20);
    const { getDocument } = await loadLegal();
    for (const kind of ['privacy', 'terms']) assert.equal(getDocument(kind).version, version, kind);
  });

  test('SR-254 / SR-265: each document exists in Vietnamese and English with the same sections, none empty', async () => {
    const { getDocument } = await loadLegal();
    for (const kind of ['privacy', 'terms']) {
      const doc = getDocument(kind);
      assert.deepEqual(doc.sections.vi.map(s => s.id), doc.sections.en.map(s => s.id), kind);
      for (const lang of ['vi', 'en']) {
        assert.ok(doc.title[lang]);
        for (const s of doc.sections[lang]) assert.ok(s.heading.trim() && s.body.trim(), `${kind}/${lang}/${s.id}`);
      }
      assert.equal(doc.draft, true, 'SR-255: a draft until the VFDA Legal Board approves it');
    }
  });

  test('SR-262 / SR-263: the terms say roles are granted only by an admin and never call a check "legally compliant"', async () => {
    const { getDocument } = await loadLegal();
    const terms = getDocument('terms');
    const en = terms.sections.en.map(s => s.body).join(' ');
    assert.match(en, /granted only by a VFDA admin/i);
    assert.doesNotMatch(en, /legally compliant/i);
  });

  test('SR-253: the privacy policy describes deletion as decided (deactivated at once, anonymised within 30 days, Former member)', async () => {
    const { getDocument } = await loadLegal();
    const en = getDocument('privacy').sections.en.map(s => s.body).join(' ');
    assert.match(en, /deactivated at once/i);
    assert.match(en, /30 days/);
    assert.match(en, /Former member/);
  });

  test('SC-42 / SC-43 Error state: an unknown ?version= falls back to the current version and says so', async () => {
    const { getDocument } = await loadLegal();
    const doc = getDocument('terms', 'no-such-version');
    assert.equal(doc.version, (await import('../../lib/db/consent.js')).currentConsentVersion());
    assert.equal(doc.requestedMissing, true);
  });

  test('SR-235: getConsents lists the accepted versions of an account, newest first (sqlite source)', async () => {
    const { getConsents } = await import('../../lib/db/consent.js');
    const rows = await getConsents('4ef79de6-8efb-58f7-8514-9c0532345ac4');
    assert.deepEqual(rows.map(r => r.consent_version), ['2026.2', '2026.1']);
    assert.ok(rows.every(r => r.accepted_at));
  });
});
