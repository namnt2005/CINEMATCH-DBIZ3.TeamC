import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadSeasonFacts = () => import('../../lib/locations/season-facts.js');

describe('Season and night-shooting labels (T045, BR-003, SR-113, Clarifications Q3)', () => {
  test('T045: night_shooting_allowed yes / no / ask map to their labels', async () => {
    const { nightShootingLabel } = await loadSeasonFacts();
    assert.equal(nightShootingLabel('yes'), 'Night shooting allowed');
    assert.equal(nightShootingLabel('no'), 'Not allowed');
    assert.equal(nightShootingLabel('ask'), 'Ask the local authority');
  });

  test('BR-003: missing night_shooting_allowed reads "No data yet", never "Not allowed"', async () => {
    const { nightShootingLabel } = await loadSeasonFacts();
    for (const missing of [null, undefined, '']) {
      assert.equal(nightShootingLabel(missing), 'No data yet');
    }
  });

  test('T045: rainy_months lists month names in order, from an array or the stored JSON text', async () => {
    const { rainyMonthsLabel } = await loadSeasonFacts();
    assert.equal(rainyMonthsLabel([6, 7, 8]), 'Jun, Jul, Aug');
    assert.equal(rainyMonthsLabel('[6,7,8]'), 'Jun, Jul, Aug');
    assert.equal(rainyMonthsLabel([10, 5]), 'May, Oct');
  });

  test('BR-003: [] means no rainy month recorded, null means no data yet', async () => {
    const { rainyMonthsLabel } = await loadSeasonFacts();
    assert.equal(rainyMonthsLabel([]), 'No rainy months recorded');
    assert.equal(rainyMonthsLabel('[]'), 'No rainy months recorded');
    for (const missing of [null, undefined, '']) {
      assert.equal(rainyMonthsLabel(missing), 'No data yet');
    }
  });
});
