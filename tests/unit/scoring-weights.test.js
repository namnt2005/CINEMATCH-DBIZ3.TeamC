import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { WEIGHTS, scoreLocation, filterAndRankResults } from '../../lib/scoring/engine.js';

// spec-M3.md Clarifications Q1 (28/10/2026): scene fit 35, season 15, crew 15, logistics 15, permit 10, availability 10
describe('Scoring weights follow spec-M3 Clarifications Q1 (F-M3-08)', () => {
  test('the six weights are the decided values and add up to 100', () => {
    assert.deepEqual({ ...WEIGHTS }, { scene_fit: 35, season: 15, crew: 15, logistics: 15, permit: 10, availability: 10 });
    assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 100);
  });

  test('a location that fits every criterion scores exactly 100', () => {
    const loc = { location_id: 'x', province_id: 19, scene_types: '["karst"]', crew_capacity: 'o50', months_to_avoid: '[]',
      rainy_months: '[]', lodging_20km: 'true', grid_power: 'true', truck_access: 'true', airport_km: 90,
      permit_complexity: 'low', availability: 'open' };
    const r = scoreLocation(loc, { scene_types: ['karst'], crew_size: '15_50', shoot_month: 3 });
    assert.equal(r.score, 100);
  });

  test('scene fit outweighs any other single criterion', () => {
    const base = { location_id: 'y', crew_capacity: 'u15', months_to_avoid: '[]', permit_complexity: 'high', availability: 'open' };
    const fits = scoreLocation({ ...base, scene_types: '["cave"]' }, { scene_types: ['cave'], crew_size: 'o50' });
    const misses = scoreLocation({ ...base, scene_types: '["sea"]', crew_capacity: 'o50', permit_complexity: 'low' }, { scene_types: ['cave'], crew_size: 'o50' });
    assert.ok(fits.score > misses.score);
  });

  test('a rainy shooting month gets half the season points (BR-003 style partial credit)', () => {
    const loc = { location_id: 'z', scene_types: '["river"]', months_to_avoid: '[]', rainy_months: '[9,10]' };
    const rainy = scoreLocation(loc, { shoot_month: 9 });
    const dry = scoreLocation(loc, { shoot_month: 3 });
    assert.equal(dry.parts.season - rainy.parts.season, WEIGHTS.season - Math.round(WEIGHTS.season / 2));
  });

  test('province is a filter: a location outside the requested provinces is never shown (F-M3-07)', () => {
    const loc = { location_id: 'p', province_id: 1, scene_types: '["karst"]', availability: 'open', permit_complexity: 'low' };
    const r = scoreLocation(loc, { scene_types: ['karst'], provinces: [19] });
    assert.equal(r.excluded, true);
    assert.equal(filterAndRankResults([r]).length, 0);
  });
});
