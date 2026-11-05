import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { getOne } from '../../lib/db/client.js';

// The province's reply on node:sqlite (T027, FR-003, BR-003, D3, US-2 Scenario 1, R7).
const notices = () => import('../../lib/db/notices.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const LAURENT = member('95f36904-6141-5469-8c63-712a80a4295e');  // owner of Rice and Salt
const OKAFOR = member('2985398f-7372-5d92-a85d-117c3a4b91e4');   // view member of Rice and Salt
const STAFF = { role: 'vfda_staff', isAuthenticated: true, userId: '515529a9-46d9-559c-aab4-e5fb31eedeea' };
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e';
const HA_LONG = '0889fb2d-3178-5598-93ae-3e3693dbe58a';
const n = (sql, p = []) => Number(getOne(sql, p).n);
const notice = (id) => ({ ...getOne('SELECT response, note, responded_at, received_at, response_recorded_by FROM province_notice WHERE interest_id = ?', [id]) });
let downloaded;
let draft;

describe('Province reply on node:sqlite (T027)', () => {
  before(async () => {
    const { expressInterest, submitNotice, reviewNotice, markDownloaded } = await notices();
    downloaded = (await expressInterest(LAURENT, RICE, { location_id: TRANG_AN })).notice_id;
    await submitNotice(LAURENT, downloaded);
    await reviewNotice(STAFF, downloaded, { decision: 'approve' });
    await markDownloaded(LAURENT, downloaded, { recipient: 'peoples_committee' });
    draft = (await expressInterest(LAURENT, RICE, { location_id: HA_LONG })).notice_id;
  });

  test('R7: no reply before the letter was downloaded (INVALID_STATE)', async () => {
    const { recordReply } = await notices();
    await assert.rejects(recordReply(LAURENT, draft, { response: 'received' }), { code: 'INVALID_STATE' });
  });

  test('BR-003: any value other than the three final ones is refused and nothing is stored', async () => {
    const { recordReply } = await notices();
    for (const response of ['approved', 'waiting', 'RECEIVED', '', null]) {
      await assert.rejects(recordReply(LAURENT, downloaded, { response }), { code: 'VALIDATION_ERROR' }, String(response));
    }
    assert.equal(notice(downloaded).response, null);
  });

  test('D3: a view member cannot record the reply', async () => {
    const { recordReply } = await notices();
    await assert.rejects(recordReply(OKAFOR, downloaded, { response: 'received' }), { code: 'FORBIDDEN' });
  });

  test('BR-003, D3: the member records More info needed; the note is kept as entered; no notification, no audit row', async () => {
    const { recordReply } = await notices();
    const note = 'Tỉnh cần thêm  lịch quay chi tiết.\nGửi trước 20/11.';
    const notes = n('SELECT COUNT(*) AS n FROM notification');
    const audits = n("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'notice.reply'");
    await recordReply(LAURENT, downloaded, { response: 'info_needed', note });
    const r = notice(downloaded);
    assert.equal(r.response, 'info_needed');
    assert.equal(r.note, note);
    assert.ok(r.responded_at && r.received_at);
    assert.equal(r.response_recorded_by, LAURENT.userId);
    assert.equal(n('SELECT COUNT(*) AS n FROM notification'), notes);
    assert.equal(n("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'notice.reply'"), audits);
  });

  test('US-2 Scenario 1: VFDA staff record the reply — the project members are notified and one audit row is written; the first reply time is kept', async () => {
    const { recordReply } = await notices();
    const first = notice(downloaded).responded_at;
    const audits = n("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'notice.reply'");
    await recordReply(STAFF, downloaded, { response: 'received', note: 'Công văn số 12/UBND.' });
    const r = notice(downloaded);
    assert.equal(r.response, 'received');
    assert.equal(r.response_recorded_by, STAFF.userId);
    assert.equal(r.responded_at, first, 'a correction keeps the first reply time (research OQ6)');
    assert.equal(n("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'notice.reply'"), audits + 1);
    for (const m of [LAURENT, OKAFOR]) {
      assert.ok(n("SELECT COUNT(*) AS n FROM notification WHERE recipient_id = ? AND event_type = 'province_notice.received'", [m.userId]) >= 1, m.userId);
    }
  });
});
