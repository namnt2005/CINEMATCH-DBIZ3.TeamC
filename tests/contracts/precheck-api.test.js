import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Pre-check and project content-check routes with the Supabase fake (T030; contracts/precheck-api.contract.md;
// FR-005..FR-007, FR-012..FR-014, BR-001, D7, D11, D12). LLM_PROVIDER is mock here: keyword match only.
const OWNER = '11111111-1111-4111-8111-111111111111';
const VIEWER = '22222222-2222-4222-8222-222222222222';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const MIL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LONG = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BRIEF = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const FINDING = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const RUN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const SUMMARY = 'At dawn two soldiers row a lantern boat to the border post while the whole street watches from the old stone bridge in silence.';
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });
const rule = (rule_id, rule_code, severity, keywords_en) => ({ rule_id, rule_code, revision: 1, status: 'approved', is_active: true, is_sample: true,
  title_en: `${rule_code} title`, title_vi: `${rule_code} tiêu đề`, description_en: 'Rule text', description_vi: 'Văn bản luật', guidance_en: 'Consider', guidance_vi: 'Cân nhắc',
  citation: 'Điều 9 khoản 1 điểm c, Luật Điện ảnh số 05/2022/QH15 (mẫu — chờ Ban Pháp chế VFDA kiểm)', severity, topic: 'security', rule_slug: rule_code.toLowerCase(),
  rule_version: '2026.08', approved_by: OWNER, keywords_en, keywords_vi: [], segments: ['A', 'B', 'C'] });

function fakes({ user = null, rpc = {} } = {}) {
  const tables = {
    user_account: [{ user_id: OWNER, role: 'member', account_status: 'active' }, { user_id: VIEWER, role: 'member', account_status: 'active' }],
    rule_set_version: [{ rule_version: '2026.07' }, { rule_version: '2026.08' }],
    legal_rule: [rule(MIL, 'A9-MIL', 'action', ['soldiers']), rule(LONG, 'A9-LONG', 'action', ['border post']),
      { ...rule('ffffffff-ffff-4fff-8fff-ffffffffffff', 'A9-HERIT', 'notice', ['bridge']), status: 'draft', is_active: false, citation: null, rule_version: null }],
    precheck_run: [{ brief_id: BRIEF, project_id: null, rule_version: '2026.08', lang: 'en', attention_level: 'medium', dropped_count: 0, dropped_rule_codes: [], created_at: '2026-11-09T09:00:00+07:00' }],
    precheck_finding: [{ brief_id: BRIEF, rule_id: MIL, span_start: 8, span_end: 20 }],
    project: [{ project_id: PROJECT, project_name: 'Lantern Street', stage: 'preparing' }],
    project_member: [{ project_id: PROJECT, user_id: OWNER, permission: 'owner', invite_status: 'accepted' }, { project_id: PROJECT, user_id: VIEWER, permission: 'view', invite_status: 'accepted' }],
    compliance_run: [{ run_id: RUN, project_id: PROJECT, rule_version: '2026.08', run_at: '2026-11-09T09:30:00+07:00' }],
    compliance_finding: [{ finding_id: FINDING, run_id: RUN, rule_id: MIL, quoted_text: 'two soldiers', finding_status: 'open', reviewer_note: null }]
  };
  const handlers = {
    app_record_precheck: () => ({ data: 'new-brief-id', error: null }),
    app_save_content_check: () => ({ data: { run_id: 'new-run', rule_version: '2026.08', findings: 2 }, error: null }),
    app_review_finding: (args) => ({ data: { finding_id: args.p_finding_id, finding_status: 'reviewed', reviewer_note: args.p_note }, error: null }),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
async function use(options) { const f = fakes(options); await useFakes({ user: f.userClient, admin: f.admin }); return f; }
const req = (url, method = 'GET', body, ip = '203.0.113.7') => new Request(`http://localhost:3000${url}`,
  { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: body === undefined ? undefined : JSON.stringify(body) });
const route = (p) => import(`../../app/api/${p}/route.js`);
const check = async (body, ip) => (await route('precheck')).POST(req('/api/precheck', 'POST', body, ip));
const rpcCall = (client, name) => [...client.calls].reverse().find(c => c.rpc === name);

describe('Pre-check routes (T030)', () => {
  afterEach(async () => { (await import('../../lib/content-check/rate-limit.js')).resetRateLimits(); await resetFakes(); });

  test('GET /api/precheck/basis → version, approved count, advanced analysis available or not', async () => {
    await use();
    const res = await (await route('precheck/basis')).GET(req('/api/precheck/basis'));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { rule_version: '2026.08', approved_count: 2, advanced_available: false });
  });

  test('POST /api/precheck → 200 with cited findings; the System records hash, revision ids and spans — never the text', async () => {
    const { admin } = await use();
    const lines = [];
    const saved = { log: console.log, warn: console.warn, error: console.error };
    console.log = console.warn = console.error = (...a) => lines.push(a.join(' '));
    let res;
    try { res = await check({ text: SUMMARY, lang: 'en', flags: { military: 'yes' } }); } finally { Object.assign(console, saved); }
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(Object.keys(body).sort(), ['attention_level', 'brief_id', 'counts', 'dropped_count', 'dropped_rule_codes', 'findings', 'method', 'rule_version', 'state'].sort());
    assert.equal(body.brief_id, 'new-brief-id');
    assert.equal(body.method, 'keywords');
    assert.equal(body.attention_level, 'high');
    assert.deepEqual(body.findings.map(f => f.rule_code).sort(), ['A9-LONG', 'A9-MIL'], 'the draft A9-HERIT ("bridge") is never used');
    for (const f of body.findings) assert.equal(SUMMARY.slice(f.span_start, f.span_end), f.quoted_text);
    const call = rpcCall(admin, 'app_record_precheck');
    assert.ok(call, 'recorded by the System actor');
    assert.equal(JSON.stringify(call.args).includes('lantern boat'), false, 'no text in the record');
    assert.deepEqual(call.args.p_findings.map(f => Object.keys(f).sort()), [['rule_id', 'span_end', 'span_start'], ['rule_id', 'span_end', 'span_start']]);
    assert.ok(!lines.some(l => l.includes('lantern boat')), 'no log line carries the summary');
  });

  test('422 for too few words, a bad language or a bad flag — before any database call', async () => {
    const { admin } = await use();
    assert.equal((await check({ text: 'Too short to check.', lang: 'en' })).status, 422);
    assert.equal((await check({ text: SUMMARY, lang: 'de' })).status, 422);
    const res = await check({ text: SUMMARY, lang: 'en', flags: { military: 'maybe' } });
    assert.equal(res.status, 422);
    assert.ok((await res.json()).fields.flags);
    assert.equal(admin.calls.some(c => c.rpc), false);
  });

  test('D7: the 11th guest check from one IP within 24 hours → 429; another IP is not affected', async () => {
    await use();
    for (let i = 0; i < 10; i++) assert.equal((await check({ text: SUMMARY, lang: 'en' }, '198.51.100.1')).status, 200, `call ${i + 1}`);
    const res = await check({ text: SUMMARY, lang: 'en' }, '198.51.100.1');
    assert.equal(res.status, 429);
    assert.equal((await res.json()).error, 'RATE_LIMITED');
    assert.equal((await check({ text: SUMMARY, lang: 'en' }, '198.51.100.2')).status, 200);
  });

  test('D7: a signed-in user gets 50 checks a day', async () => {
    await use({ user: { id: OWNER } });
    for (let i = 0; i < 50; i++) await check({ text: SUMMARY, lang: 'en' }, '198.51.100.9');
    assert.equal((await check({ text: SUMMARY, lang: 'en' }, '198.51.100.9')).status, 429);
  });

  test('GET /api/precheck/:id → the run with its cited rules and spans, no quoted text; unknown or malformed id → 404', async () => {
    await use();
    const show = async (id) => (await route('precheck/[id]')).GET(req(`/api/precheck/${id}`), { params: { id } });
    const res = await show(BRIEF);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.findings[0].rule_code, 'A9-MIL');
    assert.equal('quoted_text' in body.findings[0], false);
    assert.equal((await show('not-a-uuid')).status, 404);
    assert.equal((await show('99999999-9999-4999-8999-999999999999')).status, 404);
  });
});

