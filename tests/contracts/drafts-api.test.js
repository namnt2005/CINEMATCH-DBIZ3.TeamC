import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';
import { Document, Packer, Paragraph } from 'docx';

// SC-28 routes with the Supabase fake (T034; contracts/drafts-api.contract.md; FR-004..FR-006, BR-001, BR-002, BR-006,
// Q3, D3, D4). Translation runs in mock mode only when LLM_PROVIDER=mock is set for the test; never a model call.
const OWNER = '11111111-1111-4111-8111-111111111111';
const VIEWER = '22222222-2222-4222-8222-222222222222';
const PARTNER = '33333333-3333-4333-8333-333333333333';
const OUTSIDER = '99999999-9999-4999-8999-999999999999';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const ORG = '55555555-5555-4555-8555-555555555555';
const REQ = '66666666-6666-4666-8666-666666666666';
const CODE = 'A13_SCRIPT_VI';
const para = (idx, status, target_text = `Đoạn ${idx}`) => ({ project_id: PROJECT, doc_code: CODE, idx, source_text: `Paragraph ${idx} of an invented script.`, target_text,
  status, reviewed_by: status === 'reviewed' ? OWNER : null, reviewer_org_id: null, reviewed_at: status === 'reviewed' ? '2026-11-10T09:00:00+07:00' : null });

