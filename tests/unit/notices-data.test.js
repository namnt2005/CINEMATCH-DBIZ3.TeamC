import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { query, getOne } from '../../lib/db/client.js';

// Provincial notices on node:sqlite (T012, FR-001, FR-002, BR-001, BR-002, D5, D7, R1, R6).
// Tests run in order on one database: the Rice and Salt notice goes draft → submitted → changes → approved → downloaded.
const notices = () => import('../../lib/db/notices.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const LAURENT = member('95f36904-6141-5469-8c63-712a80a4295e');  // owner of Rice and Salt and of Harbour Lights (archived)
const OKAFOR = member('2985398f-7372-5d92-a85d-117c3a4b91e4');   // view member of Rice and Salt
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');     // owner of The Last Ferry and Monsoon Signal
const TANAKA = member('118de3c8-88eb-5003-a2f9-26bbdd0186ae');   // not on Rice and Salt
const STAFF = { role: 'vfda_staff', isAuthenticated: true, userId: '515529a9-46d9-559c-aab4-e5fb31eedeea' };
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const MONSOON = 'f1419149-4224-59e3-84d5-0697a882957c';         // no first shooting day
const HARBOUR_LIGHTS = 'a745bb54-573f-5e8f-9d99-2d7e9af46ccf';  // archived
const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e';        // Ninh Bình, authority contact with email
const TAM_COC = '29b80495-6dbd-5d4f-b320-96ae8ccf0729';         // Ninh Bình, authority contact without email
const PHONG_NHA = '980bcd8e-75c9-5cda-8b31-049fa39f9109';       // Quảng Trị, authority contact without email
const HA_LONG = '0889fb2d-3178-5598-93ae-3e3693dbe58a';         // Quảng Ninh, authority contact with email
const count = (sql, params = []) => Number(getOne(sql, params).n);
const audits = (action) => count('SELECT COUNT(*) AS n FROM audit_log WHERE action = ?', [action]);
let emailsAtStart;
let riceNotice;
let monsoonNotice;

describe('Notices on node:sqlite (T012)', () => {
  before(() => { emailsAtStart = count('SELECT COUNT(*) AS n FROM email_delivery'); });

  test('US-1 Scenario 1: an interest drafts the Ninh Bình notice from the project data, at step 1', async () => {
    // The spec names The Last Ferry, which already has a downloaded Ninh Bình letter in the seed (analysis I3)
    const { expressInterest } = await notices();
    const result = await expressInterest(LAURENT, RICE, { location_id: TRANG_AN });
    assert.equal(result.created, true);
    riceNotice = result.notice_id;
    const n = getOne('SELECT * FROM province_notice WHERE interest_id = ?', [riceNotice]);
    assert.equal(n.review_status, 'draft');
    assert.equal(Number(n.province_id), 19);
    assert.ok(n.drafted_at);
    assert.ok(n.project_summary.includes('Rice and Salt'), 'summary from the project data');
    assert.equal(n.delivery_status, null);
  });

  test('D5: one notice per province per project — a second Ninh Bình location joins the same notice', async () => {
    const { expressInterest } = await notices();
    const result = await expressInterest(LAURENT, RICE, { location_id: TAM_COC });
    assert.equal(result.created, false);
    assert.equal(result.notice_id, riceNotice);
    assert.equal(count(`SELECT COUNT(*) AS n FROM province_notice n JOIN location_interest i ON i.interest_id = n.interest_id
      WHERE i.project_id = ? AND n.province_id = 19`, [RICE]), 1);
    assert.equal(count('SELECT COUNT(*) AS n FROM location_interest WHERE project_id = ? AND location_id = ?', [RICE, TAM_COC]), 1, 'the interest is stored');
  });

  test('D5: a province whose letter was already downloaded gets no second notice (ALREADY_SENT)', async () => {
    const { expressInterest } = await notices();
    await assert.rejects(expressInterest(PARK, FERRY, { location_id: TRANG_AN }), { code: 'ALREADY_SENT' });
  });

  test('Research OQ5 (decided 06/11/2026): a location whose authority contact has no email still gets a notice; the email stays empty', async () => {
    const { expressInterest } = await notices();
    const result = await expressInterest(LAURENT, RICE, { location_id: PHONG_NHA });
    assert.equal(result.created, true);
    assert.equal(getOne('SELECT authority_email FROM province_notice WHERE interest_id = ?', [result.notice_id]).authority_email, null);
  });

  test('R9: view → FORBIDDEN; archived project → ARCHIVED; non-member → NOT_FOUND', async () => {
    const { expressInterest } = await notices();
    await assert.rejects(expressInterest(OKAFOR, RICE, { location_id: HA_LONG }), { code: 'FORBIDDEN' });
    await assert.rejects(expressInterest(LAURENT, HARBOUR_LIGHTS, { location_id: HA_LONG }), { code: 'ARCHIVED' });
    await assert.rejects(expressInterest(TANAKA, RICE, { location_id: HA_LONG }), { code: 'NOT_FOUND' });
  });

  test('US-1 Scenario 2: without a first shooting day the notice cannot go to review (SHOOT_DATE_REQUIRED)', async () => {
    const { expressInterest, submitNotice } = await notices();
    monsoonNotice = (await expressInterest(PARK, MONSOON, { location_id: HA_LONG })).notice_id;
    await assert.rejects(submitNotice(PARK, monsoonNotice), { code: 'SHOOT_DATE_REQUIRED' });
    assert.equal(getOne('SELECT review_status FROM province_notice WHERE interest_id = ?', [monsoonNotice]).review_status, 'draft');
  });

  test('BR-001: a member cannot download or record a notice that VFDA has not approved', async () => {
    const { getApprovedLetter, markDownloaded } = await notices();
    await assert.rejects(getApprovedLetter(LAURENT, riceNotice, { recipient: 'peoples_committee' }), { code: 'NOT_FOUND' });
    await assert.rejects(markDownloaded(LAURENT, riceNotice, { recipient: 'peoples_committee' }), { code: 'NOT_FOUND' });
    assert.equal(getOne('SELECT sent_at FROM province_notice WHERE interest_id = ?', [riceNotice]).sent_at, null);
  });

  test('R1: the owner asks VFDA to review — submitted', async () => {
    const { submitNotice } = await notices();
    await submitNotice(LAURENT, riceNotice);
    assert.equal(getOne('SELECT review_status FROM province_notice WHERE interest_id = ?', [riceNotice]).review_status, 'submitted');
  });

  test('R6: only VFDA staff review, only a submitted notice, and a request for changes needs a note — refusals write no audit row', async () => {
    const { reviewNotice } = await notices();
    const before = audits('notice.approve') + audits('notice.request_changes');
    await assert.rejects(reviewNotice(LAURENT, riceNotice, { decision: 'approve' }), { code: 'FORBIDDEN' });
    await assert.rejects(reviewNotice(STAFF, monsoonNotice, { decision: 'approve' }), { code: 'INVALID_STATE' });
    await assert.rejects(reviewNotice(STAFF, riceNotice, { decision: 'request_changes', note: '' }), { code: 'NOTE_REQUIRED' });
    assert.equal(audits('notice.approve') + audits('notice.request_changes'), before);
  });

  test('R6: a request for changes keeps the note, writes one audit row and notifies the project members', async () => {
    const { reviewNotice } = await notices();
    const before = audits('notice.request_changes');
    await reviewNotice(STAFF, riceNotice, { decision: 'request_changes', note: 'Add the crew size and the dates in Ninh Bình.' });
    const n = getOne('SELECT review_status, review_note FROM province_notice WHERE interest_id = ?', [riceNotice]);
    assert.deepEqual({ ...n }, { review_status: 'changes_requested', review_note: 'Add the crew size and the dates in Ninh Bình.' });
    assert.equal(audits('notice.request_changes'), before + 1);
    const row = getOne("SELECT admin_id, target_id FROM audit_log WHERE action = 'notice.request_changes' ORDER BY logged_at DESC LIMIT 1");
    assert.deepEqual({ ...row }, { admin_id: STAFF.userId, target_id: riceNotice });
    for (const m of [LAURENT, OKAFOR]) {
      assert.ok(count("SELECT COUNT(*) AS n FROM notification WHERE recipient_id = ? AND event_type = 'province_notice.changes_requested'", [m.userId]) >= 1, m.userId);
    }
  });

  test('BR-001: VFDA staff approve after the resubmission — one more audit row; the notice is ready to download', async () => {
    const { submitNotice, reviewNotice } = await notices();
    await submitNotice(LAURENT, riceNotice);
    const before = audits('notice.approve');
    await reviewNotice(STAFF, riceNotice, { decision: 'approve' });
    const n = getOne('SELECT review_status, reviewed_by, delivery_status FROM province_notice WHERE interest_id = ?', [riceNotice]);
    assert.deepEqual({ ...n }, { review_status: 'approved', reviewed_by: STAFF.userId, delivery_status: 'queued' });
    assert.equal(audits('notice.approve'), before + 1);
  });

  test('D7: once approved, every member downloads the letter (with the BR-002 sentence); reading changes nothing', async () => {
    const { getApprovedLetter } = await notices();
    const before = { ...getOne('SELECT * FROM province_notice WHERE interest_id = ?', [riceNotice]) };
    for (const who of [LAURENT, OKAFOR]) {
      const { letter } = await getApprovedLetter(who, riceNotice, { recipient: 'culture_department' });
      assert.ok(letter.paragraphs.some(p => p.text.includes('Thư này không thay thế giấy phép quay phim')), 'BR-002');
    }
    assert.deepEqual({ ...getOne('SELECT * FROM province_notice WHERE interest_id = ?', [riceNotice]) }, before);
  });

  test('D7: only owner / edit record the first download, with the recipient; later calls change nothing', async () => {
    const { markDownloaded } = await notices();
    await assert.rejects(markDownloaded(OKAFOR, riceNotice, { recipient: 'culture_department' }), { code: 'FORBIDDEN' });
    await markDownloaded(LAURENT, riceNotice, { recipient: 'culture_department' });
    const first = { ...getOne('SELECT recipient, delivery_status, sent_at FROM province_notice WHERE interest_id = ?', [riceNotice]) };
    assert.equal(first.recipient, 'culture_department');
    assert.equal(first.delivery_status, 'downloaded');
    assert.ok(first.sent_at);
    await markDownloaded(LAURENT, riceNotice, { recipient: 'peoples_committee' });
    assert.deepEqual({ ...getOne('SELECT recipient, delivery_status, sent_at FROM province_notice WHERE interest_id = ?', [riceNotice]) }, first);
  });

  test('BR-001: through all of the above, no email went to a province — only member notifications (SYS FR-008) were queued', () => {
    assert.ok(riceNotice && monsoonNotice, 'the notice flow above ran');
    assert.ok(getOne('SELECT sent_at FROM province_notice WHERE interest_id = ?', [riceNotice])?.sent_at, 'the letter was downloaded');
    const fresh = query('SELECT template_id, recipient_email FROM email_delivery').slice(emailsAtStart);
    const authorities = new Set(query('SELECT authority_email FROM province_notice WHERE authority_email IS NOT NULL').map(r => r.authority_email));
    const members = new Set(query(`SELECT ua.email FROM project_member pm JOIN user_account ua ON ua.user_id = pm.user_id WHERE pm.project_id = ?`, [RICE]).map(r => r.email));
    for (const e of fresh) {
      assert.ok(!authorities.has(e.recipient_email), `an email to a province authority: ${e.recipient_email}`);
      assert.match(e.template_id, /^province_notice\./, e.template_id);
      assert.ok(members.has(e.recipient_email), `an email to someone outside the project: ${e.recipient_email}`);
    }
  });
});
