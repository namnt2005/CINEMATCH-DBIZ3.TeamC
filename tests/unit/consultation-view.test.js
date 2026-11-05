import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-33 view rules (T038, BR-005, SC-33 #3, #4, #6, #7, #9, #10): a request form, never a slot calendar.
const view = () => import('../../app/consult/consultation-view.js');
const NOW = new Date('2026-11-06T03:00:00.000Z');

describe('SC-33 view rules (T038)', () => {
  test('#9: Send request stays disabled until a topic, a valid zone and one valid time are set', async () => {
    const { canSend } = await view();
    const ok = { topic: 'dossier', timezone: 'Asia/Seoul', times: ['2026-11-20T10:00'] };
    assert.equal(canSend(ok, NOW), true);
    assert.equal(canSend({ ...ok, topic: '' }, NOW), false);
    assert.equal(canSend({ ...ok, timezone: 'Mars/Base' }, NOW), false);
    assert.equal(canSend({ ...ok, times: [] }, NOW), false);
    assert.equal(canSend({ ...ok, times: [''] }, NOW), false);
    assert.equal(canSend({ ...ok, times: ['2026-11-01T10:00'] }, NOW), false, 'a past time');
    assert.equal(canSend({ ...ok, times: ['2026-11-20T10:00', '2026-11-20T10:00'] }, NOW), false, 'the same time twice');
    assert.equal(canSend({ ...ok, times: ['2026-11-20T10:00', ''] }, NOW), true, 'an empty extra field is ignored');
  });

  test('#5: + Add another time stops at three', async () => {
    const { canAddTime, MAX_TIMES } = await view();
    assert.equal(MAX_TIMES, 3);
    assert.equal(canAddTime(['a']), true);
    assert.equal(canAddTime(['a', 'b']), true);
    assert.equal(canAddTime(['a', 'b', 'c']), false);
  });

  test('#7, SR-361: each time is read in the member\'s zone and shown in Hanoi time, stored in UTC', async () => {
    const { zonedToUtc, hanoiTime, formatInZone } = await view();
    assert.equal(zonedToUtc('2026-11-20T10:00', 'Asia/Seoul'), '2026-11-20T01:00:00.000Z');
    assert.equal(zonedToUtc('2026-07-01T09:30', 'Europe/Paris'), '2026-07-01T07:30:00.000Z', 'summer time');
    assert.equal(zonedToUtc('2026-12-01T09:30', 'Europe/Paris'), '2026-12-01T08:30:00.000Z', 'winter time');
    assert.equal(hanoiTime('2026-11-20T10:00', 'Asia/Seoul'), '20/11/2026 08:00');
    assert.equal(formatInZone('2026-11-23T05:30:00.000Z', 'Asia/Seoul'), '23/11/2026 14:30');
    assert.equal(hanoiTime('', 'Asia/Seoul'), null);
  });

  test('#4: the browser zone is the default', async () => {
    const { defaultZone } = await view();
    assert.equal(defaultZone(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  test('#10: a request with no booking_status reads Waiting for VFDA', async () => {
    const { requestStatus } = await view();
    assert.equal(requestStatus({ booking_status: null }), 'consult.status.waiting');
    assert.equal(requestStatus({ booking_status: '' }), 'consult.status.waiting');
    assert.equal(requestStatus({ booking_status: 'confirmed' }), 'consult.status.confirmed');
    assert.equal(requestStatus({ booking_status: 'rescheduled' }), 'consult.status.rescheduled');
    for (const key of ['consult.status.waiting', 'consult.status.confirmed', 'consult.status.rescheduled']) {
      assert.equal(typeof vi[key], 'string', key);
      assert.equal(typeof en[key], 'string', key);
    }
    assert.equal(en['consult.status.waiting'], 'Waiting for VFDA');
  });

  test('BR-005: nothing about free slots — no export, and no text asks to pick a slot', async () => {
    const mod = await view();
    assert.ok(!Object.keys(mod).some(name => /slot/i.test(name)), Object.keys(mod).join(', '));
    const texts = Object.entries(en).filter(([k]) => k.startsWith('consult.'));
    assert.ok(texts.length > 10, 'the consult.* texts exist');
    for (const [key, text] of texts) assert.doesNotMatch(text, /\bslots?\b|calendar|book a time/i, key);
  });
});
