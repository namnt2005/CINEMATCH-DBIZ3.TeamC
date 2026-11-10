import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// Banned words (T028, M2 BR-003, SC-48 SR-074, SC-27 #5, decision D8): no result text of the pre-check, the project
// content check, the dossier check or the timeline says approved, accepted, legally compliant or safe — in either
// language, including the no-finding and the all-dropped texts; no deadline text says safe / an toàn.
const wording = () => import('../../lib/content-check/wording.js');
const PREFIXES = ['precheck.', 'content.', 'dossier.', 'timeline.', 'dashboard.deadline.'];
const DEADLINE_PREFIXES = ['timeline.', 'dashboard.deadline.', 'dossier.deadline.'];
const REQUIRED = ['precheck.result.none', 'precheck.result.could_not_check', 'precheck.result.unavailable', 'precheck.method.keywords',
  'dossier.verdict.complete', 'dossier.verdict.not_ready', 'timeline.recommended.title', 'timeline.recommended.passed', 'dashboard.deadline.recommended'];
const keysOf = (dict) => Object.keys(dict).filter(k => PREFIXES.some(p => k.startsWith(p)));

describe('Banned words in results (T028)', () => {
  test('the wording module lists the banned words of research R11 in both languages', async () => {
    const { BANNED_WORDS } = await wording();
    for (const w of ['approved', 'accepted', 'legally compliant', 'safe', 'passed', 'permitted']) assert.ok(BANNED_WORDS.en.includes(w), w);
    for (const w of ['được duyệt', 'được phê duyệt', 'được chấp thuận', 'chấp nhận', 'hợp pháp', 'an toàn', 'đạt', 'được phép']) assert.ok(BANNED_WORDS.vi.includes(w), w);
  });

  test('findBanned matches whole words and phrases only, case-insensitively', async () => {
    const { findBanned } = await wording();
    assert.deepEqual(findBanned('Your story is SAFE to shoot', 'en'), ['safe']);
    assert.deepEqual(findBanned('Nội dung này hợp pháp', 'vi'), ['hợp pháp']);
    assert.deepEqual(findBanned('Unsafe? Safety buffer', 'en'), [], 'not inside other words');
    assert.deepEqual(findBanned('Đạtt', 'vi'), []);
  });

  test('every required result and deadline text exists in vi and en', () => {
    for (const k of REQUIRED) {
      assert.equal(typeof vi[k], 'string', `vi ${k}`);
      assert.equal(typeof en[k], 'string', `en ${k}`);
    }
    assert.match(en['precheck.result.none'], /\{version\}/, 'the no-finding text names the rule set version (US-1 Sc3)');
  });

  test('BR-003: no result text of SC-48, SC-27, SC-29 or the SC-12 strip contains a banned word, in either language', async () => {
    const { findBanned } = await wording();
    const offenders = [];
    for (const [lang, dict] of [['vi', vi], ['en', en]]) {
      for (const k of keysOf(dict)) {
        const hit = findBanned(dict[k], lang);
        if (hit.length) offenders.push(`${lang} ${k}: ${hit.join(', ')}`);
      }
    }
    assert.ok(keysOf(en).length >= REQUIRED.length, 'the texts exist (not vacuous)');
    assert.deepEqual(offenders, []);
  });

  test('BR-003: every message the M2 APIs can return is free of banned words', async () => {
    const { RESULT_MESSAGE_KEYS, findBanned } = await wording();
    assert.ok(RESULT_MESSAGE_KEYS.length >= 4);
    for (const k of RESULT_MESSAGE_KEYS) {
      for (const [lang, dict] of [['vi', vi], ['en', en]]) {
        assert.equal(typeof dict[k], 'string', `${lang} ${k}`);
        assert.deepEqual(findBanned(dict[k], lang), [], `${lang} ${k}`);
      }
    }
  });

  test('D8: no deadline text says safe / an toàn', () => {
    for (const [dict, word] of [[en, /\bsafe\b/i], [vi, /an toàn/i]]) {
      for (const k of Object.keys(dict).filter(k => DEADLINE_PREFIXES.some(p => k.startsWith(p)))) assert.doesNotMatch(dict[k], word, k);
    }
    assert.match(en['timeline.recommended.title'], /Recommended submission date/);
    assert.match(vi['timeline.recommended.title'], /Hạn nộp khuyến nghị \(có dự phòng\)/);
  });
});
