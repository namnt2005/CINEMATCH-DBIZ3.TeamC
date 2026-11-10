import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getDb, query, getOne } from '../../lib/db/client.js';

// v_project_readiness on node:sqlite with the seed (BR-001..BR-004, specs/005-m0-workspace research R1–R4).
// Expected values are those of data/seed/seed_rules.py readiness(), the oracle that wrote the seed snapshots.
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';    // A, The Last Ferry
const SIGNAL = 'f1419149-4224-59e3-84d5-0697a882957c';   // C, Monsoon Signal
const BLUES = '8b0fd28f-7963-5089-879a-6970d82e04af';    // A, Quiet Harbour Blues, everything complete
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';     // B, Rice and Salt
const LANTERN = '196465cf-563e-507e-aa03-b73497ac8e56';  // A, Lantern Street
const SAPA = '03f0d59d-ab53-519c-912e-71c66f38f3b6';     // A, Above the Terraces
const HARBOUR_ORG = 'f8cd729a-5118-5b4a-a656-6ee31f1b6b12';
const A13 = ['A13_APPLICATION', 'A13_ART9_COMMITMENT', 'A13_SCRIPT_VI', 'A13_SERVICE_AGREEMENT'];

const ORACLE = {
  [SAPA]: { content: 100, locations: 75, partners: 30, dossier: 0, total: 51.25 },
  [LANTERN]: { content: 100, locations: 75, partners: 30, dossier: 0, total: 51.25 },
  [BLUES]: { content: 100, locations: 100, partners: 100, dossier: 100, total: 100 },
  'a745bb54-573f-5e8f-9d99-2d7e9af46ccf': { content: 0, locations: 0, partners: 0, dossier: 0, total: 0 },
  [RICE]: { content: 60, locations: 75, partners: 30, dossier: 25, total: 47.5 },
  'd43ad9c0-24eb-55e2-a41b-60a19c446eb2': { content: 0, locations: 75, partners: 30, dossier: 0, total: 26.25 },
  [FERRY]: { content: 80, locations: 100, partners: 70, dossier: 25, total: 68.75 },
  [SIGNAL]: { content: 0, locations: 0, partners: 0, dossier: null, total: 0 }
};
const GAUGES = ['content', 'locations', 'partners', 'dossier', 'logistics'];

const row = (projectId) => {
  const r = getOne('SELECT * FROM v_project_readiness WHERE project_id = ?', [projectId]);
  assert.ok(r, `no view row for ${projectId}`);
  return r;
};
const num = (v) => (v === null || v === undefined ? null : Number(v));
const shown = (r) => String(r.gauges_shown).split(',');

/** Runs fn inside a transaction that is always rolled back, so each test sees the plain seed. */
function scenario(fn) {
  const db = getDb();
  db.exec('BEGIN');
  try {
    return fn(db);
  } finally {
    db.exec('ROLLBACK');
  }
}

