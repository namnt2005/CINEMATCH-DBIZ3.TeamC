import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Imported inside each test so every scenario reports its own failure until the helper exists.
const loadView = () => import('../../app/locations/match/match-view.js');

const extraction = (attributes = {}, meta = {}) => ({
  provider: 'mock',
  fallback: false,
  attributes: { scene_types: [], era: null, crowd_scale: null, shoot_month: null, time_of_day: [], ...attributes },
  ...meta
});

describe('SC-15 view helpers (F-M3-10, F-M3-11, BR-003)', () => {
  test('BR-003: the month field starts as "Bất kỳ tháng nào" (null), not a guessed month', async () => {
    const { DEFAULT_SHOOT_MONTH, monthOptions } = await loadView();
    assert.equal(DEFAULT_SHOOT_MONTH, null);

    const options = monthOptions();
    assert.deepEqual(options[0], { value: '', label: 'Bất kỳ tháng nào' });
    assert.equal(options.length, 13);
    assert.deepEqual(options[3], { value: '3', label: 'Tháng 3' });
  });

  test('BR-003: the month is preset only when the extractor returns shoot_month', async () => {
    const { monthFromExtraction } = await loadView();
    assert.equal(monthFromExtraction(extraction({ shoot_month: 3 })), 3);
    assert.equal(monthFromExtraction(extraction({ shoot_month: null })), null, 'A sentence without a month leaves the field empty');
    assert.equal(monthFromExtraction(extraction({})), null);
    assert.equal(monthFromExtraction(extraction({ shoot_month: 14 })), null, 'Out-of-range months are not preset');
    assert.equal(monthFromExtraction(null), null);
  });

  test('BR-003: choosing "Bất kỳ tháng nào" stores null', async () => {
    const { monthFromSelect } = await loadView();
    assert.equal(monthFromSelect(''), null);
    assert.equal(monthFromSelect('7'), 7);
  });

  test('BR-003: an empty month is left out of the SC-14 search link', async () => {
    const { searchQuery } = await loadView();
    const data = extraction({ scene_types: ['market', 'river'], crowd_scale: '15_50' });

    assert.equal(searchQuery(data, null), '?scene_types=market%2Criver&crew_size=15_50');
    assert.equal(searchQuery(data, 3), '?scene_types=market%2Criver&crew_size=15_50&shoot_month=3');
  });

  test('F-M3-11: crew size and time-of-day chips appear when the extractor returns them', async () => {
    const { extractionChips } = await loadView();
    const chips = extractionChips(extraction({
      scene_types: ['market'],
      era: 'contemporary',
      crowd_scale: '15_50',
      time_of_day: ['dawn', 'night']
    }));

    assert.deepEqual(chips.map(c => c.kind), ['scene', 'era', 'crew', 'time', 'time']);
    assert.equal(chips.find(c => c.kind === 'crew').label, 'Crew: 15–50');
    assert.deepEqual(chips.filter(c => c.kind === 'time').map(c => c.label), ['Time: dawn', 'Time: night']);
  });

  test('F-M3-11: no crew or time chip when the extractor returns nothing for them', async () => {
    const { extractionChips } = await loadView();
    const chips = extractionChips(extraction({ scene_types: ['market'] }));
    assert.deepEqual(chips.map(c => c.kind), ['scene']);
  });

  test('SC-15: the extractor line says "Bộ trích: Gemini" or "Bộ trích: luật"', async () => {
    const { extractorLabel } = await loadView();
    assert.equal(extractorLabel({ provider: 'gemini', fallback: false }), 'Bộ trích: Gemini');
    assert.equal(extractorLabel({ provider: 'mock', fallback: false }), 'Bộ trích: luật');
    assert.equal(extractorLabel({ provider: 'mock', fallback: true }), 'Bộ trích: luật', 'Fallback is the rule-based extractor');
  });
});
