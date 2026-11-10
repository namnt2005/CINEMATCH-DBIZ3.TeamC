import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-29 view rules (T057; SC-29 #5–#12, SR-171..SR-175; decisions D8, D13).
const view = () => import('../../lib/licensing/view.js');
const T = { applies: true, shoot_date: '2027-03-15', buffer_days: 7, buffer_start: '2027-03-08', recommended: '2027-01-05', latest: '2027-02-02',
  today: '2026-11-10', days_to_recommended: 56, days_to_latest: 84, recommended_passed: false,
  smooth: { submit: '2027-01-05', result_by: '2027-02-01' }, resubmission: { submit: '2027-01-05', result_by_worst: '2027-03-05' },
  holidays: [{ name: 'Tết Nguyên đán 2027', start_date: '2027-02-05', end_date: '2027-02-10', expected: true }],
  milestones: [{ key: 'partner_confirmed', state: 'open' }, { key: 'vietnamese_done', state: 'done', date: '2026-12-20' }] };

describe('SC-29 view rules (T057)', () => {
  test('SR-171: the recommended-date card comes first, with its days; D8 wording in both languages', async () => {
    const { recommendedCard } = await view();
    assert.deepEqual(recommendedCard(T), { titleKey: 'timeline.recommended.title', date: '2027-01-05', days: 56, passed: false, lineKey: 'timeline.recommended.days' });
    assert.equal(vi['timeline.recommended.title'], 'Hạn nộp khuyến nghị (có dự phòng)');
    assert.equal(en['timeline.recommended.title'], 'Recommended submission date');
  });

  test('SR-172: a passed recommended date says by how many days and offers the consultation', async () => {
    const { recommendedCard } = await view();
    const c = recommendedCard({ ...T, recommended: '2026-09-08', days_to_recommended: -63, recommended_passed: true });
    assert.equal(c.passed, true);
    assert.equal(c.lineKey, 'timeline.recommended.passed');
    assert.equal(c.days, 63);
  });

  test('the table alternative lists milestone – date – days remaining, in date order, with every key in both languages', async () => {
    const { timelineRows } = await view();
    const rows = timelineRows(T);
    assert.deepEqual(rows.map(r => r.key), ['vietnamese_done', 'recommended', 'latest', 'buffer_start', 'shoot']);
    for (const r of rows) { assert.equal(typeof vi[`timeline.milestone.${r.key}`], 'string', r.key); assert.equal(typeof en[`timeline.milestone.${r.key}`], 'string', r.key); }
    assert.equal(rows.find(r => r.key === 'recommended').days, 56);
    const open = rows.filter(r => !r.date).map(r => r.key);
    assert.deepEqual(open, [], 'an open milestone without a date is listed apart');
  });

  test('R5: milestones without a target date show their state', async () => {
    const { milestoneStates } = await view();
    assert.deepEqual(milestoneStates(T), [{ key: 'partner_confirmed', stateKey: 'timeline.state.open', date: null }, { key: 'vietnamese_done', stateKey: 'timeline.state.done', date: '2026-12-20' }]);
  });

  test('SR-174: the holiday band shows only holidays in the window, marked expected', async () => {
    const { holidayBands } = await view();
    assert.deepEqual(holidayBands(T), [{ name: 'Tết Nguyên đán 2027', from: '2027-02-05', to: '2027-02-10', expectedKey: 'timeline.holiday.expected' }]);
  });

  test('SR-175: the basis line says working days; no deadline text uses safe / an toàn', () => {
    assert.match(en['timeline.basis'], /working days/i);
    assert.match(vi['timeline.basis'], /ngày làm việc/i);
    for (const [dict, re] of [[en, /\bsafe\b/i], [vi, /an toàn/i]]) for (const k of Object.keys(dict).filter(k => k.startsWith('timeline.'))) assert.doesNotMatch(dict[k], re, k);
  });
});