describe('v_project_readiness on node:sqlite (T005, BR-001..BR-004, FR-005, FR-007)', () => {
  test('FR-005: the view has one row per project', () => {
    const projects = query('SELECT project_id FROM project').map(r => r.project_id).sort();
    const rows = query('SELECT project_id FROM v_project_readiness').map(r => r.project_id).sort();
    assert.deepEqual(rows, projects);
  });

  test('BR-001, research R1: The Last Ferry (A) totals 68.75, its latest seed snapshot', () => {
    const r = row(FERRY);
    const last = getOne('SELECT readiness_total FROM readiness_snapshot WHERE project_id = ? ORDER BY snapshot_date DESC LIMIT 1', [FERRY]);
    assert.equal(num(r.readiness_total), 68.75);
    assert.equal(num(r.readiness_total), num(last.readiness_total));
  });

  test('research R1: every gauge score of every seed project equals the seed oracle', () => {
    for (const [projectId, want] of Object.entries(ORACLE)) {
      const r = row(projectId);
      for (const g of ['content', 'locations', 'partners', 'dossier']) assert.equal(num(r[`${g}_score`]), want[g], `${projectId} ${g}`);
      assert.equal(num(r.readiness_total), want.total, `${projectId} total`);
    }
  });

  test('Q1, BR-004: in segments A and B the total is the average of the four counted gauges (25 % each)', () => {
    for (const r of query("SELECT * FROM v_project_readiness WHERE segment IN ('A', 'B')")) {
      assert.equal(Number(r.gauges_counted), 4, r.project_id);
      const average = (num(r.content_score) + num(r.locations_score) + num(r.partners_score) + num(r.dossier_score)) / 4;
      assert.equal(num(r.readiness_total), Math.round(average * 100) / 100, r.project_id);
    }
  });

  test('BR-002, US-2 Scenario 2: Monsoon Signal (C) has no Dossier & permits gauge and counts three gauges', () => {
    const r = row(SIGNAL);
    assert.equal(r.segment, 'C');
    assert.equal(r.dossier_score, null);
    assert.equal(r.dossier_action, null);
    assert.ok(!shown(r).includes('dossier'), `gauges_shown = ${r.gauges_shown}`);
    assert.deepEqual(shown(r), ['content', 'locations', 'partners', 'logistics']);
    assert.equal(Number(r.gauges_counted), 3);
  });

  test('Q1: in segment C each counted gauge weighs one third (a full Locations gauge gives 33.33, not 25 or 20)', () => {
    scenario((db) => {
      const locations = query("SELECT location_id FROM location WHERE published = 'true' OR published = 1 LIMIT 2").map(l => l.location_id);
      assert.equal(locations.length, 2, 'two published seed locations');
      const add = db.prepare('INSERT INTO project_shortlist (shortlist_id, project_id, location_id, role) VALUES (?, ?, ?, ?)');
      add.run(randomUUID(), SIGNAL, locations[0], 'primary');
      add.run(randomUUID(), SIGNAL, locations[1], 'backup');
      const r = row(SIGNAL);
      assert.equal(num(r.locations_score), 100);
      assert.equal(num(r.readiness_total), 33.33);
    });
  });

  test('BR-002: the Dossier gauge follows the GAUGE_DOSSIER row, not the segment letter', () => {
    scenario((db) => {
      db.prepare("INSERT INTO segment_requirement (segment, requirement_code, label_vi, label_en, needed) VALUES ('C', 'GAUGE_DOSSIER', 'Hồ sơ', 'Dossier', 'true')").run();
      const r = row(SIGNAL);
      assert.ok(shown(r).includes('dossier'));
      assert.equal(num(r.dossier_score), 0);
      assert.equal(Number(r.gauges_counted), 4);
    });
  });

  test('BR-002, Q1: Logistics is shown as not scored on every project and never counted', () => {
    for (const r of query('SELECT * FROM v_project_readiness')) {
      assert.equal(r.logistics_score, null, r.project_id);
      assert.equal(r.logistics_action, 'logistics.phase2', r.project_id);
      assert.ok(shown(r).includes('logistics'), r.project_id);
      assert.equal(Number(r.gauges_counted), r.segment === 'C' ? 3 : 4, r.project_id);
    }
  });

  test('BR-004: turning a segment\'s GAUGE_PARTNERS row to not needed changes the weights with no code change', () => {
    scenario((db) => {
      db.prepare("UPDATE segment_requirement SET needed = 'false' WHERE segment = 'A' AND requirement_code = 'GAUGE_PARTNERS'").run();
      const r = row(FERRY);
      assert.equal(Number(r.gauges_counted), 3);
      assert.ok(shown(r).includes('partners'), 'still shown, only not counted');
      assert.equal(num(r.readiness_total), Math.round(((80 + 100 + 25) / 3) * 100) / 100);
    });
    assert.equal(num(row(FERRY).readiness_total), 68.75, 'rolled back');
  });

  test('BR-003: every shown gauge has exactly one non-empty next step; a gauge not shown has none', () => {
    for (const r of query('SELECT * FROM v_project_readiness')) {
      for (const g of GAUGES) {
        const action = r[`${g}_action`];
        if (shown(r).includes(g)) {
          assert.equal(typeof action, 'string', `${r.project_id} ${g}`);
          assert.ok(action.length > 0 && !action.includes(','), `${r.project_id} ${g}: one action, got ${action}`);
        } else {
          assert.equal(action, null, `${r.project_id} ${g}`);
        }
      }
    }
  });

  test('BR-003: a complete gauge reads done, and only a complete gauge does', () => {
    for (const r of query('SELECT * FROM v_project_readiness')) {
      for (const g of ['content', 'locations', 'partners', 'dossier']) {
        if (!shown(r).includes(g)) continue;
        assert.equal(r[`${g}_action`] === 'done', num(r[`${g}_score`]) === 100, `${r.project_id} ${g}: ${r[`${g}_action`]} at ${r[`${g}_score`]}`);
      }
    }
    const blues = row(BLUES);
    assert.equal(blues.next_action_primary, 'done');
  });

  test('research R4: The Last Ferry gets one next step per gauge and the first open one as its card step', () => {
    const r = row(FERRY);
    assert.equal(r.content_action, 'content.review_findings');
    assert.equal(Number(r.content_open_findings), 1);
    assert.equal(r.locations_action, 'done');
    assert.equal(r.partners_action, 'partners.confirm');
    assert.equal(r.dossier_action, 'dossier.add_missing');
    assert.equal(r.dossier_missing, 'A13_ART9_COMMITMENT,A13_SCRIPT_VI,A13_SERVICE_AGREEMENT');
    assert.equal(r.next_action_primary, 'content.review_findings');
  });

  test('research R4: partner steps follow the request states', () => {
    assert.equal(row(RICE).partners_action, 'partners.answer_partner');   // info_requested
    assert.equal(row(LANTERN).partners_action, 'partners.send_request');  // only declined
    assert.equal(row(SAPA).partners_action, 'partners.await_reply');      // pending
    assert.equal(row(BLUES).partners_action, 'done');                     // confirmed
  });

  test('US-2 Scenario 1: an A or B project with 2 of 4 Article 13 components present shows 50 % and names the two missing', () => {
    scenario((db) => {
      db.prepare("UPDATE document_slot SET state = 'present' WHERE project_id = ? AND doc_code = 'A13_SCRIPT_VI'").run(RICE);
      // Added 09/11/2026 with Nam Tran's approval (M2 plan D18): the Dossier gauge now reads M2's dossier check, which keeps
      // component b below Present while a paragraph is not proofread (SC-27 SR-086); the paragraph of Rice and Salt is
      // proofread here so that the scenario still has 2 of 4 components present.
      db.prepare("UPDATE bilingual_paragraph SET status = 'reviewed', reviewed_by = '95f36904-6141-5469-8c63-712a80a4295e', reviewed_at = '2026-11-09T10:00:00+07:00' WHERE project_id = ? AND doc_code = 'A13_SCRIPT_VI'").run(RICE);
      const r = row(RICE);
      assert.equal(num(r.dossier_score), 50);
      assert.equal(r.dossier_action, 'dossier.add_missing');
      assert.equal(r.dossier_missing, 'A13_ART9_COMMITMENT,A13_SERVICE_AGREEMENT');
    });
  });

  test('US-1 Scenario 2: a new project with no data has every gauge at 0 % and starts with a content pre-check', () => {
    scenario((db) => {
      const id = randomUUID();
      db.prepare("INSERT INTO project (project_id, producer_org_id, project_name, format, segment, buffer_days, stage, updated_at) VALUES (?, ?, 'T005 new project', 'feature', 'A', 7, 'draft', '2026-11-03T10:00:00+07:00')")
        .run(id, HARBOUR_ORG);
      const r = row(id);
      for (const g of ['content', 'locations', 'partners', 'dossier']) assert.equal(num(r[`${g}_score`]), 0, g);
      assert.equal(num(r.readiness_total), 0);
      assert.equal(r.content_action, 'content.start_precheck');
      assert.equal(r.locations_action, 'locations.shortlist');
      assert.equal(r.partners_action, 'partners.send_request');
      assert.equal(r.dossier_action, 'dossier.add_missing');
      assert.equal(r.dossier_missing, A13.join(','));
      assert.equal(r.next_action_primary, 'content.start_precheck');
    });
  });
});
