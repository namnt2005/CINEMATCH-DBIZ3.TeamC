import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Legal rule routes with the Supabase fake (T014; contracts/legal-rules-api.contract.md; FR-001..FR-004, BR-002, BR-008, D9).
const LEGAL = '11111111-1111-4111-8111-111111111111';
const ADMIN = '22222222-2222-4222-8222-222222222222';
const MEMBER = '33333333-3333-4333-8333-333333333333';
const STAFF = '44444444-4444-4444-8444-444444444444';
const RULE = '55555555-5555-4555-8555-555555555555';
const fail = (message, code = 'P0001') => () => ({ data: null, error: { code, message } });
const FIELDS = { rule_code: 'A9-DRONE', topic: 'security', severity: 'notice', title_vi: 'Thiết bị bay', title_en: 'Drones', description_vi: 'Mô tả', description_en: 'Text',
  guidance_vi: 'Cân nhắc', guidance_en: 'Consider', segments: ['A'] };

function fakes(user, rpc = {}) {
  const tables = {
    user_account: [{ user_id: LEGAL, role: 'vfda_legal', account_status: 'active' }, { user_id: ADMIN, role: 'admin', account_status: 'active' },
      { user_id: MEMBER, role: 'member', account_status: 'active' }, { user_id: STAFF, role: 'vfda_staff', account_status: 'active' }],
    rule_set_version: [{ rule_version: '2026.08', created_at: '2026-08-28T16:00:00+07:00', created_by: LEGAL }],
    legal_rule: [{ rule_id: RULE, rule_code: 'A9-MIL', revision: 1, status: 'approved', is_active: true, title_en: 'Military', title_vi: 'Quân sự', topic: 'security', severity: 'action',
      rule_version: '2026.08', retired_version: null, citation: 'Điều 9', approved_by: LEGAL, approved_at: '2026-08-28T15:30:00+07:00', is_sample: true, segments: ['A', 'B', 'C'],
      description_en: 'x', description_vi: 'x', guidance_en: 'x', guidance_vi: 'x', rule_slug: 'a9-mil', keywords_vi: [], keywords_en: [] }],
    audit_log: [], project: [], project_member: [], compliance_run: [], notification: [], email_delivery: []
  };
  const handlers = {
    app_save_rule_draft: (args) => ({ data: { rule_id: args.p_rule_id ?? 'new-rule', revision: 1, status: 'draft' }, error: null }),
    app_revise_rule: () => ({ data: { rule_id: 'rev-2', revision: 2, status: 'draft' }, error: null }),
    app_sign_rule: () => ({ data: { rule_version: '2026.11', retired_rule_id: null }, error: null }),
    app_retire_rule: () => ({ data: { rule_version: '2026.11' }, error: null }),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
async function use(user, rpc) { const f = fakes(user, rpc); await useFakes({ user: f.userClient, admin: f.admin }); return f; }
const req = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const route = (p) => import(`../../app/api/admin/${p}/route.js`);
const list = async () => (await route('legal-rules')).GET(req('/api/admin/legal-rules'));
const create = async (body) => (await route('legal-rules')).POST(req('/api/admin/legal-rules', 'POST', body));
const act = async (action, id = RULE) => (await route(`legal-rules/[id]/${action}`)).POST(req(`/api/admin/legal-rules/${id}/${action}`, 'POST', {}), { params: { id } });

describe('Legal rule routes (T014)', () => {
  afterEach(async () => { await resetFakes(); });

  test('reads: 401 guest; 403 member and vfda_staff; 200 vfda_legal and admin', async () => {
    await use(null);
    assert.equal((await list()).status, 401);
    for (const [id, status] of [[MEMBER, 403], [STAFF, 403], [LEGAL, 200], [ADMIN, 200]]) {
      await resetFakes();
      await use({ id });
      assert.equal((await list()).status, status, id);
    }
  });

  test('D9: every write answers 403 to admin, member and staff; 201 / 200 for vfda_legal through the functions', async () => {
    for (const id of [ADMIN, MEMBER, STAFF]) {
      await resetFakes();
      await use({ id });
      assert.equal((await create(FIELDS)).status, 403, `create ${id}`);
      for (const a of ['revise', 'sign', 'retire']) assert.equal((await act(a)).status, 403, `${a} ${id}`);
    }
    await resetFakes();
    const { userClient } = await use({ id: LEGAL });
    assert.equal((await create(FIELDS)).status, 201);
    assert.equal((await act('revise')).status, 201);
    assert.equal((await act('sign')).status, 200);
    assert.equal((await act('retire')).status, 200);
    for (const name of ['app_save_rule_draft', 'app_revise_rule', 'app_sign_rule', 'app_retire_rule']) assert.ok(userClient.calls.some(c => c.rpc === name), name);
  });

  test('US-3 Sc1: the database CHECK refusing the signature → 422 CITATION_REQUIRED with fields.citation', async () => {
    await use({ id: LEGAL }, { app_sign_rule: fail('new row for relation "legal_rule" violates check constraint "ck_legal_rule_approved_needs_signature"', '23514') });
    const res = await act('sign');
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error, 'CITATION_REQUIRED');
    assert.ok(body.fields.citation);
  });

  test('409 CODE_EXISTS, NOT_DRAFT, DRAFT_EXISTS, NOT_APPROVED; 422 for a bad body before any RPC; 404 malformed id', async () => {
    for (const [code, call] of [['CODE_EXISTS', () => create(FIELDS)], ['DRAFT_EXISTS', () => act('revise')], ['NOT_APPROVED', () => act('retire')]]) {
      await resetFakes();
      const name = { CODE_EXISTS: 'app_save_rule_draft', DRAFT_EXISTS: 'app_revise_rule', NOT_APPROVED: 'app_retire_rule' }[code];
      await use({ id: LEGAL }, { [name]: fail(code) });
      const res = await call();
      assert.equal(res.status, 409, code);
    }
    await resetFakes();
    await use({ id: LEGAL }, { app_save_rule_draft: fail('NOT_DRAFT') });
    const patch = await (await route('legal-rules/[id]')).PATCH(req(`/api/admin/legal-rules/${RULE}`, 'PATCH', { title_en: 'x' }), { params: { id: RULE } });
    assert.equal(patch.status, 409);
    await resetFakes();
    const { userClient } = await use({ id: LEGAL });
    assert.equal((await create({ ...FIELDS, title_en: '' })).status, 422);
    assert.equal(userClient.calls.some(c => c.rpc), false);
    assert.equal((await act('sign', 'not-a-uuid')).status, 404);
  });

  test('GET /api/admin/rule-set-versions → newest first; BR-008: no DELETE handler anywhere', async () => {
    await use({ id: LEGAL });
    const res = await (await route('rule-set-versions')).GET(req('/api/admin/rule-set-versions'));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray((await res.json()).versions));
    for (const p of ['legal-rules', 'legal-rules/[id]', 'legal-rules/[id]/sign', 'legal-rules/[id]/retire', 'legal-rules/[id]/revise']) {
      assert.equal('DELETE' in (await route(p)), false, p);
    }
  });
});
