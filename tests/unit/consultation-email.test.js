import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// The consultation email to VFDA (T035, FR-005, BR-005, R8), with a fake Resend client — nothing is sent.
// The sender returns the outcome; the API records it in email_delivery (tests/contracts/consultations-api.test.js).
const load = () => import('../../lib/email/resend.js');
const KEY = 're_test_DO_NOT_LEAK_123';
const ENV = { RESEND_API_KEY: KEY, EMAIL_FROM: 'CINEMATCH <no-reply@cinematch.example>', VFDA_CONSULT_EMAIL: 'delivered@resend.dev' };
const REQUEST = { booking_id: 'b1', topic: 'dossier', timezone: 'Asia/Seoul', preferred_times: ['2026-11-20T01:00:00.000Z', '2026-11-23T05:30:00.000Z'] };
const MEMBER = { email: 'producer@example.test', full_name: 'Test Producer', org_name: 'Test Films' };
function fakeClient(result = { data: { id: 'msg_123' }, error: null }) {
  const calls = [];
  return { calls, emails: { send: async (payload) => { calls.push(payload); return typeof result === 'function' ? result() : result; } } };
}

describe('sendConsultationRequest (T035)', () => {
  test('BR-005: one email to VFDA_CONSULT_EMAIL from EMAIL_FROM, reply-to the member, subject with the topic', async () => {
    const { sendConsultationRequest } = await load();
    const client = fakeClient();
    const out = await sendConsultationRequest({ request: REQUEST, member: MEMBER }, { client, env: ENV });
    assert.equal(client.calls.length, 1, 'called exactly once');
    const p = client.calls[0];
    assert.deepEqual([].concat(p.to), ['delivered@resend.dev']);
    assert.equal(p.from, ENV.EMAIL_FROM);
    assert.equal(p.replyTo ?? p.reply_to, 'producer@example.test');
    assert.equal(p.subject, 'Consultation request — Dossier');
    assert.deepEqual(out, { status: 'sent', provider_message_id: 'msg_123' });
  });

  test('R8: the body lists every preferred time in the member\'s zone and in Hanoi time, with the member\'s name and company', async () => {
    const { sendConsultationRequest } = await load();
    const client = fakeClient();
    await sendConsultationRequest({ request: REQUEST, member: MEMBER }, { client, env: ENV });
    const body = client.calls[0].text;
    for (const piece of ['20/11/2026 10:00', '20/11/2026 08:00', '23/11/2026 14:30', '23/11/2026 12:30', 'Asia/Seoul', 'Asia/Ho_Chi_Minh', 'Test Producer', 'Test Films']) {
      assert.ok(body.includes(piece), piece);
    }
  });

  test('R8: a provider error gives bounced, never throws, and never repeats the key', async () => {
    const { sendConsultationRequest } = await load();
    const client = fakeClient({ data: null, error: { name: 'validation_error', message: `bad key ${KEY}` } });
    const out = await sendConsultationRequest({ request: REQUEST, member: MEMBER }, { client, env: ENV });
    assert.equal(out.status, 'bounced');
    assert.doesNotMatch(JSON.stringify(out), new RegExp(KEY));
  });

  test('R8: without RESEND_API_KEY or VFDA_CONSULT_EMAIL nothing is called and the email stays queued', async () => {
    const { sendConsultationRequest } = await load();
    for (const env of [{ ...ENV, RESEND_API_KEY: '' }, { ...ENV, VFDA_CONSULT_EMAIL: '' }]) {
      const client = fakeClient();
      const out = await sendConsultationRequest({ request: REQUEST, member: MEMBER }, { client, env });
      assert.equal(client.calls.length, 0);
      assert.deepEqual(out, { status: 'queued', provider_message_id: null });
    }
  });

  test('Constitution IV: the key never reaches a log line, even when the client throws', async () => {
    const { sendConsultationRequest } = await load();
    const lines = [];
    const saved = { log: console.log, error: console.error, warn: console.warn };
    console.log = console.error = console.warn = (...args) => lines.push(args.join(' '));
    try {
      const client = fakeClient(() => { throw new Error(`network down for ${KEY}`); });
      const out = await sendConsultationRequest({ request: REQUEST, member: MEMBER }, { client, env: ENV });
      assert.equal(out.status, 'bounced');
    } finally {
      Object.assign(console, saved);
    }
    assert.ok(!lines.some(l => l.includes(KEY)), 'no log line carries the key');
  });
});
