import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Attention level (T024, M2 BR-004, Clarifications Q4): High = 2 or more action findings; Medium = 1 action finding or
// 3 or more notice findings; otherwise Low. Computed from verified findings by code, never from a model score.
const attention = () => import('../../lib/content-check/attention.js');
const findings = (action, notice) => [...Array(action).fill({ severity: 'action' }), ...Array(notice).fill({ severity: 'notice' })];

describe('Attention level (T024)', () => {
  const cases = [[0, 0, 'low'], [0, 1, 'low'], [0, 2, 'low'], [0, 3, 'medium'], [0, 7, 'medium'], [1, 0, 'medium'], [1, 5, 'medium'],
    [2, 0, 'high'], [3, 4, 'high']];
  for (const [action, notice, level] of cases) {
    test(`Q4: ${action} action + ${notice} notice → ${level}`, async () => {
      const { attentionLevel } = await attention();
      assert.equal(attentionLevel(findings(action, notice)), level);
    });
  }

  test('BR-004: a model score or confidence on a finding changes nothing', async () => {
    const { attentionLevel } = await attention();
    const scored = [{ severity: 'notice', score: 0.99, confidence: 1 }, { severity: 'notice', score: 0.98 }];
    assert.equal(attentionLevel(scored), 'low');
    assert.equal(attentionLevel([{ severity: 'action', score: 0.01 }]), 'medium');
  });

  test('only the three levels exist — never a number', async () => {
    const { attentionLevel, LEVELS } = await attention();
    assert.deepEqual([...LEVELS], ['low', 'medium', 'high']);
    for (let a = 0; a < 4; a++) for (let n = 0; n < 5; n++) assert.ok(LEVELS.includes(attentionLevel(findings(a, n))));
  });
});
