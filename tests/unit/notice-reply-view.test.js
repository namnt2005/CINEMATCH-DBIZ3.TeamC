import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// The reply on the SC-32 card and the reply form (T029, FR-004, BR-003, SC-32 #6–#7)
const load = () => import('../../app/projects/[id]/provinces/provinces-view.js');

describe('Reply display (T029)', () => {
  test('SC-32 #6–#7: a reply card shows the status label, the date in Vietnam time and the note as entered', async () => {
    const { replyLine } = await load();
    const line = replyLine({ response: 'info_needed', responded_at: '2026-11-08T03:30:00Z', note: 'Cần lịch quay  chi tiết.' });
    assert.deepEqual(line, { status: 'notices.reply.info_needed', date: '08/11/2026', note: 'Cần lịch quay  chi tiết.' });
    assert.deepEqual(replyLine({ response: null, responded_at: null, note: null }), { status: 'notices.reply.waiting', date: null, note: null });
  });

  test('BR-003: the reply form offers exactly the three final values', async () => {
    const { REPLY_CHOICES } = await load();
    assert.deepEqual(REPLY_CHOICES, ['received', 'info_needed', 'cannot_support']);
    for (const r of REPLY_CHOICES) assert.ok(vi[`notices.reply.${r}`] && en[`notices.reply.${r}`], r);
  });
});
