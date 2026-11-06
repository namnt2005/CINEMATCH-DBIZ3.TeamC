import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne, query } from '../../lib/db/client.js';

// The document access log on node:sqlite (T056, FR-018 log only, BR-007, D4): the viewer itself is built with M5.
const log = () => import('../../lib/db/document-log.js');
const user = (role, userId) => ({ role, isAuthenticated: true, userId });
const PARK = user('member', '4ef79de6-8efb-58f7-8514-9c0532345ac4');     // owner of The Last Ferry
const YUI = user('member', '118de3c8-88eb-5003-a2f9-26bbdd0186ae');      // not on The Last Ferry
const FERRY_DOC = '2ee40fdd-6a0c-5889-a5fc-213f2dfba75e';               // A13_APPLICATION of The Last Ferry

describe('Document access log on node:sqlite (T056)', () => {
  test('one row with the viewer and the Vietnam time', async () => {
    const { logDocumentView } = await log();
    const before = Number(getOne('SELECT COUNT(*) AS n FROM document_access_log WHERE document_id = ?', [FERRY_DOC]).n);
    const out = await logDocumentView(PARK, FERRY_DOC);
    assert.match(out.viewed_at, /\+07:00$/);
    const row = getOne('SELECT * FROM document_access_log WHERE access_log_id = ?', [out.access_log_id]);
    assert.equal(row.viewer_id, PARK.userId);
    assert.equal(row.document_id, FERRY_DOC);
    assert.equal(Number(getOne('SELECT COUNT(*) AS n FROM document_access_log WHERE document_id = ?', [FERRY_DOC]).n), before + 1);
  });

  test('BR-007: the row cannot be changed or deleted', async () => {
    const id = getOne('SELECT access_log_id FROM document_access_log WHERE viewer_id = ? ORDER BY viewed_at DESC LIMIT 1', [PARK.userId]).access_log_id;
    assert.throws(() => query("UPDATE document_access_log SET viewed_at = '2026-01-01T00:00:00+07:00' WHERE access_log_id = ?", [id]), /append-only/);
    assert.throws(() => query('DELETE FROM document_access_log WHERE access_log_id = ?', [id]), /append-only/);
  });

  test('an unknown document is NOT_FOUND; someone outside the project and the NDA is FORBIDDEN', async () => {
    const { logDocumentView } = await log();
    await assert.rejects(() => logDocumentView(PARK, '00000000-0000-4000-8000-000000000000'), (e) => e.code === 'NOT_FOUND');
    await assert.rejects(() => logDocumentView(YUI, FERRY_DOC), (e) => e.code === 'FORBIDDEN');
    await assert.rejects(() => logDocumentView({ role: 'guest', isAuthenticated: false, userId: null }, FERRY_DOC), (e) => e.code === 'UNAUTHENTICATED');
  });
});
