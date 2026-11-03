import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const load = () => import('../../lib/router/answers.js');
const vi = JSON.parse(fs.readFileSync('lib/i18n/vi.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('lib/i18n/en.json', 'utf8'));

describe('Router answers (T003, FR-002 §5.1, data-model §2)', () => {
  test('FR-002: Yes / abroad / foreign with needs is valid and kept as given', async () => {
    const { validateAnswers } = await load();
    const r = validateAnswers({ q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', q4_needs: ['locations', 'crew'] });
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.deepEqual(r.value, { q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', q4_needs: ['locations', 'crew'] });
  });

  test('FR-002: No needs neither question 2 nor 3; question 4 may be empty or left out', async () => {
    const { validateAnswers } = await load();
    const r = validateAnswers({ q1_shoot_in_vn: false });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { q1_shoot_in_vn: false, q2_release: null, q3_producer: null, q4_needs: [] });
  });

  test('FR-002: questions 2 and 3 are required when the answer to question 1 is Yes', async () => {
    const { validateAnswers } = await load();
    const r = validateAnswers({ q1_shoot_in_vn: true });
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), ['q2_release', 'q3_producer']);
  });

  test('FR-002: questions 2 and 3 are refused when the answer to question 1 is No (they are not asked)', async () => {
    const { validateAnswers } = await load();
    const r = validateAnswers({ q1_shoot_in_vn: false, q2_release: 'abroad', q3_producer: 'foreign' });
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), ['q2_release', 'q3_producer']);
  });

  test('FR-002: only the listed values are accepted', async () => {
    const { validateAnswers } = await load();
    const r = validateAnswers({ q1_shoot_in_vn: 'yes', q2_release: 'asia', q3_producer: 'studio', q4_needs: ['drones'] });
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), ['q1_shoot_in_vn', 'q2_release', 'q3_producer', 'q4_needs']);
    assert.equal(validateAnswers({ q1_shoot_in_vn: false, q4_needs: ['crew', 'crew'] }).ok, false, 'no repeats in question 4');
    assert.equal(validateAnswers({ q1_shoot_in_vn: false, q4_needs: 'crew' }).ok, false, 'question 4 is a list');
  });

  test('BR-001: a segment sent with the answers is never taken as an answer', async () => {
    const { validateAnswers } = await load();
    const r = validateAnswers({ q1_shoot_in_vn: false, segment: 'A', segment_override: 'B' });
    assert.equal(r.ok, true);
    assert.ok(!('segment' in r.value) && !('segment_override' in r.value));
  });

  test('BR-003: an override is one of A, B, C', async () => {
    const { validateOverride } = await load();
    for (const s of ['A', 'B', 'C']) assert.deepEqual(validateOverride({ segment_override: s }), { ok: true, errors: {}, value: { segment_override: s } });
    for (const s of ['D', 'a', '', null, undefined]) assert.equal(validateOverride({ segment_override: s }).ok, false, String(s));
  });

  test('SYS FR-006: every error is a dictionary key present in vi.json and en.json', async () => {
    const { validateAnswers, validateOverride } = await load();
    const errors = [
      ...Object.values(validateAnswers({ q1_shoot_in_vn: 'x', q2_release: 'x', q3_producer: 'x', q4_needs: ['x'] }).errors),
      ...Object.values(validateAnswers({ q1_shoot_in_vn: true }).errors),
      ...Object.values(validateAnswers({ q1_shoot_in_vn: false, q2_release: 'abroad' }).errors),
      ...Object.values(validateOverride({ segment_override: 'D' }).errors)
    ];
    for (const key of errors) assert.ok(key in vi && key in en, key);
  });
});
