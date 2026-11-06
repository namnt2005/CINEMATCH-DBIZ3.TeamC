import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Verification and Article 13 routes with the Supabase fake and the in-memory file store (T038, FR-001, FR-008..FR-010).
const PARTNER = '11111111-1111-4111-8111-111111111111';
const STAFF = '22222222-2222-4222-8222-222222222222';
const MEMBER = '33333333-3333-4333-8333-333333333333';
const ORG = '44444444-4444-4444-8444-444444444444';
const PENDING_OLD = '55555555-5555-4555-8555-555555555555';
const PENDING_NEW = '66666666-6666-4666-8666-666666666666';
const DECIDED = '77777777-7777-4777-8777-777777777777';
const PDF = Buffer.from('%PDF-1.7\n');
const MB = 1024 * 1024;
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

function fakes({ user = { id: PARTNER }, rpc = {}, pending = false } = {}) {
  const tables = {
    user_account: [{ user_id: PARTNER, role: 'partner', account_status: 'active' }, { user_id: STAFF, role: 'vfda_staff', account_status: 'active' },
      { user_id: MEMBER, role: 'member', account_status: 'active' }],
    profile: [{ user_id: PARTNER, full_name: 'Lan' }],
    organisation_user: [{ org_id: ORG, user_id: PARTNER, added_at: daysAgo(100) }],
    organisation: [{ org_id: ORG, slug: 'benxua', org_name: 'Bến Xưa Production Services', legal_form: 'Công ty TNHH', founded_year: 2012, hq_province: 1,
      service_groups: ['full_production'], provinces: [1], verified_at: null, verified_until: null, art13_eligible: false, org_status: 'active' }],
    organisation_member_layer: [], organisation_private_layer: [],
    verification_request: [
      { request_id: PENDING_OLD, org_id: ORG, business_license: 'private/verification/v7/business-registration.pdf', reference_projects: ['A', 'B'], status: 'pending', submitted_at: daysAgo(9), decided_at: null, decided_by: null, reason: null },
      { request_id: PENDING_NEW, org_id: ORG, business_license: `${ORG}/verification/x.pdf`, reference_projects: ['C', 'D'], status: 'pending', submitted_at: daysAgo(2), decided_at: null, decided_by: null, reason: null },
      { request_id: DECIDED, org_id: ORG, business_license: `${ORG}/verification/y.pdf`, reference_projects: ['E', 'F'], status: 'rejected', submitted_at: daysAgo(30), decided_at: daysAgo(25), decided_by: STAFF, reason: 'Not legible' }
    ].filter(r => pending || r.request_id === DECIDED || user?.id === STAFF || user?.id === MEMBER),
    notification: [], email_delivery: []
  };
  const handlers = {
    app_submit_verification: () => ({ data: { verification_request_id: 'v-new', status: 'pending', submitted_at: '2026-11-06T09:00:00+07:00' }, error: null }),
    app_decide_verification: () => ({ data: { org_id: ORG, status: 'approved', decided_at: '2026-11-06T09:00:00+07:00', verified_at: '2026-11-06T09:00:00+07:00', verified_until: '2027-11-06' }, error: null }),
    app_set_art13: () => ({ data: { org_id: ORG, art13_eligible: true }, error: null }),
    app_save_org_profile: () => ({ data: { org_id: ORG }, error: null }),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
let memory;
async function use(options) {
  const f = fakes(options);
  await useFakes({ user: f.userClient, admin: f.admin });
  const { setOrgDocumentsForTests, memoryAdapter } = await import('../../lib/storage/org-documents.js');
  memory = memoryAdapter();
  setOrgDocumentsForTests(memory);
  return f;
}
const req = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const route = (p) => import(`../../app/api/${p}/route.js`);
const call = async (p, method, url, body, params) => (await route(p))[method](req(url, method, body), params ? { params } : undefined);

describe('Verification routes (T038)', () => {
  afterEach(async () => { (await import('../../lib/storage/org-documents.js')).setOrgDocumentsForTests(null); await resetFakes(); });

  test('partner upload URL: 200 for a PDF ≤ 25 MB; 422 otherwise; 409 while a request is pending', async () => {
    await use();
    const ok = await call('partners/me/verification/upload', 'POST', '/api/partners/me/verification/upload', { size: 2 * MB, content_type: 'application/pdf' });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.match(body.path, new RegExp(`^${ORG}/verification/`));
    assert.equal(body.expires_in, 300);
    for (const b of [{ size: 25 * MB + 1, content_type: 'application/pdf' }, { size: MB, content_type: 'image/png' }]) {
      assert.equal((await call('partners/me/verification/upload', 'POST', '/api/partners/me/verification/upload', b)).status, 422);
    }
    await resetFakes();
    await use({ pending: true });
    assert.equal((await call('partners/me/verification/upload', 'POST', '/api/partners/me/verification/upload', { size: MB, content_type: 'application/pdf' })).status, 409);
  });

  test('partner submit: 422 for references or a file that is not there; 201 with the uploaded PDF; 409 from the database', async () => {
    const { userClient } = await use();
    const path = `${ORG}/verification/11111111-1111-4111-8111-111111111111.pdf`;
    assert.equal((await call('partners/me/verification', 'POST', '/api/partners/me/verification', { path, reference_projects: ['A'] })).status, 422);
    const missing = await call('partners/me/verification', 'POST', '/api/partners/me/verification', { path, reference_projects: ['A', 'B'] });
    assert.equal(missing.status, 422);
    assert.equal((await missing.json()).error, 'FILE_INVALID');
    memory.put(path, PDF);
    const res = await call('partners/me/verification', 'POST', '/api/partners/me/verification', { path, reference_projects: ['A', 'B', ''] });
    assert.equal(res.status, 201);
    assert.deepEqual(userClient.calls.find(c => c.rpc === 'app_submit_verification').args, { p_org_id: ORG, p_license_path: path, p_references: ['A', 'B'] });
    await resetFakes();
    await use({ rpc: { app_submit_verification: fail('PENDING_EXISTS') } });
    memory.put(path, PDF);
    assert.equal((await call('partners/me/verification', 'POST', '/api/partners/me/verification', { path, reference_projects: ['A', 'B'] })).status, 409);
  });

  test('FR-001: GET /api/partners/me for the partner; PATCH refuses VFDA-only fields with 422', async () => {
    await use();
    const me = await (await call('partners/me', 'GET', '/api/partners/me')).json();
    assert.equal(me.organisation.slug, 'benxua');
    assert.equal((await call('partners/me', 'PATCH', '/api/partners/me', { verified_until: '2030-01-01' })).status, 422);
    assert.equal((await call('partners/me', 'PATCH', '/api/partners/me', { capability_desc_en: 'Updated' })).status, 200);
  });

  test('SC-36: the staff queue is staff only; pending first (oldest first); counts and the oldest pending age', async () => {
    await use({ user: { id: MEMBER } });
    assert.equal((await call('admin/verification', 'GET', '/api/admin/verification')).status, 403);
    await resetFakes();
    await use({ user: { id: STAFF } });
    const body = await (await call('admin/verification', 'GET', '/api/admin/verification?status=all')).json();
    assert.deepEqual(body.requests.map(r => r.request_id), [PENDING_OLD, PENDING_NEW, DECIDED]);
    assert.deepEqual(body.counts, { pending: 2, approved: 0, rejected: 1 });
    assert.equal(body.oldest_pending_days, 9);
    assert.equal(body.requests[0].org.org_name, 'Bến Xưa Production Services');
    assert.equal((await call('admin/verification', 'GET', '/api/admin/verification?status=maybe')).status, 422);
  });

  test('SC-36: the seed document is FILE_MISSING; a decision needs a reason to reject; Article 13 needs the confirmation', async () => {
    await use({ user: { id: STAFF } });
    const doc = await call('admin/verification/[id]/document', 'GET', `/api/admin/verification/${PENDING_OLD}/document`, undefined, { id: PENDING_OLD });
    assert.equal(doc.status, 404);
    assert.equal((await doc.json()).error, 'FILE_MISSING');
    assert.equal((await call('admin/verification/[id]/decision', 'POST', `/api/admin/verification/${PENDING_NEW}/decision`, { decision: 'rejected', reason: ' ' }, { id: PENDING_NEW })).status, 422);
    assert.equal((await call('admin/verification/[id]/decision', 'POST', `/api/admin/verification/${PENDING_NEW}/decision`, { decision: 'approved' }, { id: PENDING_NEW })).status, 200);
    assert.equal((await call('admin/organisations/[id]/art13', 'POST', `/api/admin/organisations/${ORG}/art13`, { on: true }, { id: ORG })).status, 422);
    assert.equal((await call('admin/organisations/[id]/art13', 'POST', `/api/admin/organisations/${ORG}/art13`, { on: true, business_line_confirmed: true }, { id: ORG })).status, 200);
    await resetFakes();
    await use({ user: { id: STAFF }, rpc: { app_decide_verification: fail('INVALID_STATE') } });
    assert.equal((await call('admin/verification/[id]/decision', 'POST', `/api/admin/verification/${DECIDED}/decision`, { decision: 'approved' }, { id: DECIDED })).status, 409);
  });
});
