import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, closeDatabase } from '../../lib/db/client.js';

// Imported inside each test so every scenario reports its own failure until the code exists.
const loadClient = () => import('../../lib/db/client.js');
const loadAudit = () => import('../../lib/db/audit.js');

const STAFF_ID = '515529a9-46d9-559c-aab4-e5fb31eedeea';
const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e';

const rowsFor = (targetId) => getDb().prepare('SELECT * FROM audit_log WHERE target_id = ?').all(targetId);

describe('Audit log writer and append-only rule (T003, SR-317, M10 FR-008, M10 BR-005)', () => {
  beforeEach(() => closeDatabase());

  test('M10 FR-008: writeAudit inside withTransaction stores exactly one row with action, admin, target and time', async () => {
    const { withTransaction } = await loadClient();
    const { writeAudit } = await loadAudit();
    const before = rowsFor(TRANG_AN).length;

    withTransaction(db => writeAudit(db, { action: 'location.update', adminId: STAFF_ID, targetId: TRANG_AN }));

    const rows = rowsFor(TRANG_AN);
    assert.equal(rows.length, before + 1);
    const row = rows.find(r => r.action === 'location.update');
    assert.equal(row.admin_id, STAFF_ID);
    assert.match(row.audit_log_id, /^[0-9a-f-]{36}$/);
    assert.ok(!Number.isNaN(Date.parse(row.logged_at)), 'logged_at is a timestamp');
  });

  test('M10 BR-005: an audit row cannot be edited', async () => {
    await loadClient();
    assert.throws(
      () => getDb().prepare("UPDATE audit_log SET action = 'tampered'").run(),
      /append-only/i
    );
  });

  test('M10 BR-005: an audit row cannot be deleted', async () => {
    await loadClient();
    const before = getDb().prepare('SELECT count(*) AS n FROM audit_log').get().n;
    assert.throws(() => getDb().prepare('DELETE FROM audit_log').run(), /append-only/i);
    assert.equal(getDb().prepare('SELECT count(*) AS n FROM audit_log').get().n, before);
  });

  test('M10 BR-005: when the action fails, the action and its audit row are both rolled back', async () => {
    const { withTransaction } = await loadClient();
    const { writeAudit } = await loadAudit();
    const descBefore = getDb().prepare('SELECT desc_en FROM location WHERE location_id = ?').get(TRANG_AN).desc_en;
    const auditBefore = rowsFor(TRANG_AN).length;

    assert.throws(() => withTransaction(db => {
      db.prepare("UPDATE location SET desc_en = 'changed' WHERE location_id = ?").run(TRANG_AN);
      writeAudit(db, { action: 'location.update', adminId: STAFF_ID, targetId: TRANG_AN });
      throw new Error('boom');
    }), /boom/);

    assert.equal(getDb().prepare('SELECT desc_en FROM location WHERE location_id = ?').get(TRANG_AN).desc_en, descBefore);
    assert.equal(rowsFor(TRANG_AN).length, auditBefore);
  });

  test('SR-317: withTransaction returns the result of a successful action', async () => {
    const { withTransaction } = await loadClient();
    assert.equal(withTransaction(() => 42), 42);
  });
});
