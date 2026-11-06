import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Notification emails of M4 events (T007, FR-015, R13), with a fake Resend client — nothing is sent.
const load = () => import('../../lib/email/resend.js');
const KEY = 're_test_DO_NOT_LEAK_456';
const ENV = { RESEND_API_KEY: KEY, EMAIL_FROM: 'CINEMATCH <no-reply@cinematch.example>' };
const ROWS = [
  { email_delivery_id: 'd1', notification_id: 'n1', template_id: 'collab_request.new', recipient_email: 'lan.pham@benxua.example.vn', variables: { project: 'Lantern Street', organisation: 'Bến Xưa Production Services' } },
  { email_delivery_id: 'd2', notification_id: 'n2', template_id: 'collab_request.new', recipient_email: 'yui.tanaka@sakuralane.example.jp', variables: '{"project":"Lantern Street","organisation":"Bến Xưa Production Services"}' }
];
function fakeClient(result = (i) => ({ data: { id: `msg_${i}` }, error: null })) {
  const calls = [];
  return { calls, emails: { send: async (payload) => { calls.push(payload); return result(calls.length); } } };
}

describe('deliverQueued (T007)', () => {
  test('FR-015: each queued row is sent once to its address from EMAIL_FROM and comes back sent with its provider id', async () => {
    const { deliverQueued } = await load();
    const client = fakeClient();
    const out = await deliverQueued(ROWS, { client, env: ENV });
    assert.equal(client.calls.length, 2);
    assert.deepEqual(client.calls.map(c => [].concat(c.to)[0]), ['lan.pham@benxua.example.vn', 'yui.tanaka@sakuralane.example.jp']);
    for (const c of client.calls) {
      assert.equal(c.from, ENV.EMAIL_FROM);
      assert.ok(c.subject && c.text, 'subject and text');
      assert.ok(c.text.includes('Lantern Street'), 'the variables reach the text');
    }
    assert.deepEqual(out, [
      { email_delivery_id: 'd1', notification_id: 'n1', status: 'sent', provider_message_id: 'msg_1' },
      { email_delivery_id: 'd2', notification_id: 'n2', status: 'sent', provider_message_id: 'msg_2' }
    ]);
  });

  test('analysis C1: a provider error marks that row bounced — it keeps its notification — and never throws', async () => {
    const { deliverQueued } = await load();
    const client = fakeClient((i) => (i === 1 ? { data: null, error: { name: 'validation_error', message: `bad key ${KEY}` } } : { data: { id: 'msg_2' }, error: null }));
    const out = await deliverQueued(ROWS, { client, env: ENV });
    assert.deepEqual(out.map(r => [r.email_delivery_id, r.notification_id, r.status]), [['d1', 'n1', 'bounced'], ['d2', 'n2', 'sent']]);
    assert.doesNotMatch(JSON.stringify(out), new RegExp(KEY));
  });

  test('without RESEND_API_KEY or EMAIL_FROM nothing is called and every row stays queued', async () => {
    const { deliverQueued } = await load();
    for (const env of [{ ...ENV, RESEND_API_KEY: '' }, { ...ENV, EMAIL_FROM: '' }]) {
      const client = fakeClient();
      const out = await deliverQueued(ROWS, { client, env });
      assert.equal(client.calls.length, 0);
      assert.deepEqual(out.map(r => r.status), ['queued', 'queued']);
    }
  });

  test('Constitution IV: the key never reaches a log line, even when the client throws', async () => {
    const { deliverQueued } = await load();
    const lines = [];
    const saved = { log: console.log, error: console.error, warn: console.warn };
    console.log = console.error = console.warn = (...args) => lines.push(args.join(' '));
    try {
      const client = fakeClient(() => { throw new Error(`network down for ${KEY}`); });
      const out = await deliverQueued(ROWS, { client, env: ENV });
      assert.deepEqual(out.map(r => r.status), ['bounced', 'bounced']);
    } finally {
      Object.assign(console, saved);
    }
    assert.ok(!lines.some(l => l.includes(KEY)), 'no log line carries the key');
  });
});
