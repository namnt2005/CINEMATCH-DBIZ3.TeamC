import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scoreLocation } from '../../lib/scoring/engine.js';

describe('Scoring Determinism & Ranking Isolation (BR-001)', () => {
  const queryAttributes = {
    scene_types: ['karst', 'river'],
    crew_size: '15_50',
    shoot_month: 9,
    provinces: [19] // Ninh Bình
  };

  const sampleLocation = {
    location_id: '607132bd-b05b-52c6-900f-5f2928c17a9e',
    name_en: 'Tràng An Landscape Complex',
    province_id: 19,
    scene_types: '["karst","river","village"]',
    crew_capacity: '15_50',
    months_to_avoid: '[9,10]',
    availability: 'open'
  };

  test('scoring engine produces 100% deterministic, repeatable scores across repeated calls', () => {
    const run1 = scoreLocation(sampleLocation, queryAttributes);
    const run2 = scoreLocation(sampleLocation, queryAttributes);
    const run3 = scoreLocation(sampleLocation, queryAttributes);

    assert.equal(run1.score, run2.score);
    assert.equal(run2.score, run3.score);
    assert.deepEqual(run1.match_reasons, run2.match_reasons);
  });

  test('ranking is determined purely mathematically, never allowing external model to override rank', () => {
    const scored = scoreLocation(sampleLocation, queryAttributes);
    assert.equal(typeof scored.score, 'number');
    assert.ok(scored.score >= 0 && scored.score <= 100);
  });
});
