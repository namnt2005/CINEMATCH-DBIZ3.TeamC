import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from '../../lib/db/client.js';

// SC-12 view rules (BR-001, BR-002, US-2 Scenarios 2–3, SR-052, SR-054). Pure helpers of the dashboard.
const load = () => import('../../app/projects/[id]/dashboard-view.js');
const [header, ...rows] = parseCsv(fs.readFileSync('data/seed/08_segment_requirement.csv', 'utf8'));
const REQUIREMENTS = rows.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? '']))).map(r => ({ ...r, needed: r.needed === 'true' }));
const ROW_A = {
  segment: 'A', content_score: 80, locations_score: 100, partners_score: 70, dossier_score: 25, logistics_score: null,
  gauges_shown: 'content,locations,partners,dossier,logistics', gauges_counted: 4, readiness_total: 68.75,
  content_action: 'content.review_findings', locations_action: 'done', partners_action: 'partners.confirm',
  dossier_action: 'dossier.add_missing', logistics_action: 'logistics.phase2'
};
const ROW_C = { ...ROW_A, segment: 'C', dossier_score: null, dossier_action: null, gauges_shown: 'content,locations,partners,logistics', gauges_counted: 3, readiness_total: 50 };

describe('SC-12 dashboard view (T027, BR-001, BR-002, US-2)', () => {
  test('BR-004: gauge labels and counted flags come from the GAUGE_* rows, in the page language', async () => {
    const { gaugeLabels } = await load();
    const a = gaugeLabels(REQUIREMENTS, 'A', 'en');
    assert.deepEqual(a.map(g => g.gauge), ['content', 'locations', 'partners', 'dossier', 'logistics']);
    assert.equal(a.find(g => g.gauge === 'dossier').label, 'Dossier & permits');
    assert.equal(a.find(g => g.gauge === 'logistics').counted, false);
    assert.equal(gaugeLabels(REQUIREMENTS, 'A', 'vi')[0].label, 'Nội dung và tuân thủ');
  });

  test('BR-002, US-2 Scenario 2: the cards follow gauges_shown — no Dossier card for segment C', async () => {
    const { gaugeCards, gaugeLabels } = await load();
    const cards = gaugeCards(ROW_C, gaugeLabels(REQUIREMENTS, 'C', 'en'));
    assert.deepEqual(cards.map(c => c.gauge), ['content', 'locations', 'partners', 'logistics']);
  });

  test('SR-054: a NULL score renders —, never 0 %; Logistics is not counted and says Phase 2', async () => {
    const { gaugeCards, gaugeLabels } = await load();
    const logistics = gaugeCards(ROW_A, gaugeLabels(REQUIREMENTS, 'A', 'en')).find(c => c.gauge === 'logistics');
    assert.equal(logistics.display, '—');
    assert.equal(logistics.counted, false);
    assert.equal(logistics.button.phase2, true);
  });

  test('US-2 Scenario 3: when the view fails every gauge renders — with the error line and Try again', async () => {
    const { gaugeCards, gaugeLabels, overall } = await load();
    const cards = gaugeCards(null, gaugeLabels(REQUIREMENTS, 'A', 'en'));
    assert.equal(cards.length, 5);
    for (const c of cards) {
      assert.equal(c.display, '—', c.gauge);
      assert.equal(c.score, null, c.gauge);
      assert.equal(c.action, null, c.gauge);
    }
    assert.deepEqual(overall(null), { display: '—', value: null, error: 'dashboard.error', retry: 'dashboard.retry' });
  });

  test('BR-001, SR-052: the overall readiness is readiness_total shown as an integer, never recomputed from the gauges', async () => {
    const { overall } = await load();
    assert.equal(overall(ROW_A).display, '69');
    // scores that do not average to the total: the screen still shows the view's number
    assert.equal(overall({ ...ROW_A, content_score: 0, locations_score: 0, readiness_total: 55.5 }).display, '56');
  });

  // Changed 09/11/2026 with Nam Tran's approval (M2 plan D19): SC-48 (project), SC-25 and SC-27 are built, so their
  // buttons are links to the project's screens; without a project id they still say coming soon.
  test('SC-12 #8: gauge buttons lead to the built screens of the project; without a project they are coming soon', async () => {
    const { gaugeCards, gaugeLabels } = await load();
    const byGauge = Object.fromEntries(gaugeCards(ROW_A, gaugeLabels(REQUIREMENTS, 'A', 'en'), 'p1').map(c => [c.gauge, c.button]));
    assert.deepEqual(byGauge.locations, { href: '/locations/match', label: 'dashboard.action.locations' });
    assert.deepEqual(byGauge.content, { href: '/projects/p1/content', label: 'dashboard.action.content' });
    assert.deepEqual(byGauge.partners, { href: '/requests?project=p1', label: 'dashboard.action.partners' });
    assert.deepEqual(byGauge.dossier, { href: '/projects/p1/dossier', label: 'dashboard.action.dossier' });
    const none = Object.fromEntries(gaugeCards(ROW_A, gaugeLabels(REQUIREMENTS, 'A', 'en')).map(c => [c.gauge, c.button]));
    for (const g of ['content', 'partners', 'dossier']) assert.deepEqual(none[g], { soon: true, label: `dashboard.action.${g}` });
  });
});
