import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Directory and profile routes with the Supabase fake (T015, FR-002..FR-006, BR-001; contracts/partners-api.contract.md).
// The fake does not simulate RLS: it returns what is in its tables, so these tests check what the code asks for and shapes.
const MEMBER = '11111111-1111-4111-8111-111111111111';
const ORG = '33333333-3333-4333-8333-333333333333';
const GONE = '44444444-4444-4444-8444-444444444444';
const TODAY_PLUS = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function fakes({ user = { id: MEMBER }, privateRows = [] } = {}) {
  const tables = {
    user_account: [{ user_id: MEMBER, role: 'member', account_status: 'active' }],
    organisation: [
      { org_id: ORG, slug: 'benxua', org_name: 'Bến Xưa Production Services', legal_form: 'Công ty TNHH', founded_year: 2012, hq_province: 1,
        service_groups: ['full_production', 'crew'], provinces: [1, 19], verified_at: '2026-06-12T11:00:00+07:00', verified_until: TODAY_PLUS(200),
        art13_eligible: true, org_status: 'active' },
      { org_id: GONE, slug: 'cuulongdrone', org_name: 'Cửu Long Drone Works', legal_form: 'Công ty TNHH', founded_year: 2018, hq_province: 30,
        service_groups: ['camera_lighting'], provinces: [30], verified_at: null, verified_until: null, art13_eligible: false, org_status: 'deactivated' }
    ],
    organisation_member_layer: [{ org_id: ORG, capability_desc_vi: 'Trọn gói', capability_desc_en: 'Full', portfolio: ['Feature (KR, 2024)'], intl_project_count: 12, working_languages: ['en', 'ko'] }],
    organisation_private_layer: privateRows,
    verification_request: [{ request_id: '55555555-5555-4555-8555-555555555555', org_id: ORG, status: 'approved', reference_projects: ['A', 'B'],
      submitted_at: '2026-06-08T14:00:00+07:00', decided_at: '2026-06-12T11:00:00+07:00' }],
    collab_request: [], project_member: []
  };
  const userClient = fakeSupabase({ user, tables });
  const admin = fakeSupabase({ user, store: userClient.tables });
  return { userClient, admin };
}
async function use(options) { const f = fakes(options); await useFakes({ user: f.userClient, admin: f.admin }); return f; }
const list = async (qs = '') => (await import('../../app/api/partners/route.js')).GET(new Request(`http://localhost:3000/api/partners${qs}`));
const profile = async (slug) => (await import('../../app/api/partners/[slug]/route.js')).GET(new Request(`http://localhost:3000/api/partners/${slug}`), { params: { slug } });

describe('Partner directory and profile routes (T015)', () => {
  afterEach(resetFakes);

  test('FR-005, FR-006: invalid filters answer 422 with their field keys', async () => {
    await use();
    for (const [qs, field] of [['?group=visa', 'group'], ['?province=abc', 'province'], ['?language=KOR', 'language'], [`?q=${'x'.repeat(81)}`, 'q'], ['?verified_only=maybe', 'verified_only']]) {
      const res = await list(qs);
      assert.equal(res.status, 422, qs);
      const body = await res.json();
      assert.equal(body.error, 'VALIDATION_ERROR');
      assert.ok(body.fields?.[field], `${qs} → fields.${field}`);
    }
  });

  test('US-1 Scenario 2 / SC-003: a guest answer has no member key at all; the member layer is not even read', async () => {
    const { userClient } = await use({ user: null });
    const res = await list('');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.organisations.length, 1, 'deactivated organisations are not listed');
    assert.equal('member' in body.organisations[0], false);
    assert.equal(userClient.calls.some(c => c.table === 'organisation_member_layer'), false);
    assert.equal(body.groups.length, 12);
  });

  test('FR-003: a signed-in member gets the member line', async () => {
    await use();
    const body = await (await list('?language=ko')).json();
    assert.deepEqual(body.organisations[0].member, { intl_project_count: 12, working_languages: ['en', 'ko'] });
    assert.equal(body.organisations[0].verified, true);
    assert.equal(body.organisations[0].verified_month, '2026-06');
  });

  test('BR-001: layers follow the rows read — no private row, no private key; a private row, a private layer', async () => {
    await use();
    let body = await (await profile('benxua')).json();
    assert.deepEqual(body.layers, { public: true, member: true, private: false });
    assert.equal('private' in body, false);
    assert.deepEqual(body.public.checked.references, ['A', 'B']);
    await resetFakes();
    await use({ privateRows: [{ org_id: ORG, rate_card: [{ item: 'Line producer', amount: 6500000, unit: 'day' }], past_clients: ['Kestrel'], direct_contact: 'Lan · +84 000 000 121' }] });
    body = await (await profile('benxua')).json();
    assert.equal(body.layers.private, true);
    assert.equal(body.private.direct_contact, 'Lan · +84 000 000 121');
  });

  test('a guest profile has the public layer only; unknown and malformed slugs are 404; deactivated shows active:false', async () => {
    await use({ user: null, privateRows: [{ org_id: ORG, rate_card: null, past_clients: null, direct_contact: 'x' }] });
    const body = await (await profile('benxua')).json();
    assert.deepEqual(body.layers, { public: true, member: false, private: false });
    assert.equal('member' in body, false);
    assert.equal('private' in body, false, 'a guest never gets the private layer, whatever the fake holds');
    assert.equal((await profile('no-such-partner')).status, 404);
    assert.equal((await profile('Bad Slug!')).status, 404);
    const gone = await (await profile('cuulongdrone')).json();
    assert.equal(gone.public.active, false);
  });
});
