import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { query, getOne } from '../../lib/db/client.js';
import { fakeSupabase, useFakes, resetFakes } from '../contracts/supabase-fake.js';

// FR-008 nightly snapshot (BR-005; research R10): node:sqlite twin and scripts/snapshot-readiness.mjs
const DATE = '2026-11-03';
const readiness = () => import('../../lib/db/readiness.js');

describe('Nightly readiness snapshot on node:sqlite (T030, FR-008, BR-005)', () => {
  test('FR-008: one snapshot per non-archived project for the date, equal to the view total', async () => {
    const { snapshotReadiness } = await readiness();
    const open = query("SELECT project_id FROM project WHERE COALESCE(stage, '') <> 'archived'").map(r => r.project_id);
    const result = await snapshotReadiness(DATE);
    assert.equal(result.inserted, open.length);
    for (const id of open) {
      const snap = query('SELECT readiness_total FROM readiness_snapshot WHERE project_id = ? AND snapshot_date = ?', [id, DATE]);
      assert.equal(snap.length, 1, id);
      const view = getOne('SELECT readiness_total FROM v_project_readiness WHERE project_id = ?', [id]);
      assert.equal(Number(snap[0].readiness_total), Number(view.readiness_total), id);
    }
  });

  test('FR-008: running twice the same day adds nothing', async () => {
    const { snapshotReadiness } = await readiness();
    const before = getOne('SELECT COUNT(*) AS n FROM readiness_snapshot').n;
    assert.equal((await snapshotReadiness(DATE)).inserted, 0);
    assert.equal(getOne('SELECT COUNT(*) AS n FROM readiness_snapshot').n, before);
  });

  test('BR-005: archived projects get no snapshot', async () => {
    const archived = query("SELECT project_id FROM project WHERE stage = 'archived'").map(r => r.project_id);
    assert.ok(archived.length > 0);
    for (const id of archived) assert.equal(getOne('SELECT COUNT(*) AS n FROM readiness_snapshot WHERE project_id = ? AND snapshot_date = ?', [id, DATE]).n, 0);
  });
});

describe('scripts/snapshot-readiness.mjs with a fake System client (T030, FR-008)', () => {
  afterEach(resetFakes);

  test('FR-008: the script asks app_snapshot_readiness for the date with the System client and reports the count', async () => {
    const admin = fakeSupabase({ rpc: { app_snapshot_readiness: () => ({ data: 7, error: null }) } });
    await useFakes({ user: fakeSupabase(), admin });
    const { runSnapshot } = await import('../../scripts/lib/snapshot.mjs');
    assert.deepEqual(await runSnapshot({ date: DATE }), { date: DATE, inserted: 7 });
    assert.deepEqual(admin.calls.find(c => c.rpc).args, { p_date: DATE });
  });

  test('FR-008: without a date the script uses today in Vietnam; a bad date is refused', async () => {
    const admin = fakeSupabase({ rpc: { app_snapshot_readiness: () => ({ data: 0, error: null }) } });
    await useFakes({ user: fakeSupabase(), admin });
    const { runSnapshot } = await import('../../scripts/lib/snapshot.mjs');
    const { todayInVietnam } = await import('../../lib/projects/input.js');
    assert.equal((await runSnapshot({})).date, todayInVietnam());
    await assert.rejects(runSnapshot({ date: '03/11/2026' }));
  });
});