async function use(user, { requestStatus = 'accepted', nda = ['producer', 'partner'], rpc = {} } = {}) {
  const tables = {
    user_account: [OWNER, VIEWER, OUTSIDER].map(user_id => ({ user_id, role: 'member', account_status: 'active' })).concat([{ user_id: PARTNER, role: 'partner', account_status: 'active' }]),
    profile: [{ user_id: OWNER, full_name: 'Lena Park' }],
    project: [{ project_id: PROJECT, project_name: 'The Last Ferry', segment: 'A', stage: 'preparing', format: 'feature', shoot_date: '2027-03-15' }],
    project_member: [{ project_id: PROJECT, user_id: OWNER, permission: 'owner', invite_status: 'accepted' }, { project_id: PROJECT, user_id: VIEWER, permission: 'view', invite_status: 'accepted' }],
    organisation: [{ org_id: ORG, org_name: 'Bến Xưa' }],
    organisation_user: [{ org_id: ORG, user_id: PARTNER }],
    collab_request: [{ request_id: REQ, project_id: PROJECT, org_id: ORG, status: requestStatus }],
    nda_acceptance: nda.map(party => ({ request_id: REQ, party, accepted: true })),
    segment_requirement: [{ segment: 'A', requirement_code: 'ART13_LICENCE', needed: true }],
    document_type: [{ doc_code: CODE, name_vi: 'Kịch bản', name_en: 'Script', basis: 'law', segments: ['A', 'B'], requirement_code: 'ART13_LICENCE', awaiting_confirmation: false, template_url: null },
      { doc_code: 'SERVICE_CONTRACT_C', name_vi: 'HĐ', name_en: 'Contract', basis: 'common', segments: ['C'], requirement_code: null, awaiting_confirmation: true, template_url: null }],
    project_shortlist: [], location_document_type: [], document_slot: [], document: [], v_dossier_check: [], location_interest: [], province_notice: [],
    bilingual_document: [{ project_id: PROJECT, doc_code: CODE, structure_version: 'art13-script-v1', synopsis_en: 'x', project_meta: {}, pdf_url: null }],
    bilingual_paragraph: [para(1, 'reviewed'), para(2, 'machine'), para(3, 'machine', '')],
    project_glossary: [{ project_id: PROJECT, term_en: 'ferry', term_vi: 'đò' }]
  };
  const ok = (data) => () => ({ data, error: null });
  const handlers = {
    app_create_bilingual: (a) => ({ data: (a.p_paragraphs || []).length, error: null }),
    app_edit_paragraph: (a) => ({ data: { idx: a.p_idx, status: 'machine', slot_state: 'needs_fix' }, error: null }),
    app_review_paragraph: (a) => ({ data: { idx: a.p_idx, status: 'reviewed', reviewed: 2, total: 3, slot_state: 'needs_fix' }, error: null }),
    app_confirm_bilingual: ok({ marked: 1, reviewed: 3, total: 3, slot_state: 'present' }),
    app_set_bilingual_pdf: ok(true),
    app_save_glossary_term: (a) => ({ data: { term_en: a.p_term_en, term_vi: a.p_term_vi }, error: null }),
    app_delete_glossary_term: ok(true),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  await useFakes({ user: userClient, admin });
  const s = await import('../../lib/storage/project-documents.js');
  s.setProjectDocumentsForTests(s.memoryAdapter());
  return { userClient };
}
const json = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const base = `/api/projects/${PROJECT}/drafts/${CODE}`;
const P = { id: PROJECT, docCode: CODE };
const draftRoute = () => import('../../app/api/projects/[id]/drafts/[docCode]/route.js');
const call = async (file, method, req, params = P) => (await import(`../../app/api/projects/[id]/${file}/route.js`))[method](req, { params });
const rpcCalls = (c, name) => c.calls.filter(x => x.rpc === name);
const withEnv = async (vars, fn) => { const saved = { ...process.env }; Object.assign(process.env, vars); try { return await fn(); } finally { for (const k of Object.keys(vars)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } } };

describe('Draft routes (T034)', () => {
  afterEach(async () => { (await import('../../lib/storage/project-documents.js')).setProjectDocumentsForTests(null); await resetFakes(); });

  test('GET draft: 401 guest, 404 outsider and malformed code; 200 for the owner with rights and translation mode', async () => {
    await use(null);
    assert.equal((await (await draftRoute()).GET(json(base), { params: P })).status, 401);
    await resetFakes(); await use({ id: OUTSIDER });
    assert.equal((await (await draftRoute()).GET(json(base), { params: P })).status, 404);
    await resetFakes(); await use({ id: OWNER });
    assert.equal((await (await draftRoute()).GET(json(base), { params: { id: PROJECT, docCode: 'bad code' } })).status, 404);
    const res = await (await draftRoute()).GET(json(base), { params: P });
    assert.equal(res.status, 200);
    const d = await res.json();
    assert.equal(d.total, 3); assert.equal(d.reviewed, 1);
    assert.equal(d.can_edit, true); assert.equal(d.can_proofread, true); assert.equal(d.can_confirm, false);
    assert.deepEqual(d.translation, { available: false, consent_needed: false, mode: 'none' });
    assert.deepEqual(d.glossary, [{ term_en: 'ferry', term_vi: 'đò' }]);
  });

  test('D4 NDA gate: an accepted partner with both NDA rows reads (cannot confirm); without the partner row → 404, no source text', async () => {
    await use({ id: PARTNER });
    const ok = await (await draftRoute()).GET(json(base), { params: P });
    assert.equal(ok.status, 200);
    const d = await ok.json();
    assert.equal(d.can_proofread, true); assert.equal(d.can_confirm, false);
    await resetFakes(); await use({ id: PARTNER }, { nda: ['producer'] });
    const no = await (await draftRoute()).GET(json(base), { params: P });
    assert.equal(no.status, 404);
    assert.doesNotMatch(JSON.stringify(await no.json()), /invented script/);
  });

  test('POST draft (JSON): 422 for empty text and a code outside the kit; 201 with mock translation stored through app_edit_paragraph', async () => {
    const { userClient } = await use({ id: OWNER });
    assert.equal((await (await draftRoute()).POST(json(base, 'POST', { text: '   ' }), { params: P })).status, 422);
    assert.equal((await (await draftRoute()).POST(json(`/api/projects/${PROJECT}/drafts/SERVICE_CONTRACT_C`, 'POST', { text: 'x' }), { params: { id: PROJECT, docCode: 'SERVICE_CONTRACT_C' } })).status, 422);
    const res = await withEnv({ LLM_PROVIDER: 'mock' }, async () => (await draftRoute()).POST(json(base, 'POST', { text: 'One ferry.\n\nTwo boats.', consent: false }), { params: P }));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.deepEqual({ paragraphs: body.paragraphs, method: body.method, failed: body.failed }, { paragraphs: 2, method: 'mock', failed: [] });
    assert.deepEqual(rpcCalls(userClient, 'app_create_bilingual')[0].args.p_paragraphs, ['One ferry.', 'Two boats.']);
    const edits = rpcCalls(userClient, 'app_edit_paragraph');
    assert.equal(edits.length, 2);
    assert.match(edits[0].args.p_text, /^\[VI\] One đò\./, 'BR-006: the project glossary is applied');
  });

  test('POST draft (multipart .docx) → 201 with the paragraphs of the file; a non-docx → 422', async () => {
    await use({ id: OWNER });
    const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('First line.'), new Paragraph('Second line.')] }] }));
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'script.docx');
    const res = await (await draftRoute()).POST(new Request(`http://localhost:3000${base}`, { method: 'POST', body: form }), { params: P });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).paragraphs, 2);
    const bad = new FormData();
    bad.append('file', new Blob([Buffer.from('%PDF-1.7')], { type: 'application/pdf' }), 'script.pdf');
    assert.equal((await (await draftRoute()).POST(new Request(`http://localhost:3000${base}`, { method: 'POST', body: bad }), { params: P })).status, 422);
  });

  test('translate: 409 TRANSLATION_UNAVAILABLE without the paid plan and the tick (no mock)', async () => {
    await use({ id: OWNER });
    const res = await call('drafts/[docCode]/translate', 'POST', json(`${base}/translate`, 'POST', { idx: 3, consent: true }));
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'TRANSLATION_UNAVAILABLE');
  });

  test('PATCH paragraph, review and confirm: statuses through the functions; 403 for a view member; 422 EMPTY_PARAGRAPH; confirm 403 for a member', async () => {
    const { userClient } = await use({ id: OWNER });
    const patch = await call('drafts/[docCode]/paragraphs/[idx]', 'PATCH', json(`${base}/paragraphs/2`, 'PATCH', { target_text: 'Sửa lại' }), { ...P, idx: '2' });
    assert.equal(patch.status, 200);
    assert.deepEqual(rpcCalls(userClient, 'app_edit_paragraph')[0].args, { p_project_id: PROJECT, p_doc_code: CODE, p_idx: 2, p_text: 'Sửa lại' });
    const review = await call('drafts/[docCode]/paragraphs/[idx]/review', 'POST', json(`${base}/paragraphs/2/review`, 'POST', {}), { ...P, idx: '2' });
    assert.equal(review.status, 200);
    assert.equal((await review.json()).status, 'reviewed');
    assert.equal((await call('drafts/[docCode]/confirm', 'POST', json(`${base}/confirm`, 'POST', {}))).status, 403, 'a member is not the confirmed partner');
    await resetFakes(); await use({ id: OWNER }, { rpc: { app_review_paragraph: () => ({ data: null, error: { code: 'P0001', message: 'EMPTY_PARAGRAPH' } }) } });
    const empty = await call('drafts/[docCode]/paragraphs/[idx]/review', 'POST', json(`${base}/paragraphs/3/review`, 'POST', {}), { ...P, idx: '3' });
    assert.equal(empty.status, 422);
    await resetFakes(); await use({ id: VIEWER });
    assert.equal((await call('drafts/[docCode]/paragraphs/[idx]/review', 'POST', json(`${base}/paragraphs/2/review`, 'POST', {}), { ...P, idx: '2' })).status, 403);
  });

  test('confirm by the confirmed partner (both NDA rows) → 200 with the slot present', async () => {
    const { userClient } = await use({ id: PARTNER }, { requestStatus: 'confirmed' });
    const res = await call('drafts/[docCode]/confirm', 'POST', json(`${base}/confirm`, 'POST', {}));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).slot_state, 'present');
    assert.equal(rpcCalls(userClient, 'app_confirm_bilingual').length, 1);
  });

  test('PDF: 200 with a 60 s link and the stored path saved through app_set_bilingual_pdf', async () => {
    const { userClient } = await use({ id: OWNER });
    const res = await call('drafts/[docCode]/pdf', 'POST', json(`${base}/pdf`, 'POST', {}));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.expires_in, 60);
    assert.ok(body.pages >= 1);
    assert.match(rpcCalls(userClient, 'app_set_bilingual_pdf')[0].args.p_path, new RegExp(`^${PROJECT}/${CODE}/drafts/[0-9a-f-]{36}\\.pdf$`));
  });

  test('glossary: GET terms, POST 201, 422 for an empty term, DELETE 204', async () => {
    const { userClient } = await use({ id: OWNER });
    const g = (method, body, file = 'glossary', params = { id: PROJECT }) => call(file, method, json(`/api/projects/${PROJECT}/glossary`, method, body), params);
    assert.deepEqual((await (await g('GET')).json()).terms, [{ term_en: 'ferry', term_vi: 'đò' }]);
    const created = await g('POST', { term_en: 'karst', term_vi: 'núi đá vôi' });
    assert.equal(created.status, 201);
    assert.equal(rpcCalls(userClient, 'app_save_glossary_term').length, 1);
    assert.equal((await g('POST', { term_en: '', term_vi: 'x' })).status, 422);
    assert.equal((await g('DELETE', undefined, 'glossary/[term]', { id: PROJECT, term: 'ferry' })).status, 204);
  });
});
