import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// POST / GET /api/consultations with the Supabase fake and a fake Resend client (T037, FR-005, BR-005, R8).
const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ORG = '33333333-3333-4333-8333-333333333333';
const BOOKING = '44444444-4444-4444-8444-444444444444';
const inDays = (d, h = 10) => { const t = new Date(Date.now() + d * 86400000); t.setUTCHours(h, 0, 0, 0); return t.toISOString(); };
const VALID = () => ({ topic: 'dossier', timezone: 'Asia/Seoul', preferred_times: [inDays(10, 1), inDays(12, 5)] });
const ENV_KEYS = ['RESEND_API_KEY', 'EMAIL_FROM', 'VFDA_CONSULT_EMAIL'];
let savedEnv;

function resend(result = { data: { id: 'msg_1' }, error: null }) {
  const calls = [];
  return { calls, emails: { send: async (payload) => { calls.push(payload); return result; } } };
}
function fakes({ user = { id: ME }, rpc = {} } = {}) {
  const tables = {
    user_account: [{ user_id: ME, role: 'member', account_status: 'active', email: 'me@example.test' }],
    profile: [{ user_id: ME, full_name: 'Test Producer', producer_org_id: ORG }],
    producer_organisation: [{ producer_org_id: ORG, org_name: 'Test Films' }],
    consultation_booking: [
      { booking_id: 'b-late', member_id: ME, topic: 'general', timezone: 'Asia/Seoul', slot_start: inDays(30), preferred_times: [inDays(30)], officer_id: null, booking_status: null },
      { booking_id: 'b-soon', member_id: ME, topic: 'locations', timezone: 'Asia/Seoul', slot_start: inDays(3), preferred_times: [inDays(3)], officer_id: null, booking_status: 'confirmed' },
      { booking_id: 'b-other', member_id: OTHER, topic: 'dossier', timezone: 'Europe/Paris', slot_start: inDays(5), preferred_times: [inDays(5)], officer_id: null, booking_status: null }
    ],
    email_delivery: []
  };
  const handlers = { app_request_consultation: () => ({ data: BOOKING, error: null }), ...rpc };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
async function use(options = {}, client = resend()) {
  const f = fakes(options);
  await useFakes({ user: f.userClient, admin: f.admin });
  const { setResendClientForTests } = await import('../../lib/email/resend.js');
  setResendClientForTests(client);
  return { ...f, client };
}
const post = async (body) => (await import('../../app/api/consultations/route.js')).POST(new Request('http://localhost:3000/api/consultations', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
}));
const get = async () => (await import('../../app/api/consultations/route.js')).GET(new Request('http://localhost:3000/api/consultations'));

describe('Consultation request routes (T037)', () => {
  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
    Object.assign(process.env, { RESEND_API_KEY: 're_test_key', EMAIL_FROM: 'CINEMATCH <no-reply@cinematch.example>', VFDA_CONSULT_EMAIL: 'delivered@resend.dev' });
  });
  afterEach(async () => {
    for (const k of ENV_KEYS) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; }
    const { setResendClientForTests } = await import('../../lib/email/resend.js');
    setResendClientForTests(null);
    await resetFakes();
  });

  test('BR-005: a request is stored through app_request_consultation, then the fake email service is called exactly once', async () => {
    const { userClient, client } = await use();
    const body = VALID();
    const res = await post(body);
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { booking_id: BOOKING, email: 'sent' });
    assert.deepEqual(userClient.calls.find(c => c.rpc === 'app_request_consultation').args,
      { p_topic: 'dossier', p_timezone: 'Asia/Seoul', p_preferred_times: body.preferred_times });
    assert.equal(client.calls.length, 1, 'exactly one email');
    assert.deepEqual([].concat(client.calls[0].to), ['delivered@resend.dev']);
  });

  test('R8: the email is recorded in email_delivery by the System client — sent, with the provider id, no notification', async () => {
    const { admin } = await use();
    await post(VALID());
    const rows = admin.tables.email_delivery;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].template_id, 'consultation.request');
    assert.equal(rows[0].recipient_email, 'delivered@resend.dev');
    assert.equal(rows[0].notification_id, null);
    assert.equal(rows[0].delivery_status, 'sent');
    assert.equal(rows[0].provider_message_id, 'msg_1');
  });

  test('R8: a provider failure still answers 201 — the request is kept — with email failed and the row bounced', async () => {
    const { userClient, admin, client } = await use({}, resend({ data: null, error: { name: 'application_error', message: 'down' } }));
    const res = await post(VALID());
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { booking_id: BOOKING, email: 'failed' });
    assert.ok(userClient.calls.some(c => c.rpc === 'app_request_consultation'));
    assert.equal(client.calls.length, 1);
    assert.equal(admin.tables.email_delivery[0].delivery_status, 'bounced');
  });

  test('R8: without RESEND_API_KEY the request is saved, the email stays queued and the service is not called', async () => {
    process.env.RESEND_API_KEY = '';
    const { admin, client } = await use();
    const res = await post(VALID());
    assert.deepEqual(await res.json(), { booking_id: BOOKING, email: 'queued' });
    assert.equal(client.calls.length, 0);
    assert.equal(admin.tables.email_delivery[0].delivery_status, 'queued');
  });

  test('BR-005: invalid input is 422 with fields — nothing stored, the email service is never called', async () => {
    const { userClient, client } = await use();
    for (const body of [{ ...VALID(), topic: 'visa' }, { ...VALID(), timezone: 'Mars/Base' }, { ...VALID(), preferred_times: [] },
      { ...VALID(), preferred_times: [inDays(2), inDays(3), inDays(4), inDays(5)] }, { ...VALID(), preferred_times: [inDays(-1)] }]) {
      const res = await post(body);
      assert.equal(res.status, 422, JSON.stringify(body));
      assert.equal((await res.json()).error, 'VALIDATION_ERROR');
    }
    assert.ok(!userClient.calls.some(c => c.rpc));
    assert.equal(client.calls.length, 0);
  });

  test('R8: a database refusal sends no email', async () => {
    const { client } = await use({ rpc: { app_request_consultation: () => ({ data: null, error: { code: 'P0001', message: 'VALIDATION_ERROR' } }) } });
    assert.equal((await post(VALID())).status, 422);
    assert.equal(client.calls.length, 0);
  });

  test('SC-33 SR-364: a guest gets 401 and no email', async () => {
    const { client } = await use({ user: null });
    assert.equal((await post(VALID())).status, 401);
    assert.equal((await get()).status, 401);
    assert.equal(client.calls.length, 0);
  });

  test('FR-005: GET lists only the caller\'s requests, upcoming first, with their status', async () => {
    await use();
    const body = await (await get()).json();
    assert.deepEqual(body.requests.map(r => r.booking_id), ['b-soon', 'b-late']);
    assert.equal(body.requests[0].booking_status, 'confirmed');
    assert.equal(body.requests[1].booking_status, null);
  });
});
