import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne, query } from '../../lib/db/client.js';

// Collaboration requests on node:sqlite (T047, FR-012..FR-017, BR-005, BR-006, BR-008, BR-009). One database, tests in order:
// Lantern Street's owner sends a request to Bến Xưa, Bến Xưa accepts with its NDA, the owner ticks the NDA and confirms.
const collab = () => import('../../lib/db/collab.js');
const partners = () => import('../../lib/db/partners.js');
const user = (role, userId) => ({ role, isAuthenticated: true, userId });
const YUI = user('member', '118de3c8-88eb-5003-a2f9-26bbdd0186ae');      // owner of Lantern Street
const PARK = user('member', '4ef79de6-8efb-58f7-8514-9c0532345ac4');     // owner of The Last Ferry
const JIWOO = user('member', 'b9916111-9b75-5ab9-b88c-4d578a87cd46');    // edit member of The Last Ferry
const LAURENT = user('member', '95f36904-6141-5469-8c63-712a80a4295e');  // owner of Rice and Salt and of Harbour Lights (archived)
const OKAFOR = user('member', '2985398f-7372-5d92-a85d-117c3a4b91e4');   // view member of Rice and Salt
const LAN = user('partner', 'ccc2764e-7734-5390-9c71-46963d2f7820');     // Bến Xưa
const TUAN = user('partner', '1396ef42-92a1-55ca-bfd0-199050d5411b');    // Mekong Frame Co.
const LANTERN = '196465cf-563e-507e-aa03-b73497ac8e56';
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const HARBOUR_LIGHTS = 'a745bb54-573f-5e8f-9d99-2d7e9af46ccf';
const BEN_XUA = '67fc4355-67c0-55f3-a64b-1ad3381c6fdf';
const MEKONG = '35683fa1-af07-55a0-8bdd-276a37becc29';
const CUU_LONG = 'f3ea9e71-49a4-5129-acf1-2cb554852de9';                // deactivated
const FERRY_TO_HA_LONG = 'e038d4d1';                                    // under_review (prefix)
const RICE_TO_SONG_HAU = '7cde0a0f';                                    // info_requested; Sông Hậu's badge ended 15/08/2026 (prefix)
const LANTERN_DECLINED = '12a25226-acf2-56b5-a74f-bfa4f5c0bfa2';
const SERVICES = ['full_production'];

const seedId = (prefix) => getOne('SELECT request_id FROM collab_request WHERE request_id LIKE ?', [`${prefix}%`]).request_id;
const mark = () => Number(getOne('SELECT COALESCE(MAX(rowid), 0) AS n FROM notification').n);
const since = (m) => query('SELECT recipient_id, event_type FROM notification WHERE rowid > ? ORDER BY rowid', [m]);
const membersOf = (projectId) => query("SELECT user_id FROM project_member WHERE project_id = ? AND invite_status = 'accepted' AND user_id IS NOT NULL", [projectId]).map(r => r.user_id);
const PARTNER_USERS = [LAN.userId];                                     // the users of Bến Xưa (organisation_user, D1)
const slots = (projectId) => query('SELECT doc_code, state FROM document_slot WHERE project_id = ? ORDER BY doc_code', [projectId]);
function onePerParty(notes, eventType, projectId) {
  const recipients = notes.filter(n => n.event_type === eventType).map(n => n.recipient_id).sort();
  assert.deepEqual(recipients, [...PARTNER_USERS, ...membersOf(projectId)].sort(), `${eventType}: one notification for each party (FR-015)`);
}
let requestId;
let slotsBefore;

