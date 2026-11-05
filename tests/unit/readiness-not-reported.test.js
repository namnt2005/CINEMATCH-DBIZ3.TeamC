import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, query, getOne } from '../../lib/db/client.js';

// M0 §3 edge case "A module fails to report", decision H1 (05/11/2026): readiness_source.reporting = false
// → the gauge shows — (not calculated yet) and the overall score uses only the gauges that reported.
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';   // A: 80 / 100 / 70 / 25
const SIGNAL = 'f1419149-4224-59e3-84d5-0697a882957c';  // C
const row = (id) => getOne('SELECT * FROM v_project_readiness WHERE project_id = ?', [id]);
const num = (v) => (v === null || v === undefined ? null : Number(v));
function scenario(fn) {
  const db = getDb();
  db.exec('BEGIN');
  try { return fn(db); } finally { db.exec('ROLLBACK'); }
}
const off = (db, ...gauges) => { for (const g of gauges) db.prepare("UPDATE readiness_source SET reporting = 'false' WHERE gauge = ?").run(g); };

describe('Gauges whose module has not reported (H1, M0 §3 edge case, BR-001)', () => {
  test('H1: the seed has one reporting flag per counted gauge, all reporting', () => {
    assert.deepEqual(query('SELECT gauge, reporting FROM readiness_source ORDER BY gauge').map(r => [r.gauge, r.reporting]),
      [['content', 'true'], ['dossier', 'true'], ['locations', 'true'], ['partners', 'true']]);
  });

  test('H1: with every module reporting, nothing changes — The Last Ferry still totals 68.75', () => {
    const r = row(FERRY);
    assert.equal(num(r.readiness_total), 68.75);
    assert.equal(Number(r.gauges_reported), 4);
    assert.equal(r.gauges_not_reported, null);
  });

  test('H1: a module that has not reported shows no score, the not_reported step, and leaves the overall score', () => {
    scenario((db) => {
      off(db, 'partners');
      const r = row(FERRY);
      assert.equal(r.partners_score, null);
      assert.equal(r.partners_action, 'not_reported');
      assert.equal(Number(r.gauges_counted), 4, 'the weights of the segment do not change');
      assert.equal(Number(r.gauges_reported), 3);
      assert.equal(r.gauges_not_reported, 'partners');
      assert.equal(num(r.readiness_total), Math.round(((80 + 100 + 25) / 3) * 100) / 100);
      assert.equal(r.next_action_primary, 'content.review_findings', 'the card step stays an action someone can take');
      const c = row(SIGNAL);
      assert.equal(Number(c.gauges_reported), 2);
      assert.equal(c.dossier_action, null, 'segment C still has no dossier gauge');
    });
  });

  test('H1: when no counted gauge has reported, the overall score is not calculated — never a fake 0 %', () => {
    scenario((db) => {
      off(db, 'content', 'locations', 'partners', 'dossier');
      const r = row(FERRY);
      assert.equal(r.readiness_total, null);
      assert.equal(Number(r.gauges_reported), 0);
      assert.equal(r.gauges_not_reported, 'content,locations,partners,dossier');
      assert.equal(r.next_action_primary, 'not_reported');
      assert.equal(r.logistics_action, 'logistics.phase2', 'Logistics is unaffected (never counted)');
    });
  });

  test('FR-008, H1: the nightly snapshot skips a project whose overall score is not calculated', async () => {
    const { snapshotReadiness } = await import('../../lib/db/readiness.js');
    const db = getDb();
    off(db, 'content', 'locations', 'partners', 'dossier');   // snapshotReadiness opens its own transaction
    try {
      const result = await snapshotReadiness('2026-11-05');
      assert.equal(result.inserted, 0);
      assert.equal(getOne("SELECT COUNT(*) AS n FROM readiness_snapshot WHERE snapshot_date = '2026-11-05'").n, 0);
    } finally {
      db.prepare("UPDATE readiness_source SET reporting = 'true'").run();
    }
  });
});
