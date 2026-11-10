import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../lib/db/client.js';

// Licensing timeline (T054, M2 BR-006, FR-017, FR-018, US-4 Scenario 1, decisions D1, D8): buffer in calendar days,
// the two 20-day periods in working days; field names never say *safe*.
const timeline = () => import('../../lib/licensing/timeline.js');
const wd = () => import('../../lib/dates/working-days.js');

function seed(table) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f));
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const project = (name) => seed('project').find(p => p.project_name === name);
const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
async function holidays() { return (await wd()).holidaySet(seed('public_holiday')); }

describe('Licensing timeline (T054)', () => {
  test('US-4 Sc1: The Last Ferry (15/03/2027, buffer 7) → recommended 05/01/2027, latest 02/02/2027, both paths', async () => {
    const { licensingTimeline } = await timeline();
    const p = project('The Last Ferry');
    assert.equal(p.shoot_date, '2027-03-15');
    assert.equal(p.buffer_days, '7');
    const t = licensingTimeline({ shoot_date: p.shoot_date, buffer_days: Number(p.buffer_days), segment: p.segment }, await holidays(), '2026-11-09');
    assert.equal(t.applies, true);
    assert.equal(t.buffer_start, '2027-03-08');
    assert.equal(t.latest, '2027-02-02');
    assert.equal(t.recommended, '2027-01-05');
    assert.deepEqual(t.smooth, { submit: '2027-01-05', result_by: '2027-02-01' });
    assert.deepEqual(t.resubmission, { submit: '2027-01-05', result_by_worst: '2027-03-05' });
    assert.equal(t.days_to_recommended, dayDiff('2027-01-05', '2026-11-09'));
    assert.equal(t.days_to_latest, dayDiff('2027-02-02', '2026-11-09'));
    assert.equal(t.recommended_passed, false);
  });

  test('M5 US-3: filing on the latest date with one resubmission gives a result after the shooting day', async () => {
    const { licensingTimeline } = await timeline();
    const t = licensingTimeline({ shoot_date: '2027-03-15', buffer_days: 7, segment: 'A' }, await holidays(), '2026-11-09', { submit: '2027-02-02' });
    assert.equal(t.resubmission.result_by_worst, '2027-04-02');
    assert.ok(t.resubmission.result_by_worst > '2027-03-15');
  });

  test('holidays inside the processing window are listed with expected; those outside are not', async () => {
    const { licensingTimeline } = await timeline();
    const t = licensingTimeline({ shoot_date: '2027-03-15', buffer_days: 7, segment: 'A' }, await holidays(), '2026-11-09');
    const tet = t.holidays.find(h => h.start_date === '2027-02-05');
    assert.ok(tet, 'Tết 2027 inside 05/01–05/03/2027');
    assert.equal(tet.expected, true);
    assert.equal(t.holidays.some(h => h.start_date === '2027-04-16'), false, 'Giỗ Tổ 2027 is after the window');
  });

  test('a longer buffer moves both dates earlier (D1: calendar days)', async () => {
    const { licensingTimeline } = await timeline();
    const h = await holidays();
    const a = licensingTimeline({ shoot_date: '2027-03-15', buffer_days: 7, segment: 'A' }, h, '2026-11-09');
    const b = licensingTimeline({ shoot_date: '2027-03-15', buffer_days: 14, segment: 'A' }, h, '2026-11-09');
    assert.equal(b.buffer_start, '2027-03-01');
    assert.ok(b.latest < a.latest && b.recommended < a.recommended);
  });

  test('Quiet Harbour Blues (10/11/2026): the recommended date has passed — bad news is never hidden', async () => {
    const { licensingTimeline } = await timeline();
    const p = project('Quiet Harbour Blues');
    const t = licensingTimeline({ shoot_date: p.shoot_date, buffer_days: Number(p.buffer_days), segment: p.segment }, await holidays(), '2026-11-07');
    assert.equal(t.recommended, '2026-09-08');
    assert.equal(t.latest, '2026-10-06');
    assert.equal(t.recommended_passed, true);
    assert.equal(t.days_to_recommended, dayDiff('2026-09-08', '2026-11-07'));
  });

  test('segment C or no first shooting day → no countdown', async () => {
    const { licensingTimeline } = await timeline();
    const h = await holidays();
    assert.equal(licensingTimeline({ shoot_date: '2027-03-15', buffer_days: 7, segment: 'C' }, h, '2026-11-09').applies, false);
    const empty = licensingTimeline({ shoot_date: null, buffer_days: 7, segment: 'A' }, h, '2026-11-09');
    assert.equal(empty.applies, true);
    assert.equal(empty.recommended ?? null, null);
    assert.equal(empty.latest ?? null, null);
  });

  test('D8: no field of the result is named *safe*', async () => {
    const { licensingTimeline } = await timeline();
    const t = licensingTimeline({ shoot_date: '2027-03-15', buffer_days: 7, segment: 'A' }, await holidays(), '2026-11-09');
    assert.doesNotMatch(JSON.stringify(Object.keys(t)), /safe/i);
  });
});
