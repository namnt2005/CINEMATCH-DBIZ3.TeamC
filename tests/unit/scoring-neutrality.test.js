import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCriterion } from '../../lib/scoring/engine.js';

describe('Missing Data Neutrality (BR-003)', () => {
  test('missing or null location attribute neither adds bonus nor applies negative penalty', () => {
    const queryValue = ['karst'];
    
    // Explicit mismatch vs Missing data
    const explicitMismatch = scoreCriterion('scene_types', ['sea'], queryValue);
    const missingData = scoreCriterion('scene_types', null, queryValue);
    const perfectMatch = scoreCriterion('scene_types', ['karst'], queryValue);

    assert.equal(missingData.isNeutral, true, 'Missing data must be marked neutral');
    assert.equal(missingData.penalty, 0, 'Missing data must have zero penalty');
    assert.ok(missingData.score > explicitMismatch.score, 'Missing data should score higher than explicit mismatch');
    assert.ok(missingData.score < perfectMatch.score, 'Missing data should not get full match bonus');
  });

  test('records missing data explanation instead of penalty in match reasons', () => {
    const missingData = scoreCriterion('months_to_avoid', null, 7);
    assert.ok(missingData.note.includes('No data yet') || missingData.isNeutral);
  });
});
