import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// Create-project input (FR-001, SC-10 #9–#15, specs/005-m0-workspace research R7). Pure: API and SC-10 panel.
const load = () => import('../../lib/projects/input.js');
const TODAY = '2026-11-03';
const PROVINCES = Array.from({ length: 34 }, (_, i) => i + 1);
const OK = { project_name: '  The Night Ferry  ', format: 'feature', segment: 'A' };
const check = async (input) => (await load()).validateProjectInput(input, { today: TODAY, provinceIds: PROVINCES });

describe('validateProjectInput (T013, FR-001, research R7)', () => {
  test('FR-001: name, format and segment are enough; the name is trimmed; optional fields are empty', async () => {
    const r = await check(OK);
    assert.equal(r.ok, true);
    assert.deepEqual(r.errors, {});
    assert.deepEqual(r.value, { project_name: 'The Night Ferry', format: 'feature', segment: 'A', shoot_date: null, shoot_days_vn: null, crew_size_band: null, provinces: [], logline: null });
  });

  test('FR-001: the three required fields missing give three errors at once', async () => {
    const r = await check({});
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), ['format', 'project_name', 'segment']);
  });

  test('FR-001: name 1–200 characters after trimming', async () => {
    assert.equal((await check({ ...OK, project_name: '   ' })).errors.project_name, 'projects.error.name_required');
    assert.equal((await check({ ...OK, project_name: 'x'.repeat(201) })).errors.project_name, 'projects.error.name_long');
    assert.equal((await check({ ...OK, project_name: 'x'.repeat(200) })).ok, true);
  });

  test('FR-001: format and segment come from their enums', async () => {
    for (const format of ['feature', 'documentary', 'commercial', 'tv', 'music_video']) assert.equal((await check({ ...OK, format })).ok, true, format);
    assert.equal((await check({ ...OK, format: 'series' })).errors.format, 'projects.error.format_invalid');
    assert.equal((await check({ ...OK, segment: 'D' })).errors.segment, 'projects.error.segment_invalid');
  });

  test('FR-002, SC-10 #12: the first shooting day must be after today', async () => {
    assert.equal((await check({ ...OK, shoot_date: '2026-11-04' })).value.shoot_date, '2026-11-04');
    assert.equal((await check({ ...OK, shoot_date: TODAY })).errors.shoot_date, 'projects.error.shoot_date_past');
    assert.equal((await check({ ...OK, shoot_date: '2026-02-30' })).errors.shoot_date, 'projects.error.shoot_date_invalid');
  });

  test('SC-10 #13, #14: shoot days an integer 1–365; crew band from its enum', async () => {
    assert.equal((await check({ ...OK, shoot_days_vn: '24' })).value.shoot_days_vn, 24);
    for (const bad of [0, 366, 2.5, 'abc']) assert.equal((await check({ ...OK, shoot_days_vn: bad })).errors.shoot_days_vn, 'projects.error.shoot_days_invalid', String(bad));
    assert.equal((await check({ ...OK, crew_size_band: '15_50' })).value.crew_size_band, '15_50');
    assert.equal((await check({ ...OK, crew_size_band: 'huge' })).errors.crew_size_band, 'projects.error.crew_invalid');
  });

  test('SC-10 #15: provinces only among the 34 ids, without repeats', async () => {
    assert.deepEqual((await check({ ...OK, provinces: [5, '1'] })).value.provinces, [1, 5]);
    assert.equal((await check({ ...OK, provinces: [35] })).errors.provinces, 'projects.error.provinces_invalid');
    assert.equal((await check({ ...OK, provinces: [1, 1] })).errors.provinces, 'projects.error.provinces_invalid');
  });

  test('FR-001: logline at most 500 characters', async () => {
    assert.equal((await check({ ...OK, logline: 'x'.repeat(501) })).errors.logline, 'projects.error.logline_long');
    assert.equal((await check({ ...OK, logline: '  A ferry.  ' })).value.logline, 'A ferry.');
  });

  test('FR-006 of SYS: every error is a dictionary key present in vi.json and en.json', async () => {
    const r = await check({ project_name: 'x'.repeat(201), format: 'x', segment: 'x', shoot_date: '2020-01-01', shoot_days_vn: 0, crew_size_band: 'x', provinces: [99], logline: 'x'.repeat(501) });
    assert.equal(Object.keys(r.errors).length, 8);
    for (const key of Object.values(r.errors)) assert.ok(vi[key] && en[key], key);
  });
});
