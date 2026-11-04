import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// SC-10 view rules (US-1 Scenario 1, SR-041; screen-spec-SC-10 #2, #11, #16). Pure helpers of the page.
const load = () => import('../../app/projects/projects-view.js');

describe('SC-10 My projects view (T017, US-1 Scenario 1, FR-001, FR-003)', () => {
  test('US-1 Scenario 1: ?new=1 opens the panel and ?segment= pre-selects the segment', async () => {
    const { panelFromQuery } = await load();
    assert.deepEqual(panelFromQuery(new URLSearchParams('new=1&segment=A')), { open: true, segment: 'A' });
    assert.deepEqual(panelFromQuery(new URLSearchParams('')), { open: false, segment: '' });
    assert.deepEqual(panelFromQuery(new URLSearchParams('new=1&segment=Z')), { open: true, segment: '' });
  });

  test('SR-041, SC-10 #16: Create project stays disabled until the three required fields are valid', async () => {
    const { canCreate } = await load();
    assert.equal(canCreate({ project_name: '', format: '', segment: '' }), false);
    assert.equal(canCreate({ project_name: 'The Night Ferry', format: 'feature', segment: '' }), false);
    assert.equal(canCreate({ project_name: '   ', format: 'feature', segment: 'A' }), false);
    assert.equal(canCreate({ project_name: 'The Night Ferry', format: 'feature', segment: 'A' }), true);
  });

  test('SC-10 #6: no shoot date reads not set; a date shows the days remaining (display only)', async () => {
    const { shootLine } = await load();
    assert.deepEqual(shootLine(null, '2026-11-03'), { key: 'projects.card.date_not_set' });
    assert.deepEqual(shootLine('2026-11-13', '2026-11-03'), { key: 'projects.card.date_days', vars: { date: '13/11/2026', days: 10 } });
  });

  test('FR-003: tabs Draft / Preparing / Archived with the counts of the API; Preparing is the default tab', async () => {
    const { tabs } = await load();
    assert.deepEqual(tabs({ draft: 1, preparing: 2, archived: 3 }, null), [
      { stage: 'preparing', count: 2, active: true }, { stage: 'draft', count: 1, active: false }, { stage: 'archived', count: 3, active: false }
    ]);
    assert.equal(tabs({ draft: 0, preparing: 0, archived: 0 }, 'archived').find(t => t.active).stage, 'archived');
  });

  test('BR-001: the readiness on a card is the view\'s total shown as an integer, never recomputed', async () => {
    const { readinessLabel } = await load();
    assert.equal(readinessLabel(68.75), 69);
    assert.equal(readinessLabel(null), null);
  });
});
