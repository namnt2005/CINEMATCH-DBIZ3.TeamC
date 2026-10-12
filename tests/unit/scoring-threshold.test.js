import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { filterAndRankResults } from '../../lib/scoring/engine.js';

describe('Scoring Threshold & Match Reasons (BR-002, SC-002)', () => {
  const scoredLocations = [
    { location_id: 'loc-1', score: 85, match_reasons: ['Matches scene types: karst, river'] },
    { location_id: 'loc-2', score: 40, match_reasons: ['Matches shooting month'] },
    { location_id: 'loc-3', score: 39, match_reasons: ['Matches province'] },
    { location_id: 'loc-4', score: 60, match_reasons: [] } // Has score >= 40 but NO match reason
  ];

  test('filters out any location with score < 40', () => {
    const results = filterAndRankResults(scoredLocations);
    const hasUnder40 = results.some(r => r.score < 40);
    assert.equal(hasUnder40, false, 'Locations with score < 40 must be hidden');
  });

  test('filters out any location that lacks at least one match reason (SC-002)', () => {
    const results = filterAndRankResults(scoredLocations);
    const allHaveReasons = results.every(r => Array.isArray(r.match_reasons) && r.match_reasons.length >= 1);
    assert.equal(allHaveReasons, true, 'Every displayed result must have >= 1 match reason');
    assert.equal(results.some(r => r.location_id === 'loc-4'), false, 'Result with empty reasons must be excluded');
  });

  test('ranks surviving locations in descending order of score', () => {
    const results = filterAndRankResults(scoredLocations);
    assert.equal(results[0].location_id, 'loc-1');
    assert.equal(results[1].location_id, 'loc-2');
  });
});
