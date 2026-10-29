import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validLocationBody, VALID_CONTACT } from '../contracts/admin-helpers.js';

const loadInput = () => import('../../lib/admin/location-input.js');

const REQUIRED = [
  'name_vi', 'name_en', 'province_id', 'lat', 'lng', 'scene_types', 'desc_vi', 'desc_en',
  'crew_capacity', 'lodging_20km', 'grid_power', 'truck_access', 'permit_complexity', 'availability'
];

describe('Location and contact input validation (T008, FR-002, FR-004, Clarifications Q3)', () => {
  test('FR-002: the 20-field example is valid', async () => {
    const { validateLocationInput } = await loadInput();
    const result = validateLocationInput(validLocationBody());
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, {});
  });

  test('FR-002: a body missing the required fields names every one of them at once, with a readable message', async () => {
    const { validateLocationInput } = await loadInput();
    const result = validateLocationInput({});

    assert.equal(result.ok, false);
    for (const field of REQUIRED) {
      assert.equal(typeof result.errors[field], 'string', `${field} is reported`);
      assert.ok(result.errors[field].length > 0, `${field} has a message`);
    }
  });

  test('FR-002: optional fields may be left out (district, airport_km, months_to_avoid, restriction_note, night_shooting_allowed, rainy_months)', async () => {
    const { validateLocationInput } = await loadInput();
    const body = validLocationBody();
    for (const field of ['district', 'airport_km', 'months_to_avoid', 'restriction_note', 'night_shooting_allowed', 'rainy_months']) {
      delete body[field];
    }
    assert.equal(validateLocationInput(body).ok, true);
  });

  test('FR-002 / BR-006: lat 8–24 and lng 102–110 (inside Vietnam), province among the 34', async () => {
    const { validateLocationInput } = await loadInput();
    const result = validateLocationInput(validLocationBody({ lat: 30, lng: 101, province_id: 99 }));
    assert.ok(result.errors.lat);
    assert.ok(result.errors.lng);
    assert.ok(result.errors.province_id);
  });

  test('FR-002: enum fields accept only their values; scene types need at least one catalogue value', async () => {
    const { validateLocationInput } = await loadInput();
    const result = validateLocationInput(validLocationBody({
      scene_types: ['spaceship'],
      crew_capacity: 'big',
      permit_complexity: 'none',
      availability: 'closed',
      night_shooting_allowed: 'maybe'
    }));
    for (const field of ['scene_types', 'crew_capacity', 'permit_complexity', 'availability', 'night_shooting_allowed']) {
      assert.ok(result.errors[field], `${field} is reported`);
    }
    assert.ok(validateLocationInput(validLocationBody({ scene_types: [] })).errors.scene_types);
  });

  test('Clarifications Q3 / BR-003: month lists hold 1–12; [] (none recorded) is kept apart from missing (no data yet)', async () => {
    const { validateLocationInput } = await loadInput();
    const bad = validateLocationInput(validLocationBody({ months_to_avoid: [0, 13], rainy_months: [6, 'July'] }));
    assert.ok(bad.errors.months_to_avoid);
    assert.ok(bad.errors.rainy_months);

    const none = validateLocationInput(validLocationBody({ rainy_months: [] }));
    assert.equal(none.ok, true);
    assert.deepEqual(none.value.rainy_months, []);

    const body = validLocationBody();
    delete body.rainy_months;
    assert.equal(validateLocationInput(body).value.rainy_months, null);
  });

  test('FR-002: text limits — names ≤ 200, district ≤ 120; airport_km is an integer', async () => {
    const { validateLocationInput } = await loadInput();
    const result = validateLocationInput(validLocationBody({
      name_vi: 'x'.repeat(201),
      name_en: 'y'.repeat(201),
      district: 'z'.repeat(121),
      airport_km: 'far'
    }));
    for (const field of ['name_vi', 'name_en', 'district', 'airport_km']) {
      assert.ok(result.errors[field], `${field} is reported`);
    }
  });

  test('FR-002: booleans must be true or false, not missing or text', async () => {
    const { validateLocationInput } = await loadInput();
    const result = validateLocationInput(validLocationBody({ lodging_20km: 'yes', grid_power: null }));
    assert.ok(result.errors.lodging_20km);
    assert.ok(result.errors.grid_power);
  });

  test('FR-004: the contact needs office, person and phone; e-mail is optional but must be valid', async () => {
    const { validateContactInput } = await loadInput();
    assert.equal(validateContactInput(VALID_CONTACT).ok, true);

    const missing = validateContactInput({});
    for (const field of ['authority_name', 'contact_name', 'contact_phone']) {
      assert.ok(missing.errors[field], `${field} is reported`);
    }

    const bad = validateContactInput({ ...VALID_CONTACT, contact_phone: '1'.repeat(21), contact_email: 'not-an-email' });
    assert.ok(bad.errors.contact_phone);
    assert.ok(bad.errors.contact_email);
  });
});
