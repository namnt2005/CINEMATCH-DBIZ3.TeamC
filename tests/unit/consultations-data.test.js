import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne } from '../../lib/db/client.js';

// Consultation requests on node:sqlite (T036, FR-005, BR-005, SC-33 SR-364).
const data = () => import('../../lib/db/consultations.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');
const OKAFOR = member('2985398f-7372-5d92-a85d-117c3a4b91e4');      // has one seed booking
const DEACTIVATED = member('2e513ee3-0d58-52f1-b847-91de33b554ce'); // account_status deactivated
const GUEST = { role: 'guest', isAuthenticated: false, userId: null };
const inDays = (d, h = 2) => { const t = new Date(Date.now() + d * 86400000); t.setUTCHours(h, 0, 0, 0); return t.toISOString(); };
const REQUEST = () => {
  const times = [inDays(20, 1), inDays(10, 5)];
  return { topic: 'partners', timezone: 'Asia/Seoul', preferred_times: times, slot_start: times[0] };
};

describe('Consultation requests on node:sqlite (T036)', () => {
  test('BR-005: one booking with slot_start = the first time, the times and zone, no officer and no status', async () => {
    const { requestConsultation } = await data();
    const req = REQUEST();
    const { booking_id } = await requestConsultation(PARK, req);
    const row = getOne('SELECT * FROM consultation_booking WHERE booking_id = ?', [booking_id]);
    assert.equal(row.member_id, PARK.userId);
    assert.equal(row.topic, 'partners');
    assert.equal(row.timezone, 'Asia/Seoul');
    assert.equal(row.slot_start, req.preferred_times[0]);
    assert.deepEqual(JSON.parse(row.preferred_times), req.preferred_times);
    assert.ok(row.officer_id === null || row.officer_id === '');
    assert.ok(row.booking_status === null || row.booking_status === '');
  });

  test('SR-364: a guest and a deactivated account are refused', async () => {
    const { requestConsultation } = await data();
    for (const session of [GUEST, DEACTIVATED]) {
      await assert.rejects(() => requestConsultation(session, REQUEST()), (err) => ['UNAUTHENTICATED', 'FORBIDDEN'].includes(err.code), session.role);
    }
  });

  test('FR-005: the caller sees only their own requests, upcoming first, then the past ones', async () => {
    const { requestConsultation, listConsultations } = await data();
    const soon = inDays(3);
    await requestConsultation(PARK, { topic: 'general', timezone: 'Europe/Paris', preferred_times: [soon], slot_start: soon });
    const { requests } = await listConsultations(PARK);
    assert.ok(requests.length >= 2);
    assert.equal(requests[0].slot_start, soon, 'the nearest upcoming request first');
    const starts = requests.map(r => Date.parse(r.slot_start));
    const upcoming = starts.filter(s => s > Date.now());
    assert.deepEqual(upcoming, [...upcoming].sort((a, b) => a - b));
    for (const r of requests) {
      assert.deepEqual(Object.keys(r).sort(), ['booking_id', 'booking_status', 'preferred_times', 'slot_start', 'timezone', 'topic']);
      assert.ok(Array.isArray(r.preferred_times));
    }
    const others = await listConsultations(OKAFOR);
    assert.ok(others.requests.length >= 1);
    assert.ok(!others.requests.some(r => requests.some(m => m.booking_id === r.booking_id)), 'no request of another member');
    await assert.rejects(() => listConsultations(GUEST), (err) => err.code === 'UNAUTHENTICATED');
  });

  test('R8: the email record names the VFDA inbox, the template and no notification', async () => {
    const { requestConsultation, recordConsultationEmail } = await data();
    const { booking_id } = await requestConsultation(PARK, REQUEST());
    await recordConsultationEmail({ booking_id, recipient_email: 'delivered@resend.dev', delivery_status: 'queued', provider_message_id: null });
    const row = getOne("SELECT * FROM email_delivery WHERE template_id = 'consultation.request' ORDER BY rowid DESC LIMIT 1");
    assert.equal(row.recipient_email, 'delivered@resend.dev');
    assert.equal(row.delivery_status, 'queued');
    assert.ok(row.notification_id === null || row.notification_id === '');
    assert.equal(JSON.parse(row.variables).booking_id, booking_id);
  });
});
