import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vi = JSON.parse(fs.readFileSync('lib/i18n/vi.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('lib/i18n/en.json', 'utf8'));
const inBoth = (key) => key in vi && key in en;

describe('Codes the screens translate (T046, FR-006)', () => {
  test('SC-14: every match reason has a code with a dictionary key, one per reason', async () => {
    const { scoreLocation } = await import('../../lib/scoring/engine.js');
    const result = scoreLocation(
      { location_id: 'x', scene_types: ['karst', 'river'], crew_capacity: 'o50', lodging_20km: true, grid_power: true, permit_complexity: 'low', availability: 'open', rainy_months: [7], months_to_avoid: [] },
      { scene_types: ['karst'], shoot_month: 3, crew_size: '15_50' }
    );
    assert.equal(result.match_reason_codes.length, result.match_reasons.length);
    for (const { key, vars } of result.match_reason_codes) {
      assert.ok(inBoth(key), key);
      assert.equal(typeof (vars ?? {}), 'object');
    }
    const rainy = scoreLocation({ location_id: 'y', rainy_months: [7], availability: 'survey_in_progress' }, { shoot_month: 7 });
    assert.ok(rainy.match_reason_codes.every(c => inBoth(c.key)));
  });

  test('SC-35: every field error of the location form has a code with a dictionary key', async () => {
    const { validateLocationInput, validateContactInput } = await import('../../lib/admin/location-input.js');
    const bad = validateLocationInput({ lat: 50, lng: 'x', scene_types: [], months_to_avoid: [13], crew_capacity: 'huge', lodging_20km: 'maybe' }, { provinceIds: [1] });
    assert.equal(bad.ok, false);
    assert.deepEqual(Object.keys(bad.codes).sort(), Object.keys(bad.errors).sort());
    for (const { key } of Object.values(bad.codes)) assert.ok(inBoth(key), key);
    const contact = validateContactInput({ contact_phone: 'x'.repeat(30), contact_email: 5 });
    for (const { key } of Object.values(contact.codes)) assert.ok(inBoth(key), key);
  });

  test('SC-35: a 422 from the admin API carries the codes next to the English messages', async () => {
    const { ValidationError } = await import('../../lib/admin/errors.js');
    const err = new ValidationError({ lat: 'Latitude must be between 8 and 24.' }, { lat: { key: 'admin.error.range', vars: { min: 8, max: 24 } } });
    assert.deepEqual(err.extra.field_codes, { lat: { key: 'admin.error.range', vars: { min: 8, max: 24 } } });
    assert.ok(err.extra.fields.lat);
  });
});
