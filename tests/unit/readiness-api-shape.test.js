import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, query } from '../../lib/db/client.js';

// H3 (decision of 05/11/2026): the API speaks the spec names; the dashboard reads them back without recomputing
const load = () => import('../../lib/db/project-shape.js');

describe('Readiness API shape (H3, FR-005, FR-007, BR-001)', () => {
  test('H3: toApiReadiness → fromApiReadiness gives back the view row of every seed project', async () => {
    const { asReadiness, toApiReadiness, fromApiReadiness } = await load();
    getDb();
    for (const raw of query('SELECT * FROM v_project_readiness')) {
      const row = asReadiness(raw);
      const back = fromApiReadiness(JSON.parse(JSON.stringify(toApiReadiness(row))));
      for (const key of Object.keys(row)) assert.deepEqual(back[key], row[key] ?? null, `${row.project_id} ${key}`);
    }
  });

  test('BR-001: the API shape carries numbers only from the view — nothing is added up', async () => {
    const { toApiReadiness } = await load();
    const api = toApiReadiness({ project_id: 'p', segment: 'A', content_score: 0, locations_score: 0, partners_score: 0, dossier_score: 0, logistics_score: null,
      gauges_shown: 'content,locations,partners,dossier,logistics', gauges_counted: 4, readiness_total: 55.5, content_action: 'done', locations_action: 'done',
      partners_action: 'done', dossier_action: 'done', logistics_action: 'logistics.phase2', content_open_findings: 0, dossier_missing: null, next_action_primary: 'done' });
    assert.equal(api.readiness_total, 55.5);
  });

  test('H3: a missing row stays null', async () => {
    const { toApiReadiness, fromApiReadiness } = await load();
    assert.equal(toApiReadiness(null), null);
    assert.equal(fromApiReadiness(null), null);
  });
});
