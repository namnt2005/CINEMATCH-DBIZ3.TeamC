import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { serializeFilterState, deserializeFilterState } from '../../app/locations/use-filter-state.js';

describe('Filter State URL Serialization & Deserialization (F-M3-07)', () => {
  const filterObject = {
    scene_types: ['karst', 'river'],
    provinces: [19],
    region: 'north',
    crew_size: '15_50',
    shoot_month: 9
  };

  test('serializes filter state object into canonical URL query string', () => {
    const queryString = serializeFilterState(filterObject);
    assert.ok(queryString.includes('scene_types=karst%2Criver') || queryString.includes('scene_types=karst,river'));
    assert.ok(queryString.includes('crew_size=15_50'));
    assert.ok(queryString.includes('shoot_month=9'));
  });

  test('deserializes URL query string back into typed filter object', () => {
    const queryString = '?scene_types=karst,river&crew_size=15_50&shoot_month=9&provinces=19';
    const parsed = deserializeFilterState(queryString);

    assert.deepEqual(parsed.scene_types, ['karst', 'river']);
    assert.equal(parsed.crew_size, '15_50');
    assert.equal(parsed.shoot_month, 9);
    assert.deepEqual(parsed.provinces, [19]);
  });
});
