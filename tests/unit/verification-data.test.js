import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne, query } from '../../lib/db/client.js';

// VFDA Verified and the Article 13 flag on node:sqlite with the in-memory file store (T036, FR-008..FR-011, BR-004, Q2, Q3).
// One database, tests in order: Bến Xưa submits and is approved; Mekong Frame's pending request is rejected.
const verification = () => import('../../lib/db/verification.js');
const storage = () => import('../../lib/storage/org-documents.js');
const badge = () => import('../../lib/partners/badge.js');
const user = (role, userId) => ({ role, isAuthenticated: true, userId });
const LAN = user('partner', 'ccc2764e-7734-5390-9c71-46963d2f7820');    // Bến Xưa Production Services
const TUAN = user('partner', '1396ef42-92a1-55ca-bfd0-199050d5411b');   // Mekong Frame Co. (a request is pending)
const KHAI = user('partner', '51cb9dcd-186a-5a75-86a7-83164edf55c4');   // Đò Ngang Film Services
const STAFF = user('vfda_staff', '515529a9-46d9-559c-aab4-e5fb31eedeea');
const ADMIN = user('admin', 'dffdeb6f-0d86-5bd0-8d0e-85962427b1d2');
const YUI = user('member', '118de3c8-88eb-5003-a2f9-26bbdd0186ae');
const BEN_XUA = '67fc4355-67c0-55f3-a64b-1ad3381c6fdf';
const MEKONG = '35683fa1-af07-55a0-8bdd-276a37becc29';
const DO_NGANG = '42686fb9-acaf-5285-a364-b1b900a96f41';
const SAIGON = 'fe417755-4e37-5f18-bebe-f23e2293ff55';           // art13_eligible false, verified until 2027-02-10
const MEKONG_PENDING = '1e79632d';                               // prefix of the seed pending request
const BEN_XUA_APPROVED = '1c6903f3';                             // prefix of Bến Xưa's approved 2026 request
const SUBMITTED = '2026-11-05T15:00:00+07:00';                   // submitted the day before the decision (ck_verification_request_order, D6)
const NOW = '2026-11-06T09:00:00+07:00';
const PDF = Buffer.from('%PDF-1.7\n% test registration\n');
const REFS = ['Seoul Night (KR, 2024)', 'Blue River (FR, 2025)'];

const count = (sql, params = []) => Number(getOne(sql, params).n);
const audits = (action) => count('SELECT COUNT(*) AS n FROM audit_log WHERE action = ?', [action]);
const requestId = (prefix) => getOne('SELECT request_id FROM verification_request WHERE request_id LIKE ?', [`${prefix}%`]).request_id;
const notificationsOf = (userId, eventType) => query('SELECT * FROM notification WHERE recipient_id = ? AND event_type = ?', [userId, eventType]);
let memory;
let benXuaRequest;
// The in-memory file store, set once for the whole file (inside a test, so a missing module fails that test instead of cancelling all)
async function fileStore() {
  if (!memory) {
    const { setOrgDocumentsForTests, memoryAdapter } = await storage();
    memory = memoryAdapter();
    setOrgDocumentsForTests(memory);
  }
  return memory;
}