describe('Project content-check routes (T030)', () => {
  afterEach(async () => { await resetFakes(); });
  const save = async (body) => (await route('projects/[id]/content-checks')).POST(req(`/api/projects/${PROJECT}/content-checks`, 'POST', body), { params: { id: PROJECT } });
  const BODY = { text: SUMMARY, lang: 'en', rule_version: '2026.08', findings: [{ rule_code: 'A9-MIL', quoted_text: 'two soldiers' }, { rule_code: 'A9-LONG', quoted_text: 'border post' }] };

  test('201 for the owner; the RPC gets revision ids and the text to check against, which it does not store', async () => {
    const { userClient } = await use({ user: { id: OWNER } });
    const res = await save(BODY);
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { run_id: 'new-run', rule_version: '2026.08', findings: 2 });
    const call = rpcCall(userClient, 'app_save_content_check');
    assert.equal(call.args.p_project_id, PROJECT);
    assert.equal(call.args.p_text, SUMMARY);
    assert.deepEqual(call.args.p_findings.map(f => f.rule_id).sort(), [LONG, MIL].sort());
  });

  test('401 guest; 422 for a forged quote or an unsigned code (no RPC); 403, 404, 409 from the database', async () => {
    await use();
    assert.equal((await save(BODY)).status, 401);
    await resetFakes();
    const { userClient } = await use({ user: { id: OWNER } });
    assert.equal((await save({ ...BODY, findings: [{ rule_code: 'A9-MIL', quoted_text: 'three soldiers' }] })).status, 422);
    assert.equal((await save({ ...BODY, findings: [{ rule_code: 'A9-HERIT', quoted_text: 'bridge' }] })).status, 422);
    assert.equal(userClient.calls.some(c => c.rpc === 'app_save_content_check'), false);
    for (const [code, status] of [['FORBIDDEN', 403], ['NOT_FOUND', 404], ['ARCHIVED', 409], ['RULE_SET_CHANGED', 409]]) {
      await resetFakes();
      await use({ user: { id: OWNER }, rpc: { app_save_content_check: fail(code) } });
      const res = await save(BODY);
      assert.equal(res.status, status, code);
      assert.equal((await res.json()).error, code);
    }
  });

  test('GET latest → findings with the cited rule texts; POST review → 200; a view member → 403', async () => {
    await use({ user: { id: OWNER } });
    const latest = await (await route('projects/[id]/content-checks/latest')).GET(req(`/api/projects/${PROJECT}/content-checks/latest`), { params: { id: PROJECT } });
    assert.equal(latest.status, 200);
    const body = await latest.json();
    assert.equal(body.run_id, RUN);
    assert.equal(body.findings[0].quoted_text, 'two soldiers');
    assert.ok(body.findings[0].citation);
    const review = async (note) => (await route('content-findings/[id]/review')).POST(req(`/api/content-findings/${FINDING}/review`, 'POST', { note }), { params: { id: FINDING } });
    const ok = await review('Fictional uniforms');
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).finding_status, 'reviewed');
    await resetFakes();
    await use({ user: { id: VIEWER }, rpc: { app_review_finding: fail('FORBIDDEN') } });
    assert.equal((await review('x')).status, 403);
  });
});
