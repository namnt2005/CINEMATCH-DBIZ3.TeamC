import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dictionary } from '../../lib/i18n/index.js';

// H1 on the screens and the API (M0 §3 edge case): — with "not calculated yet", and the partial total explained
const ROW = {
  project_id: 'p', segment: 'A', content_score: 80, locations_score: 100, partners_score: null, dossier_score: 25, logistics_score: null,
  gauges_shown: 'content,locations,partners,dossier,logistics', gauges_counted: 4, gauges_reported: 3, gauges_not_reported: 'partners',
  readiness_total: 68.33, content_action: 'content.review_findings', locations_action: 'done', partners_action: 'not_reported',
  dossier_action: 'dossier.add_missing', logistics_action: 'logistics.phase2', content_open_findings: 1, dossier_missing: 'A13_ART9_COMMITMENT',
  next_action_primary: 'content.review_findings'
};
const LABELS = ['content', 'locations', 'partners', 'dossier', 'logistics'].map(g => ({ gauge: g, label: g, counted: g !== 'logistics' }));

describe('Not-reported gauges on SC-12, SC-10 and the API (H1)', () => {
  test('H1: the card of a gauge that has not reported shows — and the not-calculated-yet line', async () => {
    const { gaugeCards } = await import('../../app/projects/[id]/dashboard-view.js');
    const partners = gaugeCards(ROW, LABELS).find(c => c.gauge === 'partners');
    assert.equal(partners.display, '—');
    assert.equal(partners.notReported, true);
    assert.equal(gaugeCards(ROW, LABELS).find(c => c.gauge === 'content').notReported, false);
  });

  test('H1: the overall readiness says it uses only the gauges that reported', async () => {
    const { overall } = await import('../../app/projects/[id]/dashboard-view.js');
    assert.deepEqual(overall(ROW), { display: '68', value: 68, counted: 4, note: { key: 'dashboard.overall_partial', vars: { reported: 3, counted: 4 } } });
    assert.deepEqual(overall({ ...ROW, gauges_reported: 4, gauges_not_reported: null }).note, { key: 'dashboard.overall_note', vars: { count: 4 } });
  });

  test('H1: no gauge reported → the total shows — with its own line, not the error state', async () => {
    const { overall } = await import('../../app/projects/[id]/dashboard-view.js');
    const none = overall({ ...ROW, readiness_total: null, gauges_reported: 0 });
    assert.equal(none.display, '—');
    assert.equal(none.error, undefined);
    assert.deepEqual(none.note, { key: 'dashboard.none_reported' });
  });

  test('BR-003, H1: not_reported and the partial notes have a sentence in both languages', () => {
    for (const locale of ['vi', 'en']) {
      for (const key of ['dashboard.next.not_reported', 'dashboard.not_reported', 'dashboard.overall_partial', 'dashboard.none_reported']) {
        assert.ok(dictionary(locale)[key], `${locale}: ${key}`);
      }
    }
  });

  test('H1, H3: the API carries gauges_reported and gauges_not_reported, and the round trip keeps them', async () => {
    const { toApiReadiness, fromApiReadiness } = await import('../../lib/db/project-shape.js');
    const api = toApiReadiness(ROW);
    assert.equal(api.gauges_reported, 3);
    assert.deepEqual(api.gauges_not_reported, ['partners']);
    assert.equal(api.gauge_scores.partners, null);
    assert.equal(api.next_actions[2], 'not_reported');
    const back = fromApiReadiness(api);
    assert.equal(back.gauges_reported, 3);
    assert.equal(back.gauges_not_reported, 'partners');
  });
});
