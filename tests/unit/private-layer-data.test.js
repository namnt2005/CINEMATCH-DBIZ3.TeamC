import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne } from '../../lib/db/client.js';

// The private layer on node:sqlite (T055, FR-004, FR-017, BR-001, US-4 Scenario 1). One database, tests in order.
const partners = () => import('../../lib/db/partners.js');
const collab = () => import('../../lib/db/collab.js');
const TODAY = '2026-11-06';
const user = (role, userId) => ({ role, isAuthenticated: true, userId });
const GUEST = { role: 'guest', isAuthenticated: false, userId: null };
const PARK = user('member', '4ef79de6-8efb-58f7-8514-9c0532345ac4');     // owner of The Last Ferry
const JIWOO = user('member', 'b9916111-9b75-5ab9-b88c-4d578a87cd46');    // edit member of The Last Ferry only
const YUI = user('member', '118de3c8-88eb-5003-a2f9-26bbdd0186ae');      // owner of Lantern Street, no request to Bến Xưa
const LAURENT = user('member', '95f36904-6141-5469-8c63-712a80a4295e');  // owner of Rice and Salt
const LAN = user('partner', 'ccc2764e-7734-5390-9c71-46963d2f7820');     // Bến Xưa
const BEN_XUA = '67fc4355-67c0-55f3-a64b-1ad3381c6fdf';
const SONG_HAU = 'f6218fa2-afe1-5d13-8851-312e145b3399';
const LANTERN = '196465cf-563e-507e-aa03-b73497ac8e56';
const slug = (orgId) => getOne('SELECT slug FROM organisation WHERE org_id = ?', [orgId]).slug;
const privateOf = async (session, orgId) => (await (await partners()).getProfile(session, slug(orgId), { today: TODAY })).private;
let requestId;

describe('Private layer on node:sqlite (T055)', () => {
  test('seed: The Last Ferry\'s members read Bến Xưa\'s private layer (accepted, both NDA rows); Bến Xưa reads its own', async () => {
    assert.equal(getOne("SELECT status FROM collab_request WHERE request_id LIKE '0bf889da%'").status, 'accepted');
    for (const session of [PARK, JIWOO, LAN]) {
      const p = await privateOf(session, BEN_XUA);
      assert.ok(p, session.userId);
      assert.ok(p.rate_card && Object.keys(p.rate_card).length > 0, 'rate card');
      assert.ok('past_clients' in p && 'direct_contact' in p);
    }
  });

  test('BR-001: a member of another project and a guest read none of it', async () => {
    assert.equal(await privateOf(YUI, BEN_XUA), undefined);
    assert.equal(await privateOf(GUEST, BEN_XUA), undefined);
  });

  test('a declined NDA row (seed, accepted = false) opens nothing', async () => {
    const row = getOne("SELECT accepted FROM nda_acceptance WHERE request_id LIKE '7cde0a0f%' AND party = 'producer'");
    assert.equal(String(row.accepted), 'false');
    assert.equal(await privateOf(LAURENT, SONG_HAU), undefined);
  });

  test('US-4 Scenario 1: accepted by the partner, the layer is closed until the producer accepts the NDA, then opens', async () => {
    const { sendRequest, respond, acceptNda } = await collab();
    requestId = (await sendRequest(YUI, { project_id: LANTERN, org_id: BEN_XUA, services: ['crew'] })).request_id;
    await respond(LAN, requestId, { decision: 'accepted', nda_accepted: true });
    assert.equal(await privateOf(YUI, BEN_XUA), undefined, 'the partner NDA alone is not enough');
    await acceptNda(YUI, requestId, { nda_version: 'NDA-2026.1', accepted: true });
    const p = await privateOf(YUI, BEN_XUA);
    assert.ok(p && Object.keys(p.rate_card || {}).length > 0 && p.past_clients.length > 0 && p.direct_contact);
  });

  test('a request that becomes withdrawn closes the layer again', async () => {
    const { withdraw } = await collab();
    assert.equal((await withdraw(YUI, requestId, {})).status, 'withdrawn');
    assert.equal(await privateOf(YUI, BEN_XUA), undefined);
  });
});
