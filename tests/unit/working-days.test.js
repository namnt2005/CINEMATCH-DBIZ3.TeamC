import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../lib/db/client.js';

// Working days (T005, M2 BR-006, Clarifications Q1, SC-29 SR-173): weekends and every public_holiday date are skipped.
// The expected dates are computed here from the seed public_holiday file (found by table name), not typed from the spec.
const days = () => import('../../lib/dates/working-days.js');

function seed(table) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f));
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const HOLIDAYS = seed('public_holiday');
const iso = (d) => d.toISOString().slice(0, 10);
const shift = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const off = new Set(HOLIDAYS.flatMap(h => { const out = []; for (let d = h.start_date; d <= h.end_date; d = shift(d, 1)) out.push(d); return out; }));
const working = (s) => ![0, 6].includes(new Date(`${s}T00:00:00Z`).getUTCDay()) && !off.has(s);
// Oracle written in the test: step back from `date` (not counted) to the n-th working day
function oracleBefore(date, n) { let d = date; while (n > 0) { d = shift(d, -1); if (working(d)) n--; } return d; }
// The n-th working day counting `date` as day 1 when it is a working day
function oracleAfter(date, n) { let d = date; let c = 0; for (;;) { if (working(d) && ++c === n) return d; d = shift(d, 1); } }

describe('Working days (T005)', () => {
  test('the seed holds Tết 2027 (05–10/02/2027), marked expected', () => {
    const tet = HOLIDAYS.find(h => h.start_date === '2027-02-05');
    assert.ok(tet, 'Tết 2027 in public_holiday');
    assert.equal(tet.end_date, '2027-02-10');
    assert.equal(tet.is_expected, 'true');
  });

  test('holidaySet expands every holiday range and keeps is_expected', async () => {
    const { holidaySet } = await days();
    const set = holidaySet(HOLIDAYS);
    for (const d of ['2027-02-05', '2027-02-08', '2027-02-10', '2027-04-30', '2027-05-01']) assert.ok(set.has(d), d);
    assert.equal(set.has('2027-02-11'), false);
    assert.equal(set.get('2027-02-08').expected, true, 'Tết 2027 is expected');
    assert.equal(set.get('2027-01-01').expected, false, 'Tết Dương lịch 2027 is official');
  });

  test('isWorkingDay: false on Saturday, Sunday and every holiday date; true on an ordinary weekday', async () => {
    const { holidaySet, isWorkingDay } = await days();
    const set = holidaySet(HOLIDAYS);
    assert.equal(isWorkingDay('2027-02-06', set), false, 'Saturday');
    assert.equal(isWorkingDay('2027-02-07', set), false, 'Sunday');
    for (const d of ['2027-02-05', '2027-02-08', '2027-02-09', '2027-02-10']) assert.equal(isWorkingDay(d, set), false, `Tết weekday ${d}`);
    assert.equal(isWorkingDay('2027-02-11', set), true);
  });

  test('BR-006 / US-4 Sc1: shooting 15/03/2027, buffer 7 calendar days → latest 02/02/2027, recommended 05/01/2027', async () => {
    const { holidaySet, workingDaysBefore } = await days();
    const set = holidaySet(HOLIDAYS);
    const bufferStart = shift('2027-03-15', -7);
    assert.equal(bufferStart, '2027-03-08');
    const latest = workingDaysBefore(bufferStart, 20, set);
    assert.equal(latest, oracleBefore(bufferStart, 20));
    assert.equal(latest, '2027-02-02', 'Tết 2027 skipped');
    const recommended = workingDaysBefore(latest, 20, set);
    assert.equal(recommended, oracleBefore(latest, 20));
    assert.equal(recommended, '2027-01-05', 'Tết Dương lịch 2027 skipped');
    // [latest, buffer start) holds exactly 20 working days
    let n = 0; for (let d = latest; d < bufferStart; d = shift(d, 1)) if (working(d)) n++;
    assert.equal(n, 20);
  });

  test('without the holidays the same count would land later — the table is really used', async () => {
    const { workingDaysBefore } = await days();
    assert.notEqual(workingDaysBefore('2027-03-08', 20, new Map()), '2027-02-02');
  });

  test('workingDaysAfter counts the submission day as day 1 (both paths of FR-018)', async () => {
    const { holidaySet, workingDaysAfter } = await days();
    const set = holidaySet(HOLIDAYS);
    assert.equal(workingDaysAfter('2027-01-05', 20, set), oracleAfter('2027-01-05', 20));
    assert.equal(workingDaysAfter('2027-01-05', 40, set), '2027-03-05', 'one resubmission from the recommended date ends before 08/03');
    assert.equal(workingDaysAfter('2027-02-02', 40, set), '2027-04-02', 'one resubmission from the latest date ends after the shooting day');
    assert.equal(workingDaysAfter('2027-02-06', 1, set), '2027-02-11', 'a Saturday in Tết starts on the next working day');
  });

  test('dates in and out are YYYY-MM-DD strings, independent of the time zone', async () => {
    const { holidaySet, workingDaysBefore } = await days();
    const set = holidaySet(HOLIDAYS);
    const saved = process.env.TZ;
    for (const tz of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
      process.env.TZ = tz;
      assert.equal(workingDaysBefore('2027-03-08', 20, set), '2027-02-02', tz);
    }
    if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;
  });
});
