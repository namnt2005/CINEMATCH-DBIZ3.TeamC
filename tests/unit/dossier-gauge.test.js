import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getDb, query, getOne } from '../../lib/db/client.js';

// The Dossier gauge reads M2's dossier check (T045, FR-010, SC-005, research R8): one view v_dossier_check feeds SC-27 and
// the M0 readiness view, so the two can never show different numbers.
const dossier = () => import('../../lib/db/dossier.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');
const owners = () => query("SELECT pm.project_id, pm.user_id, p.segment FROM project_member pm JOIN project p ON p.project_id = pm.project_id WHERE pm.permission = 'owner'");

describe('Dossier gauge = SC-27 (T045)', () => {
  test('FR-010 / SC-005: on every seed project the M0 dossier score equals the SC-27 completeness', async () => {
    const { getDossier } = await dossier();
    let compared = 0;
    for (const o of owners()) {
      const d = await getDossier(member(o.user_id), o.project_id);
      const gauge = getOne('SELECT dossier_score FROM v_project_readiness WHERE project_id = ?', [o.project_id])?.dossier_score;
      if (!d.applies) { assert.equal(gauge ?? null, null, `${o.project_id}: no dossier gauge for segment C`); continue; }
      assert.equal(Number(gauge), Number(d.completeness_pct), o.project_id);
      compared++;
    }
    assert.ok(compared >= 5, 'not vacuous');
  });

  test('the gauge follows M2, not the stored slot: The Last Ferry b stored as present stays not present while paragraphs are open', () => {
    const db = getDb();
    db.exec('BEGIN');
    try {
      const before = Number(getOne('SELECT dossier_score FROM v_project_readiness WHERE project_id = ?', [FERRY]).dossier_score);
      db.prepare("UPDATE document_slot SET state = 'present' WHERE project_id = ? AND doc_code = 'A13_SCRIPT_VI'").run(FERRY);
      assert.equal(Number(getOne('SELECT dossier_score FROM v_project_readiness WHERE project_id = ?', [FERRY]).dossier_score), before);
      assert.equal(getOne("SELECT state FROM v_dossier_check WHERE project_id = ? AND doc_code = 'A13_SCRIPT_VI'", [FERRY]).state, 'needs_fix');
    } finally { db.exec('ROLLBACK'); }
  });

  test('the readiness template reads v_dossier_check; the dossier view renders for both databases with nothing left to fill', async () => {
    assert.match(fs.readFileSync('lib/db/readiness-view.sql', 'utf8'), /v_dossier_check/);
    const { renderDossierView } = await import('../../lib/dossier/render-view.js');
    for (const dialect of ['sqlite', 'postgres']) {
      const sql = renderDossierView(dialect);
      assert.match(sql.trim(), /^SELECT\b/i, dialect);
      assert.doesNotMatch(sql, /\{\{|\}\}/, dialect);
    }
  });

  test('the next step of The Last Ferry names the components not present (US-2 Sc1 on SC-12)', () => {
    const missing = getOne('SELECT dossier_missing FROM v_project_readiness WHERE project_id = ?', [FERRY]).dossier_missing.split(',');
    assert.deepEqual(missing.sort(), ['A13_ART9_COMMITMENT', 'A13_SCRIPT_VI', 'A13_SERVICE_AGREEMENT']);
    void PARK;
  });
});
