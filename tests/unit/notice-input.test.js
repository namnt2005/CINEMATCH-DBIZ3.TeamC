import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// Notice input checks (T011, FR-002, FR-003, BR-003, R6, R7). Pure: API routes and SC-32 forms.
const load = () => import('../../lib/notices/input.js');

describe('Notice input (T011)', () => {
  test('Clarifications Q2: the recipient is the People\'s Committee or the Department of Culture', async () => {
    const { validateRecipient } = await load();
    assert.equal(validateRecipient('peoples_committee').ok, true);
    assert.equal(validateRecipient('culture_department').ok, true);
    assert.equal(validateRecipient('ministry').error, 'notices.error.recipient_invalid');
    assert.equal(validateRecipient(undefined).error, 'notices.error.recipient_invalid');
  });

  test('R6: a review approves, or requests changes with a note of 1–1000 characters', async () => {
    const { validateReview } = await load();
    assert.equal(validateReview({ decision: 'approve' }).ok, true);
    assert.equal(validateReview({ decision: 'request_changes', note: 'Add the crew size.' }).ok, true);
    assert.equal(validateReview({ decision: 'request_changes', note: '  ' }).errors.note, 'notices.error.note_required');
    assert.equal(validateReview({ decision: 'request_changes', note: 'x'.repeat(1001) }).errors.note, 'notices.error.note_long');
    assert.equal(validateReview({ decision: 'publish' }).errors.decision, 'notices.error.decision_invalid');
  });

  for (const response of ['received', 'info_needed', 'cannot_support']) {
    test(`BR-003: the reply value ${response} is accepted`, async () => {
      const { validateReply } = await load();
      assert.equal(validateReply({ response }).ok, true);
    });
  }

  test('BR-003: any other reply value is refused — the reply is one of three final values', async () => {
    const { validateReply } = await load();
    for (const response of ['approved', 'waiting', 'Received', '', undefined, 'sent']) {
      assert.equal(validateReply({ response }).errors.response, 'notices.error.response_invalid', String(response));
    }
  });

  test('BR-003: the note is kept as entered — not rewritten — and at most 2000 characters', async () => {
    const { validateReply } = await load();
    const note = 'Tỉnh cần thêm  lịch quay chi tiết.\nGửi trước 20/11.';
    assert.equal(validateReply({ response: 'info_needed', note }).value.note, note);
    assert.equal(validateReply({ response: 'info_needed', note: 'x'.repeat(2001) }).errors.note, 'notices.error.reply_note_long');
  });

  test('FR-006 of SYS: every error is a dictionary key in vi.json and en.json', async () => {
    const { validateRecipient, validateReview, validateReply } = await load();
    const keys = [validateRecipient('x').error, ...Object.values(validateReview({ decision: 'x' }).errors),
      ...Object.values(validateReview({ decision: 'request_changes', note: '' }).errors), ...Object.values(validateReview({ decision: 'request_changes', note: 'x'.repeat(1001) }).errors),
      ...Object.values(validateReply({ response: 'x', note: 'x'.repeat(2001) }).errors)];
    for (const key of keys) assert.ok(vi[key] && en[key], key);
  });
});