describe('VFDA Verified on node:sqlite (T036)', () => {
  test('FR-008: submitting needs the uploaded PDF under the organisation\'s folder and two non-empty references', async () => {
    const { submitVerification } = await verification();
    await fileStore();
    const good = `${BEN_XUA}/verification/11111111-1111-4111-8111-111111111111.pdf`;
    memory.put(good, PDF);
    memory.put(`${BEN_XUA}/verification/22222222-2222-4222-8222-222222222222.pdf`, Buffer.from('not a pdf'));
    memory.put(`${MEKONG}/verification/33333333-3333-4333-8333-333333333333.pdf`, PDF);
    for (const path of [`${BEN_XUA}/verification/22222222-2222-4222-8222-222222222222.pdf`, `${MEKONG}/verification/33333333-3333-4333-8333-333333333333.pdf`,
      `${BEN_XUA}/verification/99999999-9999-4999-8999-999999999999.pdf`]) {
      await assert.rejects(() => submitVerification(LAN, { path, reference_projects: REFS }, { now: NOW }), (e) => e.code === 'FILE_INVALID', path);
    }
    await assert.rejects(() => submitVerification(LAN, { path: good, reference_projects: ['Only one', '  ', ''] }, { now: NOW }),
      (e) => e.code === 'VALIDATION_ERROR');
    await assert.rejects(() => submitVerification(YUI, { path: good, reference_projects: REFS }, { now: NOW }), (e) => e.code === 'FORBIDDEN');
    const staffBefore = notificationsOf(STAFF.userId, 'verification.submitted').length;
    const out = await submitVerification(LAN, { path: good, reference_projects: [...REFS, ''] }, { now: SUBMITTED });
    assert.equal(out.status, 'pending');
    benXuaRequest = out.verification_request_id;
    const row = getOne('SELECT * FROM verification_request WHERE request_id = ?', [benXuaRequest]);
    assert.equal(row.business_license, good);
    assert.deepEqual(JSON.parse(row.reference_projects), REFS, 'empty rows are ignored');
    assert.ok(row.submitted_at);
    assert.ok(!row.decided_at);
    assert.equal(notificationsOf(STAFF.userId, 'verification.submitted').length, staffBefore + 1, 'staff notified');
  });

  test('SR-332: one pending request per organisation', async () => {
    const { submitVerification } = await verification();
    await fileStore();
    const p = `${MEKONG}/verification/33333333-3333-4333-8333-333333333333.pdf`;
    await assert.rejects(() => submitVerification(TUAN, { path: p, reference_projects: REFS }, { now: NOW }), (e) => e.code === 'PENDING_EXISTS');
  });

  test('US-3 Scenario 1 / BR-004: approval gives a badge from the decision day, valid 12 months and gone the day after', async () => {
    const { decideVerification } = await verification();
    const { isVerified } = await badge();
    const approvals = audits('org.verify.approve');
    await decideVerification(STAFF, benXuaRequest, { decision: 'approved' }, { now: NOW });
    const req = getOne('SELECT * FROM verification_request WHERE request_id = ?', [benXuaRequest]);
    assert.equal(req.status, 'approved');
    assert.equal(req.decided_by, STAFF.userId);
    assert.ok(req.decided_at);
    const org = getOne('SELECT verified_at, verified_until FROM organisation WHERE org_id = ?', [BEN_XUA]);
    assert.equal(org.verified_at, req.decided_at);
    assert.equal(org.verified_until, '2027-11-06');
    assert.equal(isVerified(org, '2027-11-06'), true);
    assert.equal(isVerified(org, '2027-11-07'), false, 'expires after 12 months');
    assert.equal(audits('org.verify.approve'), approvals + 1, 'one audit row');
    assert.equal(notificationsOf(LAN.userId, 'verification.approved').length, 1);
  });

  test('US-3 Scenario 2: a rejection needs a reason, which is sent to the partner; one audit row', async () => {
    const { decideVerification } = await verification();
    const id = requestId(MEKONG_PENDING);
    await assert.rejects(() => decideVerification(STAFF, id, { decision: 'rejected', reason: '   ' }, { now: NOW }), (e) => e.code === 'VALIDATION_ERROR');
    assert.equal(getOne('SELECT status FROM verification_request WHERE request_id = ?', [id]).status, 'pending');
    const rejections = audits('org.verify.reject');
    await decideVerification(STAFF, id, { decision: 'rejected', reason: 'The certificate is not legible.' }, { now: NOW });
    const req = getOne('SELECT * FROM verification_request WHERE request_id = ?', [id]);
    assert.equal(req.status, 'rejected');
    assert.equal(req.reason, 'The certificate is not legible.');
    assert.equal(audits('org.verify.reject'), rejections + 1);
    const [n] = notificationsOf(TUAN.userId, 'verification.rejected');
    assert.equal(JSON.parse(n.payload).reason, 'The certificate is not legible.');
  });

  test('FR-010: only a pending request is decided, and only by VFDA staff or an admin', async () => {
    const { decideVerification } = await verification();
    await assert.rejects(() => decideVerification(STAFF, requestId(BEN_XUA_APPROVED), { decision: 'rejected', reason: 'x' }, { now: NOW }), (e) => e.code === 'INVALID_STATE');
    for (const session of [YUI, LAN, TUAN]) {
      await assert.rejects(() => decideVerification(session, benXuaRequest, { decision: 'approved' }, { now: NOW }), (e) => e.code === 'FORBIDDEN', session.role);
    }
  });

  test('Q3: art13_eligible needs both conditions — VFDA staff (or admin) and the film-service business line confirmed', async () => {
    const { setArt13 } = await verification();
    const flag = () => String(getOne('SELECT art13_eligible AS f FROM organisation WHERE org_id = ?', [SAIGON]).f);
    const on = audits('organisation.art13_on');
    await assert.rejects(() => setArt13(STAFF, SAIGON, { on: true }), (e) => e.code === 'VALIDATION_ERROR', 'staff without the business-line check');
    await assert.rejects(() => setArt13(STAFF, SAIGON, { on: true, business_line_confirmed: false }), (e) => e.code === 'VALIDATION_ERROR');
    for (const session of [LAN, YUI]) {
      await assert.rejects(() => setArt13(session, SAIGON, { on: true, business_line_confirmed: true }), (e) => e.code === 'FORBIDDEN', `${session.role} with the check`);
    }
    assert.match(flag(), /^(false|0)$/, 'unchanged by every refusal');
    assert.equal(audits('organisation.art13_on'), on);
    await setArt13(STAFF, SAIGON, { on: true, business_line_confirmed: true });
    assert.match(flag(), /^(true|1)$/);
    assert.equal(audits('organisation.art13_on'), on + 1);
    const off = audits('organisation.art13_off');
    await setArt13(ADMIN, SAIGON, { on: false });
    assert.match(flag(), /^(false|0)$/, 'switching off needs no confirmation');
    assert.equal(audits('organisation.art13_off'), off + 1);
  });

  test('FR-011: the users of an organisation whose badge ends within 30 days are reminded once', async () => {
    const { remindExpiringVerifications } = await verification();
    // On 01/03/2027 only Đò Ngang (until 20/03/2027) is within 30 days; Saigon Line Crew ended 10/02/2027, Hạ Long Marine ends 02/04/2027
    // The seed already holds one reminder of Đò Ngang's previous badge (18/02/2026): count from here
    const before = notificationsOf(KHAI.userId, 'verification.expiring').length;
    assert.equal(await remindExpiringVerifications({ today: '2027-03-01' }), 1);
    const [latest] = notificationsOf(KHAI.userId, 'verification.expiring').slice(-1);
    assert.equal(notificationsOf(KHAI.userId, 'verification.expiring').length, before + 1);
    assert.equal(JSON.parse(latest.payload).verified_until, '2027-03-20', 'the reminder names the badge it is about');
    assert.equal(await remindExpiringVerifications({ today: '2027-03-01' }), 0, 'a second run reminds nobody');
    assert.equal(notificationsOf(KHAI.userId, 'verification.expiring').length, before + 1);
    assert.equal(getOne('SELECT verified_until FROM organisation WHERE org_id = ?', [DO_NGANG]).verified_until, '2027-03-20', 'the reminder changes no date');
  });
});
