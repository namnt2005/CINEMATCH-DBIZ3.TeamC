import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Invitation routes with the Supabase fake and a fake Resend (T026, M4 BR-003; contracts/invitations-api.contract.md).
const STAFF = '11111111-1111-4111-8111-111111111111';
const ADMIN = '22222222-2222-4222-8222-222222222222';
const MEMBER = '33333333-3333-4333-8333-333333333333';
const PARTNER = '44444444-4444-4444-8444-444444444444';
const LEGAL = '55555555-5555-4555-8555-555555555555';
const ORG = '66666666-6666-4666-8666-666666666666';
const SECRET = 'a'.repeat(64);
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });
const sha = async (s) => (await import('node:crypto')).createHash('sha256').update(s).digest('hex');

async function fakes({ user = { id: STAFF }, rpc = {} } = {}) {
  const tables = {
    user_account: [{ user_id: STAFF, role: 'vfda_staff', account_status: 'active' }, { user_id: ADMIN, role: 'admin', account_status: 'active' },
      { user_id: MEMBER, role: 'member', account_status: 'active', email: 'owner@hanoigrip.example.vn' }, { user_id: PARTNER, role: 'partner', account_status: 'active' },
      { user_id: LEGAL, role: 'vfda_legal', account_status: 'active' }],
    organisation: [{ org_id: ORG, slug: 'hanoigrip', org_name: 'Hanoi Grip & Light' }],
    partner_invitation: [{ invitation_id: 'i1', org_id: ORG, email: 'owner@hanoigrip.example.vn', code_hash: await sha(SECRET), expires_at: new Date(Date.now() + 86400000).toISOString(), accepted_at: null }],
    audit_log: []
  };
  const handlers = {
    app_create_partner_invitation: () => ({ data: { invitation_id: 'i2', org_id: ORG, expires_at: '2026-11-13T09:00:00+07:00', secret: SECRET }, error: null }),
    app_accept_partner_invitation: () => ({ data: { role: 'partner', org_id: ORG, org_slug: 'hanoigrip' }, error: null }),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
function resend() {
  const calls = [];
  return { calls, emails: { send: async (p) => { calls.push(p); return { data: { id: 'msg_1' }, error: null }; } } };
}
let mail;
async function use(options) {
  const f = await fakes(options);
  await useFakes({ user: f.userClient, admin: f.admin });
  mail = resend();
  (await import('../../lib/email/resend.js')).setResendClientForTests(mail);
  return f;
}
const req = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const create = async (body) => (await import('../../app/api/admin/partner-invitations/route.js')).POST(req('/api/admin/partner-invitations', 'POST', body));
const show = async (code) => (await import('../../app/api/partner-invitations/[code]/route.js')).GET(req(`/api/partner-invitations/${code}`), { params: { code } });
const accept = async (code) => (await import('../../app/api/partner-invitations/[code]/accept/route.js')).POST(req(`/api/partner-invitations/${code}/accept`, 'POST'), { params: { code } });
const ENV = ['RESEND_API_KEY', 'EMAIL_FROM'];
let saved;

describe('Partner invitation routes (T026)', () => {
  afterEach(async () => {
    for (const k of ENV) { if (saved?.[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    (await import('../../lib/email/resend.js')).setResendClientForTests(null);
    await resetFakes();
  });

  test('vfda_staff and admin: 201 and exactly one email with the one-time link; the code is in neither the answer nor a log', async () => {
    saved = Object.fromEntries(ENV.map(k => [k, process.env[k]]));
    Object.assign(process.env, { RESEND_API_KEY: 're_test', EMAIL_FROM: 'CINEMATCH <no-reply@cinematch.example>' });
    for (const id of [STAFF, ADMIN]) {
      await use({ user: { id } });
      const lines = [];
      const keep = { log: console.log, warn: console.warn, error: console.error };
      console.log = console.warn = console.error = (...a) => lines.push(a.join(' '));
      let res;
      try { res = await create({ org_id: ORG, email: 'Owner@HanoiGrip.example.vn' }); } finally { Object.assign(console, keep); }
      assert.equal(res.status, 201, id);
      const text = await res.text();
      assert.equal(text.includes(SECRET), false, 'the code is not in the answer');
      assert.deepEqual(JSON.parse(text), { invitation_id: 'i2', org_id: ORG, expires_at: '2026-11-13T09:00:00+07:00', email: 'sent' });
      assert.equal(mail.calls.length, 1);
      assert.deepEqual([].concat(mail.calls[0].to), ['owner@hanoigrip.example.vn']);
      assert.ok(mail.calls[0].text.includes(`http://localhost:3000/invitations/partner/${SECRET}`));
      assert.ok(!lines.some(l => l.includes(SECRET)), 'no log line carries the code');
      await resetFakes();
    }
  });

  test('member, partner and vfda_legal get 403; a bad email or organisation is 422 before any RPC; an open invitation is 409', async () => {
    for (const id of [MEMBER, PARTNER, LEGAL]) {
      await use({ user: { id } });
      assert.equal((await create({ org_id: ORG, email: 'x@hanoigrip.example.vn' })).status, 403, id);
      await resetFakes();
    }
    const { userClient } = await use();
    assert.equal((await create({ org_id: ORG, email: 'no-at' })).status, 422);
    assert.equal((await create({ org: { org_name: '', legal_form: 'x', service_groups: ['crew'], provinces: [1] }, email: 'x@e.vn' })).status, 422);
    assert.equal(userClient.calls.some(c => c.rpc), false);
    await resetFakes();
    await use({ rpc: { app_create_partner_invitation: fail('INVITATION_OPEN') } });
    assert.equal((await create({ org_id: ORG, email: 'x@hanoigrip.example.vn' })).status, 409);
  });

  test('GET :code shows the organisation and a masked email; unknown codes are 404', async () => {
    await use({ user: null });
    const body = await (await show(SECRET)).json();
    assert.deepEqual(body, { org_name: 'Hanoi Grip & Light', email_hint: 'o***@hanoigrip.example.vn', state: 'open' });
    assert.equal((await show('b'.repeat(64))).status, 404);
  });

  test('accept: 401 guest; 403 EMAIL_MISMATCH; 410 INVITATION_INVALID; 200 { role: partner }', async () => {
    await use({ user: null });
    assert.equal((await accept(SECRET)).status, 401);
    await resetFakes();
    await use({ user: { id: MEMBER }, rpc: { app_accept_partner_invitation: fail('EMAIL_MISMATCH') } });
    assert.equal((await accept(SECRET)).status, 403);
    await resetFakes();
    await use({ user: { id: MEMBER }, rpc: { app_accept_partner_invitation: fail('INVITATION_INVALID') } });
    assert.equal((await accept(SECRET)).status, 410);
    await resetFakes();
    await use({ user: { id: MEMBER } });
    const ok = await accept(SECRET);
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { role: 'partner', org_slug: 'hanoigrip' });
  });
});
