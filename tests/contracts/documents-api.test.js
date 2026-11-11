import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// SC-26 routes with the Supabase fake and the in-memory store (T016; contracts/documents-api.contract.md; FR-001..FR-003,
// BR-003, BR-004, Q1, SR-153, SR-154, edge cases of spec §3; analysis G1, U3).
const OWNER = '11111111-1111-4111-8111-111111111111';
const VIEWER = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const ARCHIVED = '55555555-5555-4555-8555-555555555555';
const LOC = '66666666-6666-4666-8666-666666666666';
const DOC = '77777777-7777-4777-8777-777777777777';
const MB = 1024 * 1024;
const PDF = 'application/pdf';
const T = (doc_code, basis, segments, requirement_code = null) => ({ doc_code, name_vi: `${doc_code} vi`, name_en: `${doc_code} en`, basis,
  template_url: `https://storage.cinematch.example/templates/${doc_code.toLowerCase()}.docx`, segments, requirement_code, awaiting_confirmation: segments.includes('C') });
const A13 = ['A13_APPLICATION', 'A13_SCRIPT_VI', 'A13_SERVICE_AGREEMENT', 'A13_ART9_COMMITMENT'];

let store;
async function use(user, rpc = {}) {
  const tables = {
    user_account: [OWNER, VIEWER, OTHER].map(user_id => ({ user_id, role: 'member', account_status: 'active', full_name: 'Test' })),
    project: [{ project_id: PROJECT, project_name: 'The Last Ferry', segment: 'A', stage: 'preparing' }, { project_id: ARCHIVED, project_name: 'Old', segment: 'A', stage: 'archived' }],
    project_member: [{ project_id: PROJECT, user_id: OWNER, permission: 'owner', invite_status: 'accepted' }, { project_id: PROJECT, user_id: VIEWER, permission: 'view', invite_status: 'accepted' },
      { project_id: ARCHIVED, user_id: OWNER, permission: 'owner', invite_status: 'accepted' }],
    segment_requirement: [{ segment: 'A', requirement_code: 'ART13_LICENCE', needed: true }, { segment: 'A', requirement_code: 'VN_SERVICE_AGREEMENT', needed: true },
      { segment: 'C', requirement_code: 'SERVICE_CONTRACT', needed: true }],
    document_type: [...A13.map(c => T(c, 'law', ['A', 'B'], c === 'A13_SERVICE_AGREEMENT' ? 'VN_SERVICE_AGREEMENT' : 'ART13_LICENCE')),
      T('FOREIGN_CREW_LIST', 'common', ['A', 'B']), T('PROVINCIAL_NOTICE_COPY', 'common', ['A', 'B']), T('HERITAGE_SITE_PERMIT', 'location', ['A', 'B']),
      T('SERVICE_CONTRACT_C', 'common', ['C'], 'SERVICE_CONTRACT')],
    project_shortlist: [{ shortlist_id: 'sl1', project_id: PROJECT, location_id: LOC, role: 'primary' }],
    location_document_type: [{ location_id: LOC, doc_code: 'HERITAGE_SITE_PERMIT' }],
    document_slot: [{ project_id: PROJECT, doc_code: 'A13_APPLICATION', state: 'present' }],
    document: [{ document_id: DOC, project_id: PROJECT, doc_code: 'A13_APPLICATION', file_path: `${PROJECT}/A13_APPLICATION/00000000-0000-4000-8000-000000000001.pdf`, version: 1, uploaded_by: OWNER, uploaded_at: '2026-11-01T10:00:00+07:00' }],
    v_dossier_check: A13.map((doc_code, i) => ({ project_id: PROJECT, doc_code, ord: i + 1, stored_state: i === 0 ? 'present' : 'missing', state: i === 0 ? 'present' : 'missing' })),
    location_interest: [{ interest_id: 'i1', project_id: PROJECT }],
    province_notice: [{ notice_id: 'n1', interest_id: 'i1', review_status: 'approved', sent_at: '2026-10-01T09:00:00+07:00' }],
    document_access_log: []
  };
  const handlers = {
    app_record_document: (args) => ({ data: { document_id: '88888888-8888-4888-8888-888888888888', version: 2 }, error: null }),
    app_log_document_view: (args) => ({ data: { access_log_id: 'log1', viewed_at: '2026-11-11T10:00:00+07:00' }, error: null }),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  await useFakes({ user: userClient, admin });
  const s = await import('../../lib/storage/project-documents.js');
  store = s.memoryAdapter();
  s.setProjectDocumentsForTests(store);
  return { userClient, admin, s };
}
const req = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const kitRoute = () => import('../../app/api/projects/[id]/documents/route.js');
const getKit = async (id, qs = '') => (await kitRoute()).GET(req(`/api/projects/${id}/documents${qs}`), { params: { id } });
const record = async (id, body) => (await kitRoute()).POST(req(`/api/projects/${id}/documents`, 'POST', body), { params: { id } });
const uploadUrl = async (id, body) => (await import('../../app/api/projects/[id]/documents/upload-url/route.js')).POST(req(`/api/projects/${id}/documents/upload-url`, 'POST', body), { params: { id } });
const download = async (id) => (await import('../../app/api/documents/[id]/download/route.js')).GET(req(`/api/documents/${id}/download`), { params: { id } });
const rows = (k) => k.groups.flatMap(g => g.rows.map(r => ({ ...r, group: g.basis })));

describe('Document kit routes (T016)', () => {
  afterEach(async () => { (await import('../../lib/storage/project-documents.js')).setProjectDocumentsForTests(null); await resetFakes(); });

  test('GET kit: 401 guest; 404 non-member and malformed id; 422 unknown segment', async () => {
    await use(null);
    assert.equal((await getKit(PROJECT)).status, 401);
    await resetFakes(); await use({ id: OTHER });
    assert.equal((await getKit(PROJECT)).status, 404);
    assert.equal((await getKit('x')).status, 404);
    await resetFakes(); await use({ id: OWNER });
    assert.equal((await getKit(PROJECT, '?segment=D')).status, 422);
  });

  test('GET kit: groups with basis, state, action; Article 13 states from v_dossier_check; heritage from the shortlist; notice copy from M7', async () => {
    await use({ id: OWNER });
    const res = await getKit(PROJECT);
    assert.equal(res.status, 200);
    const k = await res.json();
    assert.equal(k.segment, 'A');
    assert.equal(k.editable, true);
    assert.deepEqual(k.groups.map(g => g.basis), ['law', 'common', 'location']);
    const r = rows(k);
    assert.equal(r.find(x => x.doc_code === 'A13_APPLICATION').state, 'present');
    assert.equal(r.find(x => x.doc_code === 'A13_APPLICATION').latest.version, 1);
    assert.equal(r.find(x => x.doc_code === 'HERITAGE_SITE_PERMIT').group, 'location');
    const notice = r.find(x => x.doc_code === 'PROVINCIAL_NOTICE_COPY');
    assert.equal(notice.state, 'present');
    assert.ok(!notice.actions.includes('upload') && !notice.actions.includes('replace'), 'U3');
    assert.deepEqual(k.progress, { present: 2, total: r.length });
    assert.ok(Array.isArray(k.differences) && k.differences.length > 0);
    assert.equal(r.some(x => x.doc_code === 'SERVICE_CONTRACT_C'), false);
  });

  test('upload-url: 422 NOT_IN_KIT, FILE_TYPE, FILE_TOO_LARGE, VALIDATION_ERROR for the notice copy; 403 view member; 409 ARCHIVED; 200 with a 300 s URL', async () => {
    await use({ id: OWNER });
    const pdf = { filename: 'u.pdf', content_type: PDF, size: 100 };
    assert.equal((await (await uploadUrl(PROJECT, { doc_code: 'SERVICE_CONTRACT_C', ...pdf })).json()).error, 'NOT_IN_KIT');
    assert.equal((await (await uploadUrl(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', filename: 'p.png', content_type: 'image/png', size: 10 })).json()).error, 'FILE_TYPE');
    const big = await uploadUrl(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', filename: 'b.pdf', content_type: PDF, size: 25 * MB + 1 });
    assert.equal(big.status, 422);
    assert.equal((await big.json()).error, 'FILE_TOO_LARGE');
    assert.equal((await (await uploadUrl(PROJECT, { doc_code: 'PROVINCIAL_NOTICE_COPY', ...pdf })).json()).error, 'VALIDATION_ERROR');
    assert.equal((await uploadUrl(ARCHIVED, { doc_code: 'A13_ART9_COMMITMENT', ...pdf })).status, 409);
    const ok = await uploadUrl(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', ...pdf });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.expires_in, 300);
    assert.match(body.path, new RegExp(`^${PROJECT}/A13_ART9_COMMITMENT/`));
    await resetFakes(); await use({ id: VIEWER });
    assert.equal((await uploadUrl(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', ...pdf })).status, 403);
  });

  test('record: a stored file over 25 MB or of a wrong type is deleted (422); nothing stored → 409 UPLOAD_MISSING; otherwise 201 through app_record_document', async () => {
    const { userClient, s } = await use({ id: OWNER });
    const big = s.uploadPathFor(PROJECT, 'A13_ART9_COMMITMENT', 'pdf');
    await store.write(big, Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(25 * MB)]));
    const r1 = await record(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', path: big });
    assert.equal(r1.status, 422); assert.equal((await r1.json()).error, 'FILE_TOO_LARGE');
    assert.equal(await store.head(big), null, 'the oversized object is deleted');
    const png = s.uploadPathFor(PROJECT, 'A13_ART9_COMMITMENT', 'pdf');
    await store.write(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]));
    assert.equal((await (await record(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', path: png })).json()).error, 'FILE_TYPE');
    assert.equal(await store.head(png), null);
    const never = s.uploadPathFor(PROJECT, 'A13_ART9_COMMITMENT', 'pdf');
    const r3 = await record(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', path: never });
    assert.equal(r3.status, 409); assert.equal((await r3.json()).error, 'UPLOAD_MISSING');
    assert.equal(userClient.calls.filter(c => c.rpc === 'app_record_document').length, 0, 'no row for a refused upload');
    const good = s.uploadPathFor(PROJECT, 'A13_ART9_COMMITMENT', 'pdf');
    await store.write(good, Buffer.from('%PDF-1.7\n'));
    const r4 = await record(PROJECT, { doc_code: 'A13_ART9_COMMITMENT', path: good });
    assert.equal(r4.status, 201);
    assert.deepEqual(await r4.json(), { document_id: '88888888-8888-4888-8888-888888888888', version: 2, state: 'present' });
    const call = userClient.calls.find(c => c.rpc === 'app_record_document');
    assert.deepEqual(call.args, { p_project_id: PROJECT, p_doc_code: 'A13_ART9_COMMITMENT', p_file_path: good });
  });

  test('download: one access-log call and a 60 s link for a member; 404 for a non-member', async () => {
    const { userClient } = await use({ id: OWNER });
    await store.write(`${PROJECT}/A13_APPLICATION/00000000-0000-4000-8000-000000000001.pdf`, Buffer.from('%PDF-1.7\n'));
    const res = await download(DOC);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.expires_in, 60);
    assert.match(body.url, /expires=60/);
    assert.equal(userClient.calls.filter(c => c.rpc === 'app_log_document_view').length, 1);
    await resetFakes(); await use({ id: OTHER });
    assert.equal((await download(DOC)).status, 404);
  });
});
