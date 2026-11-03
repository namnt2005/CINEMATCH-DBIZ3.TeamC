import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const load = () => import('../../app/start/router-view.js');
const base = { computed: 'A', override: null, saved: 'saved' };

describe('SC-02 override state (T020, US-2 Scenario 1, BR-003, SR-034)', () => {
  test('US-2 Scenario 1: picking card B makes B the result, marked as chosen by the user', async () => {
    const { chooseCard, shownSegment, chosenByYou } = await load();
    const view = chooseCard(base, 'B');
    assert.equal(shownSegment(view), 'B');
    assert.equal(view.override, 'B');
    assert.equal(chosenByYou(view), true);
    assert.equal(view.saved, 'pending', 'the override is being recorded');
  });

  test('BR-003: picking the computed card again removes the mark', async () => {
    const { chooseCard, shownSegment, chosenByYou } = await load();
    const view = chooseCard(chooseCard(base, 'C'), 'A');
    assert.equal(view.override, null);
    assert.equal(shownSegment(view), 'A');
    assert.equal(chosenByYou(view), false);
  });

  test('SC-02 Error state: a choice whose save failed stays on screen, flagged as not saved', async () => {
    const { chooseCard, saveResult, shownSegment } = await load();
    const view = saveResult(chooseCard(base, 'C'), false);
    assert.equal(shownSegment(view), 'C');
    assert.equal(view.saved, 'failed');
    assert.equal(saveResult(view, true).saved, 'saved');
  });

  test('BR-003: a no-match result can be overridden; the computed card list then shows the other two', async () => {
    const { chooseCard, shownSegment, cardsFor } = await load();
    const view = chooseCard({ computed: null, override: null, saved: 'saved' }, 'B');
    assert.equal(shownSegment(view), 'B');
    assert.deepEqual(cardsFor(view), ['A', 'C']);
    assert.deepEqual(cardsFor(chooseCard({ computed: 'A', override: null, saved: 'saved' }, 'B')), ['A', 'C'], 'the computed segment stays reachable as a card');
  });
});
