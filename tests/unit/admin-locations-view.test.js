import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadView = () => import('../../app/admin/locations/admin-locations-view.js');

describe('SC-35 view helpers (T014, SC-35 #8, #9, #11, #23, #25, SR-311, SR-312, SR-316, BR-004, BR-008)', () => {
  test('SC-35 #8: status labels', async () => {
    const { statusLabel } = await loadView();
    assert.equal(statusLabel('awaiting_contact'), 'Awaiting contact');
    assert.equal(statusLabel('published'), 'Published');
    assert.equal(statusLabel('unpublished'), 'Unpublished');
  });

  test('SR-316 / BR-010: availability labels', async () => {
    const { availabilityLabel } = await loadView();
    assert.equal(availabilityLabel('open'), 'Open');
    assert.equal(availabilityLabel('survey_in_progress'), 'Scouting crew on site');
    assert.equal(availabilityLabel('paused'), 'Temporarily closed');
  });

  test('SC-35 #11 / BR-008: row action per status, and never a Delete action', async () => {
    const { rowAction } = await loadView();
    assert.deepEqual(rowAction('published'), { label: 'Unpublish', action: 'unpublish', confirm: true });
    assert.deepEqual(rowAction('awaiting_contact'), { label: 'Edit', action: 'edit', confirm: false });
    assert.deepEqual(rowAction('unpublished'), { label: 'Publish again', action: 'publish', confirm: false });
    for (const status of ['published', 'awaiting_contact', 'unpublished']) {
      assert.notEqual(rowAction(status).action, 'delete');
      assert.ok(!/delete/i.test(rowAction(status).label));
    }
  });

  test('SR-311 / BR-004: Publish is disabled with its reason while the contact is not verified', async () => {
    const { publishState } = await loadView();
    assert.deepEqual(
      publishState({ intake_status: 'awaiting_contact', can_publish: false, blocked_reason: 'Authority contact not verified (M3 BR-004).' }),
      { disabled: true, reason: 'Authority contact not verified (M3 BR-004).' }
    );
    assert.deepEqual(publishState({ intake_status: 'awaiting_contact', can_publish: true, blocked_reason: null }), { disabled: false, reason: null });
    assert.equal(publishState({ intake_status: 'published', can_publish: true }).disabled, true, 'Already published');
  });

  test('SC-35 #9: verification line — "✓ verified by {name}, DD/MM/YYYY" or "Not verified"', async () => {
    const { verifiedLine } = await loadView();
    assert.equal(
      verifiedLine({ contact_verified: true, verified_by_name: 'Nguyễn Thị Thu Hà', verified_at: '2026-09-30T10:00:00+07:00' }),
      '✓ verified by Nguyễn Thị Thu Hà, 30/09/2026'
    );
    assert.equal(verifiedLine({ contact_verified: false, verified_by_name: 'Lê Hoàng Phúc', verified_at: null }), 'Not verified');
    assert.equal(verifiedLine(null), 'No contact recorded');
  });
});
