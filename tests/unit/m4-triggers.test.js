import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { query, getOne } from '../../lib/db/client.js';

// Database rules of M4 on node:sqlite (T005): lib/db/local-triggers.sql, the twins of the Supabase triggers.
const CONFIRMED = 'f971c1ed-7b3d-599e-ac1b-ffdc9342a2b6'; // Quiet Harbour Blues → Hạ Long Marine Logistics
const DECLINED = '12a25226-acf2-56b5-a74f-bfa4f5c0bfa2';  // Lantern Street → Hội An Casting House
const WITHDRAWN = '21a30c0d-5779-50ae-a32f-6d694d234cd8'; // Rice and Salt → Cửu Long Drone Works (deactivated), no message
const OPEN = '45b67f20-9ed8-551a-a6e4-6678815813c7';      // Above the Terraces → Saigon Line Crew, pending
const MESSAGE = '210cc813-c0dc-58e5-b3d4-05349cd2e5b3';    // a Bến Xưa reply in the Last Ferry thread
const ACCESS_LOG = '02a05e96-f250-58e1-a28f-91501e286bb3';

const refuses = (sql, params, rule) => assert.throws(() => query(sql, params), new RegExp(rule), sql);

describe('M4 database rules on node:sqlite (T005)', () => {
  test('BR-005: a confirmed, declined or withdrawn request cannot be updated — status or any other column', () => {
    for (const id of [CONFIRMED, DECLINED, WITHDRAWN]) {
      refuses('UPDATE collab_request SET status = ? WHERE request_id = ?', ['pending', id], 'BR-005');
      refuses('UPDATE collab_request SET note = ? WHERE request_id = ?', ['changed', id], 'BR-005');
    }
  });

  test('BR-005: an open request can still change', () => {
    const id = OPEN;
    query("UPDATE collab_request SET status = 'under_review' WHERE request_id = ?", [id]);
    assert.equal(getOne('SELECT status FROM collab_request WHERE request_id = ?', [id]).status, 'under_review');
  });

  test('BR-005: the trigger does not watch DELETE (no client role may delete; analysis I3)', () => {
    const id = WITHDRAWN; // final, no message and no NDA row
    query('DELETE FROM collab_request WHERE request_id = ?', [id]);
    assert.equal(getOne('SELECT COUNT(*) AS n FROM collab_request WHERE request_id = ?', [id]).n, 0);
  });

  test('BR-009: a message cannot be edited or deleted once sent', () => {
    const id = MESSAGE;
    refuses('UPDATE collab_message SET body = ? WHERE message_id = ?', ['edited', id], 'BR-009');
    refuses('DELETE FROM collab_message WHERE message_id = ?', [id], 'BR-009');
    assert.notEqual(getOne('SELECT body FROM collab_message WHERE message_id = ?', [id]).body, 'edited');
  });

  test('BR-007: a document access-log row cannot be changed or deleted', () => {
    refuses('UPDATE document_access_log SET viewed_at = ? WHERE access_log_id = ?', ['2026-01-01T00:00:00+07:00', ACCESS_LOG], 'BR-007');
    refuses('DELETE FROM document_access_log WHERE access_log_id = ?', [ACCESS_LOG], 'BR-007');
  });
});