describe('Collaboration requests on node:sqlite (T047)', () => {
  test('US-2 Scenario 1: a request tied to a project is Sent, step 1, and each party is notified', async () => {
    const { sendRequest } = await collab();
    slotsBefore = slots(LANTERN);
    const m = mark();
    const out = await sendRequest(YUI, { project_id: LANTERN, org_id: BEN_XUA, services: SERVICES, note: 'Night market, 12 nights in Hội An.' });
    assert.equal(out.status, 'pending');
    assert.equal(out.step, 1);
    requestId = out.request_id;
    assert.ok(getOne('SELECT sent_at FROM collab_request WHERE request_id = ?', [requestId]).sent_at);
    onePerParty(since(m), 'collab_request.new', LANTERN);
    const emails = Number(getOne("SELECT COUNT(*) AS n FROM email_delivery WHERE template_id = 'collab_request.new'").n);
    assert.ok(emails >= 2, 'each notification has its queued email row');
  });

  test('FR-012 refusals: view member, archived project, deactivated partner, second open request, services, note length', async () => {
    const { sendRequest } = await collab();
    const cases = [
      [OKAFOR, { project_id: RICE, org_id: MEKONG, services: SERVICES }, 'FORBIDDEN'],
      [LAURENT, { project_id: HARBOUR_LIGHTS, org_id: MEKONG, services: SERVICES }, 'ARCHIVED'],
      [YUI, { project_id: LANTERN, org_id: CUU_LONG, services: SERVICES }, 'ORG_DEACTIVATED'],
      [YUI, { project_id: LANTERN, org_id: BEN_XUA, services: SERVICES }, 'OPEN_REQUEST_EXISTS'],
      [YUI, { project_id: LANTERN, org_id: MEKONG, services: [] }, 'VALIDATION_ERROR'],
      [YUI, { project_id: LANTERN, org_id: MEKONG, services: ['visa'] }, 'VALIDATION_ERROR'],
      [YUI, { project_id: LANTERN, org_id: MEKONG, services: SERVICES, note: 'x'.repeat(1001) }, 'VALIDATION_ERROR'],
      [LAN, { project_id: LANTERN, org_id: MEKONG, services: SERVICES }, 'FORBIDDEN']
    ];
    for (const [session, input, code] of cases) {
      await assert.rejects(() => sendRequest(session, input), (e) => e.code === code, `${code}: ${JSON.stringify(input).slice(0, 80)}`);
    }
  });

  test('BR-005: only the partner responds; accepting needs its NDA; every note is a message (BR-009)', async () => {
    const { respond } = await collab();
    for (const [session, decision] of [[YUI, 'accepted'], [YUI, 'declined'], [TUAN, 'under_review']]) {
      await assert.rejects(() => respond(session, requestId, { decision, nda_accepted: true }), (e) => e.code === 'FORBIDDEN', `${session.userId} ${decision}`);
    }
    await assert.rejects(() => respond(LAN, requestId, { decision: 'accepted' }), (e) => e.code === 'NDA_REQUIRED');
    let m = mark();
    await respond(LAN, requestId, { decision: 'under_review', note: 'Checking June 2027 availability.' });
    const first = getOne('SELECT status, responded_at FROM collab_request WHERE request_id = ?', [requestId]);
    assert.equal(first.status, 'under_review');
    assert.ok(first.responded_at);
    onePerParty(since(m), 'collab_request.under_review', LANTERN);
    m = mark();
    await respond(LAN, requestId, { decision: 'accepted', nda_accepted: true, note: 'Yes — 12 nights confirmed.' });
    const accepted = getOne('SELECT status, responded_at FROM collab_request WHERE request_id = ?', [requestId]);
    assert.equal(accepted.status, 'accepted');
    assert.equal(accepted.responded_at, first.responded_at, 'responded_at is the first response');
    onePerParty(since(m), 'collab_request.accepted', LANTERN);
    const nda = query("SELECT party, nda_version, accepted FROM nda_acceptance WHERE request_id = ?", [requestId]);
    assert.equal(nda.length, 1, 'one partner NDA row');
    assert.equal(nda[0].party, 'partner');
    assert.equal(nda[0].nda_version, 'NDA-2026.1');
    assert.match(String(nda[0].accepted), /^(1|true)$/);
    const bodies = query('SELECT body, author_id FROM collab_message WHERE request_id = ? ORDER BY created_at', [requestId]);
    assert.deepEqual(bodies.map(b => [b.author_id, b.body]), [[LAN.userId, 'Checking June 2027 availability.'], [LAN.userId, 'Yes — 12 nights confirmed.']]);
  });

  test('US-2 Scenario 2: Confirm needs the producer\'s own NDA; only the producer confirms', async () => {
    const { confirm, acceptNda, getRequest } = await collab();
    await assert.rejects(() => confirm(YUI, requestId), (e) => e.code === 'NDA_REQUIRED');
    const before = await getRequest(YUI, requestId);
    assert.equal(before.can.confirm, false);
    assert.equal(before.step, 3, 'step 3 Accepted (SC-25, five steps)');
    await assert.rejects(() => acceptNda(LAN, requestId, { nda_version: 'NDA-2026.1', accepted: true }), (e) => e.code === 'FORBIDDEN', 'the partner already accepted on its side');
    await assert.rejects(() => acceptNda(YUI, requestId, { nda_version: 'NDA-2026.1', accepted: false }), (e) => e.code === 'VALIDATION_ERROR', 'no decline body (analysis U3)');
    await acceptNda(YUI, requestId, { nda_version: 'NDA-2026.1', accepted: true });
    const view = await getRequest(YUI, requestId);
    assert.deepEqual(view.nda, { version: 'NDA-2026.1', producer: true, partner: true });
    assert.equal(view.can.confirm, true);
    assert.equal(view.step, 4, 'step 4 NDA agreed');
    await assert.rejects(() => confirm(LAN, requestId), (e) => e.code === 'FORBIDDEN', 'the partner cannot confirm');
  });

  test('US-2 Scenario 3 / BR-006: confirmed, both parties notified, Partners gauge 100, dossier untouched, component c pending', async () => {
    const { confirm, getRequest } = await collab();
    const m = mark();
    const out = await confirm(YUI, requestId);
    assert.equal(out.status, 'confirmed');
    assert.ok(out.confirmed_at);
    onePerParty(since(m), 'collab_request.confirmed', LANTERN);
    assert.equal(Number(getOne('SELECT partners_score FROM v_project_readiness WHERE project_id = ?', [LANTERN]).partners_score), 100);
    assert.deepEqual(slots(LANTERN), slotsBefore, 'no document_slot row changed (BR-006)');
    const view = await getRequest(YUI, requestId);
    assert.equal(view.step, 5, 'step 5 Confirmed');
    assert.equal(view.final, true);
    assert.equal(view.component_c, 'pending');
  });

  test('BR-005: on a confirmed or declined request every action is refused', async () => {
    const { respond, confirm, withdraw, acceptNda } = await collab();
    for (const id of [requestId, LANTERN_DECLINED]) {
      await assert.rejects(() => respond(LAN, id, { decision: 'under_review' }), (e) => ['INVALID_STATE', 'FORBIDDEN'].includes(e.code), `respond ${id}`);
      await assert.rejects(() => withdraw(YUI, id, {}), (e) => e.code === 'INVALID_STATE', `withdraw ${id}`);
      await assert.rejects(() => confirm(YUI, id), (e) => e.code === 'INVALID_STATE', `confirm ${id}`);
      await assert.rejects(() => acceptNda(YUI, id, { nda_version: 'NDA-2026.1', accepted: true }), (e) => e.code === 'INVALID_STATE', `nda ${id}`);
    }
    assert.equal(getOne('SELECT status FROM collab_request WHERE request_id = ?', [requestId]).status, 'confirmed');
  });

  test('BR-005: the producer withdraws an open request; the partner cannot; each party is notified', async () => {
    const { sendRequest, withdraw } = await collab();
    const { request_id: toMekong } = await sendRequest(YUI, { project_id: LANTERN, org_id: MEKONG, services: ['crew'] });
    await assert.rejects(() => withdraw(TUAN, toMekong, {}), (e) => e.code === 'FORBIDDEN');
    assert.equal((await withdraw(YUI, toMekong, { note: 'Crew found locally.' })).status, 'withdrawn');
    const m = mark();
    assert.equal((await withdraw(PARK, seedId(FERRY_TO_HA_LONG), {})).status, 'withdrawn', 'from under_review');
    const recipients = since(m).filter(n => n.event_type === 'collab_request.withdrawn').map(n => n.recipient_id);
    for (const id of membersOf(FERRY)) assert.ok(recipients.includes(id), `Ferry member ${id} notified`);
  });

  test('§3 edge case (analysis C2): the badge expired during the open request to Sông Hậu — the request continues', async () => {
    const { getRequest, postMessage, withdraw } = await collab();
    const id = seedId(RICE_TO_SONG_HAU);
    const view = await getRequest(LAURENT, id);
    assert.equal(view.status, 'info_requested');
    assert.equal(view.organisation.verified, false);
    const msg = await postMessage(LAURENT, id, { body: 'Here are the dates you asked for.' });
    assert.ok(msg.message_id);
    assert.equal((await withdraw(LAURENT, id, {})).status, 'withdrawn', 'from info_requested');
  });

  test('BR-009: messages by either side, 1–2000 characters, listed in order with their side; never editable', async () => {
    const { postMessage, getRequest } = await collab();
    const ferry = seedId('0bf889da'); // The Last Ferry → Bến Xưa, accepted
    for (const body of ['', '   ', 'x'.repeat(2001)]) {
      await assert.rejects(() => postMessage(JIWOO, ferry, { body }), (e) => e.code === 'VALIDATION_ERROR', `${body.length} characters`);
    }
    await postMessage(JIWOO, ferry, { body: 'Can we visit Tràng An on 3 March?' });
    await postMessage(LAN, ferry, { body: 'Yes, 9:00 at the pier.' });
    const { messages } = await getRequest(PARK, ferry);
    assert.deepEqual(messages.slice(-2).map(m => [m.author, m.body]), [['producer', 'Can we visit Tràng An on 3 March?'], ['partner', 'Yes, 9:00 at the pier.']]);
    assert.throws(() => query("UPDATE collab_message SET body = 'edited' WHERE request_id = ?", [ferry]), /BR-009/);
  });

  test('BR-008: deactivating Bến Xưa needs its exact name, withdraws its open requests, notifies their projects and deletes nothing', async () => {
    const { deactivateOrg } = await partners();
    const name = getOne('SELECT org_name FROM organisation WHERE org_id = ?', [BEN_XUA]).org_name;
    await assert.rejects(() => deactivateOrg(LAN, { typed_name: 'Ben Xua' }), (e) => e.code === 'VALIDATION_ERROR');
    const open = query("SELECT request_id, project_id FROM collab_request WHERE org_id = ? AND status IN ('pending', 'under_review', 'info_requested', 'accepted')", [BEN_XUA]);
    assert.ok(open.length >= 1, 'The Last Ferry\'s accepted request is open');
    const logs = Number(getOne('SELECT COUNT(*) AS n FROM document_access_log').n);
    const m = mark();
    const out = await deactivateOrg(LAN, { typed_name: name });
    assert.equal(out.org_status, 'deactivated');
    assert.equal(out.withdrawn, open.length);
    for (const r of open) assert.equal(getOne('SELECT status FROM collab_request WHERE request_id = ?', [r.request_id]).status, 'withdrawn');
    const notified = since(m).filter(n => n.event_type === 'collab_request.withdrawn').map(n => n.recipient_id);
    for (const r of open) for (const id of membersOf(r.project_id)) assert.ok(notified.includes(id), `member ${id} notified`);
    assert.equal(getOne('SELECT COUNT(*) AS n FROM organisation WHERE org_id = ?', [BEN_XUA]).n, 1, 'never deleted');
    assert.equal(Number(getOne('SELECT COUNT(*) AS n FROM document_access_log').n), logs, 'access log kept');
  });
});
