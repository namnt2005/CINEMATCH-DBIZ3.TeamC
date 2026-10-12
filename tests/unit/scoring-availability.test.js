import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAvailability } from '../../lib/scoring/engine.js';

describe('Availability Scoring Criterion & Retention (BR-010)', () => {
  test('evaluates availability criterion based on open, survey_in_progress, and paused states', () => {
    const openRes = scoreAvailability('open');
    const surveyRes = scoreAvailability('survey_in_progress');
    const pausedRes = scoreAvailability('paused');

    assert.ok(openRes.score > surveyRes.score, 'open should score higher than survey_in_progress');
    assert.ok(surveyRes.score > pausedRes.score, 'survey_in_progress should score higher than paused');
  });

  test('paused locations retain their published visibility flag with an explicit status label', () => {
    const pausedRes = scoreAvailability('paused');
    assert.equal(pausedRes.statusLabel, 'paused');
    assert.equal(pausedRes.keepPublished, true, 'Paused locations must stay published and visible');
    assert.ok(pausedRes.note.includes('paused'));
  });
});
