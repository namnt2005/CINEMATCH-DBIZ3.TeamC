import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// Pre-check input (T027, FR-005, decision D12): 20–200 words after trimming, en/vi, three optional flags, consent box.
const input = () => import('../../lib/content-check/input.js');
const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

describe('Pre-check input (T027)', () => {
  test('countWords counts runs of non-space characters, extra whitespace ignored', async () => {
    const { countWords } = await input();
    assert.equal(countWords('  one   two\nthree\t four  '), 4);
    assert.equal(countWords(''), 0);
    assert.equal(countWords('Đò ngang qua sông'), 4);
  });

  test('FR-005: 19 words refused, 20 and 200 accepted, 201 refused', async () => {
    const { validatePrecheckInput } = await input();
    assert.equal(validatePrecheckInput({ text: words(19), lang: 'en' }).errors.text, 'precheck.error.words');
    assert.equal(validatePrecheckInput({ text: words(20), lang: 'en' }).ok, true);
    assert.equal(validatePrecheckInput({ text: words(200), lang: 'en' }).ok, true);
    assert.equal(validatePrecheckInput({ text: words(201), lang: 'en' }).errors.text, 'precheck.error.words');
  });

  test('lang en / vi only; flags yes / no / unsure only; consent false unless exactly true', async () => {
    const { validatePrecheckInput } = await input();
    assert.equal(validatePrecheckInput({ text: words(30), lang: 'fr' }).errors.lang, 'precheck.error.lang');
    assert.equal(validatePrecheckInput({ text: words(30), lang: 'vi', flags: { military: 'maybe' } }).errors.flags, 'precheck.error.flags');
    assert.equal(validatePrecheckInput({ text: words(30), lang: 'vi', flags: { tanks: 'yes' } }).errors.flags, 'precheck.error.flags');
    const ok = validatePrecheckInput({ text: `  ${words(30)}  `, lang: 'vi', flags: { real_person: 'unsure', military: 'yes' }, consent_advanced: 'yes' });
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.value.flags, { real_person: 'unsure', military: 'yes' });
    assert.equal(ok.value.consent_advanced, false, 'only the boolean true counts as consent');
    assert.equal(ok.value.text, words(30));
    assert.equal(validatePrecheckInput({ text: words(30), lang: 'en', consent_advanced: true }).value.consent_advanced, true);
  });

  test('every error key exists in vi and en', async () => {
    const { validatePrecheckInput } = await input();
    const errors = { ...validatePrecheckInput({ text: 'x', lang: 'xx', flags: { military: 'maybe' } }).errors };
    assert.ok(Object.keys(errors).length >= 3);
    for (const k of Object.values(errors)) { assert.equal(typeof vi[k], 'string', k); assert.equal(typeof en[k], 'string', k); }
  });
});
